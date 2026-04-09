import type React from "react";
import {
  Search,
  X,
  Plus,
  Camera,
  Sparkles,
  Loader2,
  CheckCircle2,
  Check,
  QrCode,
  Info,
} from "lucide-react";
import TopAppBar from "../components/TopAppBar";
import { PastePreviewModal } from "../components/PastePreviewModal";
import { ALL_WORDS, type Word } from "../data/vocabulary";
import type { WordAnalysisResult } from "../utils/wordAnalysis";
import { supabase } from "../core/supabase";

interface QuickPlaySession {
  id: string;
  sessionCode: string;
  wordIds: number[];
  words: Word[];
}

interface QuickPlaySetupViewProps {
  user: { displayName?: string; avatar?: string } | null;
  setView: (view: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;

  // State + setters (owned by App.tsx because these cross views)
  quickPlaySearchQuery: string;
  setQuickPlaySearchQuery: (v: string) => void;
  quickPlaySelectedWords: Word[];
  setQuickPlaySelectedWords: React.Dispatch<React.SetStateAction<Word[]>>;
  quickPlayCustomWords: Map<string, { hebrew: string; arabic: string }>;
  setQuickPlayCustomWords: React.Dispatch<
    React.SetStateAction<Map<string, { hebrew: string; arabic: string }>>
  >;
  quickPlayAddingCustom: Set<string>;
  setQuickPlayAddingCustom: React.Dispatch<React.SetStateAction<Set<string>>>;
  quickPlayTranslating: Set<string>;
  quickPlayWordEditorOpen: boolean;
  setQuickPlayWordEditorOpen: (v: boolean) => void;
  quickPlayPreviewAnalysis: WordAnalysisResult | null;
  setQuickPlayPreviewAnalysis: React.Dispatch<
    React.SetStateAction<WordAnalysisResult | null>
  >;
  showQuickPlayPreview: boolean;
  setShowQuickPlayPreview: (v: boolean) => void;
  draggedWord: string | null;
  setDraggedWord: (v: string | null) => void;
  setQuickPlaySessionCode: (v: string | null) => void;
  setQuickPlayActiveSession: (v: QuickPlaySession | null) => void;

  // Derived (memos computed in parent)
  searchTerms: string[];
  searchResults: Map<string, Word[]>;

  // Handlers
  translateWord: (englishWord: string) => Promise<{ hebrew: string; arabic: string } | null>;
  handleAutoTranslate: (term: string) => Promise<void>;
  handleOcrUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleQuickPlayPreviewConfirm: (
    customTranslations?: Map<string, { hebrew: string; arabic: string }>,
    addedSuggestionIds?: Set<number>
  ) => void;
  handleQuickPlayPreviewCancel: () => void;
  uniqueNegativeId: (offset?: number) => number;
  analyzePastedText: (text: string, words: Word[]) => WordAnalysisResult;
}

export default function QuickPlaySetupView({
  user,
  setView,
  showToast,
  quickPlaySearchQuery,
  setQuickPlaySearchQuery,
  quickPlaySelectedWords,
  setQuickPlaySelectedWords,
  quickPlayCustomWords,
  setQuickPlayCustomWords,
  quickPlayAddingCustom,
  setQuickPlayAddingCustom,
  quickPlayTranslating,
  quickPlayWordEditorOpen,
  setQuickPlayWordEditorOpen,
  quickPlayPreviewAnalysis,
  setQuickPlayPreviewAnalysis,
  showQuickPlayPreview,
  setShowQuickPlayPreview,
  draggedWord,
  setDraggedWord,
  setQuickPlaySessionCode,
  setQuickPlayActiveSession,
  searchTerms,
  searchResults,
  translateWord,
  handleAutoTranslate,
  handleOcrUpload,
  handleQuickPlayPreviewConfirm,
  handleQuickPlayPreviewCancel,
  uniqueNegativeId,
  analyzePastedText,
}: QuickPlaySetupViewProps) {
  // Get all found words (flat array) and unmatched terms
  const allFoundWords: Word[] = [];
  searchResults.forEach(matches => allFoundWords.push(...matches));
  // Remove duplicates
  const uniqueFoundWords = Array.from(new Map(allFoundWords.map(w => [w.id, w])).values());

  // Count exact matches (these are auto-added)
  const exactMatchesCount = searchTerms.filter(term =>
    ALL_WORDS.some(w => w.english.toLowerCase() === term)
  ).length;

  const unmatchedTerms = searchTerms.filter(term => !searchResults.has(term));

  return (
    <div className="min-h-screen bg-surface pt-16 sm:pt-24 pb-6 sm:pb-8 px-3 sm:px-4 md:px-6">
      <TopAppBar
        title="Quick Play Setup"
        subtitle="SELECT WORDS • GENERATE QR CODE"
        showBack
        onBack={() => setView("teacher-dashboard")}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => supabase.auth.signOut()}
      />

      <div className="max-w-4xl mx-auto">
        {/* Word Search Section */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg border-2 border-surface-container-highest">
          <h2 className="text-lg sm:text-xl font-black text-on-surface mb-3 sm:mb-4 flex items-center gap-2">
            <Search className="text-primary" size={18} />
            Add Words to Search
          </h2>

          {/* Word Chips Display */}
          {searchTerms.length > 0 ? (
            <div className="mb-4 p-4 bg-surface-container rounded-xl border-2 border-surface-container-highest">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-on-surface">
                  {searchTerms.length} word{searchTerms.length !== 1 ? 's' : ''} added
                </p>
                <button
                  onClick={() => setQuickPlaySearchQuery("")}
                  className="text-xs text-rose-600 font-bold hover:text-rose-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {searchTerms.map(term => (
                  <div
                    key={term}
                    className="group flex items-center gap-2 px-3 py-2 bg-white rounded-full border-2 border-primary/30 hover:border-primary transition-all"
                  >
                    <span className="text-sm font-bold text-on-surface">{term}</span>
                    <button
                      onClick={() => {
                        // Remove this term from search
                        const terms = quickPlaySearchQuery.split(/[,\s\n\t]+/).filter(t => t.trim().toLowerCase() !== term);
                        setQuickPlaySearchQuery(terms.join(", "));
                      }}
                      className="text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              onClick={() => setQuickPlayWordEditorOpen(true)}
              className="mb-3 sm:mb-4 p-6 sm:p-8 bg-surface-container rounded-xl border-2 border-dashed border-surface-container-highest text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Search className="mx-auto text-on-surface-variant mb-2" size={24} />
              <p className="text-sm font-bold text-on-surface-variant mb-1">Click to add words</p>
              <p className="text-xs text-on-surface-variant">Paste: apple, "ice cream", house</p>
            </div>
          )}

          {/* Add More Words Button */}
          {searchTerms.length > 0 && (
            <button
              onClick={() => setQuickPlayWordEditorOpen(true)}
              className="w-full py-2.5 sm:py-3 bg-white border-2 border-dashed border-surface-container-highest rounded-xl text-sm font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 mb-3 sm:mb-4"
            >
              <Plus size={14} />
              Add More Words
            </button>
          )}

          {/* OCR Upload Button */}
          <div className="mb-4 relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleOcrUpload}
              disabled={true}
              className="hidden"
              id="quick-play-ocr-upload"
            />
            <button
              onClick={() => showToast("OCR scanning is a Pro feature. Coming soon!", "info")}
              disabled={false}
              className="w-full py-2.5 sm:py-3 bg-stone-200 text-stone-500 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-not-allowed relative overflow-hidden"
            >
              <Camera size={14} />
              <span className="text-xs sm:text-sm">Upload Image to Extract Words</span>
              <span className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">PRO</span>
            </button>
            <p className="text-xs text-center text-on-surface-variant mt-1">OCR word scanning — available in Pro plan</p>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-on-surface-variant">
              {quickPlaySearchQuery ? (
                <>
                  {searchTerms.length} search term{searchTerms.length !== 1 ? 's' : ''} •
                  <span className="font-bold text-green-600 ml-1">{exactMatchesCount} exact match{exactMatchesCount !== 1 ? 'es' : ''} auto-added ✓</span>
                  {uniqueFoundWords.length > exactMatchesCount && (
                    <span className="font-bold text-blue-600 ml-2">• {uniqueFoundWords.length - exactMatchesCount} more found</span>
                  )}
                  {unmatchedTerms.length > 0 && (
                    <span className="font-bold text-amber-600 ml-2">• {unmatchedTerms.length} need AI translation</span>
                  )}
                </>
              ) : (
                <>Paste or type words to search from {ALL_WORDS.length}+ words</>
              )}
            </p>
            <div className="flex gap-2">
              {quickPlaySearchQuery && (
                <button
                  onClick={() => setQuickPlaySearchQuery("")}
                  className="text-sm text-rose-600 font-bold hover:text-rose-700 transition-colors"
                >
                  Clear
                </button>
              )}
              {unmatchedTerms.length > 0 && (
                <button
                  onClick={async () => {
                    // Auto-translate and add all unmatched terms
                    let customWordsToAdd: Word[] = [];

                    if (unmatchedTerms.length > 0) {
                      for (const term of unmatchedTerms) {
                        if (!quickPlayCustomWords.has(term)) {
                          const translation = await translateWord(term);
                          if (translation) {
                            const newMap = new Map(quickPlayCustomWords);
                            newMap.set(term, translation);
                            setQuickPlayCustomWords(newMap);
                          }
                        }
                      }

                      // Add all translated custom words
                      quickPlayCustomWords.forEach((data, term) => {
                        if (data.hebrew || data.arabic) {
                          customWordsToAdd.push({
                            id: uniqueNegativeId() - customWordsToAdd.length,
                            english: term.charAt(0).toUpperCase() + term.slice(1).toLowerCase(),
                            hebrew: data.hebrew || "",
                            arabic: data.arabic || "",
                            level: "Custom"
                          });
                        }
                      });
                    }

                    // Add only custom translated words (found words are already auto-added)
                    setQuickPlaySelectedWords(prev => [...prev, ...customWordsToAdd]);

                    // Clear custom words state
                    setQuickPlayCustomWords(new Map());
                    setQuickPlayAddingCustom(new Set());

                    // Clear search
                    setQuickPlaySearchQuery("");

                    showToast(`Added ${customWordsToAdd.length} translated word${customWordsToAdd.length !== 1 ? 's' : ''}!`, "success");
                  }}
                  disabled={quickPlayTranslating.size > 0}
                  className="text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-1 shadow-lg disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  Add Translated Words ({unmatchedTerms.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Add All & Generate QR Button */}
        {(uniqueFoundWords.length > 0 || unmatchedTerms.length > 0) && quickPlaySelectedWords.length === 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-xl text-white">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-black mb-1">Quick Start!</h3>
                <p className="text-white/80 text-xs sm:text-sm">
                  {exactMatchesCount > 0 && `${exactMatchesCount} exact match${exactMatchesCount > 1 ? 'es' : ''} ready`}
                  {exactMatchesCount > 0 && uniqueFoundWords.length > exactMatchesCount && ` + ${uniqueFoundWords.length - exactMatchesCount} more found`}
                  {unmatchedTerms.length > 0 && ` + ${unmatchedTerms.length} custom word${unmatchedTerms.length > 1 ? 's' : ''} to translate`}
                </p>
              </div>
              <button
                onClick={async () => {
                  // Add all found database words
                  const allDbWordsToAdd = uniqueFoundWords.filter(w => !quickPlaySelectedWords.some(sw => sw.id === w.id));
                  setQuickPlaySelectedWords(prev => [...prev, ...allDbWordsToAdd]);

                  // Translate and add all unmatched terms
                  let customWordsToAdd: Word[] = [];

                  if (unmatchedTerms.length > 0) {
                    showToast("Translating custom words...", "info");

                    for (const term of unmatchedTerms) {
                      const translation = await translateWord(term);
                      if (translation) {
                        customWordsToAdd.push({
                          id: uniqueNegativeId() - customWordsToAdd.length,
                          english: term.charAt(0).toUpperCase() + term.slice(1).toLowerCase(),
                          hebrew: translation.hebrew,
                          arabic: translation.arabic,
                          level: "Custom"
                        });
                      }
                    }

                    setQuickPlaySelectedWords(prev => [...prev, ...customWordsToAdd]);
                  }

                  // Wait for state to update, then generate QR
                  setTimeout(async () => {
                    const updatedSelection = [...allDbWordsToAdd, ...customWordsToAdd];
                    const dbWords = updatedSelection.filter(w => w.id >= 0);
                    const customWords = updatedSelection.filter(w => w.id < 0);
                    const wordIds = dbWords.map(w => w.id);

                    const customWordsJson = customWords.length > 0 ? JSON.stringify(customWords.map(w => ({
                      english: w.english,
                      hebrew: w.hebrew,
                      arabic: w.arabic,
                    }))) : null;

                    const { data, error } = await supabase.rpc('create_quick_play_session', {
                      p_word_ids: wordIds.length > 0 ? wordIds : null,
                      p_custom_words: customWordsJson
                    });

                    if (error) {
                      showToast("Failed to create session: " + error.message, "error");
                      return;
                    }

                    const session = data as { id: string, session_code: string };
                    setQuickPlaySessionCode(session.session_code);
                    const newSession = {
                      id: session.id,
                      sessionCode: session.session_code,
                      wordIds: wordIds,
                      words: updatedSelection
                    };
                    setQuickPlayActiveSession(newSession);
                    try { localStorage.setItem('vocaband_quick_play_session', JSON.stringify({ id: session.id, words: updatedSelection })); } catch {}
                    setQuickPlaySearchQuery("");
                    setView("quick-play-teacher-monitor");
                  }, 500);
                }}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-green-600 rounded-xl font-black hover:bg-white/90 transition-all shadow-lg flex items-center gap-1.5 sm:gap-2"
              >
                <QrCode size={16} />
                <span className="text-sm sm:text-base">Add All & Generate QR</span>
              </button>
            </div>
          </div>
        )}

        {/* Unmatched Terms - Add as Custom Words */}
        {unmatchedTerms.length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-purple-50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border-2 border-amber-200">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <Sparkles className="text-purple-600 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <h3 className="font-black text-amber-900 mb-0.5 sm:mb-1 text-sm sm:text-base">Custom Words Found</h3>
                  <p className="text-xs sm:text-sm text-amber-700">AI will translate these automatically! Click the green "Add All & Generate QR" button above to add everything at once.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
              {unmatchedTerms.map(term => {
                const isAdding = quickPlayAddingCustom.has(term);
                const customData = quickPlayCustomWords.get(term);

                if (isAdding) {
                  return (
                    <div key={term} className="bg-white rounded-xl p-2 sm:p-3 border-2 border-amber-300">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="font-black text-on-surface text-sm sm:text-base">"{term}"</span>
                          <span className="text-[10px] sm:text-xs text-on-surface-variant">Add translations:</span>
                        </div>
                        {!quickPlayTranslating.has(term) && (
                          <button
                            onClick={() => handleAutoTranslate(term)}
                            className="text-[10px] sm:text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold hover:opacity-90 transition-all flex items-center gap-0.5 sm:gap-1"
                          >
                            <Sparkles size={10} />
                            <span className="hidden sm:inline">Auto-translate with AI</span>
                            <span className="sm:hidden">Translate</span>
                          </button>
                        )}
                      </div>
                      {quickPlayTranslating.has(term) && (
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 text-purple-600">
                          <Loader2 className="animate-spin" size={14} />
                          <span className="text-[10px] sm:text-xs font-bold">AI is translating...</span>
                        </div>
                      )}
                      <div className="flex gap-1.5 sm:gap-2">
                        <input
                          type="text"
                          placeholder="Hebrew translation..."
                          value={customData?.hebrew || ""}
                          onChange={(e) => {
                            const newMap = new Map(quickPlayCustomWords);
                            newMap.set(term, { hebrew: e.target.value, arabic: customData?.arabic || "" });
                            setQuickPlayCustomWords(newMap);
                          }}
                          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-surface-container border-2 border-surface-container-highest rounded-lg text-xs sm:text-sm font-bold focus:border-primary focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Arabic translation..."
                          value={customData?.arabic || ""}
                          onChange={(e) => {
                            const newMap = new Map(quickPlayCustomWords);
                            newMap.set(term, { hebrew: customData?.hebrew || "", arabic: e.target.value });
                            setQuickPlayCustomWords(newMap);
                          }}
                          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-surface-container border-2 border-surface-container-highest rounded-lg text-xs sm:text-sm font-bold focus:border-primary focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const data = quickPlayCustomWords.get(term);
                            if (!data) return;

                            // Create custom word with negative ID
                            const customWord: Word = {
                              id: uniqueNegativeId(),
                              english: term.charAt(0).toUpperCase() + term.slice(1).toLowerCase(),
                              hebrew: data.hebrew || "",
                              arabic: data.arabic || "",
                              level: "Custom"
                            };

                            setQuickPlaySelectedWords(prev => [...prev, customWord]);

                            // Clear and close
                            const newMap = new Map(quickPlayCustomWords);
                            newMap.delete(term);
                            setQuickPlayCustomWords(newMap);

                            const newAdding = new Set(quickPlayAddingCustom);
                            newAdding.delete(term);
                            setQuickPlayAddingCustom(newAdding);
                          }}
                          disabled={!customData?.hebrew && !customData?.arabic}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg font-bold text-xs sm:text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✓ Add
                        </button>
                        <button
                          onClick={() => {
                            const newMap = new Map(quickPlayCustomWords);
                            newMap.delete(term);
                            setQuickPlayCustomWords(newMap);

                            const newAdding = new Set(quickPlayAddingCustom);
                            newAdding.delete(term);
                            setQuickPlayAddingCustom(newAdding);
                          }}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-surface-container text-on-surface rounded-lg font-bold text-xs sm:text-sm hover:bg-surface-container-highest transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                }

                const isAdded = quickPlaySelectedWords.some(w => w.english.toLowerCase() === term.toLowerCase());

                return (
                  <div key={term} className={`flex items-center gap-1.5 sm:gap-2 ${isAdded ? 'opacity-50' : ''}`}>
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white rounded-full text-xs sm:text-sm font-bold text-on-surface border-2 border-amber-300">
                      "{term}"
                    </span>
                    {isAdded ? (
                      <span className="text-[10px] sm:text-xs text-green-600 font-bold">✓ Added</span>
                    ) : (
                      <button
                        onClick={() => {
                          const newAdding = new Set(quickPlayAddingCustom);
                          newAdding.add(term);
                          setQuickPlayAddingCustom(newAdding);
                          // Auto-translate on open
                          handleAutoTranslate(term);
                        }}
                        className="text-[10px] sm:text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold hover:opacity-90 transition-all flex items-center gap-0.5 sm:gap-1"
                      >
                        <Sparkles size={8} />
                        <span className="hidden sm:inline">Translate & Add</span>
                        <span className="sm:hidden">Translate</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Word Selection Grid */}
        {allFoundWords.length > 0 && (
          <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg border-2 border-surface-container-highest">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-black text-on-surface flex items-center gap-1.5 sm:gap-2">
                <CheckCircle2 className="text-green-600" size={16} />
                <span className="text-base sm:text-lg">Select Words ({quickPlaySelectedWords.length} selected)</span>
              </h2>
              <div className="flex gap-1.5 sm:gap-2">
                {allFoundWords.length > 0 && quickPlaySelectedWords.length < allFoundWords.length && (
                  <button
                    onClick={() => setQuickPlaySelectedWords(allFoundWords)}
                    className="text-sm text-primary font-bold hover:text-primary/80 transition-colors"
                  >
                    Select All
                  </button>
                )}
                {quickPlaySelectedWords.length > 0 && (
                  <button
                    onClick={() => setQuickPlaySelectedWords([])}
                    className="text-sm text-rose-600 font-bold hover:text-rose-700 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Group results by search term */}
            {searchTerms.length > 0 && (
              <div className="space-y-2 sm:space-y-4 max-h-72 sm:max-h-96 overflow-y-auto">
                {searchTerms
                  .filter(term => searchResults.has(term))
                  .map(term => {
                    const matches = searchResults.get(term)!;
                    const allSelected = matches.every(w => quickPlaySelectedWords.some(sw => sw.id === w.id));
                    const someSelected = matches.some(w => quickPlaySelectedWords.some(sw => sw.id === w.id));

                    return (
                      <div key={term} className="bg-surface-container rounded-xl p-3 sm:p-4 border-2 border-surface-container-highest">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <h3 className="font-black text-on-surface text-sm sm:text-base">
                            "{term}" • {matches.length} word{matches.length !== 1 ? 's' : ''}
                          </h3>
                          <button
                            onClick={() => {
                              if (allSelected) {
                                // Deselect all in this group
                                const wordIds = new Set(matches.map(w => w.id));
                                setQuickPlaySelectedWords(prev => prev.filter(w => !wordIds.has(w.id)));
                              } else {
                                // Select all in this group
                                const newWords = matches.filter(w => !quickPlaySelectedWords.some(sw => sw.id === w.id));
                                setQuickPlaySelectedWords(prev => [...prev, ...newWords]);
                              }
                            }}
                            className={`text-[10px] sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg font-bold transition-colors ${
                              allSelected
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            {allSelected ? "Deselect All" : someSelected ? "Select Remaining" : "Select All"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                          {matches.map(word => {
                            const isSelected = quickPlaySelectedWords.some(w => w.id === word.id);
                            return (
                              <button
                                key={word.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setQuickPlaySelectedWords(prev => prev.filter(w => w.id !== word.id));
                                  } else {
                                    setQuickPlaySelectedWords(prev => [...prev, word]);
                                  }
                                }}
                                className={`p-2 sm:p-3 rounded-lg border transition-all text-left ${
                                  isSelected
                                    ? "bg-primary-container border-primary text-on-primary-container"
                                    : "bg-surface border-surface-container-highest hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-black text-xs sm:text-sm ${isSelected ? "text-on-primary-container" : "text-on-surface"}`}>
                                      {word.english}
                                    </p>
                                    <p className={`text-[10px] sm:text-xs truncate ${isSelected ? "text-on-primary-container/80" : "text-on-surface-variant"}`}>
                                      {word.hebrew} / {word.arabic}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <Check className="text-primary flex-shrink-0" size={14} />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Custom Words Section */}
        {quickPlaySelectedWords.filter(w => w.id < 0).length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg border-2 border-amber-200">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-black text-amber-900 flex items-center gap-1.5 sm:gap-2">
                <Sparkles className="text-amber-600" size={16} />
                <span className="text-base sm:text-lg">Custom Words ({quickPlaySelectedWords.filter(w => w.id < 0).length})</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              {quickPlaySelectedWords.filter(w => w.id < 0).map(word => {
                const isSelected = quickPlaySelectedWords.some(w2 => w2.id === word.id);
                return (
                  <div
                    key={word.id}
                    className={`p-2 sm:p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-amber-100 border-amber-400 text-amber-900"
                        : "bg-white border-amber-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-xs sm:text-sm">{word.english}</p>
                        <p className="text-[10px] sm:text-xs truncate opacity-80">
                          {word.hebrew || "No Hebrew"} / {word.arabic || "No Arabic"}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setQuickPlaySelectedWords(prev => prev.filter(w2 => w2.id !== word.id));
                        }}
                        className="flex-shrink-0 text-rose-600 hover:text-rose-800"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Generate QR Code Button */}
        {quickPlaySelectedWords.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 sm:p-6 shadow-xl text-white">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-black mb-1">Ready to Start!</h3>
                <p className="text-white/80 text-xs sm:text-sm">
                  {quickPlaySelectedWords.length} word{quickPlaySelectedWords.length > 1 ? 's' : ''} selected
                </p>
              </div>
              <button
                onClick={async () => {
                  // Separate custom words (negative IDs) from database words
                  const dbWords = quickPlaySelectedWords.filter(w => w.id >= 0);
                  const customWords = quickPlaySelectedWords.filter(w => w.id < 0);
                  const wordIds = dbWords.map(w => w.id);

                  // Only create session if we have database words OR we have custom words
                  if (dbWords.length === 0 && customWords.length === 0) {
                    showToast("Please select at least one word", "error");
                    return;
                  }

                  // Prepare custom words for database (convert to JSON)
                  const customWordsJson = customWords.length > 0 ? JSON.stringify(customWords.map(w => ({
                    english: w.english,
                    hebrew: w.hebrew,
                    arabic: w.arabic,
                  }))) : null;

                  // Close preview modal if open
                  setShowQuickPlayPreview(false);
                  setQuickPlayPreviewAnalysis(null);

                  // Create session with database words AND custom words
                  const { data, error } = await supabase.rpc('create_quick_play_session', {
                    p_word_ids: wordIds.length > 0 ? wordIds : null,
                    p_custom_words: customWordsJson
                  });

                  if (error) {
                    showToast("Failed to create session: " + error.message, "error");
                    return;
                  }

                  const session = data as { id: string, session_code: string };
                  setQuickPlaySessionCode(session.session_code);
                  const newSession = {
                    id: session.id,
                    sessionCode: session.session_code,
                    wordIds: wordIds,
                    words: quickPlaySelectedWords
                  };
                  setQuickPlayActiveSession(newSession);
                  try { localStorage.setItem('vocaband_quick_play_session', JSON.stringify({ id: session.id, words: quickPlaySelectedWords })); } catch {}
                  setView("quick-play-teacher-monitor");
                }}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-indigo-600 rounded-xl font-black hover:bg-white/90 transition-all shadow-lg flex items-center gap-1.5 sm:gap-2"
              >
                <QrCode size={16} />
                <span className="text-sm sm:text-base">Generate QR Code</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Word Editor Modal */}
      {quickPlayWordEditorOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-surface-container-highest">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black text-on-surface flex items-center gap-1.5 sm:gap-2">
                  <Search className="text-primary" size={16} />
                  <span className="text-base sm:text-lg">Add Your Words</span>
                </h2>
                <button
                  onClick={() => setQuickPlayWordEditorOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 sm:mt-2">
                Type or paste words below. Use <span className="font-bold">commas</span> to separate words, or put each word on a <span className="font-bold">new line</span>.
              </p>
            </div>

            {/* Textarea */}
            <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
              <textarea
                placeholder='Examples:&#10;apple, ice cream, house, book&#10;&#10;Or each word on a new line:&#10;apple&#10;ice cream&#10;house&#10;book&#10;&#10;Use commas or newlines to separate!'
                value={quickPlaySearchQuery}
                onChange={(e) => setQuickPlaySearchQuery(e.target.value)}
                className="w-full h-20 sm:h-24 px-3 sm:px-4 py-2 sm:py-3 bg-surface-container border-2 border-surface-container-highest text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium resize-none text-sm sm:text-base"
                autoFocus
              />

              {/* Word Preview */}
              {searchTerms.length > 0 && (
                <div className="mt-3 sm:mt-4">
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <p className="text-xs sm:text-sm font-bold text-on-surface">
                      {searchTerms.length} word{searchTerms.length !== 1 ? 's' : ''} detected
                    </p>
                    <button
                      onClick={() => setQuickPlaySearchQuery("")}
                      className="text-[10px] sm:text-xs text-rose-600 font-bold hover:text-rose-700 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-40 sm:max-h-48 overflow-y-auto">
                    {searchTerms.map(term => (
                      <div
                        key={term}
                        draggable
                        onDragStart={() => setDraggedWord(term)}
                        onDragEnd={() => setDraggedWord(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedWord && draggedWord !== term) {
                            // Merge words: draggedWord + " " + term
                            const mergedPhrase = `${draggedWord} ${term}`;
                            const terms = quickPlaySearchQuery.split(/[,\n]+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0 && t !== draggedWord && t !== term);
                            terms.push(mergedPhrase);
                            setQuickPlaySearchQuery(terms.join(", "));
                            setDraggedWord(null);
                          }
                        }}
                        className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white rounded-full border transition-all cursor-move
                          ${draggedWord === term ? 'opacity-50' : ''}
                          ${draggedWord && draggedWord !== term ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-surface-container-highest hover:border-rose-300'}
                        `}
                        title={draggedWord && draggedWord !== term ? `Drop "${draggedWord}" here to make "${draggedWord} ${term}"` : term}
                      >
                        <span className="text-xs sm:text-sm font-bold text-on-surface">{term}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Remove this term by splitting and filtering
                            const terms = quickPlaySearchQuery.split(/[,\n]+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0 && t !== term);
                            setQuickPlaySearchQuery(terms.join(", "));
                          }}
                          className="text-rose-400 hover:text-rose-600 transition-opacity"
                          aria-label={`Remove ${term}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {searchTerms.length > 1 && (
                    <p className="text-[10px] sm:text-xs text-on-surface-variant mt-1.5 sm:mt-2 flex items-center gap-0.5 sm:gap-1">
                      <Info size={10} />
                      <span className="hidden sm:inline">Tip: Drag one word onto another to combine them into a phrase!</span>
                      <span className="sm:hidden">Drag words together to make phrases!</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-surface-container-highest flex items-center justify-between gap-2">
              <button
                onClick={() => setQuickPlayWordEditorOpen(false)}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-surface-container text-on-surface rounded-xl font-bold hover:bg-surface-container-highest transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!quickPlaySearchQuery.trim()) return;
                    // Analyze pasted words with the same engine used in assignments
                    const analysis = analyzePastedText(quickPlaySearchQuery, ALL_WORDS);
                    setQuickPlayPreviewAnalysis(analysis as any);
                    setShowQuickPlayPreview(true);
                    setQuickPlayWordEditorOpen(false);
                  }}
                  disabled={!quickPlaySearchQuery.trim()}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg text-sm sm:text-base disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  Analyze & Preview
                </button>
                <button
                  onClick={() => {
                    setQuickPlayWordEditorOpen(false);
                  }}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg text-sm sm:text-base"
                >
                  <CheckCircle2 size={14} />
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paste Preview Modal for Quick Play */}
      {showQuickPlayPreview && quickPlayPreviewAnalysis && (
        <PastePreviewModal
          analysis={quickPlayPreviewAnalysis}
          onConfirm={handleQuickPlayPreviewConfirm}
          onCancel={handleQuickPlayPreviewCancel}
          onQuickSave={(customTranslations, addedSuggestionIds) => {
            // Quick Save - skip going to editor, go straight to QR generation
            handleQuickPlayPreviewConfirm(customTranslations, addedSuggestionIds);
          }}
          onRemoveMatched={(wordId) => {
            // Remove matched word from preview
            if (quickPlayPreviewAnalysis) {
              const updatedAnalysis = {
                ...quickPlayPreviewAnalysis,
                matchedWords: quickPlayPreviewAnalysis.matchedWords.filter((mw: any) => mw.word.id !== wordId),
                stats: {
                  ...quickPlayPreviewAnalysis.stats,
                  matchedCount: quickPlayPreviewAnalysis.stats.matchedCount - 1,
                  totalTerms: quickPlayPreviewAnalysis.stats.totalTerms - 1,
                },
              };
              setQuickPlayPreviewAnalysis(updatedAnalysis);
            }
          }}
          onRemoveUnmatched={(term) => {
            // Remove unmatched term from preview
            if (quickPlayPreviewAnalysis) {
              const updatedAnalysis = {
                ...quickPlayPreviewAnalysis,
                unmatchedTerms: quickPlayPreviewAnalysis.unmatchedTerms.filter(t => t.term !== term),
                stats: {
                  ...quickPlayPreviewAnalysis.stats,
                  unmatchedCount: quickPlayPreviewAnalysis.stats.unmatchedCount - 1,
                  totalTerms: quickPlayPreviewAnalysis.stats.totalTerms - 1,
                },
              };
              setQuickPlayPreviewAnalysis(updatedAnalysis);
            }
          }}
        />
      )}
    </div>
  );
}
