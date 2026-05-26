import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Flag } from "lucide-react";
import { callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache, type DevFeatureFlag } from "./devShared";
import { refreshFeatureFlags } from "../../hooks/useFeatureFlag";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function DevFeatureFlagsPanel({ showToast }: Props) {
  const [flags, setFlags] = useState<DevFeatureFlag[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await callAdminRpcCached<DevFeatureFlag[]>("admin_list_flags", {}, showToast);
    if (res) setFlags(res);
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    void reload();
  }, [reload]);

  const upsert = useCallback(
    async (key: string, enabled: boolean, description: string | null) => {
      setBusy(true);
      const res = await callAdminRpc<{ success?: boolean }>(
        "admin_upsert_flag",
        { p_key: key, p_enabled: enabled, p_description: description },
        showToast,
      );
      setBusy(false);
      if (res) {
        invalidateAdminRpcCache("admin_list_flags");
        // Bust the client-side flag cache so other components see the change
        // without waiting for the 5-min background refresh.
        void refreshFeatureFlags();
        await reload();
      }
      return !!res;
    },
    [reload, showToast],
  );

  const remove = useCallback(
    async (key: string) => {
      if (!window.confirm(`Delete flag "${key}"? Callers will fall back to default (usually off).`)) return;
      setBusy(true);
      const res = await callAdminRpc<{ success?: boolean }>("admin_delete_flag", { p_key: key }, showToast);
      setBusy(false);
      if (res) {
        showToast(`Flag "${key}" deleted`, "success");
        invalidateAdminRpcCache("admin_list_flags");
        void refreshFeatureFlags();
        await reload();
      }
    },
    [reload, showToast],
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-500/15 via-violet-500/15 to-fuchsia-500/15 border border-white/10">
        <div className="flex items-center gap-2 text-white font-black text-base mb-1">
          <Flag className="w-5 h-5 text-violet-300" /> Feature flags
        </div>
        <p className="text-white/60 text-sm">
          Admin-managed kill-switches. Read by all authenticated users via the <code className="text-white/80">useFeatureFlag</code> hook —
          flag keys are intentionally public, so don't name them after sensitive internals.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const k = newKey.trim();
          if (!k) return;
          void upsert(k, false, newDesc.trim() || null).then((ok) => {
            if (ok) {
              setNewKey("");
              setNewDesc("");
              showToast(`Flag "${k}" created (off)`, "success");
            }
          });
        }}
        className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3"
      >
        <div className="text-white/70 font-black text-sm uppercase tracking-widest">New flag</div>
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="flag_key (e.g. live_challenge_v2)"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-indigo-400 font-mono"
        />
        <input
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Short description (what this gates)"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={busy || !newKey.trim()}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-base flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create flag (starts off)
        </button>
      </form>

      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
        {flags.length === 0 && <p className="px-5 py-6 text-white/40 text-base">No flags yet.</p>}
        {flags.map((f) => (
          <div key={f.key} className="px-5 py-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-mono font-bold text-base">{f.key}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${
                  f.enabled ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/40"
                }`}>
                  {f.enabled ? "on" : "off"}
                </span>
              </div>
              {f.description && (
                <div className="text-white/50 text-sm mt-1">{f.description}</div>
              )}
              <div className="text-white/30 text-sm mt-1">
                Updated {fmtTime(f.updated_at)}
                {f.updated_by_email && <> · by {f.updated_by_email}</>}
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void upsert(f.key, !f.enabled, null).then((ok) => {
                if (ok) showToast(`"${f.key}" ${!f.enabled ? "enabled" : "disabled"}`, "success");
              })}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="p-2 rounded-xl hover:bg-white/5"
              aria-label={f.enabled ? "Disable" : "Enable"}
            >
              {f.enabled
                ? <ToggleRight className="w-8 h-8 text-emerald-400" />
                : <ToggleLeft className="w-8 h-8 text-white/40" />}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void remove(f.key)}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="p-2 rounded-xl bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
              aria-label="Delete flag"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
