// Esperar a que Firebase esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
  // Verificar que Firebase esté disponible
  if (typeof firebase === 'undefined') {
    console.error('Firebase no está cargado');
    showConnectionStatus('❌ Error de carga - Firebase no disponible', 'error');
    return;
  }

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

  try {
    // Verificar si Firebase ya está inicializado
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase inicializado correctamente');
    } else {
      console.log('Firebase ya estaba inicializado');
    }
    
    const database = firebase.database();
    
    // Elementos DOM
    const empireElement = document.getElementById('empire');
    const republicElement = document.getElementById('republic');
    const statusElement = document.getElementById('connection-status');
    
    // Mostrar estado de conexión
    function showConnectionStatus(message, type) {
      if (!statusElement) return;
      statusElement.textContent = message;
      statusElement.className = `message ${type}`;
      statusElement.style.display = 'block';
    
      if (type === 'success') {
        setTimeout(() => {
          statusElement.style.display = 'none';
        }, 3000);
      }
    }
    
    // Verificar elementos DOM
    if (!empireElement || !republicElement) {
      console.error('Elementos DOM no encontrados');
      showConnectionStatus('❌ Error de página - Elementos no encontrados', 'error');
      return;
    }

    // Escuchar estado de conexión primero
    database.ref('.info/connected').on('value', (snapshot) => {
      if (snapshot.val() === true) {
        console.log('Conectado a Firebase');
        showConnectionStatus('✅ Conectado a Firebase', 'success');
      } else {
        console.log('Desconectado de Firebase');
        showConnectionStatus('⚠️ Desconectado - Intentando reconectar...', 'error');
      }
    });
    
    // Escuchar cambios en los votos
    const votesRef = database.ref('votes/galacticVotes');
    
    votesRef.on('value', (snapshot) => {
      try {
        const data = snapshot.val();
        console.log('Datos recibidos:', data);
        
        if (data) {
          const empireVotes = data.empire || 0;
          const republicVotes = data.republic || 0;
          
          empireElement.textContent = empireVotes;
          republicElement.textContent = republicVotes;
          
          showConnectionStatus(`✅ Actualizado - Imperio: ${empireVotes}, República: ${republicVotes}`, 'success');
        } else {
          console.log('No hay datos, inicializando...');
          // Inicializar votos si no existen
          votesRef.set({
            empire: 0,
            republic: 0
          }).then(() => {
            console.log('Votos inicializados');
            empireElement.textContent = '0';
            republicElement.textContent = '0';
            showConnectionStatus('✅ Datos inicializados', 'success');
          }).catch((error) => {
            console.error('Error al inicializar votos:', error);
            showConnectionStatus('❌ Error al inicializar datos', 'error');
          });
        }
      } catch (error) {
        console.error('Error procesando datos:', error);
        showConnectionStatus('❌ Error procesando datos', 'error');
      }
    }, (error) => {
      console.error('Error al obtener votos:', error);
      showConnectionStatus(`❌ Error de base de datos: ${error.message}`, 'error');
    });

    // Log para debug
    console.log('Sistema de votación inicializado correctamente');
    
  } catch (error) {
    console.error('Error inicializando Firebase:', error);
    showConnectionStatus(`❌ Error de inicialización: ${error.message}`, 'error');
  }
});

// Función global para mostrar estado (por si se necesita desde fuera)
function showConnectionStatus(message, type) {
  const statusElement = document.getElementById('connection-status');
  if (!statusElement) return;
  
  statusElement.textContent = message;
  statusElement.className = `message ${type}`;
  statusElement.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}