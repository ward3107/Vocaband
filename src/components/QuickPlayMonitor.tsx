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

// ─── Theme definitions ────────────────────────────────────────────────────────
const THEMES = {
  classic: {
    name: 'Classic',
    icon: '💜',
    bg: 'from-indigo-600 via-purple-600 to-pink-500',
    card: 'bg-white/10 border-white/20',
    accent: 'bg-purple-500',
    podiumGold: 'from-yellow-400 to-amber-300',
    podiumSilver: 'from-slate-300 to-slate-200',
    podiumBronze: 'from-orange-400 to-orange-300',
  },
  neon: {
    name: 'Neon Night',
    icon: '🌃',
    bg: 'from-gray-900 via-gray-800 to-gray-900',
    card: 'bg-white/5 border-cyan-500/30',
    accent: 'bg-cyan-500',
    podiumGold: 'from-yellow-400 to-yellow-200',
    podiumSilver: 'from-cyan-400 to-cyan-200',
    podiumBronze: 'from-pink-500 to-pink-300',
  },
  ocean: {
    name: 'Ocean',
    icon: '🌊',
    bg: 'from-blue-700 via-cyan-600 to-teal-500',
    card: 'bg-white/10 border-white/20',
    accent: 'bg-teal-500',
    podiumGold: 'from-yellow-400 to-amber-300',
    podiumSilver: 'from-blue-300 to-blue-200',
    podiumBronze: 'from-teal-400 to-teal-300',
  },
  sunset: {
    name: 'Sunset',
    icon: '🌅',
    bg: 'from-orange-500 via-rose-500 to-purple-600',
    card: 'bg-white/10 border-white/20',
    accent: 'bg-rose-500',
    podiumGold: 'from-yellow-300 to-yellow-100',
    podiumSilver: 'from-rose-300 to-rose-200',
    podiumBronze: 'from-orange-400 to-orange-300',
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
    const origin = window.location.origin;
    if (origin.includes('localhost')) return 'http://10.0.0.5:3000';
    return origin;
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

  return (
    <div className={`min-h-screen bg-gradient-to-br ${t.bg} p-3 sm:p-6 text-white transition-colors duration-500`}>
      <div className="max-w-5xl mx-auto">
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-6">
          <button
            onClick={onBack}
            className="text-white/80 font-bold flex items-center gap-1 hover:text-white text-sm bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all"
          >
            &larr; Dashboard
          </button>

          <div className="flex items-center gap-2">
            {/* Theme picker */}
            <div className="relative">
              <button
                onClick={() => { setShowThemePicker(!showThemePicker); setShowMusicPicker(false); }}
                className="flex items-center gap-1.5 text-sm bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all"
                title="Change theme"
              >
                <Palette size={16} />
                <span className="hidden sm:inline">Theme</span>
              </button>
              <AnimatePresence>
                {showThemePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/20 p-2 z-50 min-w-[160px] shadow-2xl"
                  >
                    {Object.entries(THEMES).map(([key, th]) => (
                      <button
                        key={key}
                        onClick={() => { setTheme(key as ThemeKey); setShowThemePicker(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          theme === key ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="text-lg">{th.icon}</span>
                        {th.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Music controls */}
            <div className="relative">
              <button
                onClick={toggleMusic}
                className={`flex items-center gap-1.5 text-sm backdrop-blur-sm px-3 py-2 rounded-full border transition-all ${
                  musicPlaying
                    ? 'bg-green-500/30 border-green-400/50 text-green-200'
                    : 'bg-white/20 border-white/30 hover:bg-white/30 text-white/80'
                }`}
                title={musicPlaying ? 'Pause music' : 'Play music'}
              >
                {musicPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span className="hidden sm:inline">{musicPlaying ? 'Music On' : 'Music'}</span>
              </button>
            </div>

            {/* Music track picker */}
            {musicPlaying && (
              <div className="relative">
                <button
                  onClick={() => { setShowMusicPicker(!showMusicPicker); setShowThemePicker(false); }}
                  className="flex items-center gap-1 text-sm bg-white/20 backdrop-blur-sm px-2.5 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all"
                >
                  <Music size={14} />
                  <ChevronDown size={14} />
                </button>
                <AnimatePresence>
                  {showMusicPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/20 p-2 z-50 min-w-[180px] shadow-2xl"
                    >
                      {MUSIC_TRACKS.map((track, idx) => (
                        <button
                          key={track.file}
                          onClick={() => changeTrack(idx)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            currentTrack === idx ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span>{track.icon}</span>
                          {track.name}
                        </button>
                      ))}
                      {/* Volume slider */}
                      <div className="px-3 py-2 border-t border-white/10 mt-1">
                        <div className="flex items-center gap-2">
                          <VolumeX size={12} className="text-white/50" />
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={musicVolume}
                            onChange={e => setMusicVolume(parseFloat(e.target.value))}
                            className="flex-1 accent-white h-1"
                          />
                          <Volume2 size={12} className="text-white/50" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* End session */}
            <button
              onClick={() => setEndModal(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-bold transition-all text-sm shadow-lg hover:shadow-xl hover:scale-105"
            >
              End Session
            </button>
          </div>
        </div>

        {/* ─── Title ───────────────────────────────────────────────────────── */}
        <div className="text-center mb-6">
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl sm:text-5xl font-black mb-2 drop-shadow-2xl"
          >
            {theme === 'neon' ? '🕹️' : '🎮'} Quick Play
          </motion.h1>
          <p className="text-white/90 font-bold text-xs sm:text-base">
            Scan QR code to play &bull; {session.words.length} words &bull; No login required
          </p>
        </div>

        {/* ─── Main grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* ─── QR Code Section ───────────────────────────────────────────── */}
          <div className={`${t.card} backdrop-blur-md rounded-2xl p-4 sm:p-6 border`}>
            <h2 className="text-lg sm:text-xl font-black mb-3 flex items-center gap-2">
              <QrCode size={20} />
              Scan to Join
            </h2>
            <div
              className="bg-white rounded-xl p-3 sm:p-4 mb-3 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setQrEnlarged(true)}
              title="Click to enlarge"
            >
              <div className="aspect-square max-w-[200px] sm:max-w-[250px] mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`}
                  alt="Quick Play QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-center text-purple-400 text-xs mt-2 font-medium">Tap to enlarge</p>
            </div>
            <p className="text-xs sm:text-sm text-white/80 text-center mb-3">
              Session Code:{' '}
              <span className="bg-white text-purple-600 px-3 py-1 rounded-lg font-mono font-black ml-1">
                {session.sessionCode}
              </span>
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(qrUrl);
                showToast('Link copied!', 'success');
              }}
              className="w-full px-4 py-3 bg-white/20 hover:bg-white/30 border-2 border-white/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Copy size={16} />
              Copy Link
            </button>
          </div>

          {/* ─── Live Leaderboard Section ───────────────────────────────────── */}
          <div className={`${t.card} backdrop-blur-md rounded-2xl p-4 sm:p-6 border`}>
            {/* Student count with animated counter */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                <Users size={20} />
                Players
              </h2>
              <motion.div
                key={students.length}
                initial={{ scale: 1.3, color: '#4ade80' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="text-2xl sm:text-3xl font-black"
              >
                {students.length}
              </motion.div>
            </div>

            {sorted.length > 0 ? (
              <div className="space-y-4">
                {/* ─── Animated Podium ─────────────────────────────────────── */}
                {top3.length > 0 && (
                  <div className="flex items-end justify-center gap-2 sm:gap-3 pt-8 pb-2">
                    {/* 2nd place */}
                    <div className="flex flex-col items-center w-24 sm:w-28">
                      {top3[1] ? (
                        <>
                          <motion.span
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl mb-1"
                          >
                            {getAvatar(top3[1].name, 1)}
                          </motion.span>
                          <span className="text-xs font-bold truncate max-w-full text-center">{top3[1].name}</span>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 60 }}
                            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                            className={`w-full bg-gradient-to-t ${t.podiumSilver} rounded-t-lg mt-1 flex flex-col items-center justify-end py-2 overflow-hidden`}
                          >
                            <span className="text-lg">🥈</span>
                            <span className="text-xs font-black text-slate-700">{top3[1].score}</span>
                          </motion.div>
                        </>
                      ) : <div style={{ height: 90 }} />}
                    </div>

                    {/* 1st place */}
                    <div className="flex flex-col items-center w-28 sm:w-32">
                      {top3[0] && (
                        <>
                          <motion.span
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl mb-1"
                          >
                            {getAvatar(top3[0].name, 0)}
                          </motion.span>
                          <span className="text-sm font-bold truncate max-w-full text-center">{top3[0].name}</span>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 85 }}
                            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
                            className={`w-full bg-gradient-to-t ${t.podiumGold} rounded-t-lg mt-1 flex flex-col items-center justify-end py-2 overflow-hidden relative`}
                          >
                            {/* Crown shimmer */}
                            <motion.div
                              animate={{ opacity: [0.3, 0.7, 0.3] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            />
                            <span className="text-2xl relative z-10">🥇</span>
                            <span className="text-sm font-black text-yellow-800 relative z-10">{top3[0].score}</span>
                          </motion.div>
                        </>
                      )}
                    </div>

                    {/* 3rd place */}
                    <div className="flex flex-col items-center w-24 sm:w-28">
                      {top3[2] ? (
                        <>
                          <motion.span
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl mb-1"
                          >
                            {getAvatar(top3[2].name, 2)}
                          </motion.span>
                          <span className="text-xs font-bold truncate max-w-full text-center">{top3[2].name}</span>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 45 }}
                            transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }}
                            className={`w-full bg-gradient-to-t ${t.podiumBronze} rounded-t-lg mt-1 flex flex-col items-center justify-end py-2 overflow-hidden`}
                          >
                            <span className="text-lg">🥉</span>
                            <span className="text-xs font-black text-orange-800">{top3[2].score}</span>
                          </motion.div>
                        </>
                      ) : <div style={{ height: 70 }} />}
                    </div>
                  </div>
                )}

                {/* ─── Student Bubble Grid ───────────────────────────────────── */}
                <h3 className="text-sm font-black text-white/60 uppercase tracking-wider">All Players</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <AnimatePresence mode="popLayout">
                    {sorted.map((student, idx) => {
                      const isOnline = (Date.now() - new Date(student.lastSeen).getTime()) < 60000;
                      const modeLabel = student.mode === 'joined' ? 'Lobby' : student.mode;
                      const rankColor = idx === 0 ? 'ring-yellow-400' : idx === 1 ? 'ring-slate-300' : idx === 2 ? 'ring-orange-400' : 'ring-transparent';
                      const maxScore = sorted[0]?.score || 1;
                      const scorePercent = maxScore > 0 ? (student.score / maxScore) * 100 : 0;

                      return (
                        <motion.div
                          key={student.name}
                          layout
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className={`relative group rounded-2xl p-3 ${t.card} border backdrop-blur-sm hover:bg-white/15 transition-all cursor-default`}
                        >
                          {/* Kick overlay on hover */}
                          <button
                            onClick={() => setConfirmKick(student.name)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-500/0 group-hover:bg-red-500/80 text-transparent group-hover:text-white transition-all z-10"
                            title={`Remove ${student.name}`}
                          >
                            <X size={12} />
                          </button>

                          {/* Online indicator */}
                          <div className={`absolute top-2 left-2 w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-gray-500'}`}>
                            {isOnline && (
                              <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                            )}
                          </div>

                          {/* Avatar */}
                          <div className="text-center">
                            <div className={`text-3xl sm:text-4xl mb-1 ring-2 ${rankColor} rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mx-auto`}>
                              {getAvatar(student.name, idx)}
                            </div>
                            <div className="font-bold text-xs sm:text-sm truncate mt-1">{student.name}</div>
                            <div className="text-[10px] text-white/50 capitalize">{modeLabel}</div>
                          </div>

                          {/* Score bar */}
                          <div className="mt-2">
                            <div className="text-center text-sm sm:text-base font-black">
                              {student.score}
                              <span className="text-[10px] font-normal text-white/40 ml-0.5">pts</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${scorePercent}%` }}
                                transition={{ duration: 0.5 }}
                                className={`h-full rounded-full ${
                                  idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-orange-400' : 'bg-white/40'
                                }`}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/50">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Users size={52} className="mx-auto mb-3 opacity-40" />
                </motion.div>
                <p className="font-bold text-lg">Waiting for players...</p>
                <p className="text-sm text-white/40 mt-1">Share the QR code to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Words Preview ───────────────────────────────────────────────── */}
        <div className={`${t.card} backdrop-blur-md rounded-2xl p-4 sm:p-6 border mt-4 sm:mt-6`}>
          <h2 className="text-lg sm:text-xl font-black mb-3 flex items-center gap-2">
            <BookOpen size={20} />
            Words ({session.words.length})
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {session.words.map(word => (
              <span key={word.id} className="px-2.5 py-1 bg-white/15 rounded-full text-xs sm:text-sm font-bold">
                {word.english}
              </span>
            ))}
          </div>
        </div>
      </div>

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
