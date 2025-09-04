import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";

export default function Admin() {
  const [citas, setCitas] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "citas"), (snapshot) => {
      setCitas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const actualizarEstado = async (id, nuevoEstado) => {
    const ref = doc(db, "citas", id);
    await updateDoc(ref, { estado: nuevoEstado });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Citas Pendientes</h2>
      {citas.map((cita) => (
        <div key={cita.id} className="border p-2 mb-2 rounded">
          <p>Alumno: {cita.alumnoId}</p>
          <p>📅 {cita.fecha} ⏰ {cita.hora}</p>
          <p>📝 {cita.motivo}</p>
          <p>Estado: {cita.estado}</p>
          {cita.estado === "pendiente" && (
            <div className="space-x-2">
              <button onClick={() => actualizarEstado(cita.id, "aceptada")} className="bg-green-600 text-white px-2 py-1 rounded">Aceptar</button>
              <button onClick={() => actualizarEstado(cita.id, "cancelada")} className="bg-red-600 text-white px-2 py-1 rounded">Cancelar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
