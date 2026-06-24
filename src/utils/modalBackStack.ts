/**
 * modalBackStack — a tiny LIFO registry of open-modal close callbacks so
 * the hardware/browser BACK button can close the topmost modal instead of
 * navigating away, matching native-app behavior.
 *
 * Why a module singleton (not React state): the back-button trap
 * (`useBackButtonTrap`) attaches its popstate handler once with empty deps
 * and reads the latest state through refs/singletons. A plain module stack
 * is the simplest thing both the trap and every `ModalShell` instance can
 * share without prop-drilling through the whole tree.
 *
 * Only `ModalShell`-based modals register here (see ModalShell.tsx). The
 * three hand-rolled top-level modals (exit-confirm, consent, class-switch)
 * deliberately do NOT — the exit-confirm flow is owned end-to-end by the
 * trap's dashboard-floor logic, and stealing its back-press would break the
 * kid-safety double-back-to-exit.
 *
 * Entries are referenced by identity so a modal removes exactly its own
 * callback on unmount; pass the SAME function reference to push and remove.
 */
type CloseFn = () => void;

const stack: CloseFn[] = [];

export const modalBackStack = {
  /** Register an open modal's close handler. */
  push(close: CloseFn): void {
    stack.push(close);
  },
  /** Remove a previously-registered handler (by identity) on close/unmount. */
  remove(close: CloseFn): void {
    const i = stack.lastIndexOf(close);
    if (i >= 0) stack.splice(i, 1);
  },
  /** How many modals are currently open. */
  get size(): number {
    return stack.length;
  },
  /** Close the most-recently-opened modal. Returns true if one was closed. */
  closeTop(): boolean {
    const fn = stack.pop();
    if (!fn) return false;
    fn();
    return true;
  },
};
