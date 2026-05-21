/**
 * VocabularyLibraryView — the teacher's personal library of vocabulary
 * sets, organized into nested Collections.
 *
 * Phase 0 (this PR): library shell.
 *   - Loads collections + sets via core/vocabularyLibrary helpers.
 *   - Three tabs (All Sets / Collections / Recent) with empty states.
 *   - Functional "+ New Collection" / "+ New Set" buttons that create
 *     minimal rows so the schema can be exercised end-to-end.
 *   - No build wizard / extraction yet — that lands in Phase 2.
 *   - Not yet wired into App.tsx routing (follow-up); the view compiles
 *     and is importable so the routing PR is mechanical.
 *
 * Design: matches the rest of the teacher surface — TopAppBar +
 * gradient hero, big motion cards with frosted emoji medallions, RTL-
 * aware via useLanguage().
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { BookMarked, FolderPlus, Plus, FileText, Folder, Clock, Sparkles } from "lucide-react";
import TopAppBar from "../components/TopAppBar";
import { useLanguage } from "../hooks/useLanguage";
import { vocabularyLibraryT, type VocabularyLibraryStrings } from "../locales/teacher/vocabulary-library";
import { hasTeacherAccess, type AppUser } from "../core/supabase";
import {
  listCollectionChildren,
  listAllSets,
  listRecentSets,
  createCollection,
  createSet,
  type VocabularyCollection,
  type VocabularySet,
} from "../core/vocabularyLibrary";

type Tab = "all" | "collections" | "recent";

interface VocabularyLibraryViewProps {
  user: AppUser | null;
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
  onBack,
  onLogout,
  showToast,
  collectionId = null,
}: VocabularyLibraryViewProps) {
  const { language, isRTL, textAlign, dir } = useLanguage();
  const t = useMemo(() => vocabularyLibraryT[language], [language]);

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [collections, setCollections] = useState<VocabularyCollection[]>([]);
  const [allSets, setAllSets] = useState<VocabularySet[]>([]);
  const [recent, setRecent] = useState<VocabularySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cols, sets, recents] = await Promise.all([
        listCollectionChildren(collectionId),
        listAllSets(),
        listRecentSets(12),
      ]);
      setCollections(cols);
      setAllSets(sets);
      setRecent(recents);
    } catch {
      showToast(t.toastError, "error");
    } finally {
      setLoading(false);
    }
  }, [collectionId, showToast, t.toastError]);

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
        parentId: collectionId,
        shareMode: "private",
      });
      showToast(t.toastCollectionCreated(name.trim()), "success");
      await refresh();
    } catch {
      showToast(t.toastError, "error");
    } finally {
      setBusy(false);
    }
  }, [user, busy, collectionId, t, showToast, refresh]);

  const handleNewSet = useCallback(async () => {
    if (!user || !hasTeacherAccess(user) || busy) return;
    const name = window.prompt(t.newSet);
    if (!name || !name.trim()) return;
    setBusy(true);
    try {
      const saved = await createSet({
        teacherUid: user.uid,
        name: name.trim(),
        collectionId,
        sourceType: "manual",
        languagePair: "en-he-ar",
      });
      showToast(t.toastSetSaved(saved.name), "success");
      await refresh();
    } catch {
      showToast(t.toastError, "error");
    } finally {
      setBusy(false);
    }
  }, [user, busy, collectionId, t, showToast, refresh]);

  const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
    { id: "all", label: t.tabAllSets, icon: <FileText className="w-4 h-4" /> },
    { id: "collections", label: t.tabCollections, icon: <Folder className="w-4 h-4" /> },
    { id: "recent", label: t.tabRecent, icon: <Clock className="w-4 h-4" /> },
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-24">
        {/* Hero strip with the two primary CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-5 sm:p-7 shadow-lg shadow-violet-500/20 text-white ${textAlign}`}
        >
          <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <BookMarked className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">{t.pageTitle}</h1>
              <p className="text-sm sm:text-base text-white/85 mt-1">{t.pageSubtitle}</p>
            </div>
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
                title={t.emptyLibraryTitle}
                blurb={t.emptyLibraryBlurb}
                isRTL={isRTL}
              />
            ) : (
              <CardGrid>
                {allSets.map((s) => (
                  <SetCard key={s.id} set={s} t={t} />
                ))}
              </CardGrid>
            )
          ) : activeTab === "collections" ? (
            collections.length === 0 ? (
              <EmptyState
                title={t.emptyCollectionTitle}
                blurb={t.emptyCollectionBlurb}
                isRTL={isRTL}
              />
            ) : (
              <CardGrid>
                {collections.map((c) => (
                  <CollectionCard key={c.id} collection={c} t={t} />
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
                <SetCard key={s.id} set={s} t={t} />
              ))}
            </CardGrid>
          )}
        </section>
      </main>
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

function SetCard({ set, t }: { set: VocabularySet; t: VocabularyLibraryStrings }) {
  const gradient = set.color ? undefined : "from-fuchsia-500 via-pink-500 to-rose-500";
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden cursor-pointer"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <div
        className={`h-20 ${set.color ? "" : `bg-gradient-to-br ${gradient}`} flex items-center justify-center`}
        style={set.color ? { background: set.color } : undefined}
      >
        <span className="text-3xl">{set.emoji ?? "📄"}</span>
      </div>
      <div className="p-4">
        <h4 className="font-bold text-slate-900 line-clamp-1">{set.name}</h4>
        <p className="text-xs text-slate-500 mt-1">{t.wordsCount(set.wordCount)}</p>
      </div>
    </motion.div>
  );
}

function CollectionCard({
  collection,
}: {
  collection: VocabularyCollection;
  t: VocabularyLibraryStrings;
}) {
  const gradient = collection.color ? undefined : "from-amber-400 via-orange-500 to-rose-500";
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden cursor-pointer"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <div
        className={`h-20 ${collection.color ? "" : `bg-gradient-to-br ${gradient}`} flex items-center justify-center`}
        style={collection.color ? { background: collection.color } : undefined}
      >
        <span className="text-3xl">{collection.emoji ?? "📁"}</span>
      </div>
      <div className="p-4">
        <h4 className="font-bold text-slate-900 line-clamp-1">{collection.name}</h4>
        {collection.description ? (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{collection.description}</p>
        ) : null}
      </div>
    </motion.div>
  );
}

