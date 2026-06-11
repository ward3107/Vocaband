import { useState, useEffect, useCallback, type ReactNode, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { motion } from 'motion/react';
import {
  School, LayoutDashboard, Users, BookOpen, Activity, GraduationCap, Star,
  Gamepad2, RefreshCw, LogOut, AlertTriangle, ArrowLeft, ArrowRight, Mail, TrendingUp, Award, CheckCircle2, Target,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  supabase, fetchManagerOverview, fetchManagerEngagement, fetchManagerTeacherDetail, fetchManagerClassDetail,
  type AppUser, type ManagerOverview, type ManagerEngagement, type ManagerTeacherDetail, type ManagerClassDetail,
} from '../core/supabase';
import { useLanguage, type Language } from '../hooks/useLanguage';
import { useTeacherTheme } from '../hooks/useTeacherTheme';
import type { View } from '../core/views';

/* ───────── i18n ───────── */
const T: Record<'en' | 'he' | 'ar', Record<string, string>> = {
  en: {
    role: 'Principal console', navOverview: 'Overview', navTeachers: 'Teachers', navClasses: 'Classes', navEngagement: 'Engagement',
    signOut: 'Sign out', refresh: 'Refresh', range: 'Last 14 days', backTeachers: 'Back to teachers', backClasses: 'Back to classes',
    loading: 'Loading…', emptyTitle: 'No school linked yet', emptyBody: "Your account isn't attached to a school yet. Ask your Vocaband administrator to assign your school.",
    kTeachers: 'Teachers', kClasses: 'Classes', kStudents: 'Students', kActive: 'Active (7d)', kGames: 'Games (7d)', kXp: 'Total XP', kAvg: 'Avg score',
    chEngagement: 'Active students · last 14 days', chGames: 'Games played · last 14 days', chStudents: 'Students by class', chXp: 'XP by teacher',
    hMostActive: 'Most active teacher', hNeedsAttention: 'Needs attention', hTopStudent: 'Top teacher (XP)', noData: 'No activity yet',
    colClasses: 'classes', colStudents: 'students', colActive: 'active', dormant: 'Quiet 2+ weeks',
    tdActivity: 'Activity · last 14 days', tdPerClass: 'Students per class', tdTopStudents: 'Top students',
    clTeacher: 'Teacher', cdScoreDist: 'Score distribution', cdActivity: 'Activity · last 14 days', cdAssignments: 'Assignments',
    enActive30: 'Active students · last 30 days', enGames: 'Games played · last 14 days', enDow: 'When students play', enMode: 'Popular game modes',
  },
  he: {
    role: 'לוח המנהל/ת', navOverview: 'סקירה', navTeachers: 'מורים', navClasses: 'כיתות', navEngagement: 'מעורבות',
    signOut: 'התנתקות', refresh: 'רענון', range: '14 ימים אחרונים', backTeachers: 'חזרה למורים', backClasses: 'חזרה לכיתות',
    loading: 'טוען…', emptyTitle: 'עדיין לא משויך בית ספר', emptyBody: 'החשבון שלך עדיין לא משויך לבית ספר. בקש/י ממנהל Vocaband לשייך את בית הספר שלך.',
    kTeachers: 'מורים', kClasses: 'כיתות', kStudents: 'תלמידים', kActive: 'פעילים (7 ימים)', kGames: 'משחקים (7 ימים)', kXp: 'סה"כ XP', kAvg: 'ציון ממוצע',
    chEngagement: 'תלמידים פעילים · 14 ימים', chGames: 'משחקים · 14 ימים', chStudents: 'תלמידים לפי כיתה', chXp: 'XP לפי מורה',
    hMostActive: 'המורה הפעיל ביותר', hNeedsAttention: 'דורש תשומת לב', hTopStudent: 'המורה המוביל (XP)', noData: 'אין פעילות עדיין',
    colClasses: 'כיתות', colStudents: 'תלמידים', colActive: 'פעילים', dormant: 'שקט שבועיים+',
    tdActivity: 'פעילות · 14 ימים', tdPerClass: 'תלמידים לכל כיתה', tdTopStudents: 'תלמידים מובילים',
    clTeacher: 'מורה', cdScoreDist: 'התפלגות ציונים', cdActivity: 'פעילות · 14 ימים', cdAssignments: 'מטלות',
    enActive30: 'תלמידים פעילים · 30 ימים', enGames: 'משחקים · 14 ימים', enDow: 'מתי תלמידים משחקים', enMode: 'מצבי משחק פופולריים',
  },
  ar: {
    role: 'لوحة المدير', navOverview: 'نظرة عامة', navTeachers: 'المعلمون', navClasses: 'الصفوف', navEngagement: 'التفاعل',
    signOut: 'تسجيل الخروج', refresh: 'تحديث', range: 'آخر 14 يومًا', backTeachers: 'العودة للمعلمين', backClasses: 'العودة للصفوف',
    loading: 'جارٍ التحميل…', emptyTitle: 'لا توجد مدرسة مرتبطة بعد', emptyBody: 'حسابك غير مرتبط بمدرسة بعد. اطلب من مسؤول Vocaband ربط مدرستك.',
    kTeachers: 'المعلمون', kClasses: 'الصفوف', kStudents: 'الطلاب', kActive: 'نشِطون (7 أيام)', kGames: 'ألعاب (7 أيام)', kXp: 'إجمالي XP', kAvg: 'متوسط الدرجات',
    chEngagement: 'الطلاب النشِطون · 14 يومًا', chGames: 'الألعاب · 14 يومًا', chStudents: 'الطلاب حسب الصف', chXp: 'XP حسب المعلم',
    hMostActive: 'المعلم الأكثر نشاطًا', hNeedsAttention: 'يحتاج إلى انتباه', hTopStudent: 'المعلم المتميز (XP)', noData: 'لا يوجد نشاط بعد',
    colClasses: 'صفوف', colStudents: 'طلاب', colActive: 'نشِطون', dormant: 'هادئ منذ أسبوعين+',
    tdActivity: 'النشاط · 14 يومًا', tdPerClass: 'الطلاب لكل صف', tdTopStudents: 'الطلاب المتميزون',
    clTeacher: 'المعلم', cdScoreDist: 'توزيع الدرجات', cdActivity: 'النشاط · 14 يومًا', cdAssignments: 'الواجبات',
    enActive30: 'الطلاب النشِطون · 30 يومًا', enGames: 'الألعاب · 14 يومًا', enDow: 'متى يلعب الطلاب', enMode: 'أنماط اللعب الشائعة',
  },
};
const DOW: Record<'en' | 'he' | 'ar', string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  he: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
  ar: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
};
const norm = (l: Language): 'en' | 'he' | 'ar' => (l === 'he' || l === 'ar') ? l : 'en';
const pick = (l: Language) => T[norm(l)];
const PIE = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981'];
// Tooltip chrome reads the theme tokens directly (contentStyle is real
// CSS, so var() resolves — unlike SVG attributes, see component body).
const tip = {
  borderRadius: 12,
  border: '1px solid var(--vb-border)',
  backgroundColor: 'var(--vb-surface)',
  color: 'var(--vb-text-primary)',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};
const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : Infinity);

/* ───────── shared ───────── */
function ChartCard({ title, children, ta }: { title: string; children: ReactNode; ta: string }) {
  return (
    <div className="rounded-2xl bg-[var(--vb-surface)] shadow-sm p-4">
      <div className={`text-sm font-semibold text-[var(--vb-text-secondary)] mb-3 ${ta}`}>{title}</div>
      <div style={{ width: '100%', height: 210 }}>{children}</div>
    </div>
  );
}
function Kpi({ icon, label, value, grad }: { icon: ReactNode; label: string; value: string; grad: string }) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow-md bg-gradient-to-br ${grad}`}>
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 mb-2">{icon}</div>
      <div className="text-2xl font-extrabold leading-none">{value}</div>
      <div className="text-xs font-medium text-white/85 mt-1">{label}</div>
    </div>
  );
}
function Spinner({ msg }: { msg: string }) {
  return <div className="flex flex-col items-center justify-center py-20 text-[var(--vb-text-muted)]"><RefreshCw className="w-7 h-7 animate-spin mb-3" /><span className="text-sm font-medium">{msg}</span></div>;
}

interface Props { user: AppUser | null; setView: Dispatch<SetStateAction<View>>; setUser: Dispatch<SetStateAction<AppUser | null>>; }

export default function ManagerConsoleView({ user, setView, setUser }: Props) {
  const { language, dir, isRTL } = useLanguage();
  const t = pick(language);
  const ta = isRTL ? 'text-right' : 'text-left';

  // Chart internals need real color strings — CSS var() doesn't resolve
  // inside SVG presentation attributes — so grid/axis/cursor branch on
  // the active theme's dark flag instead of reading tokens.
  const { isDark } = useTeacherTheme(user?.teacherDashboardTheme);
  const gridStroke = isDark ? '#414a61' : '#e7e5e4';
  const axisStroke = isDark ? '#8591a8' : '#78716c';
  const cursorFill = isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f4';
  const rowR = isRTL ? 'flex-row-reverse' : '';
  const Caret = isRTL ? ArrowLeft : ArrowRight;

  const [tab, setTab] = useState<'overview' | 'teachers' | 'classes' | 'engagement'>('overview');
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [overview, setOverview] = useState<ManagerOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [engagement, setEngagement] = useState<ManagerEngagement | null>(null);
  const [teacherDetail, setTeacherDetail] = useState<ManagerTeacherDetail | null>(null);
  const [classDetail, setClassDetail] = useState<ManagerClassDetail | null>(null);

  const loadOverview = useCallback(async () => { setLoadingOverview(true); setOverview(await fetchManagerOverview()); setLoadingOverview(false); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data-fetch effect; matches AdminSecurityView convention
  useEffect(() => { void loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === 'engagement' && !engagement) void fetchManagerEngagement().then(setEngagement); }, [tab, engagement]);
  useEffect(() => { if (teacherId) void fetchManagerTeacherDetail(teacherId).then(setTeacherDetail); }, [teacherId]);
  useEffect(() => { if (classId) void fetchManagerClassDetail(classId).then(setClassDetail); }, [classId]);

  const signOut = useCallback(async () => { try { await supabase.auth.signOut(); } catch { /* best-effort */ } setUser(null); setView('public-landing'); }, [setUser, setView]);
  const go = (id: typeof tab) => { setTab(id); setTeacherId(null); setClassId(null); setTeacherDetail(null); setClassDetail(null); };
  const openTeacher = (uid: string) => { setTeacherDetail(null); setTeacherId(uid); };
  const openClass = (id: string) => { setClassDetail(null); setClassId(id); };

  const nav = [
    { id: 'overview', label: t.navOverview, icon: LayoutDashboard },
    { id: 'teachers', label: t.navTeachers, icon: Users },
    { id: 'classes', label: t.navClasses, icon: BookOpen },
    { id: 'engagement', label: t.navEngagement, icon: Activity },
  ] as const;

  const totals = overview?.totals;
  const dowData = DOW[norm(language)].map((day, i) => ({ day, plays: engagement?.dow.find((x) => x.dow === i)?.plays ?? 0 }));
  const mostActive = overview ? [...overview.teachers].sort((a, b) => b.active_students_7d - a.active_students_7d)[0] : null;
  const dormantClasses = overview?.classes.filter((c) => daysSince(c.last_activity) > 14) ?? [];
  const topTeacher = overview?.xp_by_teacher[0];

  return (
    <div dir={dir} className={`min-h-screen bg-[var(--vb-surface-alt)] flex ${rowR}`}>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-[var(--vb-surface)] flex flex-col" style={{ [isRTL ? 'borderLeft' : 'borderRight']: '1px solid var(--vb-border)' } as CSSProperties}>
        <div className={`p-5 flex items-center gap-3 ${rowR}`}>
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl text-white bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shrink-0"><School className="w-6 h-6" /></div>
          <div className={`min-w-0 ${ta}`}><div className="font-bold text-[var(--vb-text-primary)] truncate text-sm">{overview?.school?.name ?? 'Vocaband'}</div><div className="text-xs text-[var(--vb-text-muted)]">{t.role}</div></div>
        </div>
        <nav className="px-3 space-y-1 flex-1">
          {nav.map((n) => {
            const active = tab === n.id;
            return (
              <button key={n.id} type="button" onClick={() => go(n.id)} style={{ touchAction: 'manipulation' }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${rowR} ${ta} ${active ? 'text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow-sm shadow-violet-500/30' : 'text-[var(--vb-text-secondary)] hover:bg-[var(--vb-surface-alt)]'}`}>
                <n.icon className="w-4 h-4 shrink-0" /><span className="flex-1">{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3"><button type="button" onClick={() => void signOut()} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--vb-text-muted)] hover:bg-[var(--vb-surface-alt)] ${rowR} ${ta}`}><LogOut className="w-4 h-4" /><span className="flex-1">{t.signOut}</span></button></div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-6">
        <div className={`flex items-center justify-between mb-5 ${rowR}`}>
          <h1 className={`text-xl font-extrabold text-[var(--vb-text-primary)] ${ta}`}>
            {tab === 'overview' && t.navOverview}
            {tab === 'teachers' && (teacherDetail ? teacherDetail.teacher.display_name : t.navTeachers)}
            {tab === 'classes' && (classDetail ? `${classDetail.class.name}` : t.navClasses)}
            {tab === 'engagement' && t.navEngagement}
          </h1>
          <div className={`flex items-center gap-2 ${rowR}`}>
            <span className="text-xs font-medium text-[var(--vb-text-muted)] bg-[var(--vb-surface)] rounded-lg px-3 py-1.5 shadow-sm">{t.range}</span>
            <button type="button" onClick={() => void loadOverview()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--vb-text-secondary)] bg-[var(--vb-surface)] rounded-lg px-3 py-1.5 shadow-sm hover:bg-[var(--vb-surface-alt)]"><RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin' : ''}`} />{t.refresh}</button>
          </div>
        </div>

        {loadingOverview ? <Spinner msg={t.loading} />
          : !overview?.school || !totals ? (
            <div className={`rounded-3xl bg-[var(--vb-surface)] shadow-sm p-8 text-center ${ta}`}>
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--vb-warning-soft)] text-[var(--vb-warning)] mx-auto mb-4"><AlertTriangle className="w-7 h-7" /></div>
              <h2 className="text-lg font-bold text-[var(--vb-text-primary)] mb-2">{t.emptyTitle}</h2>
              <p className="text-sm text-[var(--vb-text-muted)] max-w-md mx-auto">{t.emptyBody}</p>
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {tab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                    <Kpi icon={<Users className="w-4 h-4" />} label={t.kTeachers} value={`${totals.teachers}`} grad="from-indigo-500 to-violet-500" />
                    <Kpi icon={<BookOpen className="w-4 h-4" />} label={t.kClasses} value={`${totals.classes}`} grad="from-sky-500 to-blue-500" />
                    <Kpi icon={<GraduationCap className="w-4 h-4" />} label={t.kStudents} value={`${totals.students}`} grad="from-emerald-500 to-teal-500" />
                    <Kpi icon={<Activity className="w-4 h-4" />} label={t.kActive} value={`${totals.active_students_7d}`} grad="from-fuchsia-500 to-pink-500" />
                    <Kpi icon={<Gamepad2 className="w-4 h-4" />} label={t.kGames} value={totals.games_7d.toLocaleString()} grad="from-violet-500 to-purple-500" />
                    <Kpi icon={<Star className="w-4 h-4" />} label={t.kXp} value={totals.total_xp.toLocaleString()} grad="from-amber-500 via-orange-500 to-rose-500" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title={t.chEngagement} ta={ta}>
                      <ResponsiveContainer><AreaChart data={overview.engagement14} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                        <defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0.03} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 9 }} stroke={axisStroke} interval={1} /><YAxis tick={{ fontSize: 10 }} stroke={axisStroke} allowDecimals={false} /><Tooltip contentStyle={tip} />
                        <Area type="monotone" dataKey="active" stroke="#6366f1" strokeWidth={3} fill="url(#gA)" />
                      </AreaChart></ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title={t.chGames} ta={ta}>
                      <ResponsiveContainer><BarChart data={overview.engagement14} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 9 }} stroke={axisStroke} interval={1} /><YAxis tick={{ fontSize: 10 }} stroke={axisStroke} allowDecimals={false} /><Tooltip contentStyle={tip} cursor={{ fill: cursorFill }} />
                        <Bar dataKey="games" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart></ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title={t.chStudents} ta={ta}>
                      <ResponsiveContainer><PieChart><Pie data={overview.students_by_class} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>{overview.students_by_class.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie><Tooltip contentStyle={tip} /></PieChart></ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title={t.chXp} ta={ta}>
                      <ResponsiveContainer><BarChart data={overview.xp_by_teacher} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} /><XAxis type="number" tick={{ fontSize: 10 }} stroke={axisStroke} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke={axisStroke} width={64} /><Tooltip contentStyle={tip} cursor={{ fill: cursorFill }} />
                        <Bar dataKey="xp" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart></ResponsiveContainer>
                    </ChartCard>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className={`rounded-2xl bg-[var(--vb-surface)] shadow-sm p-4 ${ta}`}><div className={`flex items-center gap-2 text-[var(--vb-success)] mb-2 ${rowR}`}><TrendingUp className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wide">{t.hMostActive}</span></div><div className="font-bold text-[var(--vb-text-primary)]">{mostActive?.display_name ?? t.noData}</div><div className="text-sm text-[var(--vb-text-muted)]">{mostActive ? `${mostActive.active_students_7d} ${t.colActive}` : ''}</div></div>
                    <div className={`rounded-2xl bg-[var(--vb-surface)] shadow-sm p-4 ${ta}`}><div className={`flex items-center gap-2 text-[var(--vb-warning)] mb-2 ${rowR}`}><AlertTriangle className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wide">{t.hNeedsAttention}</span></div><div className="font-bold text-[var(--vb-text-primary)]">{dormantClasses.length > 0 ? dormantClasses.slice(0, 3).map((c) => c.name).join(', ') : t.noData}</div><div className="text-sm text-[var(--vb-text-muted)]">{dormantClasses.length > 0 ? t.dormant : ''}</div></div>
                    <div className={`rounded-2xl bg-[var(--vb-surface)] shadow-sm p-4 ${ta}`}><div className={`flex items-center gap-2 text-[var(--vb-info)] mb-2 ${rowR}`}><Award className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wide">{t.hTopStudent}</span></div><div className="font-bold text-[var(--vb-text-primary)]">{topTeacher?.name ?? t.noData}</div><div className="text-sm text-[var(--vb-text-muted)]">{topTeacher ? `${topTeacher.xp.toLocaleString()} XP` : ''}</div></div>
                  </div>
                </div>
              )}

              {/* TEACHERS LIST */}
              {tab === 'teachers' && !teacherId && (
                <div className="space-y-3">
                  {overview.teachers.map((tc) => (
                    <motion.button key={tc.uid} type="button" whileHover={{ scale: 1.01 }} onClick={() => openTeacher(tc.uid)} className={`w-full rounded-2xl bg-[var(--vb-surface)] shadow-sm p-4 flex items-center gap-3 ${rowR}`}>
                      <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--vb-accent-soft)] text-[var(--vb-accent)] font-bold shrink-0">{(tc.display_name || '?')[0]}</div>
                      <div className={`flex-1 min-w-0 ${ta}`}><div className="font-semibold text-[var(--vb-text-primary)]">{tc.display_name}</div><div className="text-xs text-[var(--vb-text-muted)]">{tc.class_count} {t.colClasses} · {tc.student_count} {t.colStudents} · {tc.active_students_7d} {t.colActive}</div></div>
                      {daysSince(tc.last_activity) > 14 && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--vb-warning-soft)] text-[var(--vb-warning)] text-xs font-semibold px-2.5 py-1"><AlertTriangle className="w-3 h-3" />{t.dormant}</span>}
                      <Caret className="w-4 h-4 text-[var(--vb-text-muted)] shrink-0" />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* TEACHER DETAIL */}
              {tab === 'teachers' && teacherId && (
                !teacherDetail ? <Spinner msg={t.loading} /> : (
                  <div className="space-y-5">
                    <button type="button" onClick={() => setTeacherId(null)} className={`inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--vb-accent)] ${rowR}`}>{isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}{t.backTeachers}</button>
                    <div className={`rounded-2xl bg-[var(--vb-surface)] shadow-sm p-5 flex items-center gap-4 ${rowR}`}>
                      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white text-xl font-bold shrink-0">{(teacherDetail.teacher.display_name || '?')[0]}</div>
                      <div className={ta}><div className="text-lg font-extrabold text-[var(--vb-text-primary)]">{teacherDetail.teacher.display_name}</div>{teacherDetail.teacher.email && <div className={`flex items-center gap-1 text-sm text-[var(--vb-text-muted)] ${rowR}`}><Mail className="w-3.5 h-3.5" />{teacherDetail.teacher.email}</div>}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <Kpi icon={<BookOpen className="w-4 h-4" />} label={t.kClasses} value={`${teacherDetail.teacher.classes}`} grad="from-sky-500 to-blue-500" />
                      <Kpi icon={<GraduationCap className="w-4 h-4" />} label={t.kStudents} value={`${teacherDetail.teacher.students}`} grad="from-emerald-500 to-teal-500" />
                      <Kpi icon={<Activity className="w-4 h-4" />} label={t.kActive} value={`${teacherDetail.teacher.active_7d}`} grad="from-fuchsia-500 to-pink-500" />
                      <Kpi icon={<Star className="w-4 h-4" />} label={t.kXp} value={teacherDetail.teacher.xp.toLocaleString()} grad="from-amber-500 via-orange-500 to-rose-500" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <ChartCard title={t.tdActivity} ta={ta}>
                        <ResponsiveContainer><AreaChart data={teacherDetail.activity14} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                          <defs><linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d946ef" stopOpacity={0.5} /><stop offset="100%" stopColor="#d946ef" stopOpacity={0.03} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 9 }} stroke={axisStroke} interval={1} /><YAxis tick={{ fontSize: 10 }} stroke={axisStroke} allowDecimals={false} /><Tooltip contentStyle={tip} />
                          <Area type="monotone" dataKey="active" stroke="#d946ef" strokeWidth={3} fill="url(#gB)" />
                        </AreaChart></ResponsiveContainer>
                      </ChartCard>
                      <ChartCard title={t.tdPerClass} ta={ta}>
                        <ResponsiveContainer><BarChart data={teacherDetail.per_class} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={axisStroke} /><YAxis tick={{ fontSize: 10 }} stroke={axisStroke} allowDecimals={false} /><Tooltip contentStyle={tip} cursor={{ fill: cursorFill }} />
                          <Bar dataKey="students" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart></ResponsiveContainer>
                      </ChartCard>
                    </div>
                    {teacherDetail.top_students.length > 0 && (
                      <div className="rounded-2xl bg-[var(--vb-surface)] shadow-sm p-4"><div className={`text-sm font-semibold text-[var(--vb-text-secondary)] mb-3 ${ta}`}>{t.tdTopStudents}</div><div className="space-y-2">{teacherDetail.top_students.map((s, i) => (<div key={`${s.name}-${i}`} className={`flex items-center gap-3 ${rowR}`}><div className="w-6 h-6 rounded-lg bg-[var(--vb-surface-alt)] text-[var(--vb-text-muted)] text-xs font-bold flex items-center justify-center">{i + 1}</div><div className={`flex-1 text-sm font-medium text-[var(--vb-text-secondary)] ${ta}`}>{s.name}</div><div className="text-sm font-semibold text-[var(--vb-warning)]">{s.xp.toLocaleString()} XP</div></div>))}</div></div>
                    )}
                  </div>
                )
              )}

              {/* CLASSES GRID */}
              {tab === 'classes' && !classId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {overview.classes.map((c) => (
                    <motion.button key={c.id} type="button" whileHover={{ scale: 1.02 }} onClick={() => openClass(c.id)} className={`rounded-2xl bg-[var(--vb-surface)] shadow-sm p-4 ${ta}`}>
                      <div className={`flex items-center justify-between mb-3 ${rowR}`}>
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white font-bold text-sm px-1">{c.name}</div>
                        {daysSince(c.last_activity) > 14 ? <span className="inline-flex items-center gap-1 rounded-full bg-[var(--vb-warning-soft)] text-[var(--vb-warning)] text-xs font-semibold px-2 py-1"><AlertTriangle className="w-3 h-3" />{t.dormant}</span>
                          : <span className="inline-flex items-center gap-1 rounded-full bg-[var(--vb-success-soft)] text-[var(--vb-success)] text-xs font-semibold px-2 py-1"><CheckCircle2 className="w-3 h-3" />{c.completion}%</span>}
                      </div>
                      {c.teacher_name && <div className="text-xs text-[var(--vb-text-muted)] mb-2 truncate">{c.teacher_name}</div>}
                      <div className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${rowR}`}>
                        <span className="text-[var(--vb-text-secondary)]"><b className="text-[var(--vb-text-primary)]">{c.students}</b> {t.colStudents}</span>
                        {c.avg_score != null && <span className="text-[var(--vb-text-secondary)]"><b className="text-[var(--vb-text-primary)]">{c.avg_score}</b> {t.kAvg}</span>}
                        <span className="text-[var(--vb-text-secondary)]"><b className="text-[var(--vb-text-primary)]">{c.active_7d}</b> {t.colActive}</span>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-[var(--vb-surface-alt)] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${c.completion}%` }} /></div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* CLASS DETAIL */}
              {tab === 'classes' && classId && (
                !classDetail ? <Spinner msg={t.loading} /> : (
                  <div className="space-y-5">
                    <button type="button" onClick={() => setClassId(null)} className={`inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--vb-accent)] ${rowR}`}>{isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}{t.backClasses}</button>
                    <div className={`rounded-2xl bg-[var(--vb-surface)] shadow-sm p-5 flex items-center gap-4 ${rowR}`}>
                      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 text-white text-lg font-bold shrink-0 px-1">{classDetail.class.name}</div>
                      <div className={ta}><div className="text-lg font-extrabold text-[var(--vb-text-primary)]">{classDetail.class.name}</div>{classDetail.class.teacher_name && <div className="text-sm text-[var(--vb-text-muted)]">{t.clTeacher}: {classDetail.class.teacher_name}</div>}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Kpi icon={<GraduationCap className="w-4 h-4" />} label={t.kStudents} value={`${classDetail.class.students}`} grad="from-emerald-500 to-teal-500" />
                      <Kpi icon={<Target className="w-4 h-4" />} label={t.kAvg} value={classDetail.class.avg_score != null ? `${classDetail.class.avg_score}` : '—'} grad="from-indigo-500 to-violet-500" />
                      <Kpi icon={<Activity className="w-4 h-4" />} label={t.kActive} value={`${classDetail.class.active_7d}`} grad="from-fuchsia-500 to-pink-500" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <ChartCard title={t.cdScoreDist} ta={ta}>
                        <ResponsiveContainer><BarChart data={classDetail.score_dist} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} /><XAxis dataKey="band" tick={{ fontSize: 10 }} stroke={axisStroke} /><YAxis tick={{ fontSize: 10 }} stroke={axisStroke} allowDecimals={false} /><Tooltip contentStyle={tip} cursor={{ fill: cursorFill }} />
                          <Bar dataKey="n" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart></ResponsiveContainer>
                      </ChartCard>
                      <ChartCard title={t.cdActivity} ta={ta}>
                        <ResponsiveContainer><AreaChart data={classDetail.activity14} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                          <defs><linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} /><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.03} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 9 }} stroke={axisStroke} interval={1} /><YAxis tick={{ fontSize: 10 }} stroke={axisStroke} allowDecimals={false} /><Tooltip contentStyle={tip} />
                          <Area type="monotone" dataKey="active" stroke="#0ea5e9" strokeWidth={3} fill="url(#gC)" />
                        </AreaChart></ResponsiveContainer>
                      </ChartCard>
                    </div>
                    {classDetail.assignments.length > 0 && (
                      <div className="rounded-2xl bg-[var(--vb-surface)] shadow-sm p-4"><div className={`text-sm font-semibold text-[var(--vb-text-secondary)] mb-3 ${ta}`}>{t.cdAssignments}</div><div className="space-y-3">{classDetail.assignments.map((a, i) => (<div key={`${a.title}-${i}`} className={`flex items-center gap-3 ${rowR}`}><div className={`flex-1 text-sm font-medium text-[var(--vb-text-secondary)] truncate ${ta}`}>{a.title}</div><div className="w-32 h-2 rounded-full bg-[var(--vb-surface-alt)] overflow-hidden shrink-0"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${a.completion}%` }} /></div><div className="w-10 text-sm font-semibold text-[var(--vb-text-secondary)] shrink-0" style={{ textAlign: isRTL ? 'left' : 'right' }}>{a.completion}%</div></div>))}</div></div>
                    )}
                  </div>
                )
              )}

              {/* ENGAGEMENT */}
              {tab === 'engagement' && (
                !engagement ? <Spinner msg={t.loading} /> : (
                  <div className="space-y-5">
                    <ChartCard title={t.enActive30} ta={ta}>
                      <ResponsiveContainer><AreaChart data={engagement.active30} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                        <defs><linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0.03} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 9 }} stroke={axisStroke} interval={2} /><YAxis tick={{ fontSize: 10 }} stroke={axisStroke} allowDecimals={false} /><Tooltip contentStyle={tip} />
                        <Area type="monotone" dataKey="active" stroke="#6366f1" strokeWidth={3} fill="url(#gE)" />
                      </AreaChart></ResponsiveContainer>
                    </ChartCard>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <ChartCard title={t.enGames} ta={ta}>
                        <ResponsiveContainer><BarChart data={engagement.games14} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 9 }} stroke={axisStroke} interval={1} /><YAxis tick={{ fontSize: 10 }} stroke={axisStroke} allowDecimals={false} /><Tooltip contentStyle={tip} cursor={{ fill: cursorFill }} />
                          <Bar dataKey="games" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart></ResponsiveContainer>
                      </ChartCard>
                      <ChartCard title={t.enDow} ta={ta}>
                        <ResponsiveContainer><BarChart data={dowData} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11 }} stroke={axisStroke} /><YAxis tick={{ fontSize: 10 }} stroke={axisStroke} allowDecimals={false} /><Tooltip contentStyle={tip} cursor={{ fill: cursorFill }} />
                          <Bar dataKey="plays" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart></ResponsiveContainer>
                      </ChartCard>
                    </div>
                    <ChartCard title={t.enMode} ta={ta}>
                      <ResponsiveContainer><BarChart data={engagement.modes} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} /><XAxis type="number" tick={{ fontSize: 10 }} stroke={axisStroke} allowDecimals={false} /><YAxis type="category" dataKey="mode" tick={{ fontSize: 11 }} stroke={axisStroke} width={80} /><Tooltip contentStyle={tip} cursor={{ fill: cursorFill }} />
                        <Bar dataKey="plays" fill="#d946ef" radius={[0, 4, 4, 0]} />
                      </BarChart></ResponsiveContainer>
                    </ChartCard>
                  </div>
                )
              )}
            </>
          )}
      </main>
    </div>
  );
}
