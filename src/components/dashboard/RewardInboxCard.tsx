/**
 * RewardInboxCard — student-facing celebration card for teacher-given rewards.
 *
 * Teachers award XP / badges / titles / avatars from the Gradebook or
 * Analytics view (TeacherRewardModal → award_reward RPC), but until now
 * the student had no feedback loop — the XP bump was silent and the
 * teacher's encouragement was invisible. This card surfaces every
 * unseen reward on the student's dashboard with:
 *
 *   * A gradient hero card per reward with the teacher's name + reason
 *   * Emoji/icon per reward type
 *   * A "Dismiss" button that calls mark_rewards_seen
 *   * Confetti on mount so it feels like a moment, not a dropdown
 *
 * Fetches via get_unseen_rewards on mount. Hides itself completely
 * when the inbox is empty so the dashboard stays clean for students
 * with no pending rewards.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gift, Sparkles, X, Trophy, Crown, Smile } from "lucide-react";
import { supabase } from "../../core/supabase";
import { celebrate } from "../../utils/celebrate";

interface RewardRow {
  id: string;
  teacher_uid: string;
  teacher_name: string;
  reward_type: 'xp' | 'badge' | 'title' | 'avatar' | string;
  reward_value: string;
  reason: string | null;
  created_at: string;
}

interface RewardInboxCardProps {
  /** Called with the granted XP total so the dashboard can update its
   *  in-memory user row immediately — avoids a full refetch for a
   *  visible bump. Safe to pass a no-op if you prefer to rely on the
   *  next natural refresh. */
  onXpGranted?: (delta: number) => void;
}

const TYPE_META: Record<string, { gradient: string; icon: React.ReactNode; label: string }> = {
  xp:     { gradient: 'from-amber-400 to-orange-500',   icon: <Sparkles size={22} />, label: 'XP Boost' },
  badge:  { gradient: 'from-emerald-400 to-teal-500',   icon: <Trophy size={22} />,   label: 'New Badge' },
  title:  { gradient: 'from-fuchsia-500 to-pink-600',   icon: <Crown size={22} />,    label: 'New Title' },
  avatar: { gradient: 'from-sky-400 to-indigo-600',     icon: <Smile size={22} />,    label: 'New Avatar' },
};

const metaFor = (type: string) =>
  TYPE_META[type] ?? { gradient: 'from-stone-500 to-stone-700', icon: <Gift size={22} />, label: 'Reward' };

// Friendly display for each reward type. XP shows a "+N" string, the
// rest display the raw value (e.g. an emoji avatar, a title key).
const formatValue = (type: string, value: string): string => {
  if (type === 'xp') {
    const n = Number(value);
    return Number.isFinite(n) ? `+${n} XP` : value;
  }
  return value;
};

export default function RewardInboxCard({ onXpGranted }: RewardInboxCardProps) {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  // Initial fetch + celebratory confetti if anything is pending.
  useEffect(() => {
    let cancelled = false;
    supabase.rpc('get_unseen_rewards').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        // Surface to the console but don't toast — a stale migration on
        // a self-hosted environment shouldn't make the dashboard spam
        // errors. The inbox just stays empty until the RPC is deployed.
        console.warn('[RewardInbox] get_unseen_rewards failed:', error);
        setLoaded(true);
        return;
      }
      const list = (data as RewardRow[]) ?? [];
      setRewards(list);
      setLoaded(true);
      if (list.length > 0) {
        // Confetti so the reward actually FEELS like a surprise,
        // not a silent banner.
        setTimeout(() => celebrate('big'), 400);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const dismiss = async (reward: RewardRow) => {
    // Mark locally first for instant feedback; the RPC is fire-and-
    // forget. If it fails the card will reappear on the next dashboard
    // mount — acceptable tradeoff for snappy UX.
    setDismissing(prev => new Set(prev).add(reward.id));
    setRewards(prev => prev.filter(r => r.id !== reward.id));
    const { error } = await supabase.rpc('mark_rewards_seen', { p_ids: [reward.id] });
    if (error) {
      console.warn('[RewardInbox] mark_rewards_seen failed:', error);
    }
  };

  // Hide completely until loaded so we don't flash an empty div.
  if (!loaded || rewards.length === 0) return null;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-0 mb-4 space-y-3">
      <AnimatePresence initial={false}>
        {rewards.map((r, i) => {
          const meta = metaFor(r.reward_type);
          const isDismissing = dismissing.has(r.id);
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 220, damping: 20 }}
              className={`relative rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${meta.gradient} text-white shadow-xl ring-1 ring-white/20 overflow-hidden`}
            >
              {/* Dismiss X top-right */}
              <button
                type="button"
                onClick={() => dismiss(r)}
                disabled={isDismissing}
                aria-label="Dismiss reward"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>

              <div className="flex items-start gap-4">
                <motion.div
                  initial={{ rotate: -20, scale: 0.7 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: i * 0.08 + 0.15, type: 'spring', stiffness: 260, damping: 14 }}
                  className="shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner"
                >
                  {meta.icon}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] opacity-90">
                    {meta.label} · from {r.teacher_name}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black mt-0.5 leading-tight break-words">
                    {formatValue(r.reward_type, r.reward_value)}
                  </p>
                  {r.reason && (
                    <p className="text-sm opacity-90 mt-2 leading-snug">
                      “{r.reason}”
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (r.reward_type === 'xp') {
                          const n = Number(r.reward_value);
                          if (Number.isFinite(n)) onXpGranted?.(n);
                        }
                        dismiss(r);
                      }}
                      disabled={isDismissing}
                      className="px-4 py-2 rounded-xl bg-white text-stone-900 font-black text-sm hover:bg-white/90 transition-colors shadow-sm disabled:opacity-60"
                    >
                      Thanks!
                    </button>
                    <span className="text-[11px] opacity-80 font-semibold">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
