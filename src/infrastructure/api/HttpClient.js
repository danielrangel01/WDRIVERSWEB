import { TokenStorage } from "../storage/TokenStorage.js";

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

const isBrowser = typeof window !== "undefined";
const isLocalhost = isBrowser && (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "[::1]"
);

const FALLBACK_URL = isLocalhost
  ? "http://localhost:4000"
  : "https://wdriversback-production.up.railway.app";

function resolveApiUrl() {
  let u = (import.meta.env && import.meta.env.VITE_API_URL) || "";
  u = String(u).trim().replace(/\/+$/, "");
  if (!u || u === "undefined" || u === "null") u = FALLBACK_URL;
  try {
    if (u && !/^https?:\/\//i.test(u)) {
      u = (isLocalhost ? "http://" : "https://") + u;
    }
    new URL(u);
  } catch {
    u = FALLBACK_URL;
  }
  if (typeof console !== "undefined") {
    console.log("[WDrivers] Backend URL:", u);
  }
  return u;
}

const API_URL = resolveApiUrl();

export class HttpClient {
  async request(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = TokenStorage.get();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const fullPath = path.startsWith("/") ? path : "/" + path;
    const url = `${API_URL}${fullPath}`;
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "omit",
    });
    if (res.status === 404) {
      const msg = `URL no encontrada (404): ${url}. Verifica que VITE_API_URL en Netlify sea correcta (debería apuntar al backend Railway, no a Netlify).`;
      console.error("[WDrivers]", msg);
      throw new ApiError(msg, 404);
    }
    if (res.status === 401) {
      TokenStorage.clear();
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error || "No autenticado", 401);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || "Error en la solicitud", res.status);
    return data;
  }
}

export function getApiBaseUrl() {
  return API_URL;
}
