import { useState, useEffect, useCallback, useRef } from 'react';

export const useGameSocket = (url: string) => {
  // --- ESTADOS ---
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [hp, setHp] = useState(100);
  const [tokens, setTokens] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [gameState, setGameState] = useState('esperando');
  const [activeGlitches, setActiveGlitches] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('glitch_token');
    
    // 2. Si no hay token, no conectamos (esto evita errores innecesarios)
    if (!token) return;

    console.log("🔌 Iniciando conexión con token:", token.substring(0, 10) + "...");
    
    const socketUrl = `${url}?token=${token}`;
    const ws = new WebSocket(socketUrl);
    ws.onopen = () => {
      console.log("✅ ¡Conectado al Servidor de Batalla!");
      // 🔥 CRÍTICO: Guardamos la instancia en el estado para que 'enviarRespuesta' pueda usarla
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("📩 Mensaje del servidor:", msg);

        switch (msg.type) {
          case 'estado': // Actualización general de stats
            setHp(msg.data.hp);
            setTokens(msg.data.tokens);
            setGameState(msg.data.status);
            if (msg.data.glitches) {
               setActiveGlitches(msg.data.glitches.map((g: string) => g.toLowerCase()));
            }
            break;

          case 'pregunta':
            setCurrentQuestion(msg.data);
            setGameState('trivia');
            setActiveGlitches([]); // Limpiamos efectos visuales al iniciar pregunta
            break;

          case 'inicio_ataque':
          case 'ataque': // Dependiendo de cómo lo envíe tu backend
            setGameState('ataque');
            break;

          case 'ataque_ejecutado':
            // Si el ataque nos afecta a nosotros
            setHp(msg.data.new_hp);
            setActiveGlitches((prev) => [...prev, msg.data.attack.toLowerCase()]);
            break;

          case 'fin_ronda':
            setGameState('esperando');
            setCurrentQuestion(null);
            break;
            
          default:
            console.log("❓ Tipo de mensaje no reconocido:", msg.type);
        }
      } catch (err) {
        console.error("❌ Error parseando JSON del servidor:", err);
      }
    };

    ws.onclose = () => {
      console.log("🔌 Conexión cerrada.");
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error("🛠️ Error en WebSocket:", error);
    };

    // Limpieza al desmontar el componente
return () => {
      ws.close();
    };
}, [url, localStorage.getItem('glitch_token')]);

  // --- FUNCIÓN PARA ENVIAR RESPUESTAS ---
  // Usamos useCallback para que la función sea estable entre renders
 const enviarAccion = useCallback((tipo: string, contenido: any) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const mensaje = JSON.stringify({
      type: tipo, // Aquí irá "respuesta" o "ataque"
      data: contenido
    });
    socket.send(mensaje);
    console.log(`📤 Enviando ${tipo}:`, contenido);
  } else {
    console.error("❌ Socket desconectado");
  }
}, [socket]);

  // Retornamos todo lo que App.tsx necesita
  return { hp, tokens, currentQuestion, gameState, activeGlitches, enviarAccion };
};