/**
 * TeacherRewardModal — Modal for teachers to give rewards to students.
 *
 * Allows teachers to award:
 * - XP boost (preset amounts: 10, 25, 50, 100)
 * - Badges (special recognition badges)
 * - Titles (unlock special titles)
 * - Avatars (unlock locked emoji avatars)
 *
 * All rewards are logged to the teacher_rewards table for audit.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gift, X, Sparkles, Trophy, Target, Crown, Wand2 } from "lucide-react";
import { supabase } from "../../core/supabase";
import { TEACHER_BADGES, TEACHER_XP_PRESETS, LOCKED_AVATARS, TEACHER_TITLES } from "../../constants/game";

export interface StudentInfo {
  uid: string;
  name: string;
  avatar: string;
  xp?: number;
}

interface TeacherRewardModalProps {
  student: StudentInfo | null;
  onClose: () => void;
  onRewardGiven?: () => void;
  showToast?: (message: string, type: 'success' | 'error') => void;
}

type RewardTab = 'xp' | 'badge' | 'title' | 'avatar';

export function TeacherRewardModal({ student, onClose, onRewardGiven, showToast }: TeacherRewardModalProps) {
  const [tab, setTab] = useState<RewardTab>('xp');
  const [selectedXp, setSelectedXp] = useState<number | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [giving, setGiving] = useState(false);

  // Reset selections when tab changes
  const handleTabChange = (newTab: RewardTab) => {
    setTab(newTab);
    setSelectedXp(null);
    setSelectedBadge(null);
    setSelectedTitle(null);
    setSelectedAvatar(null);
  };

  // Get current selection value
  const getSelectedValue = (): string | null => {
    switch (tab) {
      case 'xp': return selectedXp !== null ? String(selectedXp) : null;
      case 'badge': return selectedBadge;
      case 'title': return selectedTitle;
      case 'avatar': return selectedAvatar;
    }
  };

  // Check if a reward is selected
  const hasSelection = getSelectedValue() !== null;

  // Give the reward
  const handleGiveReward = async () => {
    const value = getSelectedValue();
    if (!value || !student) return;

    setGiving(true);
    try {
      const { data, error } = await supabase.rpc('award_reward', {
        p_student_uid: student.uid,
        p_reward_type: tab,
        p_reward_value: value,
        p_reason: reason || null,
      });

      if (error) throw error;

      const rewardLabel = tab === 'xp' ? `${value} XP` : value;
      showToast?.(`Reward given to ${student.name}! (+${rewardLabel})`, 'success');
      onRewardGiven?.();
      onClose();
    } catch (err) {
      // Surface the real PostgREST error text so we can tell an auth
      // gate ("Only teachers can award rewards") from an unknown-student
      // case ("Student not found") from a cap ("XP value exceeds") —
      // the previous generic "Failed to give reward. Try again." hid
      // exactly the diagnostic we needed.
      const e = err as { message?: string; details?: string; hint?: string; code?: string } | null;
      const reason =
        (e?.message && !e.message.includes('JWT')) ? e.message :
        e?.details ? e.details :
        'unknown error';
      console.error('Failed to give reward:', err);
      showToast?.(`Couldn't give reward: ${reason}`, 'error');
    } finally {
      setGiving(false);
    }
  };

  return (
    <AnimatePresence>
      {student && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Gift size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-stone-900">Give Reward</h2>
                  <p className="text-sm text-stone-500 mt-0.5">
                    Reward <span className="font-semibold text-indigo-600">{student.name}</span> for their hard work
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                type="button"
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-stone-400" />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-2 mb-6 p-1 bg-stone-100 rounded-2xl">
              <button
                onClick={() => handleTabChange('xp')}
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${
                  tab === 'xp'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Sparkles size={16} />
                XP
              </button>
              <button
                onClick={() => handleTabChange('badge')}
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${
                  tab === 'badge'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Trophy size={16} />
                Badge
              </button>
              <button
                onClick={() => handleTabChange('title')}
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${
                  tab === 'title'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Target size={16} />
                Title
              </button>
              <button
                onClick={() => handleTabChange('avatar')}
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${
                  tab === 'avatar'
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Crown size={16} />
                Avatar
              </button>
            </div>

            {/* Reward Selection */}
            <div className="mb-6">
              {tab === 'xp' && (
                <div>
                  <p className="text-sm font-semibold text-stone-700 mb-3">Select XP amount:</p>
                  <div className="grid grid-cols-4 gap-3">
                    {TEACHER_XP_PRESETS.map((xp) => (
                      <button
                        key={xp}
                        onClick={() => setSelectedXp(xp)}
                        type="button"
                        className={`py-4 px-2 rounded-2xl font-black text-lg transition-all border-2 ${
                          selectedXp === xp
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        +{xp}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'badge' && (
                <div>
                  <p className="text-sm font-semibold text-stone-700 mb-3">Select a badge:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TEACHER_BADGES.map((badge) => (
                      <button
                        key={badge.id}
                        onClick={() => setSelectedBadge(badge.id)}
                        type="button"
                        className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all border-2 flex items-center gap-2 ${
                          selectedBadge === badge.id
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        <span className="text-xl">{badge.id}</span>
                        <span>{badge.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'title' && (
                <div>
                  <p className="text-sm font-semibold text-stone-700 mb-3">Select a title:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TEACHER_TITLES.map((title) => (
                      <button
                        key={title}
                        onClick={() => setSelectedTitle(title)}
                        type="button"
                        className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all border-2 ${
                          selectedTitle === title
                            ? 'bg-purple-500 text-white border-purple-500'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        🏷️ {title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'avatar' && (
                <div>
                  <p className="text-sm font-semibold text-stone-700 mb-3">Unlock an avatar:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {LOCKED_AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setSelectedAvatar(avatar)}
                        type="button"
                        className={`aspect-square rounded-xl text-2xl transition-all border-2 flex items-center justify-center ${
                          selectedAvatar === avatar
                            ? 'bg-pink-500 border-pink-500 scale-105'
                            : 'bg-white border-stone-200 hover:border-pink-300 hover:bg-pink-50 hover:scale-105'
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Reason */}
            <div className="mb-6">
              <label className="text-sm font-semibold text-stone-700 mb-2 block">
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Great participation today!"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-indigo-400 focus:outline-none transition-colors text-sm"
              />
              <p className="text-xs text-stone-400 mt-1">
                This helps you remember why you gave the reward (logged, not shown to student)
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-stone-100">
              <button
                onClick={onClose}
                type="button"
                disabled={giving}
                className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGiveReward}
                disabled={!hasSelection || giving}
                type="button"
                className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  giving ? 'bg-stone-400' : 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/30'
                }`}
              >
                {giving ? (
                  <>Giving...</>
                ) : (
                  <>
                    <Wand2 size={18} />
                    Give Reward
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default TeacherRewardModal;
