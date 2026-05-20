import QuickPlayMonitor from "../components/QuickPlayMonitor";
import { supabase } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";

interface QuickPlaySession {
  id: string;
  sessionCode: string;
  wordIds: number[];
  words: Word[];
}

interface QuickPlayTeacherMonitorViewProps {
  quickPlayActiveSession: QuickPlaySession;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setQuickPlayActiveSession: (s: QuickPlaySession | null) => void;
  setQuickPlaySelectedWords: (w: Word[]) => void;
  setQuickPlaySessionCode: (c: string | null) => void;
  setQuickPlayCustomWords: (m: Map<string, { hebrew: string; arabic: string }>) => void;
  setQuickPlayAddingCustom: (s: Set<string>) => void;
  setQuickPlayTranslating: (s: Set<string>) => void;
  cleanupSessionData: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function QuickPlayTeacherMonitorView({
  quickPlayActiveSession,
  setView,
  setQuickPlayActiveSession,
  setQuickPlaySelectedWords,
  setQuickPlaySessionCode,
  setQuickPlayCustomWords,
  setQuickPlayAddingCustom,
  setQuickPlayTranslating,
  cleanupSessionData,
  showToast,
}: QuickPlayTeacherMonitorViewProps) {
  return (
    <QuickPlayMonitor
      session={quickPlayActiveSession}
      onBack={() => {
        cleanupSessionData(); // Clear save queue and timers
        setView("teacher-dashboard");
        setQuickPlayActiveSession(null);
        setQuickPlaySelectedWords([]);
        setQuickPlaySessionCode(null);
        setQuickPlayCustomWords(new Map());
        setQuickPlayAddingCustom(new Set());
        setQuickPlayTranslating(new Set());
        try { localStorage.removeItem('vocaband_quick_play_session'); } catch {}
      }}
      onEndSession={async () => {
        showToast("Ending session...", "info");
        const { error } = await supabase.rpc('end_quick_play_session', {
          p_session_code: quickPlayActiveSession.sessionCode
        });
        if (error) {
          showToast("Failed to end session: " + error.message, "error");
          return;
        }
        cleanupSessionData(); // Clear save queue and timers
        setView("teacher-dashboard");
        setQuickPlayActiveSession(null);
        setQuickPlaySelectedWords([]);
        setQuickPlaySessionCode(null);
        setQuickPlayCustomWords(new Map());
        setQuickPlayAddingCustom(new Set());
        setQuickPlayTranslating(new Set());
        try { localStorage.removeItem('vocaband_quick_play_session'); } catch {}
        showToast("Quick Play session ended", "success");
      }}
      showToast={showToast}
    />
  );
}
