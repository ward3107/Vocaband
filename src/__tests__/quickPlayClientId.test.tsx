import { describe, it, expect, beforeEach } from 'vitest';
import { QP_CLIENT_ID_STORAGE_KEY, readStoredClientId } from '../utils/quickPlayClientId';

// readStoredClientId is the identity the in-game 🆘 "Show my teacher" flow sends
// to the server and that the teacher's leaderboard/raised-hand map keys on. It
// MUST be the stable per-tab clientId (never socket.id), so guard its contract.
describe('readStoredClientId', () => {
  beforeEach(() => {
    try { sessionStorage.clear(); } catch { /* jsdom always has it */ }
  });

  it('returns null when no clientId is stored', () => {
    expect(readStoredClientId()).toBeNull();
  });

  it('returns a stored, well-formed UUID', () => {
    const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    sessionStorage.setItem(QP_CLIENT_ID_STORAGE_KEY, uuid);
    expect(readStoredClientId()).toBe(uuid);
  });

  it('rejects a malformed value so a corrupted id never leaks downstream', () => {
    sessionStorage.setItem(QP_CLIENT_ID_STORAGE_KEY, 'not-a-uuid');
    expect(readStoredClientId()).toBeNull();
  });
});
