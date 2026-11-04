import { useEffect, useRef, type RefObject } from "react";
import type { QpArenaStatePayload } from "../../core/quickPlayProtocol";
import { arenaMapById } from "./arenaMaps";

/** A compact overview for the student follow-camera. Positions are public
 * Arena state; the teacher already sees the complete board. */
export default function ArenaMiniMap({
  arena, selfPosRef, zoom,
}: {
  arena: QpArenaStatePayload;
  selfPosRef: RefObject<{ x: number; y: number }>;
  zoom: number;
}) {
  const playerRef = useRef<HTMLSpanElement | null>(null);
  const viewportRef = useRef<HTMLSpanElement | null>(null);
  const map = arenaMapById(arena.mapId);
  const width = arena.width;
  const height = arena.height;

  useEffect(() => {
    const update = () => {
      const player = playerRef.current;
      const viewport = viewportRef.current;
      if (!player || !viewport || width <= 0 || height <= 0) return;
      const x = Math.max(0, Math.min(100, selfPosRef.current.x / width * 100));
      const y = Math.max(0, Math.min(100, selfPosRef.current.y / height * 100));
      const windowSize = 100 / Math.max(1, zoom);
      player.style.left = `${x}%`;
      player.style.top = `${y}%`;
      viewport.style.left = `${Math.max(0, Math.min(100 - windowSize, x - windowSize / 2))}%`;
      viewport.style.top = `${Math.max(0, Math.min(100 - windowSize, y - windowSize / 2))}%`;
    };
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [selfPosRef, width, height, zoom]);

  if (!map || width <= 0 || height <= 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-3 z-30 h-[88px] w-[116px] overflow-hidden rounded-2xl border-2 border-white/80 bg-slate-900 shadow-lg shadow-slate-950/40"
    >
      <img src={map.thumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
      <span className="absolute inset-0 bg-slate-950/15" />
      {arena.words.filter(word => word.state === "available").map(word => (
        <span
          key={word.wordId}
          className="absolute z-10 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,.85)]"
          style={{ left: `${word.pos.x / width * 100}%`, top: `${word.pos.y / height * 100}%` }}
        />
      ))}
      <span
        ref={viewportRef}
        className="absolute z-20 rounded-[3px] border border-white/90 bg-white/10"
        style={{ width: `${100 / Math.max(1, zoom)}%`, height: `${100 / Math.max(1, zoom)}%` }}
      />
      <span ref={playerRef} className="absolute z-30 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-fuchsia-500 shadow-[0_0_7px_2px_rgba(217,70,239,.8)]" />
    </div>
  );
}
