/**
 * HebrewAssignmentWizard — Hebrew counterpart to CreateAssignmentWizard.
 *
 * The English wizard is too entangled with Word-shaped data (OCR upload,
 * topic packs, paste matching against ALL_WORDS, custom-word audio) to
 * retrofit cleanly.  Hebrew gets its own focused 3-step flow:
 *
 *   1. Pick lemmas — themed sections + grade-band filter chips
 *   2. Title + deadline
 *   3. Game modes — 4 Hebrew-native modes
 *
 * State (selectedWords, title, deadline, modes) is owned by App.tsx and
 * threaded in as props; the same handleSaveAssignment that English uses
 * persists the row.  That function already branches on the parent
 * class's subject and pulls the `words` JSONB from HEBREW_LEMMAS.
 */
import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, BookOpen, Camera, Upload, FolderOpen, Loader2, Pin, Repeat } from "lucide-react";
import { HEBREW_LEMMAS, HEBREW_LEMMAS_BY_ID } from "../data/vocabulary-hebrew";
import { HEBREW_PACKS_BY_KIND, lemmasInPack } from "../data/hebrew-packs";
import type { HebrewLemma } from "../data/types-hebrew";
import type { ClassData } from "../core/supabase";
import { runHebrewOcr } from "../utils/hebrewOcr";
import { useSavedTasks, type SavedTask } from "../hooks/useSavedTasks";
import { useLanguage } from "../hooks/useLanguage";
import { hebrewWizardT } from "../locales/teacher/hebrew-wizard";

// Hebrew-native mode ids. The first 4 are wired end-to-end. The next 6
// (classic … scramble) are listed for teachers to see the roadmap and
// gated with `comingSoon: true` until each game component lands. They
// match the planned View names in core/views.ts so the wizard schema
// won't move once the games ship.
export type HebrewModeId =
  | "niqqud"
  | "shoresh"
  | "synonym"
  | "listening"
  | "classic"
  | "spelling"
  | "matching"
  | "memory-flip"
  | "flashcards"
  | "scramble";

export const HEBREW_MODE_OPTIONS: ReadonlyArray<{
  id: HebrewModeId;
  emoji: string;
  titleHe: string;
  blurbHe: string;
  gradient: string;
  comingSoon?: boolean;
}> = [
  { id: "niqqud",      emoji: "נִ", titleHe: "מצב ניקוד",            blurbHe: "בחרו את הניקוד הנכון",          gradient: "from-amber-400 to-rose-500" },
  { id: "shoresh",     emoji: "ש",  titleHe: "ציד שורש",             blurbHe: "מצאו את שלוש אותיות השורש",    gradient: "from-emerald-500 to-teal-600" },
  { id: "synonym",     emoji: "↔",  titleHe: "התאמת מילים נרדפות", blurbHe: "התאימו מילים לפי משמעות",       gradient: "from-fuchsia-500 to-rose-600" },
  { id: "listening",   emoji: "🎧", titleHe: "מצב האזנה",            blurbHe: "שמעו ובחרו את הניקוד",          gradient: "from-violet-500 to-blue-600" },
  { id: "classic",     emoji: "🌍", titleHe: "תרגום מילים",          blurbHe: "בחרו את התרגום הנכון",          gradient: "from-sky-500 to-cyan-600",      comingSoon: true },
  { id: "spelling",    emoji: "⌨️", titleHe: "איות בעברית",          blurbHe: "הקלידו את המילה הנכונה",        gradient: "from-lime-500 to-emerald-600",  comingSoon: true },
  { id: "matching",    emoji: "🧩", titleHe: "זיווג מילים",          blurbHe: "התאימו מילה לתרגום",            gradient: "from-rose-500 to-pink-600",     comingSoon: true },
  { id: "memory-flip", emoji: "🃏", titleHe: "משחק זיכרון",          blurbHe: "הפכו כרטיסים ומצאו זוגות",      gradient: "from-purple-500 to-fuchsia-600", comingSoon: true },
  { id: "flashcards",  emoji: "📇", titleHe: "כרטיסיות",              blurbHe: "סקירת מילים בקצב שלכם",         gradient: "from-orange-500 to-amber-600",  comingSoon: true },
  { id: "scramble",    emoji: "🔀", titleHe: "ערבוב אותיות",         blurbHe: "סדרו מחדש את האותיות",          gradient: "from-teal-500 to-emerald-600",  comingSoon: true },
];

export interface HebrewAssignmentWizardProps {
  selectedClass: ClassData;
  selectedWords: number[];
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  assignmentTitle: string;
  setAssignmentTitle: (v: string) => void;
  assignmentDeadline: string;
  setAssignmentDeadline: (v: string) => void;
  assignmentModes: string[];
  setAssignmentModes: (v: string[]) => void;
  handleSaveAssignment: () => void | Promise<void>;
  onBack: () => void;
  /** True when an existing assignment is being edited rather than
   *  created.  Drives the title and the save-button copy. */
  isEditing?: boolean;
}

export default function HebrewAssignmentWizard(props: HebrewAssignmentWizardProps) {
  const { language } = useLanguage();
  const t = hebrewWizardT[language];
  const {
    selectedClass,
    selectedWords, setSelectedWords,
    assignmentTitle, setAssignmentTitle,
    assignmentDeadline, setAssignmentDeadline,
    assignmentModes, setAssignmentModes,
    handleSaveAssignment, onBack, isEditing,
  } = props;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [gradePackId, setGradePackId] = useState<string | null>(null);

  // Word-source picker. "packs" is the existing browse-by-theme flow.
  // "ocr" / "upload" both call /api/ocr with lang=he and pre-select
  // matched lemma ids. "library" is a slice-3 placeholder.
  type WordSource = "packs" | "ocr" | "upload" | "library";
  const [wordSource, setWordSource] = useState<WordSource>("packs");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrUnmatched, setOcrUnmatched] = useState<string[]>([]);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // Saved templates — keyed per teacher uid in localStorage. Filtered to
  // tasks that contain at least one Hebrew lemma id so English-only
  // templates from the same teacher don't pollute the picker.
  const savedTasks = useSavedTasks(selectedClass.teacherUid);
  const hebrewSavedTasks = useMemo(
    () =>
      savedTasks.tasks.filter((t) =>
        t.wordIds.some((id) => HEBREW_LEMMAS_BY_ID.has(id)),
      ),
    [savedTasks.tasks],
  );

  function loadSavedTask(task: SavedTask) {
    const matchingIds = task.wordIds.filter((id) => HEBREW_LEMMAS_BY_ID.has(id));
    setSelectedWords(matchingIds);
    if (task.modes.length > 0) setAssignmentModes(task.modes);
    if (task.title && !assignmentTitle.trim()) setAssignmentTitle(task.title);
    savedTasks.bumpUse(task.id);
    setWordSource("packs");
  }

  async function handleOcrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setOcrError(null);
    setOcrBusy(true);
    try {
      const result = await runHebrewOcr(file, { onError: setOcrError });
      if (!result) return;
      // Pre-select matched ids on top of any existing manual selection.
      setSelectedWords((prev) => Array.from(new Set([...prev, ...result.matchedIds])));
      setOcrUnmatched(result.unmatched);
      // Switch back to packs view so the teacher sees what got selected
      // (the OCR/upload tabs themselves don't render the lemma grid).
      setWordSource("packs");
    } finally {
      setOcrBusy(false);
    }
  }

  // Theme packs, each narrowed by the optional grade pack filter. The
  // taxonomy lives in hebrew-packs.ts so adding a new theme/grade is a
  // single-line change there with no churn here.
  const themeSections = useMemo(() => {
    const gradeFilter = gradePackId
      ? HEBREW_PACKS_BY_KIND.grade.find((p) => p.id === gradePackId)
      : null;
    return HEBREW_PACKS_BY_KIND.theme
      .map((pack) => {
        const lemmas = lemmasInPack(pack).filter(
          (l) => !gradeFilter || gradeFilter.filter(l),
        );
        return { pack, lemmas };
      })
      .filter((s) => s.lemmas.length > 0);
  }, [gradePackId]);

  const selectedSet = useMemo(() => new Set(selectedWords), [selectedWords]);

  function toggleLemma(id: number) {
    setSelectedWords((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleMode(id: string) {
    const mode = HEBREW_MODE_OPTIONS.find((m) => m.id === id);
    if (mode?.comingSoon) return;
    setAssignmentModes(
      assignmentModes.includes(id)
        ? assignmentModes.filter((m) => m !== id)
        : [...assignmentModes, id],
    );
  }

  function selectAllInTheme(themeLemmas: readonly HebrewLemma[]) {
    const ids = themeLemmas.map((l) => l.id);
    const allSelected = ids.every((id) => selectedSet.has(id));
    if (allSelected) {
      setSelectedWords((prev) => prev.filter((x) => !ids.includes(x)));
    } else {
      setSelectedWords((prev) => Array.from(new Set([...prev, ...ids])));
    }
  }

  const canContinueFromStep1 = selectedWords.length > 0;
  const canContinueFromStep2 = assignmentTitle.trim().length > 0;
  const canSave = assignmentModes.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBack}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black hover:bg-white/15"
          >
            <ArrowRight size={14} />
            <span>{t.back}</span>
          </button>
          <div className="text-blue-200 font-black text-[11px] tracking-[0.2em]" lang="he">
            VocaHebrew · {selectedClass.name}
          </div>
        </header>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8" dir="ltr">
          {[1, 2, 3].map((s) => (
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

        {/* ─── Step 1: Pick lemmas ─────────────────────────────── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              {t.step1Heading}
            </h1>
            <p className="text-white/60 font-bold text-sm mb-5">
              {t.step1Selected(selectedWords.length)}
            </p>

            {/* ─── Word-source picker ─────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              <SourceTab active={wordSource === "packs"} onClick={() => setWordSource("packs")} icon={<BookOpen size={18} />} label={t.sourceTabPacks} />
              <SourceTab active={wordSource === "ocr"} onClick={() => { setWordSource("ocr"); cameraInputRef.current?.click(); }} icon={ocrBusy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />} label={t.sourceTabOcr} disabled={ocrBusy} />
              <SourceTab active={wordSource === "upload"} onClick={() => { setWordSource("upload"); uploadInputRef.current?.click(); }} icon={ocrBusy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} label={t.sourceTabUpload} disabled={ocrBusy} />
              <SourceTab active={wordSource === "library"} onClick={() => setWordSource("library")} icon={<FolderOpen size={18} />} label={t.sourceTabLibrary} />
            </div>

            {/* Hidden inputs — Camera uses capture, Upload doesn't. */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleOcrFile} />
            <input ref={uploadInputRef} type="file" accept="image/*" hidden onChange={handleOcrFile} />

            {/* Saved-templates library */}
            {wordSource === "library" && (
              <div className="mb-5" lang="he">
                {hebrewSavedTasks.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70 text-sm font-bold">
                    {t.noSavedTasksYet}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hebrewSavedTasks.slice(0, 12).map((task) => {
                      const matchCount = task.wordIds.filter((id) => HEBREW_LEMMAS_BY_ID.has(id)).length;
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => loadSavedTask(task)}
                          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                          className="w-full text-start rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 transition"
                          lang="he"
                          dir="rtl"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {task.pinned && <Pin size={14} className="text-amber-400 fill-amber-400 shrink-0" />}
                              <span className="font-black text-white truncate">
                                {task.title || t.unnamedTask}
                              </span>
                            </div>
                            <Repeat size={16} className="text-blue-300 shrink-0" />
                          </div>
                          <div className="text-white/50 text-xs font-bold mt-1" dir="ltr">
                            {matchCount} words · {task.modes.length} modes · used {task.timesUsed}×
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* OCR feedback — error toast or "review unmatched" panel. */}
            {ocrError && (
              <div className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-rose-100 text-sm font-bold" lang="he">
                {ocrError}
              </div>
            )}
            {ocrUnmatched.length > 0 && !ocrError && (
              <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3" lang="he">
                <div className="text-amber-100 text-xs font-black mb-2">
                  {t.ocrUnmatched(ocrUnmatched.length)}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {ocrUnmatched.slice(0, 20).map((w) => (
                    <span key={w} className="inline-block px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-xs font-bold" dir="rtl">
                      {w}
                    </span>
                  ))}
                  {ocrUnmatched.length > 20 && (
                    <span className="text-white/50 text-xs font-bold">{t.ocrUnmatchedMore(ocrUnmatched.length - 20)}</span>
                  )}
                </div>
              </div>
            )}

            {/* Grade band filter — pulled from HEBREW_PACKS_BY_KIND.grade */}
            <div className="flex gap-2 mb-6 flex-wrap" lang="he">
              <button
                type="button"
                onClick={() => setGradePackId(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition ${
                  gradePackId === null
                    ? "bg-white text-indigo-700 shadow"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {t.allClasses}
              </button>
              {HEBREW_PACKS_BY_KIND.grade.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setGradePackId(pack.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition ${
                    gradePackId === pack.id
                      ? "bg-white text-indigo-700 shadow"
                      : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {pack.labelHe}
                </button>
              ))}
            </div>

            {/* Themed lemma sections */}
            <div className="space-y-6">
              {themeSections.map(({ pack, lemmas }) => {
                const allSelected = lemmas.every((l) => selectedSet.has(l.id));
                return (
                  <section key={pack.id}>
                    <header className="flex items-center justify-between mb-3">
                      <h2 className="text-white font-black text-lg flex items-center gap-2" lang="he">
                        <span aria-hidden>{pack.emoji}</span>
                        <span>{pack.labelHe}</span>
                        <span className="text-white/40 text-xs">· {lemmas.length}</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => selectAllInTheme(lemmas)}
                        className="text-xs font-black text-blue-300 hover:text-blue-200"
                        lang="he"
                      >
                        {allSelected ? t.clearAll : t.selectAll}
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
                            lang="he"
                            dir="rtl"
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
              primaryDisabled={!canContinueFromStep1}
              primaryLabel={t.continueBtn}
              onPrimary={() => setStep(2)}
              countLabel={`${selectedWords.length} / ${HEBREW_LEMMAS.length}`}
            />
          </motion.div>
        )}

        {/* ─── Step 2: Title + deadline ───────────────────────── */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              {t.step2Heading}
            </h1>
            <p className="text-white/60 font-bold text-sm mb-6">
              {t.step2Subheading}
            </p>

            <label className="block text-white/70 font-black text-xs mb-2">
              {t.titleLabel}
            </label>
            <input
              type="text"
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 font-bold text-base focus:outline-none focus:border-blue-400 mb-5"
              dir="auto"
            />

            <label className="block text-white/70 font-black text-xs mb-2">
              {t.deadlineLabel}
            </label>
            <input
              type="date"
              value={assignmentDeadline}
              onChange={(e) => setAssignmentDeadline(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white font-bold text-base focus:outline-none focus:border-blue-400"
            />

            <FooterBar
              primaryDisabled={!canContinueFromStep2}
              primaryLabel={t.continueBtn}
              onPrimary={() => setStep(3)}
              secondaryLabel={t.back}
              onSecondary={() => setStep(1)}
            />
          </motion.div>
        )}

        {/* ─── Step 3: Modes ──────────────────────────────────── */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              {t.step3Heading}
            </h1>
            <p className="text-white/60 font-bold text-sm mb-6">
              {t.step3Subheading}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HEBREW_MODE_OPTIONS.map((mode) => {
                const picked = assignmentModes.includes(mode.id);
                const locked = mode.comingSoon === true;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => toggleMode(mode.id)}
                    disabled={locked}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    className={`relative overflow-hidden rounded-2xl p-5 text-start transition-all ${
                      locked
                        ? "bg-white/5 border border-white/10 opacity-60 cursor-not-allowed"
                        : picked
                          ? `bg-gradient-to-br ${mode.gradient} ring-2 ring-white/40 shadow-lg`
                          : "bg-white/5 hover:bg-white/10 border border-white/10"
                    }`}
                    lang="he"
                  >
                    {locked && (
                      <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full bg-white/15 text-white/80 text-[10px] font-black tracking-widest">
                        {t.comingSoon}
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-3xl mb-2">{mode.emoji}</div>
                        <div className="text-white font-black text-lg">{mode.titleHe}</div>
                        <div className="text-white/70 text-xs sm:text-sm font-bold mt-1">
                          {mode.blurbHe}
                        </div>
                      </div>
                      {!locked && (
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            picked ? "bg-white text-emerald-600" : "bg-white/10 border border-white/20"
                          }`}
                        >
                          {picked && <Check size={14} strokeWidth={3} />}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <FooterBar
              primaryDisabled={!canSave}
              primaryLabel={isEditing ? t.saveBtnEdit : t.saveBtnNew}
              onPrimary={() => handleSaveAssignment()}
              secondaryLabel={t.back}
              onSecondary={() => setStep(2)}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Word-source picker tab ───────────────────────────────────────
function SourceTab({
  active, onClick, icon, label, disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-xs font-black transition ${
        disabled
          ? "bg-white/5 text-white/30 cursor-not-allowed"
          : active
            ? "bg-white text-indigo-700 shadow"
            : "bg-white/10 text-white hover:bg-white/15"
      }`}
      lang="he"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ─── Bottom action bar ────────────────────────────────────────────
function FooterBar({
  primaryLabel,
  primaryDisabled,
  onPrimary,
  secondaryLabel,
  onSecondary,
  countLabel,
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
            lang="he"
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
          lang="he"
        >
          {primaryLabel}
          <ArrowLeft size={16} />
        </button>
      </div>
    </div>
  );
}
