import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bot, RefreshCw, CloudOff } from "lucide-react";
import { callAdminRpc, fmtUsd, fmtNum, type DevAiUsage } from "./devShared";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const RANGES = [7, 30, 90] as const;

/** Friendly labels for the ai_usage_counters.action enum. */
const ACTION_LABELS: Record<string, string> = {
  ocr_image: "OCR image",
  ocr_document: "OCR document",
  ai_topic_words: "Topic words",
  ai_augment_words: "Augment words",
  ai_generate_sentences: "Sentences",
  ai_generate_text: "Lesson text",
  ai_generate_questions: "Lesson questions",
  translation_batch: "Translation",
  audio_generation: "Audio",
};

export default function DevAiCostPanel({ showToast }: Props) {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<DevAiUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect; matches existing convention (AdminSecurityView etc.)
    setLoading(true);
    void callAdminRpc<DevAiUsage>("admin_ai_usage", { p_days: days }, showToast).then((res) => {
      if (cancelled) return;
      setData(res);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [days, showToast]);

  const total = (data?.by_action ?? []).reduce((s, a) => s + (a.cost_micro ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                days === r ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
        {loading && <RefreshCw className="w-4 h-4 text-white/40 animate-spin" />}
      </div>

      <div className="rounded-2xl p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-center gap-2 text-white/80 text-xs font-black tracking-widest uppercase mb-1">
          <Bot className="w-4 h-4" /> Estimated AI spend · {days}d
        </div>
        <div className="text-4xl font-black">{fmtUsd(total)}</div>
        <p className="text-white/70 text-xs font-bold mt-1">
          Per-call estimate from ai_usage_counters. Not the provider bill — see below.
        </p>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-3 font-black text-white/80 text-sm">By action</div>
        {(data?.by_action ?? []).length === 0 ? (
          <p className="px-5 pb-4 text-white/40 text-sm">No usage in this window.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {(data?.by_action ?? []).map((a) => (
                <tr key={a.action} className="border-t border-white/5">
                  <td className="px-5 py-2 text-white/80 font-bold">{ACTION_LABELS[a.action] ?? a.action}</td>
                  <td className="px-5 py-2 text-white/50 text-right">{fmtNum(a.calls)} calls</td>
                  <td className="px-5 py-2 text-emerald-300 font-bold text-right">{fmtUsd(a.cost_micro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-3 font-black text-white/80 text-sm">Top teachers</div>
        {(data?.top_teachers ?? []).length === 0 ? (
          <p className="px-5 pb-4 text-white/40 text-sm">No usage in this window.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {(data?.top_teachers ?? []).map((t) => (
                <tr key={t.teacher_uid} className="border-t border-white/5">
                  <td className="px-5 py-2 text-white/80 font-bold truncate max-w-[200px]">{t.email ?? t.teacher_uid}</td>
                  <td className="px-5 py-2 text-white/50 text-right">{fmtNum(t.calls)} calls</td>
                  <td className="px-5 py-2 text-emerald-300 font-bold text-right">{fmtUsd(t.cost_micro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl p-5 bg-white/5 border border-dashed border-white/20"
      >
        <div className="flex items-center gap-2 text-white/70 font-black text-sm mb-2">
          <CloudOff className="w-4 h-4" /> Live provider billing — not configured
        </div>
        <p className="text-white/50 text-xs leading-relaxed">
          The numbers above are per-call estimates. To show real billed dollars, wire two sources:
        </p>
        <ul className="text-white/50 text-xs list-disc list-inside mt-2 space-y-1">
          <li>Google Cloud (Gemini): set up a Cloud Billing → BigQuery export + a service account with <code className="text-white/70">billing.viewer</code>.</li>
          <li>Anthropic: create an admin API key and read the Usage &amp; Cost Admin API.</li>
        </ul>
      </motion.div>
    </div>
  );
}
