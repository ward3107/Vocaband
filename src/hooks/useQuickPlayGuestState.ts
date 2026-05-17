import { useState, useRef } from "react";
import { readQpResumeScore } from "../utils/qpResumeHint";
import { secureRandomInt } from "../utils";

const QUICK_PLAY_AVATARS = [
  "🦊", "🐸", "🦁", "🐼", "🐨", "🦋", "🐙", "🦄",
  "🐳", "🐰", "🦈", "🐯", "🦉", "🐺", "🦜", "🐹",
];

const QP_GUEST_RESUME_WINDOW_MS = 90 * 60 * 1000;

const initialAvatar = (): string => {
  try {
    const raw = localStorage.getItem("vocaband_qp_guest");
    if (raw) {
      const parsed = JSON.parse(raw) as { avatar?: string; joinedAt?: number };
      if (parsed?.avatar && typeof parsed.joinedAt === "number"
          && Date.now() - parsed.joinedAt < QP_GUEST_RESUME_WINDOW_MS) {
        return parsed.avatar;
      }
    }
  } catch { /* fall through to random */ }
  return QUICK_PLAY_AVATARS[secureRandomInt(QUICK_PLAY_AVATARS.length)];
};

/**
 * Guest-side Quick Play state — the bits that a student running through
 * a QP session owns (identity, kicked/ended flags, completed modes,
 * cumulative score ref). The teacher monitor's joinedStudents +
 * realtimeStatus stay in App.tsx since they belong to a different
 * subsystem (teacher monitor, not guest).
 *
 * `qpCumulativeScoreRef` is initialised from the resume hint so a kid
 * who closed the tab and rescanned doesn't reset their server-side
 * score (the server's monotonic score gate would otherwise reject every
 * later updateScore as a regression — silent points loss for the kid).
 */
export function useQuickPlayGuestState() {
  const qpCumulativeScoreRef = useRef(readQpResumeScore());
  const [quickPlayStudentName, setQuickPlayStudentName] = useState("");
  const [quickPlayAvatar, setQuickPlayAvatar] = useState(initialAvatar);
  const [quickPlayKicked, setQuickPlayKicked] = useState(false);
  const [quickPlaySessionEnded, setQuickPlaySessionEnded] = useState(false);
  const [quickPlayCompletedModes, setQuickPlayCompletedModes] = useState<Set<string>>(new Set());

  return {
    qpCumulativeScoreRef,
    quickPlayStudentName, setQuickPlayStudentName,
    quickPlayAvatar, setQuickPlayAvatar,
    quickPlayKicked, setQuickPlayKicked,
    quickPlaySessionEnded, setQuickPlaySessionEnded,
    quickPlayCompletedModes, setQuickPlayCompletedModes,
  };
}
