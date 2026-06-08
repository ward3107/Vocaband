import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Bot, RefreshCw, CloudOff } from "lucide-react";
import { callAdminRpcCached, adminApiGet, fmtUsd, fmtNum, type DevAiUsage, type ProviderBilling, type ProviderCost } from "./devShared";
import { Sparkline } from "./charts";

/** One provider's real billed spend, or its setup hint when no admin key is set. */
function BillingRow({ label, cost, setupHint }: { label: string; cost?: ProviderCost; setupHint: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/60 text-sm font-bold">{label}</span>
      {!cost ? (
        <span className="text-white/30 text-xs">…</span>
      ) : cost.configured && cost.ok ? (
        <span className="text-emerald-300 font-black">${(cost.costUsd ?? 0).toFixed(2)}</span>
      ) : cost.configured ? (
        // Provider errors echo a raw JSON body with an unbreakable request_id —
        // break-all keeps that long token from blowing out the page width on mobile.
        <span className="text-rose-300 text-xs font-bold text-right max-w-[60%] min-w-0 break-all">
          Error {cost.status ?? ""}: {cost.message ?? "request failed"}
        </span>
      ) : (
        <span className="text-white/40 text-xs text-right max-w-[60%] min-w-0 break-words">{setupHint}</span>
      )}
    </div>
  );
}

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
  const [billing, setBilling] = useState<ProviderBilling | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect; matches existing convention (AdminSecurityView etc.)
    setLoading(true);
    void Promise.all([
      callAdminRpcCached<DevAiUsage>("admin_ai_usage", { p_days: days }, showToast),
      adminApiGet<ProviderBilling>(`/api/admin/provider-billing?days=${days}`),
    ]).then(([usage, bill]) => {
      if (cancelled) return;
      setData(usage);
      setBilling(bill);
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
              className={`px-4 py-2 rounded-xl font-bold text-base transition-all ${
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
        <div className="flex items-center gap-2 text-white/80 text-sm font-black tracking-widest uppercase mb-1">
          <Bot className="w-4 h-4" /> Estimated AI spend · {days}d
        </div>
        <div className="text-5xl font-black">{fmtUsd(total)}</div>
        <p className="text-white/70 text-sm font-bold mt-1">
          Per-call estimate from ai_usage_counters. Not the provider bill — see below.
        </p>
      </div>

      {(data?.by_day ?? []).length > 1 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-black text-white/80 text-base">Daily spend</div>
            <div className="text-white/40 text-sm">{data!.by_day.length} days</div>
          </div>
          <div className="text-amber-300">
            <Sparkline data={data!.by_day.map((d) => (d.cost_micro ?? 0) / 1_000_000)} height={64} />
          </div>
          <div className="flex justify-between text-white/30 text-xs mt-1">
            <span>{data!.by_day[0]?.day}</span>
            <span>{data!.by_day[data!.by_day.length - 1]?.day}</span>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-3 font-black text-white/80 text-base">By action</div>
        {(data?.by_action ?? []).length === 0 ? (
          <p className="px-5 pb-4 text-white/40 text-base">No usage in this window.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <tbody>
                {(data?.by_action ?? []).map((a) => (
                  <tr key={a.action} className="border-t border-white/5">
                    <td className="px-5 py-2 text-white/80 font-bold whitespace-nowrap">{ACTION_LABELS[a.action] ?? a.action}</td>
                    <td className="px-5 py-2 text-white/50 text-right whitespace-nowrap">{fmtNum(a.calls)} calls</td>
                    <td className="px-5 py-2 text-emerald-300 font-bold text-right whitespace-nowrap">{fmtUsd(a.cost_micro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-3 font-black text-white/80 text-base">Top teachers</div>
        {(data?.top_teachers ?? []).length === 0 ? (
          <p className="px-5 pb-4 text-white/40 text-base">No usage in this window.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <tbody>
                {(data?.top_teachers ?? []).map((t) => (
                  <tr key={t.teacher_uid} className="border-t border-white/5">
                    <td className="px-5 py-2 text-white/80 font-bold truncate max-w-[200px]">{t.email ?? t.teacher_uid}</td>
                    <td className="px-5 py-2 text-white/50 text-right whitespace-nowrap">{fmtNum(t.calls)} calls</td>
                    <td className="px-5 py-2 text-emerald-300 font-bold text-right whitespace-nowrap">{fmtUsd(t.cost_micro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl p-5 bg-white/5 border border-white/10 space-y-4"
      >
        <div className="flex items-center gap-2 text-white/70 font-black text-base">
          <CloudOff className="w-4 h-4" /> Live provider billing
        </div>

        <BillingRow
          label="Anthropic"
          cost={billing?.anthropic}
          setupHint={
            <>
              Set <code className="text-white/70">ANTHROPIC_ADMIN_KEY</code> on the server
            </>
          }
        />

        <BillingRow
          label="Google Cloud (Gemini)"
          cost={billing?.google}
          setupHint={billing?.google.reason ?? "Needs BigQuery billing export"}
        />

        <p className="text-white/30 text-xs leading-relaxed border-t border-white/10 pt-3">
          Real billed dollars from the providers. Anthropic needs an admin API key; Google needs a Cloud
          Billing → BigQuery export + service account. Until set, the per-call estimate above is your best guide.
        </p>
      </motion.div>
    </div>
  );
}
