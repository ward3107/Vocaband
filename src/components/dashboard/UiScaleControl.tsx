/**
 * UiScaleControl — three-button display-size picker for the teacher
 * top app bar.  Lets a teacher who finds the UI too small (older eyes,
 * projector view, classroom display) bump every rem-based size up
 * via document root font-size.
 *
 * Visual: A / A / A — small, medium, large.  Active button gets the
 * signature gradient + white text.  Sits next to Logout in TopAppBar.
 */
import { useUiScale, type UiScale } from "../../hooks/useUiScale";

const OPTIONS: Array<{ id: UiScale; label: string; size: string; aria: string }> = [
  { id: 'normal', label: 'A',  size: 'text-sm',  aria: 'Normal size' },
  { id: 'large',  label: 'A',  size: 'text-base',aria: 'Large size'  },
  { id: 'xlarge', label: 'A',  size: 'text-lg',  aria: 'Extra large size' },
];

export default function UiScaleControl() {
  const { scale, setScale } = useUiScale();

  return (
    <div
      role="group"
      aria-label="Display size"
      className="hidden sm:inline-flex items-stretch rounded-xl bg-surface-container-lowest border-2 border-primary-container/30 overflow-hidden shadow-sm"
    >
      {OPTIONS.map((opt) => {
        const active = scale === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setScale(opt.id)}
            aria-pressed={active}
            aria-label={opt.aria}
            title={opt.aria}
            className={`px-2.5 py-2 font-black ${opt.size} transition-colors ${
              active
                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
