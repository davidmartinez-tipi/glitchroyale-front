import { useState, useEffect, useCallback } from 'react';

export const useGameSocket = (url: string) => {
  // --- 1. ESTADOS ---
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [hp, setHp] = useState(100);
  const [tokens, setTokens] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [gameState, setGameState] = useState('esperando');
  const [activeGlitches, setActiveGlitches] = useState<string[]>([]);
  const [players, setPlayers] = useState<string[]>([]);

  // --- 2. EFECTO DE CONEXIÓN ---
  useEffect(() => {
    const token = localStorage.getItem('glitch_token');
    const userData = JSON.parse(localStorage.getItem('glitch_user') || '{}');
    const myUsername = userData.username;
    
    if (!token) return;

    console.log("🔌 Conectando como:", myUsername);
    
    const socketUrl = `${url}?token=${token}`;
    const ws = new WebSocket(socketUrl);

    ws.onopen = () => {
      console.log("✅ ¡Conectado al Servidor de Batalla!");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("📩 Mensaje del servidor:", msg);

        switch (msg.type) {
          // 🔥 NUEVO: Manejo de la lista de rivales
          case 'lista_jugadores':
            if (Array.isArray(msg.data)) {
              // Filtramos nuestro propio nombre para no aparecer como rival
              const rivals = msg.data.filter((name: string) => name !== myUsername);
              console.log("👥 Rivales actualizados:", rivals);
              setPlayers(rivals);
            }
            break;

          case 'estado':
            if (msg.data.hp !== undefined) setHp(msg.data.hp);
            if (msg.data.tokens !== undefined) setTokens(msg.data.tokens);
            if (msg.data.status) setGameState(msg.data.status);
            
            if (msg.data.glitches) {
               setActiveGlitches(msg.data.glitches.map((g: string) => g.toLowerCase()));
            }
            break;

          case 'pregunta':
            setCurrentQuestion(msg.data);
            setGameState('trivia');
            setActiveGlitches([]); // Limpiamos efectos al iniciar trivia
            break;

          case 'inicio_ataque':
          case 'ataque': 
            setGameState('ataque');
            break;

          case 'ataque_ejecutado':
            // Si el ataque viene con datos de HP, actualizamos
            if (msg.data.new_hp !== undefined) setHp(msg.data.new_hp);
            // Añadimos el efecto visual del ataque (ej: "blur")
            if (msg.data.attack) {
                setActiveGlitches((prev) => [...prev, msg.data.attack.toLowerCase()]);
            }
            break;

          case 'fin_ronda':
            setGameState('esperando');
            setCurrentQuestion(null);
            break;

          case 'eliminacion':
             if (msg.data === myUsername) {
                 setHp(0);
             }
             break;
            
          default:
            console.log("❓ Tipo de mensaje no reconocido:", msg.type);
        }
      } catch (err) {
        console.error("❌ Error parseando JSON:", err);
      }
    };

    ws.onclose = () => {
      console.log("🔌 Conexión cerrada.");
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error("🛠️ Error en WebSocket:", error);
    };

    return () => {
      ws.close();
    };
  }, [url]); // Quitamos el localStorage de la dependencia para evitar bucles

  // --- 3. FUNCIÓN PARA ENVIAR ACCIONES ---
  const enviarAccion = useCallback((tipo: string, contenido: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const mensaje = JSON.stringify({
        type: tipo,
        data: contenido
      });
      socket.send(mensaje);
      console.log(`📤 Enviando ${tipo}:`, contenido);
    } else {
      console.error("❌ Socket desconectado");
    }
  }, [socket]);

  // --- 4. RETORNO ---
  // IMPORTANTE: Retornamos 'players' para que App.tsx lo use
  return { 
    hp, 
    tokens, 
    currentQuestion, 
    gameState, 
    activeGlitches, 
    enviarAccion,
    players 
  };
};