/**
 * SpeedWordPicker — the teacher's word list for Speed Round (and, later,
 * Word Hunt Arena): type-ahead search over the vocabulary library + chips
 * for the picked words. Replaces the old fixed Set 1/2/3 grid — teachers
 * wanted to run a round on exactly the 10–15 words THEY chose, not a
 * whole curriculum set. Library-only on purpose: questions need the
 * word's translations for distractors, so free-typed strings that aren't
 * in the library can't form questions anyway.
 *
 * Besides typing, the teacher can one-tap import a saved word list
 * (saved_word_groups — the same lists the assignment wizard saves);
 * the host resolves the stored ids to library words before passing
 * them down, so a group chip only ever adds question-capable words.
 */
import { useMemo, useState } from "react";
import { Plus, X, Search, FolderOpen } from "lucide-react";
import type { Word } from "../../data/vocabulary";

interface SpeedWordPickerStrings {
  searchPlaceholder: string;
  wordsCount: (n: number) => string;
  needWords: (min: number) => string;
  clearWords: string;
  noResults: string;
  loadingWords: string;
  savedListsHeading: string;
}

interface SpeedWordPickerProps {
  /** Full library to search (lazy — null while the vocab chunk loads). */
  library: Word[] | null;
  picked: Word[];
  onChange: (words: Word[]) => void;
  minWords: number;
  t: SpeedWordPickerStrings;
  /** Accent for the picked chips — host themes differ (fuchsia/indigo). */
  chipClass?: string;
  /** Teacher's saved word lists, resolved to library words by the host. */
  savedGroups?: Array<{ id: string; name: string; words: Word[] }>;
}

export default function SpeedWordPicker({
  library, picked, onChange, minWords, t,
  chipClass = "bg-fuchsia-100 text-fuchsia-700",
  savedGroups = [],
}: SpeedWordPickerProps) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !library) return [];
    const pickedIds = new Set(picked.map((w) => w.id));
    const starts: Word[] = [];
    const contains: Word[] = [];
    for (const w of library) {
      if (pickedIds.has(w.id)) continue;
      const e = w.english.toLowerCase();
      if (e.startsWith(q)) starts.push(w);
      else if (e.includes(q)) contains.push(w);
      if (starts.length >= 8) break;
    }
    return [...starts, ...contains].slice(0, 8);
  }, [query, library, picked]);

  const add = (w: Word) => {
    onChange([...picked, w]);
    setQuery("");
  };

  return (
    <div>
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {picked.map((w) => (
            <span key={w.id} className={`inline-flex items-center gap-1 ps-2.5 pe-1 py-1 rounded-full font-bold text-xs ${chipClass}`}>
              {w.english}
              <button
                type="button"
                onClick={() => onChange(picked.filter((p) => p.id !== w.id))}
                aria-label={`remove ${w.english}`}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-black/10"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            style={{ touchAction: "manipulation" }}
            className="inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs text-stone-400 hover:text-rose-600 transition-colors"
          >
            {t.clearWords}
          </button>
        </div>
      )}

      <div className="relative">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions[0]) {
              e.preventDefault();
              add(suggestions[0]);
            }
          }}
          placeholder={library ? t.searchPlaceholder : t.loadingWords}
          disabled={!library}
          dir="ltr" // library entries are English words
          autoComplete="off"
          spellCheck={false}
          className="w-full ps-9 pe-3 py-2.5 rounded-xl border-2 border-outline-variant bg-surface text-on-surface font-bold text-sm outline-none focus:border-fuchsia-400 transition-colors placeholder:font-semibold placeholder:text-stone-400"
        />
        {query.trim() && (
          <div className="absolute z-20 mt-1 inset-x-0 rounded-xl border border-outline-variant bg-surface shadow-xl overflow-hidden">
            {suggestions.length === 0 ? (
              <p className="px-3 py-2.5 text-xs font-bold text-stone-400">{t.noResults}</p>
            ) : (
              suggestions.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => add(w)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-start hover:bg-surface-container transition-colors"
                >
                  <Plus size={14} className="text-fuchsia-500 shrink-0" />
                  <span className="font-black text-sm text-on-surface">{w.english}</span>
                  <span className="ms-auto text-xs font-bold text-stone-400" dir="rtl">{w.hebrew}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {savedGroups.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-1.5 flex items-center gap-1">
            <FolderOpen size={12} /> {t.savedListsHeading}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {savedGroups.map((g) => {
              const pickedIds = new Set(picked.map((w) => w.id));
              const newWords = g.words.filter((w) => !pickedIds.has(w.id));
              const exhausted = newWords.length === 0;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onChange([...picked, ...newWords])}
                  disabled={exhausted}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full font-bold text-xs border transition active:scale-95 ${
                    exhausted
                      ? "border-outline-variant text-stone-300 cursor-not-allowed"
                      : "border-outline-variant text-on-surface-variant hover:border-fuchsia-300 hover:text-fuchsia-600"
                  }`}
                >
                  <Plus size={12} strokeWidth={3} className={exhausted ? "" : "text-fuchsia-500"} />
                  {g.name}
                  <span className="text-stone-400">({exhausted ? g.words.length : newWords.length})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className={`mt-2 text-xs font-bold ${picked.length < minWords ? "text-amber-600" : "text-stone-400"}`}>
        {picked.length < minWords ? t.needWords(minWords) : t.wordsCount(picked.length)}
      </p>
    </div>
  );
}
