import { useCallback, useEffect, useState } from "react";
import {
  Search, ChevronRight, Trash2, User, Hash, Sparkles, FileText,
} from "lucide-react";
import {
  callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache,
  type DevVocabSet, type DevVocabSetDetail, type DevVocabWord,
} from "./devShared";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

// Colour the set's origin so OCR / AI uploads (the riskier inputs) stand out.
const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  ocr_image:    { label: "OCR", cls: "bg-amber-500/20 text-amber-200" },
  ocr_document: { label: "OCR", cls: "bg-amber-500/20 text-amber-200" },
  ai_topic:     { label: "AI", cls: "bg-violet-500/20 text-violet-200" },
  ai_augment:   { label: "AI", cls: "bg-violet-500/20 text-violet-200" },
  curriculum:   { label: "curriculum", cls: "bg-sky-500/20 text-sky-200" },
};
const sourceBadge = (s: string) => SOURCE_BADGE[s] ?? { label: s, cls: "bg-white/10 text-white/50" };

/**
 * Content moderation — review + remove teacher-authored vocabulary. Search sets
 * (by name, teacher, or a word inside them), drill into a set's words +
 * sentences, and delete an inappropriate set or a single word. Every delete is
 * an audited admin_* RPC; FK cascades clean up words/sentences.
 */
export default function DevModerationPanel({ showToast }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sets, setSets] = useState<DevVocabSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<DevVocabSetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [setToDelete, setSetToDelete] = useState<DevVocabSet | null>(null);
  const [wordToDelete, setWordToDelete] = useState<DevVocabWord | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const search = useCallback(async (q: string, force = false) => {
    setLoading(true);
    const res = await callAdminRpcCached<DevVocabSet[]>(
      "admin_list_vocab_sets", { p_query: q.trim() || null, p_limit: 50 }, showToast, { force },
    );
    setLoading(false);
    setSets(res ?? []);
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    void search(debounced);
  }, [debounced, search]);

  const openSet = useCallback(async (s: DevVocabSet) => {
    if (expanded === s.id) { setExpanded(null); setDetail(null); return; }
    setExpanded(s.id);
    setDetail(null);
    setDetailLoading(true);
    const res = await callAdminRpc<DevVocabSetDetail>("admin_vocab_set_detail", { p_set_id: s.id }, showToast);
    setDetailLoading(false);
    setDetail(res);
  }, [expanded, showToast]);

  const delSet = useCallback(async (s: DevVocabSet, reason: string) => {
    setBusy(true);
    const res = await callAdminRpc<{ success?: boolean }>(
      "admin_delete_vocab_set", { p_set_id: s.id, p_reason: reason || null }, showToast,
    );
    setBusy(false);
    setSetToDelete(null);
    if (res?.success) {
      showToast(`Deleted "${s.name}"`, "success");
      setSets((prev) => prev.filter((x) => x.id !== s.id));
      if (expanded === s.id) { setExpanded(null); setDetail(null); }
      invalidateAdminRpcCache("admin_list_vocab_sets");
    }
  }, [expanded, showToast]);

  const delWord = useCallback(async (w: DevVocabWord, reason: string) => {
    setBusy(true);
    const res = await callAdminRpc<{ success?: boolean; set_id?: string }>(
      "admin_delete_vocab_word", { p_word_id: w.id, p_reason: reason || null }, showToast,
    );
    setBusy(false);
    setWordToDelete(null);
    if (res?.success) {
      showToast(`Deleted word "${w.english}"`, "success");
      setDetail((prev) => prev && { ...prev, words: prev.words.filter((x) => x.id !== w.id) });
      invalidateAdminRpcCache("admin_list_vocab_sets");
    }
  }, [showToast]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 bg-gradient-to-br from-rose-500/15 via-fuchsia-500/15 to-violet-500/15 border border-white/10">
        <div className="flex items-center gap-2 text-white font-black text-base mb-1">
          <FileText className="w-5 h-5 text-fuchsia-300" /> Content review
        </div>
        <p className="text-white/60 text-sm leading-relaxed">
          Teacher-authored vocabulary (custom sets, words, example sentences — manual, OCR or AI). Search, open a set
          to review its words, and remove anything inappropriate. Deletion is audited and cascades to the set's
          words + sentences.
        </p>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center gap-2">
        <Search className="w-5 h-5 text-white/40 ml-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sets by name, teacher, or a word inside them…"
          className="flex-1 px-2 py-2 bg-transparent text-white placeholder-white/30 text-base focus:outline-none"
        />
        {loading && <span className="text-white/40 text-sm pr-2">searching…</span>}
      </div>

      {!loading && sets.length === 0 && (
        <p className="text-white/40 text-sm">{query.trim() ? "No matching sets." : "No vocabulary sets yet."}</p>
      )}

      <div className="space-y-3">
        {sets.map((s) => {
          const isOpen = expanded === s.id;
          const badge = sourceBadge(s.source_type);
          return (
            <div key={s.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => void openSet(s)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/5 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-base truncate">{s.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="text-white/50 text-sm mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1 truncate"><User className="w-3.5 h-3.5" /> {s.teacher_email || s.teacher_name || s.teacher_uid}</span>
                    <span className="inline-flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {s.word_count} words</span>
                  </div>
                  {s.description && <div className="text-white/40 text-sm mt-1 truncate">{s.description}</div>}
                </div>
                <ChevronRight className={`w-5 h-5 text-white/30 transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-white/5 px-5 py-4 space-y-3">
                  {detailLoading && <p className="text-white/40 text-sm">Loading words…</p>}
                  {detail?.words && detail.words.length === 0 && <p className="text-white/40 text-sm">This set has no words.</p>}
                  {detail?.words && detail.words.length > 0 && (
                    <div className="rounded-xl bg-white/5 divide-y divide-white/5 overflow-hidden">
                      {detail.words.map((w) => (
                        <div key={w.id} className="px-3 py-2 flex items-start gap-3 text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-bold">{w.english}</span>
                              {w.hebrew && <span className="text-white/60" dir="rtl">{w.hebrew}</span>}
                              {w.arabic && <span className="text-white/60" dir="rtl">{w.arabic}</span>}
                              {w.part_of_speech && <span className="text-white/30 text-xs">{w.part_of_speech}</span>}
                            </div>
                            {w.sentence && (
                              <div className="text-white/50 text-sm mt-0.5 flex items-start gap-1.5">
                                {w.sentence_generated_by === "ai" && <Sparkles className="w-3 h-3 mt-0.5 text-violet-300 shrink-0" />}
                                <span className="min-w-0">{w.sentence}</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setWordToDelete(w)}
                            aria-label={`Delete word ${w.english}`}
                            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                            className="p-1.5 rounded-lg text-white/40 hover:text-rose-300 hover:bg-rose-500/10 shrink-0 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setSetToDelete(s)}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete entire set
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!setToDelete}
        tone="danger"
        title="Delete this vocabulary set?"
        body={setToDelete && (
          <>Permanently deletes <strong className="text-white">{setToDelete.name}</strong> and its{" "}
          <strong className="text-white">{setToDelete.word_count}</strong> word(s) + example sentences. This cannot be undone.</>
        )}
        confirmPhrase="DELETE"
        reason={{ placeholder: "Reason (report #, inappropriate content…) — audit-logged", required: false }}
        confirmLabel="Delete set"
        busy={busy}
        onConfirm={(reason) => setToDelete && void delSet(setToDelete, reason)}
        onCancel={() => setSetToDelete(null)}
      />

      <ConfirmDialog
        open={!!wordToDelete}
        tone="danger"
        title="Delete this word?"
        body={wordToDelete && (
          <>Removes <strong className="text-white">{wordToDelete.english}</strong> and its example sentence(s) from the set.</>
        )}
        reason={{ placeholder: "Reason — audit-logged", required: false }}
        confirmLabel="Delete word"
        busy={busy}
        onConfirm={(reason) => wordToDelete && void delWord(wordToDelete, reason)}
        onCancel={() => setWordToDelete(null)}
      />
    </div>
  );
}
