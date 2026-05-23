import { useEffect, useState } from 'react';
import { Wifi, Check, X as XIcon, Loader2, X } from 'lucide-react';
import { useLanguage, type Language } from '../../hooks/useLanguage';
import { useNetworkDiagnostic, type CheckStatus } from '../../hooks/useNetworkDiagnostic';

// Teacher-dashboard chip that opens a Network Diagnostic modal.
//
// Why a separate surface (not a toast or a banner): teachers tend to ask
// "is it me, the kids, or the network?" — a one-tap "show me" panel is
// faster to read than scattered error messages, and it doubles as a
// confidence signal during school demos where flaky Wi-Fi is the most
// common failure mode.
//
// Translations are inlined here (same pattern as OfflineIndicator) so this
// change doesn't have to touch the big teacher-dashboard locale file.

interface Strings {
  triggerLabel: string;
  modalTitle: string;
  modalSubtitle: string;
  online: string;
  api: string;
  database: string;
  websocket: string;
  pass: string;
  fail: string;
  running: string;
  runAgain: string;
  close: string;
}

const STRINGS: Record<Language, Strings> = {
  en: {
    triggerLabel: 'Network status',
    modalTitle: 'Network diagnostic',
    modalSubtitle: 'Checking the connections Vocaband uses.',
    online: 'Internet connection',
    api: 'Vocaband server',
    database: 'Student & class data',
    websocket: 'Live game server',
    pass: 'OK',
    fail: 'Blocked',
    running: 'Checking…',
    runAgain: 'Run again',
    close: 'Close',
  },
  he: {
    triggerLabel: 'מצב הרשת',
    modalTitle: 'בדיקת רשת',
    modalSubtitle: 'בודקים את החיבורים שVocaband משתמשת בהם.',
    online: 'חיבור לאינטרנט',
    api: 'שרת Vocaband',
    database: 'נתוני תלמידים וכיתות',
    websocket: 'שרת המשחק החי',
    pass: 'תקין',
    fail: 'חסום',
    running: 'בודקים…',
    runAgain: 'בדוק שוב',
    close: 'סגור',
  },
  ar: {
    triggerLabel: 'حالة الشبكة',
    modalTitle: 'فحص الشبكة',
    modalSubtitle: 'نتحقق من الاتصالات التي يستخدمها Vocaband.',
    online: 'الاتصال بالإنترنت',
    api: 'خادم Vocaband',
    database: 'بيانات الطلاب والصفوف',
    websocket: 'خادم اللعبة المباشرة',
    pass: 'سليم',
    fail: 'محجوب',
    running: 'جارٍ الفحص…',
    runAgain: 'إعادة الفحص',
    close: 'إغلاق',
  },
  ru: {
    triggerLabel: 'Network status',
    modalTitle: 'Network diagnostic',
    modalSubtitle: 'Checking the connections Vocaband uses.',
    online: 'Internet connection',
    api: 'Vocaband server',
    database: 'Student & class data',
    websocket: 'Live game server',
    pass: 'OK',
    fail: 'Blocked',
    running: 'Checking…',
    runAgain: 'Run again',
    close: 'Close',
  },
};

function StatusRow({ label, status, passLabel, failLabel, runningLabel }: {
  label: string;
  status: CheckStatus;
  passLabel: string;
  failLabel: string;
  runningLabel: string;
}) {
  const icon =
    status === 'pass' ? <Check size={18} className="text-emerald-600" /> :
    status === 'fail' ? <XIcon size={18} className="text-rose-600" /> :
    status === 'running' ? <Loader2 size={18} className="text-slate-500 animate-spin" /> :
    <span className="w-[18px] h-[18px] inline-block rounded-full bg-slate-200" />;

  const rightText =
    status === 'pass' ? passLabel :
    status === 'fail' ? failLabel :
    status === 'running' ? runningLabel :
    '—';

  const rightColor =
    status === 'pass' ? 'text-emerald-700' :
    status === 'fail' ? 'text-rose-700' :
    'text-slate-500';

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-semibold text-slate-800 truncate">{label}</span>
      </div>
      <span className={`text-xs font-bold uppercase tracking-wide ${rightColor}`}>
        {rightText}
      </span>
    </div>
  );
}

export default function NetworkDiagnosticButton() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language];
  const [open, setOpen] = useState(false);
  const { result, running, run } = useNetworkDiagnostic();

  // Run on first open so the teacher doesn't have to tap twice.
  useEffect(() => {
    if (open) void run();
  }, [open, run]);

  // Roll-up state for the chip's coloured dot. Idle/running → neutral,
  // any fail after a run completes → red, all pass → green.
  const anyFail = !running && (
    result.online === 'fail' ||
    result.api === 'fail' ||
    result.database === 'fail' ||
    result.websocket === 'fail'
  );
  const allPass = !running && (
    result.online === 'pass' &&
    result.api === 'pass' &&
    result.database === 'pass' &&
    result.websocket === 'pass'
  );
  const dotColor = anyFail ? 'bg-rose-500' : allPass ? 'bg-emerald-500' : 'bg-slate-300';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:shadow active:scale-[0.98] transition-all"
        aria-label={t.triggerLabel}
      >
        <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />
        <Wifi size={14} className="text-slate-500" />
        <span>{t.triggerLabel}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.modalTitle}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-900">{t.modalTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t.modalSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.close}
                className="shrink-0 -mt-1 -me-1 p-1.5 rounded-full hover:bg-slate-100 active:scale-95 transition-all"
              >
                <X size={18} className="text-slate-600" />
              </button>
            </div>
            <div className="px-5 pb-4 space-y-2">
              <StatusRow label={t.online} status={result.online} passLabel={t.pass} failLabel={t.fail} runningLabel={t.running} />
              <StatusRow label={t.api} status={result.api} passLabel={t.pass} failLabel={t.fail} runningLabel={t.running} />
              <StatusRow label={t.database} status={result.database} passLabel={t.pass} failLabel={t.fail} runningLabel={t.running} />
              <StatusRow label={t.websocket} status={result.websocket} passLabel={t.pass} failLabel={t.fail} runningLabel={t.running} />
            </div>
            <div className="px-5 pb-5 pt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void run()}
                disabled={running}
                className="px-3 py-1.5 rounded-lg text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {running ? t.running : t.runAgain}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
