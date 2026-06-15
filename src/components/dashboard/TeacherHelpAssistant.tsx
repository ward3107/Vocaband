import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Mic, Send, Sparkles, X } from "lucide-react";
import type { Language } from "../../hooks/useLanguage";
import { supabase } from "../../core/supabase";
import { startHereT } from "../../locales/teacher/start-here";
import { scrollToDashboardSection, DASHBOARD_SECTION } from "./dashboardScroll";

type TopicId = "play" | "setup" | "login" | "homework" | "progress" | "gamesDiff";

interface TopicAction {
  label: string;
  run: () => void;
  primary?: boolean;
}

interface Topic {
  id: TopicId;
  question: string;
  answer: string;
  actions: TopicAction[];
}

interface TeacherHelpAssistantProps {
  language: Language;
  isRTL: boolean;
  hasClasses: boolean;
  pendingStudentsCount: number;
  onNewClass: () => void;
  onClassroomClick: () => void;
  onApprovalsClick: () => void;
}

// Minimal shape for the Web Speech API (not in lib.dom for all targets).
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const RECOGNITION_LANG: Record<Language, string> = {
  en: "en-US",
  he: "he-IL",
  ar: "ar-SA",
  ru: "ru-RU",
};

// A friendly face per topic — shown on the question rows and as the
// avatar above each answer so the panel reads as a chat, not a FAQ.
const TOPIC_EMOJI: Record<TopicId, string> = {
  play: "🎮",
  setup: "👥",
  login: "🔑",
  homework: "📝",
  progress: "📊",
  gamesDiff: "🎲",
};

// Language-independent keyword bank (English + Hebrew + Arabic roots in
// one list per topic) so a teacher gets matched whatever language they
// type or speak in — even if it differs from the current UI language.
// Matching is plain lowercase substring (`includes`), so entries are
// short roots that survive prefixes/suffixes. Topic order (below) breaks
// ties, so the more specific topics (gamesDiff, login) come first.
const KEYWORDS: Record<TopicId, string[]> = {
  gamesDiff: [
    "differ", "between", " vs ", "which game", "kind of game", "type of game", "compare",
    "הבדל", "בין המשחק", "איזה משחק", "סוג משחק", "להשוות",
    "الفرق", "فرق", "بين الألعاب", "أي لعبة", "نوع اللعبة", "مقارنة",
  ],
  login: [
    "log in", "login", "sign in", "pin", "qr", "scan", "password", "join code", "class code", "connect",
    "מתחבר", "התחבר", "להתחבר", "כניס", "סיסמ", "קוד כיתה", "סורק",
    "تسجيل", "دخول", "كلمة المرور", "ينضم", "انضمام", "رمز الفصل", "مسح",
  ],
  homework: [
    "homework", "assign", "worksheet", "print", "pdf", "practice", "task", "sheet",
    "שיעור", "מטל", "משימ", "דף עבוד", "להדפיס", "הדפס", "תרגול", "תרגיל",
    "واجب", "مهم", "ورقة", "طباعة", "طبع", "تمرين", "تدريب",
  ],
  progress: [
    "progress", "score", "doing", "report", "analytic", "grade", "result", "how are", "struggl", "data", "statistic",
    "ציון", "התקדמ", "מתקדמ", "דוח", "נתונ", "תוצא", "מתקש", "סטטיסט",
    "تقدم", "درج", "تقرير", "نتائج", "بيانات", "إحصاء", "يعاني",
  ],
  setup: [
    "add student", "student", "roster", "create class", "new class", "enroll", "set up", "setup", "add my", "class",
    "תלמיד", "כית", "להוסיף", "רשימ", "להקים", "ליצור", "רישום",
    "طالب", "طلاب", "صف", "إنشاء", "قائمة", "إعداد", "إضاف",
  ],
  play: [
    "play", "game", "fun", "activity", "warm", "race", "quiz", "live",
    "לשחק", "משחק", "כיף", "פעיל", "מרוץ", "חידון", "תחרות",
    "لعب", "لعبة", "ألعاب", "مرح", "نشاط", "سباق", "مباشر", "مسابقة",
  ],
};

/**
 * Floating "Need help?" assistant for the teacher dashboard. No AI
 * backend — it's a rule-based concierge: the teacher taps a question
 * (or types / speaks one), and we answer in plain language and route
 * them to the right tool. Mirrors StartHerePanel's content so the two
 * surfaces stay in sync; the assistant adds the two "explain only"
 * topics (how students log in, difference between games) that don't
 * have their own dashboard card.
 *
 * Lives on the English dashboard only. Voice input is progressive
 * enhancement via the browser Web Speech API — the mic button only
 * renders where the API exists, and typing always works as a fallback.
 */
export default function TeacherHelpAssistant({
  language,
  isRTL,
  hasClasses,
  pendingStudentsCount,
  onNewClass,
  onClassroomClick,
  onApprovalsClick,
}: TeacherHelpAssistantProps) {
  const t = startHereT[language];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<TopicId | null>(null);
  const [query, setQuery] = useState("");
  const [noMatch, setNoMatch] = useState(false);
  const [listening, setListening] = useState(false);
  // Live AI answer (from /api/teacher-assistant). Distinct from `active`
  // (a tapped preset) so the two answer views can look different.
  const [aiResponse, setAiResponse] = useState<{ answer: string; action: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const SpeechRecognitionCtor = useMemo(() => getSpeechRecognition(), []);

  // Single close path so every dismissal (scrim, X, Escape, an action
  // button) leaves the panel fresh for next time. Kept out of an effect
  // to avoid synchronous setState-in-effect cascades.
  const closePanel = () => {
    setOpen(false);
    setActive(null);
    setNoMatch(false);
    setQuery("");
    setAiResponse(null);
    setThinking(false);
  };

  const toClasses: TopicAction = {
    label: t.setupClassesBtn,
    run: () => scrollToDashboardSection(DASHBOARD_SECTION.myClasses),
  };
  const createClass: TopicAction = { label: t.setupCreateBtn, run: onNewClass, primary: true };

  // Topic order also decides match ties — keep the specific topics
  // (gamesDiff, login) ahead of the broad ones (setup, play).
  const topics: Topic[] = [
    {
      id: "gamesDiff",
      question: t.qGamesDiff,
      answer: t.aGamesDiff,
      actions: [
        { label: t.playLiveBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.liveGames), primary: true },
        { label: t.playRoomBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.classroomTools) },
      ],
    },
    {
      id: "login",
      question: t.qLogin,
      answer: t.aLogin,
      actions: hasClasses ? [toClasses] : [createClass],
    },
    {
      id: "homework",
      question: t.qHomework,
      answer: t.homeworkExplainer,
      actions: hasClasses
        ? [{ ...toClasses, primary: true }]
        : [createClass],
    },
    {
      id: "progress",
      question: t.qProgress,
      answer: t.progressExplainer,
      actions: [
        { label: t.progressClassroomBtn, run: onClassroomClick, primary: true },
        ...(pendingStudentsCount > 0 ? [{ label: t.progressApprovalsBtn, run: onApprovalsClick }] : []),
      ],
    },
    {
      id: "setup",
      question: t.qSetup,
      answer: t.setupExplainer,
      actions: [createClass, toClasses],
    },
    {
      id: "play",
      question: t.qPlay,
      answer: t.playExplainer,
      actions: [
        { label: t.playLiveBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.liveGames), primary: true },
        { label: t.playRoomBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.classroomTools) },
      ],
    },
  ];

  const matchTopic = (text: string): TopicId | null => {
    const q = ` ${text.toLowerCase().trim()} `;
    if (!q.trim()) return null;
    for (const topic of topics) {
      if (KEYWORDS[topic.id].some((k) => q.includes(k))) return topic.id;
    }
    return null;
  };

  // Maps the AI's chosen destination to a real navigation button. The
  // server only ever returns one of these ids, so an unknown value (or
  // "none") simply yields no button — the answer text still shows.
  const actionToButton = (action: string): TopicAction | null => {
    switch (action) {
      case "live_games":
        return { label: t.playLiveBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.liveGames), primary: true };
      case "classroom_tools":
        return { label: t.playRoomBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.classroomTools), primary: true };
      case "create_class":
        return { label: t.setupCreateBtn, run: onNewClass, primary: true };
      case "my_classes":
        return { label: t.setupClassesBtn, run: () => scrollToDashboardSection(DASHBOARD_SECTION.myClasses), primary: true };
      case "classroom":
        return { label: t.progressClassroomBtn, run: onClassroomClick, primary: true };
      case "approvals":
        return { label: t.progressApprovalsBtn, run: onApprovalsClick, primary: true };
      default:
        return null;
    }
  };

  // Ask the Gemini-backed endpoint. Returns null on any failure (no
  // session, network/API down, bad payload) so the caller can fall back
  // to the offline keyword router.
  const askAI = async (text: string): Promise<{ answer: string; action: string } | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return null;
      const res = await fetch("/api/teacher-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, language, context: { hasClasses, pendingStudentsCount } }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { answer?: string; action?: string };
      if (!data.answer) return null;
      return { answer: data.answer, action: data.action ?? "none" };
    } catch {
      return null;
    }
  };

  // Free-typed / spoken questions go to the AI first (genuine HE/AR/EN
  // understanding); on any failure we fall back to keyword routing so
  // the helper still works offline. Tapping a preset question skips this
  // entirely (handled inline) and stays instant + free.
  const submitQuery = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setQuery("");
    setActive(null);
    setNoMatch(false);
    setAiResponse(null);
    setThinking(true);

    const ai = await askAI(trimmed);
    if (ai) {
      setAiResponse(ai);
      setThinking(false);
      return;
    }

    // Offline / error fallback.
    setThinking(false);
    const id = matchTopic(trimmed);
    if (id) setActive(id);
    else setNoMatch(true);
  };

  // Close on Escape while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setActive(null);
        setNoMatch(false);
        setQuery("");
        setAiResponse(null);
        setThinking(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Tear down any in-flight recognition on unmount / close.
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const startListening = () => {
    if (!SpeechRecognitionCtor || listening) return;
    try {
      const rec = new SpeechRecognitionCtor();
      rec.lang = RECOGNITION_LANG[language];
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const transcript = e.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) {
          setQuery(transcript);
          void submitQuery(transcript);
        }
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const activeTopic = active ? topics.find((x) => x.id === active) ?? null : null;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <>
      {/* Floating trigger — anchored to the start side so it never
          collides with the theme / presentation toggles on the end. */}
      <button
        type="button"
        onClick={() => (open ? closePanel() : setOpen(true))}
        aria-label={t.helperFab}
        style={{
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          background: "linear-gradient(135deg, var(--vb-accent) 0%, color-mix(in srgb, var(--vb-accent), #000 28%) 100%)",
          color: "var(--vb-accent-text)",
          boxShadow: "0 14px 30px -12px color-mix(in srgb, var(--vb-accent), transparent 40%)",
        }}
        className="fixed bottom-5 start-5 sm:bottom-6 sm:start-6 z-30 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold hover:scale-105 active:scale-95 transition-transform"
      >
        <Sparkles size={18} />
        <span>{t.helperFab}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Scrim — tap to dismiss. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(15,23,42,0.35)" }}
              onClick={closePanel}
            />

            <motion.div
              ref={panelRef}
              dir={isRTL ? "rtl" : "ltr"}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.2 }}
              className="fixed z-50 flex flex-col overflow-hidden rounded-3xl bottom-3 start-3 end-3 sm:bottom-6 sm:start-6 sm:end-auto sm:w-[380px] max-h-[78vh]"
              style={{
                background: "var(--vb-surface)",
                border: "1.5px solid var(--vb-border)",
                boxShadow: "0 24px 60px -20px rgba(15,23,42,0.5)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between gap-2 px-4 py-3.5"
                style={{
                  background: "linear-gradient(135deg, var(--vb-accent) 0%, color-mix(in srgb, var(--vb-accent), #000 28%) 100%)",
                  color: "var(--vb-accent-text)",
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles size={18} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[15px] font-extrabold leading-tight truncate">{t.helperTitle}</div>
                    <div className="text-[11px] opacity-85 truncate">{t.helperSub}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label={t.helperClose}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="shrink-0 rounded-full p-1.5 hover:bg-black/15 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {thinking ? (
                  <div className="flex items-center gap-3 px-1 py-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[18px] leading-none"
                      style={{ background: "var(--vb-accent-soft)" }}
                    >
                      <Sparkles size={18} style={{ color: "var(--vb-accent)" }} />
                    </span>
                    <span className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="inline-block h-2 w-2 rounded-full animate-bounce"
                          style={{ background: "var(--vb-accent)", animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                  </div>
                ) : aiResponse ? (
                  (() => {
                    const btn = actionToButton(aiResponse.action);
                    return (
                      <div>
                        <button
                          type="button"
                          onClick={() => setAiResponse(null)}
                          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", color: "var(--vb-accent)" }}
                          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold hover:opacity-80 transition-opacity"
                        >
                          <BackIcon size={14} />
                          {t.helperBack}
                        </button>
                        <div className="flex items-start gap-2.5">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[18px] leading-none"
                            style={{ background: "var(--vb-accent-soft)" }}
                          >
                            <Sparkles size={18} style={{ color: "var(--vb-accent)" }} />
                          </span>
                          <p
                            className="whitespace-pre-line rounded-2xl px-3.5 py-3 text-[13px] leading-relaxed flex-1"
                            style={{ background: "var(--vb-surface-alt)", color: "var(--vb-text-secondary)" }}
                          >
                            {aiResponse.answer}
                          </p>
                        </div>
                        {btn && (
                          <div className="mt-4 flex flex-wrap gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                btn.run();
                                closePanel();
                              }}
                              style={{
                                touchAction: "manipulation",
                                WebkitTapHighlightColor: "transparent",
                                background:
                                  "linear-gradient(135deg, var(--vb-accent) 0%, color-mix(in srgb, var(--vb-accent), #000 28%) 100%)",
                                color: "var(--vb-accent-text)",
                                boxShadow: "0 10px 22px -10px color-mix(in srgb, var(--vb-accent), transparent 45%)",
                              }}
                              className="inline-flex items-center rounded-full px-4 py-2.5 text-[13px] font-bold active:scale-95 transition-transform"
                            >
                              {btn.label}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : activeTopic ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setActive(null)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", color: "var(--vb-accent)" }}
                      className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold hover:opacity-80 transition-opacity"
                    >
                      <BackIcon size={14} />
                      {t.helperBack}
                    </button>
                    {/* Avatar + question, then the answer as a soft chat
                        bubble so the multi-line steps read clearly. */}
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[20px] leading-none"
                        style={{ background: "var(--vb-accent-soft)" }}
                      >
                        {TOPIC_EMOJI[activeTopic.id]}
                      </span>
                      <div
                        className="text-[14px] font-extrabold tracking-[-0.01em] leading-snug"
                        style={{ color: "var(--vb-text-primary)" }}
                      >
                        {activeTopic.question}
                      </div>
                    </div>
                    <p
                      className="whitespace-pre-line rounded-2xl px-3.5 py-3 text-[13px] leading-relaxed"
                      style={{ background: "var(--vb-surface-alt)", color: "var(--vb-text-secondary)" }}
                    >
                      {activeTopic.answer}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {activeTopic.actions.map((a) => (
                        <button
                          key={a.label}
                          type="button"
                          onClick={() => {
                            a.run();
                            closePanel();
                          }}
                          style={
                            a.primary
                              ? {
                                  touchAction: "manipulation",
                                  WebkitTapHighlightColor: "transparent",
                                  background:
                                    "linear-gradient(135deg, var(--vb-accent) 0%, color-mix(in srgb, var(--vb-accent), #000 28%) 100%)",
                                  color: "var(--vb-accent-text)",
                                  boxShadow: "0 10px 22px -10px color-mix(in srgb, var(--vb-accent), transparent 45%)",
                                }
                              : {
                                  touchAction: "manipulation",
                                  WebkitTapHighlightColor: "transparent",
                                  background: "var(--vb-surface-alt)",
                                  color: "var(--vb-text-primary)",
                                  border: "1.5px solid var(--vb-border)",
                                }
                          }
                          className="inline-flex items-center rounded-full px-4 py-2.5 text-[13px] font-bold active:scale-95 transition-transform"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    {noMatch ? (
                      <div
                        className="mb-3 rounded-2xl px-3.5 py-2.5 text-[12px] font-semibold"
                        style={{ background: "var(--vb-accent-soft)", color: "var(--vb-text-secondary)" }}
                      >
                        {t.helperNoMatch}
                      </div>
                    ) : (
                      <div
                        className="mb-2.5 px-1 text-[11px] font-extrabold uppercase tracking-[0.12em]"
                        style={{ color: "var(--vb-text-muted)" }}
                      >
                        {t.helperPickPrompt}
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      {topics.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => {
                            setActive(topic.id);
                            setNoMatch(false);
                          }}
                          style={{
                            touchAction: "manipulation",
                            WebkitTapHighlightColor: "transparent",
                            background: "var(--vb-surface-alt)",
                            border: "1.5px solid var(--vb-border)",
                            color: "var(--vb-text-primary)",
                          }}
                          className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-start text-[13px] font-semibold hover:-translate-y-0.5 transition-transform"
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[17px] leading-none"
                            style={{ background: "var(--vb-accent-soft)" }}
                          >
                            {TOPIC_EMOJI[topic.id]}
                          </span>
                          <span className="min-w-0 flex-1">{topic.question}</span>
                          <ArrowRight size={15} className={`shrink-0 opacity-50 ${isRTL ? "-scale-x-100" : ""}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Composer — type or (where supported) speak. */}
              <div
                className="flex items-center gap-2 px-3 py-3"
                style={{ borderTop: "1.5px solid var(--vb-border)", background: "var(--vb-surface-alt)" }}
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitQuery(query);
                  }}
                  disabled={thinking}
                  placeholder={listening ? t.helperListening : t.helperInputPlaceholder}
                  style={{
                    background: "var(--vb-surface)",
                    border: "1.5px solid var(--vb-border)",
                    color: "var(--vb-text-primary)",
                  }}
                  className="min-w-0 flex-1 rounded-full px-4 py-2.5 text-[13px] outline-none focus:border-[var(--vb-accent)] disabled:opacity-60"
                />
                {SpeechRecognitionCtor && (
                  <button
                    type="button"
                    onClick={startListening}
                    disabled={thinking}
                    aria-label={t.helperMicLabel}
                    style={{
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                      background: listening ? "var(--vb-accent)" : "var(--vb-surface)",
                      color: listening ? "var(--vb-accent-text)" : "var(--vb-text-secondary)",
                      border: "1.5px solid var(--vb-border)",
                    }}
                    className={`shrink-0 rounded-full p-2.5 transition-transform active:scale-95 disabled:opacity-60 ${listening ? "animate-pulse" : ""}`}
                  >
                    <Mic size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void submitQuery(query)}
                  disabled={thinking}
                  aria-label={t.helperFab}
                  style={{
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    background: "linear-gradient(135deg, var(--vb-accent) 0%, color-mix(in srgb, var(--vb-accent), #000 28%) 100%)",
                    color: "var(--vb-accent-text)",
                  }}
                  className="shrink-0 rounded-full p-2.5 active:scale-95 transition-transform disabled:opacity-60"
                >
                  <Send size={16} className={isRTL ? "-scale-x-100" : ""} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
