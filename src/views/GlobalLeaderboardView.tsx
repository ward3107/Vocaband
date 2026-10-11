import WorkspaceHeader from "../components/WorkspaceHeader";
import type { Dispatch, SetStateAction } from 'react';
import { motion } from "motion/react";
import type { View } from "../core/views";
import { useLanguage } from "../hooks/useLanguage";
import StudentLangButton from "../components/StudentLangButton";

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
  const { language, dir } = useLanguage();
  const headingLabel = language === 'he' ? '10 המובילים בעולם' : language === 'ar' ? 'أفضل 10 في العالم' : 'Global Top 10';
  const blurbLabel = language === 'he' ? 'התלמידים הטובים ביותר בכל הכיתות!' : language === 'ar' ? 'أفضل الطلاب في جميع الفصول!' : 'The best students across all classes!';
  const pointsLabel = language === 'he' ? 'נקודות' : language === 'ar' ? 'نقاط' : 'Points';
  // Theme tokens (not hardcoded stone) so the page follows the active
  // teacher theme; the :root defaults keep students on the light look.
  return (
    <div className="vb-page p-4 sm:p-6" dir={dir}>
      <div className="max-w-4xl mx-auto">
        <WorkspaceHeader title={headingLabel} subtitle={blurbLabel} onBack={() => setView((userRole === "teacher" || userRole === "admin") ? "teacher-dashboard" : "student-dashboard")} trailing={<StudentLangButton />} />
        <div className="vb-card p-4 sm:p-8" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>


          <div className="space-y-4">
            {globalLeaderboard.map((entry, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex justify-between items-center gap-3 p-3 sm:p-5 rounded-2xl border"
                style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* Medal chips keep their gold/silver/bronze identity on
                      every theme; only the no-medal chip follows the palette. */}
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm ${idx === 0 ? "bg-amber-100 text-amber-900" : idx === 1 ? "bg-slate-200 text-slate-800" : idx === 2 ? "bg-orange-100 text-orange-900" : ""}`}
                    style={idx > 2 ? { backgroundColor: 'var(--vb-surface)', color: 'var(--vb-text-muted)' } : undefined}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-3xl">{entry.avatar}</span>
                  <span className="min-w-0 break-words font-bold text-base sm:text-lg" style={{ color: 'var(--vb-text-primary)' }}>{entry.name}</span>
                </div>
                <div className="shrink-0 text-end">
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
