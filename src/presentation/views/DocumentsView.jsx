import { useState } from "react";
import { C, DOC_TYPES } from "../theme/palette.js";
import { fmtDate, diffDays, carLabel, docStatusInfo } from "./_helpers.js";
import { Badge, Btn, Field, Select, Card, Empty } from "../components/UI.jsx";

export default function Documents({ data, actions, toast }) {
  const { cars = [], documents = [] } = data;
  const activeCars = cars.filter((c) => c.active);
  const [form, setForm] = useState({ carId: "", type: DOC_TYPES[0], expiry: "", note: "" });
  const [filterCar, setFilterCar] = useState("");
  const [busy, setBusy] = useState(false);

  const carId = form.carId || activeCars[0]?.id || "";

  const add = async () => {
    if (!carId) { toast("Agrega un carro primero", C.red); return; }
    if (!form.expiry) { toast("Ingresa el vencimiento", C.red); return; }
    setBusy(true);
    try { await actions.addDocument({ carId, type: form.type, expiry: form.expiry, note: form.note }); setForm((f) => ({ ...f, expiry: "", note: "" })); toast("Documento registrado ✓"); }
    catch (err) { toast(err.message || "Error", C.red); } finally { setBusy(false); }
  };
  const remove = async (id) => { try { await actions.deleteDocument(id); } catch { toast("Error", C.red); } };

  const docs = documents.filter((d) => !filterCar || d.carId === filterCar).sort((a, b) => a.expiry.localeCompare(b.expiry));
  const upcoming = documents.filter((d) => { const dd = diffDays(d.expiry); return dd >= 0 && dd <= 60; }).sort((a, b) => a.expiry.localeCompare(b.expiry));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="📄 Registrar Documento" accent={C.blue}>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <Select label="Vehículo" value={carId} onChange={(e) => setForm((f) => ({ ...f, carId: e.target.value }))}>
            {activeCars.length === 0 && <option value="">— sin carros —</option>}
            {activeCars.map((c) => <option key={c.id} value={c.id}>{carLabel(cars, c.id)}</option>)}
          </Select>
          <Select label="Tipo" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Field label="Vencimiento" type="date" value={form.expiry} onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))} />
          <Field label="Nota" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Póliza, etc." />
          <Btn onClick={add} color={C.blue} disabled={busy} full>+ Registrar Documento</Btn>
        </div>
      </Card>

      {upcoming.length > 0 && (
        <Card title="📅 Próximos Vencimientos (60 días)" accent={C.orange}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map((doc) => {
              const days = diffDays(doc.expiry); const s = docStatusInfo(doc.expiry);
              return (
                <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: C.yellow, fontSize: 13 }}>{carLabel(cars, doc.carId)}</span>
                    <span style={{ color: C.muted, fontSize: 12 }}> — {doc.type}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: s.color, fontSize: 13 }}>{fmtDate(doc.expiry)}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{days === 0 ? "¡HOY!" : `en ${days}d`}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card title={`Documentos (${docs.length})`}>
        <Select value={filterCar} onChange={(e) => setFilterCar(e.target.value)} style={{ marginBottom: 12 }}>
          <option value="">Todos los carros</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.plate}</option>)}
        </Select>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.length === 0 && <Empty>Sin documentos registrados</Empty>}
          {docs.map((doc) => {
            const s = docStatusInfo(doc.expiry);
            return (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}><b style={{ color: C.yellow }}>{carLabel(cars, doc.carId)}</b> <Badge color={C.blue}>{doc.type}</Badge></div>
                  <div style={{ marginTop: 4 }}><Badge color={s.color}>{s.icon} {s.label}</Badge> <span style={{ color: C.muted, fontSize: 11 }}>{fmtDate(doc.expiry)}</span></div>
                </div>
                <Btn small outline danger onClick={() => remove(doc.id)}>✕</Btn>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
