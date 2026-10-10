import { randomUUID } from 'node:crypto';
import type { LiveScoreRedis } from './liveScoreStore';
import type { createQuickPlayStore, StoredPlayer } from './quickPlayStore.server';

export type FinalizationJob = { code: string; sessionId: string; teacherUid: string; endedAt: string };
type Pending = FinalizationJob & { attempts: number; lockedUntil: number; nextAt: number; token?: string };
const keys = ['qp-finalization:{v1}:jobs', 'qp-finalization:{v1}:due'];
const script = `
local op, id, now = ARGV[1], ARGV[2], tonumber(ARGV[3])
if op == 'due' then return cjson.encode(redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', now, 'LIMIT', 0, 20)) end
local raw=redis.call('HGET', KEYS[1], id)
local job=raw and cjson.decode(raw) or nil
if op == 'put' then
  if not job then redis.call('HSET', KEYS[1], id, ARGV[4]); redis.call('ZADD', KEYS[2], now, id) end
  return 'true'
end
if op == 'get' then return raw or 'null' end
if not job then return 'null' end
if op == 'claim' then
  if job.lockedUntil > now or (ARGV[5] ~= '1' and job.nextAt > now) then return 'null' end
  job.token=ARGV[4]; job.lockedUntil=now+30000; job.attempts=job.attempts+1
  redis.call('HSET', KEYS[1], id, cjson.encode(job)); redis.call('ZADD', KEYS[2], job.lockedUntil, id)
  return cjson.encode(job)
end
if job.token ~= ARGV[4] then return 'false' end
if op == 'complete' then redis.call('HDEL', KEYS[1], id); redis.call('ZREM', KEYS[2], id); return 'true' end
if op == 'retry' then
  job.lockedUntil=0; job.nextAt=now+math.min(60000, 2000*2^math.min(job.attempts-1,5))
  redis.call('HSET', KEYS[1], id, cjson.encode(job)); redis.call('ZADD', KEYS[2], job.nextAt, id)
end
return 'true'
`;

/** The intent is durable BEFORE freezing the scores. Jobs and frozen scores
 * have no expiry while pending. A worker crash merely releases its claim after
 * 30s; persistence must be idempotent because a DB reply can be lost. */
export function createQuickPlayFinalizer(options: {
  redis?: LiveScoreRedis;
  store: ReturnType<typeof createQuickPlayStore>;
  persist: (job: FinalizationJob, players: StoredPlayer[]) => Promise<void>;
  closed: (code: string) => void;
  warn: (message: string) => void;
}) {
  const memory = new Map<string, Pending>();
  async function command(op: string, id = '', value = '', force = false): Promise<unknown> {
    const now = Date.now();
    if (options.redis) return JSON.parse(String(await options.redis.eval(script, {
      keys, arguments: [op, id, String(now), value, force ? '1' : '0'],
    })));
    const job = memory.get(id);
    if (op === 'due') return [...memory].filter(([, j]) => Math.max(j.nextAt, j.lockedUntil) <= now).slice(0, 20).map(([key]) => key);
    if (op === 'put') { if (!job) memory.set(id, JSON.parse(value) as Pending); return true; }
    if (op === 'get') return job;
    if (!job) return null;
    if (op === 'claim') {
      if (job.lockedUntil > now || (!force && job.nextAt > now)) return null;
      job.token = value; job.lockedUntil = now + 30000; job.attempts++;
      return structuredClone(job);
    }
    if (job.token !== value) return false;
    if (op === 'complete') memory.delete(id);
    if (op === 'retry') { job.lockedUntil = 0; job.nextAt = now + Math.min(60000, 2000 * 2 ** Math.min(job.attempts - 1, 5)); }
    return true;
  }
  async function perform(id: string, force = false) {
    const job = await command('claim', id, randomUUID(), force) as Pending | null;
    if (!job) return;
    try {
      const snapshot = await options.store.close(job.code, true);
      options.closed(job.code);
      await options.persist(job, snapshot.students ?? []);
      // Remove the retention pin before acknowledging completion. A crash in
      // between is safe: the still-pending job pins the snapshot on its retry.
      await options.store.finalized(job.code);
      await command('complete', id, job.token);
    } catch (error) {
      await command('retry', id, job.token);
      throw error;
    }
  }
  let ticking = false;
  const timer = setInterval(() => {
    if (ticking) return;
    ticking = true;
    void command('due').then(async result => {
      for (const id of Array.isArray(result) ? result : []) {
        try { await perform(String(id)); } catch (error) { options.warn(String(error)); }
      }
    }).catch(error => options.warn(String(error))).finally(() => { ticking = false; });
  }, 1000);
  timer.unref();
  return {
    async request(job: FinalizationJob) {
      const id = `${job.code}:${job.sessionId}`;
      await command('put', id, JSON.stringify({ ...job, attempts: 0, lockedUntil: 0, nextAt: Date.now() }));
      await perform(id, true);
      // Another machine may already own the claim. Success means its DB work
      // finished, never merely that the request was accepted into the queue.
      const deadline = Date.now() + 12000;
      while (await command('get', id)) {
        if (Date.now() >= deadline) throw new Error('Quick Play finalization pending; background retry retained');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    },
    stop: () => clearInterval(timer),
  };
}
