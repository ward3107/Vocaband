import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Copy, Users, BookOpen, QrCode, LogOut, Volume2, VolumeX,
  ChevronDown, Music, Palette, SkipForward, SkipBack, Play, Pause,
  Share2, Check, ShieldAlert
} from 'lucide-react';
import { Howl } from 'howler';
import { QRCodeSVG } from 'qrcode.react';
import { Word } from '../data/vocabulary';
import { supabase } from '../core/supabase';
import { useQuickPlaySocket } from '../hooks/useQuickPlaySocket';
import { useClipboardFeedback } from '../hooks/useClipboardFeedback';
import QPAvatar from './QPAvatar';
import { useLanguage } from '../hooks/useLanguage';
import { teacherViewsT } from '../locales/teacher/views';
import { useFirstTimeGuide } from '../hooks/useFirstTimeGuide';
import FirstTimeGuide from './onboarding/FirstTimeGuide';
import GuideTriggerButton from './onboarding/GuideTriggerButton';
import { teacherGuidesT } from '../locales/teacher/guides';

// Match the flag in QuickPlayStudentView. When on, this monitor
// observes the /quick-play socket.io namespace for leaderboard
// updates instead of subscribing to progress-table realtime, and
// kicks students via TEACHER_KICK instead of a Supabase delete.
const QUICKPLAY_V2 = import.meta.env.VITE_QUICKPLAY_V2 === 'true';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Student {
  name: string;
  score: number;
  avatar: string;
  lastSeen: string;
  mode: string;
  studentUid: string;
}

interface QuickPlaySession {
  id: string;
  sessionCode: string;
  wordIds: number[];
  words: Word[];
  allowedModes?: string[];
}

interface QuickPlayMonitorProps {
  session: QuickPlaySession;
  students: Student[];
  setStudents: (students: Student[] | ((prev: Student[]) => Student[])) => void;
  onBack: () => void;
  onEndSession: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  realtimeStatus?: 'connecting' | 'live' | 'polling';
}

// ─── Theme definitions (light surface + accent colors) ────────────────────────
const THEMES = {
  classic: {
    name: 'Classroom', icon: '📺', dot: 'bg-indigo-600',
    bg: 'bg-gray-50', text: 'text-gray-900',
    card: 'bg-[var(--vb-surface)] border-gray-300 shadow-lg',
    qrCard: 'from-indigo-600 to-indigo-500',
    podium1: 'from-amber-400 to-amber-500', podium2: 'from-blue-400 to-blue-500', podium3: 'from-emerald-400 to-emerald-500',
    accent: 'text-indigo-600', accentBg: 'bg-indigo-600', badge1: 'bg-amber-500 text-amber-900', badge2: 'bg-blue-500 text-white', badge3: 'bg-emerald-500 text-white',
    headerBg: 'bg-white/95', headerText: 'text-indigo-600', footerBg: 'bg-white/95',
    podiumCard: 'bg-[var(--vb-surface)] border-2 border-gray-300 shadow-xl',
  },
  neon: {
    name: 'Neon Night', icon: '\uD83C\uDF03', dot: 'bg-gray-900',
    bg: 'bg-gray-950', text: 'text-white',
    card: 'bg-white/5 border-cyan-500/20',
    qrCard: 'from-cyan-600 to-purple-700',
    podium1: 'from-yellow-400 to-yellow-600', podium2: 'from-cyan-400 to-cyan-600', podium3: 'from-pink-400 to-pink-600',
    accent: 'text-cyan-400', accentBg: 'bg-cyan-500', badge1: 'bg-yellow-400 text-yellow-900', badge2: 'bg-cyan-400 text-cyan-900', badge3: 'bg-pink-400 text-pink-900',
    headerBg: 'bg-gray-900/90', headerText: 'text-cyan-400', footerBg: 'bg-gray-900/90',
    podiumCard: 'bg-white/5 border-cyan-500/20',
  },
  ocean: {
    name: 'Ocean', icon: '\uD83C\uDF0A', dot: 'bg-secondary',
    bg: 'bg-surface', text: 'text-on-surface',
    card: 'bg-surface-container-lowest border-secondary-container',
    qrCard: 'from-secondary to-secondary-container',
    podium1: 'from-yellow-400 to-amber-300', podium2: 'from-blue-300 to-blue-500', podium3: 'from-teal-300 to-teal-500',
    accent: 'text-secondary', accentBg: 'bg-secondary', badge1: 'bg-yellow-400 text-yellow-900', badge2: 'bg-blue-500 text-white', badge3: 'bg-teal-500 text-white',
    headerBg: 'bg-white/80', headerText: 'text-secondary', footerBg: 'bg-white/90',
    podiumCard: 'bg-surface-container-lowest border-secondary-container',
  },
  sunset: {
    name: 'Sunset', icon: '\uD83C\uDF05', dot: 'bg-error-container',
    bg: 'bg-surface', text: 'text-on-surface',
    card: 'bg-surface-container-lowest border-error-container/30',
    qrCard: 'from-error-container to-error',
    podium1: 'from-yellow-300 to-amber-400', podium2: 'from-rose-300 to-rose-500', podium3: 'from-orange-300 to-orange-500',
    accent: 'text-error', accentBg: 'bg-error', badge1: 'bg-yellow-400 text-yellow-900', badge2: 'bg-rose-500 text-white', badge3: 'bg-orange-500 text-white',
    headerBg: 'bg-white/80', headerText: 'text-primary', footerBg: 'bg-white/90',
    podiumCard: 'bg-surface-container-lowest border-surface-container-highest',
  },
  forest: {
    name: 'Forest', icon: '\uD83C\uDF3F', dot: 'bg-emerald-600',
    bg: 'bg-emerald-950', text: 'text-emerald-50',
    card: 'bg-emerald-900/50 border-emerald-700/30',
    qrCard: 'from-emerald-600 to-green-800',
    podium1: 'from-yellow-300 to-amber-500', podium2: 'from-emerald-300 to-emerald-500', podium3: 'from-lime-300 to-lime-500',
    accent: 'text-emerald-300', accentBg: 'bg-emerald-600', badge1: 'bg-yellow-400 text-yellow-900', badge2: 'bg-emerald-400 text-emerald-900', badge3: 'bg-lime-400 text-lime-900',
    headerBg: 'bg-emerald-900/90', headerText: 'text-emerald-300', footerBg: 'bg-emerald-900/90',
    podiumCard: 'bg-emerald-900/50 border-emerald-700/30',
  },
  candy: {
    name: 'Candy Pop', icon: '\uD83C\uDF6C', dot: 'bg-pink-400',
    bg: 'bg-pink-50', text: 'text-pink-950',
    card: 'bg-[var(--vb-surface)] border-pink-200',
    qrCard: 'from-pink-400 to-fuchsia-500',
    podium1: 'from-yellow-300 to-amber-400', podium2: 'from-pink-300 to-pink-500', podium3: 'from-fuchsia-300 to-fuchsia-500',
    accent: 'text-pink-600', accentBg: 'bg-pink-500', badge1: 'bg-yellow-400 text-yellow-900', badge2: 'bg-pink-500 text-white', badge3: 'bg-fuchsia-500 text-white',
    headerBg: 'bg-white/90', headerText: 'text-pink-600', footerBg: 'bg-white/90',
    podiumCard: 'bg-[var(--vb-surface)] border-pink-200',
  },
  galaxy: {
    name: 'Galaxy', icon: '\uD83C\uDF0C', dot: 'bg-violet-600',
    bg: 'bg-slate-950', text: 'text-slate-50',
    card: 'bg-white/5 border-violet-500/20',
    qrCard: 'from-violet-600 to-indigo-800',
    podium1: 'from-amber-300 to-yellow-500', podium2: 'from-violet-400 to-violet-600', podium3: 'from-indigo-400 to-indigo-600',
    accent: 'text-violet-300', accentBg: 'bg-violet-600', badge1: 'bg-amber-400 text-amber-900', badge2: 'bg-violet-400 text-violet-900', badge3: 'bg-indigo-400 text-indigo-900',
    headerBg: 'bg-slate-900/90', headerText: 'text-violet-300', footerBg: 'bg-slate-900/90',
    podiumCard: 'bg-white/5 border-violet-500/20',
  },
};

type ThemeKey = keyof typeof THEMES;

// ─── Music tracks (instrumental background loops in public/music/) ─────────────
const MUSIC_TRACKS = [
  { name: 'Steady Focus', icon: '🎯', file: 'bgm-steady-focus' },
  { name: 'Upbeat Energy', icon: '⚡', file: 'bgm-upbeat-energy' },
  { name: 'Chill Vibes', icon: '🌊', file: 'bgm-chill-vibes' },
  { name: 'Adventure Quest', icon: '🗺️', file: 'bgm-adventure-quest' },
  { name: 'Funky Groove', icon: '🎸', file: 'bgm-funky-groove' },
  { name: 'Space Explorer', icon: '🚀', file: 'bgm-space-explorer' },
  { name: 'Victory March', icon: '🏆', file: 'bgm-victory-march' },
];

const getMusicUrl = (file: string): string => {
  const cloudflareUrl = import.meta.env.VITE_CLOUDFLARE_URL;
  if (cloudflareUrl) return `${cloudflareUrl}/game-music/${file}.mp3`;
  return `/game-music/${file}.mp3`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuickPlayMonitor({
  session,
  students,
  setStudents,
  onBack,
  onEndSession,
  showToast,
  realtimeStatus = 'connecting',
}: QuickPlayMonitorProps) {
  const { language } = useLanguage();
  const tT = teacherViewsT[language];
  const guide = useFirstTimeGuide('quick-play-monitor');
  const guideStrings = teacherGuidesT[language].quickPlayMonitor;
  const [qrEnlarged, setQrEnlarged] = useState(false);
  // Collapsed-by-default QR card.  Per teacher request the inline
  // QR/code/share strip eats too much podium real estate after the
  // first few seconds of the session — once students have scanned,
  // the teacher only wants the podium visible.  Collapsed renders as
  // a small chip ("Code: ABC123 · 12 joined" + Show button) and
  // tapping the chip OR the Show button enlarges to the modal QR.
  const [qrCollapsed, setQrCollapsed] = useState(() => {
    try { return localStorage.getItem('vocaband-qp-qr-collapsed') === '1'; } catch { return false; }
  });
  const toggleQrCollapsed = useCallback(() => {
    setQrCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('vocaband-qp-qr-collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);
  const [endModal, setEndModal] = useState(false);
  const [showWordsModal, setShowWordsModal] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>('classic');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [confirmKick, setConfirmKick] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState(() => {
    try { return parseInt(localStorage.getItem('vocaband-music-track') || '0') || 0; } catch { return 0; }
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    try { return parseFloat(localStorage.getItem('vocaband-music-volume') || '0.5') || 0.5; } catch { return 0.5; }
  });
  const musicRef = useRef<Howl | null>(null);

  // ─── Draggable QR modal state ────────────────────────────────────────────
  const qrModalDragRef = useRef({ x: 0, y: 0 });
  const [qrModalDragControls, setQrModalDragControls] = useState({ x: 0, y: 0 });

  // Reset position when modal opens
  useEffect(() => {
    if (qrEnlarged) {
      setQrModalDragControls({ x: 0, y: 0 });
    }
  }, [qrEnlarged]);

  // ─── Mouse wheel volume control ───────────────────────────────────────────
  const handleVolumeWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setMusicVolume(prev => {
      const newValue = Math.max(0, Math.min(1, prev + delta));
      return newValue;
    });
  };

  // ─── v2 socket wiring ─────────────────────────────────────────────────
  // When VITE_QUICKPLAY_V2 is on, the real student list lives on the
  // server's in-memory leaderboard, not in the progress table the parent
  // polls. Subscribe as a teacher observer and override what we render.
  const socket = useQuickPlaySocket({
    sessionCode: session.sessionCode,
    enabled: QUICKPLAY_V2,
  });

  // Re-observe whenever the socket reconnects so the server grants us
  // authority on this teacher session and streams the leaderboard back.
  useEffect(() => {
    if (!QUICKPLAY_V2) return;
    if (socket.status !== 'connected') return;
    let cancelled = false;
    (async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      if (!token || cancelled) return;
      socket.observeAsTeacher(token);
    })();
    return () => { cancelled = true; };
  }, [socket.status]);

  // Map the socket leaderboard into the Student shape the rest of this
  // component already understands. Wrapping in useMemo keeps prop-like
  // referential stability so downstream useEffects don't re-run on
  // every render.
  const socketStudents = useMemo<Student[]>(() => {
    return socket.leaderboard.map(s => ({
      name: s.nickname,
      score: s.score,
      avatar: s.avatar,
      lastSeen: new Date(s.lastSeen).toISOString(),
      mode: '',               // mode lives client-side in v2; not reported
      studentUid: s.clientId, // reuse the field so removeStudent can find clientId by name
    }));
  }, [socket.leaderboard]);

  // v2 on → socket is the source of truth; v2 off → fall back to the
  // parent-fed students prop (legacy Supabase-realtime path).
  const effectiveStudents = QUICKPLAY_V2 ? socketStudents : students;

  const prevStudentCountRef = useRef(effectiveStudents.length);

  const t = THEMES[theme];

  // QR URL - Use local IP instead of localhost for mobile scanning
  const getNetworkOrigin = () => {
    const origin = window.location.origin;
    // If running on localhost, try to use the local network IP for QR code scanning
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      // Check if we have a stored local IP from previous detection
      try {
        const storedIp = localStorage.getItem('vocaband_local_ip');
        if (storedIp) {
          return `http://${storedIp}:3000`;
        }
      } catch (e) {}
      // Fallback: use localhost (teacher can set vocaband_local_ip in localStorage)
      return 'http://localhost:3000';
    }
    return origin;
  };
  // Use the root path with `?session=` — App.tsx:128 reads the param
  // from `location.search` regardless of pathname, but Cloudflare
  // Workers Assets `auto-trailing-slash` 301-redirects `/quick-play`
  // to `/quick-play/` and the redirect step can drop the query string
  // before the SPA gets to read it (same bug pattern as the
  // /poster.html → /poster Service-Worker cache issue noted in
  // CLAUDE.md).  Root path matches what the WhatsApp / Copy-link
  // buttons in QuickPlaySetupView already use.
  const qrUrl = `${getNetworkOrigin()}/?session=${session.sessionCode}`;

  // ─── Copy link feedback ───────────────────────────────────────────────────────
  const { copied: copiedLink, copyToClipboard } = useClipboardFeedback(2000);

  const handleCopyLink = useCallback(async () => {
    const success = await copyToClipboard(qrUrl);
    if (success) {
      showToast('Join link copied!', 'success');
    } else {
      showToast('Could not copy link.', 'error');
    }
  }, [qrUrl, showToast, copyToClipboard]);

  // ─── Join sound effect ────────────────────────────────────────────────────
  // Detect newly-joined students by name diff against the previous render
  // and surface a brief celebration toast at the top of the projector.
  // Teachers asked for "more icons when student joins" so the new student
  // is also visually highlighted via a stronger spring-in animation +
  // sparkle ring on their first render in the rank-4+ grid (see the
  // motion.div initial/animate values in the grid below).
  const prevStudentNamesRef = useRef<Set<string>>(new Set());
  const [recentJoiners, setRecentJoiners] = useState<{ name: string; avatar: string; ts: number }[]>([]);
  useEffect(() => {
    prevStudentCountRef.current = effectiveStudents.length;
    const currentNames = new Set(effectiveStudents.map(s => s.name));
    const newcomers: { name: string; avatar: string; ts: number }[] = [];
    for (const s of effectiveStudents) {
      if (!prevStudentNamesRef.current.has(s.name)) {
        // Inline the avatar fallback rather than calling getStudentAvatar
        // (declared further down in the file, would TDZ).
        newcomers.push({ name: s.name, avatar: s.avatar || '🦊', ts: Date.now() });
      }
    }
    if (newcomers.length > 0) {
      setRecentJoiners(prev => {
        // Keep at most 3 toasts on screen at once — drop the oldest if
        // a busy class fires faster than the timeout can prune.
        const merged = [...prev, ...newcomers];
        return merged.slice(-3);
      });
      // Auto-dismiss each toast 3.5s after it lands.
      newcomers.forEach(n => {
        setTimeout(() => {
          setRecentJoiners(prev => prev.filter(j => j.ts !== n.ts));
        }, 3500);
      });
    }
    prevStudentNamesRef.current = currentNames;
  }, [effectiveStudents]);

  // ─── Background music ──────────────────────────────────────────────────────
  const toggleMusic = () => {
    if (musicPlaying && musicRef.current) {
      musicRef.current.fade(musicVolume, 0, 300);
      setTimeout(() => {
        musicRef.current?.pause();
        musicRef.current?.volume(musicVolume);
        setMusicPlaying(false);
      }, 300);
    } else {
      if (!musicRef.current) {
        musicRef.current = new Howl({
          src: [getMusicUrl(MUSIC_TRACKS[currentTrack].file)],
          volume: 0,
          loop: true,
        });
      }
      musicRef.current.play();
      musicRef.current.fade(0, musicVolume, 500);
      setMusicPlaying(true);
    }
  };

  const changeTrack = (idx: number) => {
    setCurrentTrack(idx);
    try { localStorage.setItem('vocaband-music-track', String(idx)); } catch {}

    // Crossfade: fade out old, start new
    if (musicRef.current) {
      const old = musicRef.current;
      old.fade(musicVolume, 0, 500);
      setTimeout(() => { old.stop(); old.unload(); }, 500);
    }
    const newTrack = new Howl({
      src: [getMusicUrl(MUSIC_TRACKS[idx].file)],
      volume: 0,
      loop: true,
    });
    musicRef.current = newTrack;
    if (musicPlaying) {
      newTrack.play();
      newTrack.fade(0, musicVolume, 500);
    }
    setShowMusicPicker(false);
  };

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume(musicVolume);
    try { localStorage.setItem('vocaband-music-volume', String(musicVolume)); } catch {}
  }, [musicVolume]);

  // Cleanup music on unmount
  useEffect(() => {
    return () => {
      if (musicRef.current) {
        musicRef.current.stop();
        musicRef.current.unload();
      }
    };
  }, []);

  // ── Auto-shuffle every 2 minutes ─────────────────────────────────────
  // Per teacher request: while music is playing, automatically swap to
  // a different random track every 2 minutes so the same loop doesn't
  // become background-noise-blindness.  The manual track-picker still
  // works (changeTrack) — auto-shuffle just kicks in on top of it.
  // The interval only ticks while musicPlaying is true so toggling
  // music off pauses both the audio AND the shuffle timer.
  const AUTO_SHUFFLE_MS = 2 * 60 * 1000; // 2 minutes
  useEffect(() => {
    if (!musicPlaying) return;
    const id = setInterval(() => {
      if (MUSIC_TRACKS.length < 2) return;
      // Pick a random different track than the current one so the
      // shuffle is actually noticeable.
      let next = currentTrack;
      while (next === currentTrack) {
        next = Math.floor(Math.random() * MUSIC_TRACKS.length);
      }
      changeTrack(next);
    }, AUTO_SHUFFLE_MS);
    return () => clearInterval(id);
    // changeTrack is stable across renders for our purposes (uses
    // refs) — including only the shuffle gates here.  eslint-disable
    // is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicPlaying, currentTrack]);

  // ─── Remove student ───────────────────────────────────────────────────────
  const removeStudent = async (name: string) => {
    if (QUICKPLAY_V2) {
      // v2 path: kick via socket. The server finds the clientId, removes
      // them from the in-memory leaderboard, emits KICKED to their
      // socket, and broadcasts the refreshed leaderboard. No DB writes.
      const target = effectiveStudents.find(s => s.name === name);
      if (!target) {
        showToast(`Couldn't find ${name} in the live list.`, 'error');
        setConfirmKick(null);
        return;
      }
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      if (!token) {
        showToast('Your session expired. Please refresh and log in again.', 'error');
        setConfirmKick(null);
        return;
      }
      socket.kickStudent(target.studentUid, token);
      // Cache kicked name locally so the legacy-path kid (if any still
      // running old client) can't rejoin. Harmless under pure v2.
      try {
        const key = `vocaband_kicked_${session.id}`;
        const kicked: string[] = JSON.parse(localStorage.getItem(key) || '[]');
        if (!kicked.includes(name)) kicked.push(name);
        localStorage.setItem(key, JSON.stringify(kicked));
      } catch {}
      showToast(`${name} removed from session`, 'info');
      setConfirmKick(null);
      return;
    }

    // ─── Legacy path ────────────────────────────────────────────────────
    const { error } = await supabase
      .from('progress')
      .delete()
      .eq('assignment_id', session.id)
      .eq('student_name', name);
    if (error) {
      showToast(`Failed to remove ${name}: ${error.message}`, 'error');
    } else {
      setStudents((prev: Student[]) => prev.filter(s => s.name !== name));
      // Track kicked name in localStorage so they can't rejoin
      try {
        const key = `vocaband_kicked_${session.id}`;
        const kicked: string[] = JSON.parse(localStorage.getItem(key) || '[]');
        if (!kicked.includes(name)) kicked.push(name);
        localStorage.setItem(key, JSON.stringify(kicked));
      } catch {}
      showToast(`${name} removed from session`, 'info');
    }
    setConfirmKick(null);
  };

  // v2: additionally emit TEACHER_END on the socket so all connected
  // students get notified immediately. The parent still handles the
  // Supabase is_active=false flip via onEndSession().
  const handleEndSession = async () => {
    if (QUICKPLAY_V2) {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      if (token) socket.endSession(token);
    }
    onEndSession();
  };

  // ─── Sorted students ──────────────────────────────────────────────────────
  const sorted = useMemo(() =>
    [...effectiveStudents].sort((a, b) => b.score - a.score),
    [effectiveStudents]
  );
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // ─── Celebration SFX when the #1 spot changes ────────────────────────────
  //
  // Teachers projecting the monitor to a classroom want ambient energy when
  // a new leader takes over — otherwise the podium rearranges silently.  A
  // short WebAudio chime is plenty; no external asset needed.  We suppress
  // the sound on the first non-empty board (when there was no previous
  // leader to dethrone) so the teacher doesn't hear a chime the instant
  // the first student finishes a mode.
  const prevLeaderUidRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    const currentLeaderUid = sorted[0]?.studentUid ?? null;
    const prev = prevLeaderUidRef.current;
    // Only chime when leader actually changes AND we had a previous leader
    // (skip the initial 0→someone transition).
    if (currentLeaderUid && prev && currentLeaderUid !== prev) {
      try {
        if (!audioCtxRef.current) {
          // Lazy-create — some browsers require a user gesture to first
          // construct an AudioContext, so we guard the whole thing.
          audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        // C major triad arpeggio: E5, G5, C6 — a quick "dun-dun-DUN".
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
  }, [sorted]);

  // ─── Get student's chosen avatar (from DB) with fallback ───────────────────
  const getStudentAvatar = (student: Student) => student.avatar || '\uD83E\uDD8A';

  // CSS for float animation (injected once)
  const floatStyle = `@keyframes qp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`;

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} flex flex-col overflow-x-hidden overflow-y-auto transition-colors duration-500`}>
      <style>{floatStyle}</style>

      {/* ─── Recent-joiner toasts ─────────────────────────────────────────────
          Stack of brief 'X joined!' celebrations near the top so the
          teacher (and the rest of the class watching the projector) see
          who just walked in.  Self-dismissing after 3.5s.  Uses a fixed
          overlay so it sits above the TopAppBar without pushing layout. */}
      <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {recentJoiners.map(j => (
            <motion.div
              key={j.ts}
              initial={{ y: -20, opacity: 0, scale: 0.85 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-5 py-3 sm:px-6 sm:py-4 2xl:px-8 2xl:py-5 rounded-full shadow-2xl flex items-center gap-3 max-w-[90vw]"
            >
              <QPAvatar value={j.avatar} iconSize={32} className="text-2xl sm:text-3xl 2xl:text-4xl" />
              <div>
                <p className="font-headline text-xs sm:text-sm 2xl:text-base font-black uppercase tracking-widest opacity-90">{tT.qpJoinedFlag}</p>
                <p className="font-headline text-base sm:text-lg 2xl:text-xl font-black truncate max-w-[60vw]">{j.name}</p>
              </div>
              <span className="text-xl sm:text-2xl 2xl:text-3xl ml-1">✨</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ─── TopAppBar (glass header) ─────────────────────────────────────── */}
      <header className={`${t.headerBg} backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.06)] w-full sticky top-0 z-50 px-3 sm:px-8 py-2 sm:py-4 transition-colors duration-500`}>
        {/* Top row: logo + theme dots */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              if (musicRef.current) { musicRef.current.stop(); musicRef.current.unload(); musicRef.current = null; }
              setMusicPlaying(false);
              onBack();
            }}
            className={`font-headline font-black italic text-xl sm:text-2xl ${t.headerText} tracking-tighter hover:opacity-80 transition-opacity shrink-0`}
          >
            Vocaband
          </button>

          {/* Realtime status indicator.  Tells the teacher whether the
              podium is getting instant pushes or leaning on the polling
              fallback (up to ~5s delayed).  Silent for the happy path;
              loud only when degraded. */}
          <div className="flex items-center gap-2">
            <GuideTriggerButton onClick={guide.open} className="bg-white/10 text-current hover:bg-white/20" />
          <div
            title={
              realtimeStatus === 'live'
                ? 'Live updates: on'
                : realtimeStatus === 'polling'
                ? 'Live updates unavailable — refreshing every 5s'
                : 'Connecting…'
            }
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 text-xs font-bold"
          >
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                realtimeStatus === 'live'
                  ? 'bg-green-400 animate-pulse'
                  : realtimeStatus === 'polling'
                  ? 'bg-amber-400'
                  : 'bg-gray-400 animate-pulse'
              }`}
            />
            <span className={t.headerText}>
              {realtimeStatus === 'live' ? 'Live' : realtimeStatus === 'polling' ? 'Polling' : 'Connecting'}
            </span>
          </div>
          </div>

          {/* Theme color dots */}
          <div className={`flex items-center ${theme === 'neon' || theme === 'forest' || theme === 'galaxy' ? 'bg-white/10' : 'bg-surface-container'} rounded-full px-2 sm:px-3 py-1.5 gap-1.5`}>
            <Palette size={14} className={t.headerText} />
            <div className="flex gap-1">
              {Object.entries(THEMES).map(([key, th]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key as ThemeKey)}
                  className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full ${th.dot} transition-all ${
                    theme === key ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={th.name}
                />
              ))}
            </div>
          </div>
        </div>
        {/* Bottom row: music player (own line on mobile) */}
        <div className={`flex items-center mt-2 gap-2 w-full rounded-2xl px-3 py-2 ${
          theme === 'neon' || theme === 'forest' || theme === 'galaxy' ? 'bg-white/10' : 'bg-[var(--vb-surface-alt)]'
        }`}>
          {/* Now playing info */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg shrink-0">{MUSIC_TRACKS[currentTrack].icon}</span>
            <div className="min-w-0">
              <p className={`text-[11px] font-bold truncate ${t.headerText}`}>{MUSIC_TRACKS[currentTrack].name}</p>
              <p className={`text-[9px] ${t.headerText} opacity-50`}>{tT.qpBackgroundMusic}</p>
            </div>
          </div>

          {/* Transport controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => changeTrack((currentTrack - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length)}
              className={`p-1.5 rounded-full ${t.headerText} opacity-60 hover:opacity-100 transition-opacity`}
              title={tT.qpPrevTrackTitle}
            >
              <SkipBack size={14} fill="currentColor" />
            </button>
            <button
              onClick={toggleMusic}
              className={`p-2 rounded-full ${
                musicPlaying
                  ? 'bg-white/20 shadow-inner'
                  : 'bg-gradient-to-br from-primary to-primary-dim shadow-md'
              } ${t.headerText} transition-all active:scale-90`}
              title={musicPlaying ? 'Pause' : 'Play'}
            >
              {musicPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
            <button
              onClick={() => changeTrack((currentTrack + 1) % MUSIC_TRACKS.length)}
              className={`p-1.5 rounded-full ${t.headerText} opacity-60 hover:opacity-100 transition-opacity`}
              title={tT.qpNextTrackTitle}
            >
              <SkipForward size={14} fill="currentColor" />
            </button>
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={toggleMusic} className={`${t.headerText} opacity-60`}>
              {musicVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              id="quick-play-monitor-volume"
              name="musicVolume"
              aria-label={tT.qpBackgroundMusicVolume}
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={e => setMusicVolume(parseFloat(e.target.value))}
              onWheel={handleVolumeWheel}
              className="w-14 sm:w-20 h-1.5 accent-primary cursor-pointer"
              title={`Volume: ${Math.round(musicVolume * 100)}% — scroll to adjust`}
            />
          </div>
        </div>
      </header>

      {/* ─── Main content ──────────────────────────────────────────────────── */}
      <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-8 pb-8">
        {/* ─── Hero: QR + Podium row ──────────────────────────────────────────
            When qrCollapsed is true the QR shrinks to a small floating
            icon button anchored to the right of this row, leaving the
            podium full-width — the teacher's primary visual is the
            scoreboard.  Tapping the icon opens the enlarged QR modal
            (qrEnlarged); the modal has Show-as-card to bring back the
            inline expanded card view, plus Share / Copy / Close.
            Tapping the inline expanded card's "Hide" button collapses
            it back to the floating icon. */}
        <section className={`grid grid-cols-1 ${qrCollapsed ? '' : 'lg:grid-cols-12'} gap-4 sm:gap-6 items-stretch mb-6 sm:mb-8 relative`}>
          {qrCollapsed ? (
            // Compact floating QR icon — replaces the old long
            // horizontal "Show QR" strip.  Click expands directly to
            // the inline card (not the modal) for faster teacher access.
            <button
              type="button"
              onClick={toggleQrCollapsed}
              aria-label={tT.qpShowQrAria}
              className={`absolute top-0 right-0 z-10 bg-gradient-to-br ${t.qrCard} rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all text-white flex flex-col items-center justify-center p-3 sm:p-4 ring-4 ring-white/30`}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any, minWidth: '80px', minHeight: '80px' }}
            >
              <QrCode size={36} className="sm:hidden" />
              <QrCode size={42} className="hidden sm:block" />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider mt-1 leading-none">{tT.qpShowQrShort}</span>
              {effectiveStudents.length > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 bg-green-500 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-md ring-2 ring-white/30">
                  {effectiveStudents.length}
                </span>
              )}
            </button>
          ) : (
          <div className={`lg:col-span-4 bg-gradient-to-br ${t.qrCard} rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shadow-lg relative overflow-hidden`}>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            {/* QR code container — sized so students at the back of
                the classroom can scan from their seats, but small
                enough that the session code + share button fit
                alongside it on standard desktops (the previous 2xl
                bump made it dominate the row and clip the text). */}
            <div className="bg-[var(--vb-surface)] p-2.5 rounded-lg shadow-xl shrink-0 cursor-pointer" onClick={() => setQrEnlarged(true)}>
              <div className="w-32 h-32 sm:w-40 sm:h-40 2xl:w-48 2xl:h-48 flex items-center justify-center">
                <QRCodeSVG
                  value={qrUrl}
                  size={192}
                  level="M"
                  marginSize={0}
                  style={{ width: '100%', height: '100%' }}
                  aria-label={tT.qpQrCodeAria}
                />
              </div>
            </div>
            <div className="flex flex-col justify-center text-white min-w-0 flex-1 text-center sm:text-left">
              <span className="font-label text-[10px] 2xl:text-xs uppercase tracking-[0.2em] opacity-80">{tT.qpJoinAtHost(window.location.host)}</span>
              {/* Session code — readable but supporting; QR is the
                  primary scan target, code is the type-by-hand fallback. */}
              <h2 className="font-headline text-2xl sm:text-3xl 2xl:text-4xl font-black tracking-tighter">{session.sessionCode}</h2>
              <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs 2xl:text-sm font-medium">{effectiveStudents.length > 0 ? tT.qpPlayersJoined(effectiveStudents.length) : tT.qpWaitingForPlayers}</span>
              </div>
              {/* Share button — prominent on both mobile and desktop so
                  the teacher can fire it with one tap during class.
                  Prefers the native share sheet on mobile (AirDrop,
                  Messages, WhatsApp, etc.) and falls back to clipboard
                  on desktop / browsers without Web Share API. */}
              <button
                type="button"
                onClick={async () => {
                  const shareData = {
                    title: 'Join my Vocaband game',
                    text: `Join my Vocaband Quick Play (code ${session.sessionCode}):`,
                    url: qrUrl,
                  };
                  if (typeof navigator.share === 'function') {
                    try {
                      await navigator.share(shareData);
                      return;
                    } catch {
                      // User cancelled or share failed — fall through to clipboard copy.
                    }
                  }
                  handleCopyLink();
                }}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-white/95 text-[var(--vb-text-primary)] font-bold text-sm sm:text-base px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-[0.97] transition-all"
              >
                <Share2 size={16} />
                Share join link
              </button>
              {/* Copy link button - same size as Share join link */}
              <button
                type="button"
                onClick={handleCopyLink}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-white/95 text-[var(--vb-text-primary)] font-bold text-sm sm:text-base px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-[0.97] transition-all"
              >
                {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copiedLink ? 'Copied!' : 'Copy link'}
              </button>
              {/* Words + End Session — smaller buttons, same width as above buttons */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowWordsModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm px-3 py-2.5 rounded-xl transition-colors"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <BookOpen size={14} />
                  Words
                </button>
                <button
                  type="button"
                  onClick={() => setEndModal(true)}
                  className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm px-3 py-2.5 rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/50 border-2 border-red-400 transition-all active:scale-95"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                  title="⚠️ Ends the Quick Play session for all students"
                >
                  <ShieldAlert size={14} className="text-yellow-300" />
                  End Session
                </button>
              </div>
              {/* Hide button — collapses to the chip strip above. */}
              <button
                type="button"
                onClick={toggleQrCollapsed}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                Hide QR
              </button>
            </div>
          </div>
          )}

          {/* Podium Section.  Sized in 4 tiers:
                 base — phones (wraps to its own row above the QR)
                 sm:  — tablets / small laptops (1024px+)
                 2xl: — regular desktops (1536px+, mostly teacher PCs)
                 min-[1700px]: — classroom projectors / 4K wall-mounts.
                                Bigger podium so first 3 places are
                                clearly readable from across the room.
                                Per teacher request 2026-04-30. */}
          <div className={`${qrCollapsed ? '' : 'lg:col-span-8'} ${t.podiumCard} rounded-xl p-4 sm:p-6 min-[1700px]:p-10 flex items-end justify-center gap-3 sm:gap-6 min-[1700px]:gap-10 relative overflow-hidden border shadow-inner min-h-[220px] sm:min-h-[280px] min-[1700px]:min-h-[420px]`}>
            <div className={`absolute top-3 left-4 font-label text-[10px] min-[1700px]:text-base uppercase tracking-widest opacity-30 font-black ${t.text}`}>{tT.qpCurrentLeaders}</div>

            {top3.length > 0 ? (
              <>
                {/* 2nd place */}
                <div className="flex flex-col items-center gap-1.5 min-[1700px]:gap-3">
                  {top3[1] ? (
                    <>
                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="relative group" style={{ animation: 'qp-float 3s ease-in-out infinite 0.5s' }}>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 2xl:w-20 2xl:h-20 min-[1700px]:w-32 min-[1700px]:h-32 rounded-full bg-surface-container-high flex items-center justify-center text-2xl sm:text-3xl 2xl:text-4xl min-[1700px]:text-6xl border-4 border-surface-container-highest shadow-lg"><QPAvatar value={getStudentAvatar(top3[1])} iconSize={48} className="text-2xl sm:text-3xl 2xl:text-4xl min-[1700px]:text-6xl" /></div>
                        <div className={`absolute -top-1 -right-1 ${t.badge2} text-[9px] 2xl:text-xs min-[1700px]:text-base font-black px-1.5 py-0.5 min-[1700px]:px-3 min-[1700px]:py-1 rounded-full shadow-sm`}>2nd</div>
                        {/* Teacher-only kick affordance — same hover-
                            reveal pattern as the rank-4+ tiles.  Top-3
                            students can be kicked too if their name /
                            behaviour warrants it (per teacher request
                            2026-04-30). */}
                        <button
                          onClick={() => setConfirmKick(top3[1].name)}
                          aria-label={tT.qpRemovePlayerAria(top3[1].name)}
                          title={tT.qpRemovePlayerAria(top3[1].name)}
                          className="absolute -top-2 -left-2 p-1 rounded-full opacity-0 group-hover:opacity-100 bg-error/90 text-on-error transition-opacity z-20 shadow-md"
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                      <p className={`font-headline text-xs sm:text-sm 2xl:text-base min-[1700px]:text-2xl font-bold truncate max-w-[80px] 2xl:max-w-[120px] min-[1700px]:max-w-[180px] text-center ${t.text}`}>{top3[1].name}</p>
                      <p className={`font-label text-[10px] 2xl:text-sm min-[1700px]:text-xl ${t.accent} font-bold`}>{top3[1].score} pts</p>
                      <motion.div initial={{ height: 0 }} animate={{ height: 80 }} transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }} className={`w-20 sm:w-24 2xl:w-28 min-[1700px]:w-40 min-[1700px]:!h-32 bg-gradient-to-b ${t.podium2} rounded-t-xl flex items-center justify-center shadow-xl overflow-hidden`}>
                        <span className="text-white/20 text-4xl 2xl:text-5xl min-[1700px]:text-7xl font-black">2</span>
                      </motion.div>
                    </>
                  ) : <div className="w-20" style={{ height: 140 }} />}
                </div>

                {/* 1st place */}
                <div className="flex flex-col items-center gap-1.5 min-[1700px]:gap-3">
                  {top3[0] && (
                    <>
                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="relative group" style={{ animation: 'qp-float 3s ease-in-out infinite' }}>
                        <div className={`w-18 h-18 sm:w-20 sm:h-20 2xl:w-24 2xl:h-24 min-[1700px]:w-44 min-[1700px]:h-44 rounded-full bg-surface-container-high flex items-center justify-center text-3xl sm:text-4xl 2xl:text-5xl min-[1700px]:text-8xl border-4 min-[1700px]:border-8 border-primary shadow-2xl scale-110`}><QPAvatar value={getStudentAvatar(top3[0])} iconSize={56} className="text-3xl sm:text-4xl 2xl:text-5xl min-[1700px]:text-8xl" /></div>
                        <div className={`absolute -top-1 -right-1 ${t.badge1} text-[10px] 2xl:text-xs min-[1700px]:text-lg font-black px-2 py-0.5 min-[1700px]:px-4 min-[1700px]:py-1.5 rounded-full shadow-md`}>1st</div>
                        <button
                          onClick={() => setConfirmKick(top3[0].name)}
                          aria-label={tT.qpRemovePlayerAria(top3[0].name)}
                          title={tT.qpRemovePlayerAria(top3[0].name)}
                          className="absolute -top-2 -left-2 p-1 rounded-full opacity-0 group-hover:opacity-100 bg-error/90 text-on-error transition-opacity z-20 shadow-md"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                      <p className={`font-headline text-sm sm:text-lg 2xl:text-xl min-[1700px]:text-3xl font-black truncate max-w-[100px] 2xl:max-w-[140px] min-[1700px]:max-w-[220px] text-center ${t.text}`}>{top3[0].name}</p>
                      <p className={`font-label text-xs 2xl:text-base min-[1700px]:text-2xl ${t.accent} font-black`}>{top3[0].score} pts</p>
                      <motion.div initial={{ height: 0 }} animate={{ height: 128 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }} className={`w-24 sm:w-28 2xl:w-32 min-[1700px]:w-48 min-[1700px]:!h-52 bg-gradient-to-b ${t.podium1} rounded-t-xl flex items-center justify-center shadow-2xl overflow-hidden relative`}>
                        <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <span className="text-white/20 text-6xl 2xl:text-7xl min-[1700px]:text-9xl font-black relative z-10">1</span>
                      </motion.div>
                    </>
                  )}
                </div>

                {/* 3rd place */}
                <div className="flex flex-col items-center gap-1.5 min-[1700px]:gap-3">
                  {top3[2] ? (
                    <>
                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="relative group" style={{ animation: 'qp-float 3s ease-in-out infinite 1s' }}>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 2xl:w-20 2xl:h-20 min-[1700px]:w-32 min-[1700px]:h-32 rounded-full bg-surface-container-high flex items-center justify-center text-2xl sm:text-3xl 2xl:text-4xl min-[1700px]:text-6xl border-4 border-surface-container-highest shadow-lg"><QPAvatar value={getStudentAvatar(top3[2])} iconSize={48} className="text-2xl sm:text-3xl 2xl:text-4xl min-[1700px]:text-6xl" /></div>
                        <div className={`absolute -top-1 -right-1 ${t.badge3} text-[9px] 2xl:text-xs min-[1700px]:text-base font-black px-1.5 py-0.5 min-[1700px]:px-3 min-[1700px]:py-1 rounded-full shadow-sm`}>3rd</div>
                        <button
                          onClick={() => setConfirmKick(top3[2].name)}
                          aria-label={tT.qpRemovePlayerAria(top3[2].name)}
                          title={tT.qpRemovePlayerAria(top3[2].name)}
                          className="absolute -top-2 -left-2 p-1 rounded-full opacity-0 group-hover:opacity-100 bg-error/90 text-on-error transition-opacity z-20 shadow-md"
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                      <p className={`font-headline text-xs sm:text-sm 2xl:text-base min-[1700px]:text-2xl font-bold truncate max-w-[80px] 2xl:max-w-[120px] min-[1700px]:max-w-[180px] text-center ${t.text}`}>{top3[2].name}</p>
                      <p className={`font-label text-[10px] 2xl:text-sm min-[1700px]:text-xl ${t.accent} font-bold`}>{top3[2].score} pts</p>
                      <motion.div initial={{ height: 0 }} animate={{ height: 64 }} transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }} className={`w-20 sm:w-24 2xl:w-28 min-[1700px]:w-40 min-[1700px]:!h-24 bg-gradient-to-b ${t.podium3} rounded-t-xl flex items-center justify-center shadow-xl overflow-hidden`}>
                        <span className="text-white/20 text-4xl 2xl:text-5xl min-[1700px]:text-7xl font-black">3</span>
                      </motion.div>
                    </>
                  ) : <div className="w-20" style={{ height: 120 }} />}
                </div>
              </>
            ) : (
              <div className="text-center py-8 2xl:py-16 w-full">
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Users size={48} className="mx-auto mb-3 opacity-20 2xl:scale-150" />
                </motion.div>
                <p className={`font-headline font-bold text-base 2xl:text-3xl ${t.text} opacity-60`}>{tT.qpWaitingForPlayers}</p>
                <p className={`text-sm 2xl:text-xl ${t.text} opacity-40 mt-1`}>{tT.qpShareQrToStart}</p>
              </div>
            )}
          </div>
        </section>

        {/* ─── Rank 4+ vertical list ───────────────────────────────────────────
            Top-3 are rendered on the podium hero above; everyone from
            rank 4 onward shows here as a numbered vertical list.  The
            row order updates with motion.div's `layout` prop, so when
            a student passes another the rows shuffle smoothly without
            any extra animation code -- Framer Motion's FLIP handles
            the transitions for free.  Cap of 100 students per session
            (QP_MAX_STUDENTS_PER_SESSION) means the list never gets
            unwieldy.  No internal max-height -- the page just scrolls
            naturally below the podium hero, so newly-joined students
            always have a visible row.
        */}
        {sorted.length > 3 && (
          <section>
            <h3 className={`font-label text-[10px] 2xl:text-xs uppercase tracking-[0.2em] opacity-50 font-black mb-3 ${t.text}`}>
              Players · rank 4+
            </h3>
            {/* Responsive grid: 1 col on phones, 2 on tablets, 3 on
                desktops, 4 on classroom projectors / 4K screens.
                Replaces the previous full-width single-row layout
                that wasted ~70% of horizontal space and made each
                avatar+name tiny when projected.  Tiles are now bigger
                and easier to read across the room. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3">
              <AnimatePresence mode="popLayout">
                {sorted.slice(3).map((student, idx) => {
                  const rank = idx + 4;
                  const isOnline = (Date.now() - new Date(student.lastSeen).getTime()) < 60000;
                  // Newly-joined within the last 4s — give them a brief
                  // sparkle ring + bigger spring-in so they pop into
                  // view across the projector.
                  const justJoined = recentJoiners.some(j => j.name === student.name);
                  return (
                    <motion.div
                      key={student.name}
                      layout
                      initial={justJoined
                        ? { scale: 0.6, opacity: 0, y: 20 }
                        : { x: -20, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                      className={`${t.card} rounded-xl px-3 sm:px-4 py-3 2xl:py-4 flex items-center gap-3 2xl:gap-4 shadow-sm hover:shadow-md transition-all border group relative ${
                        justJoined ? 'ring-4 ring-emerald-400/60 ring-offset-2 ring-offset-transparent' : ''
                      }`}
                    >
                      {/* Kick on hover */}
                      <button
                        onClick={() => setConfirmKick(student.name)}
                        className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 bg-error/80 text-on-error transition-all z-10"
                        title={tT.qpRemovePlayerAria(student.name)}
                      >
                        <X size={10} />
                      </button>
                      <span className={`font-headline text-base sm:text-lg 2xl:text-2xl font-black tabular-nums w-8 2xl:w-12 text-center shrink-0 ${t.accent}`}>
                        {rank}
                      </span>
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 2xl:w-16 2xl:h-16 rounded-full bg-surface-container-high flex items-center justify-center text-2xl sm:text-2xl 2xl:text-3xl border-2 border-surface-container-highest">
                          <QPAvatar value={getStudentAvatar(student)} iconSize={28} className="text-2xl sm:text-2xl 2xl:text-3xl" />
                        </div>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-headline text-sm sm:text-base 2xl:text-xl font-bold truncate block">
                          {student.name}
                        </span>
                        <span className={`font-label text-xs sm:text-sm 2xl:text-base font-black tabular-nums ${t.accent}`}>
                          {student.score} pts
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>
        )}
      </main>

      {/* Bottom nav bar removed per teacher request — Words + End
          Session moved into the QR card so every action lives in one
          place and the podium owns the full vertical space. */}

      {/* ─── Enlarged QR Modal ───────────────────────────────────────────────
          Acts as the primary "show me the QR" surface when qrCollapsed
          is true (the icon-button route).  Includes Share / Copy /
          Show-as-card / Close so the teacher can do everything from
          inside the modal without re-tapping the small icon. */}
      <AnimatePresence>
        {qrEnlarged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-[100] cursor-pointer"
            onClick={() => setQrEnlarged(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              drag
              dragMomentum={false}
              dragElastic={0}
              whileDrag={{ scale: 1.02 }}
              className="bg-[var(--vb-surface)] rounded-3xl max-w-lg w-full shadow-2xl cursor-default relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Draggable header area - grab anywhere here to move */}
              <div className="bg-[var(--vb-surface-alt)] px-6 py-3 cursor-grab active:cursor-grabbing border-b border-[var(--vb-border)] flex items-center justify-center select-none">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 bg-[var(--vb-border)] rounded-full" />
                  <div className="w-3 h-3 bg-[var(--vb-border)] rounded-full" />
                  <div className="w-3 h-3 bg-[var(--vb-border)] rounded-full" />
                </div>
                <span className="ml-2 text-xs font-semibold text-[var(--vb-text-muted)] uppercase tracking-wider">{tT.qpDragToMove}</span>
              </div>

              <div className="p-6 sm:p-10">
                <div className="aspect-square w-full mx-auto flex items-center justify-center">
                {/* Enlarged QR (click-to-zoom).  Same client-side generator
                    as the header version — SVG scales cleanly to any
                    projector resolution. */}
                <QRCodeSVG
                  value={qrUrl}
                  size={600}
                  level="M"
                  marginSize={2}
                  style={{ width: '100%', height: '100%' }}
                  aria-label={tT.qpQrCodeEnlargedAria}
                />
              </div>
              <p className="text-center text-purple-600 font-mono font-black text-2xl sm:text-3xl mt-4">
                {session.sessionCode}
              </p>
              <p className="text-center text-[var(--vb-text-muted)] text-sm mt-1">{tT.qpScanToJoin}</p>

              {/* Share row — Web Share API on mobile (AirDrop /
                  Messages / WhatsApp), clipboard fallback elsewhere.
                  Mirrors the inline expanded card's share affordances
                  so kids can be invited via a copy/paste link too. */}
              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const shareData = {
                      title: 'Join my Vocaband game',
                      text: `Join my Vocaband Quick Play (code ${session.sessionCode}):`,
                      url: qrUrl,
                    };
                    if (typeof navigator.share === 'function') {
                      try { await navigator.share(shareData); return; } catch { /* fall through */ }
                    }
                    handleCopyLink();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-br from-primary to-primary-dim text-white font-bold py-3 rounded-2xl shadow-md active:scale-[0.97] transition-all"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <Share2 size={16} /> Share
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-3 bg-[var(--vb-surface-alt)] hover:bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] rounded-2xl font-bold transition-colors inline-flex items-center gap-2"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Pin / Close row.  "Show as card" sets qrCollapsed=false
                  and dismisses the modal so the inline expanded QR card
                  is back on the page (for teachers who prefer the QR
                  always visible to late joiners).  "Close" goes back to
                  the small floating icon. */}
              <div className="mt-3 flex items-center gap-2">
                {qrCollapsed && (
                  <button
                    type="button"
                    onClick={() => { setQrCollapsed(false); try { localStorage.setItem('vocaband-qp-qr-collapsed', '0'); } catch {} setQrEnlarged(false); }}
                    className="flex-1 py-3 bg-[var(--vb-surface-alt)] hover:bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] rounded-2xl font-bold transition-colors text-sm"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                  >
                    Pin to page
                  </button>
                )}
                <button
                  onClick={() => setQrEnlarged(false)}
                  className="flex-1 py-3 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold transition-colors"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  Close
                </button>
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Kick Confirmation Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {confirmKick && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--vb-surface)] rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">{tT.qpRemovePlayerTitle}</h2>
              <p className="text-gray-500 mb-6">
                {tT.qpConfirmKickBefore}<strong>{confirmKick}</strong>{tT.qpConfirmKickAfter}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmKick(null)}
                  className="flex-1 py-3 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] rounded-2xl font-bold hover:bg-[var(--vb-surface-alt)] transition-colors border-2 border-[var(--vb-border)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeStudent(confirmKick)}
                  className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors shadow-lg"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── End Session Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {endModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[100]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--vb-surface)] rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl"
            >
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">{tT.qpEndSessionTitle}</h2>
              <p className="text-gray-500 mb-6">
                Students will no longer be able to join using code <strong>{session.sessionCode}</strong>. The session will be permanently ended.
              </p>
              <p className="text-amber-600 bg-amber-50 px-4 py-3 rounded-2xl mb-6 font-medium border-2 border-amber-200">
                {"\u26A0\uFE0F"} Make sure all students have finished their games before ending.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setEndModal(false)}
                  className="flex-1 py-4 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] rounded-2xl font-bold hover:bg-[var(--vb-surface-alt)] transition-all border-2 border-[var(--vb-border)]"
                >
                  Keep Session
                </button>
                <button
                  onClick={() => {
                    if (musicRef.current) { musicRef.current.stop(); musicRef.current.unload(); musicRef.current = null; }
                    setMusicPlaying(false);
                    setEndModal(false);
                    handleEndSession();
                  }}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  End Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Words Modal ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWordsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[100]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--vb-surface)] rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{tT.qpSelectedWords}</h2>
                    <p className="text-sm text-gray-500">{session.words.length} words in this session</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWordsModal(false)}
                  className="w-10 h-10 bg-[var(--vb-surface-alt)] hover:bg-[var(--vb-surface-alt)] rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {session.words.map((word, index) => (
                    <div
                      key={word.id}
                      className="bg-[var(--vb-surface)] border-2 border-[var(--vb-border)] rounded-2xl p-3 text-center hover:border-blue-300 transition-colors"
                    >
                      <div className="text-xs text-[var(--vb-text-muted)] font-bold mb-1">#{index + 1}</div>
                      <div className="text-base font-black text-[var(--vb-text-primary)]">{word.english}</div>
                      <div className="text-sm text-[var(--vb-text-secondary)] mt-1">{word.hebrew || word.arabic || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowWordsModal(false)}
                className="mt-6 w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FirstTimeGuide
        isOpen={guide.isOpen}
        onDone={guide.dismiss}
        heading={guideStrings.heading}
        subheading={guideStrings.subheading}
        steps={guideStrings.steps}
      />
    </div>
  );
}
