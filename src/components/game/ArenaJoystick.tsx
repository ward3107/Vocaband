/**
 * ArenaJoystick — pointer-event thumbstick + WASD/arrow-key fallback for
 * Word Hunt Arena. Writes a normalized direction vector {dx, dy} (each
 * −1..1) into the caller's ref EVERY input change instead of calling
 * setState — the canvas's 60fps RAF loop reads the ref each frame, so
 * steering must never touch React's render path.
 */
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

export interface ArenaInputVector {
  dx: number;
  dy: number;
}

interface ArenaJoystickProps {
  /** Shared with ArenaCanvas — the RAF loop integrates this each frame. */
  inputRef: RefObject<ArenaInputVector>;
  /** Freeze input while the buzzer modal is open. */
  disabled?: boolean;
}

const BASE_SIZE = 128;   // px — thumb-friendly on small phones
const KNOB_SIZE = 56;
const MAX_TRAVEL = (BASE_SIZE - KNOB_SIZE) / 2;

export default function ArenaJoystick({ inputRef, disabled = false }: ArenaJoystickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activePointerRef = useRef<number | null>(null);
  // Keys currently held — combined into one vector so diagonal WASD works.
  const heldKeysRef = useRef<Set<string>>(new Set());

  const setVector = (dx: number, dy: number) => {
    inputRef.current.dx = dx;
    inputRef.current.dy = dy;
    // Knob follows the vector directly through the DOM — no re-render.
    if (knobRef.current) {
      knobRef.current.style.transform =
        `translate3d(${dx * MAX_TRAVEL}px, ${dy * MAX_TRAVEL}px, 0)`;
    }
  };

  // Release everything when the buzzer opens mid-drag, otherwise the
  // avatar keeps drifting under the modal with no way to stop it.
  useEffect(() => {
    if (disabled) {
      activePointerRef.current = null;
      heldKeysRef.current.clear();
      setVector(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setVector is stable per instance
  }, [disabled]);

  // WASD / arrow keys — desktop fallback (Chromebook classrooms).
  useEffect(() => {
    if (disabled) return;
    // Captured once so the cleanup clears the same Set instance the
    // listeners wrote to (the ref's identity is stable, but the linter
    // can't prove it).
    const heldKeys = heldKeysRef.current;
    const KEY_VECTORS: Record<string, [number, number]> = {
      w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0],
      arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0],
    };
    const applyKeys = () => {
      let dx = 0, dy = 0;
      for (const k of heldKeys) {
        const v = KEY_VECTORS[k];
        if (v) { dx += v[0]; dy += v[1]; }
      }
      const len = Math.hypot(dx, dy);
      setVector(len > 0 ? dx / len : 0, len > 0 ? dy / len : 0);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!(k in KEY_VECTORS)) return;
      e.preventDefault(); // arrows must steer, not scroll
      heldKeys.add(k);
      applyKeys();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!heldKeys.delete(k)) return;
      applyKeys();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      heldKeys.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setVector is stable per instance
  }, [disabled]);

  const vectorFromPointer = (e: ReactPointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = (e.clientX - cx) / MAX_TRAVEL;
    let dy = (e.clientY - cy) / MAX_TRAVEL;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    setVector(dx, dy);
  };

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="joystick"
      onPointerDown={(e) => {
        if (disabled || activePointerRef.current !== null) return;
        activePointerRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        vectorFromPointer(e);
      }}
      onPointerMove={(e) => {
        if (activePointerRef.current !== e.pointerId) return;
        vectorFromPointer(e);
      }}
      onPointerUp={(e) => {
        if (activePointerRef.current !== e.pointerId) return;
        activePointerRef.current = null;
        setVector(0, 0);
      }}
      onPointerCancel={(e) => {
        if (activePointerRef.current !== e.pointerId) return;
        activePointerRef.current = null;
        setVector(0, 0);
      }}
      // `end-5` (logical inset) keeps the stick under the RIGHT thumb in
      // LTR and the LEFT thumb in RTL without a dir check.
      className="absolute bottom-5 end-5 z-30 rounded-full bg-white/40 backdrop-blur-sm border-2 border-white/60 shadow-lg flex items-center justify-center select-none"
      style={{
        width: BASE_SIZE,
        height: BASE_SIZE,
        touchAction: "none", // the stick owns its touches — no scroll/zoom
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div
        ref={knobRef}
        className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/40 border-2 border-white/70 pointer-events-none"
        style={{ width: KNOB_SIZE, height: KNOB_SIZE, willChange: "transform" }}
      />
    </div>
  );
}
