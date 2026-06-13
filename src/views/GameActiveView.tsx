import { useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { THEMES, PET_MILESTONES } from "../constants/game";
import { useGameRoute } from "./GameRouteContext";
import { useLanguage } from "../hooks/useLanguage";
import { useCombo } from "../hooks/useCombo";
import { useFeatureFlag } from "../hooks/useFeatureFlag";
import CombosOverlay from "../components/arcade/CombosOverlay";
import InGamePetReactor from "../components/arcade/InGamePetReactor";
import { gameActiveT } from "../locales/student/game-active";
import { getThemeColors, type GameThemeColor } from "../components/game/GameShell";

/** Phase-3 redesign: each mode picks a theme colour from the palette
 *  defined in `src/components/game/GameShell.tsx` (and indirectly the
 *  modeThemes table in GameModeIntroView).  The colour drives the
 *  prompt-card hero gradient, the mode-label pill, and the answer
 *  cards' resting-state border.  Modes not yet in the redesign queue
 *  fall through to undefined and keep their legacy stone styling. */
const MODE_THEME: Partial<Record<string, GameThemeColor>> = {
  classic: "emerald",
  listening: "emerald",
  reverse: "emerald",
  // True/False uses rose as the primary pill colour; the buttons
  // themselves keep their rose↔emerald split (False=rose, True=emerald)
  // since binary judgement reads strongest with paired colours.
  "true-false": "rose",
  // Fill-in-the-Blank = lime.  Drives the sentence-card hero tint
  // and the option button accents.  The dashed slot box stays
  // lime regardless (it's the mode signature).
  "fill-blank": "lime",
  // Idiom = sky.  Multi-choice mode where students pick the figurative
  // meaning of an English idiom from a hand-curated dataset.
  idiom: "sky",
  // Speed Round = red.  60-second timer mode; red signals urgency
  // and pairs visually with the pulsing low-time-left timer.
  "speed-round": "red",
  // Remaining modes — each component was built with a designed colour
  // (see its docstring) but was missing here, so it fell back to grey
  // stone styling (and matching/memory-flip lost their top label pill,
  // flashcards showed a grey front against a cyan back). Wire them all
  // so every mode looks finished.
  flashcards: "cyan",
  spelling: "violet",
  scramble: "indigo",
  matching: "amber",
  "memory-flip": "pink",
  "letter-sounds": "violet",
  "sentence-builder": "teal",
  review: "violet",
};

/** Modes whose "show correct answer" payload is the English vocab word
 *  itself (rather than a Hebrew/Arabic translation).  ShowAnswerFeedback
 *  receives `dir="ltr"` for these so the answer text never inherits the
 *  page's RTL direction when the UI is set to Hebrew or Arabic.
 *  Other modes get `dir="auto"` and the browser bidi-isolates the
 *  HE/AR translation correctly. */
const ENGLISH_ANSWER_MODES = new Set(["reverse", "spelling", "scramble", "letter-sounds", "fill-blank"]);
import { ShowAnswerFeedback } from "../components/ShowAnswerFeedback";
import AnswerFeedback, { cardShake, cardShakeTransition } from "../components/game/AnswerFeedback";
import ClassicModeGame from "../components/ClassicModeGame";
import GameHeader from "../components/game/GameHeader";
import WordPromptCard from "../components/game/WordPromptCard";
import PowerUpToolbar from "../components/game/PowerUpToolbar";
import MatchingModeGame from "../components/game/MatchingModeGame";
import MemoryFlipGame from "../components/game/MemoryFlipGame";
import TrueFalseGame from "../components/game/TrueFalseGame";
import FlashcardsGame from "../components/game/FlashcardsGame";
import LetterSoundsGame from "../components/game/LetterSoundsGame";
import SentenceBuilderGame from "../components/game/SentenceBuilderGame";
import FillBlankGame from "../components/game/FillBlankGame";
import SpellingGame from "../components/game/SpellingGame";
import ScrambleGame from "../components/game/ScrambleGame";
import IdiomGame from "../components/game/IdiomGame";
import SpeedRoundGame from "../components/game/SpeedRoundGame";
import ReviewGame from "../components/game/ReviewGame";
import GameProgress from "../components/game/GameProgress";
import AnswerStreakBadge from "../components/game/AnswerStreakBadge";
import PauseOverlay from "../components/game/PauseOverlay";
import { useAnswerStreak } from "../hooks/useAnswerStreak";
import { useInterruptionPause } from "../hooks/useInterruptionPause";
import { useGameKeyboard } from "../hooks/useGameKeyboard";

export default function GameActiveView() {
  // Game-route bag now arrives via context instead of ~50 drilled props.
  // GameActiveView is rendered solely by GameRoute, so context-only is
  // safe — there's no other call site passing props.
  const {
    user, setUser, saveError, setSaveError,
    score, xp, streak,
    targetLanguage,
    gameMode, gameWords, currentIndex, setCurrentIndex, currentWord,
    feedback,
    options, hiddenOptions, setHiddenOptions,
    isMatchingProcessing, matchingPairs, matchedIds, selectedMatch,
    tfOption, isFlipped, setIsFlipped, isProcessingRef,
    scrambledWord, revealedLetters,
    spellingInput, setSpellingInput,
    activeAssignment, sentenceIndex, sentenceFeedback,
    builtSentence, setBuiltSentence, availableWords, setAvailableWords,
    isFinished, quickPlayActiveSession,
    handleExitGame, saveScore,
    handleAnswer, handleMatchClick, handleTFAnswer,
    handleFlashcardAnswer, handleSpellingSubmit, handleSentenceWordTap,
    handleSentenceCheck, speakWord, speak, shuffle,
  } = useGameRoute();
  // Self-contained modes (Idiom, Speed Round) don't go through the
  // per-question scoring path that Classic / Listening / etc. use to
  // trigger saveScore on the last correct answer.  Each mode emits
  // its own raw round score on End, and this helper normalizes it to
  // the 0-100 scale the progress + XP infrastructure expects, then
  // runs saveScore (with maxScoreOverride: 100 to bypass the per-word
  // cap) before bouncing back to mode selection.
  //
  // Per-mode normalization:
  //   - Idiom: correctCount × 10 (10 questions, 10 points each = 0-100)
  //   - Speed Round: rawPoints × 5, capped at 100 (20 points = perfect)
  // These mappings are intentionally generous so a strong run reads as
  // ≥80 and triggers a streak day; tunable in a follow-up once we have
  // pilot data on average scores.
  const finishSelfContainedMode = async (rawScore: number, mode: 'idiom' | 'speed-round' | 'class-minute') => {
    let normalized: number;
    if (mode === 'idiom') normalized = Math.min(100, Math.max(0, rawScore) * 10);
    else /* speed-round, class-minute — same SpeedRoundGame mechanics */ normalized = Math.min(100, Math.max(0, rawScore) * 5);
    try {
      await saveScore(normalized, 100);
    } catch {
      // saveScore is already optimistic + queue-backed; swallow any
      // unexpected throw so the exit transition still runs.
    }
    handleExitGame();
  };
  const activeThemeConfig = THEMES.find(th => th.id === (user?.activeTheme ?? 'default')) ?? THEMES[0];
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const modeTheme: GameThemeColor | undefined = MODE_THEME[gameMode];
  const modeLabel = t.modeLabels[gameMode] ?? gameMode;

  // Combo chain — fires when arcade-hub flag is on.  Watches the
  // `feedback` prop and translates "correct"/"wrong"/"show-answer" into
  // combo register calls.  Combo state lives in this hook (per-game-
  // session), so navigating back to the dashboard resets it naturally
  // when the view unmounts.
  const arcadeHubEnabled = useFeatureFlag('arcade_hub', false);
  const combo = useCombo();
  // Pet stage emoji for the in-game companion — derived from xp exactly
  // as useRetention.currentPetStage does, so it matches the dashboard
  // pet without spinning up a second retention hook here.
  const petStageEmoji = useMemo(
    () => ([...PET_MILESTONES].reverse().find((m) => xp >= m.xpRequired) ?? PET_MILESTONES[0]).emoji,
    [xp],
  );
  useEffect(() => {
    if (!arcadeHubEnabled) return;
    if (feedback === "correct") combo.registerCorrect();
    else if (feedback === "wrong" || feedback === "show-answer") combo.registerWrong();
    // Reset on game finish so the next round starts clean.
    if (isFinished) combo.reset();
    // combo functions are stable refs from useCallback — safe to omit
    // from deps without lint complaining, and including them would
    // re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback, isFinished, arcadeHubEnabled]);

  // Warn before the tab closes mid-game.  Without this guard a stray
  // tap on the close button (or a pinch-to-go-back swipe that escapes
  // useBackButtonTrap) silently throws away the current round — no
  // score is persisted on mid-game exit (useGameFinish.handleExitGame
  // only resets state, it doesn't call saveScore).  Modern browsers
  // ignore the message string and show their own dialog, but the
  // guard itself still fires and gives the student a chance to cancel.
  // Self-contained modes (Speed Round, etc.) own their own timers so
  // they're covered too — the boolean below fires whenever a student
  // is mid-play, regardless of mode.
  const gameInProgress =
    user?.role === "student" && !isFinished && gameWords.length > 0;
  useEffect(() => {
    if (!gameInProgress) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [gameInProgress]);

  // Modes that own their entire question pool + UI chrome.  When one
  // of these is active we skip the global WordPromptCard / PowerUp
  // toolbar / per-word progress bar above the mode component — those
  // chrome pieces show stale data from the fallback `gameWords` pool
  // and push the mode's own UI below the fold on mobile.
  // Main multiple-choice trio — the only modes wired to the shared
  // AnswerFeedback celebration layer for now (open-issues §C scoped
  // this slice; the every-mode sweep is a separate multi-day effort).
  // Their scoring path awards a flat +10 per correct word, which is
  // what the floating XP badge shows.
  const isMainMultiChoice =
    gameMode === "classic" || gameMode === "listening" || gameMode === "reverse";
  const reduceMotion = useReducedMotion();

  const isSelfContainedMode =
    gameMode === 'idiom' ||
    gameMode === 'speed-round' || gameMode === 'class-minute' ||
    // Review renders its OWN prompt word, progress, and finish flow
    // (ReviewGame self-fetches its SRS queue). Without this it leaked
    // the global WordPromptCard showing a stale gameWords[currentIndex]
    // above its own UI, plus a power-up toolbar + "1 / 0" progress bar
    // that don't apply.
    gameMode === 'review';

  // ── Shared classroom-gameplay chrome (open-issues §C + §F) ─────────
  // Pairs modes advance by matched pairs, not question index — they get
  // the same GameProgress with a pairs-found label. matchingPairs holds
  // BOTH card sides of every pair, so the pair total is half its length;
  // matchedIds gains one word-id per matched pair.
  const isPairsMode = gameMode === "matching" || gameMode === "memory-flip";
  // Sentence Builder advances sentenceIndex over the assignment's
  // sentences, NOT currentIndex over gameWords — the old bottom bar
  // showed the wrong denominator for it. Same trim-filter the mode
  // component applies, so the counts always agree.
  const isSentenceMode = gameMode === "sentence-builder";
  const sentenceTotal = isSentenceMode
    ? ((activeAssignment as { sentences?: string[] } | null)?.sentences?.filter(s => s.trim()).length ?? 0)
    : 0;
  const progressCurrent = isPairsMode
    ? matchedIds.length
    : isSentenceMode
    ? Math.min(sentenceIndex + 1, sentenceTotal)
    : Math.min(currentIndex + 1, gameWords.length);
  const progressTotal = isPairsMode
    ? Math.floor(matchingPairs.length / 2)
    : isSentenceMode
    ? sentenceTotal
    : gameWords.length;
  const progressLabel = isPairsMode
    ? t.pairsOfTotal(progressCurrent, progressTotal)
    : t.questionOfTotal(progressCurrent, progressTotal);

  // Always-on 🔥 answer-streak counter (vs. GameHeader's chip, which is
  // the persisted DAILY streak, and useCombo, which is arcade-gated).
  // Pairs modes don't emit feedback, so the badge is skipped for them.
  const answerStreak = useAnswerStreak(feedback, gameMode, isFinished);

  // Interruption pause — SOLO/ASSIGNMENT play only. Quick Play stays
  // un-paused on purpose: the session's socket events + teacher monitor
  // keep flowing server-side, so a local freeze would silently desync
  // the student from the live leaderboard.
  const { isPaused, resume } = useInterruptionPause(
    gameInProgress && !quickPlayActiveSession,
  );

  // Chromebook keyboard shortcuts (open-issues §F). Each mode binds its
  // own key map; only one is `enabled` at a time so the listeners never
  // collide. The number-key path maps over the VISIBLE options so a
  // 50/50 power-up keeps the keys aligned with what's actually on screen.
  //
  // Fill-blank shares the same "choice" map as the MC trio — same
  // handleAnswer path, same 1–4 selection — so it joins isChoiceMode.
  const isChoiceMode =
    gameMode === "classic" || gameMode === "listening" ||
    gameMode === "reverse" || gameMode === "fill-blank";
  const visibleOptions = options.filter(o => !hiddenOptions.includes(o.id));
  const keyboardActive = useGameKeyboard({
    mode: "choice",
    enabled: isChoiceMode && !isFinished && !isPaused,
    optionCount: visibleOptions.length,
    onSelect: (i) => {
      // Mirror AnswerOptionButton's disabled guard — number keys must
      // not land answers while feedback is still showing.
      if (!feedback && visibleOptions[i]) handleAnswer(visibleOptions[i]);
    },
    onReplayAudio: () => {
      if (currentWord) speakWord(currentWord.id, currentWord.english);
    },
  });

  // True/False — T/→ = true, F/← = false. handleTFAnswer self-guards on
  // feedback (auto-advances on correct, clears on wrong), but we mirror
  // the guard here too so a held key during feedback is a clean no-op.
  const tfKeyboardActive = useGameKeyboard({
    mode: "true-false",
    enabled: gameMode === "true-false" && !isFinished && !isPaused,
    onTrueFalse: (isTrue) => {
      if (!feedback) handleTFAnswer(isTrue);
    },
  });

  // Flashcards — Space/Enter flip, →/← self-grade. isProcessingRef
  // guards the answer + flip against the brief auto-advance window
  // (matches the on-card tap handlers).
  const flashKeyboardActive = useGameKeyboard({
    mode: "flashcards",
    enabled: gameMode === "flashcards" && !isFinished && !isPaused,
    onFlip: () => {
      if (!isProcessingRef.current) setIsFlipped(f => !f);
    },
    onFlashcardAnswer: (knewIt) => {
      if (!isProcessingRef.current) handleFlashcardAnswer(knewIt);
    },
  });

  const renderModeContent = () => {
    if (gameMode === "classic" || gameMode === "listening" || gameMode === "reverse") {
      return (
        <ClassicModeGame
          gameMode={gameMode}
          currentWord={currentWord}
          options={options}
          hiddenOptions={hiddenOptions}
          feedback={feedback}
          targetLanguage={targetLanguage}
          gameWordsCount={gameWords.length}
          currentIndex={currentIndex}
          onAnswer={handleAnswer}
          themeColor={modeTheme}
          showKeyHints={keyboardActive}
        />
      );
    }
    if (gameMode === "true-false") {
      return <TrueFalseGame tfOption={tfOption} targetLanguage={targetLanguage} feedback={feedback} onAnswer={handleTFAnswer} themeColor={modeTheme} showKeyHints={tfKeyboardActive} />;
    }
    if (gameMode === "flashcards") {
      return (
        <FlashcardsGame
          currentWord={currentWord}
          targetLanguage={targetLanguage}
          isFlipped={isFlipped}
          setIsFlipped={setIsFlipped}
          isProcessingRef={isProcessingRef}
          onAnswer={handleFlashcardAnswer}
          speakWord={speakWord}
          themeColor={modeTheme}
          showKeyHints={flashKeyboardActive}
        />
      );
    }
    if (gameMode === "letter-sounds") {
      return (
        <LetterSoundsGame
          currentWord={currentWord}
          targetLanguage={targetLanguage}
          revealedLetters={revealedLetters}
          spellingInput={spellingInput}
          setSpellingInput={setSpellingInput}
          feedback={feedback}
          onSpellingSubmit={handleSpellingSubmit}
          themeColor={modeTheme}
        />
      );
    }
    if (gameMode === "sentence-builder") {
      return (
        <SentenceBuilderGame
          activeAssignment={activeAssignment}
          sentenceIndex={sentenceIndex}
          sentenceFeedback={sentenceFeedback}
          builtSentence={builtSentence}
          setBuiltSentence={setBuiltSentence}
          availableWords={availableWords}
          setAvailableWords={setAvailableWords}
          onSentenceWordTap={handleSentenceWordTap}
          onSentenceCheck={handleSentenceCheck}
          speak={speak}
          shuffle={shuffle}
          themeColor={modeTheme}
        />
      );
    }
    if (gameMode === "fill-blank") {
      return (
        <FillBlankGame
          activeAssignment={activeAssignment}
          currentWord={currentWord}
          currentIndex={currentIndex}
          options={options}
          hiddenOptions={hiddenOptions}
          feedback={feedback}
          gameWordsCount={gameWords.length}
          targetLanguage={targetLanguage}
          onAnswer={handleAnswer}
          themeColor={modeTheme}
          showKeyHints={keyboardActive}
        />
      );
    }
    if (gameMode === "idiom") {
      // Self-contained multi-choice mode: pick the figurative meaning
      // of an English idiom.  Question source is the curated dataset
      // in src/data/idioms.ts, NOT the assignment word pool, so this
      // mode runs independently of the per-question orchestration.
      // finishSelfContainedMode normalizes (correct × 10) and saves
      // before exit — the per-word cap is bypassed so a perfect run
      // on a small assignment still reads as 100.
      return (
        <IdiomGame
          themeColor={modeTheme ?? "sky"}
          speak={speak}
          onFinish={(score) => { finishSelfContainedMode(score, 'idiom'); }}
        />
      );
    }
    if (gameMode === "speed-round") {
      // Self-contained 60-second timer mode.  Generates its own
      // question stream from gameWords (Classic-style — English
      // word + 4 translation options) and runs its own timer +
      // combo logic.  finishSelfContainedMode normalizes (raw × 5)
      // and saves before exit.
      return (
        <SpeedRoundGame
          gameWords={gameWords}
          themeColor={modeTheme ?? "red"}
          targetLanguage={targetLanguage}
          speak={speakWord}
          paused={isPaused}
          onFinish={(score) => { finishSelfContainedMode(score, 'speed-round'); }}
        />
      );
    }
    if (gameMode === "class-minute") {
      // Daily 60-second drill.  Reuses SpeedRoundGame's mechanics —
      // gameWords was pre-seeded by App.tsx's onStartClassMinute with
      // SRS-due words first then assignment fallback, so the same
      // shell drives a more pedagogically targeted run.  Saves with
      // mode='class-minute' so the dashboard can detect today's
      // completion (and tomorrow flip the card back to "ready").
      return (
        <SpeedRoundGame
          gameWords={gameWords}
          themeColor={modeTheme ?? "amber"}
          targetLanguage={targetLanguage}
          speak={speakWord}
          paused={isPaused}
          onFinish={(score) => { finishSelfContainedMode(score, 'class-minute'); }}
        />
      );
    }
    if (gameMode === "review") {
      // Spaced-repetition review session.  Self-fetches the queue of
      // due words on mount via get_due_reviews, runs Classic-style
      // multi-choice on each, and updates the SRS interval per
      // answer via record_review_result.  Word source is the FULL
      // ALL_WORDS pool (not the assignment pool) since reviews span
      // every word the student has ever missed across assignments.
      return (
        <ReviewGame
          allWords={gameWords}
          themeColor={modeTheme ?? "violet"}
          targetLanguage={targetLanguage}
          speak={speakWord}
          onFinish={handleExitGame}
        />
      );
    }
    if (gameMode === "scramble") {
      return (
        <ScrambleGame
          currentWord={currentWord}
          targetLanguage={targetLanguage}
          scrambledWord={scrambledWord}
          spellingInput={spellingInput}
          setSpellingInput={setSpellingInput}
          feedback={feedback}
          onSpellingSubmit={handleSpellingSubmit}
          themeColor={modeTheme}
        />
      );
    }
    // Default: spelling
    return (
      <SpellingGame
        currentWord={currentWord}
        gameMode={gameMode}
        targetLanguage={targetLanguage}
        feedback={feedback}
        spellingInput={spellingInput}
        setSpellingInput={setSpellingInput}
        themeColor={modeTheme}
        onSpellingSubmit={handleSpellingSubmit}
      />
    );
  };

  return (
    // Natural-flow page: short modes fit the screen with no scroll at
    // all; a mode that's genuinely taller than the viewport scrolls the
    // whole page normally (no inner scroll region). Bottom padding
    // reserves space for the two stacked floaters that overlay the page
    // in Quick Play — the device safe-area inset plus the QpReactionBar
    // pill at bottom-3/4 — so the last control (e.g. Spelling's Check)
    // never sits under the reaction bar on phones.
    <div
      className={`min-h-screen ${user?.role === 'student' ? activeThemeConfig.colors.bg : 'bg-stone-100'} flex flex-col items-center p-2 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] font-sans max-w-7xl mx-auto`}>
      {arcadeHubEnabled && (
        <CombosOverlay chain={combo.chain} multiplier={combo.multiplier} />
      )}
      {arcadeHubEnabled && !isFinished && (
        <InGamePetReactor
          stageEmoji={petStageEmoji}
          feedback={feedback}
          comboChain={combo.chain}
          isFinished={isFinished}
        />
      )}
      {saveError && (
        <div className="fixed bottom-4 end-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <AlertTriangle size={18} />
          <span className="text-sm">{saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className="ms-1 hover:opacity-75"
            aria-label={t.dismissError}
            title={t.dismissError}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {/* Interruption pause — phone call / notification / tab switch
          (open-issues §C). Solo/assignment play only; see the hook
          wiring above for why Quick Play is excluded. */}
      {isPaused && <PauseOverlay onResume={resume} />}
      <GameHeader
        score={score}
        xp={xp}
        streak={streak}
        onExit={handleExitGame}
      />

      {/* Shared progress + answer-streak chrome — every orchestrated
          mode gets the same "Question 3 of 10" placement at the top
          (open-issues §C: matching/memory had no progress at all, the
          rest had three competing signals). Self-contained modes own
          their full UI, progress included, so they skip this row. */}
      {!isSelfContainedMode && progressTotal > 0 && (
        <div className="w-full max-w-4xl mx-auto flex items-end gap-3 mb-2 sm:mb-3">
          <GameProgress
            label={progressLabel}
            current={progressCurrent}
            total={progressTotal}
            themeColor={modeTheme}
          />
          {!isPairsMode && <AnswerStreakBadge count={answerStreak} />}
        </div>
      )}

      {/* Single centered column (the Live Rank sidebar was removed long
          ago — every mode, matching/quiz alike, sits centered). The
          min-height pulls content to the vertical centre of the viewport
          on phones; matching/memory get a touch more room for their
          larger grids. Content shorter than this never scrolls. */}
      <div className={`w-full max-w-4xl mx-auto ${(gameMode === 'matching' || gameMode === 'memory-flip') ? 'min-h-[60vh]' : 'min-h-[55vh]'} flex items-center justify-center`}>
        <div className="w-full">
          <AnimatePresence mode="wait">
            {gameMode === "matching" ? (
              <MatchingModeGame
                matchingPairs={matchingPairs}
                matchedIds={matchedIds}
                selectedMatch={selectedMatch}
                isMatchingProcessing={isMatchingProcessing}
                onMatchClick={handleMatchClick}
                themeColor={modeTheme}
                modeLabel={modeLabel}
              />
            ) : gameMode === "memory-flip" ? (
              <MemoryFlipGame
                matchingPairs={matchingPairs}
                matchedIds={matchedIds}
                selectedMatch={selectedMatch}
                isMatchingProcessing={isMatchingProcessing}
                onMatchClick={handleMatchClick}
                themeColor={modeTheme}
                modeLabel={modeLabel}
              />
            ) : (
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                // Multiple-choice wrong taps shake the whole card —
                // border colour alone was invisible to kids mid-game
                // (open-issues §C). Other modes keep the plain settle.
                animate={isMainMultiChoice ? cardShake(feedback, reduceMotion) : { opacity: 1, x: 0 }}
                transition={isMainMultiChoice ? cardShakeTransition(feedback, reduceMotion) : undefined}
                exit={{ opacity: 0, x: -50 }}
                className={`bg-white rounded-xl sm:rounded-2xl shadow-2xl p-2 sm:p-6 text-center relative overflow-hidden transition-colors duration-300 ${feedback === "correct" ? "bg-emerald-50 border-3 border-emerald-500" : feedback === "wrong" ? "bg-rose-50 border-3 border-rose-400" : feedback === "show-answer" ? "bg-amber-50 border-3 border-amber-500" : "border-3 border-transparent"}`}
              >
                {/* The card-edge progress bar that used to sit here was
                    consolidated into the shared GameProgress chrome
                    above the card (open-issues §C). */}

                {/* Show correct answer after 3 failed attempts.  When
                    the rendered answer is an English vocab word we
                    force LTR; otherwise the HE/AR translation gets
                    `dir="auto"` so the browser handles it naturally. */}
                {feedback === "show-answer" && (
                  <div className="absolute top-12 sm:top-16 start-0 end-0 flex justify-center pointer-events-none z-20">
                    <ShowAnswerFeedback
                      answer={gameMode === "reverse" ? currentWord?.english : currentWord?.[targetLanguage]}
                      dir={ENGLISH_ANSWER_MODES.has(gameMode) ? "ltr" : "auto"}
                    />
                  </div>
                )}

                {/* Floating "+10 XP" + sparkle burst on correct taps —
                    ties the reward to the tap itself (screen confetti
                    already fires from celebrate() but reads as ambient,
                    not earned). Multiple-choice trio only for now. */}
                {isMainMultiChoice && <AnswerFeedback feedback={feedback} xpGain={10} />}

                {/* Fill-in-the-Blank renders its own gapped sentence as
                    the prompt — the standard WordPromptCard would show
                    `currentWord.english` (or its translation) and
                    instantly expose the answer.  Hide it for that mode. */}
                {/* Phase-3 redesign (2026-04-30): mode-label pill at
                    the very top of the answer card, theme-coloured
                    when the mode has a theme assigned in MODE_THEME.
                    Modes without a theme (yet) don't render the pill
                    so the legacy layout for them stays unchanged. */}
                {!isSelfContainedMode && modeTheme && (
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <span
                      className={`inline-block ${getThemeColors(modeTheme).pillBg} ${getThemeColors(modeTheme).pillText} font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm`}
                    >
                      {modeLabel}
                    </span>
                  </div>
                )}

                {/* Skip WordPromptCard for modes that render their own
                    prompt: fill-blank (gapped sentence), flashcards (the
                    3D flip card IS the prompt), scramble (interactive
                    letter TILES + own translation), sentence-builder
                    (listen-hero — WordPromptCard otherwise showed a
                    stray gameWords[0] word above it), and letter-sounds
                    (its letter-by-letter reveal IS the word — showing
                    the full English word here spoiled the mechanic). */}
                {!isSelfContainedMode && gameMode !== "fill-blank" && gameMode !== "flashcards" && gameMode !== "scramble" && gameMode !== "sentence-builder" && gameMode !== "letter-sounds" && (
                  <WordPromptCard
                    currentWord={currentWord}
                    gameMode={gameMode}
                    targetLanguage={targetLanguage}
                    feedback={feedback}
                    isFlipped={isFlipped}
                    scrambledWord={scrambledWord}
                    speakWord={speakWord}
                    themeColor={modeTheme}
                  />
                )}

                {!isSelfContainedMode && user?.role === "student" && gameMode !== "flashcards" && gameMode !== "sentence-builder" && gameMode !== "fill-blank" && !isFinished && (
                  <PowerUpToolbar
                    user={user}
                    gameMode={gameMode}
                    feedback={feedback}
                    options={options}
                    hiddenOptions={hiddenOptions}
                    setHiddenOptions={setHiddenOptions}
                    currentWord={currentWord}
                    gameWordsLength={gameWords.length}
                    spellingInput={spellingInput}
                    setSpellingInput={setSpellingInput}
                    setCurrentIndex={setCurrentIndex}
                    setUser={setUser}
                    shuffle={shuffle}
                  />
                )}

                {renderModeContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* The below-the-card progress bar + "Word 3 of 10" label moved to
          the shared GameProgress chrome at the top of the page, where
          it's visible without scrolling on every mode (open-issues §C). */}
    </div>
  );
}
