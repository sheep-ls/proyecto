import { useState } from "react";
import { db, auth } from "../firebase"; 
import { collection, addDoc } from "firebase/firestore";

export default function CitasForm() {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "citas"), {
        alumnoId: auth.currentUser.uid,
        fecha,
        hora,
        motivo,
        estado: "pendiente"
      });
      alert("✅ Cita registrada con éxito");
      setFecha("");
      setHora("");
      setMotivo("");
    } catch (error) {
      console.error("Error al guardar cita:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded">
      <h2 className="text-xl font-bold">Agendar Cita</h2>
      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="border p-2 w-full" required />
      <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="border p-2 w-full" required />
      <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" className="border p-2 w-full" required />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Agendar</button>
    </form>
  );
}
