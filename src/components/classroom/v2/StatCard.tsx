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
      className="rounded-[22px] border px-[18px] sm:px-[22px] py-[16px] sm:py-[18px]"
      style={{
        backgroundColor: "var(--vb-surface)",
        borderColor: "var(--vb-border)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
      }}
    >
      <div
        className="mb-2 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.1em]"
        style={{ color: "var(--vb-text-muted)" }}
      >
        {label}
      </div>
      <div
        className="text-[22px] sm:text-[28px] font-extrabold leading-none"
        style={{ color: "var(--vb-text-primary)" }}
      >
        {value}
        {trailing && (
          <small
            className="ms-1 text-[12px] sm:text-[13px] font-medium"
            style={{ color: "var(--vb-text-secondary)" }}
          >
            {trailing}
          </small>
        )}
      </div>
    </div>
  );
}
