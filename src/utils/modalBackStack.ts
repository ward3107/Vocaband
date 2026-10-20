/**
 * modalBackStack — a registry of visible layers so
 * the hardware/browser BACK button can close the topmost modal instead of
 * navigating away, matching native-app behavior.
 *
 * Why a module singleton (not React state): the back-button trap
 * (`useBackButtonTrap`) attaches its popstate handler once with empty deps
 * and reads the latest state through refs/singletons. A plain module stack
 * is the simplest thing both the trap and every `ModalShell` instance can
 * share without prop-drilling through the whole tree.
 *
 * Dialogs use their z-index as priority; inline form steps use lower
 * priorities. This makes the visually topmost layer win even when React
 * mounts a child effect before its parent. Exit-confirm remains owned by
 * the dashboard-floor logic.
 *
 * Entries are referenced by identity so a modal removes exactly its own
 * callback on unmount; pass the SAME function reference to push and remove.
 */
type CloseFn = () => void | false;

const stack: Array<{ close: CloseFn; priority: number }> = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

function topIndex(): number {
  let top = -1;
  for (let i = 0; i < stack.length; i++) {
    if (top < 0 || stack[i].priority >= stack[top].priority) top = i;
  }
  return top;
}

export const modalBackStack = {
  /** Register an open modal's close handler. */
  push(close: CloseFn, priority = 50): void {
    stack.push({ close, priority });
    notify();
  },
  /** Remove a previously-registered handler (by identity) on close/unmount. */
  remove(close: CloseFn): void {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].close === close) {
        stack.splice(i, 1);
        notify();
        break;
      }
    }
  },
  /** How many modals are currently open. */
  get size(): number {
    return stack.length;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  isTop(close: CloseFn): boolean {
    return stack[topIndex()]?.close === close;
  },
  /** Consume Back on the top layer; false from a busy layer keeps it open. */
  closeTop(): boolean {
    const entry = stack[topIndex()];
    if (!entry) return false;
    // React owns visibility. Cleanup removes this entry when the layer
    // actually closes; no-op consent gates and pending forms stay on top.
    entry.close();
    return true;
  },
};
