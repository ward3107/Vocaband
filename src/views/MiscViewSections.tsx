/**
 * The remaining view branches that didn't merit their own section
 * file — bundled into a single dispatching renderer.  Mostly
 * prop-forwarding to lazy-loaded views.
 *
 * Covered:
 *   - shop                          (student)
 *   - voca-picker                   (admin)
 *   - hot-seat                      (teacher)
 *   - wheel                         (teacher)
 *   - vocabagrut + Hebrew variant   (teacher)
 *   - global-leaderboard
 *   - teacher-approvals
 *   - admin-security
 *   - worksheet-attempts
 *   - classroom / analytics / gradebook (legacy aliases)
 *   - live-challenge-class-select + Hebrew variant
 *   - live-challenge without class (redirect placeholder)
 *   - students (legacy alias — redirected to gradebook elsewhere)
 */
import { type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import SvgSpinner from '../components/svg/SvgSpinner';
import { hasTeacherAccess, type AppUser, type ClassData, type AssignmentData } from '../core/supabase';
import type { VocaId } from '../core/subject';
import type { View } from '../core/views';
import ActivityTabsSlot from '../components/setup/ActivityTabsSlot';

const ShopView = lazyWithRetry(() => import('./ShopMarketplaceView'));
const VocaPickerView = lazyWithRetry(() => import('./VocaPickerView'));
const HotSeatView = lazyWithRetry(() => import('./HotSeatView'));
const WheelView = lazyWithRetry(() => import('./WheelView'));
const VocabagrutShell = lazyWithRetry(() => import('../features/vocabagrut/VocabagrutShell'));
const HebrewComingSoonView = lazyWithRetry(() => import('./HebrewComingSoonView'));
const GlobalLeaderboardView = lazyWithRetry(() => import('./GlobalLeaderboardView'));
const TeacherApprovalsView = lazyWithRetry(() => import('./TeacherApprovalsView'));
const AdminSecurityView = lazyWithRetry(() => import('./AdminSecurityView'));
const ManagerConsoleView = lazyWithRetry(() => import('./ManagerConsoleView'));
const DeveloperDashboardView = lazyWithRetry(() => import('./DeveloperDashboardView'));
const WorksheetAttemptsView = lazyWithRetry(() => import('./WorksheetAttemptsView'));
const ClassroomView = lazyWithRetry(() => import('./ClassroomView'));
const LiveChallengeClassSelectView = lazyWithRetry(() => import('./LiveChallengeClassSelectView'));
const VocabularyLibraryView = lazyWithRetry(() => import('./VocabularyLibraryView'));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Anyish = any;

export interface RenderMiscViewsDeps {
  view: View;
  user: AppUser | null;
  activeVoca: VocaId | null;
  selectedClass: ClassData | null;
  activityNavOrigin: 'create-assignment' | null;

  setView: React.Dispatch<React.SetStateAction<View>>;
  setSelectedClass: React.Dispatch<React.SetStateAction<ClassData | null>>;
  setIsLiveChallenge: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveVoca: React.Dispatch<React.SetStateAction<VocaId | null>>;

  xp: number;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  boostersActivate: (...args: Anyish[]) => Anyish;

  visibleClasses: ClassData[];
  visibleAssignments: AssignmentData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  speakWord: any;
  topicPacks: { name: string; icon: string; ids: number[] }[];

  globalLeaderboard: Anyish;

  pendingStudents: Anyish[];
  toasts: Anyish[];
  consentModal: ReactNode;
  exitConfirmModal: ReactNode;
  loadPendingStudents: () => void;
  handleApproveStudent: (...args: Anyish[]) => Anyish;
  handleRejectStudent: (...args: Anyish[]) => Anyish;

  allScores: Anyish;
  classStudents: Anyish;
  selectedWords: number[];
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  expandedStudent: Anyish;
  setExpandedStudent: React.Dispatch<React.SetStateAction<Anyish>>;

  socket: Anyish;
}

export function renderMiscViews(deps: RenderMiscViewsDeps): ReactNode {
  const {
    view, user, activeVoca, selectedClass, activityNavOrigin,
    setView, setSelectedClass, setIsLiveChallenge, setActiveVoca,
    xp, setXp, coins, setCoins, setUser, showToast, boostersActivate,
    visibleClasses, visibleAssignments, speakWord, topicPacks,
    globalLeaderboard,
    pendingStudents, toasts, consentModal, exitConfirmModal,
    loadPendingStudents, handleApproveStudent, handleRejectStudent,
    allScores, classStudents, selectedWords, setSelectedWords,
    expandedStudent, setExpandedStudent, socket,
  } = deps;

  // Back-destination shared by Hot Seat / Vocabagrut / Hebrew-coming-soon
  // when the wizard launched the activity tab.
  const wizardBackOrDashboard = (): View =>
    activityNavOrigin === 'create-assignment' && selectedClass ? 'create-assignment' : 'teacher-dashboard';

  if (user?.role === 'student' && view === 'shop') {
    return (
      <LazyWrapper loadingMessage="Loading shop...">
        <ShopView
          user={user}
          xp={xp}
          setXp={setXp}
          coins={coins}
          setCoins={setCoins}
          setUser={setUser}
          setView={setView}
          showToast={showToast}
          activateBooster={boostersActivate}
        />
      </LazyWrapper>
    );
  }

  // Voca picker — admin-only entry point.
  if (hasTeacherAccess(user) && view === 'voca-picker') {
    return (
      <LazyWrapper loadingMessage="Loading...">
        <VocaPickerView
          user={user!}
          onPickVoca={(voca) => { setActiveVoca(voca); setView('teacher-dashboard'); }}
          onOpenDeveloper={user?.role === 'admin' ? () => setView('developer-dashboard') : undefined}
        />
      </LazyWrapper>
    );
  }

  if (view === 'hot-seat') {
    // Pass-around classroom mode — feeds the teacher's English
    // assignments as one possible word pool (in addition to Sets 1/2/3).
    // Scope to selectedClass when set.  Scores stay in-memory.
    const hotSeatAssignments = visibleAssignments
      .filter((a) => !selectedClass || a.classId === selectedClass.id)
      .map((a) => ({ id: a.id, title: a.title, wordIds: a.wordIds, words: a.words }));
    const hotSeatInitialNames = selectedClass
      ? (classStudents as { name: string; classCode: string }[])
          .filter((s) => s.classCode === selectedClass.code)
          .map((s) => s.name)
      : undefined;
    return (
      <LazyWrapper loadingMessage="Loading Hot Seat…">
        <HotSeatView
          onExit={() => setView(wizardBackOrDashboard())}
          speak={speakWord}
          assignments={hotSeatAssignments}
          topicPacks={topicPacks}
          classes={visibleClasses}
          initialClassId={selectedClass?.id ?? null}
          initialPlayerNames={hotSeatInitialNames}
          activityTabs={
            <ActivityTabsSlot
              active="hot-seat"
              setView={setView}
              hasSelectedClass={!!selectedClass}
              isHebrew={activeVoca === 'hebrew'}
            />
          }
        />
      </LazyWrapper>
    );
  }

  if (view === 'wheel') {
    // Vocab Wheel — projector-first mode where every spin randomly
    // picks a student AND a challenge type.  Same assignment-scoping
    // rules as Hot Seat; pre-fill the roster textarea with the
    // selected class's students when available so the teacher doesn't
    // retype names they already manage in the dashboard.
    const wheelAssignments = visibleAssignments
      .filter((a) => !selectedClass || a.classId === selectedClass.id)
      .map((a) => ({ id: a.id, title: a.title, wordIds: a.wordIds, words: a.words }));
    const initialPlayerNames = selectedClass
      ? (classStudents as { name: string; classCode: string }[])
          .filter((s) => s.classCode === selectedClass.code)
          .map((s) => s.name)
      : undefined;
    return (
      <LazyWrapper loadingMessage="Loading Vocab Wheel…">
        <WheelView
          onExit={() => setView(wizardBackOrDashboard())}
          speak={speakWord}
          assignments={wheelAssignments}
          topicPacks={topicPacks}
          classes={visibleClasses}
          initialClassId={selectedClass?.id ?? null}
          initialPlayerNames={initialPlayerNames}
          activityTabs={
            <ActivityTabsSlot
              active="wheel"
              setView={setView}
              hasSelectedClass={!!selectedClass}
              isHebrew={activeVoca === 'hebrew'}
            />
          }
        />
      </LazyWrapper>
    );
  }

  if (view === 'vocabagrut' && user) {
    // No Hebrew analog — Hebrew literature has its own Bagrut, shaped
    // nothing like the English one.  Hebrew-tab teachers hit the
    // coming-soon screen via direct URL nav.
    if (activeVoca === 'hebrew') {
      return (
        <LazyWrapper loadingMessage="טוען…">
          <HebrewComingSoonView
            titleHe="Vocabagrut"
            descriptionHe="מבחן מתכונת בסגנון בגרות זמין כרגע רק במסלול האנגלית."
            onBack={() => setView(wizardBackOrDashboard())}
          />
        </LazyWrapper>
      );
    }
    return (
      <LazyWrapper loadingMessage="Loading Vocabagrut…">
        <VocabagrutShell
          user={user}
          classes={visibleClasses}
          teacherAssignments={visibleAssignments}
          activityTabs={
            <ActivityTabsSlot
              active="vocabagrut"
              setView={setView}
              hasSelectedClass={!!selectedClass}
              // Always English here — the Hebrew branch returned the
              // coming-soon screen above, so activeVoca is non-Hebrew.
              isHebrew={false}
            />
          }
          onExit={() => {
            if (user.role === 'student') {
              setView('student-dashboard');
            } else {
              setView(wizardBackOrDashboard());
            }
          }}
          showToast={showToast}
        />
      </LazyWrapper>
    );
  }

  if (view === 'global-leaderboard') {
    return (
      <LazyWrapper loadingMessage="Loading leaderboard...">
        <GlobalLeaderboardView
          userRole={user?.role}
          setView={setView}
          globalLeaderboard={globalLeaderboard}
        />
      </LazyWrapper>
    );
  }

  // Legacy "students" view merged into gradebook — redirect on next frame.
  if (view === 'students') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <SvgSpinner className="animate-spin text-blue-700" size={48} />
      </div>
    );
  }

  if (view === 'teacher-approvals') {
    return (
      <LazyWrapper loadingMessage="Loading approvals...">
        <TeacherApprovalsView
          user={user}
          pendingStudents={pendingStudents}
          toasts={toasts}
          consentModal={consentModal}
          exitConfirmModal={exitConfirmModal}
          setView={setView}
          loadPendingStudents={loadPendingStudents}
          handleApproveStudent={handleApproveStudent}
          handleRejectStudent={handleRejectStudent}
          showToast={showToast}
        />
      </LazyWrapper>
    );
  }

  if (view === 'manager-dashboard') {
    // School-manager (principal) read-only console.  Data is fetched via the
    // school-scoped manager_* RPCs inside the view; a non-manager landing here
    // by URL sees the empty state (no cross-school leak).
    return (
      <LazyWrapper loadingMessage="Loading school console...">
        <ManagerConsoleView user={user} setView={setView} setUser={setUser} />
      </LazyWrapper>
    );
  }

  if (view === 'admin-security') {
    // The view itself reads from `authz_failures`, which is RLS-gated to
    // admins only.  A non-admin landing here simply sees "no events" —
    // we don't extra-gate at the router so the admin's bookmark works
    // without an extra round-trip to `is_admin()`.
    return (
      <LazyWrapper loadingMessage="Loading security log...">
        <AdminSecurityView setView={setView} />
      </LazyWrapper>
    );
  }

  if (view === 'developer-dashboard') {
    // Admin-only control hub. The view itself re-checks hasAdminAccess and the
    // backing admin_* RPCs re-check is_admin() server-side, so a non-admin
    // landing here sees the "admins only" gate, not data.
    return (
      <LazyWrapper loadingMessage="Loading developer dashboard...">
        <DeveloperDashboardView user={user} setView={setView} showToast={showToast} />
      </LazyWrapper>
    );
  }

  if (view === 'worksheet-attempts' && user) {
    return (
      <LazyWrapper loadingMessage="Loading worksheet results...">
        <WorksheetAttemptsView user={user} onBack={() => setView('teacher-dashboard')} />
      </LazyWrapper>
    );
  }

  // Vocabulary Library — the teacher's persistent saved-vocabulary surface.
  // Lives behind the teacher-access gate; non-teachers landing here see the
  // view's own friendly fallback (see VocabularyLibraryView).
  if (view === 'vocabulary-library' && hasTeacherAccess(user)) {
    return (
      <LazyWrapper loadingMessage="Loading your library…">
        <VocabularyLibraryView
          user={user}
          classes={visibleClasses}
          onBack={() => setView('teacher-dashboard')}
          showToast={showToast}
        />
      </LazyWrapper>
    );
  }

  if (view === 'classroom' || view === 'analytics' || view === 'gradebook') {
    // Legacy /analytics → Mastery tab, legacy /gradebook → Pulse tab.
    const initialTab = view === 'analytics' ? 'mastery' : 'pulse';
    return (
      <LazyWrapper loadingMessage="Loading classroom...">
        <ClassroomView
          user={user}
          classes={visibleClasses}
          allScores={allScores}
          teacherAssignments={visibleAssignments}
          classStudents={classStudents}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          selectedWords={selectedWords}
          setSelectedWords={setSelectedWords}
          expandedStudent={expandedStudent}
          setExpandedStudent={setExpandedStudent}
          setView={setView}
          showToast={showToast}
          initialTab={initialTab}
          subject={activeVoca ?? 'english'}
        />
      </LazyWrapper>
    );
  }

  if (view === 'live-challenge-class-select') {
    // Hebrew teachers see the same coming-soon screen since Live
    // Challenge isn't Hebrew-aware yet.
    if (activeVoca === 'hebrew') {
      return (
        <LazyWrapper loadingMessage="טוען…">
          <HebrewComingSoonView
            titleHe="אתגר חי"
            descriptionHe="מצב כיתה חי עם לוח שיא בזמן אמת — בקרוב באוצר המילים העברי."
            onBack={() => setView('teacher-dashboard')}
          />
        </LazyWrapper>
      );
    }
    return (
      <LazyWrapper loadingMessage="Loading classes...">
        <LiveChallengeClassSelectView
          user={user}
          classes={visibleClasses}
          socket={socket}
          setView={setView}
          setSelectedClass={setSelectedClass}
          setIsLiveChallenge={setIsLiveChallenge}
        />
      </LazyWrapper>
    );
  }

  // Fallback: view === "live-challenge" but selectedClass was cleared.
  if (view === 'live-challenge' && !selectedClass) {
    setTimeout(() => {
      setIsLiveChallenge(false);
      if (hasTeacherAccess(user)) setView('live-challenge-class-select');
      else if (user?.role === 'student') setView('student-dashboard');
      else setView('public-landing');
    }, 0);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="font-black text-lg">Redirecting…</p>
          <p className="text-white/80 text-sm mt-1">Taking you back to your home screen.</p>
        </div>
      </div>
    );
  }

  return null;
}
