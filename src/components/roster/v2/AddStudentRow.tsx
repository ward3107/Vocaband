import { useState } from "react";
import { Plus } from "lucide-react";
import { BRAND_GRADIENT } from "../../dashboard/dashboardAccents";
import { TIP_BG } from "./constants";

interface AddStudentRowProps {
  placeholder: string;
  ctaLabel: string;
  helpText: string;
  /** Resolves to true on success so the row can clear its field.  Async
   *  because the caller writes to Supabase before we know whether to
   *  reset state. */
  onAdd: (name: string) => Promise<boolean> | boolean;
  mobile?: boolean;
  /** Disabled state during an in-flight add. */
  busy?: boolean;
}

/**
 * Inline "add student" row: text input + brand-gradient add button +
 * help text.  Submits on Enter or button click.  Clears its own field
 * once the parent reports success.
 */
export default function AddStudentRow({
  placeholder,
  ctaLabel,
  helpText,
  onAdd,
  mobile = false,
  busy = false,
}: AddStudentRowProps) {
  const [name, setName] = useState("");

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    const ok = await onAdd(trimmed);
    if (ok) setName("");
  };

  return (
    <>
      <form
        className="mb-2 flex items-center gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          disabled={busy}
          className="flex-1 rounded-full border-[1.5px] border-indigo-500/[0.10] bg-white px-[20px] py-[12px] sm:px-[22px] sm:py-[14px] text-[14px] text-[#1F1147] outline-none transition-shadow focus:border-[#8B5CF6] focus:[box-shadow:0_0_0_4px_rgba(139,92,246,0.15)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!name.trim() || busy}
          aria-label={ctaLabel}
          className="inline-flex items-center gap-2 rounded-full border-0 text-white font-bold disabled:cursor-not-allowed disabled:opacity-50 transition-transform active:scale-95"
          style={{
            background: BRAND_GRADIENT,
            boxShadow: "0 10px 22px -10px rgba(99,102,241,0.55)",
            padding: mobile ? "12px 16px" : "14px 22px",
            fontSize: mobile ? 16 : 14,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Plus size={14} />
          {!mobile && ctaLabel}
        </button>
      </form>
      <p className="mb-5 text-[12px] text-[#6B6388]">{helpText}</p>
    </>
  );
}

/**
 * Amber tip card. Brand amber (not harsh production yellow) so it sits
 * inside the violet page chrome without screaming.
 */
export function TipCard({ strong, body }: { strong: string; body: string }) {
  return (
    <div
      className="my-5 flex items-start gap-3 rounded-[18px] px-[18px] py-3.5 text-[13px] leading-[1.5] text-[#7A5520]"
      style={{
        background: TIP_BG,
        border: "1px solid rgba(222,149,66,0.25)",
      }}
      role="note"
    >
      <span className="shrink-0 text-[18px] leading-none" aria-hidden>
        💡
      </span>
      <div>
        <strong>{strong}</strong> {body}
      </div>
    </div>
  );
}
