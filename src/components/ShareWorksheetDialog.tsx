/**
 * ShareWorksheetDialog — mint an interactive worksheet link from any
 * surface in the app (Free Resources, WorksheetView, Create Assignment).
 *
 * Originally lived inside FreeResourcesView; extracted so the same
 * dialog mounts identically wherever a teacher has a word list in hand.
 * The create_interactive_worksheet RPC stamps teacher_uid from
 * auth.uid() automatically, so logged-in teachers' shares land in
 * their Worksheet Results dashboard, while anonymous mints from the
 * public marketing page stay invisible to everyone but the student.
 */
import { useState } from "react";
import { motion } from "motion/react";
import { Share2, X, Loader2, Check, Copy, MessageCircle } from "lucide-react";
import { supabase } from "../core/supabase";

export type WorksheetLang = "en" | "he" | "ar";

export interface ShareSource {
  topicName: string;
  wordIds: number[];
}

type InteractiveFormat = "matching" | "quiz";

const SUPPORTED_INTERACTIVE_FORMATS: { value: InteractiveFormat; label: string; desc: string }[] = [
  { value: "matching", label: "Matching", desc: "Tap pairs of English ↔ translation" },
  { value: "quiz", label: "Multiple-choice quiz", desc: "Pick the right translation from 4 options" },
];

interface Props {
  source: ShareSource;
  defaultLang: WorksheetLang;
  onClose: () => void;
}

export const ShareWorksheetDialog: React.FC<Props> = ({ source, defaultLang, onClose }) => {
  const [format, setFormat] = useState<InteractiveFormat>("matching");
  // Default to a *translation* target — if the source list is already
  // English we land on Hebrew, the safe default for the IL audience.
  const [lang, setLang] = useState<WorksheetLang>(defaultLang === "en" ? "he" : defaultLang);
  const [slug, setSlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = slug ? `${window.location.origin}/w/${slug}` : "";

  const handleGenerate = async () => {
    setCreating(true);
    setError(null);
    try {
      // De-dupe word ids — bundles compose from overlapping packs and
      // the RPC accepts the array as-is.  Front-loading the dedup
      // saves round-tripping a malformed payload.
      const uniqueIds = Array.from(new Set(source.wordIds));
      const { data, error: rpcErr } = await supabase.rpc("create_interactive_worksheet", {
        p_topic_name: source.topicName,
        p_word_ids: uniqueIds,
        p_format: format,
        p_settings: { language: lang },
      });
      if (rpcErr || !data) {
        setError(rpcErr?.message ?? "Could not create the link. Please try again.");
        return;
      }
      setSlug(String(data));
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API may be blocked over http — show the URL so the
      // teacher can long-press to copy manually.
      window.prompt("Copy this link", shareUrl);
    }
  };

  const handleWhatsApp = () => {
    const text = `Solve this worksheet on your phone: ${source.topicName}\n${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== "function") {
      handleWhatsApp();
      return;
    }
    try {
      await navigator.share({
        title: `Worksheet: ${source.topicName}`,
        text: `Solve this worksheet on your phone:`,
        url: shareUrl,
      });
    } catch {
      // User cancelled the share sheet — no-op.
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center sm:justify-center z-50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share online worksheet"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 flex items-center gap-3">
          <Share2 size={20} className="text-white" />
          <h3 className="text-lg font-bold text-white flex-1 truncate">Share online worksheet</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-stone-400">Topic</p>
            <p className="font-bold text-stone-900 text-lg">{source.topicName}</p>
            <p className="text-xs text-stone-500">
              {Array.from(new Set(source.wordIds)).length} words
            </p>
          </div>

          {!slug && (
            <>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">Exercise</p>
                <div className="grid gap-2">
                  {SUPPORTED_INTERACTIVE_FORMATS.map((opt) => {
                    const active = format === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormat(opt.value)}
                        className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                          active
                            ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                            : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"
                        }`}
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      >
                        <div className="font-bold">{opt.label}</div>
                        <div className="text-xs text-stone-500">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">
                  Translation
                </p>
                <div className="inline-flex rounded-lg bg-stone-100 p-1 w-full">
                  {([
                    { v: "he", l: "עברית" },
                    { v: "ar", l: "العربية" },
                  ] as { v: WorksheetLang; l: string }[]).map((opt) => {
                    const active = lang === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setLang(opt.v)}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-bold transition-all ${
                          active ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500"
                        }`}
                      >
                        {opt.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={creating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-60 transition-all"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                {creating ? "Creating link…" : "Generate share link"}
              </button>
            </>
          )}

          {slug && (
            <>
              <div className="rounded-xl bg-stone-50 border border-stone-200 px-3 py-3">
                <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-1">Link</p>
                <p className="font-mono text-sm break-all text-stone-800">{shareUrl}</p>
                <p className="text-xs text-stone-500 mt-1">
                  Expires in 30 days. Anyone with this link can solve the worksheet.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="py-2.5 rounded-xl bg-[#25D366] hover:opacity-90 text-white font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
              </div>

              {typeof navigator.share === "function" && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-2.5 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  <Share2 size={16} />
                  More share options
                </button>
              )}

              <button
                type="button"
                onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}
                className="w-full text-center text-sm font-bold text-emerald-700 hover:text-emerald-900 py-1"
              >
                Open as a student →
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ShareWorksheetDialog;
