import React from 'react';
import { Link } from 'react-router-dom';

function Menu() {
  return (
    <div className="p-3 bg-light border-bottom text-center">
      <h2 className="mb-3">Editor de Plantas Online</h2>
      <nav className="nav d-flex justify-content-center gap-3 flex-wrap">
        <Link className="nav-link" to="/login">Login</Link>
        <Link className="nav-link" to="/register">Registrar</Link>
        <Link className="nav-link" to="/editor">Novo Projeto</Link>
      </nav>
    </div>
  );
}

export default Menu;
