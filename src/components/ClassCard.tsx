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
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl shadow-stone-900/5 border-2 border-blue-50">
      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-black text-on-surface leading-tight">{name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-primary text-white text-xs font-black rounded-full uppercase tracking-tighter shadow-sm">
                Code: {code}
              </span>
              {studentCount !== undefined && (
                <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
                  👥 {studentCount} Students
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary">
            <Zap size={24} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onAssign}
            className="signature-gradient text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Zap size={16} /> Assign
          </button>
          <button
            onClick={onCopyCode}
            className="bg-surface-container-low text-on-surface py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-surface-container active:scale-95 transition-all"
          >
            {copiedCode === code ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
            {copiedCode === code ? "Copied!" : "Copy Code"}
          </button>
          <button
            onClick={onWhatsApp}
            className="bg-[#25D366]/10 text-[#128C7E] py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#25D366]/20 active:scale-95 transition-all"
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button
            onClick={onDelete}
            className="bg-error-container/10 text-error py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-error-container/20 active:scale-95 transition-all"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassCard;
