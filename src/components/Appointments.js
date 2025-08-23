import { useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, onSnapshot,
  orderBy, query, serverTimestamp, updateDoc, where, Timestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Appointments() {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [items, setItems] = useState([]);

  const colRef = useMemo(() => collection(db, "appointments"), []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      colRef,
      where("userId", "==", user.uid),
      orderBy("date", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(list);
    });
    return () => unsub();
  }, [user, colRef]);

  const resetForm = () => { setReason(""); setDateStr(""); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dateStr || !reason) return alert("Completa fecha y motivo");
    const date = Timestamp.fromDate(new Date(dateStr));
    try {
      if (editingId) {
        await updateDoc(doc(db, "appointments", editingId), {
          reason,
          date,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(colRef, {
          userId: user.uid,
          userEmail: user.email,
          reason,
          date,
          status: "pending",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (appt) => {
    setEditingId(appt.id);
    setReason(appt.reason);
    const d = appt.date?.toDate ? appt.date.toDate() : new Date(appt.date);
    const iso = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    setDateStr(iso);
  };

  const handleCancel = async (id) => {
    await updateDoc(doc(db, "appointments", id), { status: "cancelled", updatedAt: serverTimestamp() });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar cita definitivamente?")) return;
    await deleteDoc(doc(db, "appointments", id));
  };

  return (
    <div>
      <h3>Mis Citas</h3>
      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <input type="datetime-local" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
        <input type="text" placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="submit">{editingId ? "Guardar cambios" : "Agendar"}</button>
        {editingId && <button type="button" onClick={resetForm}>Cancelar edición</button>}
      </form>

      <ul>
        {items.map((a) => {
          const d = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          return (
            <li key={a.id} style={{ marginBottom: 8, padding: 8, border: "1px solid #ddd" }}>
              <div><b>Fecha:</b> {d.toLocaleString()}</div>
              <div><b>Motivo:</b> {a.reason}</div>
              <div><b>Estado:</b> {a.status}</div>
              <div style={{ marginTop: 6 }}>
                <button onClick={() => handleEdit(a)} disabled={a.status !== "pending"}>Editar</button>{" "}
                <button onClick={() => handleCancel(a.id)} disabled={a.status !== "pending"}>Cancelar</button>{" "}
                <button onClick={() => handleDelete(a.id)}>Eliminar</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
