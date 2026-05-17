import type { MutableRefObject } from "react";
import type { Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "../core/types";
import type { AppUser } from "../core/supabase";

type QuickPlaySession = { sessionCode: string } | null;

type Params = {
  user: AppUser | null;
  socket: Socket | null;
  isFinished: boolean;
  quickPlayV2: boolean;
  quickPlayActiveSession: QuickPlaySession;
  qpCumulativeScoreRef: MutableRefObject<number>;
  lastScoreEmitRef: MutableRefObject<number>;
  quickPlaySocketUpdateScore: (score: number) => void;
};

/**
 * Throttled Socket.IO score emit. Routes to the right transport
 * depending on context:
 *   * classroom live challenge — existing `/` namespace, needs classCode
 *   * Quick Play v2 guest game — new `/quick-play` namespace, no auth
 */
export function buildEmitScoreUpdate(p: Params) {
  return (newScore: number) => {
    const now = Date.now();
    const shouldEmit = now - p.lastScoreEmitRef.current > 2000 || p.isFinished;
    if (!shouldEmit) return;
    p.lastScoreEmitRef.current = now;

    if (p.quickPlayV2 && p.quickPlayActiveSession) {
      // Add the per-mode score on top of the cumulative running total
      // for previously-completed modes in this session. Without this,
      // each new mode would emit a small per-mode value and the server
      // would reject it as a regress (new < previous max).
      const cumulative = p.qpCumulativeScoreRef.current + newScore;
      setTimeout(() => p.quickPlaySocketUpdateScore(cumulative), 0);
      // Refresh the localStorage resume hint with the latest score and
      // a fresh joinedAt timestamp so QuickPlayResumeBanner shows the
      // actual score earned, and the 90-minute TTL window extends for
      // as long as the student is actively scoring.
      try {
        const raw = localStorage.getItem("vocaband_qp_guest");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.lastScore = cumulative;
          parsed.joinedAt = Date.now();
          localStorage.setItem("vocaband_qp_guest", JSON.stringify(parsed));
        }
      } catch { /* localStorage blocked / private mode — silent */ }
      return;
    }

    if (!p.socket || !p.user?.classCode) return;
    setTimeout(() => {
      p.socket!.emit(SOCKET_EVENTS.UPDATE_SCORE, {
        classCode: p.user!.classCode,
        uid: p.user!.uid,
        score: newScore,
      });
    }, 0);
  };
}
