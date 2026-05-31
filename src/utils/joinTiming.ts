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
  const lines = marks.map((m, i) => {
    const step = i > 0 ? m.ms - marks[i - 1].ms : 0;
    return `${step >= 800 ? "!! " : ""}${m.label}: +${step}ms`;
  });
  return `JOIN TIMING — total ${total}ms\n\n${lines.join("\n")}`;
}
