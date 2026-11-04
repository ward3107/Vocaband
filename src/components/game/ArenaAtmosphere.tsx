/** Tiny, decorative weather layer. It lives inside the shared world so the
 * teacher and students see the same map, but never intercepts a word tap. */
import type { QpArenaMapId } from "../../core/quickPlayProtocol";
import "./arenaAtmosphere.css";

type Weather = "sun" | "bubble" | "star" | "snow" | "ember" | "sand" | "sparkle";

const WEATHER_BY_MAP: Record<QpArenaMapId, Weather> = {
  islands: "sun",
  forest: "sun",
  frozen: "snow",
  volcano: "ember",
  space: "star",
  candy: "sparkle",
  underwater: "bubble",
  desert: "sand",
  jungle: "sun",
  kingdom: "sparkle",
  city: "sparkle",
};

// Fixed positions avoid random re-renders and keep the center mostly clear.
const MOTES = [
  [9, 16], [18, 74], [29, 32], [38, 84], [47, 12], [59, 69],
  [68, 23], [76, 87], [85, 47], [93, 14],
] as const;

export default function ArenaAtmosphere({ mapId }: { mapId: QpArenaMapId }) {
  const weather = WEATHER_BY_MAP[mapId];
  return (
    <div className={`arena-atmosphere arena-atmosphere--${weather}`} aria-hidden="true">
      {MOTES.map(([left, top], i) => (
        <span
          key={i}
          className="arena-atmosphere__mote"
          style={{ left: `${left}%`, top: `${top}%`, animationDelay: `-${i * 1.3}s` }}
        />
      ))}
    </div>
  );
}
