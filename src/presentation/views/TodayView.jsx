import { useState, useEffect, useCallback } from "react";
import { C } from "../theme/palette.js";
import { todayStr, fmt, fmtDate } from "./_helpers.js";
import { Badge, Btn, Field, Pill, Card, Empty } from "../components/UI.jsx";

// Etiquetas/colores por nivel de alerta de documentos.
const DOC_LEVEL = {
  vencido: { color: C.red, label: "Vencido" },
  urgente: { color: C.orange, label: "≤15 días" },
  proximo: { color: C.gold, label: "≤30 días" },
  info: { color: C.blue, label: "Sin fecha" },
};

// Colores por nivel de recordatorio (motor de recordatorios).
const REM_LEVEL = { critical: C.red, urgent: C.orange, warn: C.orange, info: C.blue, ok: C.green };

// Colores y etiquetas por estado de la predicción de recaudo del día.
const FORECAST_STATE = {
  closed: { color: C.green, icon: "🏆", label: "Meta cumplida" },
  ahead: { color: C.green, icon: "🚀", label: "Adelantado" },
  on_track: { color: C.gold, icon: "🟢", label: "En camino" },
  behind: { color: C.orange, icon: "🟡", label: "Atrasado" },
  critical: { color: C.red, icon: "🔴", label: "Hay que apretar" },
  early: { color: C.blue, icon: "🌅", label: "Muy temprano" },
};

/**
 * Centro de Gestión del Día.
 * Muestra, para una fecha, qué cobrar y qué atender hoy: deuda por carro,
 * atrasados, planes de refinanciación, documentos por vencer y pagos Nequi
 * pendientes de conciliar. Permite registrar pagos directamente.
 */
export default function TodayView({ actions, toast, data }) {
  const [date, setDate] = useState(todayStr());
  const [agenda, setAgenda] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moment, setMoment] = useState(() => {
    const h = new Date().getHours();
    return h >= 17 ? "evening" : h >= 12 ? "midday" : "morning";
  });
  const [reminders, setReminders] = useState(null);
  const [driverCar, setDriverCar] = useState(null);

  const refresh = useCallback(() => {
    let alive = true;
    setLoading(true);
    return actions.getAgenda(date)
      .then((r) => { if (alive) setAgenda(r); })
      .catch((err) => { if (alive) toast(err.message || "Error cargando el día", C.red); })
      .finally(() => { if (alive) setLoading(false); });
  }, [actions, date, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    let alive = true;
    actions.getReminders(date, moment)
      .then((r) => { if (alive) setReminders(r); })
      .catch(() => { if (alive) setReminders(null); });
    return () => { alive = false; };
  }, [actions, date, moment]);

  const registerPayment = async (carId, amount, note, handoverId = null) => {
    await actions.addPayment({ carId, date, amount, note, handoverId });
    await refresh();
  };

  const s = agenda?.summary || {};
  const collect = agenda?.collectToday || [];
  const checklist = agenda?.checklist || [];
  const refinances = agenda?.refinances || [];
  const documents = agenda?.documents || [];
  const nequi = agenda?.nequiPending || [];
  // Prioriza atrasados y luego mayor deuda.
  const collectSorted = [...collect].sort((a, b) => b.daysBehind - a.daysBehind || (b.dueDebt || b.debt) - (a.dueDebt || a.debt));
  const totalCars = s.fleetTotal || 0;
  const coveredCount = s.coveredCount || 0;
  const pct = totalCars > 0 ? Math.round((coveredCount / totalCars) * 100) : 0;
  const forecast = agenda?.forecast || null;
  const fState = forecast ? (FORECAST_STATE[forecast.status] || FORECAST_STATE.on_track) : null;
  const fPct = forecast && forecast.target > 0 ? Math.min(100, Math.round((forecast.collected / forecast.target) * 100)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 170px" }}>
          <Field label="Día de gestión" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Btn small outline onClick={refresh} disabled={loading}>{loading ? "…" : "↻ Actualizar"}</Btn>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Pill label="Deuda flota" value={fmt(s.fleetDebt)} color={C.red} sub="total por cobrar" />
        <Pill label="Cobrar hoy" value={`${s.collectTodayCount || 0} carros`} color={C.gold} sub={fmt(s.collectTodayAmount)} />
        <Pill label="Atrasados" value={s.overdueCount || 0} color={C.orange} sub={fmt(s.overdueAmount)} />
        <Pill label="Al día" value={s.upToDateCount || 0} color={C.green} sub="sin deuda" />
        <Pill label="Refinanciado" value={s.refinanceCount || 0} color={C.blue} sub={fmt(s.refinanceRemaining)} />
        <Pill label="Docs" value={s.docsAlertCount || 0} color={C.orange} sub={s.docsExpiredCount ? `${s.docsExpiredCount} vencidos` : "por vencer"} />
        <Pill label="Nequi" value={s.nequiPendingCount || 0} color={C.blue} sub={fmt(s.nequiPendingAmount)} />
      </div>

      {forecast && (
        <Card title={`📈 Predicción del día — ${forecast.hourLabel}`} accent={fState.color}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 30 }}>{fState.icon}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: fState.color }}>
              {forecast.probability}%
            </span>
            <span style={{ color: fState.color, fontWeight: 700, fontSize: 13 }}>{fState.label}</span>
            <span style={{ color: C.muted, fontSize: 11, marginLeft: "auto" }}>
              {forecast.curveSource === "history"
                ? `curva histórica · ${forecast.sampleDays} días`
                : "estimación inicial"}
            </span>
          </div>

          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4 }}>
              <span>
                Hoy esperas <b style={{ color: C.text }}>{fmt(forecast.target)}</b> · llevas{" "}
                <b style={{ color: C.green }}>{fmt(forecast.collected)}</b>
              </span>
              <span>{fPct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 6, background: C.surface, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ width: `${fPct}%`, height: "100%", background: fState.color, transition: "width .3s" }} />
            </div>
          </div>

          <div style={{ color: C.muted, fontSize: 12 }}>
            {forecast.status === "early"
              ? "Aún es temprano para proyectar el cierre del día."
              : forecast.status === "closed"
                ? "¡Meta del día cumplida! 🏆"
                : `Faltan ${forecast.pendingCars} carro(s) · por recaudar ${fmt(forecast.remaining)}.`}
          </div>
        </Card>
      )}

      <Card title={`📋 Gestión del día — ${coveredCount}/${totalCars}`} accent={pct === 100 && totalCars > 0 ? C.green : C.orange}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4 }}>
            <span>
              {totalCars === 0
                ? "Sin carros activos"
                : pct === 100
                  ? "¡Flota gestionada! 🏆"
                  : `Faltan ${s.pendingCarsCount || 0} carro(s) por gestionar`}
              {s.carsWithoutDriverCount > 0 ? ` · ${s.carsWithoutDriverCount} sin conductor` : ""}
            </span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 6, background: C.surface, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 && totalCars > 0 ? C.green : C.gold, transition: "width .3s" }} />
          </div>
        </div>
        {checklist.length === 0 ? (
          <Empty>Sin carros activos para gestionar.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {checklist.map((it) => (
              <div key={it.carId}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${it.covered ? C.border : C.orange + "66"}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 16 }}>{it.covered ? "✅" : "⛔"}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {it.plate}
                        {it.name ? <span style={{ color: C.muted, fontWeight: 400 }}> · {it.name}</span> : null}
                      </div>
                      <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {it.driverName
                          ? <Badge color={C.gold}>👤 {it.driverName}</Badge>
                          : <Badge color={C.muted}>👤 Sin conductor</Badge>}
                        {it.offToday && <Badge color={C.muted}>😴 Libre hoy</Badge>}
                        {it.paidToday > 0 && <Badge color={C.green}>✓ Abonó {fmt(it.paidToday)}</Badge>}
                        {it.dueDebt > 0 && <Badge color={C.red}>Vencido {fmt(it.dueDebt)}</Badge>}
                        {it.accruedNotDue > 0 && <Badge color={C.blue}>Acumulado {fmt(it.accruedNotDue)}</Badge>}
                        {it.nextDueDate && it.accruedNotDue > 0 && <Badge color={C.muted}>Vence {fmtDate(it.nextDueDate)}</Badge>}
                        {it.daysBehind >= 2 && <Badge color={C.orange}>🚨 {it.daysBehind}d</Badge>}
                      </div>
                    </div>
                  </div>
                  <Btn small outline onClick={() => setDriverCar(driverCar === it.carId ? null : it.carId)}>
                    {driverCar === it.carId ? "Cerrar" : "👤 Entrega"}
                  </Btn>
                </div>
                {driverCar === it.carId && (
                  <HandoverPanel car={it} actions={actions} toast={toast} onChanged={refresh} />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="🔔 Recordatorios" accent={C.goldSoft}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Btn small color={moment === "morning" ? C.gold : C.muted} onClick={() => setMoment("morning")}>🌅 Mañana</Btn>
          <Btn small color={moment === "midday" ? C.gold : C.muted} onClick={() => setMoment("midday")}>🕑 Mediodía</Btn>
          <Btn small color={moment === "evening" ? C.gold : C.muted} onClick={() => setMoment("evening")}>🌙 Tarde</Btn>
        </div>
        {!reminders ? (
          <Empty>Sin recordatorios.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reminders.reminders.map((r) => {
              const color = REM_LEVEL[r.level] || C.gold;
              return (
                <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: C.surface, border: `1px solid ${color}44`, borderRadius: 10, padding: "10px 12px" }}>
                  <span style={{ fontSize: 18 }}>{r.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color }}>{r.title}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{r.body}</div>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 4 }}>
              <Btn small color="#25D366" onClick={async () => {
                const phone = data?.settings?.adminPhone;
                if (!phone) { toast("Configura WhatsApp en ⚙️", C.red); return; }
                try {
                  const r = await actions.sendWhatsApp({ kind: "text", to: phone, text: reminders.whatsappText });
                  if (r && r.skipped) toast("WhatsApp no configurado en el servidor", C.red);
                  else toast("📲 Recordatorio enviado ✓");
                } catch (err) { toast(err.message || "Error enviando WhatsApp", C.red); }
              }}>📲 Enviar por WhatsApp</Btn>
            </div>
          </div>
        )}
      </Card>

      <Card title={`🎯 Cobrar hoy (${collect.length})`} accent={C.gold}>
        {collect.length === 0 ? (
          <Empty>Nadie tiene deuda pendiente para este día. ¡Flota al día! 🎉</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {collectSorted.map((it) => (
              <CollectRow
                key={it.carId}
                it={it}
                onPay={registerPayment}
                toast={toast}
                priorBalances={(data?.metrics?.perCar?.[it.carId]?.handoverBalances || [])
                  .filter((balance) => !balance.active && balance.handoverId && balance.remaining > 0.001)}
              />
            ))}
          </div>
        )}
      </Card>

      <Card title={`🔁 Refinanciaciones activas (${refinances.length})`} accent={C.blue}>
        {refinances.length === 0 ? (
          <Empty>Sin planes de refinanciación por cobrar.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {refinances.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: C.goldSoft, fontSize: 14 }}>
                    {r.plate}{r.name ? <span style={{ color: C.muted, fontWeight: 400 }}> · {r.name}</span> : null}
                  </div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                    {r.estimatedDays ? `≈ ${r.estimatedDays} días restantes` : "Plan activo"} · cuota {fmt(r.dailyInstallment)}/día
                  </div>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <div style={{ color: C.blue, fontWeight: 800, fontSize: 15 }}>{fmt(r.remaining)}</div>
                  <div style={{ color: C.muted, fontSize: 10 }}>saldo plan</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`📄 Documentos por vencer (${documents.length})`} accent={C.orange}>
        {documents.length === 0 ? (
          <Empty>Ningún documento vence en los próximos 30 días.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {documents.map((d) => {
              const lv = DOC_LEVEL[d.level] || DOC_LEVEL.info;
              return (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {d.plate}{d.name ? <span style={{ color: C.muted, fontWeight: 400 }}> · {d.name}</span> : null}
                    </div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{d.type} · vence {fmtDate(d.expiry)}</div>
                  </div>
                  <Badge color={lv.color}>
                    {d.daysLeft < 0 ? `${lv.label} ${Math.abs(d.daysLeft)}d` : `${lv.label} · ${d.daysLeft}d`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title={`🏦 Nequi pendientes (${nequi.length})`} accent={C.blue}>
        {nequi.length === 0 ? (
          <Empty>Sin pagos de Nequi por conciliar.</Empty>
        ) : (
          <>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
              Concílialos (asignar carro y fecha) en la pestaña 🏦 Nequi.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {nequi.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: C.goldSoft, fontSize: 14 }}>{fmt(p.amount)}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                      {fmtDate(p.detectedDate)}{p.from ? ` · ${p.from}` : ""}
                    </div>
                  </div>
                  <Badge color={C.blue}>pendiente</Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// Fila de cobro con registro rápido de pago (1 día o deuda total).
function CollectRow({ it, onPay, toast, priorBalances = [] }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(it.dailyTotal || it.dueDebt || it.debt);
  const [note, setNote] = useState("");
  const [payPrevious, setPayPrevious] = useState(false);
  const [handoverId, setHandoverId] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || !isFinite(amt) || amt <= 0) { toast("Monto inválido", C.red); return; }
    setSaving(true);
    try {
      await onPay(it.carId, amt, note, payPrevious ? handoverId : null);
      toast("Pago registrado ✓");
      setOpen(false);
      setNote("");
    } catch (err) {
      toast(err.message || "Error al registrar", C.red);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${it.daysBehind >= 2 ? C.orange + "66" : C.border}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontWeight: 800, color: C.goldSoft, fontSize: 15 }}>{it.plate}</span>
          {it.name && <span style={{ color: C.muted, fontSize: 12 }}> · {it.name}</span>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {it.driverName && <Badge color={C.gold}>👤 {it.driverName}</Badge>}
            {it.daysBehind >= 2 && <Badge color={C.orange}>🚨 {it.daysBehind} días atrasado</Badge>}
            {it.offToday && <Badge color={C.muted}>😴 Descanso hoy</Badge>}
            {it.paidToday > 0 && <Badge color={C.green}>✓ Abonó {fmt(it.paidToday)}</Badge>}
            {it.planRemaining > 0 && <Badge color={C.blue}>🔁 Plan {fmt(it.planRemaining)}</Badge>}
            {it.accruedNotDue > 0 && <Badge color={C.blue}>Acumulado {fmt(it.accruedNotDue)}</Badge>}
            {it.nextDueDate && it.accruedNotDue > 0 && <Badge color={C.muted}>Vence {fmtDate(it.nextDueDate)}</Badge>}
          </div>
        </div>
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ color: C.red, fontWeight: 800, fontSize: 16 }}>{fmt(it.dueDebt ?? it.debt)}</div>
          <div style={{ color: C.muted, fontSize: 10 }}>vencido</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: C.muted }}>
          Tarifa {fmt(it.dailyTotal)}{it.lastPaymentDate ? ` · último ${fmtDate(it.lastPaymentDate)}` : " · sin pagos"}
        </span>
        <Btn small onClick={() => setOpen((v) => !v)}>{open ? "Cancelar" : "💰 Registrar pago"}</Btn>
      </div>

      {open && (
        <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn small outline onClick={() => setAmount(it.dailyTotal || it.debt)}>1 día ({fmt(it.dailyTotal || it.debt)})</Btn>
            <Btn small outline onClick={() => setAmount(it.dueDebt ?? it.debt)}>Saldo vencido ({fmt(it.dueDebt ?? it.debt)})</Btn>
          </div>
          <Field label="Monto" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Field label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: abono del día" />
          {priorBalances.length > 0 && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: C.text, fontSize: 13 }}>
                <input type="checkbox" checked={payPrevious} onChange={(e) => {
                  setPayPrevious(e.target.checked);
                  if (!e.target.checked) setHandoverId("");
                }} />
                Abonar deuda de un conductor anterior
              </label>
              {payPrevious && (
                <Select label="Entrega a la que se aplica el abono" value={handoverId} onChange={(e) => setHandoverId(e.target.value)}>
                  <option value="">Selecciona una entrega</option>
                  {priorBalances.map((balance) => (
                    <option key={balance.handoverId} value={balance.handoverId}>
                      {balance.driverName || "Sin nombre"} · {fmt(balance.remaining)} pendientes
                    </option>
                  ))}
                </Select>
              )}
            </>
          )}
          <Btn full color={C.green} onClick={submit} disabled={saving || (payPrevious && !handoverId)}>{saving ? "Guardando…" : "✓ Guardar pago"}</Btn>
        </div>
      )}
    </div>
  );
}

// Panel de entregas: asigna/cambia el conductor del carro y muestra el historial.
// Al registrar una entrega nueva, el backend cierra automáticamente la vigente.
function HandoverPanel({ car, actions, toast, onChanged }) {
  const [history, setHistory] = useState(null);
  const [form, setForm] = useState({
    driverName: "", driverPhone: "", date: todayStr(), paymentFrequency: "daily", dailyRate: String(car.rate || ""),
  });
  const [closeDate, setCloseDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);

  const loadHistory = useCallback(() => {
    actions.getHandovers(car.carId)
      .then((r) => setHistory(Array.isArray(r) ? r : (r?.handovers || [])))
      .catch(() => setHistory([]));
  }, [actions, car.carId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const active = (history || []).find((h) => h.active) || null;

  const submit = async () => {
    const name = form.driverName.trim();
    if (!name) { toast("Ingresa el nombre del conductor", C.red); return; }
    setBusy(true);
    try {
      const dailyRate = Number(form.dailyRate);
      if (!dailyRate || !Number.isFinite(dailyRate) || dailyRate <= 0) {
        toast("Ingresa una tarifa diaria válida", C.red);
        return;
      }
      await actions.registerHandover(car.carId, {
        driverName: name,
        driverPhone: form.driverPhone,
        date: form.date,
        paymentFrequency: form.paymentFrequency,
        dailyRate,
      });
      toast("Entrega registrada ✓");
      setForm({ driverName: "", driverPhone: "", date: todayStr(), paymentFrequency: "daily", dailyRate: String(car.rate || "") });
      loadHistory();
      onChanged?.();
    } catch (err) {
      toast(err.message || "Error al registrar la entrega", C.red);
    } finally {
      setBusy(false);
    }
  };

  const doClose = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await actions.closeHandover(active.id, closeDate);
      toast("Devolución registrada ✓");
      loadHistory();
      onChanged?.();
    } catch (err) {
      toast(err.message || "Error al cerrar la entrega", C.red);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 8, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {active ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 150px", fontSize: 12, color: C.muted }}>
            Vigente: <b style={{ color: C.goldSoft }}>{active.driverName}</b>
            {active.driverPhone ? ` · ${active.driverPhone}` : ""}
            <div style={{ marginTop: 2 }}>desde {fmtDate(active.startDate)}</div>
            <div style={{ marginTop: 2 }}>
              {active.paymentFrequency === "weekly" ? "Semanal" : "Diaria"} · {fmt(active.dailyRate || car.rate)}/día
            </div>
          </div>
          <div style={{ flex: "1 1 120px" }}>
            <Field label="Devolución" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          </div>
          <Btn small color={C.orange} onClick={doClose} disabled={busy}>📤 Devolución</Btn>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.muted }}>Sin conductor asignado. Registra una entrega:</div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 130px" }}>
          <Field label="Conductor" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Nombre" />
        </div>
        <div style={{ flex: "1 1 110px" }}>
          <Field label="Teléfono" value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} placeholder="Opcional" />
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <Field label="Entrega" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
          <div style={{ flex: "1 1 140px" }}>
            <Select label="Frecuencia" value={form.paymentFrequency} onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value })}>
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal (ciclo de 7 días)</option>
            </Select>
          </div>
          <div style={{ flex: "1 1 130px" }}>
            <Field label="Tarifa diaria" type="number" inputMode="numeric" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} />
          </div>
        <Btn small color={C.green} onClick={submit} disabled={busy}>{busy ? "…" : "✓ Asignar"}</Btn>
      </div>

      {history && history.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Historial</div>
          {history.slice().sort((a, b) => (a.startDate < b.startDate ? 1 : -1)).map((h) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
              <span style={{ minWidth: 0 }}>
                <b>{h.driverName}</b>{h.driverPhone ? <span style={{ color: C.muted }}> · {h.driverPhone}</span> : ""}
              </span>
              <span style={{ color: C.muted, whiteSpace: "nowrap" }}>
                {fmtDate(h.startDate)} → {h.endDate ? fmtDate(h.endDate) : "vigente"}
              </span>
              <span style={{ color: C.muted, whiteSpace: "nowrap" }}>
                {h.paymentFrequency === "weekly" ? "Semanal" : "Diaria"} · {fmt(h.dailyRate || car.rate)}/día
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
