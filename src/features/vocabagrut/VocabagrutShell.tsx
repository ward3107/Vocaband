// Vocabagrut shell — internal router for the feature.  App.tsx mounts a
// single instance of this; the shell decides what to render based on
// user.role and its own internal sub-view state.

import { useState } from 'react';
import type { AppUser, ClassData, AssignmentData } from '../../core/supabase';
import type { BagrutTest } from './types';
import BagrutLandingView from './views/BagrutLandingView';
import BagrutEditorView from './views/BagrutEditorView';
import BagrutStudentView from './views/BagrutStudentView';

type SubView = 'landing' | 'editor' | 'preview';

interface Props {
  user: AppUser;
  classes: ClassData[];
  teacherAssignments: AssignmentData[];
  onExit: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function VocabagrutShell({ user, classes, teacherAssignments, onExit, showToast }: Props) {
  // Students see the student view exclusively — no internal navigation
  // beyond list ↔ test which the student view handles itself.
  if (user.role === 'student') {
    return <BagrutStudentView user={user} onBack={onExit} showToast={showToast} />;
  }

  const [sub, setSub] = useState<SubView>('landing');
  const [test, setTest] = useState<BagrutTest | null>(null);
  const [sourceWords, setSourceWords] = useState<string[]>([]);
  const [existingId, setExistingId] = useState<string | null>(null);

  if (sub === 'landing' || !test) {
    return (
      <BagrutLandingView
        user={user}
        classes={classes}
        teacherAssignments={teacherAssignments}
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
      onPreview={() => { /* future: dedicated preview view; v1 uses PDF export */ }}
      showToast={showToast}
    />
  );
}
