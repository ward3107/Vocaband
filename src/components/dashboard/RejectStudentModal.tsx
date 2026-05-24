import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";
import ModalShell, {
  ModalDangerButton,
  ModalFootSpacer,
  ModalQuietButton,
} from "../ui/ModalShell";

interface RejectStudentModalProps {
  modal: { id: string; displayName: string } | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}

/**
 * Reject-a-pending-student confirmation.  Same shell pattern as
 * DeleteAssignmentModal — danger variant + tip card surfacing the
 * "they can rejoin later" reassurance.
 */
export default function RejectStudentModal({ modal, onCancel, onConfirm }: RejectStudentModalProps) {
  const { language, dir } = useLanguage();
  const t = teacherModalsT[language];
  return (
    <ModalShell
      open={!!modal}
      onClose={onCancel}
      variant="danger"
      icon="🚫"
      title={t.rejectTitle}
      dir={dir}
      footer={
        <>
          <ModalQuietButton onClick={onCancel}>{t.rejectKeep}</ModalQuietButton>
          <ModalFootSpacer />
          <ModalDangerButton
            onClick={() => modal && onConfirm(modal.id)}
            disabled={!modal}
          >
            {t.rejectConfirm}
          </ModalDangerButton>
        </>
      }
    >
      {modal && (
        <>
          <p className="mb-4 text-[14px] text-[#4A3B7A] leading-[1.55]">
            {t.rejectBody(modal.displayName)}
          </p>
          <div
            className="rounded-2xl px-4 py-3 text-[13px] font-semibold"
            style={{
              background: "rgba(240,185,108,0.18)",
              border: "1px solid rgba(240,185,108,0.40)",
              color: "#8B5A1A",
            }}
          >
            ⚠️ {t.rejectWarn}
          </div>
        </>
      )}
    </ModalShell>
  );
}
