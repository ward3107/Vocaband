import React from "react";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  onClick: () => void;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 text-primary font-bold hover:underline transition-all group ${className}`}
    >
      <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
      <span>Back</span>
    </button>
  );
};

export default BackButton;
