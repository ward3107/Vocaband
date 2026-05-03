/**
 * GuideTriggerButton — small "?" button that re-opens a page's
 * FirstTimeGuide on demand.  Pages mount this in their chrome (header
 * row, near the Back button or Cancel link) so a teacher who dismissed
 * the auto-open guide can still reach it later.
 */
import { HelpCircle } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherGuidesT } from "../../locales/teacher/guides";

interface GuideTriggerButtonProps {
  onClick: () => void;
  className?: string;
  /** Defaults to the localised "Show page guide" string. */
  ariaLabel?: string;
}

export default function GuideTriggerButton({
  onClick,
  className,
  ariaLabel,
}: GuideTriggerButtonProps) {
  const { language } = useLanguage();
  const t = teacherGuidesT[language].common;
  const label = ariaLabel ?? t.triggerAria;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        backgroundColor: "var(--vb-surface-alt)",
        color: "var(--vb-text-secondary)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent" as never,
      }}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--vb-border)] transition-colors shrink-0 ${
        className ?? ""
      }`}
    >
      <HelpCircle size={18} />
    </button>
  );
}
