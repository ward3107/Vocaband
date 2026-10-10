// Test-only fixture: mounts the real component and styles, no production route.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import QuickPlayBoardStage from '../../src/components/QuickPlayBoardStage';
import '../../src/index.css';
function Fixture() {
  const params = new URLSearchParams(location.search);
  const language = params.get('lang') === 'ar' ? 'ar' : 'he';
  const [students, setStudents] = useState(Array.from({ length: 60 }, (_,i) => ({
    studentUid: `player-${i}`, name: i % 2 ? 'نور أحمد' : 'אלכס כהן', avatar: '🦊', score: 600-i*5, handRaisedAt: i===59 ? 1 : null,
  })));
  return <main className="h-dvh flex flex-col gap-3 bg-slate-950 p-4 text-white" dir="rtl">
    <header className="flex h-16 shrink-0 items-center text-2xl font-bold">Quick Play · {students.length}</header>
    <QuickPlayBoardStage students={students} language={language}
      onRemove={id => setStudents(s => s.filter(p => p.studentUid !== id))}
      onBonus={id => setStudents(s => s.map(p => p.studentUid === id ? {...p,score:p.score+5} : p))}
      onHelp={id => setStudents(s => s.map(p => p.studentUid === id ? {...p,handRaisedAt:null} : p))} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
