// Operaciones de fecha del dominio (formato YYYY-MM-DD).
export const CalendarDate = {
  today: () => new Date().toISOString().slice(0, 10),
  month: () => CalendarDate.today().slice(0, 7),
  hour: () => new Date().getHours(),

  format: (d) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  },

  monthLabel: (ym) => {
    const [y, m] = ym.split("-");
    return new Date(y, m - 1).toLocaleString("es", { month: "long", year: "numeric" });
  },

  // Días desde hoy hasta una fecha (para vencimientos). Negativo = ya pasó.
  daysUntil: (dateStr) => {
    if (!dateStr) return 9999;
    return Math.round((new Date(dateStr) - new Date(CalendarDate.today())) / 86400000);
  },
};
