import React from "react";

interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  title: string;
  description: string;
  buttonText: string;
  buttonVariant: "primary" | "secondary" | "rose" | "orange-green" | "qr-purple" | "live-green" | "analytics-blue" | "gradebook-amber";
  onClick: () => void;
  badge?: number;
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
  badge,
}) => {
  return (
    <div className="group relative overflow-hidden bg-surface-container-lowest rounded-xl p-5 shadow-xl shadow-stone-900/5 border-2 border-blue-50 hover:scale-[1.02] transition-transform duration-300">
      {badge != null && badge > 0 && (
        <span className="absolute top-2 right-2 bg-rose-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{badge}</span>
      )}
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
              : buttonVariant === "secondary"
              ? "bg-gray-200 text-gray-800 shadow-lg shadow-gray-300/20 hover:bg-gray-300"
              : buttonVariant === "rose"
              ? "bg-gradient-to-r from-yellow-300 to-amber-400 text-black shadow-lg shadow-yellow-300/30 hover:from-yellow-400 hover:to-amber-500"
              : buttonVariant === "qr-purple"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-700"
              : buttonVariant === "live-green"
              ? "bg-green-600 text-white shadow-lg shadow-green-500/30 hover:bg-green-700"
              : buttonVariant === "analytics-blue"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
              : buttonVariant === "gradebook-amber"
              ? "bg-amber-600 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-700"
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
