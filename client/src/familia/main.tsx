import React from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './familia.css';
import { FamiliaApp } from './FamiliaApp';

// Uma implantação anterior publicou o PWA completo do TREK neste domínio.
// Desregistra esse worker para ele não continuar entregando o app antigo.
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister())),
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FamiliaApp />
  </React.StrictMode>,
);
