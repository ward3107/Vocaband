/**
 * CategoryRaceHostView — the teacher's control room for a live Category
 * Race. Built on the Quick Play socket rails:
 *   - shows the join code + QR (students join the same way as Quick Play)
 *   - lets the teacher pick categories + a round timer and Start a round
 *     (the server rolls one letter for the whole class with a shared
 *     deadline)
 *   - streams the live leaderboard
 *   - ends the session (persists scores + boots students)
 *
 * Round config is sent live with each round — nothing race-specific is
 * persisted in the DB.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "motion/react";
import { Play, Clock, Users, Crown, LogOut, Check } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { CATEGORIES, categoryLabel } from "../data/category-race-bank";
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
    roundLive: "Round in progress", waiting: "Pick categories, then start the first round.",
    leaderboard: "Leaderboard", noStudents: "Waiting for students to join…",
    end: "End race", seconds: (n: number) => `${n}s`, players: (n: number) => `${n} playing`,
    pickOne: "Pick at least one category.",
  },
  he: {
    title: "מרוץ קטגוריות", joinHeading: "התלמידים מצטרפים כאן", code: "קוד כיתה",
    catsHeading: "קטגוריות", timerHeading: "זמן לסבב", start: "התחל סבב",
    roundLive: "סבב מתבצע", waiting: "בחרו קטגוריות והתחילו את הסבב הראשון.",
    leaderboard: "טבלת מובילים", noStudents: "ממתינים שתלמידים יצטרפו…",
    end: "סיים מרוץ", seconds: (n: number) => `${n} שנ'`, players: (n: number) => `${n} משחקים`,
    pickOne: "בחרו לפחות קטגוריה אחת.",
  },
  ar: {
    title: "سباق الفئات", joinHeading: "ينضم الطلاب هنا", code: "رمز الصف",
    catsHeading: "الفئات", timerHeading: "وقت الجولة", start: "ابدأ الجولة",
    roundLive: "الجولة جارية", waiting: "اختر الفئات ثم ابدأ الجولة الأولى.",
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

  const toggleCat = (id: string) =>
    setSelectedCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleStart = () => {
    if (selectedCats.length === 0 || !tokenRef.current || roundActive) return;
    startRaceRound(selectedCats, roundSeconds, tokenRef.current);
  };

  const handleEnd = async () => {
    if (tokenRef.current) endSession(tokenRef.current);
    try { await supabase.rpc("end_quick_play_session", { p_session_code: sessionCode }); } catch { /* best-effort */ }
    setView("teacher-dashboard");
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-fuchsia-50 via-white to-pink-50" dir={dir}>
      <div className="max-w-5xl mx-auto px-4 py-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: join + controls */}
          <div className="lg:col-span-3 space-y-4">
            {/* Join card */}
            <section className="rounded-3xl bg-white shadow-lg shadow-fuchsia-500/10 border border-fuchsia-100 p-5">
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3">{t.joinHeading}</h2>
              <div className="flex items-center gap-5">
                <div className="bg-white p-2 rounded-2xl border border-stone-100 shadow-sm">
                  <QRCodeSVG value={joinUrl} size={120} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t.code}</div>
                  <div className="text-4xl sm:text-5xl font-black tracking-[0.15em] text-stone-900">{sessionCode}</div>
                  <div className="text-xs text-stone-400 font-semibold truncate mt-1">{joinUrl.replace(/^https?:\/\//, "")}</div>
                </div>
              </div>
            </section>

            {/* Round setup */}
            <section className="rounded-3xl bg-white shadow-lg shadow-fuchsia-500/10 border border-fuchsia-100 p-5">
              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3">{t.catsHeading}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map(cat => {
                  const picked = selectedCats.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCat(cat.id)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`relative rounded-xl p-3 text-start border-2 transition-all ${picked ? `bg-gradient-to-br ${cat.gradient} border-transparent text-white shadow-md` : "bg-white border-stone-200 hover:border-stone-300 text-stone-700"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="font-black text-sm truncate">{categoryLabel(cat, language)}</span>
                        {picked && <Check size={14} strokeWidth={3} className="ms-auto flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mt-5 mb-3">{t.timerHeading}</h2>
              <div className="flex gap-2 flex-wrap">
                {QP_RACE_ROUND_SECONDS.map(opt => {
                  const picked = roundSeconds === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRoundSeconds(opt)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`px-4 py-2 rounded-lg font-black text-sm border-2 transition ${picked ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-transparent shadow-md" : "bg-white border-stone-200 hover:border-stone-300 text-stone-700"}`}
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
                  ? <><Clock size={18} /> {t.roundLive} · {secondsLeft}s · {currentRace?.letter}</>
                  : <><Play size={18} /> {t.start}</>}
              </button>
            </section>
          </div>

          {/* Right: live leaderboard */}
          <section className="lg:col-span-2 rounded-3xl bg-white shadow-lg shadow-fuchsia-500/10 border border-fuchsia-100 p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3 flex items-center gap-1.5">
              <Users size={14} /> {t.leaderboard}
              <span className="ms-auto text-stone-400">{t.players(sorted.length)}</span>
            </h2>
            {sorted.length === 0 ? (
              <p className="text-sm text-stone-400 font-semibold py-8 text-center">{t.noStudents}</p>
            ) : (
              <ul className="space-y-2">
                {sorted.map((s, i) => (
                  <motion.li
                    key={s.clientId}
                    layout
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i === 0 ? "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200" : "bg-stone-50"}`}
                  >
                    <span className="w-6 text-center font-black text-stone-400">{i === 0 ? <Crown size={16} className="text-amber-500 mx-auto" /> : i + 1}</span>
                    <span className="text-xl">{s.avatar || "🦊"}</span>
                    <span className="flex-1 min-w-0 font-black text-stone-800 truncate" dir="auto">{s.nickname}</span>
                    <span className="font-black text-fuchsia-600">{s.score}</span>
                  </motion.li>
                ))}
              </ul>
            )}
            {sorted.length === 0 && (
              <p className="mt-4 text-center text-xs text-stone-400 font-semibold">{t.waiting}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
