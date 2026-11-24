import { Money } from "../../domain/value-objects/Money.js";
import { CalendarDate } from "../../domain/value-objects/CalendarDate.js";
import { documentStatus } from "../../domain/entities/DocumentStatus.js";
import { C } from "../theme/palette.js";

export const fmt = Money.format;
export const fmtDate = CalendarDate.format;
export const monthLabel = CalendarDate.monthLabel;
export const diffDays = CalendarDate.daysUntil;
export const todayStr = CalendarDate.today;
export const monthStr = CalendarDate.month;
export const docStatusInfo = (expiry) => documentStatus(expiry, C);

export const findCar = (cars, id) => cars.find((c) => c.id === id);
export const carLabel = (cars, id) => {
  const c = findCar(cars, id);
  if (!c) return "—";
  return c.name ? `${c.plate} · ${c.name}` : c.plate;
};
export const isOffDay = (offDays, carId, date) =>
  (offDays || []).some((o) => o.carId === carId && o.date === date);

export const findOffDay = (offDays, carId, date) =>
  (offDays || []).find((o) => o.carId === carId && o.date === date) || null;

// Cuenta SOLO los días marcados como "descanso" (los 2 descansos mensuales permitidos).
// Los días con motivo "otro" siguen siendo no cobrables, pero NO cuentan como descanso mensual.
export const restDaysInMonthForCar = (offDays, carId, ym) =>
  (offDays || []).filter(
    (o) => o.carId === carId && o.date.slice(0, 7) === ym && o.reason === "descanso"
  ).length;

// Alias backward-compatible
export const offDaysInMonthForCar = restDaysInMonthForCar;

// Etiquetas legibles para el motivo de un día no trabajado.
export const OFF_REASON_LABELS = {
  descanso: "😴 Por descanso",
  no_trabajo: "🚫 No trabajó",
  taller: "🔧 Taller",
};
export const offReasonTag = (reason, detail) =>
  OFF_REASON_LABELS[reason] || `📝 ${detail || "Otro motivo"}`;
