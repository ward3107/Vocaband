import React from "react";

interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  title: string;
  description: string;
  buttonText: string;
  buttonVariant: "primary" | "rose" | "orange-green";
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  buttonText,
  buttonVariant,
  onClick,
}) => {
  return (
    <div className="group relative overflow-hidden bg-surface-container-lowest rounded-xl p-5 shadow-xl shadow-stone-900/5 border-2 border-blue-50 hover:scale-[1.02] transition-transform duration-300">
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
            <span className={iconColor}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-on-surface mb-1">{title}</h3>
            <p className="text-sm text-on-surface-variant font-medium">{description}</p>
          </div>
        </div>
        <button
          onClick={onClick}
          className={`mt-4 font-black py-2.5 rounded-full text-xs text-center uppercase tracking-wider active:scale-95 transition-all ${
            buttonVariant === "primary"
              ? "signature-gradient text-white shadow-lg shadow-blue-500/20"
              : buttonVariant === "rose"
              ? "bg-gradient-to-r from-yellow-300 to-amber-400 text-black shadow-lg shadow-yellow-300/30 hover:from-yellow-400 hover:to-amber-500"
              : "bg-gradient-to-r from-orange-400 to-green-500 text-white shadow-lg shadow-orange-500/20 hover:from-orange-500 hover:to-green-600"
          }`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default ActionCard;
