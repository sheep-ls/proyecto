import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export default function Admin() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");

  const colRef = useMemo(() => collection(db, "appointments"), []);

  useEffect(() => {
    const q = query(colRef, orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(list);
    });
    return () => unsub();
  }, [colRef]);

  const setStatus = async (id, status) => {
    await updateDoc(doc(db, "appointments", id), { status, updatedAt: serverTimestamp() });
  };

  const filtered = items.filter((i) => (filter === "all" ? true : i.status === filter));

  return (
    <div style={{ padding: 20 }}>
      <h2>Panel del Psicólogo</h2>
      <p>Revisar y gestionar citas.</p>

      <div style={{ margin: "12px 0" }}>
        <label>Filtrar: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="accepted">Aceptadas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </div>

      <ul>
        {filtered.map((a) => {
          const d = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          return (
            <li key={a.id} style={{ marginBottom: 8, padding: 8, border: "1px solid #ddd" }}>
              <div><b>Fecha:</b> {d.toLocaleString()}</div>
              <div><b>Alumno:</b> {a.userEmail}</div>
              <div><b>Motivo:</b> {a.reason}</div>
              <div><b>Estado:</b> {a.status}</div>
              <div style={{ marginTop: 6 }}>
                <button onClick={() => setStatus(a.id, "accepted")} disabled={a.status === "accepted"}>Aceptar</button>{" "}
                <button onClick={() => setStatus(a.id, "cancelled")} disabled={a.status === "cancelled"}>Cancelar</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
