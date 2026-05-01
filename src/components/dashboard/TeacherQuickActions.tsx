import { QrCode, GraduationCap, UserCircle, Tv2 } from "lucide-react";
import { HelpTooltip } from "../HelpTooltip";
import ActionCard from "../ActionCard";

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
  /** Class Show — projector mode for classrooms where students don't
   *  have phones.  Teacher's screen IS the entire experience. */
  onClassShowClick?: () => void;
}

export default function TeacherQuickActions({
  pendingStudentsCount,
  onQuickPlayClick, onClassroomClick, onApprovalsClick, onClassShowClick,
}: TeacherQuickActionsProps) {
  return (
    <div className="mb-8 sm:mb-10">
      <h2
        style={{ color: 'var(--vb-text-muted)' }}
        className="text-xs sm:text-sm font-bold uppercase tracking-widest mb-3 sm:mb-4 px-1"
      >
        Quick actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Quick Play */}
        <HelpTooltip className="h-full" content="Create a QR code for students to scan and play selected words - no login required!">
          <div className="h-full" data-tour="quick-play">
            <ActionCard
              icon={<QrCode size={22} />}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              title="Quick Play"
              description="Instant QR code challenge"
              buttonText="Create"
              onClick={onQuickPlayClick}
            />
          </div>
        </HelpTooltip>

        {/* Class Show — projector mode for phone-less classrooms */}
        {onClassShowClick && (
          <HelpTooltip className="h-full" content="Project a vocabulary game on your classroom screen. Students answer by raising their hand or shouting the answer - no phones needed.">
            <div className="h-full" data-tour="class-show">
              <ActionCard
                icon={<Tv2 size={22} />}
                iconBg="bg-fuchsia-50"
                iconColor="text-fuchsia-600"
                title="Class Show"
                description="Project to the classroom"
                buttonText="Start"
                onClick={onClassShowClick}
              />
            </div>
          </HelpTooltip>
        )}

        {/* Classroom — merged Analytics + Gradebook */}
        <HelpTooltip className="h-full" content="One place for everything classroom: who needs attention now (Pulse), per-word mastery + weak words (Mastery), and the full per-student records + CSV export (Records).">
          <div className="h-full" data-tour="classroom">
            <ActionCard
              icon={<GraduationCap size={22} />}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              title="Classroom"
              description="Pulse · Mastery · Records"
              buttonText="Open"
              onClick={onClassroomClick}
            />
          </div>
        </HelpTooltip>

        {/* Student Approvals */}
        <HelpTooltip className="h-full" content="Approve students who signed up for your classes">
          <div className="h-full" data-tour="approvals">
            <ActionCard
              icon={<UserCircle size={22} />}
              iconBg={pendingStudentsCount > 0 ? "bg-rose-50" : "bg-stone-50"}
              iconColor={pendingStudentsCount > 0 ? "text-rose-600" : "text-stone-500"}
              title="Approvals"
              description={pendingStudentsCount > 0 ? `${pendingStudentsCount} student${pendingStudentsCount === 1 ? '' : 's'} waiting` : "No pending approvals"}
              buttonText={pendingStudentsCount > 0 ? "Review" : "Check"}
              onClick={onApprovalsClick}
              badge={pendingStudentsCount > 0 ? pendingStudentsCount : undefined}
            />
          </div>
        </HelpTooltip>
      </div>
    </div>
  );
}
