/**
 * Pick the word seed for a Class Minute round.  Three-tier fallback:
 *
 *   1. SRS-due words from the get_due_reviews RPC (top 20).
 *   2. If thin, top up from the student's current assignments
 *      until we have at least ~30 candidates total.
 *   3. If still under 4 (SRS empty AND no assignments), fall back
 *      to the first 20 SET_2_WORDS so the round can always start.
 *
 * Pulled out of App.tsx's startClassMinute useCallback so the
 * fallback ladder is testable / discoverable; the caller still owns
 * setAssignmentWords + setView etc.
 */
import { supabase } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { AssignmentData } from '../core/supabase';

export interface ClassMinuteDeps {
  allWords: Word[];
  set2Words: Word[];
  studentAssignments: AssignmentData[];
}

export async function pickClassMinuteWords(deps: ClassMinuteDeps): Promise<Word[]> {
  const { allWords, set2Words, studentAssignments } = deps;
  const today = new Intl.DateTimeFormat('sv-SE').format(new Date());
  let seedWords: Word[] = [];

  try {
    const { data, error } = await supabase.rpc('get_due_reviews', {
      p_today_local: today,
      p_limit: 20,
    });
    if (!error && Array.isArray(data)) {
      const dueIds = (data as Array<{ word_id: number }>).map((r) => r.word_id);
      seedWords = dueIds
        .map((id) => allWords.find((w) => w.id === id))
        .filter((w): w is Word => Boolean(w));
    }
  } catch (err) {
    console.error('[class-minute] get_due_reviews failed:', err);
  }

  if (seedWords.length < 15) {
    const fallbackPool: Word[] = [];
    const seen = new Set(seedWords.map((w) => w.id));
    for (const a of studentAssignments) {
      const pool =
        a.words ??
        a.wordIds
          .map((id) => allWords.find((w) => w.id === id))
          .filter((w): w is Word => Boolean(w));
      for (const w of pool) {
        if (seen.has(w.id)) continue;
        fallbackPool.push(w);
        seen.add(w.id);
      }
      if (seedWords.length + fallbackPool.length >= 30) break;
    }
    seedWords = [...seedWords, ...fallbackPool];
  }

  if (seedWords.length < 4) {
    seedWords = set2Words.slice(0, 20);
  }

  return seedWords;
}
