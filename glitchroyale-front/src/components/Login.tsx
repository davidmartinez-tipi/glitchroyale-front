import { useState } from 'react';

export const Login = ({ onLoginSuccess }: { onLoginSuccess: (data: any) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('https://glitchroyale-backend.onrender.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error('Credenciales incorrectas');

      const data = await res.json();
      onLoginSuccess(data); // Pasamos el token y info al App.tsx
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-overlay">
      <form className="login-card question-card" onSubmit={handleSubmit}>
        <h2 className="glitch-text">ACCESO AL NÚCLEO</h2>
        {error && <p className="error-msg">{error}</p>}
        <input 
          type="text" 
          placeholder="USERNAME" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input 
          type="password" 
          placeholder="PASSWORD" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="option-btn">SINCRONIZAR</button>
      </form>
    </div>
  );
};  