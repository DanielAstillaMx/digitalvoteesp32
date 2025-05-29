// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAjxhOx86viucIZlGpu7Zp7d3sipVdftiQ",
  authDomain: "digitalvoteesp32.firebaseapp.com",
  databaseURL: "https://digitalvoteesp32-default-rtdb.firebaseio.com",
  projectId: "digitalvoteesp32",
  storageBucket: "digitalvoteesp32.appspot.com",
  messagingSenderId: "203683634767",
  appId: "1:203683634767:web:8ff4d10e7665cd5f8c943a"
};

// Inicialización con compatibilidad
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (e) {
  console.error("Error inicializando Firebase", e);
}

const auth = firebase.auth();
const database = firebase.database();

// Configuración de API
const API_BASE = "https://us-central1-digitalvoteesp32.cloudfunctions.net";

// Elementos DOM
const adminLoginDiv = document.getElementById('admin-login-div');
const adminPanel = document.getElementById('admin-panel');
const messageDiv = document.getElementById('message');
const adminUserEmail = document.getElementById('admin-user-email');
const usersContainer = document.getElementById('users-container');

// Mostrar mensajes
function showMessage(message, type) {
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  setTimeout(() => messageDiv.style.display = 'none', 5000);
}

// Función para peticiones API
async function makeApiRequest(endpoint, options = {}) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const token = await user.getIdToken(true);
    
    const defaultOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest'
      },
      mode: 'cors',
      credentials: 'omit'
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    };

    if (options.body) {
      mergedOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, mergedOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error en makeApiRequest:', error);
    throw error;
  }
}

// Función para cargar usuarios
async function loadUsers() {
  const loadBtn = document.getElementById('load-users-btn');
  const loadLoading = document.getElementById('load-loading');
  
  try {
    loadBtn.disabled = true;
    loadLoading.style.display = 'inline-block';
    
    const users = await makeApiRequest('/getUsers');
    displayUsers(users);
    showMessage('Usuarios cargados correctamente', 'success');
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    showMessage(`Error al cargar usuarios: ${error.message}`, 'error');
  } finally {
    loadBtn.disabled = false;
    loadLoading.style.display = 'none';
  }
}

// Función para mostrar usuarios
function displayUsers(users) {
  if (!users || users.length === 0) {
    usersContainer.innerHTML = '<p>No hay usuarios registrados</p>';
    return;
  }

  let html = '<table class="users-table"><tr><th>Email</th><th>UID</th><th>Verificado</th><th>Último acceso</th></tr>';
  
  users.forEach(user => {
    const lastSignIn = user.lastSignInTime ? 
      new Date(user.lastSignInTime).toLocaleString() : 'Nunca';
    
    html += `
      <tr>
        <td>${user.email}</td>
        <td>${user.uid.substring(0, 8)}...</td>
        <td>${user.emailVerified ? '✅' : '❌'}</td>
        <td>${lastSignIn}</td>
      </tr>
    `;
  });
  
  html += '</table>';
  usersContainer.innerHTML = html;
}

// Función para registrar usuario
async function registerUser() {
  const email = document.getElementById('new-email').value.trim();
  const password = document.getElementById('new-password').value;
  const registerBtn = document.getElementById('register-btn');
  const registerLoading = document.getElementById('register-loading');

  if (!email || !password) {
    showMessage('Por favor, completa todos los campos', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }

  try {
    registerBtn.disabled = true;
    registerLoading.style.display = 'inline-block';

    await makeApiRequest('/registerUser', {
      method: 'POST',
      body: { email, password }
    });

    showMessage(`Usuario ${email} registrado exitosamente`, 'success');
    document.getElementById('new-email').value = '';
    document.getElementById('new-password').value = '';
    
    // Recargar usuarios
    loadUsers();
  } catch (error) {
    console.error('Error registrando usuario:', error);
    showMessage(`Error al registrar usuario: ${error.message}`, 'error');
  } finally {
    registerBtn.disabled = false;
    registerLoading.style.display = 'none';
  }
}

// Función para login de admin
async function adminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const loginBtn = document.getElementById('admin-login-btn');
  const loginLoading = document.getElementById('admin-loading');

  if (!email || !password) {
    showMessage('Por favor, completa todos los campos', 'error');
    return;
  }

  try {
    loginBtn.disabled = true;
    loginLoading.style.display = 'inline-block';

    await auth.signInWithEmailAndPassword(email, password);
    // El resto se maneja en onAuthStateChanged
  } catch (error) {
    console.error('Error en login:', error);
    showMessage(`Error al iniciar sesión: ${error.message}`, 'error');
  } finally {
    loginBtn.disabled = false;
    loginLoading.style.display = 'none';
  }
}

// Función para logout
async function adminLogout() {
  try {
    await auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    showMessage('Error al cerrar sesión', 'error');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Login de admin
  document.getElementById('admin-login-btn').addEventListener('click', adminLogin);
  
  // Permitir login con Enter
  document.getElementById('admin-password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      adminLogin();
    }
  });

  // Registrar usuario
  document.getElementById('register-btn').addEventListener('click', registerUser);
  
  // Cargar usuarios
  document.getElementById('load-users-btn').addEventListener('click', loadUsers);
});

// Manejo de estado de autenticación
auth.onAuthStateChanged(async user => {
  console.log('Estado de autenticación:', user ? user.email : 'No user');
  
  if (!user) {
    adminLoginDiv.style.display = 'block';
    adminPanel.style.display = 'none';
    return;
  }

  try {
    // Verificar si es admin intentando obtener usuarios
    await makeApiRequest('/getUsers');
    console.log('Verificación de admin exitosa');
    
    adminUserEmail.textContent = user.email;
    adminLoginDiv.style.display = 'none';
    adminPanel.style.display = 'block';
    showMessage('¡Acceso de administrador verificado!', 'success');
    
    // Cargar usuarios inicialmente
    await loadUsers();
  } catch (error) {
    console.error('Error verificando admin:', error);
    showMessage(`Error de autorización: ${error.message}`, 'error');
    
    // Cerrar sesión si no es admin
    setTimeout(async () => {
      try {
        await auth.signOut();
      } catch (signOutError) {
        console.error('Error al cerrar sesión:', signOutError);
      }
      window.location.href = 'index.html';
    }, 2000);
  }
});