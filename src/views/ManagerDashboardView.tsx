import { useCallback, useEffect, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  School, Users, BookOpen, GraduationCap, Activity, Gamepad2,
  Star, RefreshCw, LogOut, AlertTriangle, Mail,
} from "lucide-react";
import {
  supabase,
  fetchManagerOverview,
  type AppUser,
  type ManagerOverview,
  type ManagerTeacherRow,
} from "../core/supabase";
import { useLanguage, type Language } from "../hooks/useLanguage";
import type { View } from "../core/views";

/**
 * School-manager (principal) dashboard — read-only oversight of one school's
 * teachers, classes, students, and engagement.
 *
 * All data comes from the `manager_overview` RPC, which self-scopes to the
 * caller's school server-side (SECURITY DEFINER) and aggregates so we never
 * ship raw progress rows.  A non-manager (or a manager with no school) gets
 * a null payload and sees the empty state — we never leak that other schools
 * exist.  See migration 20260623000000_school_manager.sql.
 */

// Classes with no student activity in this many days are flagged "dormant"
// so the principal knows where to nudge.
const DORMANT_DAYS = 14;

type Strings = {
  title: string;
  subtitle: string;
  refresh: string;
  signOut: string;
  loading: string;
  emptyTitle: string;
  emptyBody: string;
  kTeachers: string;
  kClasses: string;
  kStudents: string;
  kActive: string;
  kGames: string;
  kXp: string;
  rosterTitle: string;
  rosterEmpty: string;
  colClasses: string;
  colStudents: string;
  colActive: string;
  lastActive: (s: string) => string;
  neverActive: string;
  dormant: string;
};

const T: Record<"en" | "he" | "ar", Strings> = {
  en: {
    title: "Principal dashboard",
    subtitle: "Read-only overview of your school",
    refresh: "Refresh",
    signOut: "Sign out",
    loading: "Loading your school…",
    emptyTitle: "No school linked yet",
    emptyBody:
      "Your account isn't attached to a school, or it has no teachers yet. Ask your Vocaband administrator to assign your school.",
    kTeachers: "Teachers",
    kClasses: "Classes",
    kStudents: "Students",
    kActive: "Active (7d)",
    kGames: "Games (7d)",
    kXp: "Total XP",
    rosterTitle: "Teachers",
    rosterEmpty: "No teachers assigned to this school yet.",
    colClasses: "classes",
    colStudents: "students",
    colActive: "active this week",
    lastActive: (s) => `Last activity ${s}`,
    neverActive: "No activity yet",
    dormant: "Quiet 2+ weeks",
  },
  he: {
    title: "לוח המנהל/ת",
    subtitle: "סקירה לקריאה בלבד של בית הספר שלך",
    refresh: "רענון",
    signOut: "התנתקות",
    loading: "טוען את בית הספר שלך…",
    emptyTitle: "עדיין לא משויך בית ספר",
    emptyBody:
      "החשבון שלך אינו משויך לבית ספר, או שאין בו מורים עדיין. בקש/י ממנהל Vocaband לשייך את בית הספר שלך.",
    kTeachers: "מורים",
    kClasses: "כיתות",
    kStudents: "תלמידים",
    kActive: "פעילים (7 ימים)",
    kGames: "משחקים (7 ימים)",
    kXp: 'סה"כ XP',
    rosterTitle: "מורים",
    rosterEmpty: "עדיין לא שויכו מורים לבית ספר זה.",
    colClasses: "כיתות",
    colStudents: "תלמידים",
    colActive: "פעילים השבוע",
    lastActive: (s) => `פעילות אחרונה ${s}`,
    neverActive: "אין פעילות עדיין",
    dormant: "שקט שבועיים+",
  },
  ar: {
    title: "لوحة المدير",
    subtitle: "نظرة عامة للقراءة فقط على مدرستك",
    refresh: "تحديث",
    signOut: "تسجيل الخروج",
    loading: "جارٍ تحميل مدرستك…",
    emptyTitle: "لا توجد مدرسة مرتبطة بعد",
    emptyBody:
      "حسابك غير مرتبط بمدرسة، أو لا يضم معلمين بعد. اطلب من مسؤول Vocaband ربط مدرستك.",
    kTeachers: "المعلمون",
    kClasses: "الصفوف",
    kStudents: "الطلاب",
    kActive: "نشِطون (7 أيام)",
    kGames: "ألعاب (7 أيام)",
    kXp: "إجمالي XP",
    rosterTitle: "المعلمون",
    rosterEmpty: "لم يتم تعيين معلمين لهذه المدرسة بعد.",
    colClasses: "صفوف",
    colStudents: "طلاب",
    colActive: "نشِطون هذا الأسبوع",
    lastActive: (s) => `آخر نشاط ${s}`,
    neverActive: "لا يوجد نشاط بعد",
    dormant: "هادئ منذ أسبوعين+",
  },
};

function pickStrings(language: Language): Strings {
  return T[(language === "he" || language === "ar" ? language : "en")];
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.floor(diff / 86_400_000);
}

function relativeDays(iso: string | null, t: Strings): string {
  const d = daysSince(iso);
  if (d === null) return t.neverActive;
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  return `${d}d ago`;
}

interface KpiTileProps {
  icon: ReactNode;
  label: string;
  value: number;
  gradient: string;
}

function KpiTile({ icon, label, value, gradient }: KpiTileProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`rounded-3xl p-5 text-white shadow-lg bg-gradient-to-br ${gradient}`}
    >
      <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm mb-3">
        {icon}
      </div>
      <div className="text-3xl font-extrabold leading-none">{value.toLocaleString()}</div>
      <div className="text-sm font-medium text-white/85 mt-1">{label}</div>
    </motion.div>
  );
}

interface ManagerDashboardViewProps {
  user: AppUser | null;
  setView: Dispatch<SetStateAction<View>>;
  setUser: Dispatch<SetStateAction<AppUser | null>>;
}

export default function ManagerDashboardView({ setView, setUser }: ManagerDashboardViewProps) {
  const { language, dir, isRTL, textAlign } = useLanguage();
  const t = pickStrings(language);

  const [data, setData] = useState<ManagerOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const overview = await fetchManagerOverview();
    setData(overview);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetch effect; same pattern as AdminSecurityView etc.
    void load();
  }, [load]);

  const handleSignOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch { /* best-effort */ }
    setUser(null);
    setView("public-landing");
  }, [setUser, setView]);

  const totals = data?.totals;
  const teachers: ManagerTeacherRow[] = data?.teachers ?? [];
  const hasSchool = Boolean(data?.school) && teachers.length >= 0 && !!totals;

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-fuchsia-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 mb-6 text-white shadow-lg shadow-violet-500/20 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500"
        >
          <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm shrink-0">
              <School className="w-7 h-7" />
            </div>
            <div className={`flex-1 min-w-0 ${textAlign}`}>
              <h1 className="text-2xl font-extrabold truncate">
                {data?.school?.name ?? t.title}
              </h1>
              <p className="text-sm text-white/85">{data?.school ? t.subtitle : t.title}</p>
            </div>
          </div>
          <div className={`flex gap-2 mt-5 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={() => void load()}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {t.refresh}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.signOut}
            </button>
          </div>
        </motion.div>

        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-500">
            <RefreshCw className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm font-medium">{t.loading}</p>
          </div>
        ) : !hasSchool ? (
          <div className={`rounded-3xl bg-white shadow-sm p-8 text-center ${textAlign}`}>
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-stone-800 mb-2">{t.emptyTitle}</h2>
            <p className="text-sm text-stone-500 max-w-md mx-auto">{t.emptyBody}</p>
          </div>
        ) : (
          <>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <KpiTile icon={<Users className="w-5 h-5" />} label={t.kTeachers} value={totals!.teachers} gradient="from-indigo-500 to-violet-500" />
              <KpiTile icon={<BookOpen className="w-5 h-5" />} label={t.kClasses} value={totals!.classes} gradient="from-sky-500 to-blue-500" />
              <KpiTile icon={<GraduationCap className="w-5 h-5" />} label={t.kStudents} value={totals!.students} gradient="from-emerald-500 to-teal-500" />
              <KpiTile icon={<Activity className="w-5 h-5" />} label={t.kActive} value={totals!.active_students_7d} gradient="from-fuchsia-500 to-pink-500" />
              <KpiTile icon={<Gamepad2 className="w-5 h-5" />} label={t.kGames} value={totals!.games_7d} gradient="from-violet-500 to-purple-500" />
              <KpiTile icon={<Star className="w-5 h-5" />} label={t.kXp} value={totals!.total_xp} gradient="from-amber-500 via-orange-500 to-rose-500" />
            </div>

            {/* Teacher roster */}
            <h2 className={`text-lg font-bold text-stone-800 mb-3 ${textAlign}`}>{t.rosterTitle}</h2>
            {teachers.length === 0 ? (
              <p className={`text-sm text-stone-500 ${textAlign}`}>{t.rosterEmpty}</p>
            ) : (
              <div className="space-y-3">
                {teachers.map((teacher) => {
                  const dormant = (daysSince(teacher.last_activity) ?? Infinity) > DORMANT_DAYS;
                  return (
                    <motion.div
                      key={teacher.uid}
                      whileHover={{ scale: 1.01 }}
                      className="rounded-2xl bg-white shadow-sm p-4"
                    >
                      <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-indigo-600 font-bold shrink-0">
                          {(teacher.display_name || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className={`flex-1 min-w-0 ${textAlign}`}>
                          <div className="font-semibold text-stone-800 truncate">
                            {teacher.display_name || teacher.email || "—"}
                          </div>
                          {teacher.email && (
                            <div className={`flex items-center gap-1 text-xs text-stone-400 truncate ${isRTL ? "flex-row-reverse" : ""}`}>
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{teacher.email}</span>
                            </div>
                          )}
                        </div>
                        {dormant && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 shrink-0">
                            <AlertTriangle className="w-3 h-3" />
                            {t.dormant}
                          </span>
                        )}
                      </div>
                      <div className={`flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span className="text-stone-600"><b className="text-stone-800">{teacher.class_count}</b> {t.colClasses}</span>
                        <span className="text-stone-600"><b className="text-stone-800">{teacher.student_count}</b> {t.colStudents}</span>
                        <span className="text-stone-600"><b className="text-stone-800">{teacher.active_students_7d}</b> {t.colActive}</span>
                        <span className="text-stone-400">{t.lastActive(relativeDays(teacher.last_activity, t))}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
