import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useUseCases } from "../context/AppContext.jsx";
import { TokenStorage } from "../../infrastructure/storage/TokenStorage.js";
import { buildAlerts, buildWhatsAppMessage } from "../../domain/entities/AlertBuilder.js";
import { CalendarDate } from "../../domain/value-objects/CalendarDate.js";

// Hook central: carga datos, expone acciones y calcula alertas.
export function useFleet({ onToast, onAuthExpired }) {
  const uc = useUseCases();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const alertSentRef = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await uc.loadData();
      setData(d);
    } catch (err) {
      if (err.status === 401) onAuthExpired();
      else onToast("Error cargando datos. ¿Servidor activo?", "error");
    } finally {
      setLoading(false);
    }
  }, [uc, onToast, onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  // Envuelve un caso de uso para recargar datos tras ejecutarlo.
  const run = useCallback((fn) => async (...args) => {
    const r = await fn(...args);
    await load();
    return r;
  }, [load]);

  const actions = useMemo(() => ({
    addCar: run(uc.addCar),
    updateCar: run(uc.updateCar),
    deactivateCar: run(uc.deactivateCar),
    reactivateCar: run(uc.reactivateCar),
    addPayment: run(uc.addPayment),
    deletePayment: run(uc.deletePayment),
    addExpense: run(uc.addExpense),
    deleteExpense: run(uc.deleteExpense),
    addDocument: run(uc.addDocument),
    deleteDocument: run(uc.deleteDocument),
    createRefinance: run(uc.createRefinance),
    payRefinance: run(uc.payRefinance),
    cancelRefinance: run(uc.cancelRefinance),
    toggleOffDay: run(uc.toggleOffDay),
    bulkOffDay: run(uc.bulkOffDay),
    clearOffDay: run(uc.clearOffDay),
    saveSettings: run(uc.saveSettings),
    changeCredentials: run(uc.changeCredentials),
    syncNequi: run(uc.syncNequi),
    approvePendingPayment: run(uc.approvePendingPayment),
    dismissPendingPayment: run(uc.dismissPendingPayment),
    reset: run(uc.reset),
    getCarDebtDetail: (carId, today) => uc.getCarDebtDetail(carId, today),
    getAccountStatement: (carId, from, to) => uc.loadAccountStatement(carId, from, to),
    getHandovers: (carId) => uc.loadHandovers(carId),
    registerHandover: run(uc.registerHandover),
    closeHandover: run(uc.closeHandover),
    updateHandover: run(uc.updateHandover),
    deleteHandover: run(uc.deleteHandover),
    getAgenda: (date) => uc.loadAgenda(date),
    getCollections: (date) => uc.loadCollections(date),
    getReminders: (date, moment) => uc.loadReminders(date, moment),
    getPushPublicKey: () => uc.getPushPublicKey(),
    subscribePush: (subscription) => uc.subscribePush(subscription),
    unsubscribePush: (endpoint) => uc.unsubscribePush(endpoint),
    sendWhatsApp: (payload) => uc.sendWhatsApp(payload),
    getWhatsAppStatus: () => uc.getWhatsAppStatus(),
  }), [uc, run]);

  const alerts = useMemo(() => (data ? buildAlerts(data) : []), [data]);

  // Envía el reporte por la API interna (WhatsApp Cloud API), sin abrir WhatsApp Web.
  const sendWhatsApp = useCallback(async (type = "full") => {
    const phone = data?.settings?.adminPhone;
    if (!phone) { onToast("Configura WhatsApp en ⚙️", "error"); return; }
    const msg = buildWhatsAppMessage(data, type);
    try {
      const r = await uc.sendWhatsApp({ kind: "text", to: phone, text: msg });
      if (r && r.skipped) onToast("WhatsApp no configurado en el servidor", "error");
      else onToast("📲 WhatsApp enviado ✓", "wa");
    } catch (err) {
      onToast(err.message || "Error enviando WhatsApp", "error");
    }
  }, [data, onToast, uc]);

  // Alertas automáticas matutinas/nocturnas (enviadas por la API interna).
  useEffect(() => {
    const phone = data?.settings?.adminPhone;
    if (!phone || data?.settings?.remindersEnabled === false) return;
    const check = () => {
      const td = CalendarDate.today(), h = CalendarDate.hour();
      const mh = data.settings.morningHour ?? 8, eh = data.settings.eveningHour ?? 20;
      const mk = `m_${td}`, ek = `e_${td}`;
      if (h >= mh && !alertSentRef.current[mk]) {
        alertSentRef.current[mk] = true;
        uc.sendWhatsApp({ kind: "text", to: phone, text: buildWhatsAppMessage(data, "morning") }).catch(() => {});
      }
      if (h >= eh && !alertSentRef.current[ek]) {
        alertSentRef.current[ek] = true;
        uc.sendWhatsApp({ kind: "text", to: phone, text: buildWhatsAppMessage(data, "evening") }).catch(() => {});
      }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [data, uc]);

  return { data, loading, actions, alerts, sendWhatsApp, reload: load };
}
