import { useCallback, useEffect, useState } from "react";
import { RefreshCw, GitCommit, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "../../core/supabase";
import DevIntegrationsSection from "./DevIntegrationsSection";

interface VersionInfo {
  commit: string;
  nodeEnv: string;
  uptimeSeconds: number;
  env: Record<string, boolean>;
  timestamp: string;
}

const ENV_LABELS: Record<string, string> = {
  hasAnthropicKey: "Anthropic key",
  hasSupabaseUrl: "Supabase URL",
  hasSupabaseServiceKey: "Supabase service key",
  hasAllowedOrigin: "Allowed origin",
};

function uptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DevInfraPanel() {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Both endpoints sit behind requireAuthenticatedTeacher, so the
    // admin's access token must ride along — without it /api/version
    // 401s and r.json() parses the error body into a shape with no
    // `env`, which then crashes the Object.entries() below.
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const r = await fetch("/api/version", { headers: authHeaders });
      setVersion(r.ok ? ((await r.json()) as VersionInfo) : null);
    } catch {
      setVersion(null);
    }
    try {
      const r = await fetch("/api/features", { headers: authHeaders });
      const f = r.ok ? ((await r.json()) as { aiSentences?: boolean }) : null;
      setAiEnabled(f ? !!f.aiSentences : null);
    } catch {
      setAiEnabled(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect; matches existing convention (AdminSecurityView etc.)
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void refresh()}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
        <div className="flex items-center gap-2 text-white/80 font-black text-sm">
          <GitCommit className="w-4 h-4" /> Deployment
        </div>
        {version ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-white/40">Commit</span>
            <span className="text-white font-mono truncate">{version.commit}</span>
            <span className="text-white/40">Env</span>
            <span className="text-white font-bold">{version.nodeEnv}</span>
            <span className="text-white/40 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Uptime</span>
            <span className="text-white font-bold">{uptime(version.uptimeSeconds)}</span>
          </div>
        ) : (
          <p className="text-white/40 text-sm">Version endpoint unreachable.</p>
        )}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
        <div className="text-white/80 font-black text-sm">Server config</div>
        <div className="flex flex-wrap gap-2">
          {version?.env &&
            Object.entries(version.env).map(([k, v]) => (
              <span
                key={k}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  v ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"
                }`}
              >
                {v ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {ENV_LABELS[k] ?? k}
              </span>
            ))}
          {aiEnabled !== null && (
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                aiEnabled ? "bg-emerald-500/15 text-emerald-200" : "bg-white/10 text-white/50"
              }`}
            >
              {aiEnabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              AI features (you)
            </span>
          )}
        </div>
      </div>

      <DevIntegrationsSection />
    </div>
  );
}
