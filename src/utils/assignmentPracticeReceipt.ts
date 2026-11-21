import { supabase } from '../core/supabase';

function prefix(uid: string) {
  return 'vocaband_practice_receipt:' + uid + ':';
}
export async function finishAssignedPractice(uid: string, assignmentId: string, profileId: string) {
  const key = prefix(uid) + JSON.stringify([assignmentId, profileId]);
  let cached = false;
  try {
    localStorage.setItem(key, '1');
    cached = true;
  } catch {
    /* Try the network directly. */
  }
  try {
    const { data, error } = await supabase.rpc('complete_assignment_practice', {
      p_assignment_id: assignmentId,
      p_profile_id: profileId,
    });
    if (error || data !== true) throw error ?? new Error('Practice receipt unavailable');
    try {
      localStorage.removeItem(key);
    } catch {
      /* A duplicate receipt is harmless. */
    }
    return true;
  } catch {
    return cached;
  }
}
export async function flushPracticeReceipts(uid: string) {
  let keys: string[] = [];
  try {
    keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix(uid)));
  } catch {
    return;
  }
  for (const key of keys) {
    try {
      const [assignmentId, profileId] = JSON.parse(key.slice(prefix(uid).length));
      if (typeof assignmentId === 'string' && typeof profileId === 'string')
        await finishAssignedPractice(uid, assignmentId, profileId);
    } catch {
      /* Ignore an incomplete entry. */
    }
  }
}
