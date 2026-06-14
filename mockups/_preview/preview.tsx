import TeamSwitcher from "../../src/components/game/TeamSwitcher";
import TeamModeToggle from "../../src/components/game/TeamModeToggle";
import { useState } from "react";

export default function Preview() {
  const [mode, setMode] = useState(true);
  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-white to-pink-50 p-8 flex flex-col gap-8 items-center">
      <div className="w-full max-w-sm">
        <div className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Teacher — lobby toggle</div>
        <TeamModeToggle teamMode={mode} onToggle={setMode} cardClass="bg-white" idleClass="bg-stone-50 border-stone-200 text-stone-500" />
      </div>
      <div className="w-full max-w-sm text-center">
        <div className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Kid's phone — on Red, can switch</div>
        <div className="text-6xl mb-2">🦊</div>
        <h1 className="text-2xl font-black text-stone-900">You're in!</h1>
        <p className="text-stone-500 font-semibold mb-3">Waiting for your teacher…</p>
        <TeamSwitcher team="red" onSwitch={() => {}} />
      </div>
      <div className="w-full max-w-sm text-center">
        <div className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Kid's phone — on Blue</div>
        <TeamSwitcher team="blue" onSwitch={() => {}} />
      </div>
    </div>
  );
}
