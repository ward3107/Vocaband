/**
 * Onboarding-wizard completion handler — pulled out of App.tsx's
 * teacher dashboard render branch so the orchestration (class insert
 * → optimistic local state → starter assignment → mark onboarded)
 * stays out of JSX.
 *
 * Returns the new class code on success so the wizard can render its
 * success step; returns null on any failure (the user has already
 * been shown a toast).
 */
import type React from 'react';
import { supabase, type AppUser, type ClassData } from '../core/supabase';
import { getCachedVocabulary } from '../hooks/useVocabularyLazy';
import type { WizardResult } from '../components/onboarding/TeacherOnboardingWizard';

export interface TeacherOnboardingDeps {
  user: AppUser;
  activeVoca: 'english' | 'hebrew' | null;
  setClasses: React.Dispatch<React.SetStateAction<ClassData[]>>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  couldNotSetupClassMsg: string;
}

export async function completeTeacherOnboarding(
  result: WizardResult,
  deps: TeacherOnboardingDeps,
): Promise<{ classCode: string } | null> {
  const { user, activeVoca, setClasses, setUser, showToast, couldNotSetupClassMsg } = deps;

  try {
    // Same alphabet as handleCreateClass — no 0/O/1/I to avoid
    // teacher-typing confusion.  Rejection-sampled to keep the
    // distribution uniform across the alphabet.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from(crypto.getRandomValues(new Uint32Array(8)))
      .map((x) => {
        const limit = Math.floor(0x100000000 / alphabet.length) * alphabet.length;
        let v = x;
        while (v >= limit) v = crypto.getRandomValues(new Uint32Array(1))[0];
        return alphabet[v % alphabet.length];
      })
      .join('');

    // Tag the class with the teacher's active Voca so it appears on
    // the right tab; null/legacy paths fall back to 'english'
    // (matches the DB default).
    const onboardingSubject = activeVoca ?? 'english';
    const { data: classRow, error: classErr } = await supabase
      .from('classes')
      .insert({
        name: result.className,
        teacher_uid: user.uid,
        code,
        subject: onboardingSubject,
      })
      .select()
      .single();
    if (classErr || !classRow) throw classErr ?? new Error('class insert failed');

    // Optimistically add to local state so the wizard's gating
    // (classes.length === 0) flips immediately and the modal doesn't
    // reopen on close.
    setClasses((prev) => [
      ...prev,
      {
        id: classRow.id,
        name: classRow.name,
        code: classRow.code,
        teacherUid: user.uid,
        subject: onboardingSubject,
      },
    ]);

    // Pick starter words from the chosen pack.  For 'custom' we skip
    // the assignment — teacher can build it in the regular flow.
    const vocabMod = getCachedVocabulary();
    let words: { id: number }[] = [];
    if (vocabMod && result.starterPack !== 'custom') {
      const set =
        result.starterPack === 'set-1'
          ? vocabMod.SET_1_WORDS
          : result.starterPack === 'set-3'
          ? vocabMod.SET_3_WORDS
          : vocabMod.SET_2_WORDS;
      words = set.slice(0, 20).map((w) => ({ id: w.id }));
    }

    if (words.length > 0) {
      await supabase.from('assignments').insert({
        class_id: classRow.id,
        word_ids: words.map((w) => w.id),
        title: 'Welcome quiz',
        allowed_modes: result.modes,
        created_at: new Date().toISOString(),
        sentence_difficulty: 2,
        subject: onboardingSubject,
      });
    }

    // PostgrestBuilder is PromiseLike — wrap in Promise.resolve() to
    // get a real Promise so we can chain .catch.
    await Promise.resolve(supabase.rpc('mark_teacher_onboarded')).catch(
      (err: unknown) => {
        console.error('[onboarding] mark_teacher_onboarded failed:', err);
      },
    );
    setUser((prev) =>
      prev ? { ...prev, onboardedAt: new Date().toISOString() } : prev,
    );

    return { classCode: code };
  } catch (err) {
    console.error('[onboarding] wizard completion failed:', err);
    showToast(couldNotSetupClassMsg, 'error');
    return null;
  }
}
