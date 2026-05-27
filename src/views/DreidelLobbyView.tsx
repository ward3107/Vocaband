/**
 * DreidelLobbyView.tsx — teacher picks a class + tunes game rules,
 * then hits Start to enter the live game.
 *
 * Mirrors the LiveChallengeClassSelectView pattern: class picker first,
 * config form below.  On Start, this view emits DREIDEL_CREATE and
 * transitions the parent to view="dreidel-challenge".
 */
import { useState } from "react";
import { motion } from "motion/react";
import type { Socket } from "socket.io-client";
import TopAppBar from "../components/TopAppBar";
import { performUserLogout, type ClassData } from "../core/supabase";
import { SOCKET_EVENTS } from "../core/types";
import type { View } from "../core/views";
import { DEFAULT_DREIDEL_CONFIG } from "../core/dreidel";
import { useLanguage } from "../hooks/useLanguage";
import { teacherDreidelT } from "../locales/teacher/dreidel";

interface DreidelLobbyViewProps {
  user: { displayName?: string; avatar?: string } | null;
  classes: ClassData[];
  socket: Socket | null;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setSelectedClass: (cls: ClassData) => void;
  setIsLiveChallenge: (val: boolean) => void;
}

export default function DreidelLobbyView({
  user,
  classes,
  socket,
  setView,
  setSelectedClass,
  setIsLiveChallenge,
}: DreidelLobbyViewProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = teacherDreidelT[language];

  const [pickedClass, setPickedClass] = useState<ClassData | null>(null);
  const [config, setConfig] = useState(DEFAULT_DREIDEL_CONFIG);

  const start = () => {
    if (!pickedClass || !socket) return;
    setSelectedClass(pickedClass);
    setIsLiveChallenge(true);
    socket.emit(SOCKET_EVENTS.DREIDEL_CREATE, {
      classCode: pickedClass.code,
      config,
    });
    setView("dreidel-challenge");
  };

  return (
    <div dir={dir} className="min-h-screen bg-background pb-12">
      <TopAppBar
        title={t.lobbyTitle}
        subtitle={t.lobbySubtitle}
        showBack
        onBack={() => setView("teacher-dashboard")}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => performUserLogout()}
      />

      <main className="pt-24 px-6 max-w-4xl mx-auto">
        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 rounded-2xl p-6 mb-8 text-center shadow-xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-white"
          >
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-3 text-4xl shadow-lg">
              🎲
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-1">{t.tileTitle}</h2>
            <p className="text-white/90 font-medium text-sm sm:text-base">{t.tileSubtitle}</p>
          </motion.div>
        </div>

        {/* Class picker */}
        <section className="mb-8">
          <h3 className="text-xl font-black mb-1 text-on-surface">{t.selectClassHeading}</h3>
          <p className="text-on-surface-variant text-sm mb-4">{t.selectClassBlurb}</p>
          <div className="grid gap-3">
            {classes.map((cls) => (
              <motion.button
                key={cls.id}
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setPickedClass(cls)}
                className={`rounded-xl p-4 border-2 transition-all text-left ${
                  pickedClass?.id === cls.id
                    ? "bg-gradient-to-r from-indigo-50 to-fuchsia-50 border-indigo-500 shadow-lg shadow-indigo-200/40"
                    : "bg-surface-container-lowest border-surface-container hover:border-primary/50"
                }`}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg">
                      🎲
                    </div>
                    <div>
                      <p className="font-black text-on-surface">{cls.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {t.classCodeLabel}{" "}
                        <span className="font-mono font-bold ms-1">{cls.code}</span>
                      </p>
                    </div>
                  </div>
                  {pickedClass?.id === cls.id && (
                    <span className="text-indigo-600 font-black text-xl">✓</span>
                  )}
                </div>
              </motion.button>
            ))}
            {classes.length === 0 && (
              <div className="text-center text-on-surface-variant py-8">No classes yet.</div>
            )}
          </div>
        </section>

        {/* Config */}
        <section className="mb-8">
          <h3 className="text-xl font-black mb-4 text-on-surface">{t.configHeading}</h3>
          <div className="grid gap-4">
            {/* Lives + Timer (numeric pickers) */}
            <div className="grid grid-cols-2 gap-3">
              <ConfigSlider
                label={t.livesLabel}
                help={t.livesHelp}
                value={config.startingLives}
                min={1}
                max={10}
                onChange={(v) => setConfig((c) => ({ ...c, startingLives: v }))}
                accent="from-rose-500 to-pink-500"
                icon="❤️"
              />
              <ConfigSlider
                label={t.timerLabel}
                help={t.timerHelp(config.timerSeconds)}
                value={config.timerSeconds}
                min={4}
                max={15}
                onChange={(v) => setConfig((c) => ({ ...c, timerSeconds: v }))}
                accent="from-amber-500 to-orange-500"
                icon="⏱️"
              />
            </div>

            <ConfigToggle
              label={t.topicLabel}
              help={t.topicHelp}
              checked={config.topicMode}
              onChange={(v) => setConfig((c) => ({ ...c, topicMode: v }))}
              icon="📚"
            />
            <ConfigToggle
              label={t.powerUpsLabel}
              help={t.powerUpsHelp}
              checked={config.powerUpsEnabled}
              onChange={(v) => setConfig((c) => ({ ...c, powerUpsEnabled: v }))}
              icon="💎"
            />
            <ConfigToggle
              label={t.suddenDeathLabel}
              help={t.suddenDeathHelp}
              checked={config.suddenDeath}
              onChange={(v) => setConfig((c) => ({ ...c, suddenDeath: v }))}
              icon="⚔️"
            />
            <ConfigToggle
              label={t.stealLabel}
              help={t.stealHelp}
              checked={config.stealOnFast}
              onChange={(v) => setConfig((c) => ({ ...c, stealOnFast: v }))}
              icon="🦹"
            />
          </div>
        </section>

        {/* CTA */}
        <motion.button
          type="button"
          whileHover={{ scale: pickedClass ? 1.02 : 1 }}
          whileTap={{ scale: pickedClass ? 0.97 : 1 }}
          onClick={start}
          disabled={!pickedClass || !socket}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all ${
            pickedClass && socket
              ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-fuchsia-300/50 hover:shadow-2xl"
              : "bg-stone-200 text-stone-400 cursor-not-allowed"
          }`}
        >
          {t.startButton}
        </motion.button>
      </main>
    </div>
  );
}

function ConfigSlider({
  label, help, value, min, max, onChange, accent, icon,
}: {
  label: string; help: string; value: number; min: number; max: number;
  onChange: (v: number) => void; accent: string; icon: string;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 border-2 border-surface-container">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <p className="font-black text-sm text-on-surface">{label}</p>
      </div>
      <div className={`flex items-baseline gap-2 mb-2`}>
        <span className={`text-3xl font-black bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
      <p className="text-[11px] text-on-surface-variant mt-1">{help}</p>
    </div>
  );
}

function ConfigToggle({
  label, help, checked, onChange, icon,
}: {
  label: string; help: string; checked: boolean; onChange: (v: boolean) => void; icon: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      className={`w-full text-start rounded-xl p-4 border-2 transition-all ${
        checked
          ? "bg-gradient-to-r from-indigo-50 to-fuchsia-50 border-indigo-400"
          : "bg-surface-container-lowest border-surface-container"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-on-surface">{label}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">{help}</p>
        </div>
        <div
          className={`relative w-12 h-7 rounded-full transition-colors ${
            checked ? "bg-indigo-600" : "bg-stone-300"
          }`}
        >
          <div
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
              checked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </div>
      </div>
    </button>
  );
}
