/**
 * DevInsightsPanel — three analytics rollups in one tab:
 *   1. Onboarding funnel (signup → class → assignment → student)
 *   2. Active users (DAU/WAU/MAU split by role)
 *   3. Top modes + top assignments
 *
 * Three RPCs, parallel-loaded.
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Activity, TrendingUp, Trophy, UserPlus, GraduationCap, ClipboardList, Users } from "lucide-react";
import {
  callAdminRpcCached, fmtNum,
  type DevOnboardingFunnel, type DevTopModes, type DevActiveUsers,
} from "./devShared";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const RANGES = [7, 30, 90] as const;

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

const MODE_LABELS: Record<string, string> = {
  flashcards: "Flashcards",
  matching: "Matching",
  spelling: "Spelling",
  multiple_choice: "Multiple choice",
  sentence_builder: "Sentence builder",
  true_false: "True / False",
  scramble: "Scramble",
};

export default function DevInsightsPanel({ showToast }: Props) {
  const [days, setDays] = useState<number>(30);
  const [funnel, setFunnel] = useState<DevOnboardingFunnel | null>(null);
  const [modes, setModes] = useState<DevTopModes | null>(null);
  const [active, setActive] = useState<DevActiveUsers | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    void Promise.all([
      callAdminRpcCached<DevOnboardingFunnel>("admin_onboarding_funnel", { p_days: days }, showToast),
      callAdminRpcCached<DevTopModes>("admin_top_modes", { p_days: days }, showToast),
      callAdminRpcCached<DevActiveUsers>("admin_active_users", {}, showToast),
    ]).then(([f, m, a]) => {
      if (cancelled) return;
      setFunnel(f);
      setModes(m);
      setActive(a);
    });
    return () => { cancelled = true; };
  }, [days, showToast]);

  return (
    <div className="space-y-8">
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
      </div>

      {/* Onboarding funnel */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-300" />
          <h3 className="text-white font-black text-base">Onboarding funnel</h3>
          <span className="text-white/40 text-sm">teachers who signed up in the last {days}d</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Signed up",      value: fmtNum(funnel?.signed_up),      icon: UserPlus,       cls: "from-sky-500 to-indigo-500" },
            { label: "Made a class",   value: fmtNum(funnel?.made_class),     icon: GraduationCap,  cls: "from-indigo-500 to-violet-500", sub: pct(funnel?.rates.class_pct ?? 0) },
            { label: "Made assignment", value: fmtNum(funnel?.made_assignment), icon: ClipboardList,  cls: "from-violet-500 to-fuchsia-500", sub: pct(funnel?.rates.assignment_pct ?? 0) },
            { label: "Got a student",  value: fmtNum(funnel?.got_student),    icon: Users,          cls: "from-fuchsia-500 to-pink-500",   sub: pct(funnel?.rates.student_pct ?? 0) },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl p-5 bg-gradient-to-br ${s.cls} text-white shadow-lg`}
            >
              <s.icon className="w-5 h-5 mb-2 text-white/80" />
              <div className="text-3xl font-black leading-none">{s.value}</div>
              <div className="text-white/80 text-sm font-bold mt-1">{s.label}</div>
              {s.sub && (
                <div className="text-white/60 text-sm font-bold mt-0.5">{s.sub} of prev step</div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Active users */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-300" />
          <h3 className="text-white font-black text-base">Active users (directional)</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["students", "teachers"] as const).map((role) => (
            <div key={role} className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="text-white/60 text-sm font-black uppercase tracking-widest mb-3">{role}</div>
              <div className="grid grid-cols-3 gap-3">
                {(["dau", "wau", "mau"] as const).map((bucket) => (
                  <div key={bucket} className="text-center">
                    <div className="text-2xl font-black text-white leading-none">
                      {fmtNum(active?.[role][bucket])}
                    </div>
                    <div className="text-white/40 text-sm font-bold mt-1 uppercase">{bucket}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-sm leading-relaxed">
          Students: counted via a progress row in the window. Teachers: counted via an audit_log action OR a class
          whose students were active. Misses "logged in but did nothing" — precise tracking needs a last_seen_at column.
        </p>
      </section>

      {/* Top modes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-300" />
          <h3 className="text-white font-black text-base">Top game modes · {days}d</h3>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {(modes?.modes ?? []).length === 0 ? (
            <p className="px-5 py-6 text-white/40 text-base">No plays in this window.</p>
          ) : (
            <table className="w-full text-base">
              <tbody>
                {modes!.modes.map((m) => (
                  <tr key={m.mode} className="border-t border-white/5 first:border-0">
                    <td className="px-5 py-2 text-white font-bold">{MODE_LABELS[m.mode] ?? m.mode}</td>
                    <td className="px-5 py-2 text-white/60 text-right">{fmtNum(m.plays)} plays</td>
                    <td className="px-5 py-2 text-white/60 text-right">{fmtNum(m.players)} players</td>
                    <td className="px-5 py-2 text-emerald-300 font-bold text-right">avg {m.avg_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Top assignments */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-violet-300" />
          <h3 className="text-white font-black text-base">Top assignments · {days}d</h3>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {(modes?.assignments ?? []).length === 0 ? (
            <p className="px-5 py-6 text-white/40 text-base">No assignment plays in this window.</p>
          ) : (
            <ul className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
              {modes!.assignments.map((a) => (
                <li key={a.assignment_id} className="px-5 py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-base truncate">{a.title}</div>
                    <div className="text-white/40 text-sm truncate">{a.class_name}</div>
                  </div>
                  <div className="text-white/60 text-sm shrink-0">{fmtNum(a.plays)} plays</div>
                  <div className="text-white/40 text-sm shrink-0">{fmtNum(a.players)} players</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
