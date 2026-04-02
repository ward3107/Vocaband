import { supabase, mapClass } from '../core/supabase';
import type { ClassData } from '../shared/types';

export async function fetchTeacherClasses(teacherUid: string): Promise<ClassData[]> {
  const { data, error } = await supabase.from('classes').select('*').eq('teacher_uid', teacherUid);
  if (error || !data) return [];
  return data.map(mapClass);
}

export async function findClassByCode(code: string): Promise<ClassData | null> {
  const { data, error } = await supabase.from('classes').select('*').eq('code', code);
  if (error || !data || data.length === 0) return null;
  return mapClass(data[0]);
}

export async function createClass(name: string, teacherUid: string, code: string): Promise<ClassData> {
  const { data, error } = await supabase
    .from('classes')
    .insert({ name, teacher_uid: teacherUid, code })
    .select()
    .single();
  if (error) throw error;
  return mapClass(data);
}

export async function deleteClass(classId: string): Promise<void> {
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) throw error;
}
