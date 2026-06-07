import Pet3DModel from "./Pet3DModel";
import { petModelFor } from "../../constants/petModels";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import { useLanguage, type Language } from "../../hooks/useLanguage";

const STRINGS: Record<Language, { title: string; hint: string; badge: string }> = {
  en: { title: "Your Pet", hint: "Drag to spin your pet — more forms hatching soon!", badge: "3D" },
  he: { title: "החיה שלך", hint: "גררו כדי לסובב את החיה — צורות חדשות בקרוב!", badge: "תלת־ממד" },
  ar: { title: "حيوانك الأليف", hint: "اسحب لتدوير حيوانك — أشكال جديدة قريبًا!", badge: "ثلاثي الأبعاد" },
  ru: { title: "Your Pet", hint: "Drag to spin your pet — more forms hatching soon!", badge: "3D" },
};

/**
 * Dashboard card showing the student's pet as a real, spinnable 3D model.
 * The model is chosen per evolution stage via petModelFor (stages without
 * their own .glb fall back to the placeholder egg), so richer/animated pets
 * — e.g. an Ascended phoenix — drop in by adding a file + one registry line.
 *
 * Gated behind the `pet_3d` feature flag (OFF by default). Turn the flag on
 * (or change the default below) to show it again.
 */
interface Pet3DCardProps {
  /** Current pet stage display name (from PET_MILESTONES) — selects the model. */
  stage: string;
}

export default function Pet3DCard({ stage }: Pet3DCardProps) {
  const enabled = useFeatureFlag("pet_3d", false);
  const { language, dir } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;
  const modelSrc = petModelFor(stage);

  // Hidden for now — see the `pet_3d` flag note above.
  if (!enabled) return null;

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
      <Pet3DModel src={modelSrc} alt={`${t.title} — ${stage}`} height={260} />
      <p className="mt-2 text-xs text-stone-500">{t.hint}</p>
    </div>
  );
}
