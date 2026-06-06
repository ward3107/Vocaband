/**
 * MoveItemModal — moves a Collection or a Set to a different parent folder
 * (or to root). Opened from VocabularyLibraryView's per-card "Move" button.
 *
 * For Collections, the destination tree excludes self + descendants so the
 * teacher can't create a cycle. The DB trigger check_collection_hierarchy
 * is the actual guard; this is just nicer UX so the impossible options
 * don't render.
 */
import { useCallback, useMemo, useState } from "react";
import { FolderInput, Loader2, Check, Home } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import {
  updateCollection,
  updateSet,
  type VocabularyCollection,
  type VocabularySet,
} from "../../core/vocabularyLibrary";
import type { VocabularyLibraryStrings } from "../../locales/teacher/vocabulary-library";
import ModalShell, {
  ModalFootSpacer,
  ModalPrimaryButton,
  ModalQuietButton,
} from "../../components/ui/ModalShell";

type MovableItem =
  | { kind: "collection"; collection: VocabularyCollection }
  | { kind: "set"; set: VocabularySet };

interface MoveItemModalProps {
  item: MovableItem;
  /** Every collection the teacher owns — already loaded by the parent
   *  view so we don't refetch. */
  allCollections: VocabularyCollection[];
  t: VocabularyLibraryStrings;
  onClose: () => void;
  /** Called after a successful move. Parent should refresh. */
  onMoved: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

/** Walk descendants of a collection so we can exclude them as move targets. */
function collectDescendantIds(
  rootId: string,
  all: VocabularyCollection[],
): Set<string> {
  const out = new Set<string>([rootId]);
  // Repeat until no growth — typically <= 5 passes given the 5-level cap.
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of all) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
        out.add(c.id);
        grew = true;
      }
    }
  }
  return out;
}

export default function MoveItemModal({
  item,
  allCollections,
  t,
  onClose,
  onMoved,
  showToast,
}: MoveItemModalProps) {
  const { isRTL, dir } = useLanguage();
  const [destinationId, setDestinationId] = useState<string | null>(
    item.kind === "collection" ? item.collection.parentId : item.set.collectionId,
  );
  const [busy, setBusy] = useState(false);

  const itemName = item.kind === "collection" ? item.collection.name : item.set.name;

  // Block self + descendants so we don't render a guaranteed-rejected target.
  const blockedIds = useMemo(() => {
    if (item.kind !== "collection") return new Set<string>();
    return collectDescendantIds(item.collection.id, allCollections);
  }, [item, allCollections]);

  const eligible = useMemo(
    () => allCollections.filter((c) => !blockedIds.has(c.id)),
    [allCollections, blockedIds],
  );

  const currentParentId = item.kind === "collection" ? item.collection.parentId : item.set.collectionId;
  const currentParentName = useMemo(() => {
    if (currentParentId == null) return t.breadcrumbRoot;
    return allCollections.find((c) => c.id === currentParentId)?.name ?? t.breadcrumbRoot;
  }, [currentParentId, allCollections, t.breadcrumbRoot]);

  const handleConfirm = useCallback(async () => {
    if (busy) return;
    if (destinationId === currentParentId) {
      // Nothing to do.
      onClose();
      return;
    }
    setBusy(true);
    try {
      if (item.kind === "collection") {
        await updateCollection(item.collection.id, { parentId: destinationId });
      } else {
        await updateSet(item.set.id, { collectionId: destinationId });
      }
      showToast(t.toastMoved(itemName), "success");
      onMoved();
    } catch (err) {
      console.warn("[MoveItemModal] move failed:", err);
      // Hierarchy trigger surfaces here for cycle / depth attempts.
      showToast(t.moveCannotIntoSelf, "error");
    } finally {
      setBusy(false);
    }
  }, [busy, destinationId, currentParentId, item, itemName, onClose, onMoved, showToast, t]);

  return (
    <ModalShell
      open
      onClose={onClose}
      variant="brand"
      icon="📁"
      title={t.moveModalTitle(itemName)}
      subtitle={t.moveCurrentLocation(currentParentName)}
      dir={dir}
      closeAriaLabel={t.moveCancel}
      footer={
        <>
          <ModalQuietButton onClick={onClose} disabled={busy}>
            {t.moveCancel}
          </ModalQuietButton>
          <ModalFootSpacer />
          <ModalPrimaryButton
            onClick={handleConfirm}
            disabled={busy || destinationId === currentParentId}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderInput className="w-4 h-4" />}
            {t.moveConfirm}
          </ModalPrimaryButton>
        </>
      }
    >
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em]" style={{ color: 'var(--vb-text-muted)' }}>
        {t.movePickFolder}
      </p>

      <div className="space-y-1.5">
        {/* Root option */}
        <button
          type="button"
          onClick={() => setDestinationId(null)}
          style={{
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent" as never,
            ...(destinationId === null
              ? { borderColor: 'var(--vb-accent)', backgroundColor: 'var(--vb-accent-soft)' }
              : { borderColor: 'var(--vb-border)', backgroundColor: 'var(--vb-surface)' }),
          }}
          className={`w-full ${isRTL ? "text-right" : "text-left"} rounded-2xl border p-3 flex items-center gap-3 transition-all ${
            destinationId === null ? "shadow-sm" : ""
          }`}
        >
          <span
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
            style={destinationId === null ? { borderColor: 'var(--vb-accent)', backgroundColor: 'var(--vb-accent)' } : { borderColor: 'var(--vb-border)' }}
          >
            {destinationId === null && <Check className="w-3 h-3 text-white" />}
          </span>
          <Home className="w-5 h-5 shrink-0" style={{ color: 'var(--vb-text-muted)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--vb-text-primary)' }}>{t.moveToRoot}</span>
        </button>

        {/* Every other collection */}
        {eligible.map((c) => {
          const active = destinationId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setDestinationId(c.id)}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent" as never,
                ...(active
                  ? { borderColor: 'var(--vb-accent)', backgroundColor: 'var(--vb-accent-soft)' }
                  : { borderColor: 'var(--vb-border)', backgroundColor: 'var(--vb-surface)' }),
              }}
              className={`w-full ${isRTL ? "text-right" : "text-left"} rounded-2xl border p-3 flex items-center gap-3 transition-all ${
                active ? "shadow-sm" : ""
              }`}
            >
              <span
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={active ? { borderColor: 'var(--vb-accent)', backgroundColor: 'var(--vb-accent)' } : { borderColor: 'var(--vb-border)' }}
              >
                {active && <Check className="w-3 h-3 text-white" />}
              </span>
              <span className="text-xl shrink-0" aria-hidden>{c.emoji ?? "📁"}</span>
              <span className="font-semibold text-sm truncate min-w-0" style={{ color: 'var(--vb-text-primary)' }}>{c.name}</span>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

export type { MovableItem };
