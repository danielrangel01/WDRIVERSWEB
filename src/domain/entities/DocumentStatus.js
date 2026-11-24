import { CalendarDate } from "../value-objects/CalendarDate.js";

// Calcula el "semáforo" de un documento según su vencimiento.
export function documentStatus(expiry, palette) {
  const days = CalendarDate.daysUntil(expiry);
  if (days < 0) return { color: palette.red, label: `Vencido hace ${Math.abs(days)}d`, icon: "🚨", level: "critical" };
  if (days <= 15) return { color: palette.orange, label: `Vence en ${days}d`, icon: "⚠️", level: "urgent" };
  if (days <= 30) return { color: palette.yellow, label: `Vence en ${days}d`, icon: "📅", level: "warn" };
  return { color: palette.green, label: `Vigente (${days}d)`, icon: "✅", level: "ok" };
}
