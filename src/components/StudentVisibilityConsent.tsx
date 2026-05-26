/**
 * StudentVisibilityConsent — first-login disclosure modal for
 * students explaining that their teacher can see what they play.
 *
 * Required affirmation: the student must tick "I read this. I
 * understand my teacher sees my plays." before the Continue button
 * enables.  Acceptance is recorded in:
 *   - localStorage (`vocaband_student_visibility_version`)
 *   - consent_log table (`action = 'accept_student_visibility'`)
 *
 * Re-prompts only when STUDENT_VISIBILITY_VERSION changes.  Doesn't
 * fire every login on purpose — once a student has affirmed, nagging
 * them every session would erode the signal of the acknowledgement
 * AND interfere with the gameplay flow.  Bumping the version is the
 * audit-loggable way to re-prompt all students if disclosure changes.
 *
 * Trilingual (EN / HE / AR).  RTL handled via `dir` on the modal
 * root + Tailwind `rtl:` variants for any positioned content.
 */
import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import type { Language } from "../hooks/useLanguage";
import {
  STUDENT_VISIBILITY_VERSION,
  CLIENT_STORAGE_KEYS,
} from "../config/privacy-config";
import ModalShell, { ModalPrimaryButton } from "./ui/ModalShell";

interface StudentVisibilityConsentProps {
  /** Authenticated student's uid — required to record the
   *  acceptance against a specific account.  When omitted (guest
   *  Quick Play students), the modal still gates the UI and writes
   *  the localStorage flag, but skips the consent_log insert. */
  studentUid?: string | null;
  /** Optional callback fired once acceptance is recorded.  Useful
   *  when the host wants to trigger a refetch or analytics event. */
  onAccepted?: () => void;
}

interface CopyBlock {
  title: string;
  subtitle: string;
  intro: string;
  bullets: Array<{ emoji: string; title: string; body: string }>;
  checkbox: string;
  cta: string;
  saving: string;
}

const COPY: Record<Language, CopyBlock> = {
  en: {
    title: "Before you start playing",
    subtitle: "A quick heads-up — please read",
    intro: "Hi! Before you start, you should know how Vocaband works:",
    bullets: [
      {
        emoji: "👀",
        title: "Your teacher can see your gameplay",
        body:
          "Your scores, which words you got right or wrong, time spent, and which games you played all show up on your teacher's dashboard.",
      },
      {
        emoji: "👥",
        title: "Only your teacher",
        body:
          "Other students don't see your scores. Other classes don't see them either. Just the teacher of your class.",
      },
      {
        emoji: "🎯",
        title: "Why this matters",
        body:
          "Your teacher uses what they see to choose which words the class should practise next and to know who needs extra help.",
      },
      {
        emoji: "🔒",
        title: "We don't sell your data",
        body:
          "Vocaband never sells your info or uses it for ads. It's stored safely in the EU.",
      },
      {
        emoji: "👨‍👩‍👧",
        title: "If you're under 13",
        body:
          "Please make sure your parent or guardian knows you're using this. They can email your school anytime to ask for your data to be deleted.",
      },
      {
        emoji: "📧",
        title: "Your rights",
        body:
          "You can ask your teacher to delete your data anytime, and your school can request a full export on your behalf.",
      },
    ],
    checkbox: "I read this. I understand my teacher sees what I play.",
    cta: "Continue playing →",
    saving: "Saving…",
  },
  he: {
    title: "לפני שתתחיל לשחק",
    subtitle: "הערה מהירה — נא לקרוא",
    intro: "היי! לפני שאתה מתחיל, חשוב שתדע איך Vocaband עובד:",
    bullets: [
      {
        emoji: "👀",
        title: "המורה שלך רואה את המשחק שלך",
        body:
          "הציונים שלך, אילו מילים ענית נכון או טעית בהן, כמה זמן שיחקת ובאילו משחקים — כל זה מופיע בלוח הבקרה של המורה.",
      },
      {
        emoji: "👥",
        title: "רק המורה שלך",
        body:
          "תלמידים אחרים לא רואים את הציונים שלך. כיתות אחרות גם לא. רק המורה של הכיתה שלך.",
      },
      {
        emoji: "🎯",
        title: "למה זה חשוב",
        body:
          "המורה משתמש במידע כדי לבחור אילו מילים לתרגל הלאה ולדעת מי צריך עזרה נוספת.",
      },
      {
        emoji: "🔒",
        title: "אנחנו לא מוכרים את הנתונים שלך",
        body:
          "Vocaband לעולם לא מוכרת את המידע שלך ולא משתמשת בו למודעות. הוא מאוחסן באופן מאובטח באיחוד האירופי.",
      },
      {
        emoji: "👨‍👩‍👧",
        title: "אם אתה מתחת לגיל 13",
        body:
          "ודא שההורה או האפוטרופוס שלך יודע שאתה משתמש באפליקציה. הם יכולים לפנות לבית הספר בכל עת ולבקש למחוק את הנתונים שלך.",
      },
      {
        emoji: "📧",
        title: "הזכויות שלך",
        body:
          "אתה יכול לבקש מהמורה למחוק את הנתונים שלך בכל עת, ובית הספר יכול לבקש ייצוא מלא בשמך.",
      },
    ],
    checkbox: "קראתי. אני מבין שהמורה שלי רואה את מה שאני משחק.",
    cta: "המשך לשחק →",
    saving: "שומר…",
  },
  ar: {
    title: "قبل أن تبدأ اللعب",
    subtitle: "تنبيه سريع — يرجى القراءة",
    intro: "مرحبًا! قبل أن تبدأ، عليك أن تعرف كيف يعمل Vocaband:",
    bullets: [
      {
        emoji: "👀",
        title: "يمكن لمعلمك أن يرى ما تلعبه",
        body:
          "نتائجك، الكلمات التي أجبت عليها بشكل صحيح أو خطأ، الوقت الذي قضيته، والألعاب التي لعبتها — كل ذلك يظهر في لوحة المعلم.",
      },
      {
        emoji: "👥",
        title: "معلمك فقط",
        body:
          "لا يرى الطلاب الآخرون نتائجك. والصفوف الأخرى أيضًا لا تراها. فقط معلم صفك.",
      },
      {
        emoji: "🎯",
        title: "لماذا يهم ذلك",
        body:
          "يستخدم معلمك هذه المعلومات لاختيار الكلمات التي يجب التدرّب عليها ولمعرفة من يحتاج إلى مساعدة إضافية.",
      },
      {
        emoji: "🔒",
        title: "نحن لا نبيع بياناتك",
        body:
          "Vocaband لا يبيع معلوماتك أبدًا ولا يستخدمها للإعلانات. وهي مخزّنة بأمان في الاتحاد الأوروبي.",
      },
      {
        emoji: "👨‍👩‍👧",
        title: "إذا كنت تحت سن 13",
        body:
          "تأكّد من أن والديك أو وليّ أمرك يعلم أنك تستخدم هذا التطبيق. يمكنهم مراسلة مدرستك في أي وقت لطلب حذف بياناتك.",
      },
      {
        emoji: "📧",
        title: "حقوقك",
        body:
          "يمكنك أن تطلب من معلمك حذف بياناتك في أي وقت، ويمكن لمدرستك طلب تصدير كامل نيابةً عنك.",
      },
    ],
    checkbox: "قرأت ذلك. أتفهّم أن معلمي يرى ما ألعبه.",
    cta: "تابع اللعب ←",
    saving: "جارٍ الحفظ…",
  },
  ru: {
    title: "Before you start playing",
    subtitle: "A quick heads-up — please read",
    intro: "Hi! Before you start, you should know how Vocaband works:",
    bullets: [
      {
        emoji: "👀",
        title: "Your teacher can see your gameplay",
        body:
          "Your scores, which words you got right or wrong, time spent, and which games you played all show up on your teacher's dashboard.",
      },
      {
        emoji: "👥",
        title: "Only your teacher",
        body:
          "Other students don't see your scores. Other classes don't see them either. Just the teacher of your class.",
      },
      {
        emoji: "🎯",
        title: "Why this matters",
        body:
          "Your teacher uses what they see to choose which words the class should practise next and to know who needs extra help.",
      },
      {
        emoji: "🔒",
        title: "We don't sell your data",
        body:
          "Vocaband never sells your info or uses it for ads. It's stored safely in the EU.",
      },
      {
        emoji: "👨‍👩‍👧",
        title: "If you're under 13",
        body:
          "Please make sure your parent or guardian knows you're using this. They can email your school anytime to ask for your data to be deleted.",
      },
      {
        emoji: "📧",
        title: "Your rights",
        body:
          "You can ask your teacher to delete your data anytime, and your school can request a full export on your behalf.",
      },
    ],
    checkbox: "I read this. I understand my teacher sees what I play.",
    cta: "Continue playing →",
    saving: "Saving…",
  },
};

/**
 * Cheap synchronous check the parent can use to skip mounting the
 * modal entirely when the student has already accepted this version.
 * Avoids the modal flashing on every render of the dashboard.
 */
export function hasAcceptedStudentVisibility(): boolean {
  try {
    return localStorage.getItem(CLIENT_STORAGE_KEYS.studentVisibilityVersion) === STUDENT_VISIBILITY_VERSION;
  } catch {
    return false;
  }
}

export default function StudentVisibilityConsent({ studentUid, onAccepted }: StudentVisibilityConsentProps) {
  const { language, dir } = useLanguage();
  const t = COPY[language] || COPY.en;

  const [open, setOpen] = useState(() => !hasAcceptedStudentVisibility());
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cross-tab safety: if the student accepts on another tab while
  // this one is sitting on a stale render, refresh the gate.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLIENT_STORAGE_KEYS.studentVisibilityVersion && hasAcceptedStudentVisibility()) {
        setOpen(false);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const accept = async () => {
    if (!checked || saving) return;
    setSaving(true);
    try {
      localStorage.setItem(CLIENT_STORAGE_KEYS.studentVisibilityVersion, STUDENT_VISIBILITY_VERSION);
    } catch {
      // Storage may be blocked (private browsing); the consent_log
      // insert below still creates a server-side audit record.
    }
    if (studentUid) {
      try {
        await supabase.from("consent_log").insert({
          uid: studentUid,
          policy_version: STUDENT_VISIBILITY_VERSION,
          terms_version: STUDENT_VISIBILITY_VERSION,
          action: "accept_student_visibility",
        });
      } catch {
        // Server insert is best-effort — localStorage already keeps
        // the student from being re-prompted on this device.  If the
        // network fails we still let them play; the audit trail
        // catches up on the next successful action.
      }
    }
    setSaving(false);
    setOpen(false);
    onAccepted?.();
  };

  return (
    <ModalShell
      open={open}
      // Hard gate — no escape route.  onClose is wired to a no-op so
      // backdrop clicks and Esc don't dismiss the disclosure.  The
      // ONLY way out is ticking the checkbox + tapping Continue.
      onClose={() => { /* hard gate */ }}
      variant="brand"
      icon="👋"
      title={t.title}
      subtitle={t.subtitle}
      dir={dir}
      wide
      zIndex={120}
      // Use the available vertical space (viewport minus header/footer
      // chrome + outer padding) so the disclosure fits on one screen
      // without an internal scrollbar on desktop or mobile.  Pair with
      // a tighter body padding so iPhone-SE-class screens (667px tall)
      // also fit the full disclosure.
      bodyMaxHeight="calc(100vh - 150px)"
      bodyClassName="px-5 sm:px-6 py-3 sm:py-4 text-[14px] leading-[1.55] overflow-y-auto"
      footer={
        <ModalPrimaryButton
          onClick={accept}
          disabled={!checked || saving}
          className="w-full justify-center"
        >
          {saving ? t.saving : t.cta}
        </ModalPrimaryButton>
      }
    >
      <p className="mb-2 text-[11px] font-semibold" style={{ color: "#1F1147" }}>
        {t.intro}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {t.bullets.map((b, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-xl p-2"
            style={{
              background: "rgba(99,102,241,0.04)",
              border: "1px solid rgba(99,102,241,0.10)",
            }}
          >
            <div
              className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] text-[14px]"
              style={{
                background: "linear-gradient(135deg, #EEF0FF, #F8E8FF)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
              aria-hidden
            >
              {b.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-extrabold text-[#1F1147] leading-tight">
                {b.title}
              </div>
              <div className="mt-0.5 text-[10.5px] text-[#4A3B7A] leading-[1.35]">
                {b.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      <label
        className="mt-2.5 flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2"
        style={{
          background: checked ? "rgba(94,201,166,0.12)" : "rgba(99,102,241,0.06)",
          border: checked
            ? "1.5px solid rgba(63,166,137,0.40)"
            : "1.5px solid rgba(99,102,241,0.18)",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-indigo-500/30 text-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-0"
        />
        <span className="text-[11.5px] font-bold text-[#1F1147] leading-snug">
          {t.checkbox}
        </span>
      </label>
    </ModalShell>
  );
}
