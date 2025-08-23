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
  serverTimestamp
} from "firebase/firestore";

// Chatbot mejorado: typing indicator, delay humano, modo oscuro, speech-to-text,
// almacenamiento de contexto en localStorage, linkify seguro y animaciones suaves.

export default function ChatbotEnhanced() {
  const [messages, setMessages] = useState([]); // {id, text, sender, timestamp, typing}
  const [input, setInput] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [typing, setTyping] = useState(false);
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
  const sessionContextKey = "chat_session_context_v1"; // para recordar estado breve

  // ---------- Utilidades ----------
  // Escapa HTML y convierte URLs a enlaces seguros
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
    // Primero escapamos HTML
    const safe = escapeHtml(text);
    // Luego convertimos URLs (http/https) a enlaces
    return safe.replace(/(https?:\/\/[\w\-._~:\/?#\[\]@!$&'()*+,;=%]+)/g, (url) => {
      // permitir solo URLs http(s)
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

  // ---------- Firestore: escucha en tiempo real ----------
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      // Si no hay mensajes, insertar saludo inicial (solo la primera vez de la colección vacía)
      if (msgs.length === 0) {
        addDoc(collection(db, "messages"), {
          text: "¡Hola! Soy Apoyo Emocional ITSMIGRA — tu asistente confidencial para primeros auxilios emocionales. ¿Cómo te sientes hoy? (Ej: estrés, ansiedad, tristeza)",
          sender: "bot",
          timestamp: Date.now()
        });
      }
    });

    return unsubscribe;
  }, []);

  // Scroll automático
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Guardar modo oscuro en localStorage
  useEffect(() => {
    try { localStorage.setItem("chat_dark_mode", JSON.stringify(dark)); } catch (e) {}
  }, [dark]);

  // ---------- Speech-to-Text (Web Speech API) ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // no soportado

    const rec = new SpeechRecognition();
    rec.lang = "es-MX";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
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

  // ---------- Lógica de respuesta del bot (mejorada) ----------
  const getBotResponse = async (userMessage) => {
    // Guardar parte del contexto simple
    const ctx = loadContext();
    ctx.lastMessage = userMessage.slice(0, 200);
    saveContext(ctx);

    const lowerMsg = userMessage.toLowerCase();

    // Reglas mejoradas: sin dependencias externas, sencillo y explícito
    if (/(estr[eé]s|estres)/i.test(lowerMsg) || /(^|\s)1(\s|$)/.test(lowerMsg)) {
      return {
        text: "📌 Técnica rápida para el estrés: respira 4s — retén 4s — exhala 6s. Haz 4 ciclos. ¿Quieres que te muestre un plan para priorizar tareas?",
        options: ["Plan de prioridades", "Ejercicios respiratorios", "Hablar con un profesional"]
      };
    }

    if (/ansiedad|pánico|panico|nervios/i.test(lowerMsg) || /(^|\s)2(\s|$)/.test(lowerMsg)) {
      return {
        text: "🌿 Grounding rápido: nombra 5 cosas que ves, 4 que puedes tocar, 3 que oyes, 2 que hueles, 1 que saboreas. Si esto es frecuente, podemos agendar una cita.",
        options: ["Grounding guiado", "Agendar cita", "Recursos de emergencia"]
      };
    }

    if (/triste|depresi[oó]n|depresion|melanc/i.test(lowerMsg) || /(^|\s)3(\s|$)/.test(lowerMsg)) {
      return {
        text: "💙 Sentirse triste es válido. Pequeños pasos: caminar 10 min, escribir 3 cosas buenas del día, hablar con alguien. ¿Quieres ideas para journaling?",
        options: ["Ejercicios de ánimo", "Journaling", "Hablar ahora"]
      };
    }

    if (/cita|agenda|agendar|reservar/i.test(lowerMsg) || /(^|\s)4(\s|$)/.test(lowerMsg)) {
      return {
        text: "Puedes agendar con nuestra psicóloga aquí: https://tu-centro.example/agenda — si te parece, puedo guiarte en el proceso.",
        options: []
      };
    }

    if (/suicid|morir|no quiero vivir|me quiero morir/i.test(lowerMsg)) {
      return {
        text: "Si estás en peligro inmediato, llama al 911. En México también puedes marcar la Línea de la Vida: 800 911 2000. ¿Quieres que busque contactos de emergencia o abrir recursos?",
        options: ["Contactos de emergencia", "Abrir recursos"],
        emergency: true
      };
    }

    if (/gracias|bye|ad[ií]os|nos vemos/i.test(lowerMsg)) {
      return { text: "Gracias por contarme. Estoy aquí cuando me necesites. Cuídate ❤️", options: [] };
    }

    // Respuesta por defecto con validación emocional y seguimiento sugerido
    return {
      text: `Entiendo — eso suena difícil. ¿Quieres contarme qué desencadenó esto o prefieres que te proponga técnicas rápidas para calmarte?`,
      options: ["Contarte mi desencadenante", "Técnicas rápidas"]
    };
  };

  // ---------- Envío de mensaje con typing indicator y delay humano ----------
  const sendMessage = async (messageToSend = null) => {
    const textToSend = (messageToSend !== null) ? messageToSend : input;
    if (!textToSend || !textToSend.trim()) return;

    // Optimistic UI: guardar mensaje del usuario inmediatamente
    await addDoc(collection(db, "messages"), {
      text: textToSend,
      sender: "user",
      timestamp: Date.now()
    });

    setInput("");
    setShowOptions(false);

    // Agregar indicador de "escribiendo" como documento para otros clientes
    const typingDoc = await addDoc(collection(db, "messages"), {
      text: "Escribiendo...",
      sender: "bot",
      typing: true,
      timestamp: Date.now()
    });
    typingDocRef.current = typingDoc;
    setTyping(true);

    // Obtener la respuesta (puede contener opciones)
    let botResponse;
    try {
      botResponse = await getBotResponse(textToSend);
    } catch (e) {
      botResponse = { text: "Perdón, hubo un error. ¿Puedes intentar de nuevo?", options: [] };
    }

    // Simular tiempo de respuesta humano (aleatorio entre 800ms y 1500ms + longitud)
    const baseDelay = 800 + Math.min(1200, botResponse.text.length * 8);
    const jitter = Math.floor(Math.random() * 400);
    const delay = baseDelay + jitter;

    setTimeout(async () => {
      // Borrar el doc de typing (si existe)
      try {
        await deleteDoc(doc(db, "messages", typingDoc.id));
      } catch (e) {
        // Si no se pudo borrar, no bloqueamos la respuesta
      }

      // Guardar la respuesta real
      await addDoc(collection(db, "messages"), {
        text: botResponse.text,
        sender: "bot",
        timestamp: Date.now(),
        meta: {
          options: botResponse.options || [],
          emergency: botResponse.emergency || false
        }
      });

      setTyping(false);
      setShowOptions((botResponse.options || []).length > 0);

    }, delay);
  };

  // Manejar click en opciones rápidas
  const handleOptionClick = (index) => {
    // Mapear índices a textos (coincide con your options in render)
    const map = ["Estrés académico", "Ansiedad", "Tristeza", "Agendar cita"];
    const text = map[index] || (index + 1).toString();
    setInput(text);
    // Enviar inmediatamente
    setTimeout(() => sendMessage(text), 150);
  };

  // Atajo: enviar botón quick option (por ejemplo desde la respuesta del bot)
  const handleBotSuggestion = (suggestion) => {
    setInput(suggestion);
    setTimeout(() => sendMessage(suggestion), 150);
  };

  // ---------- Render ----------
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        aria-label="Abrir chat"
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
          zIndex: 1000
        }}
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
        width: "360px",
        height: "560px",
        border: "1px solid #ccc",
        borderRadius: "15px",
        display: "flex",
        flexDirection: "column",
        background: dark ? "#0f1724" : "white",
        color: dark ? "#e6eef8" : "#111",
        boxShadow: "0 6px 30px rgba(0, 0, 0, 0.2)",
        zIndex: 1000,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        overflow: "hidden"
      }}
    >
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
        color: "white",
        padding: "12px 15px",
        borderRadius: "15px 15px 0 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ fontWeight: "700", fontSize: "16px" }}>Apoyo Emocional ITSMIGRA</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setDark(d => !d)}
            aria-label="Alternar modo oscuro"
            title="Modo oscuro"
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            {dark ? "🌙" : "☀️"}
          </button>
          <button
            onClick={() => setMinimized(true)}
            aria-label="Minimizar chat"
            style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "16px" }}
          >
            _
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "14px",
        background: dark ? "#071028" : "#f9f9f9",
        transition: "background 200ms"
      }}>
        {messages.map((m, i) => (
          <div key={m.id || i} style={{
            display: "flex",
            justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
            marginBottom: "12px",
            alignItems: "flex-end"
          }}>
            <div style={{
              background: m.sender === "user" ? "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)" : (dark ? "#08223f" : "#e8f0fe"),
              color: m.sender === "user" ? "white" : (dark ? "#dbeafe" : "#111"),
              padding: "10px 14px",
              borderRadius: m.sender === "user" ? "15px 5px 15px 15px" : "5px 15px 15px 15px",
              maxWidth: "80%",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              lineHeight: "1.4",
              transition: "transform 200ms, opacity 200ms",
              transform: "translateY(0)",
              opacity: 1
            }}>
              {/* Si el mensaje viene con typing: mostrar indicador */}
              {m.typing ? (
                <span aria-live="polite">Escribiendo<span style={{opacity:0.7}}>•••</span></span>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: linkify(m.text) }} />
              )}

              {/* Si el bot adjuntó opciones en 'meta' */}
              {m.sender === "bot" && m.meta?.options?.length > 0 && (
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  {m.meta.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleBotSuggestion(opt)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "14px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "13px"
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

        {/* espacio para hacer scroll */}
        <div ref={bottomRef} />
      </div>

      {/* Quick options area (cuando showOptions true) */}
      {showOptions && (
        <div style={{ padding: "10px 12px", borderTop: "1px solid #eee", background: dark ? "#04121e" : "white" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              "Estrés académico",
              "Ansiedad",
              "Tristeza",
              "Agendar cita"
            ].map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(index)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "18px",
                  border: "1px solid #6a11cb",
                  background: "transparent",
                  color: "#6a11cb",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
                onMouseOver={(e) => { e.target.style.background = "#6a11cb"; e.target.style.color = "white"; }}
                onMouseOut={(e) => { e.target.style.background = "transparent"; e.target.style.color = "#6a11cb"; }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div style={{
        display: "flex",
        padding: "12px",
        borderTop: "1px solid #eee",
        background: dark ? "#061226" : "#fff",
        alignItems: "center",
        gap: "8px"
      }}>
        <button
          onClick={toggleListening}
          aria-pressed={listening}
          title="Grabar voz"
          style={{
            border: "none",
            background: listening ? "#ff6b6b" : "transparent",
            color: listening ? "white" : (dark ? "#cde8ff" : "#6a11cb"),
            padding: "8px",
            borderRadius: "50%",
            cursor: "pointer",
            fontSize: "16px"
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
            padding: "10px 14px",
            borderRadius: "22px",
            border: "1px solid #ddd",
            outline: "none",
            fontSize: "14px",
            background: dark ? "#071a2a" : "white",
            color: dark ? "#e6eef8" : "#111"
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          onClick={() => sendMessage()}
          aria-label="Enviar mensaje"
          style={{
            padding: "10px 14px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
