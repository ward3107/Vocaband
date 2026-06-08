// Vocabagrut shell — internal router for the feature.  App.tsx mounts a
// single instance of this; the shell decides what to render based on
// user.role and its own internal sub-view state.

import { useState, type ReactNode } from 'react';
import type { AppUser, ClassData, AssignmentData } from '../../core/supabase';
import type { BagrutTest } from './types';
import BagrutLandingView from './views/BagrutLandingView';
import BagrutEditorView from './views/BagrutEditorView';
import BagrutStudentView from './views/BagrutStudentView';

type SubView = 'landing' | 'editor';

interface Props {
  user: AppUser;
  classes: ClassData[];
  teacherAssignments: AssignmentData[];
  onExit: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  /** Activity-type tab strip rendered under the hero on the landing
   *  screen, so teachers can jump to the other creation tools.  Built
   *  by the section renderer; only shown on the landing (not the
   *  editor or student views). */
  activityTabs?: ReactNode;
}

export default function VocabagrutShell({ user, classes, teacherAssignments, onExit, showToast, activityTabs }: Props) {
  // All hooks first, above every early return — the teacher sub-view state.
  // The student early return below used to sit ABOVE these useState calls,
  // so a student render ran 0 hooks while a teacher render ran 4; any render
  // where role resolved differently on the same instance changed the hook
  // count → React #310. Students simply don't use this state.
  const [sub, setSub] = useState<SubView>('landing');
  const [test, setTest] = useState<BagrutTest | null>(null);
  const [sourceWords, setSourceWords] = useState<string[]>([]);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Students see the student view exclusively — no internal navigation
  // beyond list ↔ test which the student view handles itself.
  if (user.role === 'student') {
    return <BagrutStudentView user={user} onBack={onExit} showToast={showToast} />;
  }

  if (sub === 'landing' || !test) {
    return (
      <BagrutLandingView
        user={user}
        classes={classes}
        teacherAssignments={teacherAssignments}
        activityTabs={activityTabs}
        onBack={onExit}
        onGenerated={(t, words) => {
          setTest(t);
          setSourceWords(words);
          setExistingId(null);
          setSub('editor');
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <BagrutEditorView
      user={user}
      classes={classes}
      test={test}
      sourceWords={sourceWords}
      existingId={existingId}
      onBack={() => { setTest(null); setExistingId(null); setSub('landing'); }}
      showToast={showToast}
    />
  );
}
