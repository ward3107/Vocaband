/**
 * TEMPORARY join-timing instrument (diagnostic only).
 *
 * joinMark(label) records the milliseconds since page navigation start
 * (performance.now() is already relative to page load, so no reset is
 * needed and marks survive across the async join flow). The Category
 * Race join screen replays the marks on-screen so we can see WHICH step
 * ate the time on a real device.
 *
 * REMOVE once the Category Race slowness is diagnosed: delete this file
 * and the joinMark() / overlay references that import it.
 */
const marks: Array<{ label: string; ms: number }> = [];

export function joinMark(label: string): void {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  marks.push({ label, ms: Math.round(now) });
}

export function getJoinMarks(): Array<{ label: string; ms: number }> {
  return marks.slice();
}
