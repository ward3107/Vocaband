/**
 * VocabularyLibraryView — the teacher's personal library of vocabulary
 * sets, organized into nested Collections.
 *
 * Phase 0: library shell.
 * Phase 1: wired into App.tsx routing + dashboard tile.
 * Phase 2: OCR pipeline auto-saves into vocabulary_sets.
 * Phase 3 (current): "+ New Vocabulary Set" launches the SetBuildWizard
 *   modal with 3 working source modes (Manual / Paste / Photo) and
 *   3 visible-but-disabled modes (Upload / AI / Curriculum).
 *
 * Design: matches the rest of the teacher surface — TopAppBar +
 * gradient hero, big motion cards with frosted emoji medallions, RTL-
 * aware via useLanguage().
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookMarked, FolderPlus, Plus, FileText, Folder, Clock, Sparkles, ChevronRight, ChevronLeft, Home, FolderInput } from "lucide-react";
import TopAppBar from "../components/TopAppBar";
import { useLanguage } from "../hooks/useLanguage";
import { vocabularyLibraryT, type VocabularyLibraryStrings } from "../locales/teacher/vocabulary-library";
import { hasTeacherAccess, type AppUser, type ClassData } from "../core/supabase";
import {
  listCollectionChildren,
  listCollections,
  listAllSets,
  listSetsInCollection,
  listRecentSets,
  getCollectionPath,
  createCollection,
  type VocabularyCollection,
  type VocabularySet,
} from "../core/vocabularyLibrary";
import SetBuildWizard from "./library/SetBuildWizard";
import VocabularySetDetailModal from "./library/VocabularySetDetailModal";
import MoveItemModal, { type MovableItem } from "./library/MoveItemModal";

type Tab = "all" | "collections" | "recent";

interface VocabularyLibraryViewProps {
  user: AppUser | null;
  /** The teacher's classes — threaded through to the Set Detail modal
   *  so the "Assign to class" action has a list to render. Optional
   *  because callers that haven't adopted the assign flow still work. */
  classes?: ClassData[];
  onBack: () => void;
  onLogout?: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  /** Optional — when set, the view scopes itself to children of this
   *  collection (rendered as a breadcrumb sub-view). Phase 1 will route
   *  here when the teacher taps into a folder. */
  collectionId?: string | null;
}

export default function VocabularyLibraryView({
  user,
  classes = [],
  onBack,
  onLogout,
  showToast,
  collectionId = null,
}: VocabularyLibraryViewProps) {
  const { language, isRTL, textAlign, dir } = useLanguage();
  const t = useMemo(() => vocabularyLibraryT[language], [language]);

  const [activeTab, setActiveTab] = useState<Tab>("all");
  /** Folder the teacher has drilled into. Null = root view. The `collectionId`
   *  prop is the external entry point (passed when routing directly to a
   *  collection) and behaves the same as a drilled-in state. */
  const [currentCollection, setCurrentCollection] = useState<VocabularyCollection | null>(null);
  /** Breadcrumb chain root → … → currentCollection, fetched lazily via the
   *  get_collection_path RPC. Empty at root. */
  const [breadcrumbPath, setBreadcrumbPath] = useState<Array<{ id: string; name: string }>>([]);
  const [collections, setCollections] = useState<VocabularyCollection[]>([]);
  /** Full flat list of every collection the teacher owns — used by
   *  MoveItemModal so its destination picker doesn't refetch. */
  const [allCollections, setAllCollections] = useState<VocabularyCollection[]>([]);
  const [allSets, setAllSets] = useState<VocabularySet[]>([]);
  const [recent, setRecent] = useState<VocabularySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showBuildWizard, setShowBuildWizard] = useState(false);
  /** When set, opens the VocabularySetDetailModal for this Set. The
   *  detail modal itself nests the SentenceGenerationModal — opening
   *  the detail page is the canonical "I want to do something with this
   *  set" entry point now. */
  const [openedSet, setOpenedSet] = useState<VocabularySet | null>(null);
  /** When set, opens MoveItemModal to reparent a collection or set. */
  const [movingItem, setMovingItem] = useState<MovableItem | null>(null);

  const effectiveCollectionId = currentCollection?.id ?? collectionId;
  const isInsideCollection = effectiveCollectionId != null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (isInsideCollection && effectiveCollectionId) {
        // Scoped to a folder: show direct sub-folders + sets that live
        // here. Recent is hidden at this level so we skip its fetch.
        const [cols, sets, every, path] = await Promise.all([
          listCollectionChildren(effectiveCollectionId),
          listSetsInCollection(effectiveCollectionId),
          listCollections(),
          getCollectionPath(effectiveCollectionId),
        ]);
        setCollections(cols);
        setAllSets(sets);
        setRecent([]);
        setAllCollections(every);
        setBreadcrumbPath(path.map((p) => ({ id: p.id, name: p.name })));
      } else {
        const [cols, sets, recents, every] = await Promise.all([
          listCollectionChildren(null),
          listAllSets(),
          listRecentSets(12),
          listCollections(),
        ]);
        setCollections(cols);
        setAllSets(sets);
        setRecent(recents);
        setAllCollections(every);
        setBreadcrumbPath([]);
      }
    } catch {
      showToast(t.toastError, "error");
    } finally {
      setLoading(false);
    }
  }, [effectiveCollectionId, isInsideCollection, showToast, t.toastError]);

  useEffect(() => {
    if (!hasTeacherAccess(user)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetch effect; same pattern as AdminSecurityView etc.
    void refresh();
  }, [user, refresh]);

  const handleNewCollection = useCallback(async () => {
    if (!user || !hasTeacherAccess(user) || busy) return;
    const name = window.prompt(t.newCollection);
    if (!name || !name.trim()) return;
    setBusy(true);
    try {
      await createCollection({
        teacherUid: user.uid,
        name: name.trim(),
        parentId: effectiveCollectionId,
        shareMode: "private",
      });
      showToast(t.toastCollectionCreated(name.trim()), "success");
      await refresh();
    } catch {
      showToast(t.toastError, "error");
    } finally {
      setBusy(false);
    }
  }, [user, busy, effectiveCollectionId, t, showToast, refresh]);

  const handleNewSet = useCallback(() => {
    if (!user || !hasTeacherAccess(user) || busy) return;
    setShowBuildWizard(true);
  }, [user, busy]);

  const handleWizardSaved = useCallback(() => {
    setShowBuildWizard(false);
    void refresh();
  }, [refresh]);

  /** Drill into a folder. Resets the active tab so a teacher coming
   *  from "Recent" doesn't land on a tab that's hidden inside a folder. */
  const openCollection = useCallback((c: VocabularyCollection) => {
    setCurrentCollection(c);
    setActiveTab("all");
  }, []);

  /** Step one level back up. If we're one level below root, return to
   *  root; otherwise jump to the parent collection (looked up from the
   *  breadcrumb chain). */
  const goBack = useCallback(() => {
    if (breadcrumbPath.length <= 1) {
      setCurrentCollection(null);
      return;
    }
    const parentCrumb = breadcrumbPath[breadcrumbPath.length - 2];
    const parent = allCollections.find((c) => c.id === parentCrumb.id) ?? null;
    setCurrentCollection(parent);
  }, [breadcrumbPath, allCollections]);

  /** Jump to any ancestor via a breadcrumb tap. id=null is the root. */
  const jumpToCrumb = useCallback((id: string | null) => {
    if (id == null) {
      setCurrentCollection(null);
      return;
    }
    const target = allCollections.find((c) => c.id === id) ?? null;
    setCurrentCollection(target);
  }, [allCollections]);

  const handleMoved = useCallback(() => {
    setMovingItem(null);
    void refresh();
  }, [refresh]);

  // Inside a folder the surface shrinks: "sets here" + "sub-folders".
  // Recent is global by definition, so it only makes sense at the root.
  const tabs: Array<{ id: Tab; label: string; icon: ReactNode; count: number }> = isInsideCollection
    ? [
        { id: "all", label: t.tabSetsHere, icon: <FileText className="w-4 h-4" />, count: allSets.length },
        { id: "collections", label: t.tabSubFolders, icon: <Folder className="w-4 h-4" />, count: collections.length },
      ]
    : [
        { id: "all", label: t.tabAllSets, icon: <FileText className="w-4 h-4" />, count: allSets.length },
        { id: "collections", label: t.tabCollections, icon: <Folder className="w-4 h-4" />, count: collections.length },
        { id: "recent", label: t.tabRecent, icon: <Clock className="w-4 h-4" />, count: recent.length },
      ];

  if (!hasTeacherAccess(user)) {
    // Guard: route guard at App.tsx should prevent this, but keep a
    // friendly fallback in case the view is reached directly.
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">{t.toastError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50" dir={dir}>
      <TopAppBar
        title={t.pageTitle}
        subtitle={t.pageSubtitle}
        showBack
        onBack={onBack}
        userName={user.displayName}
        userAvatar={user.avatar}
        onLogout={onLogout}
        showScaleControl
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-24">
        {/* Breadcrumb — visible only when drilled into a folder. Crumbs
        are tappable so the teacher can jump to any ancestor in one tap. */}
        {isInsideCollection && (
          <nav
            aria-label={t.breadcrumbAria}
            className={`mb-3 flex items-center gap-1 text-sm text-slate-600 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <button
              type="button"
              onClick={() => jumpToCrumb(null)}
              className="inline-flex items-center gap-1 font-semibold hover:text-violet-700"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <Home className="w-4 h-4" />
              {t.breadcrumbRoot}
            </button>
            {breadcrumbPath.map((crumb, i) => {
              const isLast = i === breadcrumbPath.length - 1;
              const Sep = isRTL ? ChevronLeft : ChevronRight;
              return (
                <span key={crumb.id} className="inline-flex items-center gap-1">
                  <Sep className="w-4 h-4 text-slate-400" />
                  {isLast ? (
                    <span className="font-bold text-slate-900 truncate max-w-[40vw]">{crumb.name}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => jumpToCrumb(crumb.id)}
                      className="font-semibold hover:text-violet-700 truncate max-w-[30vw]"
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    >
                      {crumb.name}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        {/* Hero strip with the two primary CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-5 sm:p-7 shadow-lg shadow-violet-500/20 text-white ${textAlign}`}
        >
          <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              {currentCollection ? (
                <span className="text-2xl" aria-hidden>{currentCollection.emoji ?? "📁"}</span>
              ) : (
                <BookMarked className="w-7 h-7" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">
                {currentCollection ? currentCollection.name : t.pageTitle}
              </h1>
              <p className="text-sm sm:text-base text-white/85 mt-1">
                {currentCollection?.description || t.pageSubtitle}
              </p>
            </div>
            {isInsideCollection && (
              <button
                type="button"
                onClick={goBack}
                aria-label={t.backToDashboard}
                className="rounded-full bg-white/15 hover:bg-white/25 backdrop-blur p-2 shrink-0"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            )}
          </div>

          <div className={`mt-5 flex flex-col sm:flex-row gap-3 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNewSet}
              disabled={busy}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-violet-700 font-bold py-3 px-5 shadow-sm hover:bg-white/95 disabled:opacity-60"
            >
              <Plus className="w-5 h-5" />
              {t.newSet}
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNewCollection}
              disabled={busy}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 backdrop-blur text-white font-bold py-3 px-5 hover:bg-white/25 disabled:opacity-60"
            >
              <FolderPlus className="w-5 h-5" />
              {t.newCollection}
            </motion.button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label={t.pageTitle}
          className={`mt-6 flex gap-2 overflow-x-auto pb-2 ${isRTL ? "flex-row-reverse" : ""}`}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                {tab.label}
                {!loading && tab.count > 0 && (
                  <span
                    aria-hidden
                    className={`inline-flex items-center justify-center rounded-full text-xs font-bold min-w-[1.25rem] h-5 px-1.5 ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <section className={`mt-6 ${textAlign}`}>
          {loading ? (
            <LoadingGrid />
          ) : activeTab === "all" ? (
            allSets.length === 0 ? (
              <EmptyState
                title={isInsideCollection ? t.emptyCollectionTitle : t.emptyLibraryTitle}
                blurb={isInsideCollection ? t.emptySetsHereBlurb : t.emptyLibraryBlurb}
                isRTL={isRTL}
              />
            ) : (
              <CardGrid>
                {allSets.map((s) => (
                  <SetCard
                    key={s.id}
                    set={s}
                    t={t}
                    onOpen={() => setOpenedSet(s)}
                    onMove={() => setMovingItem({ kind: "set", set: s })}
                  />
                ))}
              </CardGrid>
            )
          ) : activeTab === "collections" ? (
            collections.length === 0 ? (
              <EmptyState
                title={t.emptyCollectionTitle}
                blurb={isInsideCollection ? t.emptySubfoldersBlurb : t.emptyCollectionBlurb}
                isRTL={isRTL}
              />
            ) : (
              <CardGrid>
                {collections.map((c) => (
                  <CollectionCard
                    key={c.id}
                    collection={c}
                    t={t}
                    onOpen={() => openCollection(c)}
                    onMove={() => setMovingItem({ kind: "collection", collection: c })}
                  />
                ))}
              </CardGrid>
            )
          ) : recent.length === 0 ? (
            <EmptyState
              title={t.emptyRecentTitle}
              blurb={t.emptyRecentBlurb}
              isRTL={isRTL}
            />
          ) : (
            <CardGrid>
              {recent.map((s) => (
                <SetCard
                  key={s.id}
                  set={s}
                  t={t}
                  onOpen={() => setOpenedSet(s)}
                  onMove={() => setMovingItem({ kind: "set", set: s })}
                />
              ))}
            </CardGrid>
          )}
        </section>
      </main>

      <AnimatePresence>
        {showBuildWizard && user && hasTeacherAccess(user) && (
          <SetBuildWizard
            key="build-wizard"
            user={user}
            collectionId={effectiveCollectionId}
            onClose={() => setShowBuildWizard(false)}
            onSaved={handleWizardSaved}
            showToast={showToast}
          />
        )}
        {openedSet && user && hasTeacherAccess(user) && (
          <VocabularySetDetailModal
            key={`set-detail-${openedSet.id}`}
            set={openedSet}
            classes={classes}
            onClose={() => setOpenedSet(null)}
            onChanged={() => { void refresh(); }}
            showToast={showToast}
          />
        )}
        {movingItem && (
          <MoveItemModal
            key={`move-${movingItem.kind}-${movingItem.kind === "collection" ? movingItem.collection.id : movingItem.set.id}`}
            item={movingItem}
            allCollections={allCollections}
            t={t}
            onClose={() => setMovingItem(null)}
            onMoved={handleMoved}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ title, blurb, isRTL }: { title: string; blurb: string; isRTL: boolean }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 sm:p-10 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-violet-600" />
      </div>
      <h3 className="mt-4 text-lg sm:text-xl font-bold text-slate-900">{title}</h3>
      <p className={`mt-2 text-sm sm:text-base text-slate-600 max-w-md mx-auto ${isRTL ? "rtl" : ""}`}>
        {blurb}
      </p>
    </div>
  );
}

function SetCard({
  set,
  t,
  onOpen,
  onMove,
}: {
  set: VocabularySet;
  t: VocabularyLibraryStrings;
  onOpen: () => void;
  onMove: () => void;
}) {
  const gradient = set.color ? undefined : "from-fuchsia-500 via-pink-500 to-rose-500";
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="relative rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left cursor-pointer"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <div
          className={`h-20 ${set.color ? "" : `bg-gradient-to-br ${gradient}`} flex items-center justify-center`}
          style={set.color ? { background: set.color } : undefined}
        >
          <span className="text-3xl">{set.emoji ?? "📄"}</span>
        </div>
        <div className="p-4 pe-12">
          <h4 className="font-bold text-slate-900 line-clamp-1">{set.name}</h4>
          <p className="text-xs text-slate-500 mt-1">{t.wordsCount(set.wordCount)}</p>
        </div>
      </button>
      <CardMoveButton onMove={onMove} ariaLabel={t.moveAria} />
    </motion.div>
  );
}

function CollectionCard({
  collection,
  t,
  onOpen,
  onMove,
}: {
  collection: VocabularyCollection;
  t: VocabularyLibraryStrings;
  onOpen: () => void;
  onMove: () => void;
}) {
  const gradient = collection.color ? undefined : "from-amber-400 via-orange-500 to-rose-500";
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="relative rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left cursor-pointer"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <div
          className={`h-20 ${collection.color ? "" : `bg-gradient-to-br ${gradient}`} flex items-center justify-center`}
          style={collection.color ? { background: collection.color } : undefined}
        >
          <span className="text-3xl">{collection.emoji ?? "📁"}</span>
        </div>
        <div className="p-4 pe-12">
          <h4 className="font-bold text-slate-900 line-clamp-1">{collection.name}</h4>
          {collection.description ? (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{collection.description}</p>
          ) : null}
        </div>
      </button>
      <CardMoveButton onMove={onMove} ariaLabel={t.moveAria} />
    </motion.div>
  );
}

/** Small floating "move" button anchored to a card's bottom-right corner.
 *  Sits outside the card's main button so its click doesn't trigger the
 *  drill-in / open-detail action. */
function CardMoveButton({ onMove, ariaLabel }: { onMove: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onMove(); }}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="absolute end-2 bottom-2 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center shadow-sm"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <FolderInput className="w-4 h-4" />
    </button>
  );
}

