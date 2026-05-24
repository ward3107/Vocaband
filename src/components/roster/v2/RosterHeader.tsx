import { Copy, Plus, Printer } from "lucide-react";
import { BRAND_GRADIENT } from "../../dashboard/dashboardAccents";
import { ClassTile } from "./StudentAvatar";
import type { StudentAccent } from "./constants";

interface RosterHeaderProps {
  className: string;
  classCode: string;
  classEmoji: string;
  classAccent?: StudentAccent;
  studentCountLabel: string;
  classLabel: string;
  title: string;
  printLabel: string;
  addStudentLabel: string;
  ariaCopyCode: string;
  mobile?: boolean;
  onCopyCode: () => void;
  onPrint: () => void;
  onAddStudent: () => void;
}

/**
 * Header strip at the top of the Roster modal — emoji tile, section
 * label ("Class · 7a"), h1, mono code chip with copy, and print / add
 * buttons on the trailing edge.  Buttons collapse off-screen on mobile.
 */
export default function RosterHeader({
  className,
  classCode,
  classEmoji,
  classAccent = "default",
  studentCountLabel,
  classLabel,
  title,
  printLabel,
  addStudentLabel,
  ariaCopyCode,
  mobile = false,
  onCopyCode,
  onPrint,
  onAddStudent,
}: RosterHeaderProps) {
  return (
    <header className={`flex items-start gap-4 sm:gap-5 ${mobile ? "mb-5" : "mb-7"}`}>
      {!mobile && <ClassTile emoji={classEmoji} accent={classAccent} size={56} />}

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8B5CF6]">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}
          />
          {classLabel} · {className}
        </div>
        <h1
          className={`m-0 font-extrabold leading-none tracking-[-0.025em] text-[#1F1147] ${mobile ? "text-[24px]" : "text-[32px]"}`}
        >
          {title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[13px] text-[#6B6388]">
          <button
            type="button"
            onClick={onCopyCode}
            aria-label={ariaCopyCode}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="inline-flex items-center gap-2 rounded-full border-0 bg-white/65 px-3 py-1.5 font-mono text-[13px] font-semibold text-[#4A3B7A] backdrop-blur-sm transition-transform active:scale-95"
          >
            {classCode}
            <Copy size={14} className="opacity-50" />
          </button>
          <span>· {studentCountLabel}</span>
        </div>
      </div>

      {!mobile && (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onPrint}
            style={{ touchAction: "manipulation", boxShadow: "0 4px 14px -8px rgba(99,102,241,0.3)" }}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-500/[0.10] bg-white px-[18px] py-[11px] text-[14px] font-bold text-[#1F1147]"
          >
            <Printer size={14} /> {printLabel}
          </button>
          <button
            type="button"
            onClick={onAddStudent}
            style={{
              touchAction: "manipulation",
              background: BRAND_GRADIENT,
              boxShadow: "0 12px 26px -10px rgba(139,92,246,0.55)",
            }}
            className="inline-flex items-center gap-2 rounded-full border-0 px-5 py-3 text-[14px] font-bold text-white transition-transform active:scale-95"
          >
            <Plus size={14} /> {addStudentLabel}
          </button>
        </div>
      )}
    </header>
  );
}
