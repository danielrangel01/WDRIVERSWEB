import { useState } from "react";
import { C, DEFAULT_RATE } from "../theme/palette.js";
import { fmt, fmtDate } from "./_helpers.js";
import { Badge, Btn, Field, Card, Empty } from "../components/UI.jsx";

export default function Cars({ data, actions, toast }) {
  const { cars = [] } = data;
  const [form, setForm] = useState({ plate: "", name: "", rate: String(DEFAULT_RATE), startDate: "" });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({});
  const [showInactive, setShowInactive] = useState(false);

  const add = async () => {
    if (!form.plate.trim()) { toast("Ingresa la placa", C.red); return; }
    setBusy(true);
    try {
      await actions.addCar({
        plate: form.plate, name: form.name,
        rate: parseInt(form.rate) || DEFAULT_RATE,
        startDate: form.startDate || null,
      });
      setForm({ plate: "", name: "", rate: String(DEFAULT_RATE), startDate: "" });
      toast("Carro agregado ✓");
    } catch (err) {
      toast(err.message || "Error al agregar", C.red);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (car) => {
    setEditId(car.id);
    setEdit({ plate: car.plate, name: car.name, rate: String(car.rate), startDate: car.startDate || "" });
  };

  const saveEdit = async (id) => {
    setBusy(true);
    try {
      await actions.updateCar(id, {
        plate: edit.plate, name: edit.name,
        rate: parseInt(edit.rate) || DEFAULT_RATE,
        startDate: edit.startDate || null,
      });
      setEditId(null);
      toast("Carro actualizado ✓");
    } catch (err) {
      toast(err.message || "Error", C.red);
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (car) => {
    if (!window.confirm(`¿Desactivar ${car.plate}? Se ocultará pero su historial se conserva.`)) return;
    try { await actions.deactivateCar(car.id); toast("Carro desactivado"); }
    catch (err) { toast(err.message || "Error", C.red); }
  };

  const reactivate = async (car) => {
    try { await actions.reactivateCar(car.id); toast("Carro reactivado ✓"); }
    catch (err) { toast(err.message || "Error", C.red); }
  };

  const active = cars.filter((c) => c.active);
  const inactive = cars.filter((c) => !c.active);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="🚙 Agregar Carro" accent={C.green}>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <Field label="Placa *" value={form.plate} onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))} placeholder="ABC123" maxLength={10} />
          <Field label="Conductor" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre (opcional)" />
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Tarifa diaria" type="number" inputMode="numeric" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
            <Field label="Fecha inicio" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          </div>
          <Btn onClick={add} color={C.green} disabled={busy} full>+ Agregar Carro</Btn>
        </div>
      </Card>

      <Card title={`Carros Activos (${active.length})`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {active.length === 0 && <Empty>Aún no has agregado carros</Empty>}
          {active.map((car) => (
            <div key={car.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              {editId === car.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Field label="Placa" value={edit.plate} onChange={(e) => setEdit((x) => ({ ...x, plate: e.target.value.toUpperCase() }))} />
                    <Field label="Conductor" value={edit.name} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Field label="Tarifa" type="number" inputMode="numeric" value={edit.rate} onChange={(e) => setEdit((x) => ({ ...x, rate: e.target.value }))} />
                    <Field label="Inicio" type="date" value={edit.startDate} onChange={(e) => setEdit((x) => ({ ...x, startDate: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn small onClick={() => saveEdit(car.id)} color={C.green} disabled={busy}>Guardar</Btn>
                    <Btn small outline color={C.muted} onClick={() => setEditId(null)}>Cancelar</Btn>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: C.yellow, fontSize: 15 }}>
                      {car.plate}{car.name ? <span style={{ color: C.muted, fontWeight: 400, fontSize: 13 }}> · {car.name}</span> : null}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                      {fmt(car.rate)}/día · inicio {car.startDate ? fmtDate(car.startDate) : <span style={{ color: C.red }}>sin definir</span>}
                    </div>
                  </div>
                  <Btn small outline color={C.blue} onClick={() => startEdit(car)}>✏️</Btn>
                  <Btn small outline danger onClick={() => deactivate(car)}>🗑</Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {inactive.length > 0 && (
        <Card title={`Carros Desactivados (${inactive.length})`}>
          <Btn small outline color={C.muted} onClick={() => setShowInactive((s) => !s)}>
            {showInactive ? "Ocultar" : "Mostrar"}
          </Btn>
          {showInactive && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {inactive.map((car) => (
                <div key={car.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}`, opacity: 0.7 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700 }}>{car.plate}</span>
                    {car.name && <span style={{ color: C.muted, fontSize: 13 }}> · {car.name}</span>}
                    <Badge color={C.muted}>inactivo</Badge>
                  </div>
                  <Btn small outline color={C.green} onClick={() => reactivate(car)}>Reactivar</Btn>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
