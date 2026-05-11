/**
 * HebrewClassShowView — full-screen teacher-led Hebrew classroom mode.
 *
 * STOP-GAP for the Hebrew side of Class Show. The English ClassShowView
 * (234 lines) is shaped around Word data + 6 English-specific modes
 * (Classic, Listening, Reverse, Fill-Blank, True-False, Flashcards),
 * none of which are the right teaching surface for Hebrew.
 *
 * This view ships TWO Hebrew-native projector modes:
 *   1. ניקוד (niqqud reveal) — shows lemmaPlain, click to reveal
 *      lemmaNiqqud. The classroom drill: "say the word with the right
 *      niqqud, then teacher reveals."
 *   2. תרגום (translation reveal) — shows the Hebrew lemma with niqqud,
 *      click to reveal EN + AR translations. Bilingual classroom drill.
 *
 * Future expansion (when ClassShowView becomes subject-aware): listening
 * mode (needs Hebrew TTS), shoresh hunt, synonym matching.
 *
 * Same state machine as the English Class Show: setup → playing →
 * finished. No scoring, no server round-trips.
 */

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, SkipForward, RotateCcw, Volume2 } from "lucide-react";
import { HEBREW_LEMMAS } from "../data/vocabulary-hebrew";
import { HEBREW_PACKS_BY_KIND, lemmasInPack } from "../data/hebrew-packs";
import type { HebrewLemma } from "../data/types-hebrew";
import { useAudio } from "../hooks/useAudio";

type Mode = "niqqud" | "translation" | "reverse" | "listening" | "flashcards";

type Phase =
  | { kind: "setup" }
  | {
      kind: "playing";
      mode: Mode;
      pool: HebrewLemma[];
      order: number[];
      cursor: number;
      revealed: boolean;
    }
  | { kind: "finished"; mode: Mode; pool: HebrewLemma[] };

interface HebrewClassShowViewProps {
  /** Optional pre-selected lemma ids — passed when launching from an
   *  assignment card. Falls back to the full HEBREW_LEMMAS bank. */
  initialLemmaIds?: number[];
  className?: string | null;
  onExit: () => void;
}

const MODE_LABELS_HE: Record<Mode, string> = {
  niqqud: "ניקוד",
  translation: "תרגום",
  reverse: "הפוך",
  listening: "האזנה",
  flashcards: "כרטיסיות",
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function HebrewClassShowView({
  initialLemmaIds,
  className,
  onExit,
}: HebrewClassShowViewProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [selectedIds, setSelectedIds] = useState<number[]>(initialLemmaIds ?? []);
  const [gradePackId, setGradePackId] = useState<string | null>(null);

  // Hebrew TTS — falls back to browser SpeechSynthesis with Carmit /
  // Google he-IL voice when no pre-recorded MP3 exists at sound-hebrew/
  // (the bucket is empty until the audio pipeline ships).
  const { speak } = useAudio({ subject: "hebrew" });

  // In listening mode, auto-play the lemma each time the cursor moves
  // to a new word. Reveal/next still works manually.
  useEffect(() => {
    if (phase.kind !== "playing") return;
    if (phase.mode !== "listening") return;
    const lemma = phase.pool[phase.order[phase.cursor]];
    if (!lemma) return;
    speak(lemma.id, lemma.lemmaPlain);
  }, [phase, speak]);

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

  function startGame(mode: Mode) {
    const pool: HebrewLemma[] = selectedIds.length > 0
      ? HEBREW_LEMMAS.filter((l) => selectedIds.includes(l.id))
      : [...HEBREW_LEMMAS];
    if (pool.length === 0) return;
    setPhase({
      kind: "playing",
      mode,
      pool,
      order: shuffle(pool.map((_, i) => i)),
      cursor: 0,
      revealed: false,
    });
  }

  function reveal() {
    setPhase((p) => (p.kind === "playing" ? { ...p, revealed: true } : p));
  }

  function next() {
    setPhase((p) => {
      if (p.kind !== "playing") return p;
      const nextCursor = p.cursor + 1;
      if (nextCursor >= p.order.length) {
        return { kind: "finished", mode: p.mode, pool: p.pool };
      }
      return { ...p, cursor: nextCursor, revealed: false };
    });
  }

  function skip() {
    next();
  }

  function replay() {
    setPhase((p) => {
      if (p.kind !== "finished") return p;
      return {
        kind: "playing",
        mode: p.mode,
        pool: p.pool,
        order: shuffle(p.pool.map((_, i) => i)),
        cursor: 0,
        revealed: false,
      };
    });
  }

  // ─── Setup ─────────────────────────────────────────────────────
  if (phase.kind === "setup") {
    function toggleLemma(id: number) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }
    function toggleAllInTheme(lemmas: readonly HebrewLemma[]) {
      const ids = lemmas.map((l) => l.id);
      const allOn = ids.every((id) => selectedIds.includes(id));
      setSelectedIds((prev) =>
        allOn ? prev.filter((x) => !ids.includes(x)) : Array.from(new Set([...prev, ...ids])),
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-8" dir="rtl" lang="he">
        <div className="max-w-3xl mx-auto">
          <header className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={onExit}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black hover:bg-white/15"
            >
              <ArrowRight size={14} />
              <span>חזרה</span>
            </button>
            <div className="text-blue-200 font-black text-[11px] tracking-[0.2em]">
              VocaHebrew · מצב הקרנה{className ? ` · ${className}` : ""}
            </div>
          </header>

          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">בחרו מצב להקרנה</h1>
          <p className="text-white/60 font-bold text-sm mb-6">
            תלמידים עונים בקריאה. המורה לוחץ "חשיפה" כדי להציג את התשובה.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <ModeCard
              title="ניקוד"
              blurb="הצגת המילה ללא ניקוד · לחיצה לחשיפת הניקוד הנכון"
              gradient="from-amber-400 to-rose-500"
              onClick={() => startGame("niqqud")}
              disabled={poolSize() === 0}
            />
            <ModeCard
              title="תרגום"
              blurb="הצגת המילה בעברית · לחיצה לחשיפת תרגום אנגלית · ערבית"
              gradient="from-sky-500 to-cyan-600"
              onClick={() => startGame("translation")}
              disabled={poolSize() === 0}
            />
            <ModeCard
              title="הפוך"
              blurb="הצגת התרגום באנגלית · לחיצה לחשיפת המילה בעברית"
              gradient="from-fuchsia-500 to-rose-600"
              onClick={() => startGame("reverse")}
              disabled={poolSize() === 0}
            />
            <ModeCard
              title="האזנה"
              blurb="השמעת המילה · לחיצה לחשיפת הכתיב המנוקד"
              gradient="from-violet-500 to-blue-600"
              onClick={() => startGame("listening")}
              disabled={poolSize() === 0}
            />
            <ModeCard
              title="כרטיסיות"
              blurb="גלישה חופשית בין מילים · המורה קובע את הקצב"
              gradient="from-emerald-500 to-teal-600"
              onClick={() => startGame("flashcards")}
              disabled={poolSize() === 0}
            />
          </div>

          <section className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/70 font-black text-xs">מקור המילים</div>
              <div className="text-white/50 text-xs font-bold">
                {selectedIds.length > 0 ? `${selectedIds.length} נבחרו` : `כל ${HEBREW_LEMMAS.length} המילים`}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
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
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {themeSections.map(({ pack, lemmas }) => {
                const allOn = lemmas.every((l) => selectedIds.includes(l.id));
                return (
                  <div key={pack.id}>
                    <header className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-white font-black text-sm">
                        <span aria-hidden>{pack.emoji}</span>
                        <span>{pack.labelHe}</span>
                        <span className="text-white/40 text-xs">· {lemmas.length}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleAllInTheme(lemmas)}
                        className="text-[10px] font-black text-blue-300 hover:text-blue-200"
                      >
                        {allOn ? "נקה" : "בחרו הכל"}
                      </button>
                    </header>
                    <div className="grid grid-cols-2 gap-1.5">
                      {lemmas.map((l) => {
                        const on = selectedIds.includes(l.id);
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => toggleLemma(l.id)}
                            className={`text-right rounded-lg px-2 py-1.5 text-sm font-bold transition ${
                              on
                                ? "bg-emerald-500 text-white"
                                : "bg-white/5 text-white/80 hover:bg-white/10 border border-white/10"
                            }`}
                          >
                            {l.lemmaNiqqud}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    );

    function poolSize() {
      return selectedIds.length > 0 ? selectedIds.length : HEBREW_LEMMAS.length;
    }
  }

  // ─── Playing ───────────────────────────────────────────────────
  if (phase.kind === "playing") {
    const lemma = phase.pool[phase.order[phase.cursor]];
    // Flashcards is a free-flow deck — no reveal/next distinction;
    // both faces are visible and the teacher just steps through.
    const isFlashcards = phase.mode === "flashcards";
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col" dir="rtl" lang="he">
        {/* Top progress strip */}
        <div className="px-6 sm:px-10 pt-6 flex items-center justify-between text-white/60 font-black text-xs">
          <button type="button" onClick={onExit} className="hover:text-white">
            ← יציאה
          </button>
          <div>
            {phase.cursor + 1} / {phase.order.length} · {MODE_LABELS_HE[phase.mode]}
          </div>
        </div>

        {/* Stage */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            {phase.mode === "niqqud" && (
              <>
                <div className="text-white/40 font-black text-sm tracking-widest mb-4">המילה</div>
                <div className="text-7xl sm:text-9xl font-black text-white mb-10 leading-none">
                  {lemma.lemmaPlain}
                </div>
                {phase.revealed && (
                  <>
                    <div className="text-emerald-300/60 font-black text-sm tracking-widest mb-3">עם ניקוד</div>
                    <div className="text-6xl sm:text-8xl font-black bg-gradient-to-br from-amber-200 to-rose-200 bg-clip-text text-transparent leading-none">
                      {lemma.lemmaNiqqud}
                    </div>
                  </>
                )}
              </>
            )}

            {phase.mode === "translation" && (
              <>
                <div className="text-white/40 font-black text-sm tracking-widest mb-4">המילה</div>
                <div className="text-7xl sm:text-9xl font-black text-white mb-10 leading-none">
                  {lemma.lemmaNiqqud}
                </div>
                {phase.revealed && (
                  <div dir="ltr" className="space-y-2">
                    <div className="text-sky-300/60 font-black text-sm tracking-widest mb-2">Translation</div>
                    <div className="text-3xl sm:text-5xl font-black text-white">{lemma.translationEn}</div>
                    <div className="text-3xl sm:text-5xl font-black text-white/80">{lemma.translationAr}</div>
                  </div>
                )}
              </>
            )}

            {phase.mode === "reverse" && (
              <>
                <div className="text-white/40 font-black text-sm tracking-widest mb-4">תרגום</div>
                <div dir="ltr" className="text-5xl sm:text-7xl font-black text-white mb-2 leading-tight">
                  {lemma.translationEn}
                </div>
                <div dir="ltr" className="text-2xl sm:text-3xl font-bold text-white/60 mb-10">
                  {lemma.translationAr}
                </div>
                {phase.revealed && (
                  <>
                    <div className="text-fuchsia-300/60 font-black text-sm tracking-widest mb-3">בעברית</div>
                    <div className="text-6xl sm:text-8xl font-black bg-gradient-to-br from-fuchsia-200 to-rose-200 bg-clip-text text-transparent leading-none">
                      {lemma.lemmaNiqqud}
                    </div>
                  </>
                )}
              </>
            )}

            {phase.mode === "listening" && (
              <>
                <button
                  type="button"
                  onClick={() => speak(lemma.id, lemma.lemmaPlain)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="inline-flex items-center justify-center w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition mb-8"
                  aria-label="השמע מחדש"
                >
                  <Volume2 size={56} />
                </button>
                <div className="text-white/50 font-bold text-sm mb-2">לחצו לחזרה על השמע</div>
                {phase.revealed && (
                  <div className="mt-6">
                    <div className="text-violet-300/60 font-black text-sm tracking-widest mb-3">המילה</div>
                    <div className="text-6xl sm:text-8xl font-black bg-gradient-to-br from-violet-200 to-blue-200 bg-clip-text text-transparent leading-none">
                      {lemma.lemmaNiqqud}
                    </div>
                  </div>
                )}
              </>
            )}

            {phase.mode === "flashcards" && (
              <>
                <div className="rounded-3xl bg-white/95 px-10 sm:px-16 py-10 sm:py-14 shadow-2xl text-slate-900 max-w-xl">
                  <div className="text-7xl sm:text-9xl font-black mb-6 leading-none">
                    {lemma.lemmaNiqqud}
                  </div>
                  <div className="border-t border-slate-300 pt-4" dir="ltr">
                    <div className="text-2xl sm:text-3xl font-black text-slate-700">
                      {lemma.translationEn}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-500 mt-1">
                      {lemma.translationAr}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => speak(lemma.id, lemma.lemmaPlain)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black hover:bg-white/15"
                >
                  <Volume2 size={14} /> השמע
                </button>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 sm:px-10 pb-8 flex items-center justify-center gap-3">
          {/* Flashcards has no reveal step — straight to next/skip */}
          {!isFlashcards && !phase.revealed ? (
            <button
              type="button"
              onClick={reveal}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-rose-500 text-white font-black text-base shadow-lg shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <Eye size={18} /> חשיפה
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-base shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              הבא <ArrowRight size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={skip}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="inline-flex items-center gap-2 px-5 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-sm hover:bg-white/15"
          >
            <SkipForward size={16} /> דלג
          </button>
        </div>
      </div>
    );
  }

  // ─── Finished ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-6" dir="rtl" lang="he">
      <div className="text-center max-w-md">
        <div className="text-7xl mb-4">🎉</div>
        <h1 className="text-4xl font-black text-white mb-2">סיימנו!</h1>
        <p className="text-white/60 font-bold text-base mb-8">
          {phase.pool.length} מילים · מצב {MODE_LABELS_HE[phase.mode]}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={replay}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-sm shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition"
          >
            <RotateCcw size={16} /> הקרנה נוספת
          </button>
          <button
            type="button"
            onClick={onExit}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-sm hover:bg-white/15"
          >
            חזרה ללוח הבקרה
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mode tile ────────────────────────────────────────────────────
function ModeCard({
  title,
  blurb,
  gradient,
  onClick,
  disabled,
}: {
  title: string;
  blurb: string;
  gradient: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      className={`relative overflow-hidden rounded-2xl p-5 text-start transition-all ${
        disabled
          ? "bg-white/5 border border-white/10 opacity-60 cursor-not-allowed"
          : `bg-gradient-to-br ${gradient} text-white shadow-lg hover:scale-[1.02] active:scale-[0.98]`
      }`}
      lang="he"
    >
      <div className="text-2xl font-black mb-1">{title}</div>
      <p className="text-white/85 text-xs sm:text-sm font-bold">{blurb}</p>
    </button>
  );
}
