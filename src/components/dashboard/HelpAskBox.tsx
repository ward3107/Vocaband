import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Languages, Mic, Send, Sparkles, X } from "lucide-react";
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

interface HelpAskBoxProps {
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

// Speak-language picker labels. The Web Speech API can't auto-detect the
// spoken language — it must be told before listening — so the teacher
// picks which language they're about to speak. Defaults to the dashboard
// language but can differ (e.g. an English-dashboard teacher speaking
// Arabic). The transcript then drives the AI's reply language.
const SPEAK_LANGS: Language[] = ["en", "he", "ar", "ru"];
const SPEAK_LANG_LABEL: Record<Language, string> = {
  en: "English",
  he: "עברית",
  ar: "العربية",
  ru: "Русский",
};
const SPEAK_LANG_SHORT: Record<Language, string> = {
  en: "EN",
  he: "עב",
  ar: "ع",
  ru: "RU",
};

// Language-independent keyword bank (English + Hebrew + Arabic roots in
// one list per topic) so the offline fallback matches a teacher whatever
// language they type or speak in. Plain lowercase substring match, so
// entries are short roots; topic order (below) breaks ties.
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
 * Inline "ask me anything" box for the top of the teacher dashboard.
 * Lives inside StartHerePanel so the guided goals and the AI helper sit
 * in one card (no separate floating button).
 *
 * A typed / spoken question goes to the Gemini-backed
 * /api/teacher-assistant endpoint, which answers in the teacher's
 * language and names one navigation target; on any failure we fall back
 * to the offline keyword router so the box still helps without network.
 * Voice is progressive enhancement — the mic only renders where the Web
 * Speech API exists, and typing always works.
 */
export default function HelpAskBox({
  language,
  isRTL,
  hasClasses,
  pendingStudentsCount,
  onNewClass,
  onClassroomClick,
  onApprovalsClick,
}: HelpAskBoxProps) {
  const t = startHereT[language];
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ answer: string; action: string } | null>(null);
  const [active, setActive] = useState<TopicId | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  // Which language the teacher will SPEAK into the mic. Seeded from the
  // dashboard language but independently selectable (see SPEAK_LANGS).
  const [micLang, setMicLang] = useState<Language>(language);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const SpeechRecognitionCtor = useMemo(() => getSpeechRecognition(), []);

  const toClasses: TopicAction = {
    label: t.setupClassesBtn,
    run: () => scrollToDashboardSection(DASHBOARD_SECTION.myClasses),
  };
  const createClass: TopicAction = { label: t.setupCreateBtn, run: onNewClass, primary: true };

  // Fallback topics for the offline keyword router. Order decides match
  // ties — keep the specific topics (gamesDiff, login) ahead of broad ones.
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
    { id: "login", question: t.qLogin, answer: t.aLogin, actions: hasClasses ? [toClasses] : [createClass] },
    {
      id: "homework",
      question: t.qHomework,
      answer: t.homeworkExplainer,
      actions: hasClasses ? [{ ...toClasses, primary: true }] : [createClass],
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
    { id: "setup", question: t.qSetup, answer: t.setupExplainer, actions: [createClass, toClasses] },
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

  // Returns null on any failure (no session, network/API down, bad
  // payload) so the caller can fall back to the offline keyword router.
  const askAI = async (text: string, langHint: Language): Promise<{ answer: string; action: string } | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return null;
      const res = await fetch("/api/teacher-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, language: langHint, context: { hasClasses, pendingStudentsCount } }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { answer?: string; action?: string };
      if (!data.answer) return null;
      return { answer: data.answer, action: data.action ?? "none" };
    } catch {
      return null;
    }
  };

  const clearAnswer = () => {
    setAiResponse(null);
    setActive(null);
    setNoMatch(false);
  };

  // `spokenLang` is set when the question came from the mic, so the AI
  // gets the language the teacher actually spoke as its hint. Typed
  // questions fall back to the dashboard language (the server also
  // detects language from the text itself).
  const submitQuery = async (text: string, spokenLang?: Language) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setQuery("");
    clearAnswer();
    setThinking(true);

    const ai = await askAI(trimmed, spokenLang ?? language);
    if (ai) {
      setAiResponse(ai);
      setThinking(false);
      return;
    }

    // Offline / error fallback — keyword router.
    setThinking(false);
    const id = matchTopic(trimmed);
    if (id) setActive(id);
    else setNoMatch(true);
  };

  // Run a navigation action then clear the answer so the box is ready
  // for the next question.
  const runAction = (a: TopicAction) => {
    a.run();
    clearAnswer();
  };

  // Tear down any in-flight recognition on unmount.
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
      rec.lang = RECOGNITION_LANG[micLang];
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const transcript = e.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) {
          setQuery(transcript);
          void submitQuery(transcript, micLang);
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
  const aiBtn = aiResponse ? actionToButton(aiResponse.action) : null;
  const showAnswer = thinking || !!aiResponse || !!activeTopic || noMatch;

  // Shared button styles (primary = filled accent, else outlined).
  const btnStyle = (primary?: boolean) =>
    primary
      ? {
          touchAction: "manipulation" as const,
          WebkitTapHighlightColor: "transparent",
          background: "linear-gradient(135deg, var(--vb-accent) 0%, color-mix(in srgb, var(--vb-accent), #000 28%) 100%)",
          color: "var(--vb-accent-text)",
          boxShadow: "0 10px 22px -10px color-mix(in srgb, var(--vb-accent), transparent 45%)",
        }
      : {
          touchAction: "manipulation" as const,
          WebkitTapHighlightColor: "transparent",
          background: "var(--vb-surface)",
          color: "var(--vb-text-primary)",
          border: "1.5px solid var(--vb-border)",
        };

  return (
    <div className="mt-3.5">
      {/* Composer — type or (where supported) speak. */}
      <div
        className="flex items-center gap-2 rounded-2xl p-2"
        style={{ background: "var(--vb-surface-alt)", border: "1.5px solid var(--vb-border)" }}
      >
        <Sparkles size={16} className="ms-1.5 shrink-0" style={{ color: "var(--vb-accent)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submitQuery(query);
          }}
          disabled={thinking}
          placeholder={listening ? t.helperListening : t.helperInputPlaceholder}
          dir={isRTL ? "rtl" : "ltr"}
          style={{ background: "transparent", color: "var(--vb-text-primary)" }}
          className="min-w-0 flex-1 px-1 py-1.5 text-[13px] outline-none disabled:opacity-60"
        />
        {SpeechRecognitionCtor && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowLangMenu((v) => !v)}
              disabled={thinking}
              aria-label={t.helperMicLangLabel}
              aria-expanded={showLangMenu}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                background: "var(--vb-surface)",
                color: "var(--vb-text-secondary)",
                border: "1.5px solid var(--vb-border)",
              }}
              className="flex items-center gap-1 rounded-full px-2.5 py-2 text-[11px] font-bold disabled:opacity-60"
            >
              <Languages size={14} />
              {SPEAK_LANG_SHORT[micLang]}
            </button>
            {showLangMenu && (
              <>
                {/* Click-away backdrop. */}
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setShowLangMenu(false)}
                  className="fixed inset-0 z-10 cursor-default"
                  style={{ background: "transparent" }}
                />
                <div
                  className="absolute bottom-full end-0 z-20 mb-1.5 min-w-[140px] overflow-hidden rounded-xl"
                  style={{
                    background: "var(--vb-surface-elevated)",
                    border: "1.5px solid var(--vb-border)",
                    boxShadow: "var(--vb-shadow-elevated)",
                  }}
                >
                  {SPEAK_LANGS.map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      onClick={() => {
                        setMicLang(lng);
                        setShowLangMenu(false);
                      }}
                      dir={lng === "he" || lng === "ar" ? "rtl" : "ltr"}
                      style={{
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                        background: lng === micLang ? "var(--vb-accent-soft)" : "transparent",
                        color: "var(--vb-text-primary)",
                      }}
                      className="block w-full px-3 py-2 text-start text-[13px] font-semibold hover:opacity-75"
                    >
                      {SPEAK_LANG_LABEL[lng]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
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

      {/* Answer area — reveals inline below the box. */}
      <AnimatePresence initial={false}>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="relative mt-2.5 rounded-2xl p-3.5"
              style={{ background: "var(--vb-surface-alt)", border: "1.5px solid var(--vb-border)" }}
            >
              {/* Dismiss the answer (not shown while thinking). */}
              {!thinking && (
                <button
                  type="button"
                  onClick={clearAnswer}
                  aria-label={t.helperClose}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", color: "var(--vb-text-muted)" }}
                  className="absolute end-2 top-2 rounded-full p-1 hover:opacity-70 transition-opacity"
                >
                  <X size={15} />
                </button>
              )}

              {thinking ? (
                <div className="flex items-center gap-3 py-1">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
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
                <div className="pe-5">
                  <div className="flex items-start gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: "var(--vb-accent-soft)" }}
                    >
                      <Sparkles size={18} style={{ color: "var(--vb-accent)" }} />
                    </span>
                    <p
                      className="whitespace-pre-line flex-1 text-[13px] leading-relaxed"
                      style={{ color: "var(--vb-text-secondary)" }}
                    >
                      {aiResponse.answer}
                    </p>
                  </div>
                  {aiBtn && (
                    <div className={`mt-3.5 flex flex-wrap gap-2.5 ${isRTL ? "justify-end" : ""}`}>
                      <button
                        type="button"
                        onClick={() => runAction(aiBtn)}
                        style={btnStyle(true)}
                        className="inline-flex items-center rounded-full px-4 py-2.5 text-[13px] font-bold active:scale-95 transition-transform"
                      >
                        {aiBtn.label}
                      </button>
                    </div>
                  )}
                </div>
              ) : activeTopic ? (
                <div className="pe-5">
                  <p
                    className="whitespace-pre-line text-[13px] leading-relaxed"
                    style={{ color: "var(--vb-text-secondary)" }}
                  >
                    {activeTopic.answer}
                  </p>
                  <div className={`mt-3.5 flex flex-wrap gap-2.5 ${isRTL ? "justify-end" : ""}`}>
                    {activeTopic.actions.map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() => runAction(a)}
                        style={btnStyle(a.primary)}
                        className="inline-flex items-center rounded-full px-4 py-2.5 text-[13px] font-bold active:scale-95 transition-transform"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pe-5 text-[13px] font-semibold" style={{ color: "var(--vb-text-secondary)" }}>
                  {t.helperNoMatch}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
