/**
 * Dependency-free SVG chart primitives for the admin command center.
 * Kept tiny + inline (no recharts) so they're crisp inside dense KPI cells and
 * panel headers. Colour comes from the parent's `text-*` via `currentColor`.
 */

/** Line / area sparkline. Scales horizontally to its container (viewBox + a
 *  non-scaling stroke), so callers just set a width class and a pixel height. */
export function Sparkline({
  data, height = 28, area = true, className = "",
}: {
  data: number[];
  height?: number;
  area?: boolean;
  className?: string;
}) {
  const clean = (data ?? []).filter((n) => Number.isFinite(n));
  if (clean.length < 2) {
    return <svg height={height} className={className} style={{ width: "100%" }} aria-hidden />;
  }
  const VBW = 100;
  const max = Math.max(...clean);
  const min = Math.min(...clean);
  const range = max - min || 1;
  const dx = VBW / (clean.length - 1);
  const pts = clean.map((v, i) => {
    const x = i * dx;
    const y = height - 1 - ((v - min) / range) * (height - 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${line} L${VBW},${height} L0,${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${VBW} ${height}`}
      height={height}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%" }}
      aria-hidden
    >
      {area && <path d={areaPath} fill="currentColor" opacity={0.15} />}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Vertical mini bar chart. Each bar carries an optional title for hover. */
export function MiniBars({
  data, height = 40, className = "", highlightLast = false,
}: {
  data: { label?: string; value: number }[];
  height?: number;
  className?: string;
  highlightLast?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={`flex items-end gap-[3px] ${className}`} style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          title={d.label ? `${d.label}: ${d.value}` : String(d.value)}
          className="flex-1 rounded-t"
          style={{
            height: `${Math.max((d.value / max) * 100, 2)}%`,
            backgroundColor: "currentColor",
            opacity: highlightLast && i === data.length - 1 ? 1 : 0.55,
          }}
        />
      ))}
    </div>
  );
}
