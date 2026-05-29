/**
 * CategoryRaceHostView — the teacher's control room for a live Category
 * Race, laid out for a classroom projector. Built on the Quick Play
 * socket rails:
 *   - shows the join code + QR (students join the same way as Quick Play)
 *   - lets the teacher pick categories + a round timer and Start a round
 *     (the server rolls one letter for the whole class with a shared
 *     deadline)
 *   - streams the live leaderboard as the dominant, big-font element so
 *     the class can read names + scores from the back of the room
 *   - ends the session (persists scores + boots students)
 *
 * Projector layout: the student leaderboard ("preview") owns the main
 * column; the teacher's setup controls live in a compact sidebar so the
 * race — not the picker — is what fills the screen.
 *
 * Round config is sent live with each round — nothing race-specific is
 * persisted in the DB.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Play, Clock, Users, LogOut, Check } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { CATEGORIES, categoryLabel } from "../data/category-race-bank";
import CategoryRacePodium from "../components/game/CategoryRacePodium";
import { QP_RACE_ROUND_SECONDS } from "../core/quickPlayProtocol";
import type { View } from "../core/views";

interface CategoryRaceHostViewProps {
  sessionCode: string;
  setView: (v: View) => void;
}

const DEFAULT_CATEGORY_IDS = ["country", "animal", "food", "verb", "adjective", "object"];

const STRINGS = {
  en: {
    title: "Category Race", joinHeading: "Students join here", code: "Class code",
    catsHeading: "Categories", timerHeading: "Round time", start: "Start round",
    nextRound: "Start next round",
    roundLive: "Round in progress", letterLabel: "Letter", waiting: "Pick categories, then start the first round.",
    betweenRounds: "Round over — start the next one when you're ready.",
    leaderboard: "Leaderboard", noStudents: "Waiting for students to join…",
    end: "End race", seconds: (n: number) => `${n}s`, players: (n: number) => `${n} playing`,
    pickOne: "Pick at least one category.",
  },
  he: {
    title: "מרוץ קטגוריות", joinHeading: "התלמידים מצטרפים כאן", code: "קוד כיתה",
    catsHeading: "קטגוריות", timerHeading: "זמן לסבב", start: "התחל סבב",
    nextRound: "התחל סבב הבא",
    roundLive: "סבב מתבצע", letterLabel: "אות", waiting: "בחרו קטגוריות והתחילו את הסבב הראשון.",
    betweenRounds: "הסבב הסתיים — התחילו את הבא כשתהיו מוכנים.",
    leaderboard: "טבלת מובילים", noStudents: "ממתינים שתלמידים יצטרפו…",
    end: "סיים מרוץ", seconds: (n: number) => `${n} שנ'`, players: (n: number) => `${n} משחקים`,
    pickOne: "בחרו לפחות קטגוריה אחת.",
  },
  ar: {
    title: "سباق الفئات", joinHeading: "ينضم الطلاب هنا", code: "رمز الصف",
    catsHeading: "الفئات", timerHeading: "وقت الجولة", start: "ابدأ الجولة",
    nextRound: "ابدأ الجولة التالية",
    roundLive: "الجولة جارية", letterLabel: "حرف", waiting: "اختر الفئات ثم ابدأ الجولة الأولى.",
    betweenRounds: "انتهت الجولة — ابدأ التالية عندما تكون جاهزًا.",
    leaderboard: "لوحة المتصدرين", noStudents: "في انتظار انضمام الطلاب…",
    end: "إنهاء السباق", seconds: (n: number) => `${n} ث`, players: (n: number) => `${n} يلعبون`,
    pickOne: "اختر فئة واحدة على الأقل.",
  },
} as const;

export default function CategoryRaceHostView({ sessionCode, setView }: CategoryRaceHostViewProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  const qp = useQuickPlaySocket({ sessionCode, enabled: true });
  const { status, currentRace, leaderboard, observeAsTeacher, startRaceRound, endSession } = qp;

  const [selectedCats, setSelectedCats] = useState<string[]>([...DEFAULT_CATEGORY_IDS]);
  const [roundSeconds, setRoundSeconds] = useState<number>(60);
  const [now, setNow] = useState(() => Date.now());
  // Tracks whether any round has run this session, so the Start button
  // can read "Start next round" instead of "Start round" between rounds.
  const [hasRunRound, setHasRunRound] = useState(false);
  const tokenRef = useRef<string | null>(null);

  // Fetch the teacher token + observe whenever the socket (re)connects.
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

  // Tick while a round is live so the countdown + Start-button gating
  // stay current.
  const roundActive = !!currentRace && now < currentRace.deadlineTs;
  useEffect(() => {
    if (!roundActive) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [roundActive]);

  const joinUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/?session=${sessionCode}`;
  }, [sessionCode]);

  const sorted = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const secondsLeft = currentRace ? Math.max(0, Math.round((currentRace.deadlineTs - now) / 1000)) : 0;
  const lowTime = roundActive && secondsLeft <= 10;

  const toggleCat = (id: string) =>
    setSelectedCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleStart = () => {
    if (selectedCats.length === 0 || !tokenRef.current || roundActive) return;
    startRaceRound(selectedCats, roundSeconds, tokenRef.current);
    // Flip the Start label to "next round" once the teacher kicks off a
    // round, without a currentRace-watching effect (cascading-render lint).
    setHasRunRound(true);
  };

  const handleEnd = async () => {
    if (tokenRef.current) endSession(tokenRef.current);
    try { await supabase.rpc("end_quick_play_session", { p_session_code: sessionCode }); } catch { /* best-effort */ }
    setView("teacher-dashboard");
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-fuchsia-50 via-white to-pink-50" dir={dir}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 flex items-center gap-2">
            <span className="text-3xl">🌍</span> {t.title}
          </h1>
          <button
            type="button"
            onClick={handleEnd}
            style={{ touchAction: "manipulation" }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-sm bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-95 transition"
          >
            <LogOut size={16} /> {t.end}
          </button>
        </header>

        {/* Leaderboard is the dominant column (the student "preview" the
            class watches); the teacher's setup lives in a slim sidebar. */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main: round banner + the big leaderboard */}
          <div className="lg:col-span-8 space-y-4 order-2 lg:order-1">
            {/* Round banner — huge letter + countdown when live, so the
                projector shows the prompt the whole class is racing on. */}
            <section
              className={`rounded-3xl border p-6 sm:p-7 text-center shadow-lg transition-colors ${
                roundActive
                  ? lowTime
                    ? "bg-red-50 border-red-200 shadow-red-500/10"
                    : "bg-white border-fuchsia-100 shadow-fuchsia-500/10"
                  : "bg-white border-fuchsia-100 shadow-fuchsia-500/10"
              }`}
            >
              {roundActive && currentRace ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-10">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-500">{t.letterLabel}</span>
                    <span className="inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white text-7xl sm:text-8xl font-black shadow-xl shadow-fuchsia-500/40 mt-1">
                      {currentRace.letter}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black uppercase tracking-[0.18em] text-stone-400">{t.roundLive}</span>
                    <span className={`tabular-nums font-black leading-none mt-1 ${lowTime ? "text-red-600 animate-pulse" : "text-stone-900"} text-6xl sm:text-7xl`}>
                      {secondsLeft}
                    </span>
                    <span className="text-sm font-bold text-stone-400 mt-1">{t.seconds(roundSeconds)}</span>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <div className="text-5xl mb-2">🏁</div>
                  <p className="text-lg sm:text-xl font-black text-stone-700">{hasRunRound ? t.betweenRounds : t.waiting}</p>
                </div>
              )}
            </section>

            {/* The leaderboard — projector scale */}
            <section className="rounded-3xl bg-white shadow-lg shadow-fuchsia-500/10 border border-fuchsia-100 p-5 sm:p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-fuchsia-500 mb-4 flex items-center gap-2">
                <Users size={18} /> {t.leaderboard}
                <span className="ms-auto text-stone-400 normal-case tracking-normal">{t.players(sorted.length)}</span>
              </h2>
              <CategoryRacePodium entries={sorted} emptyText={t.noStudents} large />
            </section>
          </div>

          {/* Sidebar: join + setup controls (compact) */}
          <aside className="lg:col-span-4 space-y-4 order-1 lg:order-2">
            {/* Join card */}
            <section className="rounded-3xl bg-white shadow-lg shadow-fuchsia-500/10 border border-fuchsia-100 p-5">
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3">{t.joinHeading}</h2>
              <div className="flex flex-col items-center text-center">
                <div className="bg-white p-2 rounded-2xl border border-stone-100 shadow-sm">
                  <QRCodeSVG value={joinUrl} size={132} />
                </div>
                <div className="mt-3">
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t.code}</div>
                  <div className="text-4xl font-black tracking-[0.15em] text-stone-900">{sessionCode}</div>
                  <div className="text-xs text-stone-400 font-semibold truncate mt-1">{joinUrl.replace(/^https?:\/\//, "")}</div>
                </div>
              </div>
            </section>

            {/* Round setup */}
            <section className="rounded-3xl bg-white shadow-lg shadow-fuchsia-500/10 border border-fuchsia-100 p-5">
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3">{t.catsHeading}</h2>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => {
                  const picked = selectedCats.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCat(cat.id)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`relative rounded-xl p-2.5 text-start border-2 transition-all ${picked ? `bg-gradient-to-br ${cat.gradient} border-transparent text-white shadow-md` : "bg-white border-stone-200 hover:border-stone-300 text-stone-700"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="font-black text-xs truncate">{categoryLabel(cat, language)}</span>
                        {picked && <Check size={13} strokeWidth={3} className="ms-auto flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mt-5 mb-3">{t.timerHeading}</h2>
              <div className="grid grid-cols-4 gap-2">
                {QP_RACE_ROUND_SECONDS.map(opt => {
                  const picked = roundSeconds === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRoundSeconds(opt)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`px-2 py-2 rounded-lg font-black text-sm border-2 transition ${picked ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-transparent shadow-md" : "bg-white border-stone-200 hover:border-stone-300 text-stone-700"}`}
                    >
                      {t.seconds(opt)}
                    </button>
                  );
                })}
              </div>

              {selectedCats.length === 0 && (
                <p className="mt-3 text-xs font-bold text-rose-600">{t.pickOne}</p>
              )}

              <button
                type="button"
                onClick={handleStart}
                disabled={selectedCats.length === 0 || roundActive}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg transition ${roundActive || selectedCats.length === 0 ? "bg-stone-300 cursor-not-allowed" : "bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30 active:scale-[0.98]"}`}
              >
                {roundActive
                  ? <><Clock size={18} /> {t.roundLive} · {secondsLeft}s</>
                  : <><Play size={18} /> {hasRunRound ? t.nextRound : t.start}</>}
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
