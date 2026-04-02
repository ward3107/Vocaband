import { supabase } from '../core/supabase';

export async function approveStudent(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_student', { p_profile_id: profileId });
  if (error) throw error;
}
