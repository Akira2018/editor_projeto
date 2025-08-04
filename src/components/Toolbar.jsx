// Toolbar.jsx
import React from 'react';
import { FaSquare, FaDoorOpen, FaWindowMaximize, FaRuler, FaTrash } from 'react-icons/fa';

const Toolbar = ({
  onAdicionarParede,
  onAdicionarPorta,
  onAdicionarJanela,
  onAdicionarTextoMedida,
  onExcluirSelecionado
}) => (
  <div className="toolbar-container">
    <button className="btn btn-dark" onClick={onAdicionarParede}>
      <FaSquare /> Parede
    </button>
    <button className="btn btn-secondary" onClick={onAdicionarPorta}>
      <FaDoorOpen /> Porta
    </button>
    <button className="btn btn-secondary" onClick={onAdicionarJanela}>
      <FaWindowMaximize /> Janela
    </button>
    <button className="btn btn-info" onClick={onAdicionarTextoMedida}>
      <FaRuler /> Medida
    </button>
    <button className="btn btn-danger" onClick={onExcluirSelecionado}>
      <FaTrash /> Excluir
    </button>
  </div>
);

export default Toolbar;

