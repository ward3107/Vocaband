/**
 * TeacherLoginView — public-view wrapper around TeacherLoginCard.
 *
 * Mirrors the shape of TermsPageWrapper / PrivacyPageWrapper so it
 * plugs cleanly into the PublicViews dispatcher in
 * `src/views/PublicViews.tsx`.  All the auth logic lives in
 * TeacherLoginCard + useTeacherOtpAuth — this wrapper is just
 * layout chrome (centering + bg).
 */
import TeacherLoginCard from "../components/TeacherLoginCard";
import { useLanguage } from "../hooks/useLanguage";

interface TeacherLoginViewProps {
  /** Pop the user back to the landing page when they click Back. */
  onBack: () => void;
}

export default function TeacherLoginView({ onBack }: TeacherLoginViewProps) {
  const { dir } = useLanguage();
  return (
    <div dir={dir} className="min-h-screen signature-gradient">
      <div className="flex items-center justify-center p-4 sm:p-6 pt-10 sm:pt-14">
        <TeacherLoginCard onCancel={onBack} />
      </div>
    </div>
  );
}
