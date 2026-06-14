/**
 * URL_ROUTING_PUSH — Slice 5 kill-switch for the "view → URL" push.
 *
 * When OFF (default), useBackButtonTrap pushes history WITHOUT a URL, exactly
 * as it always has — so production behavior is unchanged and this can ship
 * dark. When ON, the trap attaches each view's canonical path so in-app
 * navigation updates the address bar and a refresh re-resolves to the view.
 *
 * Build-time (statically replaced by Vite) so it's deterministic and adds no
 * async/runtime surface to the safety-critical back-button trap. The
 * authenticated e2e build (playwright.auth.config.ts) sets it ON to exercise
 * the push; prod leaves it unset until the mandatory real-device back-button
 * QA passes (Android edge-swipe, iOS PWA — see docs/slice-5-back-trap-plan.md).
 * Once stable on devices, flip the default / drop the flag in a follow-up.
 */
export const URL_ROUTING_PUSH = import.meta.env.VITE_URL_ROUTING_PUSH === 'true';
