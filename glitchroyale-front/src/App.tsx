import { useState, useEffect, useRef } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import { Login } from './components/Login';
import './App.css';

// Definición de ataques para la fase de combate
const ARSENAL = [
  { id: 'Monstertify', cost: 1, label: '👺 MONSTERTIFY' },
  { id: 'Blur', cost: 2, label: '🌫️ BLUR' },
  { id: 'Blackout', cost: 5, label: '🌑 BLACKOUT' },
];

function App() {
  // --- 1. ESTADOS ---
  const [user, setUser] = useState<any>(null);
  const [loadingRonda, setLoadingRonda] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- 2. HOOKS (Siempre en el nivel superior) ---
  const { hp, tokens, currentQuestion, gameState, activeGlitches, enviarAccion } = 
    useGameSocket('wss://glitchroyale-backend.onrender.com/ws');

  // --- 3. EFECTOS ---
  // Cargar usuario persistente
  useEffect(() => {
    const savedUser = localStorage.getItem('glitch_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // Activar cámara para el Avatar
  useEffect(() => {
    if (user && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(err => console.log("Cámara no disponible:", err));
    }
  }, [user]);

  // --- 4. FUNCIONES DE CONTROL ---
  const handleLoginSuccess = (data: any) => {
    localStorage.setItem('glitch_token', data.token);
    localStorage.setItem('glitch_user', JSON.stringify(data));
    setUser(data);
  };

  const logout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const iniciarRonda = async () => {
    setLoadingRonda(true);
    try {
      const token = localStorage.getItem('glitch_token');
      // Enviamos el token en los headers por si el backend tiene la ruta protegida
      const res = await fetch('https://glitchroyale-backend.onrender.com/api/start-round', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) console.log("🚀 Ronda iniciada con éxito");
      else console.error("❌ El servidor rechazó la orden");
    } catch (error) {
      console.error("❌ Error de red:", error);
    } finally {
      setLoadingRonda(false);
    }
  };

  const lanzarAtaque = (rivalId: string, tipoAtaque: string) => {
  // Ahora enviamos el tipo "ataque" y los datos limpios
  enviarAccion("ataque", {
    target_id: rivalId,
    type: tipoAtaque
  });
};

  // --- 5. RENDERIZADO CONDICIONAL (LOGIN) ---
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // --- 6. RENDERIZADO PRINCIPAL (JUEGO) ---
  return (
    <div className={`game-container ${activeGlitches.map(g => `glitch-${g.toLowerCase()}`).join(' ')}`}>
      
      {/* HUD SUPERIOR COMPACTO */}
      <header className="game-header">
        <div className="player-profile">
          <div className="avatar-frame">
            <video ref={videoRef} autoPlay muted className="avatar-video" />
            <div className="scanline"></div>
          </div>
          <div className="player-data">
            <h3 className="glitch-text" data-text={user.username}>{user.username}</h3>
            <div className="hp-bar-mini">
              <div className="hp-fill" style={{ width: `${hp}%` }}></div>
            </div>
            <div className="stats-row">
              <span>❤️ {hp} HP</span>
              <span>🪙 {tokens} TOKENS</span>
            </div>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="mode-badge">{gameState.toUpperCase()}</div>
          <button onClick={logout} className="logout-btn">DISCONNECT</button>
        </div>
      </header>

      {/* BOTÓN ADMIN (FLOTANTE) */}
      <button 
        onClick={iniciarRonda} 
        disabled={loadingRonda}
        className={`admin-btn ${loadingRonda ? 'loading' : ''}`}
      >
        {loadingRonda ? 'GENERANDO...' : '⚡ INICIAR RONDA'}
      </button>

      <main className="game-body">
        
        {/* ESTADO: ESPERANDO */}
        {gameState === 'esperando' && (
          <div className="waiting-screen">
            <h2 className="glitch-text">SISTEMA EN REPOSO</h2>
            <div className="loader"></div>
            <p className="pulse">Esperando paquetes de datos del servidor...</p>
          </div>
        )}

        {/* ESTADO: TRIVIA */}
        {gameState === 'trivia' && currentQuestion && (
          <div className="question-card animate-flicker">
            <span className="category-tag">DECODIFICANDO PREGUNTA...</span>
            <h2>{currentQuestion.question_text}</h2>
            <div className="options-grid">
              {['A', 'B', 'C', 'D'].map((opt) => (
                <button 
  key={opt} 
  className="option-btn"
  onClick={() => enviarAccion("respuesta", opt)} // Enviamos tipo "respuesta"
>
  {currentQuestion[`option_${opt.toLowerCase()}`]}
</button>
              ))}
            </div>
          </div>
        )}

        {/* ESTADO: ATAQUE */}
        {gameState === 'ataque' && (
          <div className="attack-console">
            <h2 className="glitch-text" style={{ color: 'var(--neon-red)' }}>SISTEMA DE ATAQUE ONLINE</h2>
            <div className="rivals-grid">
              {/* Mock de rival para probar la interfaz */}
              {['Rival_Alpha', 'Rival_Beta'].map(rival => (
                <div key={rival} className="rival-card">
                 <span className="rival-name">&gt; {rival}</span>
                  <div className="atk-buttons">
                    {ARSENAL.map(atk => (
                      <button 
                        key={atk.id}
                        disabled={tokens < atk.cost}
                        onClick={() => lanzarAtaque(rival, atk.id)}
                        className="atk-btn"
                      >
                        {atk.label} ({atk.cost}🪙)
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ESTADO: MUERTO */}
        {hp <= 0 && (
          <div className="game-over-screen">
            <h1 className="glitch-text">SISTEMA CRASHED</h1>
            <p>HAS SIDO ELIMINADO DE LA RED</p>
            <button onClick={() => window.location.reload()} className="option-btn">REINICIAR NÚCLEO</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;