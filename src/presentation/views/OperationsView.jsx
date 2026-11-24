import { useState } from "react";
import { C, EXPENSE_CATS } from "../theme/palette.js";
import { todayStr, monthStr, fmt, fmtDate, carLabel, isOffDay, findOffDay, restDaysInMonthForCar, offReasonTag } from "./_helpers.js";
import { Badge, Btn, Field, Select, Card, Empty } from "../components/UI.jsx";

const OFF_REASONS = [
  { value: "descanso", label: "Por descanso", icon: "😴" },
  { value: "no_trabajo", label: "No trabajó", icon: "🚫" },
  { value: "taller", label: "Taller", icon: "🔧" },
  { value: "otro", label: "Otro motivo", icon: "📝" },
];

// ── NO TRABAJÓ ────────────────────────────────────────────────────────────────
export function OffDays({ data, actions, toast }) {
  const { cars = [], offDays = [], metrics } = data;
  const activeCars = cars.filter((c) => c.active);
  const [selDate, setSelDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);

  // Estado del modal de motivo
  const [modal, setModal] = useState(null); // { type: "single"|"bulk", car?, cars?, reason, detail, error }

  const offCount = activeCars.filter((c) => isOffDay(offDays, c.id, selDate)).length;
  const inPeriod = (car) => car.startDate && selDate >= car.startDate;

  const openSingleModal = (car) => {
    if (!inPeriod(car) || busy) return;
    // Si ya está marcado como off, lo desmarcamos directamente sin modal
    if (isOffDay(offDays, car.id, selDate)) {
      setBusy(true);
      actions.toggleOffDay(car.id, selDate, "descanso", "")
        .then(() => {})
        .catch(() => toast("Error", C.red))
        .finally(() => setBusy(false));
      return;
    }
    setModal({ type: "single", car, reason: "", detail: "", error: "" });
  };

  const openBulkModal = () => {
    if (busy) return;
    const targets = activeCars.filter(inPeriod);
    if (targets.length === 0) { toast("No hay carros en periodo", C.red); return; }
    setModal({ type: "bulk", cars: targets, reason: "", detail: "", error: "" });
  };

  const confirmModal = async () => {
    if (!modal) return;
    const reason = modal.reason.trim().toLowerCase();
    const detail = modal.detail.trim();
    if (!reason) { setModal({ ...modal, error: "Selecciona un motivo" }); return; }
    if (reason === "otro" && !detail) { setModal({ ...modal, error: "Especifica el detalle del motivo" }); return; }

    setBusy(true);
    try {
      if (modal.type === "single") {
        await actions.toggleOffDay(modal.car.id, selDate, reason, detail);
      } else {
        await actions.bulkOffDay(selDate, modal.cars.map((c) => c.id), reason, detail);
      }
      setModal(null);
    } catch (err) {
      setModal({ ...modal, error: err.message || "Error" });
    } finally {
      setBusy(false);
    }
  };

  const clearDay = async () => {
    setBusy(true);
    try { await actions.clearOffDay(selDate); }
    catch { toast("Error", C.red); } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: C.orange + "14", border: `1px solid ${C.orange}44`, borderRadius: 12, padding: "12px 14px", fontSize: 13 }}>
        ⚠️ Marca los carros que <b>NO trabajaron</b> esta fecha. Cada día vale $0. El cobro arranca el día siguiente a la fecha de inicio.
        <br />
        <span style={{ color: C.muted, fontSize: 12 }}>Solo los días marcados como <b>"Por descanso"</b> cuentan dentro de los 2 descansos mensuales permitidos. Los de <b>"No trabajó"</b>, <b>"Taller"</b> u <b>"Otro motivo"</b> no cobran pero no cuentan como descanso.</span>
      </div>
      <Field label="Fecha" type="date" value={selDate} onChange={(e) => setSelDate(e.target.value)} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Btn small onClick={openBulkModal} color={C.red} disabled={busy}>Todos no trabajaron</Btn>
        <Btn small outline onClick={clearDay} color={C.muted} disabled={busy}>Limpiar día</Btn>
        <Badge color={offCount > 0 ? C.red : C.green}>{offCount} sin trabajar</Badge>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
        {activeCars.length === 0 && <Empty>No hay carros. Agrégalos en 🚙 Carros.</Empty>}
        {activeCars.map((car) => {
          const off = isOffDay(offDays, car.id, selDate);
          const valid = inPeriod(car);
          const debt = metrics?.perCar?.[car.id]?.debt || 0;
          const rest = restDaysInMonthForCar(offDays, car.id, monthStr());
          const offInfo = findOffDay(offDays, car.id, selDate);
          return (
            <div key={car.id} onClick={() => openSingleModal(car)} style={{
              background: !valid ? C.surface : off ? C.red + "18" : C.card,
              border: `2px solid ${!valid ? C.border : off ? C.red : C.border}`,
              borderRadius: 12, padding: 12, cursor: valid ? "pointer" : "not-allowed",
              opacity: valid ? 1 : 0.5, touchAction: "manipulation",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: off ? C.red : C.text }}>{car.plate}</span>
                <span style={{ fontSize: 17 }}>{!valid ? "🔒" : off ? "🚫" : "✅"}</span>
              </div>
              {car.name && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{car.name}</div>}
              {valid && <div style={{ fontSize: 11, color: rest >= 2 ? C.orange : C.muted, marginTop: 3 }}>Descansos mes: {rest}/2</div>}
              {off && offInfo?.reason && (
                <div style={{ fontSize: 10, color: C.orange, marginTop: 2 }}>
                  {offReasonTag(offInfo.reason, offInfo.detail)}
                </div>
              )}
              <div style={{ fontSize: 11, color: debt > 0 ? C.red : C.green, marginTop: 2 }}>{debt > 0 ? `Debe ${fmt(debt)}` : "Sin deuda"}</div>
            </div>
          );
        })}
      </div>

      {modal && <ReasonModal modal={modal} setModal={setModal} confirm={confirmModal} busy={busy} />}
    </div>
  );
}

function ReasonModal({ modal, setModal, confirm, busy }) {
  return (
    <div onClick={() => !busy && setModal(null)} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.card, borderRadius: 16, padding: 20, width: "100%", maxWidth: 380,
        border: `1px solid ${C.border}`, boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
          {modal.type === "single" ? `🚫 ${modal.car.plate} no trabajó` : "🚫 Todos los carros no trabajaron"}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Selecciona el motivo de inactividad. Es obligatorio.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Motivo *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {OFF_REASONS.map((r) => (
                <button key={r.value} onClick={() => setModal({ ...modal, reason: r.value, error: "" })} style={{
                  textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${modal.reason === r.value ? C.gold : C.border}`,
                  background: modal.reason === r.value ? C.gold + "14" : C.surface,
                  color: C.text, fontSize: 14, fontWeight: 600,
                }}>
                  {r.icon} {r.label}
                </button>
              ))}
            </div>
          </div>

          {modal.reason === "otro" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Detalle del motivo *</label>
              <input
                value={modal.detail}
                onChange={(e) => setModal({ ...modal, detail: e.target.value, error: "" })}
                placeholder="Ej: Mantenimiento, enfermedad, etc."
                maxLength={200}
                style={{
                  width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4, textAlign: "right" }}>{modal.detail.length}/200</div>
            </div>
          )}

          {modal.error && <div style={{ color: C.red, fontSize: 12, fontWeight: 600 }}>{modal.error}</div>}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <Btn full outline color={C.muted} onClick={() => setModal(null)} disabled={busy}>Cancelar</Btn>
          <Btn full color={C.red} onClick={confirm} disabled={busy}>Confirmar</Btn>
        </div>
      </div>
    </div>
  );
}

// ── PAGOS ─────────────────────────────────────────────────────────────────────
export function Payments({ data, actions, toast }) {
  const { cars = [], payments = [], metrics } = data;
  const activeCars = cars.filter((c) => c.active);
  const [form, setForm] = useState({ carId: "", date: todayStr(), amount: "", note: "", handoverId: "" });
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [payPrevious, setPayPrevious] = useState(false);

  // default carId al primero disponible
  const carId = form.carId || activeCars[0]?.id || "";
  const priorBalances = (metrics?.perCar?.[carId]?.handoverBalances || [])
    .filter((balance) => !balance.active && balance.handoverId && balance.remaining > 0.001);

  const add = async () => {
    if (!carId) { toast("Agrega un carro primero", C.red); return; }
    if (!form.amount) return;
    if (payPrevious && !priorBalances.some((balance) => balance.handoverId === form.handoverId)) {
      toast("Selecciona la entrega anterior a la que aplicar el abono", C.red);
      return;
    }
    setBusy(true);
    try {
      await actions.addPayment({
        carId,
        date: form.date,
        amount: Number(form.amount),
        note: form.note,
        handoverId: payPrevious ? form.handoverId : null,
      });
      setForm((f) => ({ ...f, amount: "", note: "", handoverId: "" }));
      setPayPrevious(false);
      toast("Pago registrado ✓");
    } catch (err) { toast(err.message || "Error", C.red); } finally { setBusy(false); }
  };
  const remove = async (id) => { try { await actions.deletePayment(id); } catch { toast("Error", C.red); } };

  // Al elegir una placa en el filtro del historial, se carga en el formulario de registro
  const onFilterChange = (e) => {
    const v = e.target.value;
    setFilter(v);
    if (v && activeCars.some((c) => c.id === v)) setForm((f) => ({ ...f, carId: v }));
  };

  const filtered = payments.filter((p) => !filter || p.carId === filter).sort((a, b) => b.date.localeCompare(a.date));
  const debtors = activeCars.filter((c) => (metrics?.perCar?.[c.id]?.debt || 0) > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Registrar Pago" accent={C.yellow}>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <Select label="Vehículo" value={carId} onChange={(e) => {
            setForm((f) => ({ ...f, carId: e.target.value, handoverId: "" }));
            setPayPrevious(false);
          }}>
            {activeCars.length === 0 && <option value="">— sin carros —</option>}
            {activeCars.map((c) => <option key={c.id} value={c.id}>{carLabel(cars, c.id)}</option>)}
          </Select>
          {priorBalances.length > 0 && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: C.text, fontSize: 13 }}>
                <input type="checkbox" checked={payPrevious} onChange={(e) => {
                  setPayPrevious(e.target.checked);
                  if (!e.target.checked) setForm((f) => ({ ...f, handoverId: "" }));
                }} />
                Abonar deuda de un conductor anterior
              </label>
              {payPrevious && (
                <Select label="Entrega a la que se aplica el abono" value={form.handoverId}
                  onChange={(e) => setForm((f) => ({ ...f, handoverId: e.target.value }))}>
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
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Fecha" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Field label="Monto ($)" type="number" inputMode="numeric" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <Field label="Nota" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Opcional" />
          <Btn onClick={add} disabled={busy} full>+ Registrar Pago</Btn>
        </div>
      </Card>

      {debtors.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {debtors.map((c) => (
            <button key={c.id} onClick={() => setForm((f) => ({ ...f, carId: c.id, amount: metrics.perCar[c.id].debt }))}
              style={{ background: C.card, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "7px 11px", fontSize: 12, cursor: "pointer", color: C.text }}>
              <b style={{ color: C.yellow }}>{c.plate}</b> <span style={{ color: C.red }}>{fmt(metrics.perCar[c.id].debt)}</span>
            </button>
          ))}
        </div>
      )}

      <Card title={`Historial (${fmt(filtered.reduce((s, p) => s + p.amount, 0))})`}>
        <Select value={filter} onChange={onFilterChange} style={{ marginBottom: 12 }}>
          <option value="">Todos los carros</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.plate}</option>)}
        </Select>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && <Empty>Sin pagos registrados</Empty>}
          {filtered.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: C.yellow, fontSize: 13 }}>{carLabel(cars, p.carId)} <span style={{ color: C.green }}>{fmt(p.amount)}</span></div>
                <div style={{ color: C.muted, fontSize: 11 }}>{fmtDate(p.date)}{p.note ? ` · ${p.note}` : ""}</div>
              </div>
              <Btn small outline danger onClick={() => remove(p.id)}>✕</Btn>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── GASTOS ────────────────────────────────────────────────────────────────────
export function Expenses({ data, actions, toast }) {
  const { expenses = [] } = data;
  const [form, setForm] = useState({ date: todayStr(), amount: "", category: EXPENSE_CATS[0], note: "" });
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!form.amount) return;
    setBusy(true);
    try { await actions.addExpense({ ...form, amount: Number(form.amount) }); setForm((f) => ({ ...f, amount: "", note: "" })); toast("Gasto registrado ✓"); }
    catch { toast("Error", C.red); } finally { setBusy(false); }
  };
  const remove = async (id) => { try { await actions.deleteExpense(id); } catch { toast("Error", C.red); } };

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const byCat = {}; expenses.forEach((e) => (byCat[e.category] = (byCat[e.category] || 0) + e.amount));
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Registrar Gasto" accent={C.red}>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Fecha" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Field label="Monto ($)" type="number" inputMode="numeric" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <Select label="Categoría" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Field label="Descripción" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Detalle" />
          <Btn onClick={add} color={C.red} disabled={busy} full>+ Registrar Gasto</Btn>
        </div>
      </Card>
      {total > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {Object.entries(byCat).map(([cat, amt]) => (
            <div key={cat} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 11px", fontSize: 12 }}>
              <span style={{ color: C.muted }}>{cat}: </span><b style={{ color: C.red }}>{fmt(amt)}</b>
            </div>
          ))}
          <div style={{ background: C.red + "22", border: `1px solid ${C.red}55`, borderRadius: 8, padding: "6px 11px", fontSize: 12 }}><b style={{ color: C.red }}>TOTAL: {fmt(total)}</b></div>
        </div>
      )}
      <Card title="Historial de Gastos">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.length === 0 && <Empty>Sin gastos registrados</Empty>}
          {sorted.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}><Badge color={C.blue}>{e.category}</Badge> <b style={{ color: C.red }}>{fmt(e.amount)}</b></div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{fmtDate(e.date)}{e.note ? ` · ${e.note}` : ""}</div>
              </div>
              <Btn small outline danger onClick={() => remove(e.id)}>✕</Btn>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
