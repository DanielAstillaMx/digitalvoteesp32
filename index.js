const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ 
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
});

admin.initializeApp();

// Lista de administradores
const ADMIN_EMAILS = ['jose.angel.astilla@gmail.com'];

// Middleware para verificar admin
const verifyAdmin = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Token de autorización requerido');
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (!ADMIN_EMAILS.includes(decodedToken.email)) {
      throw new Error('No tienes permisos de administrador');
    }
    
    return decodedToken;
  } catch (error) {
    console.error('Error en verifyAdmin:', error);
    throw error;
  }
};

// Handler genérico para funciones HTTP
const asyncHandler = (handler) => async (req, res) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return cors(req, res, () => res.status(204).send(''));
  }

  return cors(req, res, async () => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Error en handler:', error);
      res.status(error.status || 500).json({ 
        error: error.message || 'Error interno del servidor' 
      });
    }
  });
};

// Registrar usuario
exports.registerUser = functions.https.onRequest(asyncHandler(async (req, res) => {
  if (req.method !== 'POST') {
    const error = new Error('Método no permitido');
    error.status = 405;
    throw error;
  }

  const adminUser = await verifyAdmin(req);
  const { email, password } = req.body;

  if (!email || !password || password.length < 6) {
    const error = new Error('Datos inválidos: email y contraseña (mín. 6 caracteres) requeridos');
    error.status = 400;
    throw error;
  }

  // Verificar si el usuario ya existe
  try {
    await admin.auth().getUserByEmail(email);
    const error = new Error('El usuario ya existe');
    error.status = 400;
    throw error;
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }

  // Crear usuario
  const userRecord = await admin.auth().createUser({ 
    email, 
    password,
    emailVerified: false
  });
  
  // Registrar en la base de datos
  await admin.database().ref('userCreationLog').push({
    uid: userRecord.uid,
    email: userRecord.email,
    createdBy: adminUser.email,
    timestamp: admin.database.ServerValue.TIMESTAMP,
  });

  res.status(201).json({ 
    uid: userRecord.uid, 
    email: userRecord.email,
    message: 'Usuario creado exitosamente'
  });
}));

// Obtener usuarios
exports.getUsers = functions.https.onRequest(asyncHandler(async (req, res) => {
  if (req.method !== 'GET') {
    const error = new Error('Método no permitido');
    error.status = 405;
    throw error;
  }

  await verifyAdmin(req);
  
  const result = await admin.auth().listUsers(1000);
  
  const users = result.users.map(user => ({
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    creationTime: user.metadata.creationTime,
    lastSignInTime: user.metadata.lastSignInTime
  }));
  
  res.status(200).json(users);
}));

// Log de votos
exports.onVoteCreated = functions.database.ref('/voteLogger/{uid}')
  .onCreate(async (snapshot, context) => {
    const uid = context.params.uid;
    const voteData = snapshot.val();

    try {
      const userRecord = await admin.auth().getUser(uid);
      await admin.database().ref('voteLogs').push({
        uid,
        email: userRecord.email,
        option: voteData.option,
        timestamp: voteData.timestamp,
        userAgent: context.rawRequest?.headers['user-agent'] || 'unknown',
        ip: context.rawRequest?.ip || 'unknown'
      });
    } catch (err) {
      console.error('Error en onVoteCreated:', err);
      if (err.code === 'auth/user-not-found') {
        await snapshot.ref.remove();
      }
    }
  });

// Limpiar votos huérfanos
exports.cleanDuplicateVotes = functions.https.onRequest(asyncHandler(async (req, res) => {
  if (req.method !== 'POST') {
    const error = new Error('Método no permitido');
    error.status = 405;
    throw error;
  }

  await verifyAdmin(req);

  // Obtener y limpiar votos
  const snapshot = await admin.database().ref('voteLogger').once('value');
  const voteLogger = snapshot.val() || {};
  
  let deleted = 0;
  const promises = Object.keys(voteLogger).map(async uid => {
    try {
      await admin.auth().getUser(uid);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        await admin.database().ref(`voteLogger/${uid}`).remove();
        deleted++;
      }
    }
  });

  await Promise.all(promises);
  res.status(200).json({ 
    message: `Eliminados ${deleted} votos de usuarios inexistentes`,
    deleted 
  });
}));

// Estadísticas de votación
exports.getVoteStats = functions.https.onRequest(asyncHandler(async (req, res) => {
  if (req.method !== 'GET') {
    const error = new Error('Método no permitido');
    error.status = 405;
    throw error;
  }

  await verifyAdmin(req);

  // Obtener estadísticas
  const [votesSnap, loggerSnap] = await Promise.all([
    admin.database().ref('votes/galacticVotes').once('value'),
    admin.database().ref('voteLogger').once('value')
  ]);

  const votes = votesSnap.val() || { empire: 0, republic: 0 };
  const log = loggerSnap.val() || {};
  const totalVotes = votes.empire + votes.republic;
  const totalVoters = Object.keys(log).length;

  const votesByOption = {};
  Object.values(log).forEach(vote => {
    votesByOption[vote.option] = (votesByOption[vote.option] || 0) + 1;
  });

  res.status(200).json({
    totalVotes,
    totalVoters,
    votes,
    votesByOption,
    empirePercentage: totalVotes ? ((votes.empire / totalVotes) * 100).toFixed(2) : '0',
    republicPercentage: totalVotes ? ((votes.republic / totalVotes) * 100).toFixed(2) : '0',
  });
}));