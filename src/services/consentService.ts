import { supabase } from '../core/supabase';

export async function recordConsent(uid: string, policyVersion: string, action: string): Promise<void> {
  await supabase.from('consent_log').insert({
    uid,
    policy_version: policyVersion,
    action,
    timestamp: new Date().toISOString(),
  });
}
