import { useState, useCallback, useEffect, useRef } from "react";
import { supabase, type AppUser, type AssignmentData } from "../core/supabase";
import type { Word } from "../data/vocabulary";

export const QUICK_PLAY_AVATARS = ['🦊', '🐸', '🦁', '🐼', '🐨', '🦋', '🐙', '🦄', '🐳', '🐰', '🦈', '🐯', '🦉', '🐺', '🦜', '🐹'];

// Cryptographically secure random integer [0, max)
const secureRandomInt = (max: number) => {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
};

export interface QuickPlayState {
  quickPlaySessionCode: string | null;
  setQuickPlaySessionCode: (v: string | null) => void;
  quickPlaySelectedWords: Word[];
  setQuickPlaySelectedWords: React.Dispatch<React.SetStateAction<Word[]>>;
  quickPlayActiveSession: { id: string; sessionCode: string; wordIds: number[]; words: Word[] } | null;
  setQuickPlayActiveSession: (v: { id: string; sessionCode: string; wordIds: number[]; words: Word[] } | null) => void;
  quickPlayStudentName: string;
  setQuickPlayStudentName: (v: string) => void;
  quickPlayAvatar: string;
  setQuickPlayAvatar: (v: string) => void;
  quickPlayJoinedStudents: { name: string; score: number; avatar: string; lastSeen: string; mode: string; studentUid: string }[];
  setQuickPlayJoinedStudents: React.Dispatch<React.SetStateAction<{ name: string; score: number; avatar: string; lastSeen: string; mode: string; studentUid: string }[]>>;
  quickPlayCustomWords: Map<string, { hebrew: string; arabic: string }>;
  setQuickPlayCustomWords: (v: Map<string, { hebrew: string; arabic: string }>) => void;
  quickPlayAddingCustom: Set<string>;
  setQuickPlayAddingCustom: (v: Set<string>) => void;
  quickPlayTranslating: Set<string>;
  setQuickPlayTranslating: (v: Set<string>) => void;
  quickPlayKicked: boolean;
  setQuickPlayKicked: (v: boolean) => void;
  quickPlaySessionEnded: boolean;
  setQuickPlaySessionEnded: (v: boolean) => void;
  quickPlayCompletedModes: Set<string>;
  setQuickPlayCompletedModes: React.Dispatch<React.SetStateAction<Set<string>>>;
  quickPlayStatusMessage: string;
  setQuickPlayStatusMessage: (v: string) => void;
  quickPlayNameInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useQuickPlay(
  view: string,
  user: AppUser | null,
  setActiveAssignment: (a: AssignmentData | null) => void,
): QuickPlayState {
  const [quickPlaySessionCode, setQuickPlaySessionCode] = useState<string | null>(null);
  const [quickPlaySelectedWords, setQuickPlaySelectedWords] = useState<Word[]>([]);
  const [quickPlayActiveSession, setQuickPlayActiveSession] = useState<{ id: string; sessionCode: string; wordIds: number[]; words: Word[] } | null>(null);
  const [quickPlayStudentName, setQuickPlayStudentName] = useState("");
  const [quickPlayAvatar, setQuickPlayAvatar] = useState(() => QUICK_PLAY_AVATARS[secureRandomInt(QUICK_PLAY_AVATARS.length)]);
  const quickPlayNameInputRef = useRef<HTMLInputElement | null>(null);
  const [quickPlayJoinedStudents, setQuickPlayJoinedStudents] = useState<{ name: string; score: number; avatar: string; lastSeen: string; mode: string; studentUid: string }[]>([]);
  const [quickPlayCustomWords, setQuickPlayCustomWords] = useState<Map<string, { hebrew: string; arabic: string }>>(new Map());
  const [quickPlayAddingCustom, setQuickPlayAddingCustom] = useState<Set<string>>(new Set());
  const [quickPlayTranslating, setQuickPlayTranslating] = useState<Set<string>>(new Set());
  const [quickPlayKicked, setQuickPlayKicked] = useState(false);
  const [quickPlaySessionEnded, setQuickPlaySessionEnded] = useState(false);
  const [quickPlayCompletedModes, setQuickPlayCompletedModes] = useState<Set<string>>(new Set());
  const [quickPlayStatusMessage, setQuickPlayStatusMessage] = useState("");

  // Helper: aggregate raw progress rows into leaderboard format
  const aggregateProgress = useCallback((progressData: any[]) => {
    const studentMap = new Map<string, { name: string; score: number; avatar: string; lastSeen: string; mode: string; studentUid: string; modes: Map<string, number> }>();

    progressData.forEach((p: any) => {
      const key = p.student_uid || p.student_name;
      const existing = studentMap.get(key);

      if (!existing) {
        const modes = new Map<string, number>();
        if (p.mode !== 'joined') modes.set(p.mode, Number(p.score));
        studentMap.set(key, {
          name: p.student_name,
          score: p.mode === 'joined' ? 0 : Number(p.score),
          avatar: p.avatar || '🦊',
          lastSeen: p.completed_at,
          mode: p.mode,
          studentUid: p.student_uid,
          modes
        });
      } else {
        if (new Date(p.completed_at) > new Date(existing.lastSeen)) {
          existing.lastSeen = p.completed_at;
          existing.mode = p.mode;
        }
        if (p.mode !== 'joined') {
          const prev = existing.modes.get(p.mode) || 0;
          if (Number(p.score) > prev) existing.modes.set(p.mode, Number(p.score));
        }
        let total = 0;
        existing.modes.forEach(v => { total += v; });
        existing.score = total;
      }
    });

    return Array.from(studentMap.values()).sort((a, b) => b.score - a.score);
  }, []);

  // Teacher monitor: realtime subscription to student progress
  useEffect(() => {
    if (view !== "quick-play-teacher-monitor" || !quickPlayActiveSession?.id) return;

    const sessionId = quickPlayActiveSession.id;

    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('progress')
        .select('student_name, student_uid, score, avatar, completed_at, mode')
        .eq('assignment_id', sessionId)
        .order('completed_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[Quick Play Monitor] Error fetching progress:', error);
        return;
      }
      if (data) {
        setQuickPlayJoinedStudents(aggregateProgress(data));
      }
    };
    fetchProgress();

    const channel = supabase
      .channel(`qp-progress-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'progress',
          filter: `assignment_id=eq.${sessionId}`
        },
        () => {
          fetchProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view, quickPlayActiveSession?.id, aggregateProgress]);

  // Student: subscribe to session end + kick events
  useEffect(() => {
    if (!user?.isGuest || !quickPlayActiveSession?.sessionCode) return;

    const sessionCode = quickPlayActiveSession.sessionCode;
    const sessionId = quickPlayActiveSession.id;

    const sessionChannel = supabase
      .channel(`qp-session-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quick_play_sessions',
          filter: `session_code=eq.${sessionCode}`
        },
        (payload) => {
          if (payload.new && !(payload.new as any).is_active) {
            setQuickPlaySessionEnded(true);
            setActiveAssignment(null);
          }
        }
      )
      .subscribe();

    const kickChannel = supabase
      .channel(`qp-kick-${sessionId}-${user.uid}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'progress',
          filter: `assignment_id=eq.${sessionId}`
        },
        () => {
          supabase.auth.getSession().then(({ data: { session: authSess } }) => {
            const authUid = authSess?.user?.id;
            const query = supabase
              .from('progress')
              .select('id')
              .eq('assignment_id', sessionId);
            if (authUid) {
              query.eq('student_uid', authUid);
            } else {
              query.eq('student_name', user!.displayName);
            }
            query.limit(1).then(({ data }) => {
              if (!data || data.length === 0) {
                setQuickPlayKicked(true);
                setActiveAssignment(null);
              }
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(kickChannel);
    };
  }, [user?.isGuest, quickPlayActiveSession?.sessionCode, quickPlayActiveSession?.id, user?.uid, user?.displayName, setActiveAssignment]);

  return {
    quickPlaySessionCode, setQuickPlaySessionCode,
    quickPlaySelectedWords, setQuickPlaySelectedWords,
    quickPlayActiveSession, setQuickPlayActiveSession,
    quickPlayStudentName, setQuickPlayStudentName,
    quickPlayAvatar, setQuickPlayAvatar,
    quickPlayJoinedStudents, setQuickPlayJoinedStudents,
    quickPlayCustomWords, setQuickPlayCustomWords,
    quickPlayAddingCustom, setQuickPlayAddingCustom,
    quickPlayTranslating, setQuickPlayTranslating,
    quickPlayKicked, setQuickPlayKicked,
    quickPlaySessionEnded, setQuickPlaySessionEnded,
    quickPlayCompletedModes, setQuickPlayCompletedModes,
    quickPlayStatusMessage, setQuickPlayStatusMessage,
    quickPlayNameInputRef,
  };
}
