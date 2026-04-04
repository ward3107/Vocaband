import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Copy, Users, BookOpen, QrCode, LogOut, Volume2, VolumeX,
  ChevronDown, Music, Palette
} from 'lucide-react';
import { Howl } from 'howler';
import { Word } from '../data/vocabulary';
import { supabase } from '../core/supabase';

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
}

interface QuickPlayMonitorProps {
  session: QuickPlaySession;
  students: Student[];
  setStudents: (students: Student[] | ((prev: Student[]) => Student[])) => void;
  onBack: () => void;
  onEndSession: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// ─── Random avatars for students ─────────────────────────────────────────────
const ANIMAL_AVATARS = [
  '🦊', '🐸', '🦁', '🐼', '🐨', '🦋', '🐙', '🦄',
  '🐳', '🐰', '🦈', '🐯', '🦉', '🐺', '🦜', '🐹',
  '🦝', '🐧', '🦚', '🐝', '🦩', '🐬', '🦎', '🐢',
];

// ─── Theme definitions (light surface + accent colors) ────────────────────────
const THEMES = {
  classic: {
    name: 'Classic', icon: '\uD83D\uDC9C', dot: 'bg-primary',
    bg: 'bg-surface', text: 'text-on-surface',
    card: 'bg-surface-container-lowest border-surface-container-highest',
    qrCard: 'from-primary to-primary-container',
    podium1: 'from-primary-container to-primary', podium2: 'from-tertiary-fixed to-tertiary', podium3: 'from-secondary-container to-secondary',
    accent: 'text-primary', accentBg: 'bg-primary', badge1: 'bg-primary text-on-primary', badge2: 'bg-tertiary text-on-tertiary', badge3: 'bg-secondary text-on-secondary',
  },
  neon: {
    name: 'Neon Night', icon: '\uD83C\uDF03', dot: 'bg-gray-900',
    bg: 'bg-gray-950', text: 'text-white',
    card: 'bg-white/5 border-cyan-500/20',
    qrCard: 'from-cyan-600 to-purple-700',
    podium1: 'from-yellow-400 to-yellow-600', podium2: 'from-cyan-400 to-cyan-600', podium3: 'from-pink-400 to-pink-600',
    accent: 'text-cyan-400', accentBg: 'bg-cyan-500', badge1: 'bg-yellow-400 text-yellow-900', badge2: 'bg-cyan-400 text-cyan-900', badge3: 'bg-pink-400 text-pink-900',
  },
  ocean: {
    name: 'Ocean', icon: '\uD83C\uDF0A', dot: 'bg-secondary',
    bg: 'bg-surface', text: 'text-on-surface',
    card: 'bg-surface-container-lowest border-secondary-container',
    qrCard: 'from-secondary to-secondary-container',
    podium1: 'from-yellow-400 to-amber-300', podium2: 'from-blue-300 to-blue-500', podium3: 'from-teal-300 to-teal-500',
    accent: 'text-secondary', accentBg: 'bg-secondary', badge1: 'bg-yellow-400 text-yellow-900', badge2: 'bg-blue-500 text-white', badge3: 'bg-teal-500 text-white',
  },
  sunset: {
    name: 'Sunset', icon: '\uD83C\uDF05', dot: 'bg-error-container',
    bg: 'bg-surface', text: 'text-on-surface',
    card: 'bg-surface-container-lowest border-error-container/30',
    qrCard: 'from-error-container to-error',
    podium1: 'from-yellow-300 to-amber-400', podium2: 'from-rose-300 to-rose-500', podium3: 'from-orange-300 to-orange-500',
    accent: 'text-error', accentBg: 'bg-error', badge1: 'bg-yellow-400 text-yellow-900', badge2: 'bg-rose-500 text-white', badge3: 'bg-orange-500 text-white',
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
  if (cloudflareUrl) return `${cloudflareUrl}/music/${file}.wav`;
  return `/music/${file}.wav`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuickPlayMonitor({
  session,
  students,
  setStudents,
  onBack,
  onEndSession,
  showToast,
}: QuickPlayMonitorProps) {
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const [endModal, setEndModal] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>('classic');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(() => {
    try { return parseInt(localStorage.getItem('vocaband-music-track') || '0') || 0; } catch { return 0; }
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    try { return parseFloat(localStorage.getItem('vocaband-music-volume') || '0.5') || 0.5; } catch { return 0.5; }
  });
  const musicRef = useRef<Howl | null>(null);
  const joinSoundRef = useRef<Howl | null>(null);
  const prevStudentCountRef = useRef(students.length);

  const t = THEMES[theme];

  // QR URL
  const getNetworkOrigin = () => {
    return window.location.origin;
  };
  const qrUrl = `${getNetworkOrigin()}/quick-play?session=${session.sessionCode}`;

  // ─── Join sound effect ────────────────────────────────────────────────────
  useEffect(() => {
    // Create a simple join sound using a short motivational clip
    joinSoundRef.current = new Howl({
      src: ['/motivational/correct.mp3'],
      volume: 0.4,
      preload: true,
    });
    return () => {
      joinSoundRef.current?.unload();
    };
  }, []);

  // Play join sound when new student joins
  useEffect(() => {
    if (students.length > prevStudentCountRef.current) {
      joinSoundRef.current?.play();
    }
    prevStudentCountRef.current = students.length;
  }, [students.length]);

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

  // ─── Remove student ───────────────────────────────────────────────────────
  const [confirmKick, setConfirmKick] = useState<string | null>(null);

  const removeStudent = async (name: string) => {
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

  // ─── Sorted students ──────────────────────────────────────────────────────
  const sorted = useMemo(() =>
    [...students].sort((a, b) => b.score - a.score),
    [students]
  );
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // ─── Assign consistent avatar per student ──────────────────────────────────
  const getAvatar = (name: string, idx: number) => {
    // Use a hash of the name to pick a consistent avatar
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    return ANIMAL_AVATARS[Math.abs(hash) % ANIMAL_AVATARS.length];
  };

  // CSS for float animation (injected once)
  const floatStyle = `@keyframes qp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`;

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} flex flex-col overflow-hidden transition-colors duration-500`}>
      <style>{floatStyle}</style>

      {/* ─── TopAppBar (glass header) ─────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.06)] w-full sticky top-0 z-50 flex justify-between items-center px-4 sm:px-8 py-3 sm:py-4">
        <div className="flex items-center gap-4 sm:gap-8">
          <button
            onClick={() => {
              if (musicRef.current) { musicRef.current.stop(); musicRef.current.unload(); musicRef.current = null; }
              setMusicPlaying(false);
              onBack();
            }}
            className="font-headline font-black italic text-xl sm:text-2xl text-primary tracking-tighter hover:opacity-80 transition-opacity"
          >
            Vocaband
          </button>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Theme color dots */}
          <div className="flex items-center bg-surface-container rounded-full px-3 py-1.5 gap-2">
            <Palette size={16} className="text-primary" />
            <div className="flex gap-1">
              {Object.entries(THEMES).map(([key, th]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key as ThemeKey)}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${th.dot} transition-all ${
                    theme === key ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={th.name}
                />
              ))}
            </div>
          </div>
          {/* Music select */}
          <div className="flex items-center bg-surface-container rounded-full px-3 py-1.5 gap-2">
            <button onClick={toggleMusic} className="text-primary" title={musicPlaying ? 'Pause' : 'Play'}>
              {musicPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <select
              value={currentTrack}
              onChange={e => changeTrack(parseInt(e.target.value))}
              className="bg-transparent border-none text-xs sm:text-sm font-headline font-semibold focus:ring-0 text-on-surface cursor-pointer pr-6"
            >
              {MUSIC_TRACKS.map((track, idx) => (
                <option key={track.file} value={idx}>{track.icon} {track.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* ─── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-32">
        {/* ─── Hero: QR + Podium row ────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch mb-6 sm:mb-8">
          {/* QR Code & Join Info */}
          <div className={`lg:col-span-4 bg-gradient-to-br ${t.qrCard} rounded-xl p-6 sm:p-8 flex items-center gap-6 shadow-lg relative overflow-hidden`}>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="bg-white p-2.5 rounded-lg shadow-xl shrink-0 cursor-pointer" onClick={() => setQrEnlarged(true)}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`}
                alt="Quick Play QR Code"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
              />
            </div>
            <div className="flex flex-col justify-center text-white min-w-0">
              <span className="font-label text-[10px] uppercase tracking-[0.2em] opacity-80">Join at {window.location.host}</span>
              <h2 className="font-headline text-3xl sm:text-4xl font-black tracking-tighter">{session.sessionCode}</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium">{students.length > 0 ? `${students.length} players joined` : 'Waiting for players...'}</span>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(qrUrl); showToast('Link copied!', 'success'); }}
                className="mt-3 flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white transition-colors"
              >
                <Copy size={12} /> Copy Link
              </button>
            </div>
          </div>

          {/* Podium Section */}
          <div className={`lg:col-span-8 ${t.card} rounded-xl p-4 sm:p-6 flex items-end justify-center gap-3 sm:gap-6 relative overflow-hidden border shadow-inner min-h-[220px] sm:min-h-[280px]`}>
            <div className="absolute top-3 left-4 font-label text-[10px] uppercase tracking-widest opacity-30 font-black">Current Leaders</div>

            {top3.length > 0 ? (
              <>
                {/* 2nd place */}
                <div className="flex flex-col items-center gap-1.5">
                  {top3[1] ? (
                    <>
                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="relative" style={{ animation: 'qp-float 3s ease-in-out infinite 0.5s' }}>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-container-high flex items-center justify-center text-2xl sm:text-3xl border-4 border-surface-container-highest shadow-lg">{getAvatar(top3[1].name, 1)}</div>
                        <div className={`absolute -top-1 -right-1 ${t.badge2} text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm`}>2nd</div>
                      </motion.div>
                      <p className="font-headline text-xs sm:text-sm font-bold truncate max-w-[80px] text-center">{top3[1].name}</p>
                      <p className={`font-label text-[10px] ${t.accent} font-bold`}>{top3[1].score} pts</p>
                      <motion.div initial={{ height: 0 }} animate={{ height: 80 }} transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }} className={`w-20 sm:w-24 bg-gradient-to-b ${t.podium2} rounded-t-xl flex items-center justify-center shadow-xl overflow-hidden`}>
                        <span className="text-white/20 text-4xl font-black">2</span>
                      </motion.div>
                    </>
                  ) : <div className="w-20" style={{ height: 140 }} />}
                </div>

                {/* 1st place */}
                <div className="flex flex-col items-center gap-1.5">
                  {top3[0] && (
                    <>
                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="relative" style={{ animation: 'qp-float 3s ease-in-out infinite' }}>
                        <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-surface-container-high flex items-center justify-center text-3xl sm:text-4xl border-4 border-primary shadow-2xl scale-110`}>{getAvatar(top3[0].name, 0)}</div>
                        <div className={`absolute -top-1 -right-1 ${t.badge1} text-[10px] font-black px-2 py-0.5 rounded-full shadow-md`}>1st</div>
                      </motion.div>
                      <p className="font-headline text-sm sm:text-lg font-black truncate max-w-[100px] text-center">{top3[0].name}</p>
                      <p className={`font-label text-xs ${t.accent} font-black`}>{top3[0].score} pts</p>
                      <motion.div initial={{ height: 0 }} animate={{ height: 128 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }} className={`w-24 sm:w-28 bg-gradient-to-b ${t.podium1} rounded-t-xl flex items-center justify-center shadow-2xl overflow-hidden relative`}>
                        <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <span className="text-white/20 text-6xl font-black relative z-10">1</span>
                      </motion.div>
                    </>
                  )}
                </div>

                {/* 3rd place */}
                <div className="flex flex-col items-center gap-1.5">
                  {top3[2] ? (
                    <>
                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="relative" style={{ animation: 'qp-float 3s ease-in-out infinite 1s' }}>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-container-high flex items-center justify-center text-2xl sm:text-3xl border-4 border-surface-container-highest shadow-lg">{getAvatar(top3[2].name, 2)}</div>
                        <div className={`absolute -top-1 -right-1 ${t.badge3} text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm`}>3rd</div>
                      </motion.div>
                      <p className="font-headline text-xs sm:text-sm font-bold truncate max-w-[80px] text-center">{top3[2].name}</p>
                      <p className={`font-label text-[10px] ${t.accent} font-bold`}>{top3[2].score} pts</p>
                      <motion.div initial={{ height: 0 }} animate={{ height: 64 }} transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }} className={`w-20 sm:w-24 bg-gradient-to-b ${t.podium3} rounded-t-xl flex items-center justify-center shadow-xl overflow-hidden`}>
                        <span className="text-white/20 text-4xl font-black">3</span>
                      </motion.div>
                    </>
                  ) : <div className="w-20" style={{ height: 120 }} />}
                </div>
              </>
            ) : (
              <div className="text-center py-8 w-full">
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Users size={48} className="mx-auto mb-3 opacity-20" />
                </motion.div>
                <p className="font-headline font-bold text-on-surface-variant">Waiting for players...</p>
                <p className="text-sm text-on-surface-variant/60 mt-1">Share the QR code to get started</p>
              </div>
            )}
          </div>
        </section>

        {/* ─── Student Grid ────────────────────────────────────────────────── */}
        {sorted.length > 0 && (
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              <AnimatePresence mode="popLayout">
                {sorted.map((student, idx) => {
                  const isOnline = (Date.now() - new Date(student.lastSeen).getTime()) < 60000;
                  return (
                    <motion.div
                      key={student.name}
                      layout
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className={`${t.card} rounded-lg p-3 sm:p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all border group relative`}
                    >
                      {/* Kick on hover */}
                      <button
                        onClick={() => setConfirmKick(student.name)}
                        className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 bg-error/80 text-on-error transition-all z-10"
                        title={`Remove ${student.name}`}
                      >
                        <X size={10} />
                      </button>
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface-container-high flex items-center justify-center text-xl sm:text-2xl border-2 border-surface-container-highest">
                          {student.avatar !== '\uD83E\uDD8A' ? student.avatar : getAvatar(student.name, idx)}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-headline text-xs sm:text-sm font-bold truncate">{student.name}</span>
                        <span className="font-label text-[9px] sm:text-[10px] text-on-surface-variant font-medium">{student.score} pts</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>
        )}
      </main>

      {/* ─── Bottom Nav Bar ────────────────────────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-end px-6 pb-4 sm:pb-6 pt-3 bg-white/90 backdrop-blur-md shadow-[0_-4px_30px_rgba(0,0,0,0.08)] rounded-t-[2rem] sm:rounded-t-[3rem]">
        <div className={`flex flex-col items-center p-2 ${t.accent}`}>
          <Users size={22} />
          <span className="font-label text-[9px] uppercase tracking-widest font-bold mt-1">Monitor</span>
        </div>
        <div className="flex flex-col items-center text-on-surface-variant p-2 opacity-40">
          <BookOpen size={22} />
          <span className="font-label text-[9px] uppercase tracking-widest font-bold mt-1">Words</span>
        </div>
        <button
          onClick={() => setEndModal(true)}
          className={`flex flex-col items-center ${t.accentBg} text-white rounded-full p-3 sm:p-4 scale-110 -translate-y-3 shadow-lg active:scale-95 transition-all`}
        >
          <X size={22} />
          <span className="font-label text-[9px] uppercase tracking-widest font-bold mt-0.5">Stop</span>
        </button>
      </footer>

      {/* ─── Enlarged QR Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {qrEnlarged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] cursor-pointer"
            onClick={() => setQrEnlarged(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-10 max-w-lg w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="aspect-square w-full mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrUrl)}`}
                  alt="Quick Play QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-center text-purple-600 font-mono font-black text-2xl sm:text-3xl mt-4">
                {session.sessionCode}
              </p>
              <p className="text-center text-stone-400 text-sm mt-1">Scan to join</p>
              <button
                onClick={() => setQrEnlarged(false)}
                className="mt-4 w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl font-bold transition-colors"
              >
                Close
              </button>
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
              className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Remove Player?</h2>
              <p className="text-gray-500 mb-6">
                Remove <strong>{confirmKick}</strong> from this Quick Play session?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmKick(null)}
                  className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-colors border-2 border-stone-200"
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
              className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl"
            >
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">End Quick Play Session?</h2>
              <p className="text-gray-500 mb-6">
                Students will no longer be able to join using code <strong>{session.sessionCode}</strong>. The session will be permanently ended.
              </p>
              <p className="text-amber-600 bg-amber-50 px-4 py-3 rounded-2xl mb-6 font-medium border-2 border-amber-200">
                {"\u26A0\uFE0F"} Make sure all students have finished their games before ending.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setEndModal(false)}
                  className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all border-2 border-stone-200"
                >
                  Keep Session
                </button>
                <button
                  onClick={() => {
                    if (musicRef.current) { musicRef.current.stop(); musicRef.current.unload(); musicRef.current = null; }
                    setMusicPlaying(false);
                    setEndModal(false);
                    onEndSession();
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
    </div>
  );
}
