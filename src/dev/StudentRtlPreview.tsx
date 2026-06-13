/**
 * Dev-only preview that mounts the student-dashboard widgets touched by
 * the 2026-05-24 RTL sweep with fake data, so the changes can be
 * verified visually in EN / HE / AR without a real student login.
 *
 * Entry: http://localhost:5174/dev/student-rtl-preview
 *
 * Wired from main.tsx behind `import.meta.env.DEV` so it can never be
 * reached in a production build.  Each widget here imports from the
 * same paths the live dashboard uses, so any class-name regression
 * (left/right vs start/end) shows up here too.
 */
import { useState, type ReactNode } from "react";
import { LanguageProvider } from "../hooks/useLanguage";
import type { AppUser, AssignmentData, ProgressData } from "../core/supabase";
import { PET_MILESTONES } from "../constants/game";

import StudentTopBar from "../components/dashboard/StudentTopBar";
import StudentGreetingCard from "../components/dashboard/StudentGreetingCard";
import StudentStatsRow from "../components/dashboard/StudentStatsRow";
import StudentAssignmentCard from "../components/dashboard/StudentAssignmentCard";
import DailyGoalBanner from "../components/dashboard/DailyGoalBanner";
import RetentionStrip from "../components/dashboard/RetentionStrip";
import PetEvolutionCard from "../components/dashboard/PetEvolutionCard";
import PetCompanion from "../components/dashboard/PetCompanion";
import StudentVisibilityConsent from "../components/StudentVisibilityConsent";
import NextUpCard from "../components/dashboard/NextUpCard";
import DailyPracticeRow from "../components/dashboard/DailyPracticeRow";
import { CLIENT_STORAGE_KEYS } from "../config/privacy-config";

const FAKE_USER: AppUser = {
  uid: "preview-student",
  role: "student",
  displayName: "Dana",
  classCode: "ABCD12",
  avatar: "🦊",
  coins: 0,
  xp: 1450,
  streak: 7,
};

const FAKE_ASSIGNMENTS: AssignmentData[] = [
  {
    id: "asg-1",
    classId: "class-1",
    wordIds: [1, 2, 3, 4, 5],
    title: "Unit 4 — Animals",
    allowedModes: ["classic", "listening", "spelling", "matching"],
    subject: "english",
  },
  {
    id: "asg-2",
    classId: "class-1",
    wordIds: [10, 11, 12],
    title: "Unit 5 — Daily routine",
    allowedModes: ["classic", "listening"],
    subject: "english",
  },
];

const FAKE_PROGRESS: ProgressData[] = [
  {
    id: "p1", studentName: "Dana", assignmentId: "asg-1", classCode: "ABCD12",
    score: 85, mode: "classic", completedAt: new Date().toISOString(),
  },
  {
    id: "p2", studentName: "Dana", assignmentId: "asg-1", classCode: "ABCD12",
    score: 92, mode: "listening", completedAt: new Date().toISOString(),
  },
];

const FAKE_RETENTION = {
  dailyChestAvailable: true,
  weeklyPlays: 3,
  weeklyChallengeClaimable: false,
  comebackAvailable: false,
  claimablePetMilestone: null,
  currentPetStage: PET_MILESTONES[2],
  nextPetStage: PET_MILESTONES[3],
  claimDailyChest: () => ({ xp: 40 }),
  claimWeeklyChallenge: () => null,
  claimComebackBonus: () => null,
  claimPetMilestone: () => {},
  recordPlay: () => {},
};

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div className="mt-8 mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-violet-700">
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 me-2 align-middle" />
    {children}
  </div>
);

export default function StudentRtlPreview() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // `?consent=force` clears the localStorage acceptance flag so the
  // student-visibility consent modal pops on every reload — useful for
  // demoing the modal without logging in as a brand-new student.
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("consent") === "force") {
      try {
        localStorage.removeItem(CLIENT_STORAGE_KEYS.studentVisibilityVersion);
      } catch { /* localStorage unavailable */ }
    }
  }

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-stone-50">
        {/* Student-visibility consent modal — hard gate that blocks the
            dashboard until the student ticks acknowledgement. */}
        <StudentVisibilityConsent studentUid={FAKE_USER.uid} />
        {/* Container intentionally stretches to full viewport so the
            Tailwind `sm:` breakpoint resolves against the *real* width
            the student would have.  An earlier `max-w-md` here trapped
            desktop layouts inside a mobile-width column at wide
            viewports, manufacturing fake overlaps that didn't exist
            on the real dashboard.  Resize your browser window to ≤
            640px to test mobile layouts properly. */}
        <div className="max-w-3xl mx-auto p-4 sm:p-5">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-3 text-xs font-bold text-amber-900">
            DEV preview — flip language via the globe. Add <code>?consent=force</code> to re-open the consent modal. Resize the browser to ≤640px to see the mobile layout.
          </div>

          <StudentTopBar />

          <SectionLabel>Greeting</SectionLabel>
          <StudentGreetingCard
            user={FAKE_USER}
            xp={FAKE_USER.xp ?? 0}
            coins={FAKE_USER.coins ?? 0}
            streak={FAKE_USER.streak ?? 0}
            badges={[]}
            copiedCode={copiedCode}
            setCopiedCode={setCopiedCode}
            onShopClick={() => {}}
          />

          <SectionLabel>Next up</SectionLabel>
          <NextUpCard
            studentAssignments={FAKE_ASSIGNMENTS}
            studentProgress={FAKE_PROGRESS}
            userUid={FAKE_USER.uid}
            setActiveAssignment={() => {}}
            setAssignmentWords={() => {}}
            setView={() => {}}
            setShowModeSelection={() => {}}
          />

          <SectionLabel>Stats</SectionLabel>
          <StudentStatsRow
            xp={FAKE_USER.xp ?? 0}
            streak={FAKE_USER.streak ?? 0}
            studentAssignments={FAKE_ASSIGNMENTS}
            studentProgress={FAKE_PROGRESS}
          />

          <SectionLabel>Daily goal (now tappable)</SectionLabel>
          <DailyGoalBanner
            studentProgress={FAKE_PROGRESS}
            goal={3}
            onPlay={() => alert('Banner tapped → would launch next assignment')}
          />

          <SectionLabel>Retention</SectionLabel>
          <RetentionStrip retention={FAKE_RETENTION} onGrantXp={() => {}} />

          <SectionLabel>Daily practice (collapsed trio)</SectionLabel>
          <DailyPracticeRow
            review={{ dueCount: 12, isLoading: false, onStart: () => {} }}
            classMinute={{ doneToday: false, streak: 4, isLoading: false, onStart: () => {} }}
            idioms={{ onStart: () => {} }}
          />

          <SectionLabel>Assignments</SectionLabel>
          <div className="space-y-3">
            {FAKE_ASSIGNMENTS.map((a, i) => (
              <StudentAssignmentCard
                key={a.id}
                assignment={a}
                assignmentIdx={i}
                studentProgress={FAKE_PROGRESS}
                userUid={FAKE_USER.uid}
                setActiveAssignment={() => {}}
                setAssignmentWords={() => {}}
                setView={() => {}}
                setShowModeSelection={() => {}}
              />
            ))}
          </div>

          <SectionLabel>Pet evolution</SectionLabel>
          <PetEvolutionCard
            state={{ activeDays: 5, lastActiveDate: new Date().toISOString(), daysSinceLastActive: 1 }}
            isLoading={false}
          />

          <div className="h-32" />
        </div>

        {/* Pet info card — exercises the centred popover + RTL alignment.
            Always open here so the preview shows the card. */}
        <PetCompanion
          open
          onClose={() => {}}
          xp={FAKE_USER.xp ?? 0}
          displayName={FAKE_USER.displayName}
          currentStage={PET_MILESTONES[2]}
          nextStage={PET_MILESTONES[3]}
          claimableMilestone={null}
          onClaim={() => {}}
        />
      </div>
    </LanguageProvider>
  );
}
