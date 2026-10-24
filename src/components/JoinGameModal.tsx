import { useState } from 'react';
import { ArrowRight, ScanLine } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { classEntryT } from '../locales/class-entry';
import { parseJoinTarget, resolveClassJoinDestination } from '../utils/classJoin';
import ModalShell from './ui/ModalShell';
import QrScannerModal from './QrScannerModal';

interface JoinGameModalProps {
  onClose: () => void;
  initialCode?: string;
}

export default function JoinGameModal({ onClose, initialCode = '' }: JoinGameModalProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = classEntryT[language];
  const L = (en: string, he: string, ar: string) =>
    language === 'he' ? he : language === 'ar' ? ar : en;
  const [code, setCode] = useState(initialCode);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = parseJoinTarget(code);

  const join = (raw: string) => {
    const parsed = parseJoinTarget(raw);
    if (!parsed) {
      setError(
        L(
          'Check the game code and try again.',
          'בדקו את קוד המשחק ונסו שוב.',
          'تحقق من رمز اللعبة وحاول مجددًا.'
        )
      );
      return;
    }
    if (parsed.kind === 'class') {
      setCode(raw);
      setError(null);
      return;
    }
    // Reuse the existing bootstrap so PIN students keep their session,
    // while guests follow the established anonymous join path.
    window.location.assign(`${window.location.origin}/?session=${parsed.code}`);
  };

  return (
    <>
      <ModalShell
        open
        onClose={onClose}
        dir={dir}
        zIndex={9000}
        icon="🎮"
        title={t.joinGame}
        closeAriaLabel={L('Close', 'סגירה', 'إغلاق')}
        subtitle={t.gameInstructions}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            join(code);
          }}
        >
          <label htmlFor="join-game-code" className="mb-2 block text-base font-bold">
            {L('Game code from your teacher', 'קוד המשחק מהמורה', 'رمز اللعبة من معلمك')}
          </label>
          <input
            id="join-game-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            maxLength={2000}
            placeholder="ABC234"
            dir="ltr"
            aria-describedby="join-game-hint"
            aria-invalid={Boolean(error)}
            className="min-h-14 w-full rounded-xl border-2 border-violet-300 bg-[var(--vb-surface)] px-4 py-3 text-center text-2xl font-bold text-[var(--vb-text-primary)] focus-visible:outline-2 focus-visible:outline-violet-600"
          />
          <div id="join-game-hint" aria-live="polite">
            {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
            {target?.kind === 'class' && (
              <p className="mt-3 text-base font-semibold">{t.gameClassMistake}</p>
            )}
          </div>
          {target?.kind === 'class' ? (
            <a
              href={resolveClassJoinDestination(code) ?? undefined}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-violet-700 px-4 py-3 text-lg font-bold text-white"
            >
              {t.openClass}
            </a>
          ) : (
            <button
              type="submit"
              disabled={target?.kind !== 'game'}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-lg font-bold text-white disabled:opacity-40"
            >
              {t.joinGame}
              <ArrowRight size={20} aria-hidden="true" className={isRTL ? 'rotate-180' : ''} />
            </button>
          )}
        </form>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setScanning(true);
          }}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--vb-border)] px-4 py-3 text-base font-bold"
        >
          <ScanLine size={20} aria-hidden="true" />
          {L('Scan QR code instead', 'אפשר גם לסרוק QR', 'يمكنك أيضًا مسح رمز QR')}
        </button>
      </ModalShell>
      {scanning && (
        <QrScannerModal
          onDetect={(raw) => {
            setScanning(false);
            join(raw);
          }}
          onCancel={() => setScanning(false)}
          onUnsupported={() => {
            setScanning(false);
            setError(
              L(
                'Camera unavailable. Type the game code above.',
                'המצלמה לא זמינה. הקלידו את קוד המשחק למעלה.',
                'الكاميرا غير متاحة. اكتب رمز اللعبة أعلاه.'
              )
            );
          }}
        />
      )}
    </>
  );
}
