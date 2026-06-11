import type { Dispatch, SetStateAction } from 'react';
import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import type { View } from "../core/views";
import { useLanguage } from "../hooks/useLanguage";

interface GlobalLeaderboardEntry {
  name: string;
  score: number;
  avatar: string;
}

interface GlobalLeaderboardViewProps {
  userRole: "teacher" | "student" | "admin" | "manager" | "guest" | undefined;
  setView: Dispatch<SetStateAction<View>>;
  globalLeaderboard: GlobalLeaderboardEntry[];
}

export default function GlobalLeaderboardView({
  userRole,
  setView,
  globalLeaderboard,
}: GlobalLeaderboardViewProps) {
  const { language, dir, isRTL } = useLanguage();
  const backArrow = isRTL ? '→' : '←';
  const backLabel = language === 'he' ? `${backArrow} חזרה לדאשבורד` : language === 'ar' ? `${backArrow} العودة للوحة` : `${backArrow} Back to Dashboard`;
  const headingLabel = language === 'he' ? '10 המובילים בעולם' : language === 'ar' ? 'أفضل 10 في العالم' : 'Global Top 10';
  const blurbLabel = language === 'he' ? 'התלמידים הטובים ביותר בכל הכיתות!' : language === 'ar' ? 'أفضل الطلاب في جميع الفصول!' : 'The best students across all classes!';
  const pointsLabel = language === 'he' ? 'נקודות' : language === 'ar' ? 'نقاط' : 'Points';
  // Theme tokens (not hardcoded stone) so the page follows the active
  // teacher theme; the :root defaults keep students on the light look.
  return (
    <div className="min-h-screen bg-[var(--vb-surface-alt)] p-6" dir={dir}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setView((userRole === "teacher" || userRole === "admin") ? "teacher-dashboard" : "student-dashboard")} className="mb-6 signature-gradient text-white px-6 py-3 rounded-lg font-bold hover:scale-105 active:scale-95 transition-all shadow-lg">{backLabel}</button>
        <div className="rounded-2xl shadow-xl p-6 sm:p-10 border" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--vb-warning-soft)' }}>
              <Trophy size={40} style={{ color: 'var(--vb-warning)' }} />
            </div>
            <div>
              <h2 className="text-3xl font-black" style={{ color: 'var(--vb-text-primary)' }}>{headingLabel}</h2>
              <p style={{ color: 'var(--vb-text-secondary)' }}>{blurbLabel}</p>
            </div>
          </div>

          <div className="space-y-4">
            {globalLeaderboard.map((entry, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex justify-between items-center p-5 rounded-xl border"
                style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}
              >
                <div className="flex items-center gap-4">
                  {/* Medal chips keep their gold/silver/bronze identity on
                      every theme; only the no-medal chip follows the palette. */}
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm ${idx === 0 ? "bg-yellow-400 text-white" : idx === 1 ? "bg-stone-300 text-white" : idx === 2 ? "bg-orange-300 text-white" : ""}`}
                    style={idx > 2 ? { backgroundColor: 'var(--vb-surface)', color: 'var(--vb-text-muted)' } : undefined}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-3xl">{entry.avatar}</span>
                  <span className="font-black text-lg" style={{ color: 'var(--vb-text-primary)' }}>{entry.name}</span>
                </div>
                <div className="text-end">
                  <p className="text-2xl font-black" style={{ color: 'var(--vb-accent)' }}>{entry.score}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--vb-text-muted)' }}>{pointsLabel}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
