/**
 * URL_ROUTING_PUSH — Slice 5 kill-switch for the "view → URL" push.
 *
 * Now ON by default: useBackButtonTrap attaches each view's canonical path
 * so in-app navigation updates the address bar and a refresh re-resolves to
 * the view (the "refresh keeps me where I was" fix). Set
 * VITE_URL_ROUTING_PUSH=false to kill the push instantly without a code
 * revert if a device regression appears.
 *
 * Build-time (statically replaced by Vite) so it's deterministic and adds no
 * async/runtime surface to the safety-critical back-button trap.
 *
 * ⚠️ The back-button trap is safety-critical and cannot be fully validated in
 * CI — re-run the real-device checklist (Android edge-swipe, iOS PWA) in
 * docs/slice-5-back-trap-plan.md §6 before releasing this default flip.
 */
export const URL_ROUTING_PUSH = import.meta.env.VITE_URL_ROUTING_PUSH !== 'false';
