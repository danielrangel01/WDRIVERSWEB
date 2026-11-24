import { Car } from "../../domain/entities/Car.js";

const clamp = (n, min, max, fallback) => {
  const v = Number(n);
  if (isNaN(v) || !isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
};
const truncate = (s, max) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const MAX_NOTE = 500;
const MAX_NAME = 100;
const MAX_PHONE = 30;
const MAX_PLATE = 10;
const MAX_DOCTYPE = 60;
const MAX_CATEGORY = 60;
const MAX_EMAIL = 160;
const MAX_CHATID = 32;

export const makeUseCases = (repo) => ({
  login: (username, password) => {
    if (!username || typeof username !== "string" || !password || typeof password !== "string") {
      throw new Error("Completa usuario y contraseña");
    }
    const u = username.trim().toLowerCase().slice(0, 40);
    if (u.length < 1) throw new Error("Usuario inválido");
    if (password.length < 1) throw new Error("Contraseña inválida");
    return repo.login(u, password);
  },
  changeCredentials: (current, newUser, newPass) => {
    if (!current || typeof current !== "string") throw new Error("Contraseña actual requerida");
    if ((newUser && typeof newUser !== "string") || (newPass && typeof newPass !== "string")) {
      throw new Error("Datos inválidos");
    }
    return repo.changeCredentials(current, newUser, newPass);
  },

  loadData: async () => {
    const data = await repo.getData();
    return { ...data, cars: (data.cars || []).map(Car.fromApi) };
  },

  // Centro de Gestión del Día: qué cobrar/atender hoy.
  loadAgenda: (date) => {
    if (date && typeof date !== "string") throw new Error("Fecha inválida");
    return repo.getAgenda(date);
  },

  // Cobranza y mora: antigüedad de la deuda y prioridad de cobro.
  loadCollections: (date) => {
    if (date && typeof date !== "string") throw new Error("Fecha inválida");
    return repo.getCollections(date);
  },

  // Recordatorios (canal in-app): avisos accionables por momento (mañana/tarde).
  loadReminders: (date, moment) => {
    if (date && typeof date !== "string") throw new Error("Fecha inválida");
    if (moment && moment !== "morning" && moment !== "evening") throw new Error("Momento inválido");
    return repo.getReminders(date, moment);
  },

  // Web Push (PWA): clave pública y alta/baja de suscripciones.
  getPushPublicKey: () => repo.getPushPublicKey(),
  subscribePush: (subscription) => {
    if (!subscription || !subscription.endpoint) throw new Error("Suscripción inválida");
    return repo.subscribePush(subscription);
  },
  unsubscribePush: (endpoint) => {
    if (!endpoint) throw new Error("Suscripción inválida");
    return repo.unsubscribePush(endpoint);
  },

  addCar: (car) => {
    if (!car || !car.plate || typeof car.plate !== "string" || !car.plate.trim()) {
      throw new Error("La placa es obligatoria");
    }
    if (car.plate.trim().length > MAX_PLATE) {
      throw new Error(`La placa no puede exceder ${MAX_PLATE} caracteres`);
    }
    const payload = {
      plate: car.plate,
      name: truncate(car.name, MAX_NAME),
      rate: clamp(car.rate, 0, 1e11, 80000),
      startDate: car.startDate || null,
    };
    return repo.addCar(payload);
  },
  updateCar: (id, car) => {
    if (!id || typeof id !== "string") throw new Error("Carro inválido");
    if (!car) throw new Error("Datos inválidos");
    const payload = {};
    if ("plate" in car) payload.plate = car.plate;
    if ("name" in car) payload.name = truncate(car.name, MAX_NAME);
    if ("rate" in car) payload.rate = clamp(car.rate, 0, 1e11, 0);
    if ("startDate" in car) payload.startDate = car.startDate || null;
    return repo.updateCar(id, payload);
  },
  deactivateCar: (id) => {
    if (!id) throw new Error("Carro inválido");
    return repo.deactivateCar(id);
  },
  reactivateCar: (id) => {
    if (!id) throw new Error("Carro inválido");
    return repo.reactivateCar(id);
  },

  addPayment: (p) => {
    if (!p || !p.carId) throw new Error("Selecciona un carro");
    const amt = Number(p.amount);
    if (!amt || !isFinite(amt) || amt <= 0) throw new Error("El monto debe ser mayor a 0");
    if (amt > 1e11) throw new Error("Monto excesivo");
    return repo.addPayment({
      carId: p.carId,
      date: p.date,
      amount: clamp(p.amount, 0.0001, 1e11, 1),
      note: truncate(p.note, MAX_NOTE),
      ...(p.handoverId ? { handoverId: String(p.handoverId).slice(0, 40) } : {}),
    });
  },
  deletePayment: (id) => {
    if (!id) throw new Error("Pago inválido");
    return repo.deletePayment(id);
  },

  addExpense: (e) => {
    if (!e) throw new Error("Datos inválidos");
    const amt = Number(e.amount);
    if (!amt || !isFinite(amt) || amt <= 0) throw new Error("El monto debe ser mayor a 0");
    if (amt > 1e11) throw new Error("Monto excesivo");
    return repo.addExpense({
      date: e.date,
      amount: clamp(e.amount, 0.0001, 1e11, 1),
      category: truncate(e.category || "Otro", MAX_CATEGORY) || "Otro",
      note: truncate(e.note, MAX_NOTE),
    });
  },
  deleteExpense: (id) => {
    if (!id) throw new Error("Gasto inválido");
    return repo.deleteExpense(id);
  },

  addDocument: (d) => {
    if (!d || !d.carId) throw new Error("Selecciona un carro");
    if (!d.expiry) throw new Error("Ingresa el vencimiento");
    if (!d.type || !String(d.type).trim()) throw new Error("Selecciona el tipo de documento");
    return repo.addDocument({
      carId: d.carId,
      type: truncate(d.type, MAX_DOCTYPE),
      expiry: d.expiry,
      note: truncate(d.note, MAX_NOTE),
    });
  },
  deleteDocument: (id) => {
    if (!id) throw new Error("Documento inválido");
    return repo.deleteDocument(id);
  },

  toggleOffDay: (carId, date, reason, detail) => {
    if (!carId || !date) throw new Error("Datos inválidos");
    const r = (reason || "").trim().toLowerCase();
    if (!r) throw new Error("Selecciona el motivo del día no trabajado");
    if (r !== "descanso" && r !== "otro") throw new Error("Motivo inválido");
    const d = (detail || "").trim().slice(0, 200);
    if (r === "otro" && !d) throw new Error("Especifica el detalle del motivo");
    return repo.toggleOffDay(carId, date, r, d);
  },
  bulkOffDay: (date, carIds, reason, detail) => {
    if (!date) throw new Error("Fecha inválida");
    if (!Array.isArray(carIds)) throw new Error("Selecciona al menos un carro");
    if (carIds.length === 0) throw new Error("Selecciona al menos un carro");
    if (carIds.length > 200) throw new Error("Máximo 200 carros");
    const r = (reason || "").trim().toLowerCase();
    if (!r) throw new Error("Selecciona el motivo del día no trabajado");
    if (r !== "descanso" && r !== "otro") throw new Error("Motivo inválido");
    const d = (detail || "").trim().slice(0, 200);
    if (r === "otro" && !d) throw new Error("Especifica el detalle del motivo");
    return repo.bulkOffDay(date, carIds, r, d);
  },
  clearOffDay: (date) => {
    if (!date) throw new Error("Fecha inválida");
    return repo.clearOffDay(date);
  },
  getCarDebtDetail: (carId, today) => {
    if (!carId) throw new Error("Carro inválido");
    return repo.getCarDebtDetail(carId, today);
  },

  // Estado de cuenta por conductor (período seleccionable; por defecto el mes en curso).
  loadAccountStatement: (carId, from, to) => {
    if (!carId) throw new Error("Carro inválido");
    if (from && typeof from !== "string") throw new Error("Fecha inválida");
    if (to && typeof to !== "string") throw new Error("Fecha inválida");
    return repo.getAccountStatement(carId, from, to);
  },

  // Entregas (handover): historial de qué conductor tuvo cada carro.
  loadHandovers: (carId) => repo.getHandovers(carId),
  registerHandover: (carId, payload) => {
    if (!carId) throw new Error("Selecciona un carro");
    const name = (payload?.driverName || "").trim();
    if (!name) throw new Error("Ingresa el nombre del conductor");
    if (!payload?.date) throw new Error("Ingresa la fecha de entrega");
    const paymentFrequency = payload.paymentFrequency || "daily";
    if (!["daily", "weekly"].includes(paymentFrequency)) throw new Error("Selecciona una frecuencia válida");
    const dailyRate = payload.dailyRate == null || payload.dailyRate === "" ? undefined : Number(payload.dailyRate);
    if (dailyRate !== undefined && (!Number.isFinite(dailyRate) || dailyRate <= 0 || dailyRate > 1e11)) {
      throw new Error("La tarifa diaria debe ser mayor a 0");
    }
    return repo.registerHandover(carId, {
      driverName: truncate(name, MAX_NAME),
      driverPhone: truncate(payload.driverPhone || "", MAX_PHONE),
      date: payload.date,
      note: truncate(payload.note, MAX_NOTE),
      paymentFrequency,
      ...(dailyRate !== undefined ? { dailyRate } : {}),
    });
  },
  closeHandover: (id, date) => {
    if (!id) throw new Error("Entrega inválida");
    if (!date) throw new Error("Ingresa la fecha de devolución");
    return repo.closeHandover(id, date);
  },
  updateHandover: (id, payload) => {
    if (!id) throw new Error("Entrega inválida");
    const out = {};
    if (payload && "driverName" in payload) out.driverName = truncate(payload.driverName, MAX_NAME);
    if (payload && "driverPhone" in payload) out.driverPhone = truncate(payload.driverPhone, MAX_PHONE);
    if (payload && "note" in payload) out.note = truncate(payload.note, MAX_NOTE);
    return repo.updateHandover(id, out);
  },
  deleteHandover: (id) => {
    if (!id) throw new Error("Entrega inválida");
    return repo.deleteHandover(id);
  },

  createRefinance: (r) => {
    if (!r || !r.carId) throw new Error("Selecciona un carro");
    const amt = Number(r.originalAmount);
    if (!amt || !isFinite(amt) || amt <= 0) throw new Error("El monto debe ser mayor a 0");
    if (amt > 1e11) throw new Error("Monto excesivo");
    const days = Number(r.days);
    if (!days || !isFinite(days) || days < 1) throw new Error("El plazo debe ser al menos 1 día");
    if (days > 365 * 10) throw new Error("Plazo excesivo");
    return repo.createRefinance({
      carId: r.carId,
      date: r.date,
      originalAmount: amt,
      days: clamp(r.days, 1, 3650, 1),
      note: truncate(r.note, MAX_NOTE),
    });
  },
  payRefinance: (id, amount) => {
    if (!id) throw new Error("Refinanciamiento inválido");
    const amt = Number(amount);
    if (!amt || !isFinite(amt) || amt <= 0) throw new Error("El abono debe ser mayor a 0");
    if (amt > 1e11) throw new Error("Abono excesivo");
    return repo.payRefinance(id, amt);
  },
  cancelRefinance: (id) => {
    if (!id) throw new Error("Refinanciamiento inválido");
    return repo.cancelRefinance(id);
  },

  saveSettings: (s) => {
    if (!s) throw new Error("Configuración inválida");
    const email = truncate(s.adminEmail || "", MAX_EMAIL);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Correo inválido");
    const channel = s.notifyChannel === "telegram" ? "telegram" : "whatsapp";
    return repo.saveSettings({
      adminPhone: truncate(s.adminPhone || "", MAX_PHONE),
      adminEmail: email,
      remindersEnabled: s.remindersEnabled === undefined ? true : !!s.remindersEnabled,
      morningHour: clamp(s.morningHour, 0, 23, 8),
      lateMorningHour: clamp(s.lateMorningHour, 0, 23, 11),
      middayHour: clamp(s.middayHour, 0, 23, 14),
      afternoonHour: clamp(s.afternoonHour, 0, 23, 16),
      eveningHour: clamp(s.eveningHour, 0, 23, 20),
      notifyChannel: channel,
      telegramChatId: truncate(s.telegramChatId || "", MAX_CHATID),
    });
  },

  // WhatsApp por API (Cloud API / Meta): envío interno, sin abrir WhatsApp Web.
  sendWhatsApp: (payload) => {
    if (!payload || typeof payload !== "object") throw new Error("Mensaje inválido");
    const kind = payload.kind || "text";
    if (!["test", "text", "statement", "reminder"].includes(kind)) throw new Error("Tipo de mensaje inválido");
    const to = truncate(payload.to || "", MAX_PHONE);
    const text = truncate(payload.text || "", 4096);
    if (kind === "text" && !text) throw new Error("El mensaje está vacío");
    if (kind !== "reminder" && !to) throw new Error("Ingresa el número destino");
    return repo.sendWhatsApp({
      kind,
      to,
      text,
      carId: payload.carId,
      moment: payload.moment,
      date: payload.date,
    });
  },
  getWhatsAppStatus: () => repo.getWhatsAppStatus(),

  // Telegram Bot API (canal alternativo, sin ventana de 24 h ni plantillas).
  getTelegramStatus: () => repo.getTelegramStatus(),
  sendTelegramTest: (to) => repo.sendTelegramTest(truncate(to || "", MAX_CHATID)),
  setupTelegram: (url) => repo.setupTelegram(truncate(url || "", 300)),

  syncNequi: () => repo.syncNequi(),
  approvePendingPayment: (id, payload) => {
    if (!id) throw new Error("Pago pendiente inválido");
    if (!payload || !payload.carId) throw new Error("Selecciona un carro");
    if (!payload.date) throw new Error("Selecciona la fecha del pago");
    return repo.approvePendingPayment(id, {
      carId: payload.carId,
      date: payload.date,
      note: truncate(payload.note || "", MAX_NOTE),
    });
  },
  dismissPendingPayment: (id) => {
    if (!id) throw new Error("Pago pendiente inválido");
    return repo.dismissPendingPayment(id);
  },

  reset: () => repo.reset(),
});
