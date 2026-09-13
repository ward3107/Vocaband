/**
 * Translation Corrections System
 * Allows teachers to correct inaccurate Hebrew/Arabic translations
 */

import { supabase } from '../core/supabase';

export interface TranslationCorrection {
  wordId: number;
  english: string;
  hebrew?: string;
  arabic?: string;
  /** Russian translation.  Stored in `word_corrections.russian` (column
   *  added 2026-04-24).  Optional so records written before that
   *  migration still round-trip cleanly. */
  russian?: string;
}

/**
 * Save a translation correction to Supabase
 */
export async function saveCorrection(correction: TranslationCorrection): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if correction already exists
  const { data: existing } = await supabase
    .from('word_corrections')
    .select('*')
    .eq('word_id', correction.wordId)
    .eq('corrected_by', user.id)
    .single();

  if (existing) {
    // Update existing correction
    await supabase
      .from('word_corrections')
      .update({
        hebrew: correction.hebrew,
        arabic: correction.arabic,
        russian: correction.russian,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Insert new correction
    await supabase
      .from('word_corrections')
      .insert({
        word_id: correction.wordId,
        english: correction.english,
        hebrew: correction.hebrew,
        arabic: correction.arabic,
        russian: correction.russian,
        corrected_by: user.id,
      });
  }
}
