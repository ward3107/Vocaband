/**
 * Dev-only preview that mounts the REAL <ArenaCanvas> (the shipping
 * component — same SVG world map, follow-camera RAF loop and edge arrows)
 * with fabricated arena data, so the Word Hunt Arena map can be reviewed
 * visually without a teacher + student + socket backend.
 *
 * Entry: http://localhost:5174/dev/arena-map
 *
 * Wired from main.tsx behind `import.meta.env.DEV` so it can never be
 * reached in a production build. Left renders the student view (camera on,
 * phone-sized box); right renders the teacher projector (readOnly, whole
 * map). The data is static — the RAF loop still runs the camera + arrow
 * math, so what you see here is exactly what plays in the live arena.
 */
import { useRef } from "react";
import ArenaCanvas from "../components/game/ArenaCanvas";
import type {
  QpArenaStatePayload,
  QpArenaWordPublic,
  QpArenaPlayer,
  QpStudentEntry,
} from "../core/quickPlayProtocol";
import { QP_ARENA_WIDTH, QP_ARENA_HEIGHT } from "../core/quickPlayProtocol";

const SELF_ID = "me";

const WORDS: QpArenaWordPublic[] = [
  { wordId: "a", label: "mountain", pos: { x: 520, y: 350 }, state: "available" },
  { wordId: "b", label: "river", pos: { x: 300, y: 250 }, state: "available" },
  { wordId: "c", label: "forest", pos: { x: 650, y: 430 }, state: "available" },
  { wordId: "d", label: "ocean", pos: { x: 160, y: 540 }, state: "locked", lockedBy: "p3" },
  { wordId: "e", label: "island", pos: { x: 860, y: 150 }, state: "available" },
  { wordId: "f", label: "valley", pos: { x: 470, y: 130 }, state: "answered" },
];

const PLAYERS: (QpArenaPlayer & { score: number })[] = [
  { clientId: SELF_ID, nickname: "You", avatar: "🦊", x: 520, y: 350, score: 120 },
  { clientId: "p2", nickname: "Maya", avatar: "🐼", x: 600, y: 300, score: 90 },
  { clientId: "p3", nickname: "Omar", avatar: "🐯", x: 470, y: 420, score: 80 },
  { clientId: "p4", nickname: "Lia", avatar: "🐸", x: 300, y: 250, score: 60 },
  { clientId: "p5", nickname: "Dan", avatar: "🐧", x: 760, y: 545, score: 50 },
  { clientId: "p6", nickname: "Noa", avatar: "🦉", x: 200, y: 120, score: 40 },
];

const positions: QpArenaPlayer[] = PLAYERS.map(({ score: _s, ...p }) => p);

const leaderboard: QpStudentEntry[] = PLAYERS.map(p => ({
  clientId: p.clientId,
  nickname: p.nickname,
  avatar: p.avatar,
  score: p.score,
  lastSeen: Date.now(),
}));

const arena: QpArenaStatePayload = {
  sessionCode: "PREVIEW",
  width: QP_ARENA_WIDTH,
  height: QP_ARENA_HEIGHT,
  grabRadius: 60,
  roundSeconds: 12,
  words: WORDS,
  positions,
};

export default function ArenaMapPreview() {
  // The canvas reads live targets from this ref each frame; seeding self
  // here lets its RAF loop center the camera on us with no input.
  const positionsRef = useRef(
    new Map(PLAYERS.map(p => [p.clientId, { x: p.x, y: p.y }])),
  );
  const inputRef = useRef({ dx: 0, dy: 0 });
  const selfPosRef = useRef({ x: PLAYERS[0].x, y: PLAYERS[0].y });

  return (
    <div style={{ minHeight: "100vh", background: "#eef2ff", padding: 24, display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 900, color: "#3730a3", fontSize: 13, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8, textAlign: "center" }}>
          Student — follow camera (phone)
        </div>
        <div style={{ position: "relative", width: 300, height: 600 }}>
          <ArenaCanvas
            arena={arena}
            positionsRef={positionsRef}
            leaderboard={leaderboard}
            selfClientId={SELF_ID}
            inputRef={inputRef}
            selfPosRef={selfPosRef}
            onGrab={() => {}}
            fill
          />
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 900, color: "#3730a3", fontSize: 13, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8, textAlign: "center" }}>
          Teacher projector — whole map
        </div>
        <div style={{ width: 760 }}>
          <ArenaCanvas
            arena={arena}
            positionsRef={positionsRef}
            leaderboard={leaderboard}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
