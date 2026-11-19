import type { SupabaseClient } from '@supabase/supabase-js';

const copy = {
  he: {
    ending: 'תקופת הניסיון ב־Vocaband מסתיימת בקרוב',
    ended: 'תקופת הניסיון ב־Vocaband הסתיימה',
    body: 'המסלול החינמי זמין לך. פרטי המנוי והאפשרויות מופיעים באזור המורה.',
    stop: 'הסרה מדיוור',
    ad: 'פרסומת',
  },
  ar: {
    ending: 'ستنتهي فترة Vocaband التجريبية قريبًا',
    ended: 'انتهت فترة Vocaband التجريبية',
    body: 'يمكنك متابعة استخدام الخطة المجانية. ستجد تفاصيل الاشتراك والخيارات في حساب المعلّم.',
    stop: 'إلغاء الاشتراك',
    ad: 'إعلان',
  },
  en: {
    ending: 'Your Vocaband trial is ending soon',
    ended: 'Your Vocaband trial has ended',
    body: 'Your free plan is available. Open your teacher account for subscription options.',
    stop: 'Unsubscribe',
    ad: 'Advertisement',
  },
};
export async function deliverTeacherMail(
  db: SupabaseClient,
  env: Record<string, string | undefined>,
  transport = fetch
) {
  if (env.VOCABAND_TEACHER_EMAIL_ENABLED !== 'true') return;
  if (!env.RESEND_API_KEY || !env.VOCABAND_MAIL_FROM || !env.VOCABAND_MAIL_BUSINESS_IDENTITY)
    throw new Error('Mail configuration incomplete');
  const claimed = await db.rpc('claim_teacher_lifecycle_mail');
  if (claimed.error) throw claimed.error;
  let failed = false;
  for (const m of claimed.data ?? []) {
    const t = copy[m.language as keyof typeof copy] ?? copy.en;
    const unsub = 'https://vocaband.com/api/teacher/mail/unsubscribe/' + m.unsubscribe_id;
    const subject = m.kind === 'news' ? m.title : m.kind === 'trial_ending' ? t.ending : t.ended;
    const body = m.kind === 'news' ? m.message : t.body;
    try {
      const pref = await db
        .from('teacher_mail_preferences')
        .select('offers')
        .eq('unsubscribe_id', m.unsubscribe_id)
        .maybeSingle();
      if (pref.error) throw pref.error;
      if (!pref.data?.offers) continue;
      const sent = await transport('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(12000),
        headers: {
          Authorization: 'Bearer ' + env.RESEND_API_KEY,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'teacher-mail/' + m.id,
        },
        body: JSON.stringify({
          from: env.VOCABAND_MAIL_FROM,
          to: [m.email],
          subject: (m.language === 'he' ? t.ad : 'פרסומת | ' + t.ad) + ' | ' + subject,
          text: [
            body,
            'https://vocaband.com/?billing=1',
            env.VOCABAND_MAIL_BUSINESS_IDENTITY,
            t.stop + ' ' + unsub,
          ].join('\n\n'),
          headers: {
            'List-Unsubscribe': '<' + unsub + '>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      });
      if (!sent.ok) throw new Error('Delivery was not accepted');
      const saved = await db
        .from('teacher_mail_queue')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', m.id);
      if (saved.error) throw saved.error;
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error('Mail delivery must be retried');
}
