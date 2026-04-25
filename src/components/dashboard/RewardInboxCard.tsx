/**
 * RewardInboxCard — student-facing celebration card for teacher-given rewards.
 *
 * Teachers award XP / badges / titles / avatars from the Gradebook or
 * Analytics view (TeacherRewardModal → award_reward RPC).  The RPC
 * already mutates the student's users row server-side — this card is
 * purely a notification layer that:
 *
 *   * Polls get_unseen_rewards every 15s + on tab refocus so new
 *     rewards surface without a page refresh.
 *   * Tracks which rewards this session has already "seen" so a
 *     freshly-landed reward can bump the dashboard's in-memory XP /
 *     badges even though no refetch has happened.  This is the fix
 *     for the "teacher gave me 100 XP but I still see 1000 until I
 *     refresh" bug.
 *   * DOES NOT bump XP on the "Thanks!" click.  That used to cause
 *     a double-count (RPC had already granted +100 to the DB; the
 *     post-refresh fetch surfaced 1100; Thanks! added another 100
 *     locally and wrote 1200 back to the DB).  Thanks! now only
 *     dismisses + marks the row seen.
 */
import { useEffect, useRef, useState } from "react";
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
  /**
   * Called when a reward newly arrives via polling so the dashboard
   * can update its in-memory user stats to match the DB (which the
   * award_reward RPC has already mutated).  Receives a summary of
   * what to apply locally — XP total, badges to append, plus the
   * raw reward array in case the caller wants to drive its own UI.
   *
   * Implementations should ONLY update local state — do NOT write to
   * Supabase.  The server-side RPC is authoritative.
   */
  onServerRewardsArrived?: (summary: {
    xpToAdd: number;
    badgesToAppend: string[];
    rewards: RewardRow[];
  }) => void;
}

const TYPE_META: Record<string, { gradient: string; icon: React.ReactNode; label: string }> = {
  xp:     { gradient: 'from-amber-400 to-orange-500',   icon: <Sparkles size={22} />, label: 'XP Boost' },
  badge:  { gradient: 'from-emerald-400 to-teal-500',   icon: <Trophy size={22} />,   label: 'New Badge' },
  title:  { gradient: 'from-fuchsia-500 to-pink-600',   icon: <Crown size={22} />,    label: 'New Title' },
  avatar: { gradient: 'from-sky-400 to-indigo-600',     icon: <Smile size={22} />,    label: 'New Avatar' },
};

const metaFor = (type: string) =>
  TYPE_META[type] ?? { gradient: 'from-stone-500 to-stone-700', icon: <Gift size={22} />, label: 'Reward' };

const formatValue = (type: string, value: string): string => {
  if (type === 'xp') {
    const n = Number(value);
    return Number.isFinite(n) ? `+${n} XP` : value;
  }
  return value;
};

export default function RewardInboxCard({ onServerRewardsArrived }: RewardInboxCardProps) {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  // Tracks reward ids we've already surfaced to the caller so polling
  // doesn't double-apply an xp bump if the same row comes back across
  // multiple fetches before the student has clicked Thanks!.
  const appliedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const fetchRewards = async () => {
      const { data, error } = await supabase.rpc('get_unseen_rewards');
      if (cancelled) return;
      if (error) {
        // A stale migration on a self-hosted env shouldn't spam the
        // dashboard with toasts.  Warn to console once, bail.
        console.warn('[RewardInbox] get_unseen_rewards failed:', error);
        setLoaded(true);
        return;
      }
      const newList = (data as RewardRow[]) ?? [];

      // Detect rewards we haven't applied yet this session.  On the
      // first mount appliedIdsRef is empty so EVERYTHING in the list
      // is new — but the caller should only apply local state updates
      // for rewards that weren't in the users-table XP at mount time.
      // The dashboard's initial fetch of the users row already
      // reflects the RPC's DB update, so applying on first mount
      // would be the exact double-count we just fixed.
      //
      // Workaround: on the very first fetch, silently seed appliedIds
      // with everything we see and DO NOT call onServerRewardsArrived.
      // Subsequent fetches report only genuinely-new rewards.
      const truelyNew = newList.filter(r => !appliedIdsRef.current.has(r.id));

      if (!loaded) {
        // First load — seed the ref with whatever's there and skip
        // the callback.  Initial page load already has the correct
        // XP from fetchUserProfile; firing the callback would
        // double-count.
        newList.forEach(r => appliedIdsRef.current.add(r.id));
      } else if (truelyNew.length > 0 && onServerRewardsArrived) {
        // A reward landed AFTER the student was already on the
        // dashboard — their in-memory user stats are stale and need
        // to match the DB (which the RPC has already updated).
        let xpToAdd = 0;
        const badgesToAppend: string[] = [];
        for (const r of truelyNew) {
          appliedIdsRef.current.add(r.id);
          if (r.reward_type === 'xp') {
            const n = Number(r.reward_value);
            if (Number.isFinite(n)) xpToAdd += n;
          } else if (r.reward_type === 'badge') {
            badgesToAppend.push(r.reward_value);
          } else if (r.reward_type === 'title') {
            badgesToAppend.push(`🏷️ ${r.reward_value}`);
          } else if (r.reward_type === 'avatar') {
            badgesToAppend.push(`🎭 ${r.reward_value}`);
          }
        }
        onServerRewardsArrived({ xpToAdd, badgesToAppend, rewards: truelyNew });
      }

      setRewards(newList);
      if (!loaded && newList.length > 0) {
        // Confetti only on first surface.
        setTimeout(() => celebrate('big'), 400);
      }
      setLoaded(true);
    };

    // Kick off immediately so the inbox isn't empty before the first
    // Realtime push arrives.
    fetchRewards();

    // Realtime-first.  Subscribes to INSERTs on `teacher_rewards` for
    // the current student so a freshly-pushed reward fires the same
    // refetch the old 60 s poll did, but only when something actually
    // happens.  Falls back to a 5-minute poll when the channel is in
    // an error state (corporate Wi-Fi blocking WebSockets, etc.) so
    // we still surface eventually without burning thousands of
    // requests/day for nothing.
    let fallbackPollId: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`reward-inbox-${uid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'teacher_rewards', filter: `student_uid=eq.${uid}` },
          () => { if (!document.hidden) fetchRewards(); },
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            if (fallbackPollId) { clearInterval(fallbackPollId); fallbackPollId = null; }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (!fallbackPollId) {
              fallbackPollId = setInterval(() => { if (!document.hidden) fetchRewards(); }, 5 * 60_000);
            }
          }
        });
    })();

    const handleVisibility = () => {
      if (!document.hidden) fetchRewards();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (fallbackPollId) clearInterval(fallbackPollId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // `loaded` intentionally excluded from deps — it's used as a
    // one-shot seed gate and adding it would re-run the effect every
    // time it flips, creating a tight loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onServerRewardsArrived]);

  const dismiss = async (reward: RewardRow) => {
    // Visual dismissal first — instant feedback even on flaky Wi-Fi.
    // mark_rewards_seen is fire-and-forget; if it fails the card
    // reappears next mount, which is acceptable.
    setDismissing(prev => new Set(prev).add(reward.id));
    setRewards(prev => prev.filter(r => r.id !== reward.id));
    const { error } = await supabase.rpc('mark_rewards_seen', { p_ids: [reward.id] });
    if (error) {
      console.warn('[RewardInbox] mark_rewards_seen failed:', error);
    }
  };

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
                    {/* "Thanks!" is purely a visual dismiss now.  The
                        server already granted the XP via award_reward,
                        and the dashboard's in-memory XP was kept in
                        sync by the onServerRewardsArrived callback the
                        moment the poll noticed this row.  Clicking
                        this NEVER writes to the users table. */}
                    <button
                      type="button"
                      onClick={() => dismiss(r)}
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
