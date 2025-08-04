import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Não precisa importar BrowserRouter aqui se já estiver em App.js

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);