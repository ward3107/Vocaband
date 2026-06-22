/**
 * pushNotify — ask the server to fan out a push notification.
 *
 * Called by the teacher client right after it creates an assignment,
 * grants a reward, or starts a live challenge. The server (server.ts
 * /api/push/notify) verifies the caller is a teacher authorised over the
 * target, then sends a PII-free push to opted-in students.
 *
 * Targeting:
 *   - `{ classCode }`   → every opted-in student in the class
 *                         (new_assignment, live_challenge).
 *   - `{ studentUid }`  → one student (reward) — the teacher must own that
 *                         student's class.
 *
 * Best-effort by design: a failure here must NEVER block the teacher's
 * action (the assignment/reward already succeeded). Silently no-ops if the
 * feature is off server-side or the network call fails.
 */
import { supabase } from "../core/supabase";

export type PushNotifyType = "new_assignment" | "reward" | "live_challenge";

export interface PushTarget {
  classCode?: string | null;
  studentUid?: string | null;
}

export async function pushNotify(type: PushNotifyType, target: PushTarget): Promise<void> {
  if (!target.classCode && !target.studentUid) return;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await fetch("/api/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, classCode: target.classCode ?? undefined, studentUid: target.studentUid ?? undefined }),
      keepalive: true, // survive a navigation right after the teacher's action
    });
  } catch {
    /* best-effort — never surface to the teacher */
  }
}
