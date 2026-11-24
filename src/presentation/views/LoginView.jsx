import { useState } from "react";
import { C } from "../theme/palette.js";
import { useUseCases } from "../context/AppContext.jsx";
import { Spinner } from "../components/UI.jsx";
import Logo from "../components/Logo.jsx";

export default function LoginView({ onLogin }) {
  const uc = useUseCases();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) { setError("Completa usuario y contraseña."); return; }
    setLoading(true); setError("");
    try {
      const { username: u } = await uc.login(username.trim(), password);
      onLogin(u);
    } catch (err) {
      setError(err.message || "No se pudo conectar con el servidor.");
      setShake(true); setTimeout(() => setShake(false), 500);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "36px 28px", width: "100%", maxWidth: 380, boxShadow: "0 20px 60px #00000088", animation: shake ? "shake 0.5s ease" : "fadeInUp 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <Logo size={76} />
          <div style={{ fontWeight: 900, fontSize: 28, color: C.gold, letterSpacing: -0.5, marginTop: 12 }}>W Drivers</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Gestión de flota · Acceso admin</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>Usuario</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="username"
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, padding: "12px 14px", fontSize: 16, outline: "none", width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                style={{ background: C.bg, border: `1px solid ${error ? C.red : C.border}`, borderRadius: 9, color: C.text, padding: "12px 44px 12px 14px", fontSize: 16, outline: "none", width: "100%", boxSizing: "border-box" }} />
              <button type="button" onClick={() => setShowPass((s) => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>{showPass ? "🙈" : "👁️"}</button>
            </div>
          </div>
          {error && <div style={{ background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 9, padding: "10px 14px", color: C.red, fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>}
          <button onClick={submit} disabled={loading} style={{ background: C.gold, color: C.bg, border: "none", borderRadius: 11, padding: "14px", fontWeight: 800, fontSize: 16, cursor: loading ? "wait" : "pointer", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <Spinner size={18} color={C.bg} /> : "Ingresar →"}
          </button>
        </div>
      </div>
    </div>
  );
}
