import { ChevronRight } from "lucide-react";
import { TAG_STYLES, completionRingBackground, type ModeTagColor } from "./constants";

export interface WorksheetRowV2Record {
  id: string;
  title: string;
  modeLabel: string;
  modeTagColor: ModeTagColor;
  completedCount: number;
  /** Optional second number rendered as "{done} of {total}" when set,
   *  just "{done}" otherwise. */
  totalCount?: number;
  /** Pre-formatted "when" string. */
  timeLabel: string;
  /** 0–100. Drives the ring fill. */
  completionPercent: number;
  /** Optional archived badge — host owns archival state. */
  archived?: boolean;
  archivedLabel?: string;
}

interface Props {
  record: WorksheetRowV2Record;
  studentsCount: (done: number, total: number) => string;
  mobile?: boolean;
  onClick?: () => void;
}

/**
 * Single worksheet row matching the new v2 design — frosted emoji
 * tile, format tag pill, conic-gradient completion ring, soft
 * drop-shadow card. The whole row is the click target.
 */
export default function WorksheetRowV2({ record, studentsCount, mobile = false, onClick }: Props) {
  const tagStyle = TAG_STYLES[record.modeTagColor];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent" as never,
        boxShadow: "0 10px 24px -22px rgba(60,40,120,0.18)",
      }}
      className={`group flex w-full items-center gap-3 sm:gap-[18px] rounded-[22px] border border-[var(--vb-border)] bg-[var(--vb-surface)] text-start transition-transform hover:translate-x-0.5 ${
        mobile ? "mb-2 px-4 py-3.5" : "mb-2.5 px-[18px] sm:px-[22px] py-4"
      }`}
    >
      <div
        className={`grid shrink-0 place-items-center ${
          mobile ? "h-9 w-9 rounded-xl text-[18px]" : "h-11 w-11 rounded-[14px] text-[22px]"
        }`}
        style={{
          background: "linear-gradient(135deg, #EEF0FF, #F8E8FF)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
        aria-hidden
      >
        📝
      </div>

      <div className="min-w-0 flex-1">
        <div className={`flex items-center gap-2 min-w-0`}>
          <div
            className={`truncate font-bold text-[var(--vb-text-primary)] ${
              mobile ? "text-[14px]" : "text-[15px]"
            }`}
          >
            {record.title}
          </div>
          {record.archived && (
            <span className="shrink-0 rounded-full bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5">
              {record.archivedLabel ?? "Archived"}
            </span>
          )}
        </div>
        <div
          className={`mt-1 flex items-center gap-x-3 gap-y-1 flex-wrap font-medium text-[var(--vb-text-secondary)] ${
            mobile ? "text-[11px]" : "text-[12px]"
          }`}
        >
          <span
            className={`rounded-full font-extrabold uppercase ${
              mobile
                ? "px-2 py-[2px] text-[9px] tracking-[0.05em]"
                : "px-2.5 py-[3px] text-[10px] tracking-[0.08em]"
            }`}
            style={{ color: tagStyle.text, background: tagStyle.background }}
          >
            {record.modeLabel}
          </span>
          {!mobile && record.totalCount !== undefined && (
            <span>👥 {studentsCount(record.completedCount, record.totalCount)}</span>
          )}
          {!mobile && record.totalCount === undefined && record.completedCount > 0 && (
            <span>👥 {record.completedCount}</span>
          )}
          {!mobile && <span aria-hidden>·</span>}
          <span>{mobile ? record.timeLabel.replace(" ago", "") : `⏱ ${record.timeLabel}`}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <CompletionRing percent={record.completionPercent} size={mobile ? 44 : 60} />
        {!mobile && (
          <ChevronRight size={20} className="text-[#8B5CF6] opacity-55 rtl:-scale-x-100" />
        )}
      </div>
    </button>
  );
}

interface RingProps {
  percent: number;
  size?: number;
}

/**
 * Donut ring rendering 0–100 completion via a conic-gradient + a
 * white inner disc.  Scales cleanly across sizes — no SVG, no canvas.
 */
export function CompletionRing({ percent, size = 60 }: RingProps) {
  const fontSize = Math.max(11, Math.round(size * 0.22));
  return (
    <div
      className="relative grid place-items-center rounded-full"
      style={{ width: size, height: size, background: completionRingBackground(percent) }}
      role="img"
      aria-label={`${Math.round(percent)}%`}
    >
      <span
        className="absolute rounded-full"
        style={{ inset: 6, backgroundColor: "var(--vb-surface)" }}
        aria-hidden
      />
      <span className="relative font-extrabold text-[var(--vb-text-primary)]" style={{ fontSize }}>
        {Math.round(percent)}%
      </span>
    </div>
  );
}
