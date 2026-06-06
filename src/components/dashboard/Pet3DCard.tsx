import Pet3DModel from "./Pet3DModel";
import { useLanguage, type Language } from "../../hooks/useLanguage";

// Placeholder model — a colored 3D egg. Swap this file (or point `src` at a
// per-stage model) to evolve the pet; e.g. an animated phoenix at the top.
const PET_MODEL_SRC = "/models/pet-placeholder.glb";

const STRINGS: Record<Language, { title: string; hint: string; badge: string }> = {
  en: { title: "Your Pet", hint: "Drag to spin your pet — more forms hatching soon!", badge: "3D" },
  he: { title: "החיה שלך", hint: "גררו כדי לסובב את החיה — צורות חדשות בקרוב!", badge: "תלת־ממד" },
  ar: { title: "حيوانك الأليف", hint: "اسحب لتدوير حيوانك — أشكال جديدة قريبًا!", badge: "ثلاثي الأبعاد" },
  ru: { title: "Your Pet", hint: "Drag to spin your pet — more forms hatching soon!", badge: "3D" },
};

/**
 * Always-visible dashboard card showing the student's pet as a real,
 * spinnable 3D model (independent of the arcade_hub flag). Starts as a
 * placeholder egg; the model is a drop-in so richer/animated pets can be
 * wired in later without touching this card.
 */
export default function Pet3DCard() {
  const { language, dir } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;

  return (
    <div
      dir={dir}
      className="rounded-2xl border border-white/80 shadow-sm bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 p-4 sm:p-5"
    >
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm sm:text-base font-black text-stone-800">
          <span className="text-xl" aria-hidden>🪺</span>
          {t.title}
        </h3>
        <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-violet-600">
          {t.badge}
        </span>
      </header>
      <Pet3DModel src={PET_MODEL_SRC} alt={t.title} height={260} />
      <p className="mt-2 text-xs text-stone-500">{t.hint}</p>
    </div>
  );
}
