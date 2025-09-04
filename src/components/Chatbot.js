import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  where,
  getDocs,
  writeBatch
} from "firebase/firestore";

// Chatbot mejorado con técnicas específicas de apoyo emocional
export default function EmotionalSupportChatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const [dark, setDark] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chat_dark_mode")) || false;
    } catch (e) {
      return false;
    }
  });
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);
  const typingDocRef = useRef(null);
  const sessionIdRef = useRef(Date.now().toString());
  const sessionContextKey = `emotional_chat_context_${sessionIdRef.current}`;

  // Obtener saludo según la hora del día
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Hola buenos días, ¿cómo te sientes?";
    if (hour < 19) return "Hola buenas tardes, ¿cómo te sientes?";
    return "Hola buenas noches, ¿cómo te sientes?";
  };

  // ---------- Utilidades ----------
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const linkify = (text) => {
    if (!text) return "";
    const safe = escapeHtml(text);
    // Corregido: eliminados escapes innecesarios
    return safe.replace(/(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/g, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;">${url}</a>`;
    });
  };

  const saveContext = (ctx) => {
    try {
      localStorage.setItem(sessionContextKey, JSON.stringify(ctx));
    } catch (e) { /* ignore */ }
  };

  const loadContext = () => {
    try {
      return JSON.parse(localStorage.getItem(sessionContextKey)) || {};
    } catch (e) {
      return {};
    }
  };

  // Limpiar datos de sesión al cerrar/recargar
  useEffect(() => {
    const cleanupSession = () => {
      try {
        localStorage.removeItem(sessionContextKey);
        
        // Eliminar mensajes de esta sesión de Firestore
        const deleteSessionMessages = async () => {
          try {
            const q = query(
              collection(db, "messages"), 
              where("sessionId", "==", sessionIdRef.current)
            );
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            
            querySnapshot.forEach((doc) => {
              batch.delete(doc.ref);
            });
            
            await batch.commit();
          } catch (error) {
            console.error("Error deleting session messages:", error);
          }
        };
        
        deleteSessionMessages();
      } catch (e) { /* ignore */ }
    };

    window.addEventListener('beforeunload', cleanupSession);
    return () => {
      window.removeEventListener('beforeunload', cleanupSession);
      cleanupSession();
    };
  }, [sessionContextKey]); // Añadida dependencia sessionContextKey

  // ---------- Firestore: escucha en tiempo real ----------
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      // Solo enviar saludo inicial si no hay mensajes en esta sesión
      const sessionMsgs = msgs.filter(msg => msg.sessionId === sessionIdRef.current);
      if (sessionMsgs.length === 0) {
        addDoc(collection(db, "messages"), {
          text: getTimeBasedGreeting(),
          sender: "bot",
          timestamp: Date.now(),
          sessionId: sessionIdRef.current,
          meta: {
            options: ["Ansiedad", "Estrés", "Depresión", "Crisis", "Agendar cita"],
          },
        });
      }
    });

    return unsubscribe;
  }, []);

  // Scroll automático
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Guardar modo oscuro
  useEffect(() => {
    try {
      localStorage.setItem("chat_dark_mode", JSON.stringify(dark));
    } catch (e) {}
  }, [dark]);

  // ---------- Speech-to-Text ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = "es-MX";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
  }, []);

  const toggleListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return alert("Tu navegador no soporta reconocimiento de voz.");

    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // ---------- Técnicas específicas de apoyo emocional ----------
  const getAnxietyTechniques = () => {
    return {
      text: `😌 Veo que estás experimentando ansiedad. Te recomiendo la técnica de respiración diafragmática que ayuda a activar el sistema nervioso parasimpático:

1. Siéntate con la espalda recta y hombros relajados
2. Coloca una mano en el abdomen
3. Inhala despacio por la nariz (3-5 segundos) notando cómo el abdomen se infla
4. Mantén el aire unos segundos repitiendo mentalmente "estoy tranquilo/a"
5. Exhala lentamente por la boca (3-5 segundos) liberando el aire completamente

Repite este ciclo 4-5 veces. ¿Te gustaría que te guíe en una sesión de respiración o prefieres conocer otras técnicas?`,
      options: ["Guíame en respiración", "Otras técnicas", "Agendar cita"],
    };
  };

  const getStressTechniques = () => {
    return {
      text: `📚 Identifico que estás pasando por estrés. La gestión del tiempo y hábitos de autocuidado son clave:

• Planifica tus tareas priorizando las importantes
• Respeta horarios regulares de sueño y alimentación
• Realiza actividad física moderada diaria (caminar 30 min, yoga)
• Practica técnicas de relajación y respiración profunda

¿Quieres que te ayude con un plan de organización o técnicas de relajación?`,
      options: ["Plan de organización", "Técnicas de relajación", "Ejercicios rápidos"],
    };
  };

  const getDepressionTechniques = () => {
    return {
      text: `💙 Lamento que estés experimentando esto. Para manejar la depresión, la OMS recomienda:

1. Actividades placenteras: Planifica actividades que solían gustarte
2. Contacto social: Habla con amigos/familiares de confianza
3. Hábitos saludables: Ejercicio frecuente, alimentación balanceada, sueño regular
4. Buscar ayuda profesional si los síntomas persisten

¿Quieres ideas para actividades, contacto social o información sobre ayuda profesional?`,
      options: ["Ideas de actividades", "Contacto social", "Ayuda profesional"],
    };
  };

  const getCrisisTechniques = () => {
    return {
      text: `🆘 Lo que describes suena serio. No estás solo/a. Por favor contacta:

• Línea de la Vida (México): 800 911 2000
• Emergencias: 911
• Servicios de crisis de tu universidad

Mientras llega ayuda, si estás experimentando un ataque de pánico:
1. Busca un lugar tranquilo
2. Siéntate y aplica respiración controlada
3. Inhala despacio (3-5 seg), mantén 1-2 seg, exhala (3-5 seg)
4. Repite varias veces

¿Necesitas que te contactemos con alguien o prefieres que te guíe en respiración?`,
      options: ["Contactar emergencia", "Guíame en respiración", "Líneas de ayuda"],
      emergency: true,
    };
  };

  // ---------- Análisis de emociones y respuestas ----------
  const analyzeEmotion = (message) => {
    const lowerMsg = message.toLowerCase();
    if (/suicid|morir|no quiero vivir|me quiero morir|autolesi|herirme/i.test(lowerMsg)) {
      return "crisis";
    }
    if (/ansiedad|pánico|panico|nervios|preocupad|angustia/i.test(lowerMsg)) {
      return "ansiedad";
    }
    if (/estr[eé]s|estres|presión|presion|agobio/i.test(lowerMsg)) {
      return "estrés";
    }
    if (/triste|depresi[oó]n|deprimid|melanc|solo|sola/i.test(lowerMsg)) {
      return "depresión";
    }
    return "otro";
  };

  const getBotResponse = async (userMessage) => {
    const ctx = loadContext();
    ctx.lastMessage = userMessage.slice(0, 200);
    ctx.lastEmotion = analyzeEmotion(userMessage);
    saveContext(ctx);

    const emotion = ctx.lastEmotion;

    switch (emotion) {
      case "crisis":
        return getCrisisTechniques();
      case "ansiedad":
        return getAnxietyTechniques();
      case "estrés":
        return getStressTechniques();
      case "depresión":
        return getDepressionTechniques();
      default:
        return {
          text: "Gracias por compartir cómo te sientes. 😊 ¿Quieres contarme más o prefieres que te sugiera algunas técnicas para sentirte mejor?",
          options: ["Contar más", "Técnicas de relajación", "Agendar cita"],
        };
    }
  };

  // ---------- Envío de mensaje ----------
  const sendMessage = async (messageToSend = null) => {
    const textToSend = messageToSend !== null ? messageToSend : input;
    if (!textToSend || !textToSend.trim()) return;

    await addDoc(collection(db, "messages"), {
      text: textToSend,
      sender: "user",
      timestamp: Date.now(),
      sessionId: sessionIdRef.current,
    });

    setInput("");
    setShowOptions(false);

    const typingDoc = await addDoc(collection(db, "messages"), {
      text: "Escribiendo...",
      sender: "bot",
      typing: true,
      timestamp: Date.now(),
      sessionId: sessionIdRef.current,
    });
    typingDocRef.current = typingDoc;

    let botResponse;
    try {
      botResponse = await getBotResponse(textToSend);
    } catch (e) {
      botResponse = { text: "Lo siento, hubo un error. ¿Puedes intentar de nuevo?", options: [] };
    }

    const baseDelay = 800 + Math.min(1200, botResponse.text.length * 8);
    const jitter = Math.floor(Math.random() * 400);
    const delay = baseDelay + jitter;

    setTimeout(async () => {
      try {
        await deleteDoc(doc(db, "messages", typingDoc.id));
      } catch (e) {}

      await addDoc(collection(db, "messages"), {
        text: botResponse.text,
        sender: "bot",
        timestamp: Date.now(),
        sessionId: sessionIdRef.current,
        meta: {
          options: botResponse.options || [],
          emergency: botResponse.emergency || false,
        },
      });

      setShowOptions((botResponse.options || []).length > 0);
    }, delay);
  };

  const handleOptionClick = (option) => {
    setInput(option);
    setTimeout(() => sendMessage(option), 150);
  };

  // ---------- Render ----------
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        aria-label="Abrir chat de apoyo emocional"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
          color: "white",
          border: "none",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          cursor: "pointer",
          fontSize: "24px",
          zIndex: 1000,
          transition: "transform 200ms",
        }}
        onMouseOver={(e) => (e.target.style.transform = "scale(1.1)")}
        onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
      >
        💬
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Chat de apoyo emocional"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "380px",
        height: "580px",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
        background: dark ? "#1a1a2e" : "#ffffff",
        color: dark ? "#e6e6fa" : "#1a1a2e",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        zIndex: 1000,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: "hidden",
        transition: "all 200ms",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
          color: "white",
          padding: "14px 18px",
          borderRadius: "20px 20px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: "600", fontSize: "16px" }}>
          Apoyo Emocional ITSMIGRA
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Alternar modo oscuro"
            title="Modo oscuro"
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "18px",
              transition: "transform 200ms",
            }}
            onMouseOver={(e) => (e.target.style.transform = "scale(1.2)")}
            onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
          >
            {dark ? "🌞" : "🌙"}
          </button>
          <button
            onClick={() => setMinimized(true)}
            aria-label="Minimizar chat"
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "18px",
              transition: "transform 200ms",
            }}
            onMouseOver={(e) => (e.target.style.transform = "scale(1.2)")}
            onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
          >
            🗕
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          background: dark ? "#16213e" : "#f8fafc",
          transition: "background 200ms",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={m.id || i}
            style={{
              display: "flex",
              justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
              marginBottom: "12px",
              alignItems: "flex-end",
              animation: "fadeIn 300ms ease-in",
            }}
          >
            <div
              style={{
                background:
                  m.sender === "user"
                    ? "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)"
                    : dark
                    ? "#2a2a4e"
                    : "#e9ecef",
                color: m.sender === "user" ? "white" : dark ? "#e6e6fa" : "#1a1a2e",
                padding: "12px 16px",
                borderRadius:
                  m.sender === "user"
                    ? "18px 4px 18px 18px"
                    : "4px 18px 18px 18px",
                maxWidth: "75%",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                lineHeight: "1.5",
                fontSize: "14px",
              }}
            >
              {m.typing ? (
                <span aria-live="polite">
                  Escribiendo<span style={{ opacity: 0.7 }}>•••</span>
                </span>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: linkify(m.text) }} />
              )}

              {m.sender === "bot" && m.meta?.options?.length > 0 && (
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                  {m.meta.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(opt)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "16px",
                        border: `1px solid ${dark ? "#6a11cb" : "#2575fc"}`,
                        background: m.meta.emergency ? "#ff6b6b" : "transparent",
                        color: m.meta.emergency ? "white" : (dark ? "#6a11cb" : "#2575fc"),
                        cursor: "pointer",
                        fontSize: "12px",
                        transition: "all 200ms",
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = dark ? "#6a11cb" : "#2575fc";
                        e.target.style.color = "white";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = m.meta.emergency ? "#ff6b6b" : "transparent";
                        e.target.style.color = m.meta.emergency ? "white" : (dark ? "#6a11cb" : "#2575fc");
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick options area */}
      {showOptions && (
        <div
          style={{
            padding: "12px",
            borderTop: `1px solid ${dark ? "#2a2a4e" : "#e2e8f0"}`,
            background: dark ? "#1a1a2e" : "#ffffff",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["Ansiedad", "Estrés", "Depresión", "Crisis", "Agendar cita"].map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "18px",
                  border: `1px solid ${dark ? "#6a11cb" : "#2575fc"}`,
                  background: "transparent",
                  color: dark ? "#6a11cb" : "#2575fc",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 200ms",
                }}
                onMouseOver={(e) => {
                  e.target.style.background = dark ? "#6a11cb" : "#2575fc";
                  e.target.style.color = "white";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.color = dark ? "#6a11cb" : "#2575fc";
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          display: "flex",
          padding: "12px",
          borderTop: `1px solid ${dark ? "#2a2a4e" : "#e2e8f0"}`,
          background: dark ? "#1a1a2e" : "#ffffff",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button
          onClick={toggleListening}
          aria-pressed={listening}
          title="Grabar voz"
          style={{
            border: "none",
            background: listening ? "#ff6b6b" : "transparent",
            color: listening ? "white" : dark ? "#6a11cb" : "#2575fc",
            padding: "8px",
            borderRadius: "50%",
            cursor: "pointer",
            fontSize: "18px",
            transition: "all 200ms",
          }}
        >
          {listening ? "●" : "🎤"}
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe cómo te sientes..."
          aria-label="Escribe tu mensaje"
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "24px",
            border: `1px solid ${dark ? "#2a2a4e" : "#e2e8f0"}`,
            outline: "none",
            fontSize: "14px",
            background: dark ? "#2a2a4e" : "#ffffff",
            color: dark ? "#e6e6fa" : "#1a1a2e",
            transition: "all 200ms",
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          onClick={() => sendMessage()}
          aria-label="Enviar mensaje"
          style={{
            padding: "12px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            transition: "transform 200ms",
          }}
          onMouseOver={(e) => (e.target.style.transform = "scale(1.1)")}
          onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
        >
          ➤
        </button>
      </div>

      {/* Footer con mensaje positivo */}
      <div
        style={{
          padding: "8px 16px",
          fontSize: "12px",
          color: dark ? "#a3bffa" : "#64748b",
          textAlign: "center",
          background: dark ? "#1a1a2e" : "#f8fafc",
          borderTop: `1px solid ${dark ? "#2a2a4e" : "#e2e8f0"}`,
        }}
      >
        Recuerda que no estás solo/a. Estoy aquí para apoyarte y puedes pedir ayuda profesional en cualquier momento. ❤️
      </div>
    </div>
  );
}

// CSS para animación
const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}