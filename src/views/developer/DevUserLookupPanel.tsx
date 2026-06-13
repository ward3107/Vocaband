import { useCallback, useEffect, useState } from "react";
import { Search, ChevronRight, GraduationCap, Sparkles, Calendar, Building2, UserCog, ArrowDown, ExternalLink } from "lucide-react";
import { callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache, type DevUserSearchResult } from "./devShared";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  /** Open the Person 360 drawer for a result (wired by the dashboard shell). */
  onOpenPerson?: (u: DevUserSearchResult) => void;
}

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-rose-500/20 text-rose-200",
  manager: "bg-sky-500/20 text-sky-200",
  teacher: "bg-violet-500/20 text-violet-200",
  student: "bg-emerald-500/20 text-emerald-200",
};

const PLAN_BADGE: Record<string, string> = {
  pro: "bg-violet-500/20 text-violet-200",
  school: "bg-amber-500/20 text-amber-200",
  free: "bg-white/10 text-white/50",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function trialBadge(plan: string | null, trialEndsAt: string | null): { text: string; cls: string } | null {
  if (plan !== "free" || !trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  if (ms <= 0) return { text: "trial expired", cls: "bg-rose-500/20 text-rose-200" };
  const days = Math.ceil(ms / 86_400_000);
  return { text: `${days}d trial`, cls: "bg-amber-500/20 text-amber-200" };
}

export default function DevUserLookupPanel({ showToast, onOpenPerson }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<DevUserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [demoteTarget, setDemoteTarget] = useState<DevUserSearchResult | null>(null);

  // 300ms debounce so the admin doesn't fire an RPC on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const res = await callAdminRpcCached<DevUserSearchResult[]>(
      "admin_search_users",
      { p_query: q.trim(), p_limit: 50 },
      showToast,
    );
    setLoading(false);
    setResults(res ?? []);
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    void search(debounced);
  }, [debounced, search]);

  const applyRole = useCallback(async (r: DevUserSearchResult, newRole: "teacher" | "student") => {
    setBusyUid(r.uid);
    const res = await callAdminRpc<{ success?: boolean; new_role?: string }>(
      "admin_set_role",
      { p_uid: r.uid, p_role: newRole },
      showToast,
    );
    setBusyUid(null);
    if (res?.success) {
      showToast(`${r.email ?? r.uid} → ${newRole}`, "success");
      // Bust all the caches affected by a role flip.
      invalidateAdminRpcCache("admin_search_users");
      invalidateAdminRpcCache("admin_list_entitlements");
      invalidateAdminRpcCache("admin_dashboard_overview");
      // Re-run the current search to refresh the rendered row.
      await search(debounced);
    }
  }, [debounced, search, showToast]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center gap-2">
        <Search className="w-5 h-5 text-white/40 ml-2" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, name, uid, or 6-char class code…"
          className="flex-1 px-2 py-2 bg-transparent text-white placeholder-white/30 text-base focus:outline-none"
        />
        {loading && <span className="text-white/40 text-sm pr-2">searching…</span>}
      </div>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="text-white/40 text-sm">Type at least 2 characters.</p>
      )}

      {query.trim().length >= 2 && !loading && results.length === 0 && (
        <p className="text-white/40 text-sm">No matches.</p>
      )}

      <div className="space-y-3">
        {results.map((r) => {
          const trial = trialBadge(r.plan, r.trial_ends_at);
          const isOpen = expanded === r.uid;
          return (
            <div key={r.uid} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : r.uid)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/5 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-base truncate">
                      {r.display_name || r.email || r.uid}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${ROLE_BADGE[r.role] ?? "bg-white/10 text-white/50"}`}>
                      {r.role}
                    </span>
                    {r.role === "teacher" && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${PLAN_BADGE[r.plan ?? "free"]}`}>
                        {r.plan ?? "free"}
                      </span>
                    )}
                    {trial && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${trial.cls}`}>
                        {trial.text}
                      </span>
                    )}
                  </div>
                  <div className="text-white/50 text-sm mt-0.5 truncate">{r.email ?? "—"}</div>
                </div>
                <ChevronRight className={`w-5 h-5 text-white/30 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-white/5 px-5 py-4 space-y-4">
                  {onOpenPerson && (
                    <button
                      type="button"
                      onClick={() => onOpenPerson(r)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-base"
                    >
                      <ExternalLink className="w-4 h-4" /> Open full profile (360)
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <span className="text-white/40 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> First seen
                    </span>
                    <span className="text-white font-bold">{fmtDate(r.first_seen_at)}</span>

                    <span className="text-white/40 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Last activity
                    </span>
                    <span className="text-white font-bold">{fmtDate(r.last_activity_at)}</span>

                    {r.school_name && (
                      <>
                        <span className="text-white/40 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" /> School
                        </span>
                        <span className="text-white font-bold truncate">{r.school_name}</span>
                      </>
                    )}

                    <span className="text-white/40">UID</span>
                    <span className="text-white/70 font-mono text-sm truncate">{r.uid}</span>

                    {r.consent_given_at && (
                      <>
                        <span className="text-white/40">Consent</span>
                        <span className="text-white/70 text-sm">{fmtDate(r.consent_given_at)}</span>
                      </>
                    )}
                  </div>

                  {r.classes.length > 0 && (
                    <div>
                      <div className="text-white/60 text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4" /> Classes ({r.classes.length})
                      </div>
                      <div className="space-y-1.5">
                        {r.classes.map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-3 py-2">
                            <span className="text-white font-bold truncate">{c.name}</span>
                            <span className="text-white/50 font-mono text-sm shrink-0">
                              {c.code} · {c.student_count} students
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(r.role === "student" || r.role === "teacher") && (
                    <div>
                      <div className="text-white/60 text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <UserCog className="w-4 h-4" /> Role
                      </div>
                      {r.role === "student" && (
                        <button
                          type="button"
                          disabled={busyUid === r.uid}
                          onClick={() => void applyRole(r, "teacher")}
                          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                          className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-base flex items-center gap-2"
                        >
                          <UserCog className="w-4 h-4" /> Promote to teacher
                        </button>
                      )}
                      {r.role === "teacher" && (
                        <button
                          type="button"
                          disabled={busyUid === r.uid}
                          onClick={() => setDemoteTarget(r)}
                          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                          className="px-5 py-3 rounded-xl bg-white/5 hover:bg-rose-500/15 disabled:opacity-50 text-white/70 hover:text-rose-200 font-bold text-base flex items-center gap-2"
                        >
                          <ArrowDown className="w-4 h-4" /> Demote to student
                        </button>
                      )}
                      {r.role === "student" && (
                        <p className="text-white/40 text-sm mt-2">
                          Also adds their email to <code className="text-white/70">teacher_allowlist</code> so future re-signups succeed.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!demoteTarget}
        tone="warning"
        title="Demote to student?"
        body={demoteTarget && (
          <>Demotes <strong className="text-white">{demoteTarget.email ?? demoteTarget.uid}</strong> from teacher to
          student. They lose access to their {demoteTarget.classes.length} class(es) — class data is kept.</>
        )}
        confirmLabel="Demote to student"
        busy={!!demoteTarget && busyUid === demoteTarget.uid}
        onConfirm={async () => {
          if (!demoteTarget) return;
          await applyRole(demoteTarget, "student");
          setDemoteTarget(null);
        }}
        onCancel={() => setDemoteTarget(null)}
      />
    </div>
  );
}
