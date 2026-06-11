/**
 * useGameKeyboard — Chromebook physical-keyboard shortcuts for the
 * multiple-choice modes (open-issues §F: "Schools love them. Add
 * 1/2/3/4 keyboard shortcuts for answer choices, Enter to continue,
 * Space to replay audio").
 *
 *   1–4 (top row or numpad) → select the visible answer option
 *   Space                   → replay the prompt word's audio
 *   Enter                   → no-op in multiple-choice (questions
 *                             auto-advance after feedback); it only
 *                             flags keyboard presence so the number
 *                             hints appear. The PauseOverlay handles
 *                             its own Enter via autoFocus.
 *
 * Touch is untouched by design: keydown events only ever come from a
 * hardware keyboard, and the returned `keyboardActive` flag stays false
 * until the first relevant keypress — callers use it to reveal the
 * on-button number hints only for students who actually have keys.
 */
import { useEffect, useRef, useState } from "react";

interface UseGameKeyboardParams {
  /** Gate to the multiple-choice modes + not finished + not paused. */
  enabled: boolean;
  /** Count of currently VISIBLE options (post-50/50-power-up filter). */
  optionCount: number;
  /** Select option by visible index (caller maps index → Word). */
  onSelect: (index: number) => void;
  /** Replay the current prompt word's audio. */
  onReplayAudio: () => void;
}

export function useGameKeyboard({
  enabled,
  optionCount,
  onSelect,
  onReplayAudio,
}: UseGameKeyboardParams): boolean {
  const [keyboardActive, setKeyboardActive] = useState(false);

  // Latest values in a ref so the listener binds once per `enabled`
  // instead of re-subscribing on every render of the game view. The
  // ref is written from an every-render effect (not render itself) to
  // satisfy react-hooks/refs.
  const latest = useRef({ optionCount, onSelect, onReplayAudio });
  useEffect(() => {
    latest.current = { optionCount, onSelect, onReplayAudio };
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      // Never steal keys from a focused text field (power-up hint
      // inputs, future chat, etc.).
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

      const digit = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
      if (digit) {
        const index = Number(digit[1]) - 1;
        if (index < latest.current.optionCount) {
          e.preventDefault();
          setKeyboardActive(true);
          latest.current.onSelect(index);
        }
        return;
      }
      if (e.code === "Space") {
        // preventDefault stops page scroll AND stops Space re-clicking
        // whatever answer button still holds focus from the last tap.
        e.preventDefault();
        setKeyboardActive(true);
        latest.current.onReplayAudio();
        return;
      }
      if (e.code === "Enter" || e.code === "NumpadEnter") {
        setKeyboardActive(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  return keyboardActive;
}
