import type { Dispatch, SetStateAction } from 'react';
import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";
import ModalShell, { ModalDangerButton, ModalFootSpacer, ModalQuietButton } from "../ui/ModalShell";

export interface ConfirmDialogState {
  show: boolean;
  message: string;
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: Dispatch<SetStateAction<ConfirmDialogState>>;
}

/**
 * Generic confirm dialog used across the teacher dashboard for
 * destructive prompts (Delete this? · Remove student? · Reset PIN?
 * etc.).  Adopts the shared ModalShell from the Modals v1 design
 * system so every dialog in the app shares one chrome instead of
 * one-off layouts per modal.
 */
export default function ConfirmDialog({ confirmDialog, setConfirmDialog }: ConfirmDialogProps) {
  const { language, dir } = useLanguage();
  const t = teacherModalsT[language];

  const close = () =>
    setConfirmDialog({ show: false, message: "", onConfirm: () => { /* no-op */ } });

  return (
    <ModalShell
      open={confirmDialog.show}
      onClose={close}
      variant="danger"
      icon="⚠️"
      title={t.confirmActionTitle}
      dir={dir}
      footer={
        <>
          <ModalQuietButton onClick={close}>{t.cancel}</ModalQuietButton>
          <ModalFootSpacer />
          <ModalDangerButton
            onClick={() => {
              confirmDialog.onConfirm();
              close();
            }}
          >
            {t.confirmBtn}
          </ModalDangerButton>
        </>
      }
    >
      <p className="text-[14px] text-[#4A3B7A] leading-[1.55]">{confirmDialog.message}</p>
    </ModalShell>
  );
}
