/**
 * HebrewQuickPlaySetupView — Hebrew-native Quick Play setup flow.
 *
 * The English QuickPlaySetupView wraps SetupWizard, which embeds
 * ALL_WORDS + TOPIC_PACKS via WordPicker.  Retrofitting it to also
 * surface HEBREW_LEMMAS + HEBREW_PACKS would mean a Word-shaped union
 * type ripple that touches a dozen sibling components.  This view
 * stays focused: a 2-step Hebrew flow (pick lemmas → pick modes) +
 * the same success screen pattern as the English flow.
 *
 * Output is `lemmaIds: number[]` — a list of HEBREW_LEMMAS.id values.
 * App.tsx's onCreateSession passes them to create_quick_play_session
 * with p_subject='hebrew'; useQuickPlayUrlBootstrap reads the row's
 * subject column and re-loads HEBREW_LEMMAS by id on the student side.
 *
 * Depends on the 20260510_quick_play_subject migration being applied.
 * Without it, create_quick_play_session has no p_subject parameter and
 * Hebrew sessions silently fall back to English on the student side.
 */

import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, ArrowRight, Check, Copy, Share2, ExternalLink, QrCode,
} from "lucide-react";
import { HEBREW_LEMMAS } from "../data/vocabulary-hebrew";
import { HEBREW_PACKS_BY_KIND, lemmasInPack } from "../data/hebrew-packs";
import type { HebrewLemma } from "../data/types-hebrew";

// The 4 wired Hebrew game modes.  Same ids as in HebrewAssignmentWizard
// and HebrewModeSelectionView — matching is what lets the student-side
// `allowedModes` filter resolve correctly.
type HebrewQpModeId = "niqqud" | "shoresh" | "synonym" | "listening";

const HEBREW_QP_MODES: ReadonlyArray<{
  id: HebrewQpModeId;
  emoji: string;
  titleHe: string;
  blurbHe: string;
  gradient: string;
}> = [
  { id: "niqqud",    emoji: "נִ", titleHe: "מצב ניקוד",            blurbHe: "בחרו את הניקוד הנכון",      gradient: "from-amber-400 to-rose-500" },
  { id: "shoresh",   emoji: "ש",  titleHe: "ציד שורש",             blurbHe: "מצאו את שלוש אותיות השורש", gradient: "from-emerald-500 to-teal-600" },
  { id: "synonym",   emoji: "↔",  titleHe: "התאמת מילים נרדפות", blurbHe: "התאימו מילים לפי משמעות",    gradient: "from-fuchsia-500 to-rose-600" },
  { id: "listening", emoji: "🎧", titleHe: "מצב האזנה",            blurbHe: "שמעו ובחרו את הניקוד",       gradient: "from-violet-500 to-blue-600" },
];

export interface HebrewQuickPlaySetupViewProps {
  /** Creates the session in the DB and returns the 6-char join code.
   *  Caller wires this to supabase.rpc('create_quick_play_session', { p_subject: 'hebrew', … }).
   *  Throws on failure — this view stays on the review screen so the
   *  teacher can retry without losing their selection. */
  onCreateSession: (lemmaIds: number[], modes: HebrewQpModeId[], title: string) => Promise<string>;
  /** Called from the success screen — teacher leaves setup and lands
   *  on the live monitor / podium view. */
  onOpenMonitor: () => void;
  onBack: () => void;
}

export default function HebrewQuickPlaySetupView({
  onCreateSession, onOpenMonitor, onBack,
}: HebrewQuickPlaySetupViewProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedModes, setSelectedModes] = useState<HebrewQpModeId[]>(["niqqud", "shoresh", "synonym", "listening"]);
  const [gradePackId, setGradePackId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const themeSections = useMemo(() => {
    const gradeFilter = gradePackId
      ? HEBREW_PACKS_BY_KIND.grade.find((p) => p.id === gradePackId)
      : null;
    return HEBREW_PACKS_BY_KIND.theme
      .map((pack) => ({
        pack,
        lemmas: lemmasInPack(pack).filter((l) => !gradeFilter || gradeFilter.filter(l)),
      }))
      .filter((s) => s.lemmas.length > 0);
  }, [gradePackId]);

  function toggleLemma(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAllInTheme(themeLemmas: readonly HebrewLemma[]) {
    const ids = themeLemmas.map((l) => l.id);
    const allOn = ids.every((id) => selectedSet.has(id));
    if (allOn) {
      setSelectedIds((prev) => prev.filter((x) => !ids.includes(x)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  }

  function toggleMode(id: HebrewQpModeId) {
    setSelectedModes((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function handleCreate() {
    if (selectedIds.length === 0 || selectedModes.length === 0) return;
    setCreating(true);
    try {
      const code = await onCreateSession(selectedIds, selectedModes, title.trim());
      setSessionCode(code);
    } catch (err) {
      console.error("[HebrewQuickPlay] create session failed", err);
      // Caller's showToast already surfaced the user-facing message —
      // we just stay on the review step so the teacher can retry.
    } finally {
      setCreating(false);
    }
  }

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined" || !sessionCode) return "";
    return `${window.location.origin}/?session=${sessionCode}`;
  }, [sessionCode]);

  function handleCopy() {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleWhatsApp() {
    if (!joinUrl) return;
    const msg = `הצטרפו למשחק VocaHebrew: ${joinUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function handlePlayAnother() {
    setSessionCode(null);
    setSelectedIds([]);
    setSelectedModes(["niqqud", "shoresh", "synonym", "listening"]);
    setGradePackId(null);
    setTitle("");
    setStep(1);
  }

  // ─── Success screen ────────────────────────────────────────────
  if (sessionCode) {
    return (
      <motion.div
        dir="rtl"
        lang="he"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-8 flex items-center justify-center"
      >
        <div className="max-w-md w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md text-center space-y-6"
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Check size={40} className="text-white" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-1">המשחק נוצר!</h2>
              <p className="text-white/60 font-bold text-sm">שתפו את הקוד עם הכיתה</p>
            </div>
            <div className="rounded-2xl bg-white/10 border-2 border-blue-400/40 p-5">
              <div className="text-white/50 text-xs font-black tracking-[0.2em] mb-2" dir="ltr">SESSION CODE</div>
              <div className="text-5xl sm:text-6xl font-black tracking-widest text-white" dir="ltr">
                {sessionCode}
              </div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCopy}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm bg-white/10 hover:bg-white/15 border border-white/20 text-white"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? "הועתק" : "העתק קישור"}</span>
              </button>
              <button
                type="button"
                onClick={handleWhatsApp}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30"
              >
                <Share2 size={16} />
                <span>שיתוף בוואטסאפ</span>
              </button>
              <button
                type="button"
                onClick={onOpenMonitor}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/30"
              >
                <ExternalLink size={16} />
                <span>פתח מסך מנחה</span>
              </button>
              <button
                type="button"
                onClick={handlePlayAnother}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm bg-transparent hover:bg-white/5 text-white/70 hover:text-white"
              >
                <QrCode size={16} />
                <span>צרו משחק נוסף</span>
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ─── Setup wizard ──────────────────────────────────────────────
  const canContinueFromStep1 = selectedIds.length > 0;
  const canCreate = selectedIds.length > 0 && selectedModes.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-8" dir="rtl" lang="he">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBack}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black hover:bg-white/15"
          >
            <ArrowRight size={14} />
            <span>חזרה</span>
          </button>
          <div className="text-blue-200 font-black text-[11px] tracking-[0.2em]">
            VocaHebrew · משחק מהיר
          </div>
        </header>

        <div className="flex items-center justify-center gap-2 mb-8" dir="ltr">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? "w-12 bg-gradient-to-r from-blue-400 to-indigo-400"
                  : s < step
                    ? "w-8 bg-emerald-400"
                    : "w-8 bg-white/15"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">בחרו מילים לתרגול</h1>
            <p className="text-white/60 font-bold text-sm mb-5">
              {selectedIds.length} מילים נבחרו
            </p>

            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                type="button"
                onClick={() => setGradePackId(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition ${
                  gradePackId === null ? "bg-white text-indigo-700 shadow" : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                כל הכיתות
              </button>
              {HEBREW_PACKS_BY_KIND.grade.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setGradePackId(pack.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition ${
                    gradePackId === pack.id ? "bg-white text-indigo-700 shadow" : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {pack.labelHe}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {themeSections.map(({ pack, lemmas }) => {
                const allOn = lemmas.every((l) => selectedSet.has(l.id));
                return (
                  <section key={pack.id}>
                    <header className="flex items-center justify-between mb-3">
                      <h2 className="text-white font-black text-lg flex items-center gap-2">
                        <span aria-hidden>{pack.emoji}</span>
                        <span>{pack.labelHe}</span>
                        <span className="text-white/40 text-xs">· {lemmas.length}</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => toggleAllInTheme(lemmas)}
                        className="text-xs font-black text-blue-300 hover:text-blue-200"
                      >
                        {allOn ? "נקה" : "בחרו הכל"}
                      </button>
                    </header>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {lemmas.map((l) => {
                        const picked = selectedSet.has(l.id);
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => toggleLemma(l.id)}
                            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                            className={`relative rounded-2xl p-3 sm:p-4 text-right transition-all ${
                              picked
                                ? "bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-300"
                                : "bg-white/5 hover:bg-white/10 border border-white/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xl sm:text-2xl font-black text-white leading-tight">
                                  {l.lemmaNiqqud}
                                </div>
                                <div className="text-white/60 text-xs sm:text-sm font-bold mt-0.5" dir="ltr">
                                  {l.translationEn} · {l.translationAr}
                                </div>
                                <div className="text-white/40 text-[10px] tracking-widest font-black uppercase mt-1" dir="ltr">
                                  Grade {l.gradeBand}{l.shoresh ? ` · ${l.shoresh.join("·")}` : ""}
                                </div>
                              </div>
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  picked ? "bg-white text-emerald-600" : "bg-white/10 border border-white/20"
                                }`}
                              >
                                {picked && <Check size={14} strokeWidth={3} />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            <FooterBar
              countLabel={`${selectedIds.length} / ${HEBREW_LEMMAS.length}`}
              primaryDisabled={!canContinueFromStep1}
              primaryLabel="המשך"
              onPrimary={() => setStep(2)}
            />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">בחרו משחקים</h1>
            <p className="text-white/60 font-bold text-sm mb-6">
              התלמידים יוכלו לבחור מבין המשחקים שתאפשרו
            </p>

            <label className="block text-white/70 font-black text-xs mb-2">
              כותרת המשחק (אופציונלי)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: שורש פעלים — שיעור 3"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 font-bold text-base focus:outline-none focus:border-blue-400 mb-6"
              dir="auto"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HEBREW_QP_MODES.map((mode) => {
                const picked = selectedModes.includes(mode.id);
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => toggleMode(mode.id)}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    className={`relative overflow-hidden rounded-2xl p-5 text-start transition-all ${
                      picked
                        ? `bg-gradient-to-br ${mode.gradient} ring-2 ring-white/40 shadow-lg`
                        : "bg-white/5 hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-3xl mb-2">{mode.emoji}</div>
                        <div className="text-white font-black text-lg">{mode.titleHe}</div>
                        <div className="text-white/70 text-xs sm:text-sm font-bold mt-1">
                          {mode.blurbHe}
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          picked ? "bg-white text-emerald-600" : "bg-white/10 border border-white/20"
                        }`}
                      >
                        {picked && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <FooterBar
              countLabel={`${selectedModes.length} / ${HEBREW_QP_MODES.length}`}
              primaryDisabled={!canCreate || creating}
              primaryLabel={creating ? "יוצר..." : "צור משחק"}
              onPrimary={handleCreate}
              secondaryLabel="חזרה"
              onSecondary={() => setStep(1)}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Bottom action bar ───────────────────────────────────────────
function FooterBar({
  primaryLabel, primaryDisabled, onPrimary,
  secondaryLabel, onSecondary, countLabel,
}: {
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  countLabel?: string;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3" dir="rtl">
      {countLabel ? (
        <div className="text-white/50 font-black text-xs tracking-widest" dir="ltr">{countLabel}</div>
      ) : (
        <div />
      )}
      <div className="flex gap-2">
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="px-5 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-sm hover:bg-white/15"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm shadow-lg transition ${
            primaryDisabled
              ? "bg-white/10 text-white/40 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500 shadow-indigo-500/30"
          }`}
        >
          {primaryLabel}
          <ArrowLeft size={16} />
        </button>
      </div>
    </div>
  );
}
