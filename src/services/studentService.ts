import { supabase } from '../core/supabase';

export async function approveStudent(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_student', { p_profile_id: profileId });
  if (error) throw error;
}

export async function rejectStudent(profileId: string): Promise<void> {
  const { error } = await supabase.from('student_profiles').update({ status: 'rejected' }).eq('id', profileId);
  if (error) throw error;
}

export async function checkStudentApproval(uniqueIds: string[]): Promise<{ status: string } | null> {
  for (const uniqueId of uniqueIds) {
    const { data } = await supabase.from('student_profiles').select('status').eq('unique_id', uniqueId).maybeSingle();
    if (data) return data;
  }
  return null;
}
