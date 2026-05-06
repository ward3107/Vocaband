// Thin Supabase wrappers around bagrut_tests + bagrut_responses.  One
// place so the views don't sprinkle .from('bagrut_*') calls everywhere.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../core/supabase';
import type { BagrutTest, BagrutTestRow, BagrutResponseRow } from '../types';

// ── Teacher: list own tests ─────────────────────────────────────────────
export function useTeacherBagrutTests(teacherUid: string | null) {
  const [rows, setRows] = useState<BagrutTestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!teacherUid) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('bagrut_tests')
      .select('*')
      .eq('teacher_uid', teacherUid)
      .order('updated_at', { ascending: false });
    if (error) setError(error.message);
    else setRows((data ?? []) as BagrutTestRow[]);
    setLoading(false);
  }, [teacherUid]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { rows, loading, error, refresh };
}

// ── Teacher: save a draft / publish ─────────────────────────────────────
export async function saveBagrutDraft(args: {
  teacherUid: string;
  classId: string | null;
  title: string;
  module: BagrutTest['module'];
  sourceWords: string[];
  content: BagrutTest;
}): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from('bagrut_tests')
    .insert({
      teacher_uid: args.teacherUid,
      class_id: args.classId,
      title: args.title,
      module: args.module,
      source_words: args.sourceWords,
      content: args.content,
      published: false,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };
  return { id: data!.id };
}

export async function updateBagrutTest(id: string, patch: Partial<{
  title: string;
  class_id: string | null;
  content: BagrutTest;
  published: boolean;
}>): Promise<{ error?: string }> {
  const { error } = await supabase.from('bagrut_tests').update(patch).eq('id', id);
  return error ? { error: error.message } : {};
}

export async function deleteBagrutTest(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('bagrut_tests').delete().eq('id', id);
  return error ? { error: error.message } : {};
}

// ── Student: list published tests for their class ───────────────────────
export function useStudentBagrutTests(classCode: string | null | undefined) {
  const [rows, setRows] = useState<BagrutTestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!classCode) return;
    setLoading(true);
    // Resolve class id from code, then fetch published tests.
    const { data: classRow, error: classErr } = await supabase
      .from('classes')
      .select('id')
      .eq('code', classCode)
      .maybeSingle();
    if (classErr || !classRow) {
      setError(classErr?.message || 'Class not found');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('bagrut_tests')
      .select('*')
      .eq('class_id', classRow.id)
      .eq('published', true)
      .order('updated_at', { ascending: false });
    if (error) setError(error.message);
    else setRows((data ?? []) as BagrutTestRow[]);
    setLoading(false);
  }, [classCode]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { rows, loading, error, refresh };
}

// ── Student response helpers ────────────────────────────────────────────
export async function loadOwnResponse(testId: string, studentUid: string): Promise<BagrutResponseRow | null> {
  const { data } = await supabase
    .from('bagrut_responses')
    .select('*')
    .eq('test_id', testId)
    .eq('student_uid', studentUid)
    .maybeSingle();
  return (data as BagrutResponseRow) ?? null;
}

export async function autosaveResponse(args: {
  testId: string;
  studentUid: string;
  answers: Record<string, string>;
}): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('bagrut_responses')
    .upsert({
      test_id: args.testId,
      student_uid: args.studentUid,
      answers: args.answers,
    }, { onConflict: 'test_id,student_uid' });
  return error ? { error: error.message } : {};
}

// ── Teacher: fetch responses for a given test ───────────────────────────
export async function fetchResponsesForTest(testId: string): Promise<BagrutResponseRow[]> {
  const { data } = await supabase
    .from('bagrut_responses')
    .select('*')
    .eq('test_id', testId)
    .order('updated_at', { ascending: false });
  return (data ?? []) as BagrutResponseRow[];
}
