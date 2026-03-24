import { useState, useEffect, useRef } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import { Login } from './components/Login';
import './App.css';

const ARSENAL = [
  { id: 'Monstertify', cost: 1, label: '👺 MONSTERTIFY' },
  { id: 'Blur', cost: 2, label: '🌫️ BLUR' },
  { id: 'Blackout', cost: 5, label: '🌑 BLACKOUT' },
];

function App() {
  // --- 1. CONFIGURACIÓN DE URLS DINÁMICAS ---
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const WS_URL = API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

  // --- 2. ESTADOS ---
  const [user, setUser] = useState<any>(null);
  const [loadingRonda, setLoadingRonda] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- 3. HOOKS ---
  // He añadido 'players' que debe venir de tu useGameSocket
  const { hp, tokens, currentQuestion, gameState, activeGlitches, enviarAccion, players } = 
    useGameSocket(WS_URL);

  // --- 4. EFECTOS ---
  useEffect(() => {
    const savedUser = localStorage.getItem('glitch_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (user && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(err => console.log("Cámara no disponible:", err));
    }
  }, [user]);

  // --- 5. FUNCIONES DE CONTROL ---
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
      const res = await fetch(`${API_BASE_URL}/api/start-round`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) console.log("🚀 Ronda iniciada con éxito");
    } catch (error) {
      console.error("❌ Error de red:", error);
    } finally {
      setTimeout(() => setLoadingRonda(false), 1000);
    }
  };

  const lanzarAtaque = (rivalId: string, tipoAtaque: string) => {
    enviarAccion("ataque", {
      target_id: rivalId,
      type: tipoAtaque
    });
  };

  // --- 6. RENDERIZADO ---
  if (!user) return <Login onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className={`game-container ${(activeGlitches || []).map(g => `glitch-${g.toLowerCase()}`).join(' ')}`}>
      
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

      {/* BOTÓN ADMIN */}
      <button 
        onClick={iniciarRonda} 
        disabled={loadingRonda}
        className={`admin-btn ${loadingRonda ? 'loading' : ''}`}
      >
        {loadingRonda ? 'GENERANDO...' : '⚡ INICIAR RONDA'}
      </button>

      <main className="game-body">
        {/* ESPERANDO */}
        {gameState === 'esperando' && (
          <div className="waiting-screen">
            <h2 className="glitch-text">SISTEMA EN REPOSO</h2>
            <div className="loader"></div>
            <p className="pulse">Esperando rivales en la red...</p>
          </div>
        )}

        {/* TRIVIA */}
        {gameState === 'trivia' && currentQuestion && (
          <div className="question-card animate-flicker">
            <span className="category-tag">DECODIFICANDO PREGUNTA...</span>
            <h2>{currentQuestion.question_text}</h2>
            <div className="options-grid">
              {['A', 'B', 'C', 'D'].map((opt) => (
                <button 
                  key={opt} 
                  className="option-btn"
                  onClick={() => enviarAccion("respuesta", opt)}
                >
                  {currentQuestion[`option_${opt.toLowerCase()}`]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ATAQUE MULTIJUGADOR REAL */}
        {gameState === 'ataque' && (
          <div className="attack-console">
            <h2 className="glitch-text" style={{ color: 'var(--neon-red)' }}>ATAQUE ONLINE</h2>
            <div className="rivals-grid">
              {players && players.length > 0 ? (
                players.map((rivalName: string) => (
                  <div key={rivalName} className="rival-card">
                    <span className="rival-name">&gt; {rivalName}</span>
                    <div className="atk-buttons">
                      {ARSENAL.map(atk => (
                        <button 
                          key={atk.id}
                          disabled={tokens < atk.cost}
                          onClick={() => lanzarAtaque(rivalName, atk.id)}
                          className="atk-btn"
                        >
                          {atk.label} ({atk.cost}🪙)
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-rivals">
                  <p className="pulse">No hay otros sujetos detectados en la red...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GAME OVER */}
        {hp <= 0 && (
          <div className="game-over-screen">
            <h1 className="glitch-text">SISTEMA CRASHED</h1>
            <p>HAS SIDO ELIMINADO</p>
            <button onClick={() => window.location.reload()} className="option-btn">REINICIAR</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;