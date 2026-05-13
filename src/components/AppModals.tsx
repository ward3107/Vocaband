/**
 * AppModals — three top-level confirmation modals previously defined
 * inline inside App.tsx.
 *
 * Each is a pure presentational component:
 *   * ConsentModal        — privacy-policy-version acceptance.
 *   * ExitConfirmModal    — "Leave Vocaband?" (shown when a logged-in
 *                           user presses the hardware back button at
 *                           the dashboard floor).
 *   * ClassSwitchModal    — "Switch class?" (shown when an approved
 *                           student logs in with a class code that
 *                           differs from their current class_code).
 *
 * All business logic (database writes, auth sign-out, state updates)
 * stays in App.tsx and is passed in through callback props. These
 * components only render JSX and emit events.
 */
import React from "react";
import { useLanguage } from "../hooks/useLanguage";
import { appModalsT } from "../locales/teacher/app-modals";

// ── ConsentModal ──────────────────────────────────────────────────────────
export interface ConsentModalProps {
  show: boolean;
  policyVersion: string;
  consentChecked: boolean;
  onToggleChecked: (checked: boolean) => void;
  onAccept: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  show,
  policyVersion,
  consentChecked,
  onToggleChecked,
  onAccept,
}) => {
  const { language, dir } = useLanguage();
  const t = appModalsT[language];
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-inverse-surface/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border-t sm:border border-surface-variant/20" dir={dir}>
        <h2 className="text-base sm:text-lg font-black text-on-surface mb-2 font-headline">{t.consentTitle}</h2>
        <p className="text-on-surface-variant text-xs sm:text-sm mb-3">
          {t.consentIntro(policyVersion)}
        </p>
        <div className="bg-surface-container-low rounded-xl p-3 mb-3 text-xs sm:text-sm text-on-surface-variant space-y-1.5">
          <p><strong>{t.consentCollectLabel}</strong>{t.consentCollectBody}</p>
          <p><strong>{t.consentTeachersLabel}</strong>{t.consentTeachersBody}</p>
          <p><strong>{t.consentUseLabel}</strong>{t.consentUseBody}</p>
          <p><strong>{t.consentRightsLabel}</strong>{t.consentRightsBody}</p>
          <div className="flex gap-3 pt-1">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-bold hover:underline">{t.consentFullPolicyLink}</a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-bold hover:underline">{t.consentTermsLink}</a>
          </div>
        </div>
        <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => onToggleChecked(e.target.checked)}
            className="mt-0.5 w-8 h-8 rounded border-outline text-primary focus:ring-primary focus:ring-2 focus:ring-offset-0"
          />
          <span className="text-xs sm:text-sm text-on-surface">
            {t.consentCheckboxPrefix}
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">{t.consentFullPolicyLink}</a>
            {t.consentCheckboxAnd}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">{t.consentTermsLink}</a>
            {t.consentCheckboxSuffix}
          </span>
        </label>
        <button
          onClick={onAccept}
          disabled={!consentChecked}
          className={`w-full py-2.5 rounded-xl font-bold transition-all text-sm font-headline ${consentChecked ? 'signature-gradient text-white hover:shadow-lg' : 'bg-surface-container text-on-surface-variant/50 cursor-not-allowed'}`}
        >
          {t.consentAccept}
        </button>
      </div>
    </div>
  );
};

// ── ExitConfirmModal ──────────────────────────────────────────────────────
export interface ExitConfirmModalProps {
  show: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  show,
  onStay,
  onLeave,
}) => {
  const { language, dir } = useLanguage();
  const t = appModalsT[language];
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl" dir={dir}>
        <h2 className="text-2xl font-black mb-2">{t.exitTitle}</h2>
        <p className="text-stone-500 mb-6">
          {t.exitBody}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onStay}
            className="flex-1 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 border-2 border-stone-200 transition-colors"
          >
            {t.exitStay}
          </button>
          <button
            onClick={onLeave}
            className="flex-1 py-4 rounded-2xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100"
          >
            {t.exitLeave}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── ClassSwitchModal ──────────────────────────────────────────────────────
export interface PendingClassSwitch {
  fromCode: string;
  fromClassName: string | null;
  toCode: string;
  toClassName: string | null;
  supabaseUser: { id: string; email?: string | null };
}

export interface ClassSwitchModalProps {
  pendingClassSwitch: PendingClassSwitch | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClassSwitchModal: React.FC<ClassSwitchModalProps> = ({
  pendingClassSwitch,
  onConfirm,
  onCancel,
}) => {
  const { language, dir } = useLanguage();
  const t = appModalsT[language];
  if (!pendingClassSwitch) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl" dir={dir}>
        <h2 className="text-2xl font-black mb-2">{t.switchTitle}</h2>
        <p className="text-stone-600 mb-6 leading-relaxed">
          {t.switchSentenceLead}
          <span className="font-bold text-stone-900">
            {pendingClassSwitch.fromClassName ?? pendingClassSwitch.fromCode}
          </span>
          {t.switchSentenceMiddle}
          <span className="font-bold text-stone-900">
            {pendingClassSwitch.toClassName ?? pendingClassSwitch.toCode}
          </span>
          {t.switchSentenceTail}
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onCancel}
            style={{ touchAction: 'manipulation' }}
            className="flex-1 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 border-2 border-stone-200 transition-colors"
          >
            {t.switchStayBtn(pendingClassSwitch.fromCode)}
          </button>
          <button
            onClick={onConfirm}
            style={{ touchAction: 'manipulation' }}
            className="flex-1 py-4 rounded-2xl font-black text-white bg-gradient-to-br from-blue-500 to-indigo-600 hover:shadow-lg active:scale-95 transition-all"
          >
            {t.switchConfirmBtn(pendingClassSwitch.toCode)}
          </button>
        </div>
      </div>
    </div>
  );
};
