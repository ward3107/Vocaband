import { QP_MAX_SCORE_DELTA, QP_MAX_SESSION_SCORE, type QpScoreUpdatePayload } from '../core/quickPlayProtocol';

type Extras = Pick<QpScoreUpdatePayload, 'streak' | 'roundProgress' | 'perfectRound'>;
type Item = { clientId: string; score: number; extras: Extras; updatedAt: number; pending: boolean; version: number };
type Ack = { ok: boolean; code?: string; score?: number };
type Send = (payload: QpScoreUpdatePayload, ack: (response: Ack) => void) => void;
const KEY = 'vocaband_qp_score_outbox_v1';
const TTL = 24 * 60 * 60 * 1000;
function read(): Record<string, Item> {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || '{}') as Record<string, Item>;
    return Object.fromEntries(Object.entries(value).filter(([, p]) => p && typeof p.clientId === 'string'
      && Number.isFinite(p.score) && p.score >= 0 && p.score <= QP_MAX_SESSION_SCORE && p.updatedAt > Date.now() - TTL).slice(-5));
  } catch { return {}; }
}
/** Per-tab cursor prevents another tab's resume hint from replacing this score. */
export function readQuickPlayScoreCursor(code: string, clientId: string): number | undefined {
  const p = read()[code]; return p?.clientId === clientId ? p.score : undefined;
}

/** Cumulative scores are idempotent. Retain the newest target until ACK;
 * reconnect/refresh and lost ACKs replay safely, in bounded 1500-point steps. */
export function createQuickPlayScoreOutbox() {
  const items = read();
  let active: { code: string; id: string; accepted: number; send: Send } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0, inFlight = false, retryMs = 1000;
  const persist = () => {
    for (const [code, item] of Object.entries(items)) if (item.updatedAt <= Date.now() - TTL) delete items[code];
    const recent = Object.entries(items).filter(([, p]) => p.updatedAt > Date.now() - TTL).sort((a,b) => b[1].updatedAt-a[1].updatedAt);
    for (const [code] of recent.slice(5)) delete items[code];
    try { sessionStorage.setItem(KEY, JSON.stringify(items)); } catch { /* Storage blocked: retain in memory. */ }
  };
  const suspend = () => { generation++; active = undefined; inFlight = false; clearTimeout(timer); timer = undefined; };
  const pump = () => {
    if (!active || inFlight || timer) return;
    const connection = active, item = items[connection.code];
    if (!item?.pending || item.clientId !== connection.id) return;
    const sentVersion = item.version, epoch = generation;
    const score = Math.min(item.score, connection.accepted + QP_MAX_SCORE_DELTA);
    inFlight = true;
    let settled = false;
    const settle = (response?: Ack) => {
      if (settled || epoch !== generation) return;
      settled = true; inFlight = false; clearTimeout(timer); timer = undefined;
      if (response?.ok && Number.isFinite(response.score) && response.score! >= score) {
        connection.accepted = Math.max(connection.accepted, response.score!);
        const latest = items[connection.code];
        if (latest?.version === sentVersion && latest.score <= connection.accepted) latest.pending = false;
        persist(); retryMs = 1000;
        // Avoid recursive synchronous ACKs in tests and rate-limit catch-up.
        timer = setTimeout(() => { timer = undefined; pump(); }, 200);
      } else {
        timer = setTimeout(() => { timer = undefined; pump(); }, retryMs);
        retryMs = Math.min(10000, retryMs * 2);
      }
    };
    timer = setTimeout(() => settle(), 5000);
    try { connection.send({ sessionCode: connection.code, clientId: connection.id, score,
      ...(score === item.score ? item.extras : {}) }, settle); }
    catch { settle(); }
  };
  return {
    enqueue(code: string, id: string, score: number, extras: Extras = {}) {
      if (!Number.isFinite(score) || score < 0 || score > QP_MAX_SESSION_SCORE) return;
      const prev = items[code];
      if (prev?.clientId === id && prev.score > score) return;
      items[code] = { clientId: id, score, extras, pending: true, updatedAt: Date.now(), version: (prev?.version ?? 0) + 1 };
      persist(); pump();
    },
    confirm(code: string, id: string, accepted: number, send: Send) {
      if (active?.code === code && active.id === id) {
        active.accepted = Math.max(active.accepted, accepted); pump(); return;
      }
      suspend(); active = { code, id, accepted, send }; retryMs = 1000;
      const previous = items[code];
      if (!previous || previous.clientId !== id) {
        items[code] = { clientId: id, score: accepted, extras: {}, pending: false, updatedAt: Date.now(), version: 0 };
      } else if (previous.score < accepted) {
        previous.score = accepted; previous.pending = false; previous.updatedAt = Date.now();
      }
      persist(); pump();
    },
    cursor(code: string, id: string) { return items[code]?.clientId === id ? items[code].score : 0; },
    suspend,
    clear(code?: string) {
      if (!code || active?.code === code) suspend();
      if (code) delete items[code]; else for (const key of Object.keys(items)) delete items[key];
      persist();
    },
  };
}
