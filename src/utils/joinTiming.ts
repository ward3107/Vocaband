/**
 * TEMPORARY join-timing instrument (diagnostic only).
 * performance.now() is relative to page load, so marks need no reset.
 * REMOVE once the Category Race join slowness is diagnosed.
 */
const marks: Array<{ label: string; ms: number }> = [];

export function joinMark(label: string): void {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  marks.push({ label, ms: Math.round(now) });
}

/** Build the human-readable breakdown (gap per step, total). */
export function joinTimingReport(): string {
  if (marks.length === 0) return "(no marks)";
  const total = marks[marks.length - 1].ms - marks[0].ms;
  // The FIRST mark's absolute ms = time since the page started loading, i.e.
  // how long the app spent downloading + parsing + mounting BEFORE our join
  // code ran. On a fresh mobile QR scan (empty cache) this is the dominant
  // cost, dwarfing the join logic below it.
  const appLoad = marks[0].ms;
  const lines = marks.map((m, i) => {
    const step = i > 0 ? m.ms - marks[i - 1].ms : 0;
    return `${step >= 800 ? "!! " : ""}${m.label}: +${step}ms`;
  });
  return (
    `APP LOAD before join: ${Math.round(appLoad)}ms` +
    (appLoad >= 2000 ? "  <- the wait is HERE" : "") +
    `\n\nJOIN TIMING — total ${total}ms\n\n${lines.join("\n")}`
  );
}
