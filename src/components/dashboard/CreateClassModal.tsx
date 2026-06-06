import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";
import ModalShell, {
  ModalFootSpacer,
  ModalPrimaryButton,
  ModalQuietButton,
} from "../ui/ModalShell";

interface CreateClassModalProps {
  show: boolean;
  newClassName: string;
  setNewClassName: React.Dispatch<React.SetStateAction<string>>;
  onCancel: () => void;
  onCreate: () => void;
}

/**
 * "Create a new class" prompt — brand-variant shell with a single
 * name input.  Adopts ModalShell so it matches the rest of the
 * Modals v1 dialog family.
 */
export default function CreateClassModal({
  show,
  newClassName,
  setNewClassName,
  onCancel,
  onCreate,
}: CreateClassModalProps) {
  const { language, dir } = useLanguage();
  const t = teacherModalsT[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) onCreate();
  };

  return (
    <ModalShell
      open={show}
      onClose={onCancel}
      variant="brand"
      icon="🎓"
      title={t.createTitle}
      subtitle={t.createBlurb}
      dir={dir}
      footer={
        <>
          <ModalQuietButton onClick={onCancel}>{t.cancel}</ModalQuietButton>
          <ModalFootSpacer />
          <ModalPrimaryButton onClick={onCreate} disabled={!newClassName.trim()}>
            {t.createBtn}
          </ModalPrimaryButton>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          type="text"
          id="create-class-name"
          name="className"
          autoComplete="off"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder={t.classNamePlaceholder}
          maxLength={50}
          style={{ backgroundColor: 'var(--vb-surface)', color: 'var(--vb-text-primary)', borderColor: 'var(--vb-border)' }}
          className="block w-full rounded-2xl border-[1.5px] px-[18px] py-3 text-[15px] font-bold outline-none transition-shadow focus:border-[#8B5CF6] focus:[box-shadow:0_0_0_4px_rgba(139,92,246,0.15)]"
        />
      </form>
    </ModalShell>
  );
}
