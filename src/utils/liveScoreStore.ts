// Keep authoritative live scores separate from connected-player presence.
// A completed-progress baseline starts a new score namespace; idle records expire.
const TTL_SECONDS = 15 * 60;
const LIMIT = 10000;
const MAX_INCREMENT = 10;
const script = `
local score = redis.call('GET', KEYS[1])
if ARGV[1] == 'join' then
  if not score then score = '0' end
  redis.call('SET', KEYS[1], score, 'EX', ARGV[3])
  return score
end
if not score then return -1 end
local next = tonumber(ARGV[2])
if next < tonumber(score) or next > tonumber(score) + 10 then return -1 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return ARGV[2]
`;

export type LiveScoreRedis = {
  eval: (script: string, options: { keys: string[]; arguments: string[] }) => Promise<unknown>;
};

export function createLiveScoreStore(redis?: LiveScoreRedis, now = Date.now) {
  const memory = new Map<string, { score: number; expires: number }>();
  const keyFor = (classCode: string, uid: string, baseScore: number) =>
    `live-score:v1:${encodeURIComponent(classCode)}:${encodeURIComponent(uid)}:${baseScore}`;
  async function apply(classCode: string, uid: string, baseScore: number, next?: number) {
    if (!Number.isFinite(baseScore) || baseScore < 0) throw new Error('Invalid score baseline');
    if (next !== undefined && (!Number.isFinite(next) || next < 0 || next > LIMIT)) return null;
    const key = keyFor(classCode, uid, baseScore);
    if (redis) {
      const result = Number(await redis.eval(script, {
        keys: [key], arguments: [next === undefined ? 'join' : 'update', String(next ?? 0), String(TTL_SECONDS)],
      }));
      if (!Number.isFinite(result)) throw new Error('Invalid score-store response');
      return result < 0 ? null : result;
    }
    const timestamp = now();
    const record = memory.get(key);
    const current = record && record.expires > timestamp ? record : undefined;
    if (next !== undefined && (!current || next < current.score || next > current.score + MAX_INCREMENT)) return null;
    if (!memory.has(key) && memory.size >= LIMIT) {
      for (const [id, value] of memory) if (value.expires <= timestamp) memory.delete(id);
      if (memory.size >= LIMIT) throw new Error('Live score capacity reached');
    }
    const score = next ?? current?.score ?? 0;
    memory.set(key, { score, expires: timestamp + TTL_SECONDS * 1000 });
    return score;
  }
  return {
    join: (classCode: string, uid: string, baseScore: number) => apply(classCode, uid, baseScore),
    update: (classCode: string, uid: string, baseScore: number, score: number) => apply(classCode, uid, baseScore, score),
  };
}
