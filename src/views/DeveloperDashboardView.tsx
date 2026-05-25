import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Bot, Database, Activity, Server, ShieldAlert, Users, School } from "lucide-react";
import { hasAdminAccess, type AppUser } from "../core/supabase";
import type { View } from "../core/views";
import { callAdminRpc, fmtUsd, fmtNum, type DevOverview } from "./developer/devShared";
import DevAiCostPanel from "./developer/DevAiCostPanel";
import DevDatabasePanel from "./developer/DevDatabasePanel";
import DevSystemPanel from "./developer/DevSystemPanel";
import DevInfraPanel from "./developer/DevInfraPanel";

interface Props {
  user: AppUser | null;
  setView: Dispatch<SetStateAction<View>>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type Tab = "ai" | "db" | "system" | "infra";

const TABS: { id: Tab; label: string; icon: typeof Bot }[] = [
  { id: "ai", label: "AI & Cost", icon: Bot },
  { id: "db", label: "Database", icon: Database },
  { id: "system", label: "System", icon: Activity },
  { id: "infra", label: "Infra", icon: Server },
];

export default function DeveloperDashboardView({ user, setView, showToast }: Props) {
  const [tab, setTab] = useState<Tab>("ai");
  const [ov, setOv] = useState<DevOverview | null>(null);

  const isAdmin = hasAdminAccess(user);

  useEffect(() => {
    if (!isAdmin) return;
    void callAdminRpc<DevOverview>("admin_dashboard_overview", {}, showToast).then(setOv);
  }, [isAdmin, showToast]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-400 mb-4" />
        <h1 className="text-white font-black text-xl mb-2">Admins only</h1>
        <p className="text-white/50 text-sm mb-6">This dashboard requires an admin account.</p>
        <button
          type="button"
          onClick={() => setView("teacher-dashboard")}
          className="px-5 py-3 rounded-xl bg-white/10 text-white font-bold text-sm"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setView("voca-picker")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black font-headline">Developer Dashboard</h1>
            <p className="text-white/50 text-xs font-bold">Admin control · cost, entitlements, health, infra</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {kpis.map((k) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white/5 border border-white/10 p-4"
            >
              <k.icon className="w-4 h-4 text-indigo-300 mb-2" />
              <div className="text-xl font-black leading-none">{k.value}</div>
              <div className="text-white/40 text-[11px] font-bold mt-1">{k.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
                tab === t.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "ai" && <DevAiCostPanel showToast={showToast} />}
        {tab === "db" && <DevDatabasePanel showToast={showToast} />}
        {tab === "system" && <DevSystemPanel />}
        {tab === "infra" && <DevInfraPanel />}
      </div>
    </div>
  );
}
