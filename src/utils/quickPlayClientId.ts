// Per-tab Quick Play student identity (`clientId`), persisted in sessionStorage.
//
// Extracted from useQuickPlaySocket so read-only consumers — the in-game 🆘
// help button wiring (useGameRouteDeps) and the game-finished screen — can read
// the id WITHOUT importing the socket.io-heavy hook into their chunk. Keeping
// this module dependency-free is what lets `useGameRouteDeps` reference the id
// without dragging useQuickPlaySocket (and socket.io-client) along with it.
//
// useQuickPlaySocket still owns the WRITE / mint paths and imports the key from
// here, so there is a single source of truth. Why sessionStorage (not
// localStorage): it's per-tab, so two students on one device — or a teacher's
// test tabs — each get their own id instead of collapsing into a single
// server-side leaderboard row.

export const QP_CLIENT_ID_STORAGE_KEY = "vocaband_qp_client_id";

/** Read the current tab's Quick Play clientId, or null when none is stored yet
 *  (or storage is unavailable, e.g. private mode). Validates the UUID shape so
 *  a corrupted value never leaks downstream. */
export function readStoredClientId(): string | null {
  try {
    const existing = sessionStorage.getItem(QP_CLIENT_ID_STORAGE_KEY);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing)) {
      return existing;
    }
  } catch { /* private mode etc. */ }
  return null;
}
