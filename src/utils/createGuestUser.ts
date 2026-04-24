/**
 * createGuestUser — build an AppUser object for a guest (Quick Play)
 * student session.  Pure: generates a UUID-prefixed uid, trims the
 * display name, sets the guest/role flags, and stamps createdAt.
 *
 * Extracted from App.tsx because the function has no React state
 * dependency and is referenced from multiple places (the URL
 * bootstrap hook and the Quick Play student view prop).  Keeping
 * one copy here avoids drift.
 *
 * Mobile-compatible UUID generation:
 *   1. Prefer native `crypto.randomUUID()` — available everywhere
 *      current; some older mobile Safari builds lack it.
 *   2. Fall back to manually formatting UUID v4 bytes from
 *      `crypto.getRandomValues()`.
 *   3. Last-resort fallback: timestamp + monotonic counter (still
 *      avoids `Math.random`, just doesn't provide unpredictability).
 *      Used only when `crypto` is unavailable — extremely rare.
 */
import type { AppUser } from '../core/supabase';

let lastResortCounter = 0;

function generateUuid(): string {
  // 1. Native crypto.randomUUID() wherever available.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // 2. Build UUID v4 from crypto.getRandomValues bytes.
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
    const toHex = (b: number) => b.toString(16).padStart(2, '0');
    const hex = Array.from(bytes, toHex).join('');
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20),
    ].join('-');
  }

  // 3. Last-resort: timestamp + monotonic counter.
  const now = Date.now().toString(36);
  lastResortCounter = (lastResortCounter + 1) | 0;
  return `${now}-${lastResortCounter.toString(36)}`;
}

export function createGuestUser(
  name: string,
  prefix: string = 'guest',
  avatar: string = '🦊',
): AppUser {
  return {
    uid: `${prefix}-${generateUuid()}`,
    displayName: name.trim().slice(0, 30),
    email: undefined,
    role: 'guest',
    isGuest: true,
    avatar,
    xp: 0,
    classCode: undefined,
    createdAt: new Date().toISOString(),
  };
}
