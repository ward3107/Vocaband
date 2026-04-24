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

export interface WordWithCorrections {
  wordId: number;
  english: string;
  hebrew: string;
  arabic: string;
  russian: string;
  isCorrected: boolean;
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

/**
 * Get all corrections for the current user
 */
export async function getMyCorrections(): Promise<Map<number, TranslationCorrection>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data, error } = await supabase
    .from('word_corrections')
    .select('*')
    .eq('corrected_by', user.id);

  if (error || !data) return new Map();

  const corrections = new Map<number, TranslationCorrection>();
  for (const correction of data) {
    corrections.set(correction.word_id, {
      wordId: correction.word_id,
      english: correction.english,
      hebrew: correction.hebrew || undefined,
      arabic: correction.arabic || undefined,
      russian: correction.russian || undefined,
    });
  }
  return corrections;
}

/**
 * Apply corrections to a word
 */
export function applyCorrections(
  word: { id: number; english: string; hebrew: string; arabic: string; russian?: string },
  corrections: Map<number, TranslationCorrection>
): WordWithCorrections {
  const correction = corrections.get(word.id);
  return {
    wordId: word.id,
    english: word.english,
    hebrew: correction?.hebrew || word.hebrew,
    arabic: correction?.arabic || word.arabic,
    russian: correction?.russian || word.russian || '',
    isCorrected: !!correction,
  };
}

/**
 * Batch load corrections for multiple words
 */
export async function loadCorrectionsForWords(
  words: Array<{ id: number }>
): Promise<Map<number, TranslationCorrection>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Map();

  const wordIds = words.map(w => w.id);

  const { data, error } = await supabase
    .from('word_corrections')
    .select('*')
    .in('word_id', wordIds)
    .eq('corrected_by', user.id);

  if (error || !data) return new Map();

  const corrections = new Map<number, TranslationCorrection>();
  for (const correction of data) {
    corrections.set(correction.word_id, {
      wordId: correction.word_id,
      english: correction.english,
      hebrew: correction.hebrew || undefined,
      arabic: correction.arabic || undefined,
      russian: correction.russian || undefined,
    });
  }
  return corrections;
}

/**
 * Delete a correction (revert to default translation)
 */
export async function deleteCorrection(wordId: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await supabase
    .from('word_corrections')
    .delete()
    .eq('word_id', wordId)
    .eq('corrected_by', user.id);
}
