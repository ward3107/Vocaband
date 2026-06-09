import { useRef, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { BackBar, Panel, Primary } from '../components/ui';
import { useCustomWords } from '../hooks/useCustomWords';
import { AiNotConfiguredError, enhanceWords, ocrWords, parsePastedWords } from '../lib/wordImport';
import type { UnitLevel, VocabWord } from '../core/types';

type Tab = 'paste' | 'ai' | 'photo';

// Shrink a photo client-side before upload so we stay well under the
// serverless body limit and OCR is fast.
function fileToDataUrl(file: File, maxEdge = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const TABS: { id: Tab; emoji: string }[] = [
  { id: 'paste', emoji: '📋' },
  { id: 'ai', emoji: '✨' },
  { id: 'photo', emoji: '📸' },
];

export default function CustomWordsView({ level, onBack }: { level: UnitLevel; onBack: () => void }) {
  const { language, textAlign, isRTL } = useLanguage();
  const { words, add, remove, clear } = useCustomWords();

  const [tab, setTab] = useState<Tab>('paste');
  const [pasteText, setPasteText] = useState('');
  const [aiText, setAiText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (kind: 'ok' | 'warn' | 'err', text: string) => setNotice({ kind, text });
  const added = (added: VocabWord[]) => {
    add(added);
    flash('ok', `✓ ${added.length} ${t(language, 'words')} ${t(language, 'cw_added')}`);
  };
  const handleAiError = (err: unknown) =>
    flash(
      err instanceof AiNotConfiguredError ? 'warn' : 'err',
      t(language, err instanceof AiNotConfiguredError ? 'cw_ai_not_configured' : 'cw_ai_error'),
    );

  const doPaste = () => {
    const parsed = parsePastedWords(pasteText, level);
    if (!parsed.length) return flash('warn', t(language, 'cw_paste_empty'));
    added(parsed);
    setPasteText('');
  };

  const doEnhance = async () => {
    const list = aiText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!list.length) return flash('warn', t(language, 'cw_paste_empty'));
    setBusy(true);
    setNotice(null);
    try {
      const enriched = await enhanceWords(list, level);
      enriched.length ? added(enriched) : flash('warn', t(language, 'cw_ai_error'));
      if (enriched.length) setAiText('');
    } catch (err) {
      handleAiError(err);
    } finally {
      setBusy(false);
    }
  };

  const doPhoto = async (file: File) => {
    setBusy(true);
    setNotice(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const found = await ocrWords(dataUrl, level);
      found.length ? added(found) : flash('warn', t(language, 'cw_photo_empty'));
    } catch (err) {
      handleAiError(err);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const tabBtn = (id: Tab, emoji: string) => (
    <button
      key={id}
      type="button"
      onClick={() => { setTab(id); setNotice(null); }}
      className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
        tab === id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'bg-white text-slate-600 ring-1 ring-black/5'
      }`}
    >
      {emoji} {t(language, `cw_tab_${id}`)}
    </button>
  );

  const textareaClass = `min-h-[9rem] w-full rounded-2xl border border-slate-200 p-4 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 ${textAlign}`;

  return (
    <div>
      <BackBar onBack={onBack} title={t(language, 'cw_title')} />
      <p className="mb-5 text-slate-600">{t(language, 'cw_intro')}</p>

      <div className="mb-4 flex gap-2 rtl-flip">{TABS.map((x) => tabBtn(x.id, x.emoji))}</div>

      <Panel>
        {tab === 'paste' && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-600">{t(language, 'cw_paste_label')}</label>
            <textarea
              dir="ltr"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'acquire\nsignificant | משמעותי | مهم\nbenefit, תועלת, فائدة'}
              className={textareaClass}
            />
            <p className="text-xs text-slate-400">{t(language, 'cw_paste_hint')}</p>
            <Primary onClick={doPaste}>{t(language, 'cw_add')}</Primary>
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-600">{t(language, 'cw_ai_label')}</label>
            <textarea
              dir="ltr"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder={'sustainable\nresilience\nadvocate'}
              className={textareaClass}
            />
            <p className="text-xs text-slate-400">{t(language, 'cw_ai_hint')}</p>
            <Primary onClick={doEnhance} disabled={busy}>
              {busy ? t(language, 'cw_working') : `✨ ${t(language, 'cw_ai_add')}`}
            </Primary>
          </div>
        )}

        {tab === 'photo' && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-600">{t(language, 'cw_photo_label')}</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) doPhoto(f); }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="grid min-h-[8rem] w-full place-items-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
            >
              <span className="text-center">
                <span className="block text-3xl">📸</span>
                <span className="mt-1 block font-bold">{busy ? t(language, 'cw_working') : t(language, 'cw_photo_pick')}</span>
              </span>
            </button>
            <p className="text-xs text-slate-400">{t(language, 'cw_photo_hint')}</p>
          </div>
        )}

        {notice && (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
              notice.kind === 'ok' ? 'bg-emerald-50 text-emerald-700'
                : notice.kind === 'warn' ? 'bg-amber-50 text-amber-700'
                  : 'bg-rose-50 text-rose-700'
            }`}
          >
            {notice.text}
          </div>
        )}
      </Panel>

      {/* Current custom list */}
      <Panel className="mt-6">
        <div className="flex items-center justify-between rtl-flip">
          <h3 className="text-lg font-bold text-slate-800">{t(language, 'cw_yourWords')} ({words.length})</h3>
          {words.length > 0 && (
            <button type="button" onClick={clear} className="text-sm font-semibold text-rose-500 hover:text-rose-600">
              {t(language, 'cw_clearAll')}
            </button>
          )}
        </div>

        {words.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">{t(language, 'cw_empty')}</p>
        ) : (
          <>
            <p className="mt-1 text-xs text-emerald-600">✓ {t(language, 'cw_usedInBagrut')}</p>
            <ul className="mt-3 space-y-2">
              {words.map((w) => (
                <li key={w.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 rtl-flip">
                  <span className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800" dir="ltr">{w.word}</span>
                    {(w.he || w.ar) && (
                      <span className="block truncate text-sm text-slate-500">{[w.he, w.ar].filter(Boolean).join(' · ')}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(w.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-rose-500 ring-1 ring-black/5 transition hover:bg-rose-50"
                    aria-label={t(language, 'cw_remove')}
                  >
                    {isRTL ? '✕' : '✕'}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
