import { supabase, mapProgress, mapProgressToDb } from '../core/supabase';
import type { ProgressData } from '../shared/types';

export async function fetchProgressByClassCode(classCode: string, studentUid?: string): Promise<ProgressData[]> {
  let query = supabase.from('progress').select('*').eq('class_code', classCode);
  if (studentUid) query = query.eq('student_uid', studentUid);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapProgress);
}

export async function fetchProgressByClassCodes(classCodes: string[], limit = 5000): Promise<ProgressData[]> {
  const results: ProgressData[] = [];
  // Process in chunks to avoid query limits
  for (let i = 0; i < classCodes.length; i += 10) {
    const chunk = classCodes.slice(i, i + 10);
    const { data } = await supabase.from('progress').select('*').in('class_code', chunk).limit(limit);
    if (data) results.push(...data.map(mapProgress));
  }
  return results;
}

export async function fetchProgressByStudent(studentUid: string): Promise<ProgressData[]> {
  const { data, error } = await supabase.from('progress').select('*').eq('student_uid', studentUid);
  if (error || !data) return [];
  return data.map(mapProgress);
}

export async function saveProgress(progress: Omit<ProgressData, 'id'>): Promise<void> {
  const { error } = await supabase.from('progress').insert(mapProgressToDb(progress));
  if (error) throw error;
}

/** Insert a raw DB-formatted progress row (e.g. from localStorage retry queue) */
export async function insertRawProgress(dbRow: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('progress').insert(dbRow);
  if (error) throw error;
}

export async function fetchProgressScores(classCode: string, limit = 10): Promise<Array<{ student_name: string; score: number; avatar: string }>> {
  const { data } = await supabase
    .from('progress').select('student_name, score, avatar')
    .eq('class_code', classCode)
    .order('score', { ascending: false }).limit(limit);
  return (data ?? []).map(row => ({
    student_name: row.student_name,
    score: row.score,
    avatar: row.avatar || "🦊",
  }));
}

export async function fetchProgressForScores(classCodes: string[], limit = 200): Promise<ProgressData[]> {
  const results: ProgressData[] = [];
  for (let i = 0; i < classCodes.length; i += 30) {
    const chunk = classCodes.slice(i, i + 30);
    const { data } = await supabase
      .from('progress').select('*')
      .in('class_code', chunk)
      .order('completed_at', { ascending: false })
      .limit(limit);
    if (data) results.push(...data.map(mapProgress));
  }
  return results;
}

export async function saveStudentProgress(params: {
  studentName: string;
  studentUid: string;
  assignmentId: string;
  classCode: string;
  score: number;
  mode: string;
  mistakes: number;
  avatar: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('save_student_progress', {
    p_student_name: params.studentName,
    p_student_uid: params.studentUid,
    p_assignment_id: params.assignmentId,
    p_class_code: params.classCode,
    p_score: params.score,
    p_mode: params.mode,
    p_mistakes: params.mistakes,
    p_avatar: params.avatar,
  });
  if (error) throw error;
  return data;
}

export async function deleteProgressByStudent(studentUid: string): Promise<void> {
  const { error } = await supabase.from('progress').delete().eq('student_uid', studentUid);
  if (error) throw error;
}
