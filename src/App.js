// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Importe seus componentes
import Login from './pages/Login'; // Ajuste o caminho se for diferente
import Editor from './pages/Editor'; // Ajuste o caminho se for diferente

function App() {
  return (
    <BrowserRouter basename="/editor_projeto">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor_projeto" element={<Editor />} />
        <Route path="/novo-projeto" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
