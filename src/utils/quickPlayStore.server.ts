import type { QpStudentEntry } from '../core/quickPlayProtocol';
import { QP_MAX_SCORE_DELTA, QP_MAX_SESSION_SCORE, QP_MAX_STUDENTS_PER_SESSION } from '../core/quickPlayProtocol';
import type { LiveScoreRedis } from './liveScoreStore';

/** Redis survives application-server restarts; its own persistence/availability
 * remains an infrastructure responsibility. Never fall back to RAM on outage. */
const TTL = 24 * 60 * 60;
export type StoredPlayer = QpStudentEntry & { owner: string; reportedScore: number; left?: boolean };
export type StoreResult = {
  status: 'ok' | 'session_inactive' | 'kicked' | 'session_full' | 'unauthorized' | 'invalid_payload';
  revision: number;
  entry?: StoredPlayer;
  students?: StoredPlayer[];
  closed?: boolean;
  teamMode?: boolean;
};
type Command = {
  op: 'join' | 'score' | 'award' | 'leave' | 'kick' | 'close' | 'snapshot' | 'teams' | 'team';
  id?: string; owner?: string; entry?: QpStudentEntry; score?: number;
  amount?: number; operationId?: string; extras?: Partial<QpStudentEntry>;
  enabled?: boolean; team?: 'red' | 'blue';
};

// All keys share one Redis Cluster hash tag. No read/modify/write operation
// is split across network round trips: capacity, revocation and scores race
// safely even when a teacher and a reconnect land on different machines.
const script = `
local c = cjson.decode(ARGV[1])
local now, ttl = tonumber(ARGV[2]), tonumber(ARGV[3])
local revision = tonumber(redis.call('HGET', KEYS[1], 'revision') or '0')
local closed = redis.call('HGET', KEYS[1], 'closed') == '1'
local teamMode = redis.call('HGET', KEYS[1], 'teams') == '1'
local function result(status, entry)
  return cjson.encode({status=status, revision=revision, entry=entry, teamMode=teamMode})
end
local function touch()
  revision = redis.call('HINCRBY', KEYS[1], 'revision', 1)
  for _,key in ipairs(KEYS) do redis.call('EXPIRE', key, ttl) end
end
local function snapshot(includeLeft)
  local values = redis.call('HVALS', KEYS[2])
  local students = {}
  for _,value in ipairs(values) do
    local player = cjson.decode(value)
    if includeLeft or not player.left then table.insert(students, player) end
  end
  return cjson.encode({status='ok', revision=revision, closed=closed, teamMode=teamMode, students=students})
end
if c.op == 'snapshot' then return snapshot(false) end
if c.op == 'close' then
  if not closed then redis.call('HSET', KEYS[1], 'closed', '1'); closed=true; touch() end
  return snapshot(true)
end
if closed then return result('session_inactive') end
if c.op == 'teams' then
  teamMode=c.enabled
  redis.call('HSET', KEYS[1], 'teams', teamMode and '1' or '0')
  local ids=redis.call('HKEYS', KEYS[2]); table.sort(ids)
  for i,id in ipairs(ids) do
    local p=cjson.decode(redis.call('HGET', KEYS[2], id))
    p.team=nil
    if teamMode then p.team=i%2 == 1 and 'red' or 'blue' end
    redis.call('HSET', KEYS[2], id, cjson.encode(p))
  end
  touch(); return snapshot(false)
end
local function counts(exclude)
  local red,blue=0,0
  for _,raw in ipairs(redis.call('HVALS', KEYS[2])) do
    local p=cjson.decode(raw)
    if p.clientId ~= exclude and not p.left then
      if p.team == 'red' then red=red+1 elseif p.team == 'blue' then blue=blue+1 end
    end
  end
  return red,blue
end
if c.op == 'kick' then
  redis.call('SADD', KEYS[3], c.id)
  redis.call('HDEL', KEYS[2], c.id)
  touch()
  return result('ok')
end
if redis.call('SISMEMBER', KEYS[3], c.id) == 1 then return result('kicked') end
local raw = redis.call('HGET', KEYS[2], c.id)
local p = raw and cjson.decode(raw) or nil
if c.op == 'join' then
  if not p then
    if redis.call('HLEN', KEYS[2]) >= tonumber(ARGV[4]) then return result('session_full') end
    p = c.entry; p.score=0; p.reportedScore=0
  end
  if (p.authUid or '') ~= (c.entry.authUid or '') then return result('unauthorized') end
  p.nickname=c.entry.nickname; p.avatar=c.entry.avatar; p.owner=c.owner; p.left=nil
  if teamMode and not p.team then
    local red,blue=counts(c.id); p.team=red<=blue and 'red' or 'blue'
  end
elseif not p or p.left then return result('unauthorized')
elseif c.op == 'team' then
  if p.owner ~= c.owner then return result('unauthorized') end
  if not teamMode then return result('invalid_payload') end
  local red,blue=counts(c.id)
  if c.team == 'red' then red=red+1 else blue=blue+1 end
  if math.abs(red-blue)>1 then return result('invalid_payload') end
  p.team=c.team
elseif c.op == 'score' or c.op == 'leave' then
  if p.owner ~= c.owner then return result('unauthorized') end
  if c.op == 'leave' then p.left=true
  else
    local previous = p.reportedScore or 0
    if c.score > previous + tonumber(ARGV[5]) then return result('invalid_payload') end
    local delta = math.max(0, c.score-previous)
    p.reportedScore = math.max(previous, c.score)
    p.score = math.min(tonumber(ARGV[6]), p.score+delta)
    if c.extras then
      if c.extras.streak then p.streak=c.extras.streak end
      if c.extras.roundProgress then p.roundProgress=c.extras.roundProgress end
      if c.extras.perfectRound ~= nil and c.score >= previous then
        p.perfectRound=c.extras.perfectRound
        if c.extras.perfectRound then p.perfectRoundScore=c.score end
      end
    end
  end
elseif c.op == 'award' then
  if redis.call('HEXISTS', KEYS[4], c.operationId) == 1 then return result('ok', p) end
  if redis.call('HLEN', KEYS[4]) >= 100000 then return redis.error_reply('award capacity reached') end
  redis.call('HSET', KEYS[4], c.operationId, '1')
  p.score=math.min(tonumber(ARGV[6]), p.score+c.amount)
end
p.lastSeen=now
redis.call('HSET', KEYS[2], c.id, cjson.encode(p))
touch()
return result('ok', p)
`;

type MemorySession = { players: Map<string, StoredPlayer>; kicked: Set<string>; operations: Set<string>; revision: number; closed: boolean; teamMode: boolean; expires: number };
export function createQuickPlayStore(redis?: LiveScoreRedis, now = Date.now) {
  const memory = new Map<string, MemorySession>();
  async function apply(code: string, command: Command): Promise<StoreResult> {
    if (redis) {
      const prefix = `qp-state:v1:{${code}}`;
      const raw = await redis.eval(script, {
        keys: ['meta', 'players', 'kicked', 'operations'].map(k => `${prefix}:${k}`),
        arguments: [JSON.stringify(command), String(now()), String(TTL), String(QP_MAX_STUDENTS_PER_SESSION), String(QP_MAX_SCORE_DELTA), String(QP_MAX_SESSION_SCORE)],
      });
      const result = JSON.parse(String(raw)) as StoreResult;
      // Lua encodes an empty table as {}; expose one consistent wire shape.
      if (result.students && !Array.isArray(result.students)) result.students = [];
      return result;
    }
    // Local development only; production with REDIS_URL never takes this path.
    for (const [key, s] of memory) if (s.expires <= now()) memory.delete(key);
    let s = memory.get(code);
    if (!s) {
      if (memory.size >= 10000) throw new Error('Quick Play capacity reached');
      s = { players: new Map(), kicked: new Set(), operations: new Set(), revision: 0, closed: false, teamMode: false, expires: now() + TTL * 1000 };
      memory.set(code, s);
    }
    const result = (status: StoreResult['status'], entry?: StoredPlayer): StoreResult => ({ status, revision: s.revision, teamMode: s.teamMode, ...(entry ? { entry: structuredClone(entry) } : {}) });
    const touch = () => { s.revision++; s.expires = now() + TTL * 1000; };
    if (command.op === 'close' || command.op === 'snapshot') {
      if (command.op === 'close' && !s.closed) { s.closed = true; touch(); }
      return { ...result('ok'), closed: s.closed, students: structuredClone([...s.players.values()].filter(p => command.op === 'close' || !p.left)) };
    }
    if (s.closed) return result('session_inactive');
    if (command.op === 'teams') {
      s.teamMode = command.enabled!;
      [...s.players.keys()].sort().forEach((id, i) => {
        const p = s.players.get(id)!;
        if (s.teamMode) p.team = i % 2 === 0 ? 'red' : 'blue'; else delete p.team;
      });
      touch(); return { ...result('ok'), students: structuredClone([...s.players.values()].filter(p => !p.left)) };
    }
    const id = command.id!;
    const counts = () => [...s.players.values()].filter(p => p.clientId !== id && !p.left).reduce((n, p) => {
      if (p.team) n[p.team]++; return n;
    }, { red: 0, blue: 0 });
    if (command.op === 'kick') { s.kicked.add(id); s.players.delete(id); touch(); return result('ok'); }
    if (s.kicked.has(id)) return result('kicked');
    let p = s.players.get(id);
    if (command.op === 'join') {
      if (!p && s.players.size >= QP_MAX_STUDENTS_PER_SESSION) return result('session_full');
      p ??= { ...command.entry!, score: 0, reportedScore: 0, owner: command.owner! };
      if ((p.authUid ?? '') !== (command.entry!.authUid ?? '')) return result('unauthorized');
      Object.assign(p, { nickname: command.entry!.nickname, avatar: command.entry!.avatar, owner: command.owner });
      delete p.left;
      if (s.teamMode && !p.team) { const n = counts(); p.team = n.red <= n.blue ? 'red' : 'blue'; }
    } else if (!p || p.left) return result('unauthorized');
    else if (command.op === 'team') {
      if (p.owner !== command.owner) return result('unauthorized');
      if (!s.teamMode) return result('invalid_payload');
      const n = counts(); n[command.team!]++;
      if (Math.abs(n.red - n.blue) > 1) return result('invalid_payload');
      p.team = command.team;
    }
    else if (command.op === 'score' || command.op === 'leave') {
      if (p.owner !== command.owner) return result('unauthorized');
      if (command.op === 'leave') p.left = true;
      else {
        if (command.score! > p.reportedScore + QP_MAX_SCORE_DELTA) return result('invalid_payload');
        p.score = Math.min(QP_MAX_SESSION_SCORE, p.score + Math.max(0, command.score! - p.reportedScore));
        p.reportedScore = Math.max(p.reportedScore, command.score!);
        if (command.score! >= p.reportedScore) {
          Object.assign(p, command.extras);
          if (command.extras?.perfectRound) p.perfectRoundScore = command.score;
        }
      }
    } else if (command.op === 'award') {
      if (s.operations.has(command.operationId!)) return result('ok', p);
      if (s.operations.size >= 100000) throw new Error('Quick Play award capacity reached');
      s.operations.add(command.operationId!);
      p.score = Math.min(QP_MAX_SESSION_SCORE, p.score + command.amount!);
    }
    p.lastSeen = now(); s.players.set(id, p); touch(); return result('ok', p);
  }
  return {
    join: (code: string, entry: QpStudentEntry, owner: string) => apply(code, { op: 'join', id: entry.clientId, entry, owner }),
    score: (code: string, id: string, owner: string, score: number, extras: Partial<QpStudentEntry> = {}) => {
      if (!Number.isFinite(score) || score < 0 || score > QP_MAX_SESSION_SCORE) throw new Error('Invalid score');
      return apply(code, { op: 'score', id, owner, score, extras });
    },
    award: (code: string, id: string, amount: number, operationId: string) => {
      if (!Number.isFinite(amount) || amount < 0 || amount > QP_MAX_SESSION_SCORE || typeof operationId !== 'string' || !operationId || operationId.length > 200) throw new Error('Invalid award');
      return apply(code, { op: 'award', id, amount, operationId: `${id}:${operationId}` });
    },
    teams: (code: string, enabled: boolean) => apply(code, { op: 'teams', enabled }),
    team: (code: string, id: string, owner: string, team: 'red' | 'blue') => apply(code, { op: 'team', id, owner, team }),
    leave: (code: string, id: string, owner: string) => apply(code, { op: 'leave', id, owner }),
    kick: (code: string, id: string) => apply(code, { op: 'kick', id }),
    close: (code: string) => apply(code, { op: 'close' }),
    snapshot: (code: string) => apply(code, { op: 'snapshot' }),
  };
}
