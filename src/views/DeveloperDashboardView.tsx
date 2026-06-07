import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Bot, Database, Activity, Server, ShieldAlert, Users, School,
  Search, ScrollText, TrendingUp, ShieldCheck, Flag, Megaphone, Lock, BarChart3,
} from "lucide-react";
import { hasAdminAccess, type AppUser } from "../core/supabase";
import type { View } from "../core/views";
import { callAdminRpcCached, fmtUsd, fmtNum, type DevOverview } from "./developer/devShared";
import DevAiCostPanel from "./developer/DevAiCostPanel";
import DevDatabasePanel from "./developer/DevDatabasePanel";
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
import DevInsightsPanel from "./developer/DevInsightsPanel";

interface Props {
  user: AppUser | null;
  setView: Dispatch<SetStateAction<View>>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type Tab =
  | "ai" | "db" | "schools" | "users" | "trials" | "insights" | "audit" | "privacy"
  | "security" | "flags" | "broadcast" | "system" | "infra";

const TABS: { id: Tab; label: string; icon: typeof Bot }[] = [
  { id: "ai",        label: "AI & Cost",         icon: Bot },
  { id: "db",        label: "Database",          icon: Database },
  { id: "schools",   label: "Schools",           icon: School },
  { id: "users",     label: "User lookup",       icon: Search },
  { id: "trials",    label: "Trial funnel",      icon: TrendingUp },
  { id: "insights",  label: "Insights",          icon: BarChart3 },
  { id: "audit",     label: "Audit log",         icon: ScrollText },
  { id: "privacy",   label: "Privacy requests",  icon: ShieldCheck },
  { id: "security",  label: "Security ops",      icon: Lock },
  { id: "flags",     label: "Feature flags",     icon: Flag },
  { id: "broadcast", label: "Broadcast",         icon: Megaphone },
  { id: "system",    label: "System",            icon: Activity },
  { id: "infra",     label: "Infra",             icon: Server },
];

export default function DeveloperDashboardView({ user, setView, showToast }: Props) {
  const [tab, setTab] = useState<Tab>("ai");
  const [ov, setOv] = useState<DevOverview | null>(null);

  const isAdmin = hasAdminAccess(user);

  useEffect(() => {
    if (!isAdmin) return;
    // Cached read: a remount within the 60s TTL paints KPIs from cache instantly,
    // so jumping out of /developer-dashboard and back doesn't re-trigger the
    // overview RPC. See devShared.ts cache comment.
    void callAdminRpcCached<DevOverview>("admin_dashboard_overview", {}, showToast).then(setOv);
  }, [isAdmin, showToast]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-400 mb-4" />
        <h1 className="text-white font-black text-xl mb-2">Admins only</h1>
        <p className="text-white/50 text-base mb-6">This dashboard requires an admin account.</p>
        <button
          type="button"
          onClick={() => setView("teacher-dashboard")}
          className="px-5 py-3 rounded-xl bg-white/10 text-white font-bold text-base"
        >
          Back
        </button>
      </div>
    );
  }

  const kpis = [
    { label: "Teachers", value: fmtNum(ov?.teachers), icon: Users },
    { label: "Students", value: fmtNum(ov?.students), icon: Users },
    { label: "Classes", value: fmtNum(ov?.classes), icon: Database },
    { label: "Schools", value: fmtNum(ov?.schools), icon: School },
    { label: "AI 30d", value: fmtUsd(ov?.ai_cost_micro_30d), icon: Bot },
    { label: "AI calls 30d", value: fmtNum(ov?.ai_calls_30d), icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col lg:flex-row">
      {/* Sidebar — vertical rail on desktop, stacks above the content as a
          horizontally-scrolling tab strip on mobile so the main panel keeps
          the full viewport width instead of being squished into a column. */}
      <aside className="lg:w-60 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-slate-950/60 backdrop-blur-sm flex flex-col lg:sticky lg:top-0 lg:h-screen">
        <div className="p-4 flex items-center gap-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => setView("voca-picker")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-black font-headline truncate">Developer</h1>
            <p className="text-white/40 text-xs font-bold truncate">Admin control</p>
          </div>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 flex-1 overflow-x-auto lg:overflow-y-auto">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`shrink-0 whitespace-nowrap lg:w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-bold transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <t.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main — overflow-x-hidden is a backstop so a stray wide child (long
          error string, table) can't drag the whole page into a horizontal
          scroll and expose a blank gutter on mobile. Panels that genuinely
          need width scroll inside their own overflow-x-auto wrapper. */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {kpis.map((k) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white/5 border border-white/10 p-4"
              >
                <k.icon className="w-4 h-4 text-indigo-300 mb-2" />
                <div className="text-2xl font-black leading-none">{k.value}</div>
                <div className="text-white/40 text-xs font-bold mt-1">{k.label}</div>
              </motion.div>
            ))}
          </div>

          {tab === "ai"        && <DevAiCostPanel showToast={showToast} />}
          {tab === "db"        && <DevDatabasePanel showToast={showToast} />}
          {tab === "schools"   && <DevSchoolsPanel showToast={showToast} />}
          {tab === "users"     && <DevUserLookupPanel showToast={showToast} />}
          {tab === "trials"    && <DevTrialFunnelPanel showToast={showToast} />}
          {tab === "insights"  && <DevInsightsPanel showToast={showToast} />}
          {tab === "audit"     && <DevAuditLogPanel showToast={showToast} />}
          {tab === "privacy"   && <DevDataRequestsPanel showToast={showToast} />}
          {tab === "security"  && <DevSecurityChecklistPanel showToast={showToast} />}
          {tab === "flags"     && <DevFeatureFlagsPanel showToast={showToast} />}
          {tab === "broadcast" && <DevAnnouncementsPanel showToast={showToast} />}
          {tab === "system"    && <DevSystemPanel showToast={showToast} />}
          {tab === "infra"     && <DevInfraPanel />}
        </div>
      </main>
    </div>
  );
}
