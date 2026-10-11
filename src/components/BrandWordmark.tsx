/** One brand treatment in teacher, student and sign-in navigation. */
export default function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5" dir="ltr">
      <img src="/icon.svg" alt="" width="38" height="38" className="h-9 w-9 rounded-xl" />
      {!compact && <span className="max-[359px]:hidden font-headline text-xl font-extrabold tracking-tight text-[var(--vb-text-primary)]">Vocaband<span className="text-[var(--vb-accent)]">.</span></span>}
    </span>
  );
}
