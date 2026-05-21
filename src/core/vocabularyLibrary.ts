/**
 * vocabularyLibrary.ts — high-level data access for the teacher-owned
 * Vocabulary Library feature.
 *
 * Wraps the raw supabase-js queries with typed, mapped, RLS-friendly
 * helpers so callers in views/components/hooks don't have to remember
 * column lists or row-shape mapping. Mirrors the convention established
 * by useTeacherActions / fetchUserProfile but is kept in `core/` because
 * multiple hooks + views need these primitives.
 *
 * Schema reference:
 *   supabase/migrations/20260621000000_vocabulary_library.sql
 *
 * RLS posture: every read here trusts the teacher's session — RLS
 * filters server-side. We never pass teacher_uid as a filter from the
 * client; the DB enforces ownership.
 */
import {
  supabase,
  handleDbError,
  OperationType,
  mapVocabularyCollection,
  mapVocabularySet,
  mapVocabularySetWord,
  mapVocabularySetWordSentence,
  mapVocabularyExtractionJob,
  mapVocabularyCollectionToDb,
  mapVocabularySetToDb,
  mapVocabularySetWordToDb,
  VOCABULARY_COLLECTION_COLUMNS,
  VOCABULARY_SET_COLUMNS,
  VOCABULARY_SET_WORD_COLUMNS,
  VOCABULARY_SET_WORD_SENTENCE_COLUMNS,
  VOCABULARY_EXTRACTION_JOB_COLUMNS,
  type VocabularyCollection,
  type VocabularySet,
  type VocabularySetWord,
  type VocabularySetWordSentence,
  type VocabularyExtractionJob,
} from './supabase';

// Re-export the row types so callers can `import { listCollections,
// type VocabularyCollection } from '../core/vocabularyLibrary'` without
// reaching back into supabase.ts.
export type {
  VocabularyCollection,
  VocabularySet,
  VocabularySetWord,
  VocabularySetWordSentence,
  VocabularyExtractionJob,
} from './supabase';

// ─── Collections ──────────────────────────────────────────────────────

/** List every collection this teacher owns. RLS handles the filter. */
export async function listCollections(): Promise<VocabularyCollection[]> {
  const { data, error } = await supabase
    .from('vocabulary_collections')
    .select(VOCABULARY_COLLECTION_COLUMNS)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });
  if (error) return handleDbError(error, OperationType.LIST, 'vocabulary_collections');
  return (data ?? []).map(mapVocabularyCollection);
}

/** Children of a given collection. Pass null for the root layer. */
export async function listCollectionChildren(
  parentId: string | null
): Promise<VocabularyCollection[]> {
  let query = supabase
    .from('vocabulary_collections')
    .select(VOCABULARY_COLLECTION_COLUMNS)
    .eq('is_archived', false)
    .order('name', { ascending: true });
  query = parentId === null ? query.is('parent_id', null) : query.eq('parent_id', parentId);
  const { data, error } = await query;
  if (error) return handleDbError(error, OperationType.LIST, 'vocabulary_collections');
  return (data ?? []).map(mapVocabularyCollection);
}

/** Breadcrumb path from root → ... → self. Powered by the RPC. */
export async function getCollectionPath(
  collectionId: string
): Promise<Array<{ id: string; name: string; depth: number }>> {
  const { data, error } = await supabase
    .rpc('get_collection_path', { p_collection_id: collectionId });
  if (error) return handleDbError(error, OperationType.GET, 'get_collection_path');
  return (data ?? []) as Array<{ id: string; name: string; depth: number }>;
}

export async function createCollection(
  input: Partial<VocabularyCollection> & { teacherUid: string; name: string }
): Promise<VocabularyCollection> {
  const { data, error } = await supabase
    .from('vocabulary_collections')
    .insert(mapVocabularyCollectionToDb(input))
    .select(VOCABULARY_COLLECTION_COLUMNS)
    .single();
  if (error) return handleDbError(error, OperationType.CREATE, 'vocabulary_collections');
  return mapVocabularyCollection(data);
}

export async function updateCollection(
  id: string,
  patch: Partial<Omit<VocabularyCollection, 'id' | 'teacherUid' | 'createdAt' | 'updatedAt'>>
): Promise<VocabularyCollection> {
  const dbPatch = mapVocabularyCollectionToDb({ ...patch, teacherUid: '', name: patch.name ?? '' });
  // mapToDb requires teacherUid + name; we never want to update them here.
  delete (dbPatch as Record<string, unknown>).teacher_uid;
  if (patch.name === undefined) delete (dbPatch as Record<string, unknown>).name;
  const { data, error } = await supabase
    .from('vocabulary_collections')
    .update(dbPatch)
    .eq('id', id)
    .select(VOCABULARY_COLLECTION_COLUMNS)
    .single();
  if (error) return handleDbError(error, OperationType.UPDATE, 'vocabulary_collections');
  return mapVocabularyCollection(data);
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await supabase.from('vocabulary_collections').delete().eq('id', id);
  if (error) await handleDbError(error, OperationType.DELETE, 'vocabulary_collections');
}

// ─── Sets ─────────────────────────────────────────────────────────────

/** Sets belonging directly to this collection (or null for unfiled). */
export async function listSetsInCollection(
  collectionId: string | null
): Promise<VocabularySet[]> {
  let query = supabase
    .from('vocabulary_sets')
    .select(VOCABULARY_SET_COLUMNS)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });
  query = collectionId === null
    ? query.is('collection_id', null)
    : query.eq('collection_id', collectionId);
  const { data, error } = await query;
  if (error) return handleDbError(error, OperationType.LIST, 'vocabulary_sets');
  return (data ?? []).map(mapVocabularySet);
}

/** All sets the teacher owns, regardless of collection — powers the
 *  library's "All Sets" tab and search. */
export async function listAllSets(): Promise<VocabularySet[]> {
  const { data, error } = await supabase
    .from('vocabulary_sets')
    .select(VOCABULARY_SET_COLUMNS)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });
  if (error) return handleDbError(error, OperationType.LIST, 'vocabulary_sets');
  return (data ?? []).map(mapVocabularySet);
}

/** Recently consumed sets — bumps last_used_at, sorted desc. */
export async function listRecentSets(limit = 12): Promise<VocabularySet[]> {
  const { data, error } = await supabase
    .from('vocabulary_sets')
    .select(VOCABULARY_SET_COLUMNS)
    .eq('is_archived', false)
    .not('last_used_at', 'is', null)
    .order('last_used_at', { ascending: false })
    .limit(limit);
  if (error) return handleDbError(error, OperationType.LIST, 'vocabulary_sets');
  return (data ?? []).map(mapVocabularySet);
}

export async function getSet(id: string): Promise<VocabularySet | null> {
  const { data, error } = await supabase
    .from('vocabulary_sets')
    .select(VOCABULARY_SET_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) return handleDbError(error, OperationType.GET, 'vocabulary_sets');
  return data ? mapVocabularySet(data) : null;
}

export async function createSet(
  input: Partial<VocabularySet> & { teacherUid: string; name: string }
): Promise<VocabularySet> {
  const { data, error } = await supabase
    .from('vocabulary_sets')
    .insert(mapVocabularySetToDb(input))
    .select(VOCABULARY_SET_COLUMNS)
    .single();
  if (error) return handleDbError(error, OperationType.CREATE, 'vocabulary_sets');
  return mapVocabularySet(data);
}

export async function updateSet(
  id: string,
  patch: Partial<Omit<VocabularySet, 'id' | 'teacherUid' | 'createdAt' | 'updatedAt'>>
): Promise<VocabularySet> {
  const dbPatch = mapVocabularySetToDb({ ...patch, teacherUid: '', name: patch.name ?? '' });
  delete (dbPatch as Record<string, unknown>).teacher_uid;
  if (patch.name === undefined) delete (dbPatch as Record<string, unknown>).name;
  const { data, error } = await supabase
    .from('vocabulary_sets')
    .update(dbPatch)
    .eq('id', id)
    .select(VOCABULARY_SET_COLUMNS)
    .single();
  if (error) return handleDbError(error, OperationType.UPDATE, 'vocabulary_sets');
  return mapVocabularySet(data);
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await supabase.from('vocabulary_sets').delete().eq('id', id);
  if (error) await handleDbError(error, OperationType.DELETE, 'vocabulary_sets');
}

/** Bump last_used_at when a Set is consumed by an assignment / worksheet /
 *  Class Show / Quick Play. Fire-and-forget — never throws. */
export function touchSetUsed(setId: string): void {
  void supabase.rpc('touch_vocabulary_set_used', { p_set_id: setId });
}

// ─── Words ────────────────────────────────────────────────────────────

export async function listSetWords(setId: string): Promise<VocabularySetWord[]> {
  const { data, error } = await supabase
    .from('vocabulary_set_words')
    .select(VOCABULARY_SET_WORD_COLUMNS)
    .eq('set_id', setId)
    .order('position', { ascending: true });
  if (error) return handleDbError(error, OperationType.LIST, 'vocabulary_set_words');
  return (data ?? []).map(mapVocabularySetWord);
}

/** Bulk insert — used right after extraction completes. Callers compute
 *  positions client-side (0..n-1) for predictable ordering. */
export async function addWordsToSet(
  setId: string,
  words: Array<Omit<VocabularySetWord, 'id' | 'setId' | 'createdAt' | 'updatedAt'>>
): Promise<VocabularySetWord[]> {
  if (words.length === 0) return [];
  const rows = words.map((w) => mapVocabularySetWordToDb({ ...w, setId }));
  const { data, error } = await supabase
    .from('vocabulary_set_words')
    .insert(rows)
    .select(VOCABULARY_SET_WORD_COLUMNS);
  if (error) return handleDbError(error, OperationType.CREATE, 'vocabulary_set_words');
  return (data ?? []).map(mapVocabularySetWord);
}

export async function updateSetWord(
  id: string,
  patch: Partial<Omit<VocabularySetWord, 'id' | 'setId' | 'createdAt' | 'updatedAt'>>
): Promise<VocabularySetWord> {
  const { data, error } = await supabase
    .from('vocabulary_set_words')
    .update({
      ...(patch.position !== undefined && { position: patch.position }),
      ...(patch.english !== undefined && { english: patch.english }),
      ...(patch.hebrew !== undefined && { hebrew: patch.hebrew }),
      ...(patch.arabic !== undefined && { arabic: patch.arabic }),
      ...(patch.partOfSpeech !== undefined && { part_of_speech: patch.partOfSpeech }),
      ...(patch.difficulty !== undefined && { difficulty: patch.difficulty }),
      ...(patch.curriculumWordId !== undefined && { curriculum_word_id: patch.curriculumWordId }),
      ...(patch.audioUrl !== undefined && { audio_url: patch.audioUrl }),
      ...(patch.metadata !== undefined && { metadata: patch.metadata }),
    })
    .eq('id', id)
    .select(VOCABULARY_SET_WORD_COLUMNS)
    .single();
  if (error) return handleDbError(error, OperationType.UPDATE, 'vocabulary_set_words');
  return mapVocabularySetWord(data);
}

export async function deleteSetWord(id: string): Promise<void> {
  const { error } = await supabase.from('vocabulary_set_words').delete().eq('id', id);
  if (error) await handleDbError(error, OperationType.DELETE, 'vocabulary_set_words');
}

// ─── Sentences ────────────────────────────────────────────────────────

export async function listSentencesForWord(
  wordId: string
): Promise<VocabularySetWordSentence[]> {
  const { data, error } = await supabase
    .from('vocabulary_set_word_sentences')
    .select(VOCABULARY_SET_WORD_SENTENCE_COLUMNS)
    .eq('word_id', wordId)
    .order('is_primary', { ascending: false });
  if (error) return handleDbError(error, OperationType.LIST, 'vocabulary_set_word_sentences');
  return (data ?? []).map(mapVocabularySetWordSentence);
}

// ─── Extraction jobs ──────────────────────────────────────────────────

export async function listRecentExtractionJobs(
  limit = 10
): Promise<VocabularyExtractionJob[]> {
  const { data, error } = await supabase
    .from('vocabulary_extraction_jobs')
    .select(VOCABULARY_EXTRACTION_JOB_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return handleDbError(error, OperationType.LIST, 'vocabulary_extraction_jobs');
  return (data ?? []).map(mapVocabularyExtractionJob);
}
