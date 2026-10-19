import { supabase } from '../core/supabase';
import { QP_ARENA_MODE, QP_CATEGORY_RACE_MODE, QP_SPEED_MODE, QP_WHEEL_MODE } from '../core/quickPlayProtocol';
import type { View } from '../core/views';
import type { Word } from '../data/vocabulary';
import type { QuickPlayActiveSession } from '../hooks/useQuickPlaySessionState';

export interface ClassLiveSession {
  class_id: string;
  class_name: string;
  session_id: string;
  session_code: string;
  allowed_modes: string[];
  expires_at: string;
}

export interface ClassLiveEntry {
  classId: string;
  className: string;
  live: ClassLiveSession | null;
}

/** The RPC returns approved class membership even before a game is opened. */
export async function getMyLiveClassEntry(signal?: AbortSignal): Promise<ClassLiveEntry | null> {
  let query = supabase.rpc('get_my_live_class_session');
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  const row = data?.[0] as ClassLiveSession | undefined;
  return row ? {
    classId: row.class_id,
    className: row.class_name,
    live: row.session_id && Date.parse(row.expires_at) > Date.now() ? row : null,
  } : null;
}

export async function getMyLiveClassSession(signal?: AbortSignal): Promise<ClassLiveSession | null> {
  return (await getMyLiveClassEntry(signal))?.live ?? null;
}

export class ClassLessonEndedError extends Error {}

/** Revalidate membership on the tap: a card may outlive a closed/replaced lesson. */
export async function loadMyClassLiveGame(signal: AbortSignal): Promise<{
  session: QuickPlayActiveSession & { subject: 'english' | 'hebrew' };
  view: View;
}> {
  const live = await getMyLiveClassSession(signal);
  if (!live) throw new ClassLessonEndedError();
  const { data, error } = await supabase.from('quick_play_sessions')
    .select('id, session_code, word_ids, custom_words, allowed_modes, ai_sentences, subject')
    .eq('id', live.session_id).eq('is_active', true).abortSignal(signal).maybeSingle();
  if (error) throw error;
  if (!data) throw new ClassLessonEndedError();
  const modes: string[] = data.allowed_modes ?? [];
  const wordlessViews: Record<string, View> = {
    [QP_CATEGORY_RACE_MODE]: 'category-race-student', [QP_SPEED_MODE]: 'speed-round-student',
    [QP_ARENA_MODE]: 'word-hunt-arena-student', [QP_WHEEL_MODE]: 'wheel-student',
  };
  const wordlessView = modes.length === 1 ? wordlessViews[modes[0]] : undefined;
  const subject = data.subject === 'hebrew' ? 'hebrew' : 'english';
  const ids = new Set<number>(data.word_ids ?? []);
  let words: Word[] = [];
  if (!wordlessView) {
    if (subject === 'hebrew') {
      const { HEBREW_LEMMAS } = await import('../data/vocabulary-hebrew');
      words = HEBREW_LEMMAS.filter(l => ids.has(l.id)).map(l => ({
        id: l.id, english: l.translationEn, hebrew: l.lemmaNiqqud, arabic: l.translationAr, level: 'Custom',
      }));
    } else {
      const { ALL_WORDS } = await import('../data/vocabulary');
      words = ALL_WORDS.filter(w => ids.has(w.id));
    }
    const custom = typeof data.custom_words === 'string' ? JSON.parse(data.custom_words) : data.custom_words;
    if (Array.isArray(custom)) {
      words.push(...custom.map((w, i) => ({ ...w, id: -(i + 1), level: 'Custom' as const })));
    }
    if (!words.length) throw new Error('lesson has no words');
  }
  signal.throwIfAborted();
  return {
    session: {
      id: data.id, sessionCode: data.session_code, wordIds: data.word_ids ?? [], words,
      allowedModes: modes.length ? modes : undefined, aiSentences: data.ai_sentences ?? undefined, subject,
    },
    view: wordlessView ?? 'quick-play-student',
  };
}
