import React from "react";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from '../hooks/useLanguage';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick, className = "", label }) => {
  const { language, isRTL } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-full px-3 py-2 text-base font-bold text-primary transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 ${className}`}
    >
      <ArrowLeft size={20} aria-hidden="true" className={isRTL ? 'rotate-180' : ''} />
      <span>{label ?? ({ en: 'Back', he: 'חזרה', ar: 'رجوع' }[language])}</span>
    </button>
  );
};

export default BackButton;
