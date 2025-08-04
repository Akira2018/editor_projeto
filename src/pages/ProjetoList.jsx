/* código ProjetoList.js aqui */
import React, { useEffect, useState } from 'react';

function ProjetoList() {
  const [projetos, setProjetos] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/carregar/')
      .then((res) => res.json())
      .then((data) => setProjetos(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2>Projetos Salvos</h2>
      <ul>
        {projetos.map((proj) => (
          <li key={proj.id}>{proj.nome}</li>
        ))}
      </ul>
    </div>
  );
}

export default ProjetoList;
