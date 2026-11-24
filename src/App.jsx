import { useState, useCallback, useRef, useEffect } from "react";
import { C, TABS } from "./presentation/theme/palette.js";
import { TokenStorage } from "./infrastructure/storage/TokenStorage.js";
import { useFleet } from "./presentation/hooks/useFleet.js";
import Logo from "./presentation/components/Logo.jsx";
import { Spinner } from "./presentation/components/UI.jsx";
import LoginView from "./presentation/views/LoginView.jsx";
import DashboardView from "./presentation/views/DashboardView.jsx";
import TodayView from "./presentation/views/TodayView.jsx";
import CarsView from "./presentation/views/CarsView.jsx";
import DocumentsView from "./presentation/views/DocumentsView.jsx";
import DebtsView from "./presentation/views/DebtsView.jsx";
import NequiView from "./presentation/views/NequiView.jsx";
import { OffDays, Payments, Expenses } from "./presentation/views/OperationsView.jsx";
import { History, Config } from "./presentation/views/HistoryConfigView.jsx";

export default function App() {
  const [logged, setLogged] = useState(() => !!TokenStorage.get());
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, kind = "ok") => {
    const color = kind === "error" ? C.red : kind === "wa" ? "#25D366" : C.green;
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const onAuthExpired = useCallback(() => { TokenStorage.clear(); setLogged(false); }, []);

  if (!logged) {
    return <LoginView onLogin={() => setLogged(true)} />;
  }
  return <Shell tab={tab} setTab={setTab} toast={toast} showToast={showToast} onAuthExpired={onAuthExpired}
    onLogout={() => { TokenStorage.clear(); setLogged(false); setTab(0); }} />;
}

function Shell({ tab, setTab, toast, showToast, onAuthExpired, onLogout }) {
  const { data, loading, actions, alerts, sendWhatsApp } = useFleet({ onToast: showToast, onAuthExpired });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const closeMenu = useCallback(() => { setMenuOpen(false); menuBtnRef.current?.focus(); }, []);

  if (!data) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={36} />
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.level === "critical" || a.level === "urgent").length;
  const props = { data, actions, toast: showToast, sendWA: sendWhatsApp };

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", color: C.text, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", paddingBottom: 76 }}>
      {toast && (
        <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top) + 12px)", left: "50%", transform: "translateX(-50%)", background: toast.color, color: toast.color === "#25D366" ? "#fff" : C.bg, borderRadius: 10, padding: "11px 18px", fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px #0008", maxWidth: "90vw" }}>{toast.msg}</div>
      )}

      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "calc(env(safe-area-inset-top) + 8px) 14px 8px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100 }}>
        <Logo size={34} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.gold, letterSpacing: -0.3 }}>W Drivers</div>
          <div style={{ fontSize: 10, color: C.muted }}>{TABS[tab].label}</div>
        </div>
        {criticalCount > 0 && (
          <div style={{ background: C.red + "22", border: `1px solid ${C.red}55`, borderRadius: 8, padding: "4px 9px", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 13 }}>🚨</span><span style={{ color: C.red, fontWeight: 700, fontSize: 12 }}>{criticalCount}</span>
          </div>
        )}
        {loading && <Spinner size={16} />}
        <button ref={menuBtnRef} onClick={() => setMenuOpen(true)} aria-label="Abrir menú de navegación" aria-expanded={menuOpen} aria-controls="main-drawer"
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, borderRadius: 8, touchAction: "manipulation" }}>
          <span style={{ display: "block", width: 20, height: 2, background: C.gold, borderRadius: 2 }} />
          <span style={{ display: "block", width: 20, height: 2, background: C.gold, borderRadius: 2 }} />
          <span style={{ display: "block", width: 20, height: 2, background: C.gold, borderRadius: 2 }} />
        </button>
      </div>

      <div style={{ padding: 16, maxWidth: 700, margin: "0 auto" }}>
        {tab === 0 && <DashboardView {...props} alerts={alerts} />}
        {tab === 1 && <TodayView {...props} />}
        {tab === 2 && <CarsView {...props} />}
        {tab === 3 && <OffDays {...props} />}
        {tab === 4 && <Payments {...props} />}
        {tab === 5 && <Expenses {...props} />}
        {tab === 6 && <DocumentsView {...props} />}
        {tab === 7 && <DebtsView {...props} />}
        {tab === 8 && <NequiView {...props} />}
        {tab === 9 && <History {...props} />}
        {tab === 10 && <Config {...props} onLogout={onLogout} />}
      </div>

      <Drawer open={menuOpen} onClose={closeMenu} tab={tab} setTab={setTab} onLogout={onLogout} criticalCount={criticalCount} />
    </div>
  );
}

/**
 * Panel lateral flotante (menú hamburguesa).
 * Requisitos: animación suave, cierre táctil fuera del panel, accesibilidad
 * (WCAG 2.1: role=dialog, Escape, trampa de foco, foco inicial/restaurado),
 * responsividad y coherencia visual con la identidad de marca.
 */
function Drawer({ open, onClose, tab, setTab, onLogout, criticalCount }) {
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!nodes || nodes.length === 0) return;
      const list = Array.from(nodes).filter((n) => !n.disabled);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => closeBtnRef.current?.focus(), 80);
    return () => { document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open, onClose]);

  const go = (i) => { setTab(i); onClose(); };

  return (
    <>
      {/* Área de cierre: scrim que oscurece el contenido y cierra al tocar fuera del panel */}
      <div onClick={onClose} aria-hidden="true"
        style={{ position: "fixed", inset: 0, background: "#000", opacity: open ? 0.6 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s ease", zIndex: 1000 }} />

      <aside id="main-drawer" ref={panelRef} role="dialog" aria-modal="true" aria-label="Menú de navegación"
        style={{ position: "fixed", top: 0, bottom: 0, right: 0, width: "min(86vw, 320px)", background: C.surface, borderLeft: `1px solid ${C.border}`, boxShadow: "0 0 40px #0009", zIndex: 1001, display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(102%)", visibility: open ? "visible" : "hidden", transition: "transform .3s cubic-bezier(.22,.61,.36,1), visibility .3s", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 14px", borderBottom: `1px solid ${C.border}` }}>
          <Logo size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.gold, letterSpacing: -0.3 }}>W Drivers</div>
            <div style={{ fontSize: 11, color: C.muted }}>Menú de navegación</div>
          </div>
          <button ref={closeBtnRef} onClick={onClose} aria-label="Cerrar menú de navegación"
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 15, lineHeight: 1 }}>✕</button>
        </div>

        <nav aria-label="Opciones de navegación" style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {TABS.map((t, i) => {
            const active = tab === i;
            return (
              <button key={i} onClick={() => go(i)} aria-current={active ? "page" : undefined}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 4, background: active ? C.gold + "14" : "transparent", border: `1px solid ${active ? C.gold + "55" : "transparent"}`, borderRadius: 10, color: active ? C.gold : C.text, cursor: "pointer", textAlign: "left", fontSize: 15, fontWeight: active ? 700 : 500 }}>
                <span aria-hidden="true" style={{ fontSize: 19, width: 24, textAlign: "center" }}>{t.icon}</span>
                <span style={{ flex: 1 }}>{t.label}</span>
                {i === 0 && criticalCount > 0 && (
                  <span style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}55`, borderRadius: 6, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>🚨 {criticalCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: `1px solid ${C.border}`, padding: 12 }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", margin: "0 0 8px 6px" }}>Cuenta</div>
          <button onClick={() => { onClose(); onLogout?.(); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, color: C.red, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
            <span aria-hidden="true" style={{ fontSize: 18, width: 24, textAlign: "center" }}>⎋</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
