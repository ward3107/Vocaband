import { supabase, mapAssignment } from '../core/supabase';
import type { AssignmentData } from '../shared/types';

export async function fetchAssignmentsByClassId(classId: string): Promise<AssignmentData[]> {
  const { data, error } = await supabase.from('assignments').select('*').eq('class_id', classId);
  if (error || !data) return [];
  return data.map(mapAssignment);
}

export async function fetchAssignmentsByClassIds(classIds: string[]): Promise<AssignmentData[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .in('class_id', classIds)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapAssignment);
}

export async function createAssignment(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('assignments').insert(payload);
  if (error) throw error;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) throw error;
}
