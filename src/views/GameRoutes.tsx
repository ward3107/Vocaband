/**
 * The four game-flow view branches — mode selection (English or
 * Hebrew picker), mode intro (instructions + language picker),
 * game-finished (results + XP), and the default GameActiveView.
 *
 * Lifts ~165 lines of JSX out of App.tsx's tail.  The default branch
 * (GameActiveView) is rendered when none of the other game-flow gates
 * match — same as the bare return in App.tsx used to be.
 *
 * Reads its dependencies from GameRouteContext (App.tsx wraps this in a
 * GameRouteProvider).  Views that are used solely here (GameActiveView,
 * GameModeIntroView, GameFinishedView) consume the context directly, so
 * the bag is no longer drilled through them.  GameModeSelectionView and
 * HebrewModeSelectionView stay prop-fed — GameModeSelectionView is also
 * rendered standalone in tests, and HebrewModeSelectionView only takes
 * inline-composed handlers built here.
 */
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { LazyWrapper } from '../components/SuspenseWrapper';
import { gameActiveT } from '../locales/student/game-active';
import { primeAudio } from '../utils/primeAudio';
import { useGameRoute, type GameRoutesDeps } from './GameRouteContext';

// Re-export so existing importers keep resolving GameRoutesDeps from here.
export type { GameRoutesDeps };

const HebrewModeSelectionView = lazyWithRetry(() => import('./HebrewModeSelectionView'));
const GameModeSelectionView = lazyWithRetry(() => import('./GameModeSelectionView'));
const GameModeIntroView = lazyWithRetry(() => import('./GameModeIntroView'));
const GameFinishedView = lazyWithRetry(() => import('./GameFinishedView'));
const GameActiveView = lazyWithRetry(() => import('./GameActiveView'));

export function GameRoute() {
  const deps = useGameRoute();
  const {
    view, user, language,
    showModeSelection, setShowModeSelection, activeAssignment, studentProgress,
    setGameMode, setShowModeIntro, setView, handleExitGame, quickPlayCompletedModes,
    petDisplayName, petXp, petCurrentStage, petNextStage, petClaimableMilestone, onClaimPetMilestone,
    showModeIntro,
    gameDebug, gameMode, currentIndex, isFinished, feedback, isProcessingRef, currentWord,
    quickPlayActiveSession,
    setUser,
    cleanupSessionData, cleanupQuickPlayGuest,
    setQuickPlayActiveSession, setQuickPlayStudentName,
  } = deps;

  const tLoading = gameActiveT[language];

  // Mode picker — Hebrew assignments get the 4-mode native picker;
  // English ones get the full GameModeSelectionView.  Branch on the
  // assignment's subject column.
  if (view === 'game' && showModeSelection) {
    if (activeAssignment?.subject === 'hebrew') {
      return (
        <LazyWrapper loadingMessage={tLoading.loadingHebrewModes}>
          <HebrewModeSelectionView
            activeAssignment={activeAssignment}
            onPickMode={(mode) => {
              setShowModeSelection(false);
              if (mode === 'niqqud') setView('vocahebrew-niqqud');
              else if (mode === 'shoresh') setView('vocahebrew-shoresh');
              else if (mode === 'listening') setView('vocahebrew-listening');
            }}
            onExit={handleExitGame}
          />
        </LazyWrapper>
      );
    }
    return (
      <LazyWrapper loadingMessage={tLoading.loadingGameModes}>
        <GameModeSelectionView
          activeAssignment={activeAssignment}
          studentProgress={studentProgress}
          isQuickPlayGuest={!!user?.isGuest}
          quickPlayCompletedModes={quickPlayCompletedModes}
          setGameMode={setGameMode}
          setShowModeSelection={setShowModeSelection}
          setShowModeIntro={setShowModeIntro}
          handleExitGame={handleExitGame}
          petDisplayName={petDisplayName}
          petXp={petXp}
          petCurrentStage={petCurrentStage}
          petNextStage={petNextStage}
          petClaimableMilestone={petClaimableMilestone}
          onClaimPetMilestone={onClaimPetMilestone}
        />
      </LazyWrapper>
    );
  }

  if (isFinished) {
    return (
      <LazyWrapper loadingMessage={tLoading.loadingResults}>
        <GameFinishedView
          quickPlaySessionCode={quickPlayActiveSession?.sessionCode}
          onQuickPlayExit={() => {
            cleanupSessionData();
            cleanupQuickPlayGuest().catch(() => { /* fire-and-forget */ });
            setQuickPlayActiveSession(null);
            setQuickPlayStudentName('');
            setUser(null);
            setView('public-landing');
          }}
        />
      </LazyWrapper>
    );
  }

  // Mode intro instructions with translations
  if (showModeIntro) {
    return (
      <LazyWrapper loadingMessage={tLoading.loadingGeneric}>
        <GameModeIntroView
          onLetsGo={() => {
            // iOS Safari audio unlock — the "Let's Go!" tap is the last
            // user-gesture before the first word auto-speaks from a
            // setTimeout in useGameModeSetup. Without priming here, iOS
            // silently swallows that first (and every) speak() call and
            // the student thinks the mode is broken. Idempotent + cheap.
            primeAudio();
            gameDebug.logModeIntroComplete({ mode: gameMode });
            gameDebug.logState({
              view, gameMode, showModeSelection, showModeIntro: false,
              currentIndex, isFinished, feedback,
              isProcessing: isProcessingRef.current,
              currentWord: currentWord ? { id: currentWord.id, english: currentWord.english } : undefined,
            }, 'lets_go_clicked');
            setShowModeIntro(false);
          }}
        />
      </LazyWrapper>
    );
  }

  // Default: game-active view.  Consumes the whole bag from context.
  return (
    <LazyWrapper loadingMessage={tLoading.loadingGame}>
      <GameActiveView />
    </LazyWrapper>
  );
}
