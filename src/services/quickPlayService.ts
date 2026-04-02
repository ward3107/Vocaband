import { supabase } from '../core/supabase';

export async function createQuickPlaySession(
  wordIds: number[] | null,
  customWords: any | null
): Promise<{ session_code: string }> {
  const { data, error } = await supabase.rpc('create_quick_play_session', {
    p_word_ids: wordIds,
    p_custom_words: customWords,
  });
  if (error) throw error;
  return data as { session_code: string };
}

export async function endQuickPlaySession(sessionCode: string): Promise<void> {
  const { error } = await supabase.rpc('end_quick_play_session', {
    p_session_code: sessionCode,
  });
  if (error) throw error;
}
