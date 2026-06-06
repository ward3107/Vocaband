import { useMemo } from "react";
import { buildChartPath } from "./constants";
import type { ClassroomChartPoint } from "./types";

interface ActivityChartProps {
  points: ClassroomChartPoint[];
  title: string;
  sub: string;
  height?: number;
}

const VBW = 700;
const VBH = 120;

/**
 * Average-score line chart with a soft violet gradient fill.
 * Catmull-Rom smoothed path + dots per data point + highlighted
 * "today" marker on the last point.  No date formatting — caller
 * passes pre-formatted labels.
 */
export default function ActivityChart({ points, title, sub, height = 160 }: ActivityChartProps) {
  const { line, area, coords } = useMemo(
    () => buildChartPath(points, VBW, VBH),
    [points],
  );

  return (
    <section
      className="rounded-[24px] border px-5 sm:px-6 py-5 sm:py-[22px]"
      style={{
        backgroundColor: "var(--vb-surface)",
        borderColor: "var(--vb-border)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
      }}
    >
      <header className="mb-1 flex items-center gap-2.5">
        <span className="text-[18px] text-[#3FA689]">📈</span>
        <h3
          className="m-0 text-[16px] sm:text-[17px] font-bold tracking-[-0.01em]"
          style={{ color: "var(--vb-text-primary)" }}
        >
          {title}
        </h3>
      </header>
      <p className="mb-[18px] text-[12px]" style={{ color: "var(--vb-text-secondary)" }}>{sub}</p>

      <div className="relative" style={{ height, padding: "14px 0 24px" }}>
        {/* Horizontal grid lines */}
        <div
          aria-hidden
          className="absolute inset-x-0"
          style={{
            top: 14,
            bottom: 24,
            background: [
              "linear-gradient(to bottom, transparent calc(25% - 1px), rgba(99,102,241,0.08) 25%, transparent calc(25% + 1px))",
              "linear-gradient(to bottom, transparent calc(50% - 1px), rgba(99,102,241,0.08) 50%, transparent calc(50% + 1px))",
              "linear-gradient(to bottom, transparent calc(75% - 1px), rgba(99,102,241,0.08) 75%, transparent calc(75% + 1px))",
            ].join(", "),
          }}
        />

        {/* Y-axis labels */}
        <div aria-hidden className="pointer-events-none absolute -start-0.5 text-[10px] font-semibold" style={{ top: 4, color: "var(--vb-text-muted)" }}>100%</div>
        <div aria-hidden className="pointer-events-none absolute -start-0.5 text-[10px] font-semibold" style={{ top: "33%", color: "var(--vb-text-muted)" }}>75%</div>
        <div aria-hidden className="pointer-events-none absolute -start-0.5 text-[10px] font-semibold" style={{ top: "64%", color: "var(--vb-text-muted)" }}>50%</div>
        <div aria-hidden className="pointer-events-none absolute -start-0.5 text-[10px] font-semibold" style={{ bottom: 28, color: "var(--vb-text-muted)" }}>25%</div>

        {/* Line */}
        <svg
          className="absolute inset-x-0 block h-[120px]"
          style={{ bottom: 24 }}
          viewBox={`0 0 ${VBW} ${VBH}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="vc-classroom-chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>

          {area && <path d={area} fill="url(#vc-classroom-chart-grad)" />}
          {line && (
            <path
              d={line}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {coords.slice(0, -1).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#8B5CF6" />
          ))}
          {coords.length > 0 && (
            <circle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r={5}
              fill="#fff"
              stroke="#8B5CF6"
              strokeWidth={2.5}
            />
          )}
        </svg>

        {/* X-axis labels */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] font-semibold" style={{ color: "var(--vb-text-muted)" }} aria-hidden>
          {points.map((p, i) => (
            <span key={i}>{p.label}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
