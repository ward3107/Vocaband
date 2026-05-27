/**
 * StudentWelcomeCard — shown only when the student has zero
 * assignments in their class (brand-new join, or teacher hasn't
 * created anything yet).  Without this, a fresh login lands on a
 * stack of empty-state widgets with one italic "no assignments yet"
 * line buried in the middle of the page — disorienting for a first
 * impression.
 *
 * The card explains the situation ("your teacher will share soon")
 * and points downward at the Daily Practice tiles + Class Minute
 * which work without any assignment (curated word pools, idiom
 * dataset, etc.) so the student can start earning XP immediately.
 *
 * Auto-hides itself once any assignment lands — the parent guards
 * the mount on studentAssignments.length === 0.
 */
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

interface StudentWelcomeCardProps {
  displayName: string;
}

export default function StudentWelcomeCard({ displayName }: StudentWelcomeCardProps) {
  const { language, dir } = useLanguage();
  const t = studentDashboardT[language];

  // First name only — feels personal without crowding the card.
  const firstName = (displayName || "").trim().split(/\s+/)[0] || displayName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      dir={dir}
      className="relative overflow-hidden rounded-2xl border border-indigo-500/[0.12] p-5 sm:p-6 text-start"
      style={{
        background:
          "linear-gradient(135deg, rgba(238,240,255,0.95) 0%, rgba(248,232,255,0.95) 100%)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 -end-8 w-32 h-32 rounded-full bg-fuchsia-300/30 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -start-10 w-28 h-28 rounded-full bg-indigo-300/30 blur-2xl"
      />

      <div className="relative flex items-start gap-3 sm:gap-4">
        <div
          className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-[14px] text-2xl sm:text-3xl"
          style={{
            background: "linear-gradient(135deg, #6366F1, #D946EF)",
            boxShadow: "0 8px 18px -10px rgba(139,92,246,0.55), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          <Sparkles size={22} className="text-white fill-white/30" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8B5CF6]">
            {t.welcomeEyebrow}
          </div>
          <h2 className="text-lg sm:text-xl font-black leading-tight text-[#1F1147]">
            {t.welcomeTitle(firstName)}
          </h2>
          <p className="mt-1.5 text-sm leading-snug font-semibold text-[#4A3B7A]">
            {t.welcomeSubtitle}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
