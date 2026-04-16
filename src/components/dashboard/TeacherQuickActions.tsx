import { QrCode, BarChart3, Trophy, UserCircle } from "lucide-react";
import { HelpTooltip } from "../HelpTooltip";
import ActionCard from "../ActionCard";

interface TeacherQuickActionsProps {
  pendingStudentsCount: number;
  onQuickPlayClick: () => void;
  onLiveChallengeClick: () => void;
  onAnalyticsClick: () => void;
  onGradebookClick: () => void;
  onApprovalsClick: () => void;
}

export default function TeacherQuickActions({
  pendingStudentsCount,
  onQuickPlayClick, onAnalyticsClick, onGradebookClick, onApprovalsClick,
}: TeacherQuickActionsProps) {
  return (
    <div className="mb-8 sm:mb-10">
      <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-stone-400 mb-3 sm:mb-4 px-1">
        Quick actions
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

        {/* Analytics */}
        <HelpTooltip className="h-full" content="See every student's scores across all assignments, identify struggling students, track trends, and find the most-missed words">
          <div className="h-full" data-tour="analytics">
            <ActionCard
              icon={<BarChart3 size={22} />}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              title="Analytics"
              description="Scores, trends & weak words"
              buttonText="View insights"
              onClick={onAnalyticsClick}
            />
          </div>
        </HelpTooltip>

        {/* Gradebook & Students */}
        <HelpTooltip className="h-full" content="View all students, track scores, progress, and activity history">
          <div className="h-full" data-tour="gradebook">
            <ActionCard
              icon={<Trophy size={22} />}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              title="Gradebook"
              description="All students & scores"
              buttonText="Open gradebook"
              onClick={onGradebookClick}
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
