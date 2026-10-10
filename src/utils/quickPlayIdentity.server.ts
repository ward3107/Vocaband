import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { QpStudentEntry } from '../core/quickPlayProtocol';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
type Claims = { session: string; client: string; uid: string; expires: number };

/** The credential is private to one tab and session. Never include it in a
 * room broadcast, URL or log. All VMs must use the same server-only secret. */
export function createQuickPlayIdentity(secret: string) {
  if (!secret) throw new Error('Quick Play identity requires a server secret');
  const sign = (body: string) => createHmac('sha256', secret)
    .update('vocaband:quick-play:rejoin:v1:').update(body).digest('base64url');
  return {
    issue(session: string, client: string, uid = '', now = Date.now()): string {
      const body = Buffer.from(JSON.stringify({ session, client, uid, expires: now + MAX_AGE_MS })).toString('base64url');
      return `${body}.${sign(body)}`;
    },
    verify(token: unknown, session: string, client: string, uid = '', now = Date.now()): boolean {
      if (typeof token !== 'string' || token.length > 2048) return false;
      const [body, signature, extra] = token.split('.');
      if (!body || !signature || extra !== undefined) return false;
      const expected = Buffer.from(sign(body));
      const actual = Buffer.from(signature);
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
      try {
        const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Claims;
        return claims.session === session && claims.client === client && claims.uid === uid
          && Number.isFinite(claims.expires) && claims.expires > now;
      } catch { return false; }
    },
    // A first join receives a server-generated ID. Otherwise a caller could
    // claim a public ID on a different VM where that student is not in memory.
    newClientId: () => randomUUID(),
  };
}

/** An allow-list protects future private fields as well as today's authUid. */
export function publicQuickPlayStudent(entry: QpStudentEntry): Omit<QpStudentEntry, 'authUid'> {
  return {
    clientId: entry.clientId, nickname: entry.nickname, avatar: entry.avatar,
    score: entry.score, lastSeen: entry.lastSeen,
    ...(entry.streak !== undefined ? { streak: entry.streak } : {}),
    ...(entry.roundProgress ? { roundProgress: { done: entry.roundProgress.done, total: entry.roundProgress.total } } : {}),
    ...(entry.perfectRound !== undefined ? { perfectRound: entry.perfectRound } : {}),
    ...(entry.perfectRoundScore !== undefined ? { perfectRoundScore: entry.perfectRoundScore } : {}),
    ...(entry.team ? { team: entry.team } : {}),
  };
}

export function ownsQuickPlayStudent(
  state: { socketToClient: Map<string, string>; students: Map<string, unknown>; kickedClientIds: Set<string> } | undefined,
  socketId: string, clientId: unknown,
): boolean {
  return typeof clientId === 'string' && !!state && state.socketToClient.get(socketId) === clientId
    && state.students.has(clientId) && !state.kickedClientIds.has(clientId);
}
