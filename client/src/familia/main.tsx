import React from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './familia.css';
import { FamiliaApp } from './FamiliaApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FamiliaApp />
  </React.StrictMode>,
);
