/**
 * Translation Edit Modal
 * Allows teachers to edit Hebrew and Arabic translations for a word
 */

import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import { saveCorrection, deleteCorrection } from '../utils/translationCorrections';

interface TranslationEditModalProps {
  word: {
    id: number;
    english: string;
    hebrew: string;
    arabic: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const TranslationEditModal: React.FC<TranslationEditModalProps> = ({
  word,
  isOpen,
  onClose,
  onSave,
}) => {
  const [hebrew, setHebrew] = useState(word.hebrew);
  const [arabic, setArabic] = useState(word.arabic);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setHebrew(word.hebrew);
    setArabic(word.arabic);
    setHasChanges(false);
  }, [word]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveCorrection({
        wordId: word.id,
        english: word.english,
        hebrew: hebrew || undefined,
        arabic: arabic || undefined,
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save correction:', error);
      alert('Failed to save correction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await deleteCorrection(word.id);
      setHebrew(word.hebrew);
      setArabic(word.arabic);
      setHasChanges(false);
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to reset correction:', error);
      alert('Failed to reset correction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasCorrection = hasChanges || (hebrew !== word.hebrew) || (arabic !== word.arabic);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white">Edit Translation</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* English (reference) */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">
              English (Reference)
            </label>
            <input
              type="text"
              value={word.english}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-surface-container-highest border-2 border-surface-container-highest text-on-surface opacity-50"
            />
          </div>

          {/* Hebrew */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">
              Hebrew Correction
            </label>
            <input
              type="text"
              value={hebrew}
              onChange={(e) => {
                setHebrew(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Enter corrected Hebrew translation..."
              className="w-full px-4 py-3 rounded-xl bg-surface-container-highest border-2 border-surface-container-highest text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              dir="rtl"
            />
          </div>

          {/* Arabic */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">
              Arabic Correction
            </label>
            <input
              type="text"
              value={arabic}
              onChange={(e) => {
                setArabic(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Enter corrected Arabic translation..."
              className="w-full px-4 py-3 rounded-xl bg-surface-container-highest border-2 border-surface-container-highest text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              dir="rtl"
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900">
              <strong>ℹ️ Tip:</strong> Your corrections will apply to all assignments and games.
              Other teachers won't see your corrections unless they edit the same word.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-surface-container-highest text-on-surface hover:bg-surface-container-highest disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={18} />
            {isSaving ? 'Saving...' : 'Save Correction'}
          </button>
        </div>
      </div>
    </div>
  );
};
