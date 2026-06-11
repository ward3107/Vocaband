import { useEffect, useState } from "react";
import { ArrowRight, Search, GraduationCap, Bot, Lock, Activity, UserCog } from "lucide-react";
import { callAdminRpcCached, fmtNum, type DevAiUsage, type DevAuditEntry } from "./devShared";

interface Props {
  ai: DevAiUsage | null;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  onGotoTab: (id: string) => void;
}

const QUICK_LINKS: { id: string; label: string; hint: string; icon: typeof Search; tone: string }[] = [
  { id: "users",    label: "User lookup", hint: "Find & manage a person",  icon: Search,        tone: "text-teal-300" },
  { id: "classes",  label: "Classes",     hint: "Rosters, codes, transfer", icon: GraduationCap, tone: "text-sky-300" },
  { id: "ai",       label: "AI & cost",   hint: "Spend & kill-switch",      icon: Bot,           tone: "text-amber-300" },
  { id: "security", label: "Security ops", hint: "Checklist & authz log",   icon: Lock,          tone: "text-rose-300" },
];

/** Humanise a raw audit action key ("role_change" → "Role change"). */
function humanAction(a: string): string {
  const s = a.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/**
 * Slate-Pro landing tab. Fills what used to be empty space below the KPI strip
 * with an at-a-glance overview: platform activity (real AI-call series), the
 * latest audit actions, and quick links into the busiest panels. Reuses the
 * already-loaded `ai` series from the parent and fetches a short audit slice.
 */
export default function DevHomePanel({ ai, showToast, onGotoTab }: Props) {
  const [recent, setRecent] = useState<DevAuditEntry[] | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await callAdminRpcCached<DevAuditEntry[]>(
        "admin_list_audit_log",
        { p_limit: 6, p_action: null, p_actor: null, p_since: null },
        showToast,
      );
      setRecent(res ?? []);
    })();
  }, [showToast]);

  const byDay = (ai?.by_day ?? []).slice(-14);
  const maxCalls = Math.max(1, ...byDay.map((d) => d.calls ?? 0));
  const totalCalls = byDay.reduce((n, d) => n + (d.calls ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* Platform activity — real AI-call series, last 14 days */}
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-300" />
            <h3 className="font-black text-base">Platform activity</h3>
          </div>
          <p className="text-white/40 text-sm mt-0.5">AI calls · last 14 days · {fmtNum(totalCalls)} total</p>

          {byDay.length === 0 ? (
            <p className="text-white/30 text-sm mt-6">No activity yet.</p>
          ) : (
            <div className="mt-6">
              {/* Bars are direct children of the fixed-height row so their % heights resolve. */}
              <div className="flex items-end gap-2 h-44">
                {byDay.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.calls} calls`}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-teal-600 to-teal-300"
                    style={{ height: `${Math.max(((d.calls ?? 0) / maxCalls) * 100, 3)}%` }}
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                {byDay.map((d) => (
                  <span key={d.day} className="flex-1 text-[9px] text-white/30 text-center truncate">{d.day.slice(5)}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Recent admin actions — short slice of the audit log */}
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-teal-300" />
            <h3 className="font-black text-base">Recent actions</h3>
          </div>
          <p className="text-white/40 text-sm mt-0.5">From the audit log</p>

          <ul className="mt-4 space-y-3">
            {recent === null ? (
              <li className="text-white/30 text-sm">Loading…</li>
            ) : recent.length === 0 ? (
              <li className="text-white/30 text-sm">No recent admin actions.</li>
            ) : (
              recent.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug truncate">
                      {humanAction(e.action)}
                      {e.target_email && <span className="text-white/50 font-medium"> · {e.target_email}</span>}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5 truncate">
                      {e.actor_email ?? "system"} · {fmtAgo(e.created_at)}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
          <button
            type="button"
            onClick={() => onGotoTab("audit")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-teal-300 hover:text-teal-200"
          >
            View full audit log <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      </div>

      {/* Quick links into the busiest panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_LINKS.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onGotoTab(q.id)}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="group text-left rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-teal-400/30 p-4 transition-all"
          >
            <div className="flex items-center justify-between">
              <q.icon className={`w-5 h-5 ${q.tone}`} />
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-teal-300 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="font-black text-base mt-3">{q.label}</p>
            <p className="text-white/40 text-xs mt-0.5">{q.hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
