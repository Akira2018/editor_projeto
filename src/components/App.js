import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login'; // Ou onde quer que seu Login.jsx esteja
import Editor from './pages/Editor';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/editor" element={<Editor />} />
        {/* Adicione outras rotas se houver */}
      </Routes>
    </Router>
  );
}

export default App;