// src/pages/Login.js
import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // *** ADICIONE ESTA LINHA PARA REDIRECIONAR APÓS O LOGIN BEM-SUCEDIDO ***
      navigate('/editor');
    } catch (err) {
      setError('Erro ao fazer login: ' + err.message);
      console.error("Erro de Login:", err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // *** ADICIONE ESTA LINHA PARA REDIRECIONAR APÓS O REGISTRO BEM-SUCEDIDO ***
      navigate('/editor');
    } catch (err) {
      setError('Erro ao registrar: ' + err.message);
      console.error("Erro de Registro:", err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f4f4f4',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h2>Acessar Editor de Plantas</h2>
        {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
        <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
            required
          />
          <button
            // *** ALTERE PARA type="button" AQUI TAMBÉM ***
            type="button"
            onClick={handleLogin}
            style={{
              padding: '10px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none',
              borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={handleRegister}
            style={{
              padding: '10px 15px', backgroundColor: '#008CBA', color: 'white', border: 'none',
              borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
            }}
          >
            Registrar
          </button>
        </form>
      </div>
    </div>
  );
}