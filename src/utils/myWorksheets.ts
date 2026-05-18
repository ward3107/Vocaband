/**
 * myWorksheets — per-device record of worksheets this browser minted.
 *
 * Anonymous shares (no auth.uid() at mint time) have no server-side
 * owner: the only way to revoke them is to send back the
 * `minter_fingerprint` we stamped on the row. We keep that fingerprint
 * — plus a small label so the user can tell rows apart — in
 * localStorage on the same device that minted.
 *
 * Logged-in teachers also get an entry so the "my recent shares" list
 * works without a server round-trip on every Free Resources visit; the
 * server is still the source of truth (RLS-protected) for anything
 * authoritative.
 */
export interface MyWorksheetEntry {
  slug: string;
  topicName: string;
  createdAt: number;
}

const LIST_KEY = "vocaband:worksheet:mine";
const MINTER_FP_KEY = "vocaband:worksheet:minter_fingerprint";
const MAX_ENTRIES = 50;

const safeLocalStorage = (): Storage | null => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const getOrCreateMinterFingerprint = (): string | null => {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    let fp = ls.getItem(MINTER_FP_KEY);
    if (!fp) {
      fp =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `mfp-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      ls.setItem(MINTER_FP_KEY, fp);
    }
    return fp;
  } catch {
    return null;
  }
};

export const listMyWorksheets = (): MyWorksheetEntry[] => {
  const ls = safeLocalStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is MyWorksheetEntry =>
          e && typeof e.slug === "string" &&
          typeof e.topicName === "string" &&
          typeof e.createdAt === "number",
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
};

export const recordMyWorksheet = (entry: MyWorksheetEntry): void => {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    const current = listMyWorksheets().filter((e) => e.slug !== entry.slug);
    const next = [entry, ...current].slice(0, MAX_ENTRIES);
    ls.setItem(LIST_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked / quota — silent */
  }
};

export const forgetMyWorksheet = (slug: string): void => {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    const next = listMyWorksheets().filter((e) => e.slug !== slug);
    ls.setItem(LIST_KEY, JSON.stringify(next));
  } catch {
    /* silent */
  }
};
