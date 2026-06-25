/**
 * ArenaHostView — the teacher's control room for Word Hunt Arena, laid out
 * for a classroom projector. A sibling of SpeedRoundHostView on the same
 * Quick Play socket rails:
 *   - shows the join code + QR (students join the same way as Quick Play)
 *   - the teacher builds their OWN word list (typed / picked from the
 *     library via SpeedWordPicker, like Speed Round) + a MODE MIX + a
 *     per-word timer, then
 *     "Start arena" pre-authors the WHOLE question batch CLIENT-SIDE here
 *     (buildSpeedQuestion in a loop — the server has no vocabulary) and
 *     ships it on ARENA_START; the server stores every correctIndex
 *     privately and referees grabs from memory (design §2)
 *   - during play the projector shows the live map (ArenaCanvas readOnly)
 *     with every avatar moving, plus the podium underneath
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Play, Users, LogOut, Check, Copy, Maximize2, X, Monitor, Minimize2, Square, Zap } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { useAutoAdvance } from "../hooks/useAutoAdvance";
import { useVocabularyLazy } from "../hooks/useVocabularyLazy";
import { useSavedWordGroups } from "../hooks/useSavedWordGroups";
import CategoryRacePodium from "../components/game/CategoryRacePodium";
import GameMusicPlayer from "../components/game/GameMusicPlayer";
import LobbyRoster from "../components/game/LobbyRoster";
import KickConfirmModal from "../components/game/KickConfirmModal";
import GameThemePicker from "../components/game/GameThemePicker";
import { useGameTheme } from "../hooks/useGameTheme";
import GameResults from "../components/game/GameResults";
import TeamScoreBar from "../components/game/TeamScoreBar";
import TeamModeToggle from "../components/game/TeamModeToggle";
import RoughModeToggle from "../components/game/RoughModeToggle";
import ArenaCanvas from "../components/game/ArenaCanvas";
import { ARENA_MAPS, randomArenaMapId } from "../components/game/arenaMaps";
import SpeedWordPicker from "../components/game/SpeedWordPicker";
import { primeAudio } from "../utils/primeAudio";
import { playRoundStart } from "../utils/raceSfx";
import { shuffle } from "../utils";
import { buildSpeedQuestion, type L1 } from "../utils/speedRoundQuestion";
import {
  QP_SPEED_ROUND_SECONDS, QP_SPEED_MODES, QP_ARENA_MAX_WORDS,
  type QpSpeedMode, type QpArenaWordSeed, type QpArenaMapId,
} from "../core/quickPlayProtocol";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";
import { SPEED_MODE_META } from "./speedRoundStrings";
import { ARENA_HOST_STRINGS } from "./arenaStrings";

interface ArenaHostViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

/** Enough words for distractor options (questions need 2–4 choices). */
const MIN_WORDS = 4;
/** Podium beat between auto-played hunts (mirrors Speed Round). */
const AUTO_ADVANCE_SECONDS = 5;

export default function ArenaHostView({ sessionCode, setView }: ArenaHostViewProps) {
  const { language, dir } = useLanguage();
  const t = ARENA_HOST_STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  // Arabic sessions read the Arabic column; everything else reads Hebrew.
  const l1: L1 = language === "ar" ? "ar" : "he";
  // Teacher-selected board skin (persisted, shared across live games).
  const { themeId, theme, setThemeId } = useGameTheme();

  const vocab = useVocabularyLazy(true);

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const {
    status, currentArena, arenaPositionsRef, leaderboard,
    observeAsTeacher, startArena, endArena, endSession,
    teamMode, setTeamMode, roughMode, setRoughMode,
  } = qp;

  // The teacher's own word list (typed / picked from the library) — the
  // question pool AND the preferred distractor source. Replaces the old
  // fixed Set 1/2/3 picker, same product call as Speed Round (2026-06-11):
  // teachers run an arena on exactly the words THEY chose.
  const [pickedWords, setPickedWords] = useState<Word[]>([]);
  // Multi-toggle — every enabled mode joins the cycle the batch builder
  // walks, so the floating words mix question types. Default: all six.
  const [enabledModes, setEnabledModes] = useState<Set<QpSpeedMode>>(new Set(QP_SPEED_MODES));
  const [roundSeconds, setRoundSeconds] = useState<number>(10);
  // Themed board background. "random" picks a fresh map each hunt; a concrete
  // id locks the scene. Persisted so the teacher's pick sticks across games
  // (mirrors the GameThemePicker persistence). Default: random for variety.
  const [mapChoice, setMapChoice] = useState<string>(
    () => (typeof localStorage !== "undefined" && localStorage.getItem("vb-arena-map")) || "random",
  );
  const selectMap = (choice: string) => {
    setMapChoice(choice);
    try { localStorage.setItem("vb-arena-map", choice); } catch { /* private mode — ignore */ }
  };
  const [copied, setCopied] = useState(false);
  const [qrEnlarged, setQrEnlarged] = useState(false);
  // Celebratory results overlay when ending a played hunt.
  const [showResults, setShowResults] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [buildError, setBuildError] = useState(false);
  // Student pending removal (clientId + nickname) — drives the confirm modal.
  const [confirmKick, setConfirmKick] = useState<{ clientId: string; nickname: string } | null>(null);
  // Auto-play: once the first hunt runs, each finished hunt chains into the
  // next wave after a short podium beat — no per-hunt click.
  const [autoPlay, setAutoPlay] = useState(true);
  const tokenRef = useRef<string | null>(null);

  const canStart = pickedWords.length >= MIN_WORDS && enabledModes.size > 0;

  // The teacher's saved word lists (same saved_word_groups the assignment
  // wizard writes), resolved to library words — ids that don't resolve
  // (e.g. custom OCR words) are dropped since they can't form questions.
  const { groups: savedGroupsRaw } = useSavedWordGroups();
  const savedGroups = useMemo(() => {
    const lib = vocab?.ALL_WORDS;
    if (!lib || savedGroupsRaw.length === 0) return [];
    const byId = new Map(lib.map((w) => [w.id, w]));
    return savedGroupsRaw
      .map((g) => ({
        id: g.id,
        name: g.name,
        words: g.words.map((id) => byId.get(id)).filter((w): w is Word => !!w),
      }))
      .filter((g) => g.words.length > 0);
  }, [vocab, savedGroupsRaw]);

  useEffect(() => {
    if (status !== "connected") return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || cancelled) return;
      tokenRef.current = token;
      observeAsTeacher(token);
    })();
    return () => { cancelled = true; };
  }, [status, observeAsTeacher]);

  const arenaActive = !!currentArena;
  // Latches once the first hunt starts so the pre-game waiting room gives
  // way to the leaderboard (which then doubles as the post-game results).
  const [hasStarted, setHasStarted] = useState(false);

  // &mode=arena lets the student bootstrap skip the unused vocab prefetch.
  const joinUrl = useMemo(() => `${window.location.origin}/?session=${sessionCode}&mode=arena`, [sessionCode]);

  const sorted = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const wordsLeft = currentArena ? currentArena.words.filter(w => w.state !== "answered").length : 0;

  // Pre-author the whole batch: walk a shuffled copy of the teacher's
  // list, cycling the enabled modes; a word that can't form a question for
  // the current mode tries the other enabled modes before being skipped.
  const buildBatch = (): QpArenaWordSeed[] => {
    const fallback = vocab?.ALL_WORDS ?? pickedWords;
    const modes = QP_SPEED_MODES.filter(m => enabledModes.has(m));
    const seeds: QpArenaWordSeed[] = [];
    let modeCursor = 0;
    for (const word of shuffle([...pickedWords])) {
      if (seeds.length >= QP_ARENA_MAX_WORDS) break;
      let question = null;
      for (let attempt = 0; attempt < modes.length && !question; attempt++) {
        question = buildSpeedQuestion({
          mode: modes[(modeCursor + attempt) % modes.length],
          word, pool: pickedWords, fallback, l1,
          trueFalseLabels: { yes: t.tfTrue, no: t.tfFalse },
        });
      }
      modeCursor++;
      if (!question) continue;
      seeds.push({ label: word.english, ...question });
    }
    return seeds;
  };

  // Set when the teacher ENDS a hunt by hand, so auto-play doesn't instantly
  // relaunch it (the whole point of "End" is to stop). Cleared on the next
  // manual Start.
  const endedManuallyRef = useRef(false);

  const handleStart = () => {
    if (!tokenRef.current || arenaActive || !canStart) return;
    const seeds = buildBatch();
    if (seeds.length === 0) { setBuildError(true); return; }
    setBuildError(false);
    endedManuallyRef.current = false;
    // The Start tap is a user gesture — prime + play the jingle.
    primeAudio();
    playRoundStart();
    // "random" resolves to a fresh map per hunt; otherwise honour the pick.
    const mapId: QpArenaMapId = mapChoice === "random" ? randomArenaMapId() : (mapChoice as QpArenaMapId);
    startArena(seeds, { roundSeconds, mapId }, tokenRef.current);
    setHasStarted(true);
    setPresenting(true);
  };

  // Auto-play: after the first hunt, launch the next wave once the podium
  // beat passes. Armed only between hunts (hasStarted && !arenaActive) so the
  // teacher always starts the FIRST hunt explicitly; the countdown feeds the
  // start buttons below. Suppressed after a manual End.
  const autoCountdown = useAutoAdvance(
    autoPlay && hasStarted && !arenaActive && canStart && !endedManuallyRef.current,
    AUTO_ADVANCE_SECONDS,
    handleStart,
  );

  const handleEndArena = () => {
    endedManuallyRef.current = true;
    if (arenaActive && tokenRef.current) endArena(tokenRef.current);
  };

  const leaveToDashboard = async () => {
    if (tokenRef.current) endSession(tokenRef.current);
    try { await supabase.rpc("end_quick_play_session", { p_session_code: sessionCode }); } catch { /* best-effort */ }
    setView("teacher-dashboard");
  };

  const handleEnd = () => {
    // Celebrate the result first if the class actually played the hunt.
    if (hasStarted && sorted.length > 0) setShowResults(true);
    else void leaveToDashboard();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — ignore */ }
  };

  const toggleMode = (m: QpSpeedMode) => {
    setEnabledModes(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  const cardCls = "bg-surface border-outline-variant shadow-lg";
  const headingCls = "text-on-surface";
  const pillIdle = "bg-surface border-outline-variant text-on-surface-variant hover:border-outline";
  const iconBtn = "bg-surface text-indigo-600 hover:bg-surface-container border border-outline-variant";

  // Remove a student — available both in Controls and on the live/projected
  // board, since teachers need to drop a disruptive kid mid-game. The confirm
  // modal guards against an accidental tap in front of the class.
  const onKick = (clientId: string, nickname: string) => setConfirmKick({ clientId, nickname });

  return (
    <div
      className={`transition-colors ${arenaActive ? "h-[100dvh] overflow-hidden flex flex-col" : "min-h-[100dvh]"}`}
      dir={dir}
      style={presenting || arenaActive ? theme.page : { backgroundColor: 'var(--vb-surface-alt)' }}
    >
      {/* Background music — kept mounted across the setup⇄live switch so it
          never cuts when a hunt starts. Slate accents keep it calmer than the
          brand-fuchsia bar on the other live games; floats to a compact corner
          pill while presenting or during a live hunt. */}
      <GameMusicPlayer language={language} theme="slate" floating={presenting || arenaActive} />

      {arenaActive && currentArena ? (
        /* ── Live hunt: ONE screen, no scrolling. The map fills the space and
             the leaderboard sits beside it (desktop/tablet) or in a short
             capped scroller below (phone) — so the teacher sees the whole
             class moving at once, on any device, without scrolling. ── */
        <div className="flex-1 min-h-0 flex flex-col gap-2 px-3 sm:px-4 pt-3 pb-2">
          <header className="flex items-center justify-between gap-2 flex-shrink-0">
            <h1 className={`min-w-0 text-base sm:text-2xl font-black flex items-center gap-2 ${theme.name}`}>
              <span className="text-lg sm:text-2xl flex-shrink-0">🏟️</span>
              <span className="truncate">{t.title}</span>
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-base tracking-[0.12em] bg-indigo-50 text-indigo-700">
                {sessionCode}
              </span>
              <button
                type="button"
                onClick={handleEndArena}
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-sm bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-95 transition"
              >
                <Square size={16} /> <span className="hidden sm:inline">{t.endArena}</span>
              </button>
            </div>
          </header>

          {/* Map-only board — Word Hunt Arena shows JUST the live map; students
              roam it as moving avatars (no names, no leaderboard panel — that
              stays on the other games). The map fills every available pixel so
              movement reads big from the back of the room. Final standings
              appear on the results screen when the hunt ends. A compact team
              total floats in the corner when Red-vs-Blue is on. */}
          <div className="flex-1 min-h-0 flex flex-col">
            {teamMode && (
              <div className="mb-2 max-w-md mx-auto w-full">
                <TeamScoreBar entries={sorted} />
              </div>
            )}
            <section className="flex-1 min-h-0 flex flex-col">
              <div className="relative flex-1 min-h-0">
                <ArenaCanvas
                  arena={currentArena}
                  positionsRef={arenaPositionsRef}
                  leaderboard={leaderboard}
                  pickups={currentArena.pickups}
                  readOnly
                  fill
                  className="h-full"
                />
              </div>
              <p className="mt-1 text-center text-[11px] sm:text-xs font-black uppercase tracking-widest text-indigo-500 flex-shrink-0">
                {t.wordsLeft(wordsLeft)}
              </p>
            </section>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between gap-2 mb-5">
          <h1 className={`min-w-0 text-xl sm:text-3xl font-black flex items-center gap-2 ${presenting ? theme.name : headingCls}`}>
            <span className="text-2xl sm:text-3xl flex-shrink-0">🏟️</span>
            <span className="truncate">{t.title}</span>
          </h1>
          {presenting ? (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-base sm:text-lg tracking-[0.12em] bg-indigo-50 text-indigo-700">
                {t.code}: {sessionCode}
              </span>
              <button
                type="button"
                onClick={() => setPresenting(false)}
                style={{ touchAction: "manipulation" }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-sm transition active:scale-95 ${iconBtn}`}
              >
                <Minimize2 size={16} /> {t.controls}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setPresenting(true)}
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95 transition"
              >
                <Monitor size={16} /> <span className="hidden sm:inline">{t.present}</span>
              </button>
              <button
                type="button"
                onClick={handleEnd}
                style={{ touchAction: "manipulation" }}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-95 transition"
              >
                <LogOut size={16} /> <span className="hidden sm:inline">{t.end}</span>
              </button>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main: the big leaderboard / lobby (the live map has its own
              one-screen layout above while a hunt runs) */}
          <div className={`${presenting ? "lg:col-span-12" : "lg:col-span-8"} space-y-4 order-2 lg:order-1`}>
            {/* Live Red vs Blue total — only in team mode. */}
            {teamMode && <TeamScoreBar entries={sorted} />}

            {/* Before the first hunt it's a waiting room; once started the
                leaderboard takes over (and stays as the post-game results). */}
            {hasStarted ? (
              <section className={`rounded-3xl shadow-lg border p-5 sm:p-6 ${presenting ? theme.card : cardCls}`}>
                <h2 className="text-sm font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center gap-2">
                  <Users size={18} /> {t.leaderboard}
                  <span className="ms-auto text-stone-400 normal-case tracking-normal">{t.players(sorted.length)}</span>
                </h2>
                <CategoryRacePodium entries={sorted} emptyText={t.noStudents} large onKick={onKick} theme={presenting ? theme : undefined} />
              </section>
            ) : (
              <section className={`rounded-3xl shadow-lg border p-5 sm:p-6 ${presenting ? theme.card : cardCls}`}>
                <LobbyRoster
                  players={sorted}
                  countLabel={t.inRoom}
                  emptyLabel={t.noStudents}
                  accent="from-indigo-500 to-violet-600"
                  large={presenting}
                  onKick={onKick}
                  theme={presenting ? theme : undefined}
                />
              </section>
            )}
          </div>

          {/* Sidebar: join + setup controls */}
          <aside className={`lg:col-span-4 space-y-4 order-1 lg:order-2 ${presenting ? "hidden" : ""}`}>
            <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-indigo-500">{t.joinHeading}</h2>
                <button type="button" onClick={() => setQrEnlarged(true)} style={{ touchAction: "manipulation" }}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition active:scale-95 ${iconBtn}`} aria-label={t.enlarge}>
                  <Maximize2 size={15} />
                </button>
              </div>
              <div className="flex flex-col items-center text-center">
                <button type="button" onClick={() => setQrEnlarged(true)} style={{ touchAction: "manipulation" }}
                  className="bg-white p-2 rounded-2xl border border-stone-100 shadow-sm active:scale-[0.98] transition" aria-label={t.enlarge}>
                  <QRCodeSVG value={joinUrl} size={132} />
                </button>
                <div className="mt-3 w-full">
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t.code}</div>
                  <div className={`text-4xl font-black tracking-[0.15em] ${headingCls}`}>{sessionCode}</div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{ touchAction: "manipulation" }}
                    className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition active:scale-[0.98] ${
                      copied ? "bg-emerald-100 text-emerald-700" : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30"
                    }`}
                  >
                    {copied ? <><Check size={16} /> {t.copied}</> : <><Copy size={16} /> {t.copy}</>}
                  </button>
                </div>
              </div>
            </section>

            <GameThemePicker themeId={themeId} onSelect={setThemeId} language={language} />

            <TeamModeToggle
              teamMode={teamMode}
              onToggle={(en) => tokenRef.current && setTeamMode(en, tokenRef.current)}
              headingClass="text-indigo-500"
              idleClass={pillIdle}
              cardClass={cardCls}
            />

            {/* Dash-tackle PvP. The server only honours the toggle on a LIVE
                arena, so it's disabled until a hunt is running. */}
            <RoughModeToggle
              roughMode={roughMode}
              onToggle={(en) => tokenRef.current && setRoughMode(en, tokenRef.current)}
              headingClass="text-indigo-500"
              idleClass={pillIdle}
              cardClass={cardCls}
              disabled={!arenaActive}
            />

            <section className={`rounded-3xl shadow-lg border p-5 ${cardCls}`}>
              {/* The teacher's word list — typed / picked from the library. */}
              <h2 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3">{t.wordsHeading}</h2>
              <SpeedWordPicker
                library={vocab?.ALL_WORDS ?? null}
                picked={pickedWords}
                onChange={setPickedWords}
                minWords={MIN_WORDS}
                t={t}
                chipClass="bg-indigo-100 text-indigo-700"
                savedGroups={savedGroups}
              />

              {/* Mode mix — multi-toggle, unlike Speed Round's single pick */}
              <h2 className="text-xs font-black uppercase tracking-widest text-indigo-500 mt-5 mb-3">{t.modeHeading}</h2>
              <div className="grid grid-cols-2 gap-2">
                {QP_SPEED_MODES.map((m) => {
                  const picked = enabledModes.has(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMode(m)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`relative rounded-xl p-2.5 text-start border-2 transition-all ${picked ? "bg-gradient-to-br from-indigo-500 to-violet-600 border-transparent text-white shadow-md" : pillIdle}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{SPEED_MODE_META[m].emoji}</span>
                        <span className="font-black text-xs truncate">{t.modeNames[m]}</span>
                        {picked && <Check size={13} strokeWidth={3} className="ms-auto flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {enabledModes.size === 0 && <p className="mt-2 text-xs font-bold text-rose-600">{t.pickMode}</p>}

              {/* Timer (per grabbed word) */}
              <h2 className="text-xs font-black uppercase tracking-widest text-indigo-500 mt-5 mb-3">{t.timerHeading}</h2>
              <div className="grid grid-cols-5 gap-2">
                {QP_SPEED_ROUND_SECONDS.map((opt) => {
                  const picked = roundSeconds === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRoundSeconds(opt)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`px-1 py-2 rounded-lg font-black text-sm border-2 transition ${picked ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-md" : pillIdle}`}
                    >
                      {t.seconds(opt)}
                    </button>
                  );
                })}
              </div>

              {/* Arena map — themed background the whole class sees. "Surprise
                  me" rolls a fresh scene per hunt; tapping a tile locks it. */}
              <h2 className="text-xs font-black uppercase tracking-widest text-indigo-500 mt-5 mb-3">{t.mapHeading}</h2>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => selectMap("random")}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`relative aspect-[10/7] rounded-xl overflow-hidden border-2 flex flex-col items-center justify-center gap-0.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white transition ${mapChoice === "random" ? "border-amber-400 ring-2 ring-amber-300" : "border-transparent opacity-90 hover:opacity-100"}`}
                >
                  <span className="text-xl">🎲</span>
                  <span className="text-[10px] font-black leading-tight px-1 text-center">{t.randomMap}</span>
                </button>
                {ARENA_MAPS.map((m) => {
                  const picked = mapChoice === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMap(m.id)}
                      aria-label={m.name[language === "he" ? "he" : language === "ar" ? "ar" : "en"]}
                      title={m.name[language === "he" ? "he" : language === "ar" ? "ar" : "en"]}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`relative aspect-[10/7] rounded-xl overflow-hidden border-2 transition ${picked ? "border-amber-400 ring-2 ring-amber-300" : "border-transparent opacity-80 hover:opacity-100"}`}
                    >
                      <img src={m.thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/45 text-white text-[9px] font-black leading-tight px-1 py-0.5 truncate flex items-center justify-center gap-0.5">
                        <span>{m.emoji}</span>
                        <span className="truncate">{m.name[language === "he" ? "he" : language === "ar" ? "ar" : "en"]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Auto-play toggle — hunts chain themselves after the first. */}
              <button
                type="button"
                role="switch"
                aria-checked={autoPlay}
                onClick={() => setAutoPlay(v => !v)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`mt-5 w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border-2 transition-all ${autoPlay ? "bg-indigo-50 border-indigo-300" : pillIdle}`}
              >
                <span className={`font-black text-xs ${autoPlay ? "text-indigo-700" : ""}`}>⚡ {t.autoPlayLabel}</span>
                <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${autoPlay ? "bg-indigo-500" : "bg-stone-300"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${autoPlay ? "start-[18px]" : "start-0.5"}`} />
                </span>
              </button>

              {buildError && <p className="mt-3 text-xs font-bold text-rose-600">{t.buildError}</p>}

              {arenaActive ? (
                <button
                  type="button"
                  onClick={handleEndArena}
                  style={{ touchAction: "manipulation" }}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-[0.98] transition"
                >
                  <Square size={18} /> {t.endArena}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!canStart}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg transition ${!canStart ? "bg-stone-300 cursor-not-allowed" : "bg-gradient-to-r from-indigo-500 to-violet-600 shadow-indigo-500/30 active:scale-[0.98]"}`}
                >
                  {autoCountdown !== null
                    ? <><Zap size={18} /> {t.autoNextIn(autoCountdown)}</>
                    : <><Play size={18} /> {hasStarted ? t.restart : t.start}</>}
                </button>
              )}
            </section>
          </aside>
        </div>
        </div>
      )}

      {/* Presentation mode floating start (presented lobby before a hunt) */}
      <AnimatePresence>
        {presenting && !arenaActive && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            onClick={handleStart}
            disabled={!canStart}
            style={{ touchAction: "manipulation" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl shadow-indigo-500/40 bg-gradient-to-r from-indigo-500 to-violet-600 active:scale-[0.98] transition disabled:opacity-60"
          >
            {autoCountdown !== null
              ? <><Zap size={20} /> {t.autoNextIn(autoCountdown)}</>
              : <><Play size={20} /> {hasStarted ? t.restart : t.start}</>}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Confirm before removing a student from the session. */}
      <KickConfirmModal
        name={confirmKick?.nickname ?? null}
        language={language}
        onCancel={() => setConfirmKick(null)}
        onConfirm={() => {
          if (confirmKick && tokenRef.current) qp.kickStudent(confirmKick.clientId, tokenRef.current);
          setConfirmKick(null);
        }}
      />

      {/* Celebratory results — shown when ending a hunt that has scores. */}
      <AnimatePresence>
        {showResults && (
          <GameResults entries={sorted} onBack={leaveToDashboard} accent="from-indigo-500 to-violet-600" />
        )}
      </AnimatePresence>

      {/* Enlarged QR overlay */}
      <AnimatePresence>
        {qrEnlarged && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setQrEnlarged(false)}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6"
            role="dialog"
          >
            <motion.div
              initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl"
            >
              <QRCodeSVG value={joinUrl} size={Math.min(420, typeof window !== "undefined" ? window.innerWidth - 96 : 420)} />
              <div className="mt-4 text-5xl sm:text-6xl font-black tracking-[0.15em] text-stone-900">{sessionCode}</div>
            </motion.div>
            <button
              type="button"
              onClick={() => setQrEnlarged(false)}
              style={{ touchAction: "manipulation" }}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white bg-white/15 hover:bg-white/25 active:scale-95 transition"
            >
              <X size={18} /> {t.hide}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
