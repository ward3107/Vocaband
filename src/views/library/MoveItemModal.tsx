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
import { motion, AnimatePresence } from "motion/react";
import { X, FolderInput, Loader2, Check, Home } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import {
  updateCollection,
  updateSet,
  type VocabularyCollection,
  type VocabularySet,
} from "../../core/vocabularyLibrary";
import type { VocabularyLibraryStrings } from "../../locales/teacher/vocabulary-library";

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        dir={dir}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={t.moveModalTitle(itemName)}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 240 }}
          className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 py-4 flex items-center justify-between gap-3 text-white shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FolderInput className="w-5 h-5 shrink-0" />
              <span className="font-bold truncate">{t.moveModalTitle(itemName)}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.moveCancel}
              className="p-1.5 -mr-1.5 rounded-full hover:bg-white/15"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 sm:px-6 py-3 border-b border-slate-200 bg-slate-50">
            <p className="text-xs text-slate-600">{t.moveCurrentLocation(currentParentName)}</p>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-2 pb-1">
              {t.movePickFolder}
            </p>

            {/* Root option */}
            <button
              type="button"
              onClick={() => setDestinationId(null)}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`w-full ${isRTL ? "text-right" : "text-left"} rounded-xl border p-3 flex items-center gap-3 transition-all ${
                destinationId === null
                  ? "border-orange-500 bg-orange-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  destinationId === null ? "border-orange-600 bg-orange-600" : "border-slate-300"
                }`}
              >
                {destinationId === null && <Check className="w-3 h-3 text-white" />}
              </span>
              <Home className="w-5 h-5 text-slate-500 shrink-0" />
              <span className="font-semibold text-sm text-slate-900">{t.moveToRoot}</span>
            </button>

            {/* Every other collection */}
            {eligible.map((c) => {
              const active = destinationId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDestinationId(c.id)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`w-full ${isRTL ? "text-right" : "text-left"} rounded-xl border p-3 flex items-center gap-3 transition-all ${
                    active
                      ? "border-orange-500 bg-orange-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      active ? "border-orange-600 bg-orange-600" : "border-slate-300"
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="text-xl shrink-0" aria-hidden>{c.emoji ?? "📁"}</span>
                  <span className="font-semibold text-sm text-slate-900 truncate min-w-0">{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-5 sm:px-6 py-3 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="text-sm font-semibold text-slate-600 hover:underline disabled:opacity-50"
            >
              {t.moveCancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy || destinationId === currentParentId}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 disabled:opacity-50"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderInput className="w-4 h-4" />}
              {t.moveConfirm}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export type { MovableItem };
