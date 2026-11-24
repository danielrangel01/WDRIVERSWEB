import { C } from "../theme/palette.js";
import { fmt, fmtDate, diffDays, monthLabel } from "./_helpers.js";
import { Badge, Pill, Empty } from "../components/UI.jsx";

export default function Dashboard({ data, alerts, sendWA }) {
  const { cars = [], documents = [], metrics } = data;
  const activeCars = cars.filter((c) => c.active);
  const m = metrics || {};
  const monthProfit = (m.monthPaid || 0) - (m.monthExp || 0);
  const alertColor = (l) => l === "critical" ? C.red : l === "urgent" ? C.orange : l === "warn" ? C.yellow : C.blue;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.muted, marginBottom: 9 }}>💰 TOTAL ACUMULADO</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Pill label="Deuda Pendiente" value={fmt(m.totalDebt)} color={C.yellow} sub="por cobrar" />
          <Pill label="Esperado Total" value={fmt(m.totalExpected)} color={C.blue} />
          <Pill label="Cobrado Total" value={fmt(m.totalPaid)} color={C.green} />
          <Pill label="Gastos Total" value={fmt(m.totalExp)} color={C.red} />
          <Pill label="Utilidad Neta" value={fmt(m.profit)} color={(m.profit || 0) >= 0 ? C.green : C.red} />
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.muted, marginBottom: 9, textTransform: "capitalize" }}>
          📆 {m.ym ? monthLabel(m.ym) : ""} (referencia)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Pill label="Cobrado Mes" value={fmt(m.monthPaid)} color={C.green} />
          <Pill label="Gastos Mes" value={fmt(m.monthExp)} color={C.red} />
          <Pill label="Utilidad Mes" value={fmt(monthProfit)} color={monthProfit >= 0 ? C.green : C.red} />
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>🔔 Alertas ({alerts.length})</span>
            <button onClick={() => sendWA("full")} style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📲 Enviar</button>
          </div>
          {alerts.slice(0, 8).map((a, i) => {
            const col = alertColor(a.level);
            return (
              <div key={i} style={{ padding: "10px 16px", borderTop: i > 0 ? `1px solid ${C.border}` : "none", display: "flex", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: col, fontSize: 13 }}>{a.title}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{a.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
          <span style={{ fontWeight: 700 }}>Progreso de Cobro</span>
          <span style={{ color: C.muted }}>{fmt(m.totalPaid)} / {fmt(m.totalExpected)}</span>
        </div>
        <div style={{ background: C.border, borderRadius: 99, height: 9, overflow: "hidden" }}>
          <div style={{ width: `${m.totalExpected > 0 ? Math.min(100, (m.totalPaid / m.totalExpected) * 100) : 0}%`, background: `linear-gradient(90deg,${C.green},${C.yellow})`, height: "100%", borderRadius: 99 }} />
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Deuda por Vehículo</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeCars.length === 0 && <Empty>Agrega carros en la pestaña 🚙 Carros</Empty>}
          {activeCars.map((car) => {
            const pc = m.perCar?.[car.id] || { debt: 0, paid: 0, billableDays: 0, elapsedDays: 0, offDays: 0 };
            const carDocs = documents.filter((d) => d.carId === car.id);
            const docExpired = carDocs.some((d) => diffDays(d.expiry) < 0);
            const docAlert = carDocs.some((d) => { const dd = diffDays(d.expiry); return dd >= 0 && dd <= 15; });
            return (
              <div key={car.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 800, color: C.yellow, fontSize: 15 }}>{car.plate}</span>
                    {car.name && <span style={{ color: C.muted, fontSize: 13 }}> · {car.name}</span>}
                  </div>
                  {carDocs.length === 0 ? <Badge color={C.muted}>Sin docs</Badge>
                    : docExpired ? <Badge color={C.red}>🚨 Doc</Badge>
                    : docAlert ? <Badge color={C.orange}>⚠️ Doc</Badge>
                    : <Badge color={C.green}>✓ Docs</Badge>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: C.muted }}>
                  <span>Tarifa: <b style={{ color: C.text }}>{fmt(car.rate)}</b></span>
                  <span>Inicio: <b style={{ color: car.startDate ? C.text : C.red }}>{car.startDate ? fmtDate(car.startDate) : "Sin definir"}</b></span>
                  <span>Cobrables: <b style={{ color: C.text }}>{pc.billableDays}</b> ({pc.elapsedDays}−{pc.offDays})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Cobrado: <b style={{ color: C.green }}>{fmt(pc.paid)}</b></span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: pc.debt > 0 ? C.red : pc.debt < 0 ? C.blue : C.green }}>
                    {pc.debt > 0 ? `Debe ${fmt(pc.debt)}` : pc.debt < 0 ? `A favor ${fmt(-pc.debt)}` : "Al día ✓"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
