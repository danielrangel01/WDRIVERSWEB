import { useState, useEffect } from "react";
import { C } from "../theme/palette.js";
import { fmt, fmtDate, monthLabel, carLabel } from "./_helpers.js";
import { Badge, Btn, Field, Card, Empty } from "../components/UI.jsx";

// Convierte la clave pública VAPID (base64url) al formato que espera PushManager.
const urlB64ToUint8Array = (base64) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
};

// ── HISTORIAL ─────────────────────────────────────────────────────────────────
export function History({ data, actions, toast }) {
  const { cars = [], payments = [], expenses = [], offDays = [] } = data;
  const [view, setView] = useState("month");

  const byMonth = {};
  payments.forEach((p) => { const k = p.date.slice(0, 7); if (!byMonth[k]) byMonth[k] = { p: 0, e: 0, n: 0 }; byMonth[k].p += p.amount; byMonth[k].n++; });
  expenses.forEach((e) => { const k = e.date.slice(0, 7); if (!byMonth[k]) byMonth[k] = { p: 0, e: 0, n: 0 }; byMonth[k].e += e.amount; });
  const months = Object.keys(byMonth).sort().reverse();

  const offByDate = {};
  offDays.forEach((o) => { if (!offByDate[o.date]) offByDate[o.date] = []; offByDate[o.date].push(o.carId); });
  const offDates = Object.keys(offByDate).sort().reverse();

  const reset = async () => {
    if (!window.confirm("¿Borrar pagos, gastos, documentos y días no trabajados? Los carros se conservan.")) return;
    try { await actions.reset(); toast("Movimientos borrados"); } catch { toast("Error", C.red); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Btn small color={view === "month" ? C.yellow : C.muted} onClick={() => setView("month")}>Por Mes</Btn>
        <Btn small color={view === "off" ? C.yellow : C.muted} onClick={() => setView("off")}>Días sin trabajar</Btn>
        <div style={{ marginLeft: "auto" }}><Btn small danger outline onClick={reset}>🗑 Borrar</Btn></div>
      </div>

      {view === "month" && (
        <Card title="Resumen Mensual">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {months.length === 0 && <Empty>Sin datos</Empty>}
            {months.map((m) => {
              const { p = 0, e = 0, n = 0 } = byMonth[m]; const util = p - e;
              return (
                <div key={m} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 700, textTransform: "capitalize", marginBottom: 4 }}>{monthLabel(m)}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 12 }}>
                    <span style={{ color: C.green }}>Cobrado: {fmt(p)}</span>
                    <span style={{ color: C.red }}>Gastos: {fmt(e)}</span>
                    <span style={{ color: util >= 0 ? C.green : C.red, fontWeight: 700 }}>Utilidad: {fmt(util)}</span>
                    <span style={{ color: C.muted }}>{n} pagos</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === "off" && (
        <Card title="Días Sin Trabajar">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {offDates.length === 0 && <Empty>Todos los carros han trabajado</Empty>}
            {offDates.map((d) => (
              <div key={d} style={{ padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>{fmtDate(d)}</span>
                  <Badge color={C.red}>{offByDate[d].length} carro(s)</Badge>
                </div>
                <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}>
                  {offByDate[d].map((id) => carLabel(cars, id).split(" · ")[0]).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── CONFIG ────────────────────────────────────────────────────────────────────
export function Config({ data, actions, toast, onLogout }) {
  const { settings = {} } = data;
  const [phone, setPhone] = useState(settings.adminPhone || "");
  const [email, setEmail] = useState(settings.adminEmail || "");
  const [remindersOn, setRemindersOn] = useState(settings.remindersEnabled !== false);
  const [morningH, setMorningH] = useState(String(settings.morningHour ?? 8));
  const [lateMorningH, setLateMorningH] = useState(String(settings.lateMorningHour ?? 11));
  const [middayH, setMiddayH] = useState(String(settings.middayHour ?? 14));
  const [afternoonH, setAfternoonH] = useState(String(settings.afternoonHour ?? 16));
  const [eveningH, setEveningH] = useState(String(settings.eveningHour ?? 20));
  const [channel, setChannel] = useState(settings.notifyChannel === "telegram" ? "telegram" : "whatsapp");
  const [tgChatId, setTgChatId] = useState(settings.telegramChatId || "");
  const [tgState, setTgState] = useState("unknown"); // unknown | off | on
  const [currPass, setCurrPass] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [pushState, setPushState] = useState("unknown"); // unknown | unsupported | off | on

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) { if (alive) setPushState("unsupported"); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (alive) setPushState(sub ? "on" : "off");
      } catch { if (alive) setPushState("off"); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const st = await actions.getTelegramStatus();
        if (alive) setTgState(st && st.enabled ? "on" : "off");
      } catch { if (alive) setTgState("off"); }
    })();
    return () => { alive = false; };
  }, []);

  const saveSettings = async () => {
    const mh = parseInt(morningH), lmh = parseInt(lateMorningH), md = parseInt(middayH), ah = parseInt(afternoonH), eh = parseInt(eveningH);
    if ([mh, lmh, md, ah, eh].some((h) => isNaN(h) || h < 0 || h > 23)) { toast("Hora inválida (0-23)", C.red); return; }
    if (channel === "telegram" && !tgChatId.trim()) { toast("Ingresa el Chat ID de Telegram", C.red); return; }
    try { await actions.saveSettings({ adminPhone: phone, adminEmail: email, remindersEnabled: remindersOn, morningHour: mh, lateMorningHour: lmh, middayHour: md, afternoonHour: ah, eveningHour: eh, notifyChannel: channel, telegramChatId: tgChatId }); toast("Configuración guardada ✓"); }
    catch (err) { toast(err.message || "Error", C.red); }
  };
  const testWA = async () => {
    if (!phone) { toast("Ingresa el número primero", C.red); return; }
    try {
      const r = await actions.sendWhatsApp({ kind: "test", to: phone });
      if (r && r.skipped) toast("WhatsApp no configurado en el servidor", C.red);
      else toast("📲 Mensaje de prueba enviado ✓");
    } catch (err) { toast(err.message || "Error enviando WhatsApp", C.red); }
  };
  const testTG = async () => {
    if (!tgChatId.trim()) { toast("Ingresa el Chat ID de Telegram primero", C.red); return; }
    try {
      await actions.sendTelegramTest(tgChatId.trim());
      toast("✈️ Mensaje de prueba de Telegram enviado ✓");
    } catch (err) { toast(err.message || "Error enviando Telegram", C.red); }
  };
  const enablePush = async () => {
    if (pushState === "unsupported") { toast("Este navegador no soporta notificaciones push", C.red); return; }
    try {
      const { publicKey, enabled } = await actions.getPushPublicKey();
      if (!enabled || !publicKey) { toast("El servidor no tiene Push configurado (VAPID)", C.red); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast("Permiso de notificaciones denegado", C.red); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) });
      await actions.subscribePush(sub.toJSON());
      setPushState("on");
      toast("🔔 Notificaciones activadas ✓");
    } catch (err) { toast(err.message || "Error activando push", C.red); }
  };
  const disablePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await actions.unsubscribePush(sub.endpoint).catch(() => {}); await sub.unsubscribe(); }
      setPushState("off");
      toast("Notificaciones desactivadas");
    } catch (err) { toast(err.message || "Error", C.red); }
  };
  const changeCreds = async () => {
    if (newPass && newPass.length < 6) { toast("Mínimo 6 caracteres", C.red); return; }
    if (newPass !== confirmPass) { toast("No coinciden", C.red); return; }
    try {
      await actions.changeCreds(currPass, newUser, newPass);
      toast("Credenciales actualizadas ✓");
      setCurrPass(""); setNewUser(""); setNewPass(""); setConfirmPass("");
    } catch (err) { toast(err.message || "Error", C.red); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="📲 Contacto Admin">
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>WhatsApp con código de país sin "+". Ej: <b style={{ color: C.yellow }}>573001234567</b></div>
        <Field label="Número WhatsApp" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="573001234567" />
        <div style={{ marginTop: 10 }}>
          <Field label="Correo para recordatorios" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Btn onClick={saveSettings} color={C.green}>Guardar</Btn>
          <Btn onClick={testWA} outline color="#25D366">📲 Probar</Btn>
        </div>
      </Card>

      <Card title="⏰ Recordatorios Automáticos">
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
          El servidor envía los recordatorios a la hora indicada (correo y push si están configurados); aquí también se arma el mensaje de WhatsApp.
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={remindersOn} onChange={(e) => setRemindersOn(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.gold }} />
          <span style={{ fontSize: 14 }}>Activar recordatorios automáticos</span>
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field label="🌅 Mañana (0-23)" type="number" inputMode="numeric" value={morningH} onChange={(e) => setMorningH(e.target.value)} />
          <Field label="⏰ Media mañana (0-23)" type="number" inputMode="numeric" value={lateMorningH} onChange={(e) => setLateMorningH(e.target.value)} />
          <Field label="🕑 Mediodía (0-23)" type="number" inputMode="numeric" value={middayH} onChange={(e) => setMiddayH(e.target.value)} />
          <Field label="🔔 Insistencia tarde (0-23)" type="number" inputMode="numeric" value={afternoonH} onChange={(e) => setAfternoonH(e.target.value)} />
          <Field label="🌙 Noche (0-23)" type="number" inputMode="numeric" value={eveningH} onChange={(e) => setEveningH(e.target.value)} />
        </div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
          Mediodía envía el check-in paso a paso; la insistencia de la tarde reenvía el check-in si aún no has respondido.
        </div>
        <div style={{ marginTop: 12 }}><Btn onClick={saveSettings} color={C.green} full>Guardar Configuración</Btn></div>
      </Card>

      <Card title="✈️ Canal de Notificación (Telegram)">
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
          Elige por dónde te escribe el asistente: WhatsApp o Telegram. Solo un canal activo a la vez, para no duplicar avisos.
          Telegram funciona al instante (sin ventana de 24 h ni aprobación de plantillas).
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Btn small color={channel === "whatsapp" ? C.yellow : C.muted} onClick={() => setChannel("whatsapp")}>📲 WhatsApp</Btn>
          <Btn small color={channel === "telegram" ? C.yellow : C.muted} onClick={() => setChannel("telegram")}>✈️ Telegram</Btn>
          <Badge color={tgState === "on" ? C.green : C.muted}>{tgState === "on" ? "● Bot activo" : "○ Bot sin token en el servidor"}</Badge>
        </div>
        <Field label="Chat ID de Telegram" inputMode="numeric" value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} placeholder="Ej: 123456789" />
        <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
          Escríbele cualquier mensaje al bot en Telegram: te responderá con tu Chat ID (solo si no está autorizado todavía). Pégalo aquí y guarda.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Btn onClick={saveSettings} color={C.green}>Guardar</Btn>
          <Btn onClick={testTG} outline color="#229ED9">✈️ Probar</Btn>
        </div>
      </Card>

      <Card title="🔔 Notificaciones Push (PWA)">
        {pushState === "unsupported" ? (
          <div style={{ color: C.muted, fontSize: 13 }}>Este navegador no soporta notificaciones push. En iPhone, instala la app en la pantalla de inicio (iOS 16.4+).</div>
        ) : (
          <>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
              Recibe los recordatorios directamente en el navegador/dispositivo, sin abrir la app.
            </div>
            <Badge color={pushState === "on" ? C.green : C.muted}>{pushState === "on" ? "● Activadas" : "○ Desactivadas"}</Badge>
            <div style={{ marginTop: 12 }}>
              {pushState === "on"
                ? <Btn onClick={disablePush} outline color={C.red} full>Desactivar notificaciones</Btn>
                : <Btn onClick={enablePush} color={C.gold} full>🔔 Activar notificaciones</Btn>}
            </div>
          </>
        )}
      </Card>

      <Card title="🔐 Cambiar Credenciales">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Contraseña actual" type="password" value={currPass} onChange={(e) => setCurrPass(e.target.value)} placeholder="Requerida" />
          <Field label="Nuevo usuario (opcional)" value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Dejar vacío para no cambiar" />
          <Field label="Nueva contraseña (mín. 6)" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Dejar vacío para no cambiar" />
          <Field label="Confirmar contraseña" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
          <Btn onClick={changeCreds} color={C.red} full>Actualizar Credenciales</Btn>
        </div>
      </Card>

      <Btn onClick={onLogout} outline color={C.muted} full>🔒 Cerrar Sesión</Btn>
    </div>
  );
}
