import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TrendingUp, Clock, XCircle, Award, Users, Building2 } from "lucide-react";
import { callAdminRpcCached, fmtNum, type DevTrialFunnel } from "./devShared";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const RANGES = [7, 30, 90] as const;

const BUCKET_LABEL: Record<number, string> = {
  1: "≤ 1 day",
  3: "2–3 days",
  7: "4–7 days",
  14: "8–14 days",
};

const BUCKET_CLS: Record<number, string> = {
  1: "from-rose-500 to-orange-500",
  3: "from-amber-500 to-yellow-500",
  7: "from-emerald-500 to-teal-500",
  14: "from-sky-500 to-indigo-500",
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/** Sub-day precision when ≤48h, day count otherwise. */
function fmtRemaining(trialEndsAt: string): string {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 48) return `${hours}h`;
  const days = Math.ceil(hours / 24);
  return `${days}d`;
}

/** Color tier by urgency. */
function urgencyClass(daysLeft: number): string {
  if (daysLeft <= 1) return "text-rose-300 bg-rose-500/15";
  if (daysLeft <= 3) return "text-amber-300 bg-amber-500/15";
  if (daysLeft <= 7) return "text-yellow-200 bg-yellow-500/10";
  return "text-emerald-300 bg-emerald-500/10";
}

export default function DevTrialFunnelPanel({ showToast }: Props) {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<DevTrialFunnel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    setLoading(true);
    void callAdminRpcCached<DevTrialFunnel>("admin_trial_funnel", { p_days: days }, showToast).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [days, showToast]);

  const maxBucket = Math.max(1, ...(data?.trialing_buckets ?? []).map((b) => b.count));

  return (
    <div className="space-y-6">
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
            {r}d window
          </button>
        ))}
        {loading && <span className="text-white/40 text-sm ml-2">loading…</span>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/20"
        >
          <Clock className="w-5 h-5 mb-2 text-white/80" />
          <div className="text-3xl font-black leading-none">{fmtNum(data?.trialing_now)}</div>
          <div className="text-white/80 text-sm font-bold mt-1">Trialing now</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-5 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 text-white shadow-lg shadow-emerald-500/20"
        >
          <TrendingUp className="w-5 h-5 mb-2 text-white/80" />
          <div className="text-3xl font-black leading-none">{pct(data?.conversion_rate ?? 0)}</div>
          <div className="text-white/80 text-sm font-bold mt-1">Conversion · {days}d</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-5"
        >
          <XCircle className="w-5 h-5 mb-2 text-rose-300" />
          <div className="text-3xl font-black leading-none">{fmtNum(data?.expired)}</div>
          <div className="text-white/40 text-sm font-bold mt-1">Expired (lapsed)</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-5"
        >
          <Award className="w-5 h-5 mb-2 text-violet-300" />
          <div className="text-3xl font-black leading-none">
            {fmtNum((data?.paid_total.pro ?? 0) + (data?.paid_total.school ?? 0))}
          </div>
          <div className="text-white/40 text-sm font-bold mt-1">
            Paid · {fmtNum(data?.paid_total.pro)} pro / {fmtNum(data?.paid_total.school)} school
          </div>
        </motion.div>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <div className="text-white/80 font-black text-base mb-4">Days remaining (trialing now)</div>
        {(data?.trialing_buckets ?? []).length === 0 ? (
          <p className="text-white/40 text-sm">No teachers are currently trialing.</p>
        ) : (
          <div className="space-y-2.5">
            {data!.trialing_buckets.map((b) => (
              <div key={b.days_left} className="flex items-center gap-3">
                <span className="text-white/70 text-sm font-bold w-24 shrink-0">
                  {BUCKET_LABEL[b.days_left] ?? `${b.days_left}d`}
                </span>
                <div className="flex-1 h-7 rounded-lg bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(b.count / maxBucket) * 100}%` }}
                    transition={{ duration: 0.4 }}
                    className={`h-full bg-gradient-to-r ${BUCKET_CLS[b.days_left] ?? "from-indigo-500 to-violet-500"}`}
                  />
                </div>
                <span className="text-white font-black text-base w-12 text-right shrink-0">{fmtNum(b.count)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2 border-b border-white/5">
          <Users className="w-4 h-4 text-indigo-300" />
          <span className="text-white/80 font-black text-base">Trialing teachers</span>
          <span className="text-white/40 text-sm ml-auto">{fmtNum(data?.trialing_teachers.length)}</span>
        </div>
        {(data?.trialing_teachers ?? []).length === 0 ? (
          <p className="px-5 py-6 text-white/40 text-base">No teachers are currently trialing.</p>
        ) : (
          <ul className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
            {data!.trialing_teachers.map((t) => (
              <li key={t.uid} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-base truncate">
                    {t.display_name || t.email || t.uid}
                  </div>
                  <div className="text-white/50 text-sm truncate flex items-center gap-2 flex-wrap">
                    <span>{t.email ?? "—"}</span>
                    {t.school_name && (
                      <span className="flex items-center gap-1 text-white/40">
                        <Building2 className="w-3 h-3" /> {t.school_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-xl font-black text-base shrink-0 ${urgencyClass(t.days_left)}`}>
                  {fmtRemaining(t.trial_ends_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-white/30 text-sm leading-relaxed">
        Note: "Converted" is approximated as paid teachers whose first_seen_at falls inside the window — it overcounts
        school-license arrivals (never trialed) and undercounts late conversions. Directionally fine for trend, not for
        per-cohort attribution. Precise tracking needs a plan_history table.
      </p>
    </div>
  );
}
