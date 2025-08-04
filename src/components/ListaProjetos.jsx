import React, { useState, useEffect, useCallback } from 'react';

const ListaProjetos = ({ onLoadProject }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  // Carrega projetos do localStorage
  useEffect(() => {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith('plantaProjeto:')
    );
    setProjects(keys);
  }, []);

  // Excluir projeto selecionado
  const handleDelete = useCallback(() => {
    if (!selectedProject) {
      alert('Selecione um projeto para excluir.');
      return;
    }

    const confirmed = confirm('Deseja excluir este projeto?');
    if (confirmed) {
      localStorage.removeItem(selectedProject);
      setProjects((prev) => prev.filter((k) => k !== selectedProject));
      setSelectedProject('');
      alert('Projeto excluído com sucesso!');
    }
  }, [selectedProject]);

  // Carregar projeto automaticamente ao selecionar
  const handleChange = (e) => {
    const key = e.target.value;
    setSelectedProject(key);
    if (key && onLoadProject) onLoadProject(key);
  };

  return (
    <div style={{ margin: 10 }}>
      <strong>Projetos Salvos: </strong>
      <select
        id="selectProject"
        value={selectedProject}
        onChange={handleChange}
      >
        <option value="">Selecione um projeto</option>
        {projects.map((key) => (
          <option key={key} value={key}>
            {key.replace('plantaProjeto:', '')}
          </option>
        ))}
      </select>
      <button
        style={{ backgroundColor: 'red', color: 'white', marginLeft: 5 }}
        onClick={handleDelete}
        title="Excluir Projeto"
        disabled={!selectedProject}
      >
        🗑️
      </button>
    </div>
  );
};

export default ListaProjetos;


