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
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Share2, X, Loader2, Check, Copy, MessageCircle } from "lucide-react";
import qrcode from "qrcode-generator";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { shareWorksheetT } from "../locales/teacher/share-worksheet";

export type WorksheetLang = "en" | "he" | "ar";

export interface ShareSource {
  topicName: string;
  wordIds: number[];
}

type InteractiveFormat = "matching" | "quiz";

// Visual-only metadata for the format picker — translated label /
// description are pulled from the active locale at render time.
const SUPPORTED_INTERACTIVE_FORMATS: InteractiveFormat[] = ["matching", "quiz"];

interface Props {
  source: ShareSource;
  defaultLang: WorksheetLang;
  onClose: () => void;
}

export const ShareWorksheetDialog: React.FC<Props> = ({ source, defaultLang, onClose }) => {
  const { language, dir } = useLanguage();
  const t = shareWorksheetT[language];
  const [format, setFormat] = useState<InteractiveFormat>("matching");
  // Default to a *translation* target — if the source list is already
  // English we land on Hebrew, the safe default for the IL audience.
  const [lang, setLang] = useState<WorksheetLang>(defaultLang === "en" ? "he" : defaultLang);
  const [slug, setSlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = slug ? `${window.location.origin}/w/${slug}` : "";

  // Inline SVG QR so a teacher can project the dialog to a screen and
  // students scan with their phones — no extra app or screenshot
  // needed.  Same `qrcode-generator` library FreeResourcesView already
  // uses for printed sheets; error level M is a balance between visual
  // density and scan reliability from a projected screen.
  const qrSvgMarkup = useMemo(() => {
    if (!shareUrl) return "";
    const qr = qrcode(0, "M");
    qr.addData(shareUrl);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
  }, [shareUrl]);

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
        setError(rpcErr?.message ?? t.generateError);
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
      window.prompt(t.copyPromptTitle, shareUrl);
    }
  };

  const handleWhatsApp = () => {
    const text = t.whatsappText(source.topicName, shareUrl);
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
        title: t.nativeShareTitle(source.topicName),
        text: t.nativeShareText,
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
      aria-label={t.dialogAria}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
        dir={dir}
      >
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 flex items-center gap-3">
          <Share2 size={20} className="text-white" />
          <h3 className="text-lg font-bold text-white flex-1 truncate">{t.heading}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeAria}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-stone-400">{t.topicLabel}</p>
            <p className="font-bold text-stone-900 text-lg">{source.topicName}</p>
            <p className="text-xs text-stone-500">
              {t.wordsCount(Array.from(new Set(source.wordIds)).length)}
            </p>
          </div>

          {!slug && (
            <>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">{t.exerciseLabel}</p>
                <div className="grid gap-2">
                  {SUPPORTED_INTERACTIVE_FORMATS.map((value) => {
                    const active = format === value;
                    const label = value === "matching" ? t.matchingLabel : t.quizLabel;
                    const desc = value === "matching" ? t.matchingDesc : t.quizDesc;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormat(value)}
                        className={`text-start px-4 py-3 rounded-xl border-2 transition-all ${
                          active
                            ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                            : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"
                        }`}
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      >
                        <div className="font-bold">{label}</div>
                        <div className="text-xs text-stone-500">{desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">
                  {t.translationLabel}
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
                {creating ? t.generating : t.generateBtn}
              </button>
            </>
          )}

          {slug && (
            <>
              {/* Scannable QR — useful when the dialog is projected to
                  a screen and students point their phones at it.
                  dangerouslySetInnerHTML is safe here because the QR
                  library produces a pure SVG string with no user input
                  that could carry script tags. */}
              <div className="flex items-center justify-center bg-white rounded-xl border border-stone-200 p-4">
                <div
                  className="w-44 h-44"
                  aria-label={t.qrAria}
                  dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
                />
              </div>

              <div className="rounded-xl bg-stone-50 border border-stone-200 px-3 py-3">
                <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-1">{t.linkLabel}</p>
                <p className="font-mono text-sm break-all text-stone-800">{shareUrl}</p>
                <p className="text-xs text-stone-500 mt-1">
                  {t.expiresNote}
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
                  {copied ? t.copiedBtn : t.copyBtn}
                </button>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="py-2.5 rounded-xl bg-[#25D366] hover:opacity-90 text-white font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  <MessageCircle size={16} />
                  {t.whatsappBtn}
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
                  {t.moreShareBtn}
                </button>
              )}

              <button
                type="button"
                onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}
                className="w-full text-center text-sm font-bold text-emerald-700 hover:text-emerald-900 py-1"
              >
                {t.openAsStudent}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ShareWorksheetDialog;
