import { useState } from "react";
import { C } from "../theme/palette.js";
import { todayStr, fmt, fmtDate, carLabel } from "./_helpers.js";
import { Badge, Btn, Field, Select, Card, Empty } from "../components/UI.jsx";

// Sección Nequi: pagos entrantes detectados por correo, pendientes de conciliar.
export default function NequiView({ data, actions, toast }) {
  const { cars = [], pendingPayments = [] } = data;
  const activeCars = cars.filter((c) => c.active);
  const [busyId, setBusyId] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const total = pendingPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await actions.syncNequi();
      if (r && r.ok === false) {
        toast("Correo de Nequi sin configurar en el servidor", C.red);
      } else if (r && r.created > 0) {
        toast(`✓ ${r.created} pago(s) nuevo(s) detectado(s)`);
      } else {
        toast("Sin pagos nuevos por ahora");
      }
    } catch (err) {
      toast(err.message || "Error al sincronizar", C.red);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: C.blue + "14", border: `1px solid ${C.blue}44`, borderRadius: 12, padding: "12px 14px", fontSize: 13 }}>
        🏦 Los pagos recibidos por <b>Nequi</b> se detectan desde el correo y quedan <b>pendientes</b>.
        Asigna el carro y la fecha, y <b>aprueba</b> para registrarlo como pago.
        <div style={{ marginTop: 10 }}>
          <Btn small onClick={sync} disabled={syncing}>{syncing ? "Sincronizando…" : "↻ Sincronizar ahora"}</Btn>
        </div>
      </div>

      {pendingPayments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          <Badge color={C.orange}>{pendingPayments.length} pendiente(s)</Badge>
          <Badge color={C.gold}>{fmt(total)} por conciliar</Badge>
        </div>
      )}

      {pendingPayments.length === 0 ? (
        <Card title="Sin pagos pendientes">
          <Empty>No hay pagos de Nequi por aprobar. Pulsa “Sincronizar ahora”.</Empty>
        </Card>
      ) : (
        pendingPayments.map((p) => (
          <PendingRow
            key={p.id}
            p={p}
            cars={cars}
            activeCars={activeCars}
            actions={actions}
            toast={toast}
            busy={busyId === p.id}
            setBusyId={setBusyId}
          />
        ))
      )}
    </div>
  );
}

function PendingRow({ p, cars, activeCars, actions, toast, busy, setBusyId }) {
  const [carId, setCarId] = useState(activeCars[0]?.id || "");
  const [date, setDate] = useState(p.detectedDate || todayStr());
  const [note, setNote] = useState("");

  const approve = async () => {
    if (!carId) { toast("Selecciona un carro", C.red); return; }
    setBusyId(p.id);
    try {
      await actions.approvePendingPayment(p.id, { carId, date, note });
      toast("Pago aprobado ✓");
    } catch (err) {
      toast(err.message || "Error", C.red);
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async () => {
    setBusyId(p.id);
    try {
      await actions.dismissPendingPayment(p.id);
      toast("Pago descartado");
    } catch (err) {
      toast(err.message || "Error", C.red);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card title={`🏦 ${fmt(p.amount)}`} accent={C.gold}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
        Detectado el <b style={{ color: C.text }}>{fmtDate(p.detectedDate)}</b>
        {p.from ? ` · ${p.from}` : ""}
        {p.subject ? ` · ${p.subject}` : ""}
      </div>

      {p.snippet && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 11px", fontSize: 12, color: C.muted, marginBottom: 12, maxHeight: 90, overflow: "auto" }}>
          {p.snippet}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <Select label="Asignar a carro" value={carId} onChange={(e) => setCarId(e.target.value)}>
          {activeCars.length === 0 && <option value="">— sin carros activos —</option>}
          {activeCars.map((c) => <option key={c.id} value={c.id}>{carLabel(cars, c.id)}</option>)}
        </Select>
        <Field label="Fecha del pago" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Field label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: abono semana" />
        <div style={{ display: "flex", gap: 8 }}>
          <Btn full color={C.green} onClick={approve} disabled={busy}>{busy ? "…" : "✓ Aprobar"}</Btn>
          <Btn full outline danger onClick={dismiss} disabled={busy}>Descartar</Btn>
        </div>
      </div>
    </Card>
  );
}
