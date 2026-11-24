// Formato de moneda colombiana, centralizado.
const formatter = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});

export const Money = {
  format: (n) => formatter.format(n || 0),
};
