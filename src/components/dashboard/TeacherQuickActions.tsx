import { QrCode, RefreshCw, BarChart3, Trophy, UserCircle } from "lucide-react";
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
  onQuickPlayClick, onLiveChallengeClick, onAnalyticsClick, onGradebookClick, onApprovalsClick,
}: TeacherQuickActionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {/* Quick Play */}
      <HelpTooltip className="h-full" content="Create a QR code for students to scan and play selected words - no login required!">
        <div className="h-full" data-tour="quick-play">
          <ActionCard
            icon={<QrCode size={24} />}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            title="Quick Online Challenge"
            description="Generate QR code for instant play"
            buttonText="Create"
            buttonVariant="qr-purple"
            onClick={onQuickPlayClick}
          />
        </div>
      </HelpTooltip>

      {/* Live Challenge - Hidden */}
      {false && (
        <HelpTooltip className="h-full" content="Start a real-time vocabulary competition - students race to answer correctly!">
          <div className="h-full">
            <ActionCard
              icon={<RefreshCw size={24} />}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              title="Live Mode for Classes"
              description="Start a real-time vocabulary competition"
              buttonText="Start"
              buttonVariant="live-green"
              onClick={onLiveChallengeClick}
            />
          </div>
        </HelpTooltip>
      )}

      {/* Analytics */}
      <HelpTooltip className="h-full" content="See every student's scores across all assignments, identify struggling students, track trends, and find the most-missed words">
        <div className="h-full" data-tour="analytics">
          <ActionCard
            icon={<BarChart3 size={24} />}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            title="Classroom Analytics"
            description="Scores, trends & weak words"
            buttonText="View Insights"
            buttonVariant="analytics-blue"
            onClick={onAnalyticsClick}
          />
        </div>
      </HelpTooltip>

      {/* Gradebook & Students */}
      <HelpTooltip className="h-full" content="View all students, track scores, progress, and activity history">
        <div className="h-full" data-tour="gradebook">
          <ActionCard
            icon={<Trophy size={24} />}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            title="Students & Grades"
            description="All students & scores"
            buttonText="Open Gradebook"
            buttonVariant="gradebook-amber"
            onClick={onGradebookClick}
          />
        </div>
      </HelpTooltip>

      {/* Student Approvals */}
      <HelpTooltip className="h-full" content="Approve students who signed up for your classes">
        <div className="h-full" data-tour="approvals">
          <ActionCard
            icon={<UserCircle size={24} />}
            iconBg="bg-rose-100"
            iconColor="text-rose-600"
            title="Student Approvals"
            description={pendingStudentsCount > 0 ? `${pendingStudentsCount} waiting` : "No pending approvals"}
            buttonText={pendingStudentsCount > 0 ? `Review (${pendingStudentsCount})` : "Check"}
            buttonVariant={pendingStudentsCount > 0 ? "secondary" : "rose"}
            onClick={onApprovalsClick}
            badge={pendingStudentsCount > 0 ? pendingStudentsCount : undefined}
          />
        </div>
      </HelpTooltip>
    </div>
  );
}
