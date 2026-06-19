import { useCallback, useEffect, useState } from "react";
import {
  Building2, Mail, MessageCircle, Users, GraduationCap, Clock,
  CheckCircle2, RotateCcw, Trash2,
} from "lucide-react";
import { callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache, type DevSchoolInquiry } from "./devShared";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/** Digits-only phone for a wa.me deep link; empty if nothing usable. */
function waLink(whatsapp: string): string | null {
  const digits = whatsapp.replace(/\D/g, "");
  return digits.length >= 6 ? `https://wa.me/${digits}` : null;
}

function followupMailto(i: DevSchoolInquiry): string {
  const subject = encodeURIComponent(`Vocaband — ${i.school_name}`);
  const body = encodeURIComponent(`Hi ${i.contact_name},\n\nThanks for your interest in Vocaband for ${i.school_name}.\n\n`);
  return `mailto:${i.email}?subject=${subject}&body=${body}`;
}

export default function DevSchoolInquiriesPanel({ showToast }: Props) {
  const [items, setItems] = useState<DevSchoolInquiry[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DevSchoolInquiry | null>(null);

  const reload = useCallback(async () => {
    const res = await callAdminRpcCached<DevSchoolInquiry[]>("admin_list_school_inquiries", {}, showToast);
    if (res) setItems(res);
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    void reload();
  }, [reload]);

  const setHandled = useCallback(
    async (id: string, handled: boolean) => {
      setBusy(true);
      const res = await callAdminRpc<{ success?: boolean }>(
        "admin_mark_school_inquiry_handled",
        { p_id: id, p_handled: handled },
        showToast,
      );
      setBusy(false);
      if (res?.success) {
        showToast(handled ? "Marked handled" : "Re-opened", "success");
        invalidateAdminRpcCache("admin_list_school_inquiries");
        await reload();
      }
    },
    [reload, showToast],
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      const res = await callAdminRpc<{ success?: boolean }>("admin_delete_school_inquiry", { p_id: id }, showToast);
      setBusy(false);
      if (res?.success) {
        showToast("Inquiry deleted", "success");
        invalidateAdminRpcCache("admin_list_school_inquiries");
        await reload();
      }
    },
    [reload, showToast],
  );

  const pending = items.filter((i) => !i.handled_at).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-white/10">
        <div className="flex items-center gap-2 text-white font-black text-base mb-1">
          <Building2 className="w-5 h-5 text-amber-300" /> School inquiries
        </div>
        <p className="text-white/60 text-sm">
          Leads from the public "For schools" form. This is a read + manual-triage view — no accounts or classes are
          created here. {pending > 0 && <span className="text-amber-200 font-bold">{pending} awaiting follow-up.</span>}
        </p>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
        {items.length === 0 && <p className="px-5 py-6 text-white/40 text-base">No inquiries yet.</p>}
        {items.map((i) => {
          const wa = waLink(i.whatsapp);
          const handled = !!i.handled_at;
          return (
            <div key={i.id} className="px-5 py-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-base">{i.school_name}</span>
                  {handled ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-200">Handled</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase bg-amber-500/20 text-amber-200">New</span>
                  )}
                </div>

                <div className="text-white/60 text-sm mt-1">{i.contact_name}</div>

                <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm mt-2">
                  <a href={followupMailto(i)} className="inline-flex items-center gap-1.5 text-sky-300 hover:text-sky-200">
                    <Mail className="w-4 h-4" /> {i.email}
                  </a>
                  {wa ? (
                    <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200">
                      <MessageCircle className="w-4 h-4" /> {i.whatsapp}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-white/50">
                      <MessageCircle className="w-4 h-4" /> {i.whatsapp}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-white/40 text-sm mt-1.5">
                  <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {i.students_count} students</span>
                  <span className="inline-flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> {i.teachers_count} teachers</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {fmtTime(i.created_at)}</span>
                  {i.language && <span className="uppercase">{i.language}</span>}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setHandled(i.id, !handled)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`p-2 rounded-xl ${handled ? "bg-white/5 text-white/60 hover:bg-white/10" : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"}`}
                  aria-label={handled ? "Re-open" : "Mark handled"}
                  title={handled ? "Re-open" : "Mark handled"}
                >
                  {handled ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDeleteTarget(i)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="p-2 rounded-xl bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        tone="danger"
        title="Delete this inquiry?"
        body={deleteTarget && (
          <>Permanently removes the lead from <strong className="text-white">{deleteTarget.school_name}</strong>. This
          can't be undone.</>
        )}
        confirmLabel="Delete inquiry"
        busy={busy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
