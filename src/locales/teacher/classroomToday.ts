/**
 * Locale strings for the redesigned Classroom Today panel.
 *
 * Scoped to just the new design's stat row, pulse cards, and
 * activity chart (the bits we adopt into the existing v2 Today
 * tab additively).  Tab labels, page chrome, and back button
 * stay in the existing `classroom.ts` since those pieces of UI
 * are not being replaced.
 */
import type { Language } from "../../hooks/useLanguage";
import type { ClassroomTodayStrings } from "../../components/classroom/v2/types";

export const classroomTodayT: Record<Language, ClassroomTodayStrings> = {
  en: {
    stats: {
      plays: "Plays this week",
      avgScore: "Avg score",
      activeStudents: "Active students",
      playsShort: "Plays",
      avgScoreShort: "Avg",
      activeShort: "Active",
    },
    pulse: {
      ontrack: { label: "On track", desc: "≥70% and active this week" },
      attn: { label: "Needs attention", desc: "Low scores or stuck on specific words" },
      idle: { label: "Not playing", desc: "No activity in 7+ days" },
    },
    chart: {
      title: "Class activity — last 7 days",
      sub: "Average score across every play, day by day. Gaps mean no plays that day.",
    },
  },
  he: {
    stats: {
      plays: "משחקים השבוע",
      avgScore: "ציון ממוצע",
      activeStudents: "תלמידים פעילים",
      playsShort: "משחקים",
      avgScoreShort: "ממוצע",
      activeShort: "פעילים",
    },
    pulse: {
      ontrack: { label: "במסלול", desc: "≥70% ופעילים השבוע" },
      attn: { label: "דורש תשומת לב", desc: "ציונים נמוכים או תקועים על מילים מסוימות" },
      idle: { label: "לא משחקים", desc: "ללא פעילות 7+ ימים" },
    },
    chart: {
      title: "פעילות הכיתה — 7 הימים האחרונים",
      sub: "ציון ממוצע בכל משחק, יום אחר יום. פערים פירושם אין משחקים באותו יום.",
    },
  },
  ar: {
    stats: {
      plays: "الألعاب هذا الأسبوع",
      avgScore: "متوسط الدرجة",
      activeStudents: "الطلاب النشطون",
      playsShort: "الألعاب",
      avgScoreShort: "المتوسط",
      activeShort: "النشطون",
    },
    pulse: {
      ontrack: { label: "على المسار", desc: "≥٧٠٪ ونشطون هذا الأسبوع" },
      attn: { label: "يحتاج اهتمام", desc: "درجات منخفضة أو عالقون عند كلمات معينة" },
      idle: { label: "لا يلعبون", desc: "بدون نشاط ٧+ أيام" },
    },
    chart: {
      title: "نشاط الفصل — آخر ٧ أيام",
      sub: "متوسط الدرجة عبر كل لعبة، يومًا بيوم. الفجوات تعني عدم وجود ألعاب في ذلك اليوم.",
    },
  },
  ru: {
    stats: {
      plays: "Plays this week",
      avgScore: "Avg score",
      activeStudents: "Active students",
      playsShort: "Plays",
      avgScoreShort: "Avg",
      activeShort: "Active",
    },
    pulse: {
      ontrack: { label: "On track", desc: "≥70% and active this week" },
      attn: { label: "Needs attention", desc: "Low scores or stuck on specific words" },
      idle: { label: "Not playing", desc: "No activity in 7+ days" },
    },
    chart: {
      title: "Class activity — last 7 days",
      sub: "Average score across every play, day by day. Gaps mean no plays that day.",
    },
  },
};
