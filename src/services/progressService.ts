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

export async function deleteProgressByStudent(studentUid: string): Promise<void> {
  const { error } = await supabase.from('progress').delete().eq('student_uid', studentUid);
  if (error) throw error;
}
