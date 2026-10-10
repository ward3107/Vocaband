import { useEffect, useRef, useState } from 'react';
import QPAvatar from './QPAvatar';
import { quickPlayBoardLayout } from '../utils/quickPlayBoardLayout';

interface BoardStudent { studentUid: string; name: string; avatar?: string; score: number; handRaisedAt?: number | null }
interface Props {
  students: BoardStudent[];
  language: 'en' | 'he' | 'ar';
  onRemove: (id: string) => void;
  onBonus: (id: string) => void;
  onHelp: (id: string) => void;
}
const labels = {
  en: { players: 'All players', waiting: 'Waiting for players…', bonus: 'Give 5 points to', remove: 'Remove', help: 'Acknowledge help from' },
  he: { players: 'כל המשתתפים', waiting: 'ממתינים למשתתפים…', bonus: 'הוסף 5 נקודות ל', remove: 'הסר את', help: 'אשר בקשת עזרה של' },
  ar: { players: 'جميع المشاركين', waiting: 'بانتظار المشاركين…', bonus: 'أضف 5 نقاط إلى', remove: 'إزالة', help: 'تأكيد طلب المساعدة من' },
};

/** All ranks live in a single grid: no duplicate podium or exit animations. */
export default function QuickPlayBoardStage({ students, language, onRemove, onBonus, onHelp }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 600 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const layout = quickPlayBoardLayout(size.width, size.height, students.length);
  const t = labels[language];
  return (
    <div ref={ref} className="min-h-0 flex-1 overflow-y-auto" aria-label={t.players} data-testid="qp-board">
      {students.length === 0 ? <p className="flex h-full items-center justify-center text-2xl font-bold">{t.waiting}</p> :
        <div role="list" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`, gridAutoRows: `${layout.cardHeight}px`, fontSize: layout.fontSize }}>
          {students.map((student, index) => (
            <div role="listitem" data-qp-uid={student.studentUid} key={student.studentUid}
              className={`group relative flex min-h-0 flex-col justify-center overflow-hidden rounded-xl border bg-white/10 px-2 py-1 ${index < 3 ? 'border-amber-400/70' : 'border-current/15'}`}>
              <div className="flex min-w-0 items-center gap-2">
                <span aria-label={`#${index + 1}`} className="shrink-0 font-black tabular-nums">{index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}</span>
                <span className="shrink-0"><QPAvatar value={student.avatar || '🦊'} iconSize={Math.max(20, layout.fontSize + 6)} className="text-[1.4em]" /></span>
                <b className="min-w-0 truncate" title={student.name} dir="auto">{student.name}</b>
              </div>
              <div className="flex items-center justify-center gap-2 font-black tabular-nums">
                <span>{student.score}</span>
                {student.handRaisedAt && <button type="button" className="min-h-6 min-w-6 rounded focus-visible:ring-2" aria-label={`${t.help} ${student.name}`} onClick={() => onHelp(student.studentUid)}>🙋</button>}
              </div>
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-slate-950/95 p-1 text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100">
                <button type="button" className="min-h-7 min-w-9 rounded bg-indigo-600 px-2 text-sm focus-visible:ring-2" aria-label={`${t.bonus} ${student.name}`} onClick={() => onBonus(student.studentUid)}>+5</button>
                <button type="button" className="min-h-7 min-w-9 rounded bg-red-700 px-2 text-sm focus-visible:ring-2" aria-label={`${t.remove} ${student.name}`} onClick={() => onRemove(student.studentUid)}>×</button>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}
