// Horizontal-scrolling row of shop items. One section per catalogue
// (Eggs, Avatars, Themes, Frames+Titles, Power-ups+Boosters). Render-
// props pattern so each section can render its own card shape — Egg
// cards have rarity badges, avatar cards have unlock state, etc.

import type { ReactNode } from 'react';

interface Props<T> {
  emoji: string;
  title: string;
  subtitle?: string;
  items: T[];
  keyFor: (item: T, index: number) => string;
  renderCard: (item: T, index: number) => ReactNode;
  isRTL: boolean;
}

export default function CategoryCarousel<T>({
  emoji,
  title,
  subtitle,
  items,
  keyFor,
  renderCard,
  isRTL,
}: Props<T>) {
  return (
    <section className="space-y-2.5">
      <header className={`flex items-baseline gap-2 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <span className="text-2xl leading-none" aria-hidden>{emoji}</span>
        <h2 className="text-lg font-black tracking-tight text-stone-900">{title}</h2>
        {subtitle && (
          <span className="text-xs font-medium text-stone-500">{subtitle}</span>
        )}
      </header>
      <div
        className={`flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x ${
          isRTL ? 'flex-row-reverse' : ''
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {items.map((item, i) => (
          <div key={keyFor(item, i)} className="snap-start flex-shrink-0">
            {renderCard(item, i)}
          </div>
        ))}
      </div>
    </section>
  );
}
