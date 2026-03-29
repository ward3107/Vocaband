import React from "react";
import { Check, Copy, MessageCircle, Trash2, Zap } from "lucide-react";

interface ClassCardProps {
  name: string;
  code: string;
  studentCount?: number;
  onAssign: () => void;
  onCopyCode: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
  copiedCode?: string | null;
}

const ClassCard: React.FC<ClassCardProps> = ({
  name,
  code,
  studentCount,
  onAssign,
  onCopyCode,
  onWhatsApp,
  onDelete,
  copiedCode,
}) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-xl shadow-stone-900/10 border-2 border-blue-100">
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-on-surface leading-tight truncate">{name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-primary text-white text-xs font-black rounded-full uppercase tracking-wide shadow-md">
                {code}
              </span>
              {studentCount !== undefined && (
                <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
                  👥 {studentCount}
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary shrink-0 ml-3">
            <Zap size={18} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAssign}
            className="signature-gradient text-white py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Zap size={14} /> Assign
          </button>
          <button
            onClick={onCopyCode}
            className="bg-surface-container-low text-on-surface py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 hover:bg-surface-container active:scale-95 transition-all"
          >
            {copiedCode === code ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
            {copiedCode === code ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={onWhatsApp}
            className="bg-[#25D366]/10 text-[#128C7E] py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 hover:bg-[#25D366]/20 active:scale-95 transition-all"
          >
            <MessageCircle size={14} /> WhatsApp
          </button>
          <button
            onClick={onDelete}
            className="bg-error-container/10 text-error py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 hover:bg-error-container/20 active:scale-95 transition-all"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassCard;
