import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function MisCitas() {
  const [citas, setCitas] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "citas"),
      where("alumnoId", "==", auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCitas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Mis Citas</h2>
      {citas.length === 0 ? <p>No tienes citas registradas</p> : (
        <ul>
          {citas.map((cita) => (
            <li key={cita.id} className="border p-2 mb-2 rounded">
              <p>📅 {cita.fecha} ⏰ {cita.hora}</p>
              <p>📝 {cita.motivo}</p>
              <p>Estado: {cita.estado}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
