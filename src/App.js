// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Importe seus componentes
import Login from './pages/Login'; // Ajuste o caminho se for diferente
import Editor from './pages/Editor'; // Ajuste o caminho se for diferente

function App() {
  return (
    // O BrowserRouter (ou Router, como importado) deve envolver TUDO que usa rotas.
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/editor" element={<Editor />} />
        {/* Adicione outras rotas aqui se houver, por exemplo, para /novo-projeto */}
        <Route path="/novo-projeto" element={<Editor />} /> {/* Exemplo: se /novo-projeto também usa o Editor */}
      </Routes>
    </Router>
  );
}

export default App;
