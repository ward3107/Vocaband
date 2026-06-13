/**
 * useGameKeyboard — Chromebook physical-keyboard shortcuts for the
 * student game modes (open-issues §F: "Schools love them. Add
 * 1/2/3/4 keyboard shortcuts for answer choices, Enter to continue,
 * Space to replay audio").
 *
 * One hook, several per-mode key maps selected by `mode`:
 *
 *   "choice"  — Classic / Listening / Reverse / Fill-blank
 *     1–4 (top row or numpad) → select the visible answer option
 *     Space                   → replay the prompt word's audio
 *     Enter                   → no-op (questions auto-advance after
 *                               feedback); flags keyboard presence so
 *                               the number hints appear.
 *
 *   "true-false"
 *     T / → (ArrowRight)      → answer True
 *     F / ← (ArrowLeft)       → answer False
 *     Enter                   → no-op (auto-advances on correct, clears
 *                               on wrong); flags keyboard presence.
 *
 *   "flashcards"
 *     Space / Enter           → flip the card front↔back
 *     → (ArrowRight)          → "Got It" (knew it)
 *     ← (ArrowLeft)           → "Still Learning"
 *
 * Touch is untouched by design: keydown events only ever come from a
 * hardware keyboard, and the returned `keyboardActive` flag stays false
 * until the first relevant keypress — callers use it to reveal the
 * on-control key hints only for students who actually have keys.
 */
import { useEffect, useRef, useState } from "react";

type GameKeyboardMode = "choice" | "true-false" | "flashcards";

interface UseGameKeyboardParams {
  /** Which key map to bind; pair with the not-finished / not-paused gate. */
  mode: GameKeyboardMode;
  /** Gate to the active mode + not finished + not paused. */
  enabled: boolean;
  /** ["choice"] Count of currently VISIBLE options (post-50/50 filter). */
  optionCount?: number;
  /** ["choice"] Select option by visible index (caller maps index → Word). */
  onSelect?: (index: number) => void;
  /** ["choice" + "flashcards"] Replay / speak the current word's audio. */
  onReplayAudio?: () => void;
  /** ["true-false"] Answer with the boolean judgement. */
  onTrueFalse?: (isTrue: boolean) => void;
  /** ["flashcards"] Flip the card front↔back. */
  onFlip?: () => void;
  /** ["flashcards"] Record the self-grade (true = knew it). */
  onFlashcardAnswer?: (knewIt: boolean) => void;
}

export function useGameKeyboard({
  mode,
  enabled,
  optionCount,
  onSelect,
  onReplayAudio,
  onTrueFalse,
  onFlip,
  onFlashcardAnswer,
}: UseGameKeyboardParams): boolean {
  const [keyboardActive, setKeyboardActive] = useState(false);

  // Latest values in a ref so the listener binds once per `enabled`/`mode`
  // instead of re-subscribing on every render of the game view. The
  // ref is written from an every-render effect (not render itself) to
  // satisfy react-hooks/refs.
  const latest = useRef({ optionCount, onSelect, onReplayAudio, onTrueFalse, onFlip, onFlashcardAnswer });
  useEffect(() => {
    latest.current = { optionCount, onSelect, onReplayAudio, onTrueFalse, onFlip, onFlashcardAnswer };
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      // Never steal keys from a focused text field (power-up hint
      // inputs, future chat, etc.).
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

      if (mode === "true-false") {
        // T/→ = true, F/← = false. KeyT/KeyF are layout-independent
        // (physical key), so a Hebrew layout still maps the same keys.
        if (e.code === "KeyT" || e.code === "ArrowRight") {
          e.preventDefault();
          setKeyboardActive(true);
          latest.current.onTrueFalse?.(true);
          return;
        }
        if (e.code === "KeyF" || e.code === "ArrowLeft") {
          e.preventDefault();
          setKeyboardActive(true);
          latest.current.onTrueFalse?.(false);
          return;
        }
        // Enter flags presence only — the round auto-advances on a
        // correct answer and clears on a wrong one, so there's no
        // manual "next" to fire.
        if (e.code === "Enter" || e.code === "NumpadEnter") {
          setKeyboardActive(true);
        }
        return;
      }

      if (mode === "flashcards") {
        // Space/Enter flip the card. preventDefault stops page scroll
        // (Space) and stops Enter/Space re-clicking whatever response
        // button still holds focus from the last tap.
        if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") {
          e.preventDefault();
          setKeyboardActive(true);
          latest.current.onFlip?.();
          return;
        }
        // → = Got It, ← = Still Learning (mirrors the on-screen
        // left=still-learning / right=got-it button order).
        if (e.code === "ArrowRight") {
          e.preventDefault();
          setKeyboardActive(true);
          latest.current.onFlashcardAnswer?.(true);
          return;
        }
        if (e.code === "ArrowLeft") {
          e.preventDefault();
          setKeyboardActive(true);
          latest.current.onFlashcardAnswer?.(false);
          return;
        }
        return;
      }

      // mode === "choice"
      const digit = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
      if (digit) {
        const index = Number(digit[1]) - 1;
        if (index < (latest.current.optionCount ?? 0)) {
          e.preventDefault();
          setKeyboardActive(true);
          latest.current.onSelect?.(index);
        }
        return;
      }
      if (e.code === "Space") {
        // preventDefault stops page scroll AND stops Space re-clicking
        // whatever answer button still holds focus from the last tap.
        e.preventDefault();
        setKeyboardActive(true);
        latest.current.onReplayAudio?.();
        return;
      }
      if (e.code === "Enter" || e.code === "NumpadEnter") {
        setKeyboardActive(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, mode]);

  return keyboardActive;
}
