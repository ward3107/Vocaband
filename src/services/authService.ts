import { supabase } from '../core/supabase';

export async function getSession() {
  return supabase.auth.getSession();
}

export async function signInWithGoogle(redirectTo: string) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export async function signInAnonymously() {
  return supabase.auth.signInAnonymously();
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function isTeacherAllowed(email: string): Promise<boolean> {
  const { data } = await supabase.rpc('is_teacher_allowed', { check_email: email });
  return !!data;
}
