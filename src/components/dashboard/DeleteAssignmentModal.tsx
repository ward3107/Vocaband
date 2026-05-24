import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";
import ModalShell, {
  ModalDangerButton,
  ModalFootSpacer,
  ModalQuietButton,
} from "../ui/ModalShell";

interface DeleteAssignmentModalProps {
  modal: { id: string; title: string } | null;
  onCancel: () => void;
  onConfirm: (id: string, title: string) => void;
}

/**
 * Delete confirmation for a single assignment row.  Adopts the shared
 * ModalShell so it matches every other danger-variant prompt in the app.
 */
export default function DeleteAssignmentModal({ modal, onCancel, onConfirm }: DeleteAssignmentModalProps) {
  const { language, dir } = useLanguage();
  const t = teacherModalsT[language];
  return (
    <ModalShell
      open={!!modal}
      onClose={onCancel}
      variant="danger"
      icon="🗑️"
      title={t.delAssignTitle}
      dir={dir}
      footer={
        <>
          <ModalQuietButton onClick={onCancel}>{t.delAssignKeep}</ModalQuietButton>
          <ModalFootSpacer />
          <ModalDangerButton
            onClick={() => modal && onConfirm(modal.id, modal.title)}
            disabled={!modal}
          >
            {t.delAssignConfirm}
          </ModalDangerButton>
        </>
      }
    >
      {modal && (
        <>
          <p className="mb-4 text-[14px] text-[#4A3B7A] leading-[1.55]">
            {t.delAssignBody(modal.title)}
          </p>
          <div
            className="rounded-2xl px-4 py-3 text-[13px] font-semibold"
            style={{
              background: "rgba(240,185,108,0.18)",
              border: "1px solid rgba(240,185,108,0.40)",
              color: "#8B5A1A",
            }}
          >
            ⚠️ {t.delAssignWarn}
          </div>
        </>
      )}
    </ModalShell>
  );
}
