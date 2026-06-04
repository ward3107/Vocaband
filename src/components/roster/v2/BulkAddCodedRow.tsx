import { useState } from "react";
import { Sparkles } from "lucide-react";
import { BRAND_GRADIENT } from "../../dashboard/dashboardAccents";

interface BulkAddCodedRowProps {
  /** Resolves to true on success so the row can reset its count field. */
  onGenerate: (grade: number, branch: number, count: number) => Promise<boolean>;
  busy?: boolean;
  mobile?: boolean;
  labels: {
    blurb: string;
    gradeLabel: string;
    branchLabel: string;
    countLabel: string;
    generate: string;
    generating: string;
  };
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/**
 * Bulk "add a whole class" row — three numeric inputs (grade, branch,
 * count) + a brand-gradient Generate button.  No names are entered: the
 * server mints an anonymous code per student.  Styled to match
 * AddStudentRow so the two add affordances read as siblings.
 */
export default function BulkAddCodedRow({
  onGenerate,
  busy = false,
  mobile = false,
  labels,
}: BulkAddCodedRowProps) {
  const [grade, setGrade] = useState("");
  const [branch, setBranch] = useState("");
  const [count, setCount] = useState("");

  const g = parseInt(grade, 10);
  const b = parseInt(branch, 10);
  const c = parseInt(count, 10);
  const valid = g >= 1 && g <= 99 && b >= 1 && b <= 99 && c >= 1 && c <= 60;

  const submit = async () => {
    if (!valid || busy) return;
    const ok = await onGenerate(
      clamp(g, 1, 99),
      clamp(b, 1, 99),
      clamp(c, 1, 60),
    );
    if (ok) setCount("");
  };

  const field =
    "w-full rounded-2xl border-[1.5px] border-indigo-500/[0.10] bg-white px-4 py-[12px] text-center text-[15px] font-bold text-[#1F1147] outline-none transition-shadow focus:border-[#8B5CF6] focus:[box-shadow:0_0_0_4px_rgba(139,92,246,0.15)] disabled:opacity-60";

  return (
    <form
      className="mb-2 rounded-[20px] border border-indigo-500/[0.10] bg-white/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="mb-3 text-[12px] leading-[1.5] text-[#6B6388]">{labels.blurb}</p>
      <div className="flex flex-wrap items-end gap-2.5">
        <label className="flex-1 min-w-[72px] text-[11px] font-bold uppercase tracking-wide text-[#6B6388]">
          {labels.gradeLabel}
          <input
            type="text"
            inputMode="numeric"
            value={grade}
            onChange={(e) => setGrade(e.target.value.replace(/\D/g, "").slice(0, 2))}
            disabled={busy}
            className={`mt-1 ${field}`}
          />
        </label>
        <label className="flex-1 min-w-[72px] text-[11px] font-bold uppercase tracking-wide text-[#6B6388]">
          {labels.branchLabel}
          <input
            type="text"
            inputMode="numeric"
            value={branch}
            onChange={(e) => setBranch(e.target.value.replace(/\D/g, "").slice(0, 2))}
            disabled={busy}
            className={`mt-1 ${field}`}
          />
        </label>
        <label className="flex-1 min-w-[72px] text-[11px] font-bold uppercase tracking-wide text-[#6B6388]">
          {labels.countLabel}
          <input
            type="text"
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 2))}
            disabled={busy}
            className={`mt-1 ${field}`}
          />
        </label>
        <button
          type="submit"
          disabled={!valid || busy}
          className="inline-flex items-center gap-2 rounded-full border-0 font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: BRAND_GRADIENT,
            boxShadow: "0 10px 22px -10px rgba(99,102,241,0.55)",
            padding: mobile ? "12px 16px" : "13px 20px",
            fontSize: mobile ? 15 : 14,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Sparkles size={15} />
          {busy ? labels.generating : labels.generate}
        </button>
      </div>
    </form>
  );
}
