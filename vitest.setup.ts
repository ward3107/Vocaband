import { vi } from "vitest";

// canvas-confetti cannot run under jsdom: it grabs a 2D canvas context
// (getContext("2d") returns null in jsdom) and drives a requestAnimationFrame
// loop, so its next frame throws `TypeError: Cannot read properties of null
// (reading 'clearRect')` — ASYNCHRONOUSLY, after the test that mounted the
// component has already finished. Vitest reports that stray frame as an
// "unhandled error" and fails the whole run with exit 1 even though every
// test passed. It's a race (the fire-and-forget celebrate() in components like
// QuickPlayEndgameCard lazy-imports confetti, so whether the frame lands before
// teardown is timing-dependent), which is exactly why it flakes CI.
//
// No test asserts on confetti — it's purely a celebration side effect — so mock
// the module to a no-op everywhere. This makes the suite deterministic without
// touching production code or disabling any test.
vi.mock("canvas-confetti", () => {
  const noop = vi.fn(() => Promise.resolve());
  const confetti = Object.assign(noop, {
    // .create(canvas, opts) returns a bound confetti instance in the real lib.
    create: vi.fn(() => Object.assign(vi.fn(() => Promise.resolve()), { reset: vi.fn() })),
    reset: vi.fn(),
  });
  return { default: confetti };
});
