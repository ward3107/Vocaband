import { describe, expect, it } from 'vitest';
import { createQuickPlayIdentity, ownsQuickPlayStudent, publicQuickPlayStudent } from '../utils/quickPlayIdentity.server';

describe('Quick Play private rejoin identity', () => {
  const signer = createQuickPlayIdentity('test-only-shared-server-secret');
  const token = signer.issue('ABC234', 'player-1', 'account-1', 1000);
  it('works on another VM with the same secret', () => {
    expect(createQuickPlayIdentity('test-only-shared-server-secret').verify(token, 'ABC234', 'player-1', 'account-1', 2000)).toBe(true);
  });
  it.each([
    ['wrong room', 'ABC235', 'player-1', 'account-1'],
    ['wrong player', 'ABC234', 'player-2', 'account-1'],
    ['guest impersonating account', 'ABC234', 'player-1', ''],
    ['different account', 'ABC234', 'player-1', 'account-2'],
  ])('rejects %s', (_label, room, player, uid) => {
    expect(signer.verify(token, room, player, uid, 2000)).toBe(false);
  });
  it('rejects expired, tampered, missing and oversized credentials', () => {
    expect(signer.verify(token, 'ABC234', 'player-1', 'account-1', 86401000)).toBe(false);
    for (const invalid of [undefined, '', token + '.extra', token.slice(0, -2) + 'xx', 'x'.repeat(2049)]) {
      expect(signer.verify(invalid, 'ABC234', 'player-1', 'account-1', 2000)).toBe(false);
    }
  });
  it('rejects a credential signed by another secret', () => {
    expect(createQuickPlayIdentity('another-secret').verify(token, 'ABC234', 'player-1', 'account-1', 2000)).toBe(false);
  });
  it('does not leak current or future private fields in public snapshots', () => {
    const entry = { clientId: 'player-1', nickname: 'Same Name', avatar: '🦊', score: 12, lastSeen: 10, authUid: 'private-account', rejoinToken: 'private-credential', team: 'red' as const };
    const publicEntry = publicQuickPlayStudent(entry);
    expect(publicEntry).not.toHaveProperty('authUid');
    expect(publicEntry).not.toHaveProperty('rejoinToken');
    expect(publicEntry).toMatchObject({ nickname: 'Same Name', score: 12, team: 'red' });
  });
  it('only authorizes the admitted connection and refuses kicked players', () => {
    const state = { socketToClient: new Map([['socket-1', 'player-1']]), students: new Map([['player-1', {}]]), kickedClientIds: new Set<string>() };
    expect(ownsQuickPlayStudent(state, 'socket-1', 'player-1')).toBe(true);
    expect(ownsQuickPlayStudent(state, 'socket-2', 'player-1')).toBe(false);
    expect(ownsQuickPlayStudent(state, 'socket-1', 'player-2')).toBe(false);
    state.kickedClientIds.add('player-1');
    expect(ownsQuickPlayStudent(state, 'socket-1', 'player-1')).toBe(false);
  });
});
