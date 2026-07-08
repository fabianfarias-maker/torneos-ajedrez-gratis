// Service Worker Autodestructivo
// Su único propósito es eliminar el Service Worker anterior de los navegadores de los usuarios
// y forzar la carga de la versión web actualizada directamente desde el servidor.

self.addEventListener('install', () => {
  // Fuerza al Service Worker a activarse inmediatamente sin esperar a que cierren la pestaña
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    // Desregistra este y cualquier otro Service Worker activo
    self.registration.unregister()
      .then(() => {
        // Obtiene todas las pestañas abiertas de esta aplicación
        return self.clients.matchAll();
      })
      .then(clients => {
        // Recarga cada pestaña para asegurarse de que cargue la nueva versión web desde la red
        clients.forEach(client => {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
      .then(() => {
        console.log('Service Worker antiguo eliminado con éxito.');
      })
  );
});
