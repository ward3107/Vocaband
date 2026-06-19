/**
 * ArenaDashButton — the rough-mode "Dash" control for Word Hunt Arena. A
 * thumb button on mobile (parked opposite the joystick) plus a desktop
 * Space-key fallback. Pressing it (when off cooldown) fires onDash; the
 * button then shows a sweeping cooldown ring until QP_ARENA_DASH_COOLDOWN_MS
 * elapses. Only mounted while rough mode is ON and the student is playing.
 *
 * Owns its own cooldown clock in a ref + a light 10/sec tick for the ring,
 * so a dash never touches the canvas's 60fps RAF path.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Wind } from "lucide-react";
import { QP_ARENA_DASH_COOLDOWN_MS } from "../../core/quickPlayProtocol";

interface ArenaDashButtonProps {
  /** Fired when a dash is allowed (off cooldown + not disabled). */
  onDash: () => void;
  /** Freeze the control while the buzzer modal is open. */
  disabled?: boolean;
  /** Park on the opposite side from the joystick. The joystick defaults to the
   *  right, so the dash defaults to the left; both honour the same handedness
   *  flip indirectly (the joystick owns the persisted side). */
  side?: "left" | "right";
  /** Localised "Dash" label. */
  label: string;
}

export default function ArenaDashButton({ onDash, disabled = false, side = "left", label }: ArenaDashButtonProps) {
  // Epoch ms the cooldown ends — a ref so the hot path reads it without a
  // re-render; `progress` is a light state purely for the ring sweep.
  const cooldownUntilRef = useRef(0);
  const [progress, setProgress] = useState(1); // 1 = ready, 0..1 = filling
  const [ready, setReady] = useState(true);

  const tryDash = useCallback(() => {
    if (disabled) return;
    if (Date.now() < cooldownUntilRef.current) return; // still cooling down
    cooldownUntilRef.current = Date.now() + QP_ARENA_DASH_COOLDOWN_MS;
    setReady(false);
    setProgress(0);
    onDash();
  }, [disabled, onDash]);

  // Desktop fallback — Space dashes (kept off the joystick's WASD keys).
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      e.preventDefault(); // Space would otherwise scroll the page
      tryDash();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, tryDash]);

  // Light cooldown ticker — only runs while cooling down, ~14/sec for a smooth
  // ring, then stops (no idle timer when the dash is ready).
  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => {
      const remaining = cooldownUntilRef.current - Date.now();
      if (remaining <= 0) {
        setReady(true);
        setProgress(1);
      } else {
        setProgress(1 - remaining / QP_ARENA_DASH_COOLDOWN_MS);
      }
    }, 70);
    return () => window.clearInterval(id);
  }, [ready]);

  const sideClass = side === "right" ? "right-5" : "left-5";
  // Conic-gradient ring fills as the cooldown elapses; full indigo when ready.
  const ring = ready
    ? "conic-gradient(#6366f1 360deg, #6366f1 360deg)"
    : `conic-gradient(#6366f1 ${Math.round(progress * 360)}deg, rgba(255,255,255,0.35) 0deg)`;

  return (
    <button
      type="button"
      onClick={tryDash}
      disabled={disabled}
      aria-label={label}
      aria-disabled={!ready}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", background: ring }}
      className={`absolute bottom-5 ${sideClass} z-30 w-20 h-20 rounded-full p-[3px] shadow-lg select-none active:scale-95 transition disabled:opacity-50`}
    >
      <span
        className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full font-black ${
          ready ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white" : "bg-white/85 text-stone-500"
        }`}
      >
        <Wind size={22} strokeWidth={2.5} />
        <span className="text-[10px] leading-none uppercase tracking-wide">{label}</span>
      </span>
    </button>
  );
}
