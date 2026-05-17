// Parent Weekly Digest — email templates.
//
// One template per language. Returns subject + HTML body for the
// Resend POST. Kept module-level (not closures) so the email-shape
// changes show up clean in diff and so a future test harness can
// snapshot each language without spinning up the full function.
//
// Design constraints:
//   - Inline styles only — Gmail/Outlook strip <style> blocks
//   - No external assets — image hosts kill spam-scores; just text
//   - Single-column, max-width 560px — readable on phone + desktop
//   - dir="rtl" on the wrapper for he/ar — flips the whole layout
//   - Stats are integers; the worker rounds before passing in
//
// The "stop these emails" instruction is plain English/Hebrew/Arabic
// rather than a magic unsubscribe link — students manage the opt-in
// from their own Privacy Settings, not from an email link. This
// avoids one-click-unsubscribe being abusable by anyone who guesses
// the URL.

export type DigestLang = 'en' | 'he' | 'ar';

export interface DigestData {
  studentName: string;
  className: string | null;
  weekLabel: string;          // e.g. "May 9 - May 15"
  wordsLearned: number;       // distinct word_ids correctly answered this week
  accuracyPct: number;        // 0-100, rounded
  gamesPlayed: number;
  currentStreak: number;      // days
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

const COLORS = {
  bg: '#fafaf9',
  card: '#ffffff',
  ink: '#0f172a',
  muted: '#64748b',
  accent: '#4f46e5',
  hero: '#f0fdf4',
  heroInk: '#166534',
};

function statCard(label: string, value: string | number, isRTL: boolean): string {
  return `
    <td align="${isRTL ? 'right' : 'left'}" valign="top" style="padding:12px 16px;background:${COLORS.hero};border-radius:12px;width:50%;">
      <div style="font-size:32px;font-weight:900;color:${COLORS.heroInk};line-height:1;">${value}</div>
      <div style="font-size:12px;color:${COLORS.heroInk};opacity:0.7;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">${label}</div>
    </td>`;
}

function wrap(lang: DigestLang, subject: string, body: string): RenderedEmail {
  const isRTL = lang === 'he' || lang === 'ar';
  const html = `<!doctype html>
<html lang="${lang}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px 12px;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${COLORS.ink};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:560px;width:100%;background:${COLORS.card};border-radius:20px;padding:32px 28px;">
    <tr><td>${body}</td></tr>
  </table>
  <p style="max-width:560px;margin:18px auto 0;font-size:11px;color:${COLORS.muted};text-align:center;line-height:1.5;">
    Vocaband &middot; <a href="https://www.vocaband.com" style="color:${COLORS.muted};">vocaband.com</a>
  </p>
</body>
</html>`;
  return { subject, html };
}

function renderEn(d: DigestData): RenderedEmail {
  const classLine = d.className ? ` from <strong>${d.className}</strong>` : '';
  const subject = `${d.studentName}'s English week on Vocaband`;
  const body = `
    <h1 style="font-size:22px;font-weight:900;margin:0 0 6px;color:${COLORS.ink};">
      ${d.studentName}'s week in review
    </h1>
    <p style="font-size:14px;color:${COLORS.muted};margin:0 0 24px;">
      ${d.weekLabel}${classLine}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="8" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        ${statCard('Words learned', d.wordsLearned, false)}
        ${statCard('Accuracy', `${d.accuracyPct}%`, false)}
      </tr>
      <tr>
        ${statCard('Games played', d.gamesPlayed, false)}
        ${statCard('Day streak', d.currentStreak, false)}
      </tr>
    </table>
    <p style="font-size:14px;line-height:1.6;color:${COLORS.ink};margin:0 0 18px;">
      A short note about ${d.studentName}'s English vocabulary work this week. We send this every Friday afternoon to help you stay in the loop.
    </p>
    <p style="font-size:12px;color:${COLORS.muted};margin:24px 0 0;line-height:1.5;">
      To stop these emails, ${d.studentName} can remove your address in <strong>Vocaband &rarr; Privacy &amp; Data Settings</strong>.
    </p>`;
  return wrap('en', subject, body);
}

function renderHe(d: DigestData): RenderedEmail {
  const classLine = d.className ? ` &middot; <strong>${d.className}</strong>` : '';
  const subject = `השבוע של ${d.studentName} ב-Vocaband`;
  const body = `
    <h1 style="font-size:22px;font-weight:900;margin:0 0 6px;color:${COLORS.ink};">
      סיכום השבוע של ${d.studentName}
    </h1>
    <p style="font-size:14px;color:${COLORS.muted};margin:0 0 24px;">
      ${d.weekLabel}${classLine}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="8" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        ${statCard('מילים חדשות', d.wordsLearned, true)}
        ${statCard('דיוק', `${d.accuracyPct}%`, true)}
      </tr>
      <tr>
        ${statCard('משחקים', d.gamesPlayed, true)}
        ${statCard('רצף ימים', d.currentStreak, true)}
      </tr>
    </table>
    <p style="font-size:14px;line-height:1.6;color:${COLORS.ink};margin:0 0 18px;">
      סיכום קצר על העבודה של ${d.studentName} באוצר המילים באנגלית השבוע. אנחנו שולחים את זה כל יום שישי אחר הצהריים כדי לעזור לכם להישאר מעודכנים.
    </p>
    <p style="font-size:12px;color:${COLORS.muted};margin:24px 0 0;line-height:1.5;">
      להפסקת המיילים, ${d.studentName} יכול/ה להסיר את הכתובת שלכם ב-<strong>Vocaband &rarr; פרטיות והגדרות נתונים</strong>.
    </p>`;
  return wrap('he', subject, body);
}

function renderAr(d: DigestData): RenderedEmail {
  const classLine = d.className ? ` &middot; <strong>${d.className}</strong>` : '';
  const subject = `أسبوع ${d.studentName} في Vocaband`;
  const body = `
    <h1 style="font-size:22px;font-weight:900;margin:0 0 6px;color:${COLORS.ink};">
      ملخص أسبوع ${d.studentName}
    </h1>
    <p style="font-size:14px;color:${COLORS.muted};margin:0 0 24px;">
      ${d.weekLabel}${classLine}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="8" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        ${statCard('كلمات جديدة', d.wordsLearned, true)}
        ${statCard('الدقة', `${d.accuracyPct}%`, true)}
      </tr>
      <tr>
        ${statCard('الألعاب', d.gamesPlayed, true)}
        ${statCard('سلسلة الأيام', d.currentStreak, true)}
      </tr>
    </table>
    <p style="font-size:14px;line-height:1.6;color:${COLORS.ink};margin:0 0 18px;">
      ملخص قصير عن عمل ${d.studentName} في مفردات اللغة الإنجليزية هذا الأسبوع. نرسل هذا كل جمعة بعد الظهر لمساعدتك على البقاء على اطلاع.
    </p>
    <p style="font-size:12px;color:${COLORS.muted};margin:24px 0 0;line-height:1.5;">
      لإيقاف هذه الرسائل، يمكن لـ ${d.studentName} إزالة عنوانك من <strong>Vocaband &rarr; إعدادات الخصوصية والبيانات</strong>.
    </p>`;
  return wrap('ar', subject, body);
}

export function renderDigest(lang: DigestLang, d: DigestData): RenderedEmail {
  switch (lang) {
    case 'he': return renderHe(d);
    case 'ar': return renderAr(d);
    default:   return renderEn(d);
  }
}
