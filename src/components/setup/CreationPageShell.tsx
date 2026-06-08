/**
 * CreationPageShell — the one shared frame for every teacher creation
 * surface: the Assignment wizard, Class Show, Hot Seat, Vocab Wheel and
 * Vocabagrut.  These five pages kept drifting apart (different widths,
 * paddings, backgrounds, and one even re-implemented the hero), so the
 * tab strip overhung the content on some and the layout "breathed" in
 * and out as the teacher tabbed between them.
 *
 * This component owns the four things that MUST be identical across all
 * of them — so they can't drift again:
 *
 *   1. page background      — var(--vb-surface-alt)
 *   2. the PageHero          — same gradient hero on every page
 *   3. the activity-tab slot — max-w-5xl, always aligned to the content
 *   4. the content container — max-w-5xl mx-auto px-4 sm:px-6
 *
 * Each page passes only its own hero config, tab node, and body. Width,
 * padding, background and tab placement are decided here, once.
 */
import type { ReactNode } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import PageHero from '../PageHero';

interface CreationPageShellProps {
  // ── Hero (forwarded straight to PageHero) ───────────────────────
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** Small uppercase eyebrow above the title (e.g. the wizard's step). */
  eyebrow?: string;
  /** Renders a back button inside the hero.  Omit when a sticky topBar
   *  already owns "back" (the Assignment wizard). */
  onBack?: () => void;
  backLabel?: string;
  /** Right-side hero slot (e.g. a guide-trigger button). */
  trailing?: ReactNode;
  /** Defaults to the indigo→violet→fuchsia brand gradient.  Class Show
   *  overrides it with its fuchsia→pink→rose family. */
  gradient?: string;

  /** Activity-type tab strip.  Rendered in the shared max-w-5xl slot so
   *  it always lines up with the content below it.  Omit to hide. */
  activityTabs?: ReactNode;

  /** Sticky bar floated above the hero (the wizard's TopAppBar).  When
   *  set, the root gets top padding to clear the fixed bar. */
  topBar?: ReactNode;

  /** Page body — rendered inside the shared width container.  Fixed
   *  overlays (camera, review/guide modals) can sit here too; they
   *  position against the viewport, not the container. */
  children: ReactNode;

  /** Vertical padding for the content container.  Defaults to the
   *  standard setup spacing; the wizard overrides it to clear its
   *  in-step sticky action bars. */
  contentClassName?: string;
}

export default function CreationPageShell({
  icon,
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel,
  trailing,
  gradient = 'from-indigo-500 via-violet-500 to-fuchsia-500',
  activityTabs,
  topBar,
  children,
  contentClassName = 'pt-6 sm:pt-8 pb-8',
}: CreationPageShellProps) {
  const { dir } = useLanguage();

  return (
    <div
      className={`min-h-screen ${topBar ? 'pt-20 sm:pt-24' : ''}`}
      dir={dir}
      style={{ backgroundColor: 'var(--vb-surface-alt)' }}
    >
      {topBar}

      <PageHero
        icon={icon}
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        onBack={onBack}
        backLabel={backLabel}
        trailing={trailing}
        gradient={gradient}
      />

      {/* Tab slot — same width + horizontal padding as the content
          container, so the eyebrow + pills always sit flush with the
          card edges below them. */}
      {activityTabs && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
          {activityTabs}
        </div>
      )}

      <div className={`max-w-5xl mx-auto px-4 sm:px-6 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
