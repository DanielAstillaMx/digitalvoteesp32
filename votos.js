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
  
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const database = firebase.database();
  
  const authContainer = document.getElementById('auth-container');
  const voteContainer = document.getElementById('vote-container');
  const userEmailSpan = document.getElementById('user-email');
  const messageDiv = document.getElementById('message');
  const loginBtn = document.getElementById('login-btn');
  const loginLoading = document.getElementById('login-loading');
  const empireBtn = document.getElementById('empire-btn');
  const republicBtn = document.getElementById('republic-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 5000);
  }
  
  auth.onAuthStateChanged(user => {
    if (user) {
      authContainer.style.display = 'none';
      voteContainer.style.display = 'block';
      userEmailSpan.textContent = user.email;
      checkIfUserVoted(user.uid);
    } else {
      authContainer.style.display = 'block';
      voteContainer.style.display = 'none';
    }
  });
  
  function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
  
    if (!email || !password) {
      showMessage('Por favor completa todos los campos', 'error');
      return;
    }
  
    loginBtn.disabled = true;
    loginLoading.style.display = 'inline-block';
  
    auth.signInWithEmailAndPassword(email, password)
      .then(() => showMessage('¡Sesión iniciada correctamente!', 'success'))
      .catch(error => {
        let msg = 'Error al iniciar sesión';
        switch (error.code) {
          case 'auth/user-not-found': msg = 'Usuario no encontrado'; break;
          case 'auth/wrong-password': msg = 'Contraseña incorrecta'; break;
          case 'auth/invalid-email': msg = 'Correo inválido'; break;
          case 'auth/too-many-requests': msg = 'Demasiados intentos. Intenta más tarde'; break;
          default: msg = error.message;
        }
        showMessage(msg, 'error');
      })
      .finally(() => {
        loginBtn.disabled = false;
        loginLoading.style.display = 'none';
      });
  }
  
  function checkIfUserVoted(uid) {
    database.ref('voteLogger/' + uid).once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          empireBtn.disabled = true;
          republicBtn.disabled = true;
          empireBtn.textContent = '✅ Ya votaste - Imperio';
          republicBtn.textContent = '✅ Ya votaste - República';
          showMessage('Ya has emitido tu voto en esta votación', 'success');
        }
      })
      .catch(error => {
        console.error('Error al verificar voto:', error);
      });
  }
  
  function vote(option) {
    const user = auth.currentUser;
    if (!user) {
      showMessage('Debes iniciar sesión para votar', 'error');
      return;
    }
  
    empireBtn.disabled = true;
    republicBtn.disabled = true;
  
    database.ref('voteLogger/' + user.uid).once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          showMessage('Ya has votado anteriormente', 'error');
          return;
        }
  
        return database.ref('votes/galacticVotes/' + option)
          .transaction(current => (current || 0) + 1)
          .then(() => {
            return database.ref('voteLogger/' + user.uid).set({
              email: user.email,
              option: option,
              timestamp: Date.now()
            });
          });
      })
      .then(() => {
        showMessage('¡Voto registrado exitosamente!', 'success');
        if (option === 'empire') {
          empireBtn.textContent = '✅ Voto registrado - Imperio';
        } else {
          republicBtn.textContent = '✅ Voto registrado - República';
        }
      })
      .catch(error => {
        console.error('Error al votar:', error);
        showMessage('Error al registrar el voto: ' + error.message, 'error');
        empireBtn.disabled = false;
        republicBtn.disabled = false;
      });
  }
  
  function logout() {
    auth.signOut()
      .then(() => {
        showMessage('Sesión cerrada correctamente', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      })
      .catch(error => {
        showMessage('Error al cerrar sesión: ' + error.message, 'error');
      });
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    loginBtn.addEventListener('click', login);
    logoutBtn.addEventListener('click', logout);
    empireBtn.addEventListener('click', () => vote('empire'));
    republicBtn.addEventListener('click', () => vote('republic'));
    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && authContainer.style.display !== 'none') login();
    });
  });
  