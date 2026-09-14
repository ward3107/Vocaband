/** Keep polling until every watched class is connected. Classes outside the
 * subscription cap always need polling; a healthy sibling cannot cover them. */
export function createDashboardFallback(
  codes: string[],
  refresh: () => void,
  intervalMs: number,
  cap = 5,
) {
  const watched = codes.slice(0, cap);
  const connected = new Set<string>();
  let disposed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const reconcile = () => {
    const needsPolling = codes.length > watched.length || connected.size < watched.length;
    if (needsPolling && timer === null) {
      timer = setInterval(() => { if (!document.hidden) refresh(); }, intervalMs);
    } else if (!needsPolling && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
  reconcile();
  return {
    status(code: string, status: string) {
      if (disposed || !watched.includes(code)) return;
      if (status === 'SUBSCRIBED') connected.add(code);
      else connected.delete(code);
      reconcile();
    },
    dispose() {
      disposed = true;
      if (timer !== null) clearInterval(timer);
      timer = null;
    },
  };
}
