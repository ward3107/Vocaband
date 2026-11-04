/** Dev-only visual preview of the real student mode picker. No account or network required. */
import { useState } from 'react';
import type { AssignmentData, ProgressData } from '../core/supabase';
import type { GameMode } from '../constants/game';
import { PET_MILESTONES } from '../constants/game';
import { LanguageProvider } from '../hooks/useLanguage';
import GameModeSelectionView from '../views/GameModeSelectionView';
import GameCoachTip from '../components/game/GameCoachTip';

const ALL_MODES: GameMode[] = [
  'flashcards', 'classic', 'fill-blank', 'matching', 'true-false',
  'listening', 'memory-flip', 'letter-sounds', 'reverse',
  'spelling', 'scramble', 'sentence-builder', 'speed-round',
];

const assignment = {
  id: 'adventure-preview',
  title: 'Unit 4 · Amazing animals',
  allowedModes: ALL_MODES,
} as unknown as AssignmentData;

const progress = [
  { assignmentId: assignment.id, mode: 'flashcards', score: 100 },
  { assignmentId: assignment.id, mode: 'classic', score: 95 },
  { assignmentId: assignment.id, mode: 'fill-blank', score: 72 },
] as ProgressData[];

export default function StudentAdventurePreview() {
  const [selected, setSelected] = useState<GameMode | null>(null);
  const [guest, setGuest] = useState(false);

  return (
    <LanguageProvider>
      <div data-preview-controls className="fixed bottom-3 right-3 z-50 flex gap-2 rounded-xl border border-white/20 bg-slate-950/90 p-2 text-xs font-bold text-white shadow-xl">
        <span className="self-center px-1">DESIGN PREVIEW · SAMPLE DATA</span>
        <button type="button" className="rounded-lg bg-white/15 px-3 py-2" onClick={() => setGuest(value => !value)}>
          {guest ? 'Assignment view' : 'Quick Play view'}
        </button>
      </div>
      {selected ? (
        <div className="min-h-screen bg-[#081B32] p-4 text-white">
          <button className="mb-6 min-h-11 rounded-xl border border-white/30 px-4 font-bold" type="button" onClick={() => setSelected(null)}>← Back to the trail</button>
          <div className="mx-auto max-w-lg rounded-3xl border border-white/15 bg-[#123953] p-6">
            <p className="text-sm font-bold text-amber-200">MODE LAUNCH PREVIEW</p>
            <h1 className="mb-4 text-3xl font-bold">{selected}</h1>
            <GameCoachTip key={selected} mode={selected} currentIndex={0} feedback={null} />
            <p className="mt-5 text-sm text-sky-100/80">The real game opens here in the student session. This preview shows the one-tap route and first-step tip.</p>
          </div>
        </div>
      ) : (
        <GameModeSelectionView
          activeAssignment={assignment}
          studentProgress={progress}
          isQuickPlayGuest={guest}
          quickPlayCompletedModes={new Set(['flashcards', 'classic'])}
          setGameMode={setSelected}
          setShowModeSelection={() => {}}
          setShowModeIntro={() => {}}
          onLaunchMode={setSelected}
          handleExitGame={() => {}}
          petDisplayName="Nova"
          petXp={430}
          petCurrentStage={PET_MILESTONES[1]}
          petNextStage={PET_MILESTONES[2]}
          petClaimableMilestone={null}
          onClaimPetMilestone={() => {}}
        />
      )}
    </LanguageProvider>
  );
}
