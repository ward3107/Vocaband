interface StatCardProps {
  label: string;
  value: string | number;
  /** Optional second value rendered smaller next to the main value
   *  (e.g. delta "↑ 4" or denominator "/ 26"). */
  trailing?: string;
}

/**
 * Single white stat card used in the redesigned Today row.
 * Caps-label on top, big number below, optional trailing micro-stat.
 */
export default function StatCard({ label, value, trailing }: StatCardProps) {
  return (
    <div
      className="rounded-[22px] border border-indigo-500/[0.10] bg-white px-[18px] sm:px-[22px] py-[16px] sm:py-[18px]"
      style={{
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
      }}
    >
      <div className="mb-2 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8B85AB]">
        {label}
      </div>
      <div className="text-[22px] sm:text-[28px] font-extrabold leading-none text-[#1F1147]">
        {value}
        {trailing && (
          <small className="ms-1 text-[12px] sm:text-[13px] font-medium text-[#6B6388]">
            {trailing}
          </small>
        )}
      </div>
    </div>
  );
}
