import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Bot, Database, Activity, Server, ShieldAlert, Users, School,
  Search, ScrollText, TrendingUp, ShieldCheck, Flag, Megaphone, Lock, BarChart3,
  CreditCard, GraduationCap, RefreshCw,
} from "lucide-react";
import { hasAdminAccess, type AppUser } from "../core/supabase";
import type { View } from "../core/views";
import {
  callAdminRpcCached, invalidateAdminRpcCache, fmtUsd, fmtNum,
  type DevOverview, type DevAiUsage, type DevUserSearchResult, type DevStatsPoint,
} from "./developer/devShared";
import { Sparkline } from "./developer/charts";
import CommandPalette from "./developer/CommandPalette";
import PersonDrawer from "./developer/PersonDrawer";
import DevAiCostPanel from "./developer/DevAiCostPanel";
import DevDatabasePanel from "./developer/DevDatabasePanel";
import DevClassesPanel from "./developer/DevClassesPanel";
import DevSchoolsPanel from "./developer/DevSchoolsPanel";
import DevSystemPanel from "./developer/DevSystemPanel";
import DevInfraPanel from "./developer/DevInfraPanel";
import DevUserLookupPanel from "./developer/DevUserLookupPanel";
import DevAuditLogPanel from "./developer/DevAuditLogPanel";
import DevTrialFunnelPanel from "./developer/DevTrialFunnelPanel";
import DevDataRequestsPanel from "./developer/DevDataRequestsPanel";
import DevFeatureFlagsPanel from "./developer/DevFeatureFlagsPanel";
import DevAnnouncementsPanel from "./developer/DevAnnouncementsPanel";
import DevSecurityChecklistPanel from "./developer/DevSecurityChecklistPanel";
import DevAuthzFailuresPanel from "./developer/DevAuthzFailuresPanel";
import DevInsightsPanel from "./developer/DevInsightsPanel";

interface Props {
  user: AppUser | null;
  setView: Dispatch<SetStateAction<View>>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type Tab =
  | "users" | "entitlements" | "classes" | "schools"
  | "ai" | "trials" | "insights" | "broadcast"
  | "privacy" | "audit" | "security"
  | "system" | "flags" | "infra";

type Group = "People & access" | "Growth" | "Safety & privacy" | "System";

const TABS: { id: Tab; label: string; icon: typeof Bot; group: Group }[] = [
  { id: "users",        label: "User lookup",   icon: Search,        group: "People & access" },
  { id: "entitlements", label: "Entitlements",  icon: CreditCard,    group: "People & access" },
  { id: "classes",      label: "Classes",       icon: GraduationCap, group: "People & access" },
  { id: "schools",      label: "Schools",       icon: School,        group: "People & access" },

  { id: "ai",        label: "AI & cost",     icon: Bot,        group: "Growth" },
  { id: "trials",    label: "Trial funnel",  icon: TrendingUp, group: "Growth" },
  { id: "insights",  label: "Insights",      icon: BarChart3,  group: "Growth" },
  { id: "broadcast", label: "Broadcast",     icon: Megaphone,  group: "Growth" },

  { id: "privacy",  label: "Privacy requests", icon: ShieldCheck, group: "Safety & privacy" },
  { id: "audit",    label: "Audit log",        icon: ScrollText,  group: "Safety & privacy" },
  { id: "security", label: "Security ops",     icon: Lock,        group: "Safety & privacy" },

  { id: "system", label: "DB health",     icon: Database, group: "System" },
  { id: "flags",  label: "Feature flags", icon: Flag,     group: "System" },
  { id: "infra",  label: "Infra",         icon: Server,   group: "System" },
];

const GROUPS: Group[] = ["People & access", "Growth", "Safety & privacy", "System"];

export default function DeveloperDashboardView({ user, setView, showToast }: Props) {
  const [tab, setTab] = useState<Tab>("users");
  const [ov, setOv] = useState<DevOverview | null>(null);
  const [ai, setAi] = useState<DevAiUsage | null>(null);
  const [stats, setStats] = useState<DevStatsPoint[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [person, setPerson] = useState<DevUserSearchResult | null>(null);

  const isAdmin = hasAdminAccess(user);

  const load = useCallback(async (force = false) => {
    const [o, u, s] = await Promise.all([
      callAdminRpcCached<DevOverview>("admin_dashboard_overview", {}, showToast, { force }),
      callAdminRpcCached<DevAiUsage>("admin_ai_usage", { p_days: 30 }, showToast, { force }),
      callAdminRpcCached<DevStatsPoint[]>("admin_stats_series", { p_days: 30 }, showToast, { force }),
    ]);
    setOv(o);
    setAi(u);
    setStats(s);
  }, [showToast]);

  useEffect(() => {
    if (!isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect; matches existing convention (AdminSecurityView etc.)
    void load();
  }, [isAdmin, load]);

  // Global ⌘K / Ctrl-K opens the command palette from anywhere in the dashboard.
  useEffect(() => {
    if (!isAdmin) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    invalidateAdminRpcCache();
    await load(true);
    setRefreshing(false);
  }, [load]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-400 mb-4" />
        <h1 className="text-white font-black text-xl mb-2">Admins only</h1>
        <p className="text-white/50 text-base mb-6">This dashboard requires an admin account.</p>
        <button type="button" onClick={() => setView("teacher-dashboard")} className="px-5 py-3 rounded-xl bg-white/10 text-white font-bold text-base">
          Back
        </button>
      </div>
    );
  }

  const costSeries = (ai?.by_day ?? []).map((d) => (d.cost_micro ?? 0) / 1_000_000);
  const callSeries = (ai?.by_day ?? []).map((d) => d.calls ?? 0);
  const statSeries = (k: keyof DevStatsPoint) => (stats ?? []).map((s) => Number(s[k]));

  // Every cell carries a real series — counts from the daily snapshot
  // (admin_stats_series), AI from ai_usage_counters. Sparklines only render
  // once ≥2 days have accrued (see Sparkline); until then it's just the number.
  const kpis: { label: string; value: string; icon: typeof Users; series?: number[]; tone?: string }[] = [
    { label: "Teachers", value: fmtNum(ov?.teachers), icon: Users, series: statSeries("teachers"), tone: "text-violet-300" },
    { label: "Students", value: fmtNum(ov?.students), icon: Users, series: statSeries("students"), tone: "text-emerald-300" },
    { label: "Classes", value: fmtNum(ov?.classes), icon: GraduationCap, series: statSeries("classes"), tone: "text-sky-300" },
    { label: "Schools", value: fmtNum(ov?.schools), icon: School, series: statSeries("schools"), tone: "text-fuchsia-300" },
    { label: "AI 30d", value: fmtUsd(ov?.ai_cost_micro_30d), icon: Bot, series: costSeries, tone: "text-amber-300" },
    { label: "AI calls 30d", value: fmtNum(ov?.ai_calls_30d), icon: Activity, series: callSeries, tone: "text-emerald-300" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col lg:flex-row">
      <aside className="lg:w-60 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-slate-950/60 backdrop-blur-sm flex flex-col lg:sticky lg:top-0 lg:h-screen">
        <div className="p-4 flex items-center gap-3 border-b border-white/10">
          <button type="button" onClick={() => setView("voca-picker")} style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-black font-headline truncate">Command center</h1>
            <p className="text-white/40 text-xs font-bold truncate">Admin control</p>
          </div>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 flex-1 overflow-x-auto lg:overflow-y-auto">
          {GROUPS.flatMap((g) => [
            <div key={`h-${g}`} className="hidden lg:block px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-white/30">
              {g}
            </div>,
            ...TABS.filter((t) => t.group === g).map((t) => {
              const active = tab === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`shrink-0 whitespace-nowrap lg:w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-bold transition-all ${active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                  <t.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{t.label}</span>
                </button>
              );
            }),
          ])}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Sticky command bar — ⌘K search + the KPI strip stay pinned while panels scroll. */}
        <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 space-y-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setPaletteOpen(true)} style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="flex-1 flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-white/40 text-base">
                <Search className="w-4 h-4" />
                <span className="flex-1 text-left truncate">Search users, classes, schools…</span>
                <kbd className="text-white/30 text-xs font-mono border border-white/15 rounded px-1.5 py-0.5 hidden sm:inline">⌘K</kbd>
              </button>
              <button type="button" onClick={() => void refresh()} disabled={refreshing} style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2 text-sm font-bold text-white/70 disabled:opacity-50 shrink-0">
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {kpis.map((k) => (
                <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 min-w-0">
                  <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-black uppercase tracking-wider">
                    <k.icon className="w-3 h-3" /> <span className="truncate">{k.label}</span>
                  </div>
                  <div className="text-xl font-black leading-tight mt-0.5">{k.value}</div>
                  {k.series && k.series.length > 1 && (
                    <div className={`mt-1 ${k.tone ?? "text-indigo-300"}`}><Sparkline data={k.series} height={18} /></div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {tab === "users"        && <DevUserLookupPanel showToast={showToast} onOpenPerson={setPerson} />}
          {tab === "entitlements" && <DevDatabasePanel showToast={showToast} />}
          {tab === "classes"      && <DevClassesPanel showToast={showToast} />}
          {tab === "schools"      && <DevSchoolsPanel showToast={showToast} />}
          {tab === "ai"           && <DevAiCostPanel showToast={showToast} />}
          {tab === "trials"       && <DevTrialFunnelPanel showToast={showToast} />}
          {tab === "insights"     && <DevInsightsPanel showToast={showToast} />}
          {tab === "broadcast"    && <DevAnnouncementsPanel showToast={showToast} />}
          {tab === "privacy"      && <DevDataRequestsPanel showToast={showToast} />}
          {tab === "audit"        && <DevAuditLogPanel showToast={showToast} />}
          {tab === "security"     && (
            <div className="space-y-8">
              <DevSecurityChecklistPanel showToast={showToast} />
              <DevAuthzFailuresPanel showToast={showToast} />
            </div>
          )}
          {tab === "system"       && <DevSystemPanel showToast={showToast} />}
          {tab === "flags"        && <DevFeatureFlagsPanel showToast={showToast} />}
          {tab === "infra"        && <DevInfraPanel />}
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        navItems={TABS.map((t) => ({ id: t.id, label: t.label }))}
        onGotoTab={(id) => setTab(id as Tab)}
        onOpenPerson={setPerson}
        showToast={showToast}
      />
      <PersonDrawer person={person} onClose={() => setPerson(null)} onChanged={() => void load(true)} showToast={showToast} />
    </div>
  );
}
