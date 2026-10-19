import type { Language } from '../../hooks/useLanguage';
import ShareClassLinkModal from '../ShareClassLinkModal';

interface ClassCreatedModalProps {
  createdClassCode: string | null;
  createdClassName: string;
  onDone: () => void;
  onOpenRoster?: () => void;
  language?: Language;
}

/** Creation ends at the same guided invite teachers use next lesson. */
export default function ClassCreatedModal({
  createdClassCode,
  createdClassName,
  onDone,
  onOpenRoster,
  language,
}: ClassCreatedModalProps) {
  return createdClassCode ? (
    <ShareClassLinkModal
      open
      justCreated
      language={language}
      onClose={onDone}
      className={createdClassName}
      code={createdClassCode}
      onOpenRoster={onOpenRoster}
    />
  ) : null;
}
