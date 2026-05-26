import { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus, Trash2, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache, type DevAnnouncement } from "./devShared";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const LEVELS = [
  { id: "info" as const,     label: "Info",     icon: Info,          cls: "from-sky-500 to-indigo-500" },
  { id: "warning" as const,  label: "Warning",  icon: AlertTriangle, cls: "from-amber-500 to-orange-500" },
  { id: "critical" as const, label: "Critical", icon: AlertCircle,   cls: "from-rose-500 to-pink-500" },
];

const AUDIENCES: { id: "teachers" | "students" | "all"; label: string }[] = [
  { id: "teachers", label: "Teachers" },
  { id: "students", label: "Students" },
  { id: "all",      label: "Everyone" },
];

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function DevAnnouncementsPanel({ showToast }: Props) {
  const [items, setItems] = useState<DevAnnouncement[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<"info" | "warning" | "critical">("info");
  const [audience, setAudience] = useState<"teachers" | "students" | "all">("teachers");
  const [endsAt, setEndsAt] = useState(""); // local datetime string, optional
  const [dismissible, setDismissible] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await callAdminRpcCached<DevAnnouncement[]>("admin_list_announcements", {}, showToast);
    if (res) setItems(res);
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    void reload();
  }, [reload]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !message.trim()) return;
      setBusy(true);
      const res = await callAdminRpc<{ success?: boolean; id?: string }>(
        "admin_create_announcement",
        {
          p_title:       title.trim(),
          p_message:     message.trim(),
          p_level:       level,
          p_audience:    audience,
          p_starts_at:   null,
          p_ends_at:     endsAt ? new Date(endsAt).toISOString() : null,
          p_dismissible: dismissible,
        },
        showToast,
      );
      setBusy(false);
      if (res?.success) {
        showToast("Announcement published", "success");
        setTitle("");
        setMessage("");
        setEndsAt("");
        invalidateAdminRpcCache("admin_list_announcements");
        await reload();
      }
    },
    [title, message, level, audience, endsAt, dismissible, reload, showToast],
  );

  const remove = useCallback(
    async (id: string, t: string) => {
      if (!window.confirm(`Delete announcement "${t}"? Already-displayed dismissals are also removed.`)) return;
      setBusy(true);
      const res = await callAdminRpc<{ success?: boolean }>("admin_delete_announcement", { p_id: id }, showToast);
      setBusy(false);
      if (res) {
        showToast("Announcement deleted", "success");
        invalidateAdminRpcCache("admin_list_announcements");
        await reload();
      }
    },
    [reload, showToast],
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 bg-gradient-to-br from-fuchsia-500/15 via-pink-500/15 to-rose-500/15 border border-white/10">
        <div className="flex items-center gap-2 text-white font-black text-base mb-1">
          <Megaphone className="w-5 h-5 text-pink-300" /> Broadcast announcement
        </div>
        <p className="text-white/60 text-sm">
          Shows a banner above the active view for all authenticated users in the selected audience. Each user can
          dismiss once; their dismissal persists across logins.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Headline (e.g. Scheduled maintenance tonight)"
          maxLength={200}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base font-bold focus:outline-none focus:border-indigo-400"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Body — one short sentence works best"
          rows={2}
          maxLength={2000}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-indigo-400"
        />

        <div className="flex gap-2 flex-wrap">
          {LEVELS.map((lv) => (
            <button
              key={lv.id}
              type="button"
              onClick={() => setLevel(lv.id)}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all ${
                level === lv.id ? `bg-gradient-to-r ${lv.cls} text-white shadow-lg` : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <lv.icon className="w-4 h-4" /> {lv.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-white/50 text-sm font-bold">Audience:</span>
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAudience(a.id)}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-3 py-2 rounded-xl font-bold text-sm transition-all ${
                audience === a.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <label className="text-white/50 text-sm font-bold">Ends at (optional):</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-400"
          />
          <label className="flex items-center gap-2 text-white/70 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={dismissible}
              onChange={(e) => setDismissible(e.target.checked)}
              className="w-4 h-4 accent-indigo-500"
            />
            Dismissible
          </label>
        </div>

        <button
          type="submit"
          disabled={busy || !title.trim() || !message.trim()}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-base flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Publish
        </button>
      </form>

      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
        {items.length === 0 && <p className="px-5 py-6 text-white/40 text-base">No announcements yet.</p>}
        {items.map((a) => {
          const lv = LEVELS.find((l) => l.id === a.level)!;
          return (
            <div key={a.id} className="px-5 py-4 flex items-start gap-3">
              <lv.icon className={`w-5 h-5 mt-1 shrink-0 ${
                a.level === "critical" ? "text-rose-300" :
                a.level === "warning"  ? "text-amber-300" : "text-sky-300"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-base">{a.title}</span>
                  {a.is_active ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-200">Live</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase bg-white/10 text-white/40">Inactive</span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase bg-white/10 text-white/60">{a.audience}</span>
                </div>
                <div className="text-white/60 text-sm mt-1 whitespace-pre-wrap">{a.message}</div>
                <div className="text-white/30 text-sm mt-1">
                  {fmtTime(a.created_at)}
                  {a.created_by_email && <> · {a.created_by_email}</>}
                  {a.ends_at && <> · ends {fmtTime(a.ends_at)}</>}
                  {a.dismissed_count > 0 && <> · {a.dismissed_count} dismissed</>}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(a.id, a.title)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="p-2 rounded-xl bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
