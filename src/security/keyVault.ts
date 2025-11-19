// memory-only vault; never writes to storage
let _key: string | null = null;
let idleTimer: number | null = null;
const IDLE_MS = 10 * 60 * 1000; // auto-clear after 10 minutes idle

export function setKey(k: string) {
  _key = (k || "").trim() || null;
  resetIdle();
}

export function getKey(): string | null {
  resetIdle();
  return _key;
}

export function clearKey() {
  _key = null;
  if (idleTimer) { window.clearTimeout(idleTimer); idleTimer = null; }
}

function resetIdle() {
  if (idleTimer) window.clearTimeout(idleTimer);
  if (_key) idleTimer = window.setTimeout(() => { _key = null; }, IDLE_MS);
}

// hygiene: clear only on page unload (not on tab switches)
window.addEventListener("beforeunload", () => clearKey());
