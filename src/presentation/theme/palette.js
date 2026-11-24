// Paleta W Drivers — negro y dorado premium.
export const C = {
  bg: "#0B0B0D",          // negro casi puro
  surface: "#141417",     // superficie
  card: "#1C1C21",        // tarjetas
  border: "#2A2A30",      // bordes sutiles
  gold: "#D4AF37",        // dorado principal
  goldSoft: "#F9D976",    // dorado claro (acentos)
  goldDeep: "#9E7C16",    // dorado oscuro
  green: "#3FCF8E",
  red: "#F0575B",
  blue: "#5B9DF0",
  orange: "#FF9F45",
  text: "#ECECEF",
  muted: "#85858F",
  // alias para compatibilidad con nombres previos
  get yellow() { return this.gold; },
};

// Constantes de catálogo usadas por las vistas
export const DEFAULT_RATE = 80000;
export const DOC_TYPES = ["SOAT", "Tecnomecánica", "Seguro Todo Riesgo", "Licencia de Tránsito", "Otro"];
export const EXPENSE_CATS = ["Mantenimiento", "Combustible", "Seguro", "Impuestos", "Lavado", "Repuestos", "Administrativo", "Otro"];
export const TABS = [
  { icon: "📊", label: "Inicio" },
  { icon: "🎯", label: "Hoy" },
  { icon: "🚙", label: "Carros" },
  { icon: "📅", label: "No trabajó" },
  { icon: "💵", label: "Pagos" },
  { icon: "🔧", label: "Gastos" },
  { icon: "📄", label: "Docs" },
  { icon: "💳", label: "Deudas" },
  { icon: "🏦", label: "Nequi" },
  { icon: "📋", label: "Historial" },
  { icon: "⚙️", label: "Config" },
];
