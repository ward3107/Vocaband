import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import BrandWordmark from "./BrandWordmark";

/** Shared page identity and back action; callers retain their navigation guard. */
export default function WorkspaceHeader({ title, subtitle, onBack, trailing }: {
  title: string; subtitle?: string; onBack: () => void; trailing?: ReactNode;
}) {
  const { language, isRTL } = useLanguage();
  const back = language === "he" ? "חזרה" : language === "ar" ? "رجوع" : "Back";
  return (
    <header className="mb-6">
      <div className="mb-6 flex min-h-12 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="vb-icon-button" aria-label={back}><ArrowLeft size={20} className={isRTL ? "rotate-180" : undefined} aria-hidden /></button>
          <span className="hidden sm:inline-flex"><BrandWordmark /></span>
        </div>
        <div className="flex min-w-0 items-center gap-2">{trailing}</div>
      </div>
      <h1 className="vb-page-title">{title}</h1>
      {subtitle && <p className="vb-description mt-2 max-w-2xl">{subtitle}</p>}
    </header>
  );
}
