/**
 * Ask the browser to mark our origin's storage as persistent.
 *
 * Chrome auto-grants this when the app is installed as a PWA — the
 * effect is that the SW cache + IndexedDB + localStorage survive
 * "clear storage when low on disk" purges. Without this, a tablet
 * running low on storage can wipe a student's cached MP3s and
 * queued offline progress without warning.
 *
 * Safari ignores the request entirely — `storage.persist` either
 * doesn't exist on the API surface or returns false. Harmless: we
 * never block on the result, and Safari's own 7-day eviction is
 * mitigated by the install-gate (installed PWAs sidestep that).
 *
 * Best-effort: any throw is swallowed. The browser will retry
 * granting on its own engagement heuristic over time.
 */
export async function requestPersistentStorage(): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const storage = navigator.storage as
    | (StorageManager & {
        persisted?: () => Promise<boolean>;
        persist?: () => Promise<boolean>;
      })
    | undefined;
  if (!storage || typeof storage.persist !== 'function') return;
  try {
    if (typeof storage.persisted === 'function') {
      const already = await storage.persisted();
      if (already) return;
    }
    await storage.persist();
  } catch {
    // Quota policy, permission denied, or API missing — all fine.
  }
}
