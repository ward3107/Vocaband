/**
 * Dev-only preview: mounts the teacher Live Challenge podium
 * (LiveChallengeView) against a fake leaderboard so the layout can be
 * inspected without a real socket connection or teacher login.
 *
 * Entry: http://localhost:5173/dev/live-podium
 *   add ?lang=he or ?lang=ar to preview the RTL layout.
 *
 * Gated behind `import.meta.env.DEV` in main.tsx — never ships to
 * production.
 */
import { LanguageProvider } from "../hooks/useLanguage";
import LiveChallengeView from "../views/LiveChallengeView";
import type { LeaderboardEntry } from "../core/types";
import type { ClassData } from "../core/supabase";

const mockClass = {
  name: "Grade 6 — Bluebirds",
  code: "SKY42",
  schoolName: "Herzliya Elementary",
} as ClassData;

// totalScore = baseScore + currentGameScore, so the podium sorts to
// Maya 500 / Daniel 450 / Noa 410, then the rest of the leaderboard.
// Lina is flagged as a guest to show the 🎭 mask treatment.
const mockLeaderboard: Record<string, LeaderboardEntry> = {
  u1: { name: "Maya", baseScore: 420, currentGameScore: 80, avatar: "🦄" },
  u2: { name: "Daniel", baseScore: 300, currentGameScore: 150, avatar: "🦊" },
  u3: { name: "Noa", baseScore: 380, currentGameScore: 30, avatar: "🐼" },
  u4: { name: "Yossi", baseScore: 250, currentGameScore: 100, avatar: "🐯" },
  u5: { name: "Lina", baseScore: 200, currentGameScore: 110, isGuest: true, avatar: "🐸" },
  u6: { name: "Omar", baseScore: 180, currentGameScore: 90, avatar: "🐬" },
  u7: { name: "Tamar", baseScore: 120, currentGameScore: 60, avatar: "🦁" },
};

export default function LivePodiumPreview() {
  return (
    <LanguageProvider>
      <LiveChallengeView
        selectedClass={mockClass}
        leaderboard={mockLeaderboard}
        socketConnected={true}
        setView={() => {}}
        setIsLiveChallenge={() => {}}
      />
    </LanguageProvider>
  );
}
