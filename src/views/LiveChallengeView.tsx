import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LeaderboardEntry } from "../core/types";
import type { ClassData } from "../core/supabase";
import type { View } from "../core/views";
import { useLanguage } from "../hooks/useLanguage";
import { liveChallengeT } from "../locales/teacher/live-challenge";
import confetti from "canvas-confetti";

interface LiveChallengeViewProps {
  selectedClass: ClassData;
  leaderboard: Record<string, LeaderboardEntry>;
  socketConnected: boolean;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setIsLiveChallenge: (v: boolean) => void;
}

// ─── Podium step styling per place.  Solid metallic blocks + a glowing
// avatar medallion so the top-3 reads as a real winners' stage instead
// of three faint translucent bars.
const PLACE_STYLES: Record<1 | 2 | 3, {
  ring: string;
  block: string;
  topEdge: string;
  badge: string;
  glow: string;
  avatar: string;
  blockH: string;
  nameSize: string;
  scoreSize: string;
  delay: number;
}> = {
  1: {
    ring: "from-amber-200 via-yellow-300 to-amber-500",
    block: "from-yellow-400 via-amber-500 to-amber-700",
    topEdge: "from-yellow-100 to-amber-300",
    badge: "bg-amber-500",
    glow: "shadow-[0_0_55px_-4px_rgba(251,191,36,0.75)]",
    avatar: "w-24 h-24 sm:w-28 sm:h-28 text-4xl sm:text-5xl",
    blockH: "h-36 sm:h-52",
    nameSize: "text-base sm:text-lg",
    scoreSize: "text-3xl sm:text-4xl",
    delay: 0.1,
  },
  2: {
    ring: "from-slate-100 via-slate-300 to-slate-400",
    block: "from-slate-300 via-slate-400 to-slate-600",
    topEdge: "from-white to-slate-200",
    badge: "bg-slate-500",
    glow: "shadow-[0_0_34px_-6px_rgba(203,213,225,0.6)]",
    avatar: "w-20 h-20 sm:w-24 sm:h-24 text-3xl sm:text-4xl",
    blockH: "h-24 sm:h-40",
    nameSize: "text-sm sm:text-base",
    scoreSize: "text-2xl sm:text-3xl",
    delay: 0.25,
  },
  3: {
    ring: "from-orange-200 via-orange-400 to-orange-700",
    block: "from-orange-400 via-orange-600 to-orange-800",
    topEdge: "from-orange-100 to-orange-300",
    badge: "bg-orange-600",
    glow: "shadow-[0_0_30px_-6px_rgba(251,146,60,0.6)]",
    avatar: "w-20 h-20 sm:w-24 sm:h-24 text-3xl sm:text-4xl",
    blockH: "h-20 sm:h-32",
    nameSize: "text-sm sm:text-base",
    scoreSize: "text-2xl sm:text-3xl",
    delay: 0.4,
  },
};

function PodiumStep({
  place,
  entry,
  rankLabel,
  pointsLabel,
}: {
  place: 1 | 2 | 3;
  entry: { name: string; totalScore: number; isGuest: boolean; avatar?: string };
  rankLabel: string;
  pointsLabel: string;
}) {
  const s = PLACE_STYLES[place];
  const initial = entry.name?.trim()?.charAt(0)?.toUpperCase() || "?";
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: s.delay, type: "spring", stiffness: 120, damping: 16 }}
      className="flex flex-col items-center w-28 sm:w-40"
    >
      {place === 1 && (
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-4xl sm:text-5xl mb-1 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
        >
          👑
        </motion.div>
      )}

      <div className="relative">
        <div className={`rounded-full bg-gradient-to-br ${s.ring} p-[3px] ${s.glow}`}>
          <div className={`${s.avatar} rounded-full bg-slate-900/85 flex items-center justify-center font-black`}>
            {entry.avatar ? <span aria-hidden="true">{entry.avatar}</span> : <bdi>{initial}</bdi>}
          </div>
        </div>
        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${s.badge} text-white text-[11px] font-black px-2.5 py-0.5 rounded-full border-2 border-white/80 shadow-lg whitespace-nowrap`}>
          {rankLabel}
        </div>
        {entry.isGuest && (
          <span className="absolute -top-1 -end-1 text-lg" aria-hidden="true">🎭</span>
        )}
      </div>

      <p className={`mt-4 font-bold ${s.nameSize} max-w-full truncate text-center px-1`}>
        <bdi>{entry.name}</bdi>
      </p>
      <p className={`${s.scoreSize} font-black leading-none mt-0.5`}>{entry.totalScore}</p>
      <p className="text-[10px] tracking-wide text-white/70 font-bold mb-2">{pointsLabel}</p>

      <div className={`relative w-full ${s.blockH} rounded-t-xl bg-gradient-to-b ${s.block} shadow-2xl overflow-hidden border-x border-t border-white/10`}>
        <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${s.topEdge} opacity-80`} />
        <span className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl font-black text-white/25 select-none">
          {place}
        </span>
      </div>
    </motion.div>
  );
}

export default function LiveChallengeView({
  selectedClass,
  leaderboard,
  socketConnected,
  setView,
  setIsLiveChallenge,
}: LiveChallengeViewProps) {
  const { language, dir } = useLanguage();
  const t = liveChallengeT[language];
  // Calculate total scores (baseScore + currentGameScore) for each student
  const sortedLeaderboard = (Object.entries(leaderboard) as [string, LeaderboardEntry][])
    .map(([uid, entry]) => ({
      uid,
      name: entry.name,
      totalScore: entry.baseScore + entry.currentGameScore,
      isGuest: entry.isGuest || false,
      avatar: entry.avatar,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const top3 = sortedLeaderboard.slice(0, 3);
  const rest = sortedLeaderboard.slice(3);

  // ─── Celebration chime on leader change (parity with Quick Play monitor)
  // C-major triad arpeggio via WebAudio whenever the uid at position #1
  // changes.  Suppressed on the initial non-empty render so teachers don't
  // hear a chime the moment the first score lands.
  const prevLeaderUidRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    const currentLeaderUid = sortedLeaderboard[0]?.uid ?? null;
    const prev = prevLeaderUidRef.current;
    if (currentLeaderUid && prev && currentLeaderUid !== prev) {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        [659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const start = ctx.currentTime + i * 0.12;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.3);
        });
      } catch { /* silent fail — sound is a nice-to-have */ }
    }
    prevLeaderUidRef.current = currentLeaderUid;
  }, [sortedLeaderboard]);

  // ─── Confetti burst when the podium first gets players, with a second
  // pop ~1.7s later.  Guarded by a ref so live leaderboard updates
  // (which re-render constantly) don't keep re-triggering it.
  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (confettiFiredRef.current || sortedLeaderboard.length === 0) return;
    confettiFiredRef.current = true;
    const fire = () =>
      confetti({
        particleCount: 70,
        spread: 75,
        startVelocity: 45,
        origin: { x: 0.5, y: 0.4 },
        colors: ["#fbbf24", "#f59e0b", "#a78bfa", "#f472b6", "#ffffff"],
      });
    fire();
    const t2 = setTimeout(fire, 1700);
    return () => clearTimeout(t2);
  }, [sortedLeaderboard.length]);

  // ─── End-challenge flow: confirm → results → exit
  //
  // Originally "End Challenge" went straight to the results modal,
  // whose backdrop also called exitChallenge.  Two problems with
  // that: (1) no real confirmation step — a double-tap on the red
  // button immediately closed a live lesson; (2) the backdrop and
  // the Close button did the same thing, so the teacher had no way
  // to back out of the results modal without ending the challenge.
  //
  // Now: first click shows a confirm dialog ("X students are playing
  // — really end?").  Confirm advances to the results modal, whose
  // backdrop now just dismisses the modal (canceling the exit).
  // Only the explicit Close button performs exitChallenge.
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const exitChallenge = () => {
    setView("live-challenge-class-select");
    setIsLiveChallenge(false);
  };
  const requestEndChallenge = () => {
    // If nobody played, skip both modals — a confirm dialog for a
    // ceremonial 0-player wrap-up feels silly.
    if (sortedLeaderboard.length === 0) {
      exitChallenge();
      return;
    }
    setShowEndConfirm(true);
  };

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-indigo-900 via-violet-800 to-fuchsia-800 p-4 sm:p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8">
          <button onClick={exitChallenge} className="text-white/80 font-bold flex items-center gap-1 hover:text-white text-base sm:text-sm bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all">{t.backToClassSelection}</button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
              <span className={`w-3 h-3 rounded-full ${socketConnected ? "bg-green-400 shadow-lg shadow-green-400/50" : "bg-red-400 animate-pulse"}`} />
              <span className="font-bold">{socketConnected ? t.liveIndicator : t.reconnecting}</span>
            </div>
            <button
              onClick={requestEndChallenge}
              className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-5 py-2 rounded-full font-bold transition-all text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-105"
            >
              {t.endChallenge}
            </button>
          </div>
        </div>

        <div className="text-center mb-6 sm:mb-10">
          {/* School branding row — when the class has a school logo +
              name configured, project them prominently at the top so
              the whole classroom sees their school identity during
              Live Challenge.  Only renders when set, so unconfigured
              classes look exactly as before. */}
          {(selectedClass.schoolLogoUrl || selectedClass.schoolName) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 px-5 py-2 mb-4 rounded-full bg-white/15 backdrop-blur-md border border-white/30"
            >
              {selectedClass.schoolLogoUrl && (
                <img
                  src={selectedClass.schoolLogoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  // projector-bright on purpose — logo chip stays opaque white for contrast on classroom display
                  className="w-8 h-8 rounded object-contain bg-white"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              {selectedClass.schoolName && (
                <span className="font-black text-base sm:text-lg uppercase tracking-wider">
                  {selectedClass.schoolName}
                </span>
              )}
            </motion.div>
          )}

          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl sm:text-5xl 2xl:text-6xl font-black mb-2 drop-shadow-2xl"
          >
            {t.liveChallengeFor(selectedClass.name)}
          </motion.h1>
          <p className="text-white/90 font-bold text-sm sm:text-base 2xl:text-lg">{t.classCodeLabel} <span dir="ltr" className="bg-white text-violet-600 px-4 py-2 rounded-lg font-mono font-black ms-2 shadow-lg 2xl:text-xl">{selectedClass.code}</span></p>
        </div>

        {/* Socket-offline warning — if the live socket never connects,
            students can't appear on the podium.  Make the root cause
            visible instead of letting the teacher guess.  Previously
            this failure was silent (just a tiny red "Reconnecting…"
            dot in the header). */}
        {!socketConnected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 border rounded-xl p-4 sm:p-5 shadow-lg flex items-start gap-3"
            style={{
              backgroundColor: 'var(--vb-warning-soft)',
              color: 'var(--vb-warning)',
              borderColor: 'var(--vb-warning)',
            }}
          >
            <div
              className="shrink-0 w-10 h-10 rounded-lg text-white flex items-center justify-center text-xl"
              style={{ backgroundColor: 'var(--vb-warning)' }}
            >⚠️</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base">{t.podiumNotConnected}</p>
              <p className="text-sm mt-1 leading-relaxed">
                {t.podiumOfflineHelp}
              </p>
            </div>
          </motion.div>
        )}

        {/* Winner's Podium for Top 3 */}
        {top3.length > 0 && (
          <div className="relative mb-8 sm:mb-10">
            {/* Warm spotlight behind the winner so the metallic steps pop */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 bottom-0 flex justify-center">
              <div className="w-72 h-72 sm:w-[26rem] sm:h-[26rem] rounded-full bg-amber-300/25 blur-3xl" />
            </div>
            <div className="relative flex items-end justify-center gap-2 sm:gap-5">
              {top3[1] && (
                <PodiumStep place={2} entry={top3[1]} rankLabel={t.rankBadge2} pointsLabel={t.pointsLabel} />
              )}
              {top3[0] && (
                <PodiumStep place={1} entry={top3[0]} rankLabel={t.rankBadge1} pointsLabel={t.pointsLabel} />
              )}
              {top3[2] && (
                <PodiumStep place={3} entry={top3[2]} rankLabel={t.rankBadge3} pointsLabel={t.pointsLabel} />
              )}
            </div>
          </div>
        )}

        {/* Rest of Leaderboard */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/20 shadow-2xl">
          <h2 className="text-xl sm:text-2xl 2xl:text-3xl font-black mb-4 sm:mb-6 flex items-center gap-2">
            <span className="text-2xl 2xl:text-3xl">📊</span> {t.fullLeaderboard}
            {sortedLeaderboard.length > 0 && (
              <span className="ms-auto text-sm 2xl:text-base font-normal bg-white/20 px-3 py-1 rounded-full">
                {t.playerCount(sortedLeaderboard.length)}
              </span>
            )}
          </h2>
          <div className="space-y-2 sm:space-y-3">
            {rest.map((entry, idx) => (
              <motion.div
                key={`${entry.uid}-${idx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (idx + 3) * 0.05 }}
                className="flex justify-between items-center p-3 sm:p-4 bg-white/10 rounded-xl border border-white/10 hover:bg-white/20 hover:scale-[1.02] transition-all"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="w-8 h-8 sm:w-10 sm:h-10 2xl:w-12 2xl:h-12 rounded-full bg-white/20 flex items-center justify-center font-black text-sm sm:text-base 2xl:text-lg">{idx + 4}</span>
                  {entry.avatar && <span className="text-2xl sm:text-3xl leading-none" aria-hidden="true">{entry.avatar}</span>}
                  <span className="font-bold text-base sm:text-lg 2xl:text-xl"><bdi>{entry.name}</bdi>{entry.isGuest && <span className="ms-1" aria-hidden="true">🎭</span>}</span>
                </div>
                <span className="text-xl sm:text-2xl 2xl:text-3xl font-black tabular-nums">{entry.totalScore}</span>
              </motion.div>
            ))}
            {sortedLeaderboard.length === 0 && (
              <div className="text-center py-12">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  ⏳
                </motion.div>
                <p className="text-white/80 font-bold text-lg">{t.waitingForStudents}</p>
                <p className="text-white/60 text-sm mt-2">{t.shareCodeToStart}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final-results modal — shown after the teacher confirms ending
          the challenge.  Backdrop click DISMISSES the modal (and the
          challenge keeps running) so the teacher can back out; only
          the explicit Close button calls exitChallenge.  Originally
          the backdrop also exited, which silently killed live lessons. */}
      <AnimatePresence>
        {showResultsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowResultsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--vb-surface)] text-[var(--vb-text-primary)] rounded-2xl p-6 sm:p-10 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="text-5xl sm:text-6xl mb-3">🏁</div>
                <h2 className="text-2xl sm:text-3xl font-black mb-1">{t.challengeComplete}</h2>
                <p className="text-[var(--vb-text-muted)] font-bold text-sm"><bdi>{selectedClass.name}</bdi></p>
              </div>

              {/* Top 3 medal rows */}
              <div className="space-y-2 mb-6">
                {sortedLeaderboard.slice(0, 3).map((entry, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                  const bg = idx === 0
                    ? 'bg-gradient-to-r from-yellow-100 to-amber-50 border-amber-300'
                    : idx === 1
                    ? 'bg-gradient-to-r from-slate-100 to-slate-50 border-slate-300'
                    : 'bg-gradient-to-r from-orange-100 to-orange-50 border-orange-300';
                  return (
                    <motion.div
                      key={entry.uid}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + idx * 0.1 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${bg}`}
                    >
                      <div className="text-3xl">{medal}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-base truncate">
                          <bdi>{entry.name}</bdi>{entry.isGuest && <span className="ms-1" aria-hidden="true">🎭</span>}
                        </p>
                        <p className="text-xs font-bold text-[var(--vb-text-muted)]">{t.placeSuffix(idx + 1)}</p>
                      </div>
                      <div className="text-2xl font-black text-indigo-600">{entry.totalScore}</div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="text-center text-sm font-bold text-[var(--vb-text-muted)] mb-6">
                {t.studentsPlayedSummary(sortedLeaderboard.length)}
              </div>

              <button
                onClick={() => { setShowResultsModal(false); exitChallenge(); }}
                type="button"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white rounded-xl font-black text-base sm:text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {t.close}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End-challenge confirmation — shown before the results modal
          when one or more students are on the board.  Prevents a stray
          tap on the red "End Challenge" button from killing a live
          lesson.  Backdrop click cancels (same as the Cancel button). */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowEndConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl"
              style={{ backgroundColor: 'var(--vb-surface)', color: 'var(--vb-text-primary)' }}
              dir={dir}
            >
              <h3 className="text-xl sm:text-2xl font-black mb-2">{t.endConfirmTitle}</h3>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--vb-text-secondary)' }}>
                {t.endConfirmBody(sortedLeaderboard.length)}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  type="button"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', color: 'var(--vb-text-secondary)', borderColor: 'var(--vb-border)' }}
                  className="flex-1 py-3 rounded-xl font-bold hover:opacity-90 border-2 transition-colors"
                >
                  {t.endConfirmCancel}
                </button>
                <button
                  onClick={() => { setShowEndConfirm(false); setShowResultsModal(true); }}
                  type="button"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="flex-1 py-3 rounded-xl font-black text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all"
                >
                  {t.endConfirmEnd}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
