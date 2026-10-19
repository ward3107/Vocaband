import ShareClassLinkModal from '../ShareClassLinkModal';

interface ClassCreatedModalProps {
  createdClassCode: string | null;
  createdClassName: string;
  onDone: () => void;
  onOpenRoster?: () => void;
}

/** Creation ends at the same guided invite teachers use next lesson. */
export default function ClassCreatedModal({
  createdClassCode,
  createdClassName,
  onDone,
  onOpenRoster,
}: ClassCreatedModalProps) {
  return createdClassCode ? (
    <ShareClassLinkModal
      open
      justCreated
      onClose={onDone}
      className={createdClassName}
      code={createdClassCode}
      onOpenRoster={onOpenRoster}
    />
  ) : null;
}
