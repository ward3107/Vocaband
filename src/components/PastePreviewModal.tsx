/**
 * Paste Preview Modal
 * Shows analysis results before committing to editor
 * Displays matched words, unmatched terms, and statistics
 * Now with inline translation editing and remove functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import { Check, X, AlertCircle, FileText, Filter, Zap, Edit3, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { WordMatch, PastedTerm, WordAnalysisResult } from '../utils/wordAnalysis';
import { applyCorrections, loadCorrectionsForWords, saveCorrection } from '../utils/translationCorrections';
import type { TranslationCorrection } from '../utils/translationCorrections';
import { useTranslate } from '../hooks/useTranslate';
import { useLanguage } from '../hooks/useLanguage';
import { pastePreviewT } from '../locales/teacher/paste-preview';

interface PastePreviewModalProps {
  analysis: WordAnalysisResult | null;
  onConfirm: (customTranslations?: Map<string, { hebrew: string; arabic: string }>, addedFamilyWordIds?: Set<number>) => void;
  onCancel: () => void;
  onToggleWord?: (term: string) => void; // For adding/removing from selection
  onRemoveUnmatched?: (term: string) => void; // For removing unmatched terms
  onRemoveMatched?: (wordId: number) => void; // For removing matched words
  onQuickSave?: (customTranslations: Map<string, { hebrew: string; arabic: string }>, addedFamilyWordIds?: Set<number>) => void; // For quick save without editor
}

export const PastePreviewModal: React.FC<PastePreviewModalProps> = ({
  analysis,
  onConfirm,
  onCancel,
  onToggleWord,
  onRemoveUnmatched,
  onRemoveMatched,
  onQuickSave,
}) => {
  const { language, dir } = useLanguage();
  const t = pastePreviewT[language];
  const [corrections, setCorrections] = useState<Map<number, TranslationCorrection>>(new Map());
  const [inlineEdits, setInlineEdits] = useState<Map<number, { hebrew: string; arabic: string }>>(new Map());
  const [editingWordId, setEditingWordId] = useState<number | null>(null);
  const [isLoadingCorrections, setIsLoadingCorrections] = useState(false);

  // State for custom word translations
  const [customWordTranslations, setCustomWordTranslations] = useState<Map<string, { hebrew: string; arabic: string }>>(new Map());
  const [isTranslating, setIsTranslating] = useState(false);

  // Track manually added suggestion word IDs (fuzzy, starts-with matches)
  const [addedSuggestionIds, setAddedSuggestionIds] = useState<Set<number>>(new Set());

  // Gemini-backed batch translator — single round-trip for the whole
  // unmatched list. Replaces the per-word mymemory.translated.net
  // pair of calls that used to double-charge Set-1 idioms (e.g.
  // "in a hurry" returned machine-literal glosses) and sometimes
  // rate-limited mid-paste.  useTranslate owns its own in-memory
  // cache, so the ref-based cache is no longer needed.
  const { translateWordsBatch } = useTranslate();

  // Translate all custom words at once
  const handleTranslateAll = async () => {
    if (!analysis) return;

    setIsTranslating(true);
    const translations = new Map(customWordTranslations);

    const targets = unmatchedTerms
      .filter(term => {
        const existing = translations.get(term.term);
        return !existing || !existing.hebrew || !existing.arabic;
      })
      .map(t => t.term);

    if (targets.length > 0) {
      const batch = await translateWordsBatch(targets);
      for (const term of unmatchedTerms) {
        const entry = batch.get(term.term.toLowerCase().trim());
        if (entry && (entry.hebrew || entry.arabic)) {
          translations.set(term.term, { hebrew: entry.hebrew, arabic: entry.arabic });
        }
      }
    }

    setCustomWordTranslations(translations);
    setIsTranslating(false);
  };

  // Load corrections when modal opens
  useEffect(() => {
    if (analysis && analysis.matchedWords.length > 0) {
      setIsLoadingCorrections(true);
      loadCorrectionsForWords(analysis.matchedWords.map(mw => mw.word))
        .then(setCorrections)
        .finally(() => setIsLoadingCorrections(false));
    }
  }, [analysis]);

  if (!analysis) return null;

  const { matchedWords, unmatchedTerms, stats } = analysis;

  const handleSaveCorrection = async (wordId: number) => {
    const edit = inlineEdits.get(wordId);
    if (!edit) return;

    // Find the word to get its English text
    const matchedWord = analysis?.matchedWords.find(mw => mw.word.id === wordId);
    if (!matchedWord) return;

    // Save to backend
    await saveCorrection({
      wordId,
      english: matchedWord.word.english,
      hebrew: edit.hebrew || undefined,
      arabic: edit.arabic || undefined,
    });

    // Reload corrections after saving
    if (analysis && analysis.matchedWords.length > 0) {
      loadCorrectionsForWords(analysis.matchedWords.map(mw => mw.word))
        .then(setCorrections);
    }

    // Clear the inline edit
    setInlineEdits(prev => {
      const updated = new Map(prev);
      updated.delete(wordId);
      return updated;
    });

    setEditingWordId(null);
  };

  const handleConfirm = () => {
    onConfirm(customWordTranslations);
  };

  const handleQuickSave = () => {
    if (onQuickSave) {
      onQuickSave(customWordTranslations, addedSuggestionIds);
    } else {
      onConfirm(customWordTranslations, addedSuggestionIds);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-surface rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" dir={dir}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <FileText size={24} />
              {t.pasteAnalysisHeading}
            </h2>
          </div>

          {/* Stats Bar */}
          <div className="bg-surface-container-low px-6 py-3 border-b border-surface-container-highest flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <span className="font-bold text-on-surface">{t.statTotal}</span>
              <span className="font-black text-primary">{stats.totalTerms}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-on-surface">{t.statMatched}</span>
              <span className="font-black text-green-600">{stats.matchedCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-on-surface">{t.statNew}</span>
              <span className="font-black text-orange-600">{stats.unmatchedCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-on-surface">{t.statFiltered}</span>
              <span className="font-black text-gray-500">{stats.stopWordCount}</span>
            </div>
            {stats.duplicateCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-bold text-on-surface">Duplicates:</span>
                <span className="font-black text-amber-600">{stats.duplicateCount}</span>
              </div>
            )}
            {(stats as any).fuzzyMatchCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-bold text-on-surface">{t.statFuzzy}</span>
                <span className="font-black text-purple-600">{(stats as any).fuzzyMatchCount}</span>
              </div>
            )}
            {((stats as any).hebrewMatchCount > 0 || (stats as any).arabicMatchCount > 0) && (
              <div className="flex items-center gap-1">
                <span className="font-bold text-on-surface">{t.statHebAr}</span>
                <span className="font-black text-blue-600">{((stats as any).hebrewMatchCount || 0) + ((stats as any).arabicMatchCount || 0)}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Matched Words — split into auto-added and suggestions */}
            {matchedWords.length > 0 && (() => {
              const autoAddTypes = new Set(['exact', 'hebrew', 'arabic', 'phrase']);
              const autoAdded = matchedWords.filter(mw => autoAddTypes.has(mw.matchType));
              const suggestions = matchedWords.filter(mw => !autoAddTypes.has(mw.matchType));

              return (
              <>
              {/* Auto-added exact matches */}
              {autoAdded.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-2 flex items-center gap-2">
                  <Check className="text-green-600" size={16} />
                  {t.addedWordsHeading(autoAdded.length)}
                </h3>
                <div className="space-y-2">
                  {autoAdded.map((mw, index) => {
                    const corrected = applyCorrections(mw.word, corrections);
                    const isEditing = editingWordId === mw.word.id;
                    const inlineEdit = inlineEdits.get(mw.word.id);

                    return (
                      <div
                        key={`${mw.word.id}-${index}`}
                        className={`p-3 rounded-xl border-2 transition-all flex gap-3 ${
                          corrected.isCorrected
                            ? 'bg-indigo-50 border-indigo-200'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <span className="text-xs font-black text-stone-400 w-5 pt-1 shrink-0">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-on-surface text-sm">{corrected.english}</p>
                            <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-1">
                              {mw.frequency > 1 && (
                                <span className="text-green-700 font-bold">
                                  ({mw.frequency}x)
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {mw.matchType === 'exact' ? '\u2713 exact' :
                                 mw.matchType === 'hebrew' ? '\u2713 Hebrew' :
                                 mw.matchType === 'arabic' ? '\u2713 Arabic' :
                                 mw.matchType === 'phrase' ? '\u2713 phrase' :
                                 mw.matchType === 'fuzzy' ? '\u2248 fuzzy' :
                                 mw.matchType === 'family' ? '\u223C family' :
                                 '~ starts-with'}
                              </span>
                              {'confidence' in mw && typeof (mw as any).confidence === 'number' && (mw as any).confidence < 1.0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                  (mw as any).confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                                  (mw as any).confidence >= 0.6 ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {Math.round((mw as any).confidence * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  handleSaveCorrection(mw.word.id);
                                } else {
                                  setEditingWordId(mw.word.id);
                                }
                              }}
                              className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors"
                              title={isEditing ? t.saveChangesTitle : t.editTranslationTitle}
                            >
                              {isEditing ? (
                                <Check size={16} className="text-green-600" />
                              ) : (
                                <Edit3 size={16} className="text-indigo-600" />
                              )}
                            </button>
                            {onRemoveMatched && (
                              <button
                                onClick={() => onRemoveMatched(mw.word.id)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title={t.removeThisWordTitle}
                              >
                                <Trash2 size={16} className="text-red-600" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline translation edit */}
                        {isEditing && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                                Hebrew
                              </label>
                              <input
                                type="text"
                                defaultValue={corrected.hebrew || ''}
                                onChange={(e) => {
                                  setInlineEdits(prev => {
                                    const updated = new Map(prev);
                                    const existing = updated.get(mw.word.id) || { hebrew: corrected.hebrew || '', arabic: corrected.arabic || '' };
                                    updated.set(mw.word.id, { ...existing, hebrew: e.target.value });
                                    return updated;
                                  });
                                }}
                                placeholder="Enter Hebrew translation..."
                                className="w-full px-3 py-2 text-sm rounded-lg bg-white border-2 border-surface-container-highest text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                dir="rtl"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                                Arabic
                              </label>
                              <input
                                type="text"
                                defaultValue={corrected.arabic || ''}
                                onChange={(e) => {
                                  setInlineEdits(prev => {
                                    const updated = new Map(prev);
                                    const existing = updated.get(mw.word.id) || { hebrew: corrected.hebrew || '', arabic: corrected.arabic || '' };
                                    updated.set(mw.word.id, { ...existing, arabic: e.target.value });
                                    return updated;
                                  });
                                }}
                                placeholder="Enter Arabic translation..."
                                className="w-full px-3 py-2 text-sm rounded-lg bg-white border-2 border-surface-container-highest text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                dir="rtl"
                              />
                            </div>
                          </div>
                        )}

                        {/* Display translations when not editing */}
                        {!isEditing && (
                          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                            {corrected.hebrew && (
                              <span className="bg-white px-2 py-0.5 rounded">
                                {corrected.hebrew}
                                {corrected.isCorrected && (
                                  <span className="text-indigo-600 ml-1">✓</span>
                                )}
                              </span>
                            )}
                            {corrected.arabic && (
                              <span className="bg-white px-2 py-0.5 rounded">
                                {corrected.arabic}
                                {corrected.isCorrected && (
                                  <span className="text-indigo-600 ml-1">✓</span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                        </div>{/* close flex-1 wrapper */}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Suggestions — fuzzy, starts-with matches (click to add) */}
              {suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-2 flex items-center gap-2">
                  <Sparkles className="text-amber-600" size={16} />
                  {t.suggestionsHeading(suggestions.length)} {t.clickToAddSuffix}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((mw) => {
                    const isAdded = addedSuggestionIds.has(mw.word.id);
                    return (
                      <button
                        key={mw.word.id}
                        onClick={() => {
                          setAddedSuggestionIds(prev => {
                            const next = new Set(prev);
                            if (isAdded) next.delete(mw.word.id); else next.add(mw.word.id);
                            return next;
                          });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isAdded
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer'
                        }`}
                        title={`${mw.matchType} match — ${mw.word.hebrew || ''}`}
                      >
                        {isAdded ? '✓ ' : '+ '}{mw.word.english}
                        <span className="ml-1 opacity-60">({mw.matchType})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}
              </>
              );
            })()}

            {/* Unmatched Terms */}
            {unmatchedTerms.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-2 flex items-center gap-2">
                  <AlertCircle className="text-orange-600" size={16} />
                  {t.customWordsHeading(unmatchedTerms.length)}
                </h3>
                <div className="space-y-2">
                  {unmatchedTerms.map((term, index) => {
                    const translations = customWordTranslations.get(term.term);
                    return (
                      <div
                        key={`${term.term}-${index}`}
                        className="p-3 bg-orange-50 rounded-xl border-2 border-orange-200"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-on-surface text-sm">{term.term}</p>
                            <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-1">
                              {term.frequency > 1 && (
                                <span className="text-orange-700 font-bold">
                                  ({term.frequency}x)
                                </span>
                              )}
                              {term.isStopWord && (
                                <span className="text-gray-500">(stop word)</span>
                              )}
                            </div>
                          </div>
                          {onRemoveUnmatched && (
                            <button
                              onClick={() => onRemoveUnmatched(term.term)}
                              className="p-1 hover:bg-orange-100 rounded-lg transition-colors"
                              title={t.removeThisWordTitle}
                            >
                              <X size={16} className="text-orange-600" />
                            </button>
                          )}
                        </div>

                        {/* Translation inputs */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="block text-xs font-bold text-on-surface-variant mb-1">
                              Hebrew
                            </label>
                            <input
                              type="text"
                              value={translations?.hebrew || ''}
                              onChange={(e) => {
                                setCustomWordTranslations(prev => {
                                  const updated = new Map(prev);
                                  const existing = updated.get(term.term) || { hebrew: '', arabic: '' };
                                  updated.set(term.term, { ...existing, hebrew: e.target.value });
                                  return updated;
                                });
                              }}
                              placeholder="Add Hebrew translation..."
                              className="w-full px-3 py-2 text-sm rounded-lg bg-white border-2 border-surface-container-highest text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              dir="rtl"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-on-surface-variant mb-1">
                              Arabic
                            </label>
                            <input
                              type="text"
                              value={translations?.arabic || ''}
                              onChange={(e) => {
                                setCustomWordTranslations(prev => {
                                  const updated = new Map(prev);
                                  const existing = updated.get(term.term) || { hebrew: '', arabic: '' };
                                  updated.set(term.term, { ...existing, arabic: e.target.value });
                                  return updated;
                                });
                              }}
                              placeholder="Add Arabic translation..."
                              className="w-full px-3 py-2 text-sm rounded-lg bg-white border-2 border-surface-container-highest text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              dir="rtl"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Word Family Suggestions */}
            {analysis.wordFamilySuggestions && analysis.wordFamilySuggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-2 flex items-center gap-2">
                  <Sparkles className="text-purple-600" size={16} />
                  {t.relatedWordsHeading(analysis.wordFamilySuggestions.reduce((s, f) => s + f.familyMembers.length, 0))}
                </h3>
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 space-y-2">
                  {analysis.wordFamilySuggestions.map((family) => (
                    <div key={family.rootWord} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-purple-600 font-bold mr-1">root: {family.rootWord}</span>
                      {family.familyMembers.map((w) => {
                        const isAdded = addedSuggestionIds.has(w.id);
                        return (
                          <button
                            key={w.id}
                            onClick={() => {
                              setAddedSuggestionIds(prev => {
                                const next = new Set(prev);
                                if (isAdded) next.delete(w.id); else next.add(w.id);
                                return next;
                              });
                            }}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${isAdded ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer'}`}
                          >
                            {isAdded ? '✓ ' : '+ '}{w.english}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  <p className="text-[11px] text-purple-500 mt-1">
                    Click a word to add it to your selection. Only words you click will be included.
                  </p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {matchedWords.length === 0 && unmatchedTerms.length === 0 && (
              <div className="text-center py-12">
                <Filter size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-on-surface-variant font-bold">No words found</p>
                <p className="text-sm text-on-surface-variant">
                  Try pasting a word list or sentences
                </p>
              </div>
            )}

            {/* Warning about duplicates */}
            {stats.duplicateCount > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-900 flex items-center gap-2">
                  <Zap size={16} />
                  <strong>Duplicates detected:</strong> {stats.duplicateCount} duplicate{" "}
                  {stats.duplicateCount === 1 ? 'was' : 'were'} found. Each word will only be added once.
                </p>
              </div>
            )}

            {/* Info about translations */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
              <p className="text-sm text-blue-900 flex items-center gap-2">
                <Edit3 size={16} />
                <strong>Edit Translations:</strong> Click the edit button next to any word to correct its Hebrew or Arabic translation inline.
                Your corrections will be saved and apply everywhere. Use the remove button to exclude words from this assignment.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-surface-container-low px-6 py-4 border-t border-surface-container-highest flex justify-between gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-surface-container text-on-surface font-bold rounded-xl hover:bg-surface-container-high border-2 border-outline transition-all"
            >
              {t.cancel}
            </button>
            <div className="flex gap-2">
              {unmatchedTerms.length > 0 && (
                <button
                  onClick={handleTranslateAll}
                  disabled={isTranslating}
                  className="px-4 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t.translating}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {t.translateCustomWords}
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleQuickSave}
                disabled={matchedWords.length === 0 && unmatchedTerms.length === 0}
                className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:shadow-none hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Check size={18} />
                {t.saveAndAssign}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
