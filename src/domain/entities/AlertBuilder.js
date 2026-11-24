import { CalendarDate } from "../value-objects/CalendarDate.js";
import { Money } from "../value-objects/Money.js";

const carLabel = (cars, id) => {
  const c = cars.find((x) => x.id === id);
  if (!c) return "—";
  return c.name ? `${c.plate} · ${c.name}` : c.plate;
};

// Construye la lista de alertas activas a partir del estado.
export function buildAlerts({ cars = [], documents = [], metrics = {} }) {
  const activeCars = cars.filter((c) => c.active);
  const alerts = [];

  activeCars.forEach((car) => {
    const pc = metrics.perCar?.[car.id];
    if (pc && pc.debt > 0) {
      alerts.push({ level: "warn", icon: "💸", title: `Deuda: ${carLabel(cars, car.id)}`, body: `Debe ${Money.format(pc.debt)}` });
    }
    if (!car.startDate) {
      alerts.push({ level: "info", icon: "⚙️", title: `Configura ${car.plate}`, body: "Falta la fecha de inicio" });
    }
  });

  documents.forEach((doc) => {
    const days = CalendarDate.daysUntil(doc.expiry);
    const label = `${carLabel(cars, doc.carId)} — ${doc.type}`;
    if (days < 0) alerts.push({ level: "critical", icon: "🚨", title: `VENCIDO: ${label}`, body: `Hace ${Math.abs(days)} día(s)` });
    else if (days <= 15) alerts.push({ level: "urgent", icon: "⚠️", title: `Vence pronto: ${label}`, body: `En ${days} día(s)` });
    else if (days <= 30) alerts.push({ level: "info", icon: "📅", title: `Por vencer: ${label}`, body: `En ${days} días` });
  });

  return alerts;
}

// Genera el texto del reporte de WhatsApp.
export function buildWhatsAppMessage({ cars = [], documents = [], offDays = [], metrics = {} }, type = "full") {
  const activeCars = cars.filter((c) => c.active);
  const td = CalendarDate.today();
  const dl = CalendarDate.format(td);
  const isOff = (carId) => offDays.some((o) => o.carId === carId && o.date === td);

  const debtors = activeCars.filter((c) => (metrics.perCar?.[c.id]?.debt || 0) > 0);
  const docAlerts = documents.filter((doc) => CalendarDate.daysUntil(doc.expiry) <= 30);
  const offToday = activeCars.filter((c) => isOff(c.id));

  const fin = () => {
    let s = `📊 *RESUMEN*\n`;
    s += `• Cobrado total: ${Money.format(metrics.totalPaid)}\n`;
    s += `• Gastos total: ${Money.format(metrics.totalExp)}\n`;
    s += `• Utilidad neta: ${Money.format(metrics.profit)}\n`;
    s += `• Esperado total: ${Money.format(metrics.totalExpected)}\n`;
    s += `• Deuda pendiente total: ${Money.format(metrics.totalDebt)}\n`;
    return s;
  };
  const docs = () => {
    if (docAlerts.length === 0) return `✅ *Documentos al día*\n`;
    let s = `📄 *DOCUMENTOS*\n`;
    docAlerts.forEach((doc) => {
      const days = CalendarDate.daysUntil(doc.expiry);
      const icon = days < 0 ? "🚨" : days <= 15 ? "⚠️" : "📅";
      s += `${icon} ${carLabel(cars, doc.carId)} — ${doc.type}: ${days < 0 ? `VENCIDO (${Math.abs(days)}d)` : `${days}d`}\n`;
    });
    return s;
  };
  const debts = () => {
    let s = `💸 *PAGOS PENDIENTES (${debtors.length})*\n`;
    if (debtors.length === 0) return s + `✅ Todos al día\n`;
    debtors.forEach((c) => { s += `❌ ${carLabel(cars, c.id)}: ${Money.format(metrics.perCar[c.id].debt)}\n`; });
    return s;
  };
  const offs = () => {
    let s = `🚫 *NO TRABAJARON HOY (${offToday.length})*\n`;
    if (offToday.length === 0) return s + `✅ Todos trabajaron\n`;
    offToday.forEach((c) => { s += `🚫 ${carLabel(cars, c.id)}\n`; });
    return s;
  };

  if (type === "morning") return `🌅 *W Drivers — Buenos días ${dl}*\n\n${fin()}\n${docs()}\n_Reporte matutino_`;
  if (type === "evening") return `🌙 *W Drivers — Cierre ${dl}*\n\n${offs()}\n${debts()}\n_Reporte nocturno_`;
  return `🚗 *W Drivers — Reporte ${dl}*\n\n${fin()}\n${offs()}\n${debts()}\n${docs()}\n_W Drivers_`;
}
