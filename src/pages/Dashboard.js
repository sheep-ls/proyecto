import Appointments from "../components/Appointments";
import Chatbot from "../components/Chatbot";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div style={{ padding: 20 }}>
      <h2>Panel del Alumno</h2>
      <p>Bienvenido {user?.email}</p>

      <section style={{ marginTop: 16 }}>
        <Appointments />
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>Chatbot de Primeros Auxilios Emocionales</h3>
        <Chatbot />
      </section>
    </div>
  );
}
