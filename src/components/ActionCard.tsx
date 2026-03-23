import React from "react";

interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  title: string;
  description: string;
  buttonText: string;
  buttonVariant: "primary" | "secondary";
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
    <div className="group relative overflow-hidden bg-surface-container-lowest rounded-xl p-6 shadow-xl shadow-stone-900/5 border-2 border-blue-50 hover:scale-[1.02] transition-transform duration-300">
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center mb-4`}>
            <span className={iconColor}>{icon}</span>
          </div>
          <h3 className="text-xl font-black text-on-surface mb-1">{title}</h3>
          <p className="text-sm text-on-surface-variant font-medium">{description}</p>
        </div>
        <button
          onClick={onClick}
          className={`mt-6 font-black py-3 rounded-full text-sm text-center uppercase tracking-wider active:scale-95 transition-all ${
            buttonVariant === "primary"
              ? "signature-gradient text-white shadow-lg shadow-blue-500/20"
              : "border-2 border-outline-variant/20 text-on-surface hover:bg-surface-container-low"
          }`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default ActionCard;
