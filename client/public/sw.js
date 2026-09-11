// Remove o Service Worker antigo do TREK completo. A versão da excursão usa
// Supabase diretamente e não precisa manter um cache offline próprio.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))),
      self.clients.claim(),
    ]).then(() => self.registration.unregister()),
  );
});
