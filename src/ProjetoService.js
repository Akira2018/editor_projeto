export const salvarProjeto = async (nome, canvas) => {
  const dados = canvas.toJSON();
  return fetch('http://127.0.0.1:8000/api/projetos/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, dados })
  });
};

// Adicione outras funções conforme precisar
