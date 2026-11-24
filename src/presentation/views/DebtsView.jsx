import { useState, useEffect } from "react";
import { C } from "../theme/palette.js";
import { fmt, fmtDate, todayStr, carLabel, offReasonTag } from "./_helpers.js";
import { Badge, Btn, Field, Select, Card, Empty, Spinner } from "../components/UI.jsx";

// Metadatos de severidad de mora (mismo criterio que el motor de cobranza).
const SEV = {
  critical: { label: "Crítico", color: C.red },
  high: { label: "Alto", color: C.orange },
  medium: { label: "Medio", color: C.gold },
  low: { label: "Bajo", color: C.blue },
  ok: { label: "Al día", color: C.green },
};
const BUCKET_COLOR = { current: C.blue, d8_15: C.gold, d16_30: C.orange, d30plus: C.red };

export default function DebtsView({ data, actions, toast }) {
  const { cars = [], refinances = [], metrics = {}, settings = {} } = data;
  const activeCars = cars.filter((c) => c.active);

  // Estado del formulario de refinanciamiento
  const [refiCar, setRefiCar] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  // Estado del detalle de deuda
  const [detailCarId, setDetailCarId] = useState(null);

  // Motor de cobranza (antigüedad / mora)
  const [collections, setCollections] = useState(null);
  const loadCollections = () => {
    let alive = true;
    actions.getCollections(todayStr())
      .then((r) => { if (alive) setCollections(r); })
      .catch(() => {});
  };
  useEffect(() => { loadCollections(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const carId = refiCar || activeCars[0]?.id || "";
  const selectedCar = activeCars.find((c) => c.id === carId);
  const selectedDebt = metrics.perCar?.[carId]?.tariffDebt || 0;
  const totalDueDebt = Object.values(metrics.perCar || {}).reduce((sum, item) => sum + (item.dueDebt || 0), 0);
  const totalAccruedNotDue = Object.values(metrics.perCar || {}).reduce((sum, item) => sum + (item.accruedNotDue || 0), 0);

  // Vista previa de la cuota diaria
  const previewDaily = amount && days && Number(days) > 0
    ? Math.round(Number(amount) / Number(days)) : 0;

  const doRefinance = async () => {
    if (!carId) { toast("Selecciona un carro", C.red); return; }
    const amt = Number(amount);
    const d = Number(days);
    if (!amt || amt <= 0) { toast("Ingresa el monto a refinanciar", C.red); return; }
    if (!d || d < 1) { toast("Ingresa el plazo en días", C.red); return; }
    setBusy(true);
    try {
      await actions.createRefinance({ carId, date: todayStr(), originalAmount: amt, days: d, note });
      setAmount(""); setDays(""); setNote("");
      toast("Deuda refinanciada ✓");
    } catch (err) {
      toast(err.message || "Error al refinanciar", C.red);
    } finally { setBusy(false); }
  };

  const useFullDebt = () => {
    if (selectedDebt > 0) setAmount(String(selectedDebt));
  };

  const doPay = async (refi) => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) { toast("Ingresa el abono", C.red); return; }
    setBusy(true);
    try {
      await actions.payRefinance(refi.id, amt);
      setPayingId(null); setPayAmount("");
      toast("Abono registrado ✓");
    } catch (err) {
      toast(err.message || "Error", C.red);
    } finally { setBusy(false); }
  };

  const cancel = async (refi) => {
    if (!window.confirm(`¿Cancelar el refinanciamiento de ${carLabel(cars, refi.carId)}? La deuda del plan dejará de contarse.`)) return;
    try { await actions.cancelRefinance(refi.id); toast("Refinanciamiento cancelado"); }
    catch (err) { toast(err.message || "Error", C.red); }
  };

  const activeRefis = refinances.filter((r) => r.active);
  const settledRefis = refinances.filter((r) => !r.active);

  // Carros ordenados por deuda total (mayor primero)
  const carsByDebt = [...activeCars]
    .map((c) => ({ car: c, m: metrics.perCar?.[c.id] || {} }))
    .sort((a, b) => (b.m.debt || 0) - (a.m.debt || 0));

  // Si hay un carro seleccionado para detalle, mostramos la vista de detalle
  if (detailCarId) {
    return (
      <DebtDetail
        carId={detailCarId}
        actions={actions}
        toast={toast}
        adminPhone={settings.adminPhone}
        onBack={() => setDetailCarId(null)}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Resumen general */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Summary label="Deuda Total" value={fmt(metrics.totalDebt)} color={C.gold} />
        <Summary label="Vencido" value={fmt(totalDueDebt)} color={C.red} />
        <Summary label="Acumulado no vencido" value={fmt(totalAccruedNotDue)} color={C.blue} />
        <Summary label="Deuda de Tarifa" value={fmt(metrics.totalTariffDebt)} color={C.orange} />
        <Summary label="En Planes de Pago" value={fmt(metrics.totalPlanRemaining)} color={C.blue} />
      </div>

      {/* Cobranza y mora (aging) */}
      {collections && collections.summary && (
        <Card title="📊 Cobranza y Mora" accent={C.red}>
          {collections.summary.moraCount === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.green, fontWeight: 700, fontSize: 14 }}>
              ✅ Flota al día — {collections.summary.upToDateCount} carro(s) sin deudas por cobrar
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Totales */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 13 }}>
                <span style={{ color: C.muted }}>Cartera flota: <b style={{ color: C.text }}>{fmt(collections.summary.fleetDebt)}</b></span>
                <span style={{ color: C.muted }}>En mora (+8d): <b style={{ color: C.orange }}>{fmt(collections.summary.overdueAmount)}</b></span>
                {collections.summary.planBehind > 0 && (
                  <span style={{ color: C.muted }}>Planes atrasados: <b style={{ color: C.blue }}>{fmt(collections.summary.planBehind)}</b></span>
                )}
                <span style={{ color: C.muted }}>
                  {collections.summary.moraCount} por cobrar
                  {collections.summary.criticalCount > 0 && <b style={{ color: C.red }}> · {collections.summary.criticalCount} crítico(s)</b>}
                </span>
              </div>

              {/* Antigüedad por tramos */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {collections.buckets.map((b) => {
                  const info = collections.summary.buckets[b.key];
                  const col = BUCKET_COLOR[b.key] || C.muted;
                  return (
                    <div key={b.key} style={{
                      flex: "1 1 110px", minWidth: 104, background: C.surface, borderRadius: 10,
                      padding: "10px 12px", border: `1px solid ${col}44`,
                    }}>
                      <div style={{ color: col, fontSize: 11, fontWeight: 700 }}>{b.label}</div>
                      <div style={{ color: C.text, fontSize: 15, fontWeight: 800, marginTop: 3 }}>{fmt(info.amount)}</div>
                      <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{info.cars} carro(s)</div>
                    </div>
                  );
                })}
              </div>

              {/* Prioridad de cobro */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Prioridad de cobro
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {collections.cars.map((c, i) => {
                    const sev = SEV[c.severity] || SEV.ok;
                    return (
                      <div key={c.carId} onClick={() => setDetailCarId(c.carId)} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: C.surface, border: `1px solid ${sev.color}55`, borderRadius: 10,
                        padding: "10px 13px", cursor: "pointer", touchAction: "manipulation",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span style={{
                            background: sev.color + "22", color: sev.color, fontWeight: 800, fontSize: 12,
                            borderRadius: 6, padding: "3px 7px", flexShrink: 0,
                          }}>{i + 1}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: C.gold, fontSize: 14 }}>
                              {c.plate}{c.name ? <span style={{ color: C.muted, fontWeight: 500, fontSize: 12 }}> · {c.name}</span> : ""}
                            </div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                              {c.unpaidDays} día(s) sin pagar
                              {c.daysSinceOldest != null && ` · más antiguo hace ${c.daysSinceOldest}d`}
                              {c.planBehind > 0 && <span style={{ color: C.blue }}> · plan atrasado {fmt(c.planBehind)}</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: sev.color }}>{fmt(c.dueDebt ?? c.debt)}</span>
                          <Badge color={sev.color}>{sev.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enviar resumen por WhatsApp */}
              <Btn
                color={C.green}
                onClick={async () => {
                  const phone = settings.adminPhone;
                  if (!phone) { toast("Configura WhatsApp en ⚙️", C.red); return; }
                  try {
                    const r = await actions.sendWhatsApp({ kind: "text", to: phone, text: collections.whatsappText });
                    if (r && r.skipped) toast("WhatsApp no configurado en el servidor", C.red);
                    else toast("📲 Resumen enviado ✓");
                  } catch (err) { toast(err.message || "Error enviando WhatsApp", C.red); }
                }}
              >📲 Enviar resumen de cobranza</Btn>
            </div>
          )}
        </Card>
      )}

      {/* Formulario de refinanciamiento */}
      <Card title="💳 Refinanciar Deuda" accent={C.gold}>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <Select label="Conductor / Carro" value={carId} onChange={(e) => { setRefiCar(e.target.value); setAmount(""); }}>
            {activeCars.length === 0 && <option value="">— sin carros —</option>}
            {activeCars.map((c) => (
              <option key={c.id} value={c.id}>{carLabel(cars, c.id)}</option>
            ))}
          </Select>

          {selectedCar && (
            <div style={{ background: C.surface, borderRadius: 9, padding: "10px 13px", fontSize: 13, color: C.muted }}>
              Deuda de tarifa actual: <b style={{ color: selectedDebt > 0 ? C.orange : C.green }}>{fmt(selectedDebt)}</b>
              {selectedDebt > 0 && (
                <button onClick={useFullDebt} style={{ marginLeft: 10, background: "none", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                  Usar deuda completa
                </button>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Monto a refinanciar" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000000" />
            <Field label="Plazo (días)" type="number" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} placeholder="20" />
          </div>

          {previewDaily > 0 && (
            <div style={{ background: C.gold + "14", border: `1px solid ${C.gold}44`, borderRadius: 9, padding: "11px 14px", fontSize: 13 }}>
              <div style={{ color: C.text }}>
                Cuota diaria del plan: <b style={{ color: C.gold, fontSize: 16 }}>{fmt(previewDaily)}</b>
              </div>
              {selectedCar && (
                <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                  El conductor pagará <b style={{ color: C.text }}>{fmt(selectedCar.rate + previewDaily)}</b>/día
                  <span style={{ color: C.muted }}> (tarifa {fmt(selectedCar.rate)} + cuota {fmt(previewDaily)})</span>
                </div>
              )}
            </div>
          )}

          <Field label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Acuerdo, motivo, etc." />
          <Btn onClick={doRefinance} color={C.gold} disabled={busy} full>Refinanciar Deuda</Btn>
        </div>
      </Card>

      {/* Planes de refinanciamiento activos */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Planes de Pago Activos ({activeRefis.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeRefis.length === 0 && <Empty>No hay refinanciamientos activos</Empty>}
          {activeRefis.map((r) => {
            const pct = r.originalAmount > 0 ? Math.min(100, (r.paidToPlan / r.originalAmount) * 100) : 0;
            return (
              <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, color: C.gold, fontSize: 15 }}>{carLabel(cars, r.carId)}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Refinanciado el {fmtDate(r.date)}{r.note ? ` · ${r.note}` : ""}</div>
                  </div>
                  <Badge color={C.blue}>{r.installmentsPaid}/{r.days} cuotas</Badge>
                </div>

                {/* Barra de progreso */}
                <div style={{ background: C.border, borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ width: `${pct}%`, background: `linear-gradient(90deg,${C.green},${C.gold})`, height: "100%", borderRadius: 99 }} />
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 12, marginBottom: 12 }}>
                  <span style={{ color: C.muted }}>Monto: <b style={{ color: C.text }}>{fmt(r.originalAmount)}</b></span>
                  <span style={{ color: C.muted }}>Cuota/día: <b style={{ color: C.text }}>{fmt(r.dailyInstallment)}</b></span>
                  <span style={{ color: C.muted }}>Abonado: <b style={{ color: C.green }}>{fmt(r.paidToPlan)}</b></span>
                  <span style={{ color: C.muted }}>Saldo: <b style={{ color: C.orange }}>{fmt(r.remaining)}</b></span>
                </div>

                {payingId === r.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <Field label="Abono al plan" type="number" inputMode="numeric" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(r.dailyInstallment)} />
                    <Btn small color={C.green} onClick={() => doPay(r)} disabled={busy}>Abonar</Btn>
                    <Btn small outline color={C.muted} onClick={() => { setPayingId(null); setPayAmount(""); }}>Cancelar</Btn>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn small color={C.green} onClick={() => { setPayingId(r.id); setPayAmount(String(r.dailyInstallment)); }}>+ Abonar</Btn>
                    <Btn small outline danger onClick={() => cancel(r)}>Cancelar plan</Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle de deudas por conductor */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Detalle de Deudas por Conductor</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {carsByDebt.length === 0 && <Empty>No hay carros activos</Empty>}
          {carsByDebt.map(({ car, m }) => (
            <div key={car.id} onClick={() => setDetailCarId(car.id)} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14,
              cursor: "pointer", transition: "border-color 0.15s", touchAction: "manipulation",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.gold)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 800, color: C.gold, fontSize: 15 }}>{car.plate}</span>
                  {car.name && <span style={{ color: C.muted, fontSize: 13 }}> · {car.name}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: (m.debt || 0) > 0 ? C.red : C.green }}>
                    {(m.debt || 0) > 0 ? fmt(m.debt) : "Al día ✓"}
                  </span>
                  <span style={{ color: C.muted, fontSize: 18 }}>›</span>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: C.muted }}>
                <span>Tarifa: <b style={{ color: C.text }}>{fmt(car.rate)}/día</b></span>
                {(m.dueDebt || 0) > 0 && (
                  <span>Vencido: <b style={{ color: C.red }}>{fmt(m.dueDebt)}</b></span>
                )}
                {(m.accruedNotDue || 0) > 0 && (
                  <span>
                    {m.paymentFrequency === "weekly" ? "Acumulado semanal" : "Acumulado no vencido"}:{" "}
                    <b style={{ color: C.blue }}>{fmt(m.accruedNotDue)}</b>
                    {m.nextDueDate ? ` · vence ${fmtDate(m.nextDueDate)}` : ""}
                  </span>
                )}
                {(m.tariffDebt || 0) !== 0 && (
                  <span>Deuda tarifa: <b style={{ color: C.orange }}>{fmt(m.tariffDebt)}</b></span>
                )}
                {(m.planRemaining || 0) > 0 && (
                  <span>En plan: <b style={{ color: C.blue }}>{fmt(m.planRemaining)}</b></span>
                )}
                {(m.planDaily || 0) > 0 && (
                  <span>Paga/día: <b style={{ color: C.text }}>{fmt(m.dailyTotal)}</b></span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Planes saldados (historial) */}
      {settledRefis.length > 0 && (
        <Card title={`Refinanciamientos Finalizados (${settledRefis.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {settledRefis.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, opacity: 0.75 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{carLabel(cars, r.carId)}</span>
                  <span style={{ color: C.muted, fontSize: 12 }}> · {fmt(r.originalAmount)} en {r.days} días</span>
                </div>
                <Badge color={C.green}>Saldado ✓</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── VISTA DE DETALLE DE DEUDA ──────────────────────────────────────────────────
export function DebtDetail({ carId, actions, onBack, toast, adminPhone }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all | unpaid | paid

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    actions.getCarDebtDetail(carId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((err) => { if (!cancelled) setError(err.message || "Error cargando detalle"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [carId, actions]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Cargando detalle…</div>;
  if (error) return <div style={{ padding: 40, textAlign: "center", color: C.red }}>{error}</div>;
  if (!detail) return null;

  const { plate, name, rate, today, billableDays, paidDays, unpaidDays, totalExpected, totalPaid, totalDebt, days, payments, offDays } = detail;

  const filteredDays = days.filter((d) => {
    if (filter === "unpaid") return !d.paid;
    if (filter === "paid") return d.paid;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header con botón atrás */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px",
          color: C.text, cursor: "pointer", fontWeight: 700, fontSize: 14,
        }}>‹ Volver</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.gold }}>{plate}</div>
          {name && <div style={{ fontSize: 12, color: C.muted }}>{name}</div>}
        </div>
      </div>

      {/* Resumen */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Summary label="Deuda Total" value={fmt(totalDebt)} color={C.red} />
        <Summary label="Vencido" value={fmt(detail.dueDebt || 0)} color={C.orange} />
        <Summary label="Acumulado no vencido" value={fmt(detail.accruedNotDue || 0)} color={C.blue} />
        <Summary label="Cobrado" value={fmt(totalPaid)} color={C.green} />
        <Summary label="Esperado" value={fmt(totalExpected)} color={C.gold} />
        <Summary label="Tarifa/día" value={fmt(rate)} color={C.blue} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Badge color={C.muted}>{billableDays} días cobrables</Badge>
        <Badge color={C.green}>{paidDays} pagados</Badge>
        <Badge color={C.red}>{unpaidDays} sin pagar</Badge>
        {offDays.length > 0 && <Badge color={C.orange}>{offDays.length} no trabajados</Badge>}
        {payments.length > 0 && <Badge color={C.blue}>{payments.length} pagos registrados</Badge>}
      </div>

      {/* Estado de cuenta (período seleccionable) */}
      <Statement carId={carId} actions={actions} toast={toast} adminPhone={adminPhone} />

      {/* Leyenda */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: C.muted }}>
        <span><span style={{ display: "inline-block", width: 12, height: 12, background: C.red + "33", border: `1px solid ${C.red}`, borderRadius: 3, marginRight: 4, verticalAlign: "middle" }}></span>Sin pagar</span>
        <span><span style={{ display: "inline-block", width: 12, height: 12, background: C.green + "33", border: `1px solid ${C.green}`, borderRadius: 3, marginRight: 4, verticalAlign: "middle" }}></span>Pagado</span>
        <span><span style={{ display: "inline-block", width: 12, height: 12, background: C.gold + "33", border: `1px solid ${C.gold}`, borderRadius: 3, marginRight: 4, verticalAlign: "middle" }}></span>Pago parcial</span>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { v: "all", l: `Todos (${days.length})` },
          { v: "unpaid", l: `Sin pagar (${unpaidDays})` },
          { v: "paid", l: `Pagados (${paidDays})` },
        ].map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v)} style={{
            padding: "6px 12px", borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 600,
            border: `1px solid ${filter === f.v ? C.gold : C.border}`,
            background: filter === f.v ? C.gold + "14" : C.card,
            color: filter === f.v ? C.gold : C.muted,
          }}>{f.l}</button>
        ))}
      </div>

      {/* Listado de días */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filteredDays.length === 0 && <Empty>No hay días para mostrar</Empty>}
        {filteredDays.map((d, i) => {
          const isPartial = d.partial;
          const bg = d.paid ? C.green + "14" : isPartial ? C.gold + "14" : C.red + "14";
          const border = d.paid ? C.green + "66" : isPartial ? C.gold + "66" : C.red + "66";
          const text = d.paid ? C.green : isPartial ? C.gold : C.red;
          return (
            <div key={d.date} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", background: bg, border: `1px solid ${border}`, borderRadius: 10,
            }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{fmtDate(d.date)}</span>
                {d.offDayReason && (
                  <span style={{ fontSize: 10, color: C.orange, marginTop: 2 }}>
                    {offReasonTag(d.offDayReason, d.offDayDetail)}
                  </span>
                )}
                {d.paymentFrequency === "weekly" && d.dueDate && !d.due && (
                  <span style={{ fontSize: 10, color: C.blue, marginTop: 2 }}>
                    Acumulado semanal · vence {fmtDate(d.dueDate)}
                  </span>
                )}
                {isPartial && (
                  <span style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                    Abonado {fmt(d.paidAmount)} de {fmt(d.amount)}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: text }}>
                  {d.paid ? "✓ " : ""}{fmt(d.amount)}
                </span>
                <span style={{ fontSize: 10, color: C.muted }}>
                  {d.paid ? "Pagado" : isPartial ? "Parcial" : "Sin pagar"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de pagos */}
      {payments.length > 0 && (
        <Card title={`Pagos Registrados (${payments.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...payments].reverse().map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{fmtDate(p.date)}</span>
                  {p.note && <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{p.note}</span>}
                </div>
                <span style={{ fontWeight: 800, color: C.green }}>{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Summary({ label, value, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", flex: "1 1 140px", minWidth: 130 }}>
      <div style={{ color: C.muted, fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 19, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

// ── ESTADO DE CUENTA (extracto por período) ────────────────────────────────────
function Statement({ carId, actions, toast, adminPhone }) {
  const [month, setMonth] = useState(() => todayStr().slice(0, 7));
  const [stmt, setStmt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate(); // último día del mes
    const endOfMonth = `${month}-${String(lastDay).padStart(2, "0")}`;
    const tod = todayStr();
    const to = endOfMonth < tod ? endOfMonth : tod; // no proyectar días futuros
    actions.getAccountStatement(carId, `${month}-01`, to)
      .then((d) => { if (!cancelled) setStmt(d); })
      .catch((err) => { if (!cancelled) setError(err.message || "Error cargando estado de cuenta"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [carId, month, actions]);

  const dest = phone || adminPhone || "";

  const row = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 };

  return (
    <Card title="📄 Estado de Cuenta" accent={C.gold}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Período" type="month" value={month} max={todayStr().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} />

        {loading && <div style={{ textAlign: "center", padding: 18 }}><Spinner /></div>}
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}

        {!loading && !error && stmt && (
          <>
            <div>
              <div style={row}><span style={{ color: C.muted }}>Saldo anterior</span><b style={{ color: C.text }}>{fmt(stmt.openingBalance)}</b></div>
              <div style={row}>
                <span style={{ color: C.muted }}>Cargos del período <span style={{ fontSize: 11 }}>({stmt.chargesDays} día{stmt.chargesDays === 1 ? "" : "s"})</span></span>
                <b style={{ color: C.orange }}>+{fmt(stmt.charges)}</b>
              </div>
              <div style={row}>
                <span style={{ color: C.muted }}>Abonos del período <span style={{ fontSize: 11 }}>({stmt.paymentsCount})</span></span>
                <b style={{ color: C.green }}>−{fmt(stmt.payments)}</b>
              </div>
              <div style={{ ...row, borderBottom: "none", paddingTop: 12 }}>
                <span style={{ fontWeight: 700 }}>Saldo actual</span>
                <b style={{ fontSize: 18, color: stmt.closingBalance > 0 ? C.red : C.green }}>{fmt(stmt.closingBalance)}</b>
              </div>
            </div>

            {stmt.plan?.active && (
              <div style={{ background: C.surface, borderRadius: 9, padding: "10px 13px", fontSize: 12, color: C.muted }}>
                🔁 Plan de pago: <b style={{ color: C.blue }}>{fmt(stmt.plan.dailyInstallment)}/día</b> ·
                abonado <b style={{ color: C.text }}>{fmt(stmt.plan.paidToPlan)}</b> de {fmt(stmt.plan.originalAmount)} ·
                saldo <b style={{ color: C.orange }}>{fmt(stmt.plan.remaining)}</b>
              </div>
            )}

            <Field label="WhatsApp destino (opcional)" inputMode="numeric" value={phone}
              onChange={(e) => setPhone(e.target.value)} placeholder={adminPhone || "573001234567"} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn color={C.green} onClick={async () => {
                if (!dest) { toast("Configura WhatsApp o escribe un número", C.red); return; }
                try {
                  const r = await actions.sendWhatsApp({ kind: "text", to: dest, text: stmt.whatsappText });
                  if (r && r.skipped) toast("WhatsApp no configurado en el servidor", C.red);
                  else toast("📲 Estado de cuenta enviado ✓");
                } catch (err) { toast(err.message || "Error enviando WhatsApp", C.red); }
              }}>📲 Enviar estado de cuenta</Btn>
              <Btn outline color={C.muted} onClick={() => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(stmt.whatsappText)
                    .then(() => toast("Estado de cuenta copiado ✓"))
                    .catch(() => toast("No se pudo copiar", C.red));
                } else {
                  toast("Copiado no disponible", C.red);
                }
              }}>Copiar texto</Btn>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
