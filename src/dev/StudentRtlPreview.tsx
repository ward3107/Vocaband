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
import { useState } from "react";
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

const FAKE_USER: AppUser = {
  uid: "preview-student",
  role: "student",
  displayName: "Dana",
  classCode: "ABCD12",
  avatar: "🦊",
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

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-8 mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-violet-700">
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 me-2 align-middle" />
    {children}
  </div>
);

export default function StudentRtlPreview() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-md mx-auto p-4 sm:p-5">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-3 text-xs font-bold text-amber-900">
            DEV preview — flip language via the globe in the top bar. Toggles EN → HE → AR.
          </div>

          <StudentTopBar />

          <SectionLabel>Greeting</SectionLabel>
          <StudentGreetingCard
            user={FAKE_USER}
            xp={FAKE_USER.xp ?? 0}
            streak={FAKE_USER.streak ?? 0}
            badges={[]}
            copiedCode={copiedCode}
            setCopiedCode={setCopiedCode}
            onShopClick={() => {}}
          />

          <SectionLabel>Stats</SectionLabel>
          <StudentStatsRow
            xp={FAKE_USER.xp ?? 0}
            streak={FAKE_USER.streak ?? 0}
            studentAssignments={FAKE_ASSIGNMENTS}
            studentProgress={FAKE_PROGRESS}
          />

          <SectionLabel>Daily goal</SectionLabel>
          <DailyGoalBanner studentProgress={FAKE_PROGRESS} goal={3} />

          <SectionLabel>Retention</SectionLabel>
          <RetentionStrip retention={FAKE_RETENTION} onGrantXp={() => {}} />

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

        {/* Floating bottom-end bubble — exercises PetCompanion's fixed
            positioning + dropdown alignment in RTL. */}
        <PetCompanion
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
