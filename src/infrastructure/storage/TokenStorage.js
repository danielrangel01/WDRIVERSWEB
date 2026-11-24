const KEY = "wd_token_v2";
const SESSION_KEY = "wd_token_session";
const LOCK_KEY = "wd_lock_until";
const MAX_TOKEN_AGE_MS = 12 * 60 * 60 * 1000;

function isHttpOnlyCookieAvailable() {
  return false;
}

const safeParse = (raw) => {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || typeof obj.t !== "string") return null;
    if (typeof obj.e === "number" && obj.e < Date.now()) return null;
    return obj;
  } catch {
    return null;
  }
};

const now = () => Date.now();

export const TokenStorage = {
  get() {
    const locked = Number(localStorage.getItem(LOCK_KEY) || 0);
    if (locked && locked > now()) return null;

    const fromSession = safeParse(sessionStorage.getItem(SESSION_KEY));
    if (fromSession) return fromSession.t;

    const fromLocal = safeParse(localStorage.getItem(KEY));
    if (fromLocal) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(fromLocal));
      return fromLocal.t;
    }
    return null;
  },

  set(t) {
    if (typeof t !== "string" || t.length < 32) return;
    const exp = now() + MAX_TOKEN_AGE_MS;
    const payload = JSON.stringify({ t, e: exp });
    try {
      sessionStorage.setItem(SESSION_KEY, payload);
      localStorage.setItem(KEY, payload);
    } catch (_) {}
  },

  clear() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(KEY);
    } catch (_) {}
  },

  lock(seconds = 15 * 60) {
    try {
      localStorage.setItem(LOCK_KEY, String(now() + seconds * 1000));
      sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  },
};

if (typeof window !== "undefined") {
  try {
    setInterval(() => {
      const raw = localStorage.getItem(KEY);
      if (raw && safeParse(raw) === null) localStorage.removeItem(KEY);
    }, 60 * 1000);
  } catch (_) {}
}
