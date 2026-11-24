import { C } from "../theme/palette.js";

export const Badge = ({ children, color = C.gold }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", display: "inline-block" }}>{children}</span>
);

export const Pill = ({ label, value, color = C.gold, sub }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", flex: "1 1 140px", minWidth: 130 }}>
    <div style={{ color: C.muted, fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
    <div style={{ color, fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{sub}</div>}
  </div>
);

export const Btn = ({ children, onClick, color = C.gold, small, outline, danger, disabled, full }) => {
  const bg = disabled ? C.border : danger ? C.red : outline ? "transparent" : color;
  const tc = disabled ? C.muted : outline ? (danger ? C.red : color) : C.bg;
  const bd = disabled ? C.border : danger ? C.red : color;
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ background: bg, color: tc, border: `1.5px solid ${bd}`, borderRadius: 9, padding: small ? "7px 13px" : "11px 20px", fontWeight: 700, fontSize: small ? 13 : 15, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: disabled ? 0.5 : 1, width: full ? "100%" : "auto", touchAction: "manipulation" }}>
      {children}
    </button>
  );
};

export const Field = ({ label, error, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
    {label && <label style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>{label}</label>}
    <input {...props} style={{ background: C.surface, border: `1px solid ${error ? C.red : C.border}`, borderRadius: 9, color: C.text, padding: "11px 13px", fontSize: 16, outline: "none", width: "100%", boxSizing: "border-box", ...props.style }} />
    {error && <span style={{ color: C.red, fontSize: 11 }}>{error}</span>}
  </div>
);

export const Select = ({ label, children, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
    {label && <label style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>{label}</label>}
    <select {...props} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, padding: "11px 13px", fontSize: 16, outline: "none", width: "100%", boxSizing: "border-box", ...props.style }}>{children}</select>
  </div>
);

export const Card = ({ title, children, accent }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
    {title && <div style={{ padding: "13px 16px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: accent || C.text, fontSize: 15 }}>{title}</div>}
    <div style={{ padding: 16 }}>{children}</div>
  </div>
);

export const Spinner = ({ size = 22, color = C.gold }) => (
  <span style={{ display: "inline-block", width: size, height: size, border: `3px solid ${color}33`, borderTop: `3px solid ${color}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
);

export const Empty = ({ children }) => (
  <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 14 }}>{children}</div>
);
