/**
 * HebrewWorksheetView — minimal Hebrew worksheet builder.
 *
 * STOP-GAP: this is a focused Hebrew worksheet flow so a teacher on a
 * Hebrew class gets a working RTL printable instead of the English-only
 * FreeResourcesView. Two templates ship today (word list, match-up);
 * the proper fold (open-issues.md → "worksheet builder stop-gap") is to
 * make FreeResourcesView itself subject-aware so all 14 English
 * templates work for Hebrew with the right vocabulary shape.
 *
 * Pattern intentionally lean: lemma picker (filter by grade/theme via
 * HEBREW_PACKS) → template choice → settings → preview → print/PDF.
 */

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Printer, Download, ListOrdered, Shuffle } from "lucide-react";
import html2pdf from "html2pdf.js";
import { HEBREW_LEMMAS } from "../data/vocabulary-hebrew";
import { HEBREW_PACKS_BY_KIND, lemmasInPack } from "../data/hebrew-packs";
import type { HebrewLemma } from "../data/types-hebrew";

type Template = "word-list" | "match-up";

const TEMPLATE_LABELS_HE: Record<Template, string> = {
  "word-list": "רשימת מילים",
  "match-up": "התאמה בין עברית לאנגלית",
};

// Stable pseudo-shuffle keyed off the lemma ids so the same lemma set
// re-renders the same scramble between print + PDF (otherwise the
// teacher's print and the saved PDF disagree on what's matched to what).
function deterministicShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface HebrewWorksheetViewProps {
  /** Optional initial selection — passed when teacher clicks "Print this
   *  assignment as worksheet" from the assignment card. */
  initialLemmaIds?: number[];
  initialTitle?: string;
  className?: string | null;
  onBack: () => void;
}

type FontSize = "small" | "medium" | "large";

const FONT_SIZE_PT: Record<FontSize, number> = {
  small: 11,
  medium: 14,
  large: 18,
};

export default function HebrewWorksheetView({
  initialLemmaIds,
  initialTitle,
  className,
  onBack,
}: HebrewWorksheetViewProps) {
  const [title, setTitle] = useState(initialTitle ?? "דף עבודה — אוצר מילים");
  const [selectedIds, setSelectedIds] = useState<number[]>(initialLemmaIds ?? []);
  const [gradePackId, setGradePackId] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template>("word-list");
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [showTranslations, setShowTranslations] = useState(true);
  const [showNiqqud, setShowNiqqud] = useState(true);
  const printRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const selectedLemmas = useMemo<HebrewLemma[]>(
    () => HEBREW_LEMMAS.filter((l) => selectedIds.includes(l.id)),
    [selectedIds],
  );

  // Match-up uses a deterministic shuffle of the translation column so
  // print + PDF render the same arrangement; reseeded only when the
  // selection changes (so re-rendering the preview after a font tweak
  // doesn't reshuffle the answer key).
  const matchSeed = useMemo(
    () => selectedIds.reduce((s, id) => (s * 31 + id) >>> 0, 17),
    [selectedIds],
  );
  const shuffledTranslations = useMemo(
    () => deterministicShuffle(selectedLemmas, matchSeed),
    [selectedLemmas, matchSeed],
  );

  function toggleLemma(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAllInPack(pack: { lemmas: readonly HebrewLemma[] }) {
    const ids = pack.lemmas.map((l) => l.id);
    const allOn = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => (allOn ? prev.filter((x) => !ids.includes(x)) : Array.from(new Set([...prev, ...ids]))));
  }

  async function exportPdf() {
    if (!printRef.current || selectedLemmas.length === 0) return;
    setExporting(true);
    try {
      await html2pdf()
        .from(printRef.current)
        .set({
          margin: 12,
          filename: `${title.replace(/[^\p{L}\d\s\-]/gu, "_") || "worksheet"}.pdf`,
          image: { type: "jpeg", quality: 0.95 } as { type: "jpeg" | "png" | "webp"; quality: number },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        })
        .save();
    } finally {
      setExporting(false);
    }
  }

  function printNow() {
    if (selectedLemmas.length === 0) return;
    window.print();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-8" dir="rtl" lang="he">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6 print:hidden">
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
            VocaHebrew · דף עבודה{className ? ` · ${className}` : ""}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,2fr)] gap-6 print:block">
          {/* ─── Picker + settings ─────────────────────────────── */}
          <aside className="space-y-5 print:hidden">
            <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <label className="block text-white/70 font-black text-xs mb-2">כותרת הדף</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white placeholder-white/30 font-bold text-base focus:outline-none focus:border-blue-400"
                dir="auto"
              />
            </section>

            <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-white/70 font-black text-xs mb-2">סינון לפי כיתה</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setGradePackId(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition ${
                    gradePackId === null ? "bg-white text-indigo-700 shadow" : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  הכל
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
            </section>

            <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-white/70 font-black text-xs mb-2">מילים</div>
              <div className="text-white/50 text-xs font-bold mb-3">{selectedIds.length} נבחרו</div>
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {themeSections.map(({ pack, lemmas }) => {
                  const allOn = lemmas.every((l) => selectedIds.includes(l.id));
                  return (
                    <div key={pack.id}>
                      <header className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-white font-black text-sm">
                          <span aria-hidden>{pack.emoji}</span>
                          <span>{pack.labelHe}</span>
                          <span className="text-white/40 text-xs">· {lemmas.length}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleAllInPack({ lemmas })}
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
                              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                              className={`text-right rounded-lg px-2 py-1.5 text-sm font-bold transition ${
                                on ? "bg-emerald-500 text-white" : "bg-white/5 text-white/80 hover:bg-white/10 border border-white/10"
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

            <section className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="text-white/70 font-black text-xs mb-1">סוג הדף</div>
              <div className="grid grid-cols-2 gap-2">
                {(["word-list", "match-up"] as const).map((tpl) => {
                  const Icon = tpl === "word-list" ? ListOrdered : Shuffle;
                  return (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setTemplate(tpl)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-black transition ${
                        template === tpl ? "bg-white text-indigo-700 shadow" : "bg-white/10 text-white hover:bg-white/15"
                      }`}
                    >
                      <Icon size={14} />
                      <span>{TEMPLATE_LABELS_HE[tpl]}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="text-white/70 font-black text-xs mb-1">הגדרות הדפסה</div>
              <div className="flex gap-2">
                {(["small", "medium", "large"] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-black transition ${
                      fontSize === sz ? "bg-white text-indigo-700 shadow" : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {sz === "small" ? "קטן" : sz === "medium" ? "בינוני" : "גדול"}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-between text-white/80 font-bold text-sm">
                <span>הצג ניקוד</span>
                <input type="checkbox" checked={showNiqqud} onChange={(e) => setShowNiqqud(e.target.checked)} className="w-5 h-5" />
              </label>
              <label className="flex items-center justify-between text-white/80 font-bold text-sm">
                <span>הצג תרגום (אנגלית · ערבית)</span>
                <input type="checkbox" checked={showTranslations} onChange={(e) => setShowTranslations(e.target.checked)} className="w-5 h-5" />
              </label>
            </section>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={printNow}
                disabled={selectedLemmas.length === 0}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm shadow-lg transition ${
                  selectedLemmas.length === 0
                    ? "bg-white/10 text-white/40 cursor-not-allowed"
                    : "bg-white/10 text-white hover:bg-white/15 border border-white/15"
                }`}
              >
                <Printer size={16} /> הדפסה
              </button>
              <button
                type="button"
                onClick={exportPdf}
                disabled={selectedLemmas.length === 0 || exporting}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm shadow-lg transition ${
                  selectedLemmas.length === 0 || exporting
                    ? "bg-white/10 text-white/40 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500 shadow-indigo-500/30"
                }`}
              >
                <Download size={16} /> {exporting ? "מייצא..." : "PDF"}
              </button>
            </div>
          </aside>

          {/* ─── Preview / printable area ──────────────────────── */}
          <div className="rounded-2xl bg-white p-6 sm:p-10 print:rounded-none print:p-0 print:bg-white" dir="rtl">
            <div ref={printRef} className="text-slate-900">
              <div className="text-center mb-6 pb-4 border-b-2 border-slate-300">
                <h1 className="text-2xl font-black mb-1" lang="he">{title}</h1>
                <div className="text-xs text-slate-500 font-bold" lang="he">VocaHebrew · אוצר מילים</div>
              </div>

              {selectedLemmas.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold" lang="he">
                  בחרו מילים מהרשימה כדי ליצור דף עבודה.
                </div>
              ) : template === "word-list" ? (
                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 list-decimal pr-6" style={{ fontSize: `${FONT_SIZE_PT[fontSize]}pt` }}>
                  {selectedLemmas.map((l) => (
                    <li key={l.id} className="py-1.5 border-b border-dashed border-slate-200" lang="he">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-black">
                          {showNiqqud ? l.lemmaNiqqud : l.lemmaPlain}
                        </span>
                        {showTranslations && (
                          <span className="text-slate-500 font-bold text-sm" dir="ltr">
                            {l.translationEn} · {l.translationAr}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                /* Match-up template: Hebrew column on the right (RTL
                   reading order), shuffled English column on the left.
                   Students draw lines between matching pairs. */
                <div lang="he">
                  <p className="text-sm text-slate-600 font-bold mb-4 text-center">
                    התאימו כל מילה בעברית לתרגום הנכון באנגלית בעזרת קו מחבר.
                  </p>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-3" style={{ fontSize: `${FONT_SIZE_PT[fontSize]}pt` }}>
                    {/* Right column (RTL): Hebrew lemmas in original order */}
                    <ol className="space-y-2.5 list-none pr-0" dir="rtl">
                      {selectedLemmas.map((l, i) => (
                        <li key={l.id} className="flex items-center gap-3 py-1 border-b border-dashed border-slate-200">
                          <span className="text-slate-400 font-bold text-xs w-5 shrink-0 text-end">{i + 1}.</span>
                          <span className="font-black flex-1">
                            {showNiqqud ? l.lemmaNiqqud : l.lemmaPlain}
                          </span>
                          <span className="w-3 h-3 rounded-full border-2 border-slate-400 shrink-0" aria-hidden />
                        </li>
                      ))}
                    </ol>
                    {/* Left column (LTR): English translations shuffled */}
                    <ol className="space-y-2.5 list-none pl-0" dir="ltr">
                      {shuffledTranslations.map((l, i) => (
                        <li key={l.id} className="flex items-center gap-3 py-1 border-b border-dashed border-slate-200">
                          <span className="w-3 h-3 rounded-full border-2 border-slate-400 shrink-0" aria-hidden />
                          <span className="font-black flex-1">{l.translationEn}</span>
                          <span className="text-slate-400 font-bold text-xs w-5 shrink-0">{String.fromCharCode(64 + i + 1)}.</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {selectedLemmas.length > 0 && (
                <div className="mt-8 pt-3 border-t border-slate-200 text-[10px] text-slate-400 font-bold flex justify-between" lang="he">
                  <span>{selectedLemmas.length} מילים</span>
                  <span>vocaband.com · VocaHebrew</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
