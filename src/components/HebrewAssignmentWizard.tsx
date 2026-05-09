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
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  HEBREW_LEMMAS,
  HEBREW_LEMMAS_BY_THEME,
} from "../data/vocabulary-hebrew";
import type {
  HebrewLemma,
  HebrewGradeBand,
} from "../data/types-hebrew";
import type { ClassData } from "../core/supabase";

// Hebrew-native mode ids — match the View names in core/views.ts so the
// student-side router can use a single allowedModes lookup.
export const HEBREW_MODE_OPTIONS: ReadonlyArray<{
  id: "niqqud" | "shoresh" | "synonym" | "listening";
  emoji: string;
  title: string;
  blurb: string;
  gradient: string;
}> = [
  { id: "niqqud",    emoji: "נִ", title: "Niqqud",    blurb: "Pick the right vocalization", gradient: "from-amber-400 to-rose-500" },
  { id: "shoresh",   emoji: "ש",  title: "Shoresh",   blurb: "Pick 3 root letters",          gradient: "from-emerald-500 to-teal-600" },
  { id: "synonym",   emoji: "↔",  title: "Synonym",   blurb: "Pair words by meaning",        gradient: "from-fuchsia-500 to-rose-600" },
  { id: "listening", emoji: "🎧", title: "Listening", blurb: "Hear it, pick the niqqud",     gradient: "from-violet-500 to-blue-600" },
];

const THEME_LABELS_HE: Readonly<Record<string, string>> = {
  animals:   "חיות",
  family:    "משפחה",
  school:    "בית ספר",
  weather:   "מזג אוויר",
  feelings:  "רגשות",
  verbs:     "פעלים",
};

const THEME_EMOJI: Readonly<Record<string, string>> = {
  animals:  "🐾",
  family:   "👨‍👩‍👧",
  school:   "📚",
  weather:  "☀️",
  feelings: "💛",
  verbs:    "🏃",
};

const GRADE_BANDS: readonly HebrewGradeBand[] = ["3-4", "5-6", "7-9"];

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
  const {
    selectedClass,
    selectedWords, setSelectedWords,
    assignmentTitle, setAssignmentTitle,
    assignmentDeadline, setAssignmentDeadline,
    assignmentModes, setAssignmentModes,
    handleSaveAssignment, onBack, isEditing,
  } = props;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [gradeFilter, setGradeFilter] = useState<HebrewGradeBand | null>(null);

  // Theme-grouped pool, optionally narrowed to a grade band.
  const groupedLemmas = useMemo(() => {
    const out: Record<string, HebrewLemma[]> = {};
    for (const [theme, lemmas] of Object.entries(HEBREW_LEMMAS_BY_THEME)) {
      const filtered = gradeFilter
        ? lemmas.filter((l) => l.gradeBand === gradeFilter)
        : [...lemmas];
      if (filtered.length > 0) out[theme] = filtered;
    }
    return out;
  }, [gradeFilter]);

  const selectedSet = useMemo(() => new Set(selectedWords), [selectedWords]);

  function toggleLemma(id: number) {
    setSelectedWords((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleMode(id: string) {
    setAssignmentModes(
      assignmentModes.includes(id)
        ? assignmentModes.filter((m) => m !== id)
        : [...assignmentModes, id],
    );
  }

  function selectAllInTheme(theme: string) {
    const ids = (groupedLemmas[theme] ?? []).map((l) => l.id);
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
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black tracking-widest uppercase hover:bg-white/15"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div className="text-blue-200 font-black text-[11px] tracking-[0.25em] uppercase">
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
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2" lang="he">
              בחר מילים לתרגול
            </h1>
            <p className="text-white/60 font-bold text-sm mb-5">
              {selectedWords.length} selected
            </p>

            {/* Grade band filter */}
            <div className="flex gap-2 mb-6 flex-wrap" dir="ltr">
              <button
                type="button"
                onClick={() => setGradeFilter(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-black tracking-wider uppercase transition ${
                  gradeFilter === null
                    ? "bg-white text-indigo-700 shadow"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                All grades
              </button>
              {GRADE_BANDS.map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => setGradeFilter(band)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black tracking-wider transition ${
                    gradeFilter === band
                      ? "bg-white text-indigo-700 shadow"
                      : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  Grades {band}
                </button>
              ))}
            </div>

            {/* Themed lemma sections */}
            <div className="space-y-6">
              {Object.entries(groupedLemmas).map(([theme, lemmas]) => {
                const allSelected = lemmas.every((l) => selectedSet.has(l.id));
                return (
                  <section key={theme}>
                    <header className="flex items-center justify-between mb-3">
                      <h2 className="text-white font-black text-lg flex items-center gap-2">
                        <span aria-hidden>{THEME_EMOJI[theme] ?? "•"}</span>
                        <span lang="he">{THEME_LABELS_HE[theme] ?? theme}</span>
                        <span className="text-white/40 text-xs">· {lemmas.length}</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => selectAllInTheme(theme)}
                        className="text-xs font-black tracking-wider uppercase text-blue-300 hover:text-blue-200"
                        dir="ltr"
                      >
                        {allSelected ? "Clear" : "Select all"}
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
              primaryLabel="Continue"
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
            dir="ltr"
          >
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 text-right" lang="he" dir="rtl">
              פרטי המטלה
            </h1>
            <p className="text-white/60 font-bold text-sm mb-6 text-right" lang="he" dir="rtl">
              שם וזמן הגשה (אופציונלי)
            </p>

            <label className="block text-white/70 font-black text-xs tracking-widest uppercase mb-2">
              Title
            </label>
            <input
              type="text"
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder="e.g. שורש פעלים — שיעור 3"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 font-bold text-base focus:outline-none focus:border-blue-400 mb-5"
              dir="auto"
            />

            <label className="block text-white/70 font-black text-xs tracking-widest uppercase mb-2">
              Deadline (optional)
            </label>
            <input
              type="date"
              value={assignmentDeadline}
              onChange={(e) => setAssignmentDeadline(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white font-bold text-base focus:outline-none focus:border-blue-400"
            />

            <FooterBar
              primaryDisabled={!canContinueFromStep2}
              primaryLabel="Continue"
              onPrimary={() => setStep(3)}
              secondaryLabel="Back"
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
            dir="ltr"
          >
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 text-right" lang="he" dir="rtl">
              משחקי תרגול
            </h1>
            <p className="text-white/60 font-bold text-sm mb-6 text-right" lang="he" dir="rtl">
              בחר אילו מצבים זמינים לתלמידים
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HEBREW_MODE_OPTIONS.map((mode) => {
                const picked = assignmentModes.includes(mode.id);
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => toggleMode(mode.id)}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all ${
                      picked
                        ? `bg-gradient-to-br ${mode.gradient} ring-2 ring-white/40 shadow-lg`
                        : "bg-white/5 hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-3xl mb-2">{mode.emoji}</div>
                        <div className="text-white font-black text-lg">{mode.title}</div>
                        <div className="text-white/70 text-xs sm:text-sm font-bold mt-1">
                          {mode.blurb}
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
              primaryDisabled={!canSave}
              primaryLabel={isEditing ? "Update assignment" : "Save assignment"}
              onPrimary={() => handleSaveAssignment()}
              secondaryLabel="Back"
              onSecondary={() => setStep(2)}
            />
          </motion.div>
        )}
      </div>
    </div>
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
    <div className="mt-8 flex items-center justify-between gap-3" dir="ltr">
      {countLabel ? (
        <div className="text-white/50 font-black text-xs tracking-widest uppercase">{countLabel}</div>
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
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
