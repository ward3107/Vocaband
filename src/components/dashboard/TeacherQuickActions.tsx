import { QrCode, GraduationCap, UserCircle } from "lucide-react";
import { HelpTooltip } from "../HelpTooltip";
import ActionCard from "../ActionCard";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherDashboardT } from "../../locales/teacher/dashboard";

interface TeacherQuickActionsProps {
  pendingStudentsCount: number;
  onQuickPlayClick: () => void;
  onLiveChallengeClick: () => void;
  /** Single entry point that opens the merged Classroom view (Pulse +
   *  Mastery + Records tabs). Replaces the previous two buttons that
   *  routed to /analytics and /gradebook separately — those views were
   *  ~40% duplicate code and forced teachers to context-switch. */
  onClassroomClick: () => void;
  onApprovalsClick: () => void;
}

export default function TeacherQuickActions({
  pendingStudentsCount,
  onQuickPlayClick, onClassroomClick, onApprovalsClick,
}: TeacherQuickActionsProps) {
  const { language } = useLanguage();
  const t = teacherDashboardT[language];

  return (
    <div className="mb-8 sm:mb-10">
      <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-stone-400 mb-3 sm:mb-4 px-1">
        {t.quickActionsHeading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Quick Play */}
        <HelpTooltip className="h-full" content={t.qpTooltip}>
          <div className="h-full" data-tour="quick-play">
            <ActionCard
              icon={<QrCode size={22} />}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              title={t.qpTitle}
              description={t.qpDescription}
              buttonText={t.qpButton}
              onClick={onQuickPlayClick}
            />
          </div>
        </HelpTooltip>

        {/* Classroom — merged Analytics + Gradebook */}
        <HelpTooltip className="h-full" content={t.classroomTooltip}>
          <div className="h-full" data-tour="classroom">
            <ActionCard
              icon={<GraduationCap size={22} />}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              title={t.classroomTitle}
              description={t.classroomDescription}
              buttonText={t.classroomButton}
              onClick={onClassroomClick}
            />
          </div>
        </HelpTooltip>

        {/* Student Approvals */}
        <HelpTooltip className="h-full" content={t.approvalsTooltip}>
          <div className="h-full" data-tour="approvals">
            <ActionCard
              icon={<UserCircle size={22} />}
              iconBg={pendingStudentsCount > 0 ? "bg-rose-50" : "bg-stone-50"}
              iconColor={pendingStudentsCount > 0 ? "text-rose-600" : "text-stone-500"}
              title={t.approvalsTitle}
              description={pendingStudentsCount > 0 ? t.approvalsWaiting(pendingStudentsCount) : t.approvalsNoPending}
              buttonText={pendingStudentsCount > 0 ? t.approvalsButtonReview : t.approvalsButtonCheck}
              onClick={onApprovalsClick}
              badge={pendingStudentsCount > 0 ? pendingStudentsCount : undefined}
            />
          </div>
        </HelpTooltip>
      </div>
    </div>
  );
}
