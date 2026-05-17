// Parent Weekly Digest — single-send Edge Function.
//
// Called once per opted-in student per week. The Phase 3 pg_cron job
// loops over every users row where parent_email IS NOT NULL and fires
// this function for each one via pg_net; manual operator invocation
// works too (e.g. for a backfill or a "send me my own kid's digest"
// debug pass).
//
// Service-role only — never invoked by clients. The matching
// digest_send_log row gives us idempotency: a duplicate call for the
// same (student_uid, week_start_date) hits the UNIQUE constraint and
// returns 200 with reason=already_sent instead of double-emailing.
//
// Required env:
//   - SUPABASE_URL                  (auto, set by Supabase)
//   - SUPABASE_SERVICE_ROLE_KEY     (auto, set by Supabase)
//   - RESEND_API_KEY                (operator step — see PARENT-DIGEST-SETUP.md)
//   - DIGEST_FROM_EMAIL             (operator step, default noreply@vocaband.com)
//
// Request:
//   POST /functions/v1/send_parent_digest
//   Authorization: Bearer <service role key>
//   Content-Type: application/json
//   { "student_uid": "uid-here", "week_start_date": "2026-05-11" }
//
// week_start_date is optional; when omitted we default to the Monday
// of the current week in Asia/Jerusalem so a Friday-afternoon cron
// fires for the still-active week (gives parents Friday's stats
// already baked in by the time they read the email Saturday morning).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderDigest, type DigestLang, type DigestData } from "./email-templates.ts";

const env = (key: string): string | undefined => Deno.env.get(key);

// Monday-at-or-before `d` in Asia/Jerusalem, as YYYY-MM-DD.
// Asia/Jerusalem because the cron + the parent's intuition of "this
// week" both run in IL local time, not UTC. Sunday-evening sends
// (rare) should still land on the just-finished Mon-Sun bucket, so
// we treat Sunday as the LAST day of its week, not the first.
function mondayOfWeekIL(d: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const ymd = `${get('year')}-${get('month')}-${get('day')}`;
  // weekday in en-CA short is Mon/Tue/Wed/Thu/Fri/Sat/Sun.
  const wd = get('weekday');
  const offsetFromMon: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = offsetFromMon[wd] ?? 0;
  // Parse the IL-local date as a UTC-naive date so we can subtract days
  // without DST jitter; the YYYY-MM-DD we produce is calendar-only.
  const [y, m, day] = ymd.split('-').map(Number);
  const naive = new Date(Date.UTC(y, m - 1, day));
  naive.setUTCDate(naive.getUTCDate() - offset);
  const out = naive.toISOString().slice(0, 10);
  return out;
}

function isoEndOfWeek(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return end.toISOString();
}

function formatWeekLabel(weekStart: string, lang: DigestLang): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const locale = lang === 'he' ? 'he-IL' : lang === 'ar' ? 'ar-EG' : 'en-US';
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function pickLang(raw: string | null | undefined): DigestLang {
  return raw === 'he' || raw === 'ar' ? raw : 'en';
}

function jsonResp(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return jsonResp({ ok: false, reason: 'method_not_allowed' }, 405);
  }

  // Service-role gate. We compare the raw bearer token rather than
  // parsing+verifying the JWT because Supabase Edge Functions already
  // run JWT verification in front of us when --no-verify-jwt is OFF;
  // this guard is a belt-and-braces second check for the case the
  // function is ever redeployed --no-verify-jwt.
  const auth = req.headers.get('Authorization') ?? '';
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return jsonResp({ ok: false, reason: 'unauthorized' }, 401);
  }

  let body: { student_uid?: string; week_start_date?: string } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResp({ ok: false, reason: 'bad_json' }, 400);
  }
  const studentUid = body.student_uid;
  if (typeof studentUid !== 'string' || studentUid.length === 0) {
    return jsonResp({ ok: false, reason: 'missing_student_uid' }, 400);
  }

  const supabaseUrl = env('SUPABASE_URL');
  if (!supabaseUrl) return jsonResp({ ok: false, reason: 'missing_supabase_url' }, 500);
  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Load the student row + opt-in fields.
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('parent_email, parent_email_locale, display_name, class_code, streak')
    .eq('uid', studentUid)
    .maybeSingle();
  if (userErr) {
    return jsonResp({ ok: false, reason: 'user_lookup_failed', error: userErr.message }, 500);
  }
  if (!user) {
    return jsonResp({ ok: false, reason: 'user_not_found' }, 404);
  }
  if (!user.parent_email) {
    // Not opted in. 200 + reason so the cron loop treats this as
    // "skip, not retry" — distinct from a 5xx that would re-fire.
    return jsonResp({ ok: false, reason: 'no_parent_email' }, 200);
  }

  const weekStartDate = body.week_start_date ?? mondayOfWeekIL(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartDate)) {
    return jsonResp({ ok: false, reason: 'bad_week_start_date' }, 400);
  }

  // 2. Reserve idempotency row. UNIQUE constraint = "already sent".
  const { error: reserveErr } = await supabase
    .from('digest_send_log')
    .insert({
      student_uid: studentUid,
      week_start_date: weekStartDate,
      parent_email: user.parent_email,
    });
  if (reserveErr) {
    // Postgres unique-violation code is 23505. Any other DB error is
    // genuinely broken and worth a 500 so the cron retries.
    if (reserveErr.code === '23505') {
      return jsonResp({ ok: true, reason: 'already_sent' }, 200);
    }
    return jsonResp({ ok: false, reason: 'reserve_failed', error: reserveErr.message }, 500);
  }

  // 3. Best-effort class name lookup. Missing class is fine.
  let className: string | null = null;
  if (user.class_code) {
    const { data: cls } = await supabase
      .from('classes')
      .select('name')
      .eq('code', user.class_code)
      .maybeSingle();
    className = cls?.name ?? null;
  }

  // 4. Weekly aggregates from word_attempts + progress.
  const sinceIso = `${weekStartDate}T00:00:00Z`;
  const untilIso = isoEndOfWeek(weekStartDate);

  const { data: attempts } = await supabase
    .from('word_attempts')
    .select('word_id, is_correct')
    .eq('student_uid', studentUid)
    .gte('created_at', sinceIso)
    .lt('created_at', untilIso);

  const attemptsList = (attempts ?? []) as Array<{ word_id: number; is_correct: boolean }>;
  const correctIds = new Set(attemptsList.filter(a => a.is_correct).map(a => a.word_id));
  const wordsLearned = correctIds.size;
  const totalAttempts = attemptsList.length;
  const correctAttempts = attemptsList.filter(a => a.is_correct).length;
  const accuracyPct = totalAttempts > 0
    ? Math.round((correctAttempts / totalAttempts) * 100)
    : 0;

  const { count: gamesPlayed } = await supabase
    .from('progress')
    .select('id', { count: 'exact', head: true })
    .eq('student_uid', studentUid)
    .gte('completed_at', sinceIso)
    .lt('completed_at', untilIso);

  // 5. Build the email.
  const lang = pickLang(user.parent_email_locale);
  const data: DigestData = {
    studentName: user.display_name || 'your child',
    className,
    weekLabel: formatWeekLabel(weekStartDate, lang),
    wordsLearned,
    accuracyPct,
    gamesPlayed: gamesPlayed ?? 0,
    currentStreak: user.streak ?? 0,
  };
  const email = renderDigest(lang, data);

  // 6. Send via Resend HTTP API. On failure, roll back the idempotency
  // row so the next cron pass can retry rather than skipping forever.
  const resendKey = env('RESEND_API_KEY');
  if (!resendKey) {
    await supabase.from('digest_send_log')
      .delete()
      .eq('student_uid', studentUid)
      .eq('week_start_date', weekStartDate);
    return jsonResp({ ok: false, reason: 'missing_resend_key' }, 500);
  }

  const fromEmail = env('DIGEST_FROM_EMAIL') ?? 'Vocaband <noreply@vocaband.com>';

  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [user.parent_email],
      subject: email.subject,
      html: email.html,
    }),
  });

  if (!resendResp.ok) {
    const errText = await resendResp.text().catch(() => '<no body>');
    await supabase.from('digest_send_log')
      .delete()
      .eq('student_uid', studentUid)
      .eq('week_start_date', weekStartDate);
    return jsonResp({
      ok: false,
      reason: 'resend_error',
      status: resendResp.status,
      error: errText,
    }, 502);
  }

  // 7. Stamp the resend id onto the log row for outbound tracing.
  const resendData = await resendResp.json().catch(() => ({} as { id?: string }));
  if (resendData?.id) {
    await supabase.from('digest_send_log')
      .update({ resend_email_id: resendData.id })
      .eq('student_uid', studentUid)
      .eq('week_start_date', weekStartDate);
  }

  return jsonResp({
    ok: true,
    student_uid: studentUid,
    week_start_date: weekStartDate,
    resend_id: resendData?.id ?? null,
  }, 200);
});
