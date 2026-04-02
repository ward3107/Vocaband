import { supabase, mapUser, mapUserToDb } from '../core/supabase';
import type { AppUser } from '../shared/types';

export async function fetchUserProfile(uid: string): Promise<AppUser | null> {
  const { data, error } = await supabase.from('users').select('*').eq('uid', uid).maybeSingle();
  if (error || !data) return null;
  return mapUser(data);
}

export async function upsertUser(user: Partial<AppUser> & { uid: string }): Promise<void> {
  const { error } = await supabase.from('users').upsert(mapUserToDb(user), { onConflict: 'uid' });
  if (error) throw error;
}

export async function createUser(user: AppUser): Promise<void> {
  const { error } = await supabase.from('users').insert(mapUserToDb(user));
  if (error) throw error;
}

export async function updateDisplayName(uid: string, name: string): Promise<void> {
  const { error } = await supabase.from('users').update({ display_name: name }).eq('uid', uid);
  if (error) throw error;
}

export async function updateAvatar(uid: string, emoji: string): Promise<void> {
  const { error } = await supabase.from('users').update({ avatar: emoji }).eq('uid', uid);
  if (error) throw error;
}

export async function updateActiveTheme(uid: string, themeId: string): Promise<void> {
  const { error } = await supabase.from('users').update({ active_theme: themeId }).eq('uid', uid);
  if (error) throw error;
}

export async function updateActiveTitle(uid: string, titleId: string): Promise<void> {
  const { error } = await supabase.from('users').update({ active_title: titleId } as any).eq('uid', uid);
  if (error) throw error;
}

export async function updateActiveFrame(uid: string, frameId: string): Promise<void> {
  const { error } = await supabase.from('users').update({ active_frame: frameId } as any).eq('uid', uid);
  if (error) throw error;
}

export async function updateXpAndStreak(uid: string, xp: number, streak: number): Promise<void> {
  const { error } = await supabase.from('users').update({ xp, streak }).eq('uid', uid);
  if (error) throw error;
}

export async function updateBadges(uid: string, badges: string[]): Promise<void> {
  const { error } = await supabase.from('users').update({ badges }).eq('uid', uid);
  if (error) throw error;
}

export async function updatePowerUps(uid: string, powerUps: Record<string, number>): Promise<void> {
  const { error } = await supabase.from('users').update({ power_ups: powerUps }).eq('uid', uid);
  if (error) throw error;
}

export async function migrateUid(oldUid: string, newUid: string): Promise<void> {
  const { error } = await supabase.from('users').update({ uid: newUid }).eq('uid', oldUid);
  if (error) throw error;
}

export async function updateStudentProfile(uid: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('users').update(updates).eq('uid', uid);
  if (error) throw error;
}

export async function exportUserData(uid: string) {
  const [userResult, progressResult] = await Promise.all([
    supabase.from('users').select('*').eq('uid', uid).maybeSingle(),
    supabase.from('progress').select('*').eq('student_uid', uid),
  ]);
  return { user: userResult.data, progress: progressResult.data ?? [] };
}

export async function deleteUserAccount(uid: string): Promise<void> {
  await supabase.from('progress').delete().eq('student_uid', uid);
  await supabase.from('users').delete().eq('uid', uid);
  await supabase.auth.signOut();
}
