/**
 * Retention hook — single source of truth for the four retention
 * mechanics + pet evolution rewards.  Everything the student sees on
 * the dashboard (daily chest, weekly challenge progress, welcome-back
 * banner, limited-time rotating item, claimable pet milestone) derives
 * from this hook.
 *
 * State persistence is intentionally client-only (localStorage) for
 * now — no schema migration needed to ship.  When the DB side is ready,
 * each claim method can be upgraded to call a `claim_*` RPC without
 * touching callers.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DAILY_CHEST_XP,
  WEEKLY_CHALLENGE_PLAYS,
  WEEKLY_CHALLENGE_REWARD_XP,
  COMEBACK_AFTER_DAYS,
  PET_MILESTONES,
  type PetMilestone,
} from '../constants/game';

// --- date helpers (keep local, tiny, dependency-free) ---
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isoWeekKey = () => {
  const d = new Date();
  // ISO week number — close-enough formula (good to within ±1 day of edge cases).
  const start = new Date(d.getFullYear(), 0, 1);
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return `${d.getFullYear()}-W${Math.ceil((diffDays + start.getDay() + 1) / 7)}`;
};
const daysBetween = (a: number, b: number) => Math.floor((b - a) / 86400000);

// --- storage keys (scoped per user to avoid cross-account bleed) ---
const k = (uid: string, suffix: string) => `vocaband_retention_${uid}_${suffix}`;

export interface RetentionState {
  /** True if the student can claim today's daily chest. */
  dailyChestAvailable: boolean;
  /** Number of plays completed this ISO week (for the weekly challenge). */
  weeklyPlays: number;
  /** True if the weekly challenge has been completed but reward not yet claimed. */
  weeklyChallengeClaimable: boolean;
  /** True if the student just came back after being offline for COMEBACK_AFTER_DAYS+ days. */
  comebackAvailable: boolean;
  /** The highest pet milestone the student has reached that's not yet claimed. */
  claimablePetMilestone: PetMilestone | null;
  /** The current pet stage (emoji + name) the student is in. */
  currentPetStage: PetMilestone;
  /** The next pet stage the student is working toward, if any. */
  nextPetStage: PetMilestone | null;
  /** Claim functions — each returns the XP / reward to award (caller applies it via the normal path). */
  claimDailyChest: () => { xp: number; eggFree?: boolean } | null;
  claimWeeklyChallenge: () => { xp: number; eggFree: boolean } | null;
  claimComebackBonus: () => { eggFree: boolean } | null;
  claimPetMilestone: (milestone: PetMilestone) => void;
  /** Call after every completed game so the weekly counter advances. */
  recordPlay: () => void;
}

export function useRetention(uid: string | null | undefined, xp: number): RetentionState {
  // Guard — anonymous/logged-out path doesn't persist.  Use an in-memory
  // pseudo-uid so the hook returns sane defaults without throwing.
  const userKey = uid || '__anon__';

  // IMPORTANT: `useState(() => localStorage…)` only runs ONCE at mount.
  // On first render `user?.uid` is undefined (auth hasn't restored yet),
  // so every persisted state initially reads under '__anon__' — missing
  // every claim the real user has ever made. Then the FIRST in-session
  // claim writes under the real uid with a partial set, silently
  // clobbering the full localStorage record of prior claims. Next
  // refresh: the state re-initialises empty again, the already-reached
  // milestone looks unclaimed, and the bonus re-pays on every refresh.
  // Fix: after userKey settles to the real uid, re-sync each state
  // from that user's localStorage.

  // --- DAILY CHEST: last-claim date ---
  const [lastDaily, setLastDaily] = useState<string>(() => {
    try { return localStorage.getItem(k(userKey, 'daily_last')) ?? ''; } catch { return ''; }
  });
  useEffect(() => {
    try { setLastDaily(localStorage.getItem(k(userKey, 'daily_last')) ?? ''); } catch {}
  }, [userKey]);
  const dailyChestAvailable = lastDaily !== todayKey();

  const claimDailyChest = useCallback(() => {
    if (!dailyChestAvailable) return null;
    const reward = DAILY_CHEST_XP.min + Math.floor(Math.random() * (DAILY_CHEST_XP.max - DAILY_CHEST_XP.min + 1));
    const today = todayKey();
    try { localStorage.setItem(k(userKey, 'daily_last'), today); } catch {}
    setLastDaily(today);
    return { xp: reward };
  }, [dailyChestAvailable, userKey]);

  // --- WEEKLY CHALLENGE: play count for this ISO week ---
  const [weeklyState, setWeeklyState] = useState<{ week: string; plays: number; claimed: boolean }>(() => {
    try {
      const raw = localStorage.getItem(k(userKey, 'weekly'));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.week === isoWeekKey()) return parsed;
      }
    } catch {/* malformed json */}
    return { week: isoWeekKey(), plays: 0, claimed: false };
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(k(userKey, 'weekly'));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.week === isoWeekKey()) {
          setWeeklyState(parsed);
          return;
        }
      }
      setWeeklyState({ week: isoWeekKey(), plays: 0, claimed: false });
    } catch {}
  }, [userKey]);

  const recordPlay = useCallback(() => {
    setWeeklyState(prev => {
      const currentWeek = isoWeekKey();
      const next = prev.week === currentWeek
        ? { ...prev, plays: prev.plays + 1 }
        : { week: currentWeek, plays: 1, claimed: false };
      try { localStorage.setItem(k(userKey, 'weekly'), JSON.stringify(next)); } catch {}
      return next;
    });
  }, [userKey]);

  const weeklyChallengeClaimable = weeklyState.plays >= WEEKLY_CHALLENGE_PLAYS && !weeklyState.claimed;

  const claimWeeklyChallenge = useCallback(() => {
    if (!weeklyChallengeClaimable) return null;
    setWeeklyState(prev => {
      const next = { ...prev, claimed: true };
      try { localStorage.setItem(k(userKey, 'weekly'), JSON.stringify(next)); } catch {}
      return next;
    });
    return { xp: WEEKLY_CHALLENGE_REWARD_XP, eggFree: true };
  }, [weeklyChallengeClaimable, userKey]);

  // --- COMEBACK BONUS: detect on mount, show until claimed ---
  const [comebackAvailable, setComebackAvailable] = useState(false);
  useEffect(() => {
    try {
      const lastVisit = Number(localStorage.getItem(k(userKey, 'last_visit')) ?? 0);
      const now = Date.now();
      if (lastVisit && daysBetween(lastVisit, now) >= COMEBACK_AFTER_DAYS) {
        const comebackClaimed = localStorage.getItem(k(userKey, 'comeback_claimed_at')) ?? '';
        // Only surface the comeback bonus once per "return" — if the
        // student already claimed for this return window, skip it.
        if (!comebackClaimed || Number(comebackClaimed) < lastVisit) {
          setComebackAvailable(true);
        }
      }
      localStorage.setItem(k(userKey, 'last_visit'), String(now));
    } catch {/* storage unavailable */}
  }, [userKey]);

  const claimComebackBonus = useCallback(() => {
    if (!comebackAvailable) return null;
    try { localStorage.setItem(k(userKey, 'comeback_claimed_at'), String(Date.now())); } catch {}
    setComebackAvailable(false);
    return { eggFree: true };
  }, [comebackAvailable, userKey]);

  // --- PET EVOLUTION: find the highest reached stage, mark unclaimed ones ---
  const [petClaimsRaw, setPetClaimsRaw] = useState<string>(() => {
    try { return localStorage.getItem(k(userKey, 'pet_claims')) ?? ''; } catch { return ''; }
  });
  useEffect(() => {
    try { setPetClaimsRaw(localStorage.getItem(k(userKey, 'pet_claims')) ?? ''); } catch {}
  }, [userKey]);
  const petClaims = useMemo<Set<string>>(() => new Set(petClaimsRaw ? petClaimsRaw.split(',') : []), [petClaimsRaw]);

  const currentPetStage = useMemo(() => {
    return [...PET_MILESTONES].reverse().find(m => xp >= m.xpRequired) ?? PET_MILESTONES[0];
  }, [xp]);

  const nextPetStage = useMemo(() => {
    return PET_MILESTONES.find(m => m.xpRequired > xp) ?? null;
  }, [xp]);

  const claimablePetMilestone = useMemo(() => {
    // The student can claim any reached stage (except the 0-XP Egg stub)
    // whose reward hasn't been claimed yet.  Return the highest unclaimed
    // so we surface the newest unlock first.
    return [...PET_MILESTONES]
      .reverse()
      .find(m => xp >= m.xpRequired && m.xpRequired > 0 && !petClaims.has(m.stage)) ?? null;
  }, [xp, petClaims]);

  const claimPetMilestone = useCallback((milestone: PetMilestone) => {
    // Read CURRENT localStorage state first rather than trusting the
    // in-memory petClaims set. If the user taps before the userKey
    // re-sync effect has run, petClaims in state could be empty while
    // localStorage actually has a full history — naively writing
    // `petClaims + new` would clobber the history. Merge both sources
    // and de-dup before writing so no earlier claim is lost.
    let existing = new Set<string>(petClaims);
    try {
      const raw = localStorage.getItem(k(userKey, 'pet_claims')) ?? '';
      raw.split(',').filter(Boolean).forEach(s => existing.add(s));
    } catch {}
    if (existing.has(milestone.stage)) return;
    existing.add(milestone.stage);
    const csv = Array.from(existing).join(',');
    try { localStorage.setItem(k(userKey, 'pet_claims'), csv); } catch {}
    setPetClaimsRaw(csv);
  }, [petClaims, userKey]);

  return {
    dailyChestAvailable,
    weeklyPlays: weeklyState.plays,
    weeklyChallengeClaimable,
    comebackAvailable,
    claimablePetMilestone,
    currentPetStage,
    nextPetStage,
    claimDailyChest,
    claimWeeklyChallenge,
    claimComebackBonus,
    claimPetMilestone,
    recordPlay,
  };
}
