import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLanguage } from "../hooks/useLanguage";
import { statusT } from "../locales/student/status";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  Clock,
  Zap,
  Activity,
  Calendar,
} from "lucide-react";
import PublicNav from "../components/PublicNav";

interface StatusViewProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "accessibility" | "security" | "faq") => void;
  onGetStarted: () => void;
  onBack: () => void;
}

type SystemStatus = "operational" | "degraded" | "outage" | "maintenance";

interface System {
  key: string;
  name: string;
  status: SystemStatus;
  uptime: string;
}

interface StatusBadgeProps {
  status: SystemStatus;
  label: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = {
    operational: {
      bg: "bg-emerald-500/15",
      border: "border-emerald-400/30",
      text: "text-emerald-300",
      icon: <CheckCircle2 size={16} />,
    },
    degraded: {
      bg: "bg-amber-500/15",
      border: "border-amber-400/30",
      text: "text-amber-300",
      icon: <AlertTriangle size={16} />,
    },
    outage: {
      bg: "bg-red-500/15",
      border: "border-red-400/30",
      text: "text-red-300",
      icon: <XCircle size={16} />,
    },
    maintenance: {
      bg: "bg-slate-500/15",
      border: "border-slate-400/30",
      text: "text-slate-300",
      icon: <Wrench size={16} />,
    },
  };

  const { bg, border, text, icon } = config[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bg} ${border} ${text} text-sm font-bold`}>
      {icon}
      {label}
    </div>
  );
};

const StatusView: React.FC<StatusViewProps> = ({ onNavigate, onGetStarted, onBack }) => {
  const { language, dir, textAlign, isRTL } = useLanguage();
  const t = statusT[language];
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Update the "last updated" time every minute
  useEffect(() => {
    const timer = setInterval(() => setLastUpdated(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === "he" ? "he-IL" : language === "ar" ? "ar-IL" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // System statuses - in production, these would come from an API
  const systems: System[] = [
    { key: "webapp", name: t.systemWebApp, status: "operational", uptime: "99.98%" },
    { key: "api", name: t.systemApi, status: "operational", uptime: "99.95%" },
    { key: "database", name: t.systemDatabase, status: "operational", uptime: "99.99%" },
    { key: "auth", name: t.systemAuth, status: "operational", uptime: "99.97%" },
    { key: "live", name: t.systemLiveGames, status: "operational", uptime: "99.92%" },
  ];

  // Overall status is the worst of all system statuses
  const getOverallStatus = (): SystemStatus => {
    if (systems.some((s) => s.status === "outage")) return "outage";
    if (systems.some((s) => s.status === "maintenance")) return "maintenance";
    if (systems.some((s) => s.status === "degraded")) return "degraded";
    return "operational";
  };

  const overallStatus = getOverallStatus();

  const getStatusLabel = (status: SystemStatus) => {
    switch (status) {
      case "operational": return t.operational;
      case "degraded": return t.degraded;
      case "outage": return t.outage;
      case "maintenance": return t.maintenance;
    }
  };

  // Uptime data
  const uptimeData = {
    day: { label: t.uptimeDay, value: "100%", incidents: 0 },
    week: { label: t.uptimeWeek, value: "99.98%", incidents: 0 },
    month: { label: t.uptimeMonth, value: "99.95%", incidents: 1 },
    year: { label: t.uptimeYear, value: "99.92%", incidents: 2 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900" dir={dir}>
      <PublicNav currentPage="home" onNavigate={onNavigate} onGetStarted={onGetStarted} />

      <main className="pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={onBack}
              type="button"
              className="flex items-center gap-2 text-violet-300 font-bold hover:text-violet-200 transition-all group"
            >
              <ArrowLeft size={20} className={`transition-transform group-hover:-translate-x-1 ${isRTL ? "rotate-180" : ""}`} />
              <span>{t.backButton}</span>
            </button>
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <StatusBadge status={overallStatus} label={getStatusLabel(overallStatus)} />
            <h1 className="text-4xl md:text-5xl font-black text-white mt-6 mb-3 font-headline">
              {t.title}
            </h1>
            <p className="text-lg text-white/70" dir={dir} style={{ textAlign }}>
              {t.subtitle}
            </p>
            <p className="text-white/50 text-sm mt-2 flex items-center justify-center gap-2">
              <Clock size={14} />
              {t.lastUpdated}: {formatTime(lastUpdated)}
            </p>
          </motion.div>

          {/* Systems Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden mb-8"
          >
            <div className="p-6 space-y-4">
              {systems.map((system, index) => (
                <motion.div
                  key={system.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      system.status === "operational"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : system.status === "degraded"
                        ? "bg-amber-500/20 text-amber-400"
                        : system.status === "outage"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-slate-500/20 text-slate-400"
                    }`}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{system.name}</h3>
                      <p className="text-white/50 text-xs">{system.uptime} uptime</p>
                    </div>
                  </div>
                  <StatusBadge status={system.status} label={getStatusLabel(system.status)} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Uptime Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap size={20} className="text-amber-400" />
              {t.uptimeTitle}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.values(uptimeData).map((period, index) => (
                <motion.div
                  key={period.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                  className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 text-center"
                >
                  <p className="text-white/60 text-xs mb-1">{period.label}</p>
                  <p className="text-2xl font-black text-emerald-400 mb-1">{period.value}</p>
                  <p className="text-white/40 text-xs">{period.incidents} {t.incidentsCount}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Incidents Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Calendar size={20} className="text-violet-400" />
              {t.incidentsTitle}
            </h2>
            <p className="text-white/50 text-sm mb-4">{t.incidentsSubtitle}</p>

            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-400" />
              <p className="text-white/70">{t.noIncidents}</p>
            </div>
          </motion.div>

          {/* Footer Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <p className="text-white/40 text-sm" dir={dir} style={{ textAlign }}>
              {t.note}
            </p>
          </motion.div>

          {/* Back Button - Bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex justify-center"
          >
            <button
              onClick={onBack}
              type="button"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-violet-200 font-bold transition-all border border-white/20 hover:border-white/30"
            >
              <ArrowLeft size={20} className={`transition-transform ${isRTL ? "rotate-180" : ""}`} />
              <span>{t.backButton}</span>
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default StatusView;
