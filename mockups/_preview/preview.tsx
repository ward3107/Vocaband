import LobbyRoster from "../../src/components/game/LobbyRoster";

const players = [
  { clientId: "1", nickname: "Noa", avatar: "🦊" },
  { clientId: "2", nickname: "Adam", avatar: "🐼" },
  { clientId: "3", nickname: "Lior", avatar: "🐯" },
  { clientId: "4", nickname: "Maya", avatar: "🐸" },
  { clientId: "5", nickname: "Sami", avatar: "lucide:Rocket" },
  { clientId: "6", nickname: "Yael", avatar: "🦄" },
  { clientId: "7", nickname: "Omar", avatar: "lucide:Crown" },
  { clientId: "8", nickname: "Tamar", avatar: "🐵" },
];

const card = "rounded-3xl shadow-lg border border-stone-200 bg-white p-6";
const label = "text-xs font-black uppercase tracking-widest text-stone-400 mb-2";

export default function Preview() {
  return (
    <div className="min-h-screen bg-stone-100 p-8 flex flex-col gap-6 items-center">
      <div className="w-full max-w-3xl">
        <div className={label}>Category Race — fuchsia</div>
        <section className={card}><LobbyRoster players={players} countLabel={(n) => `${n} in the room`} emptyLabel="Waiting…" accent="from-fuchsia-500 to-pink-600" /></section>
      </div>
      <div className="w-full max-w-3xl">
        <div className={label}>Speed Round — amber</div>
        <section className={card}><LobbyRoster players={players} countLabel={(n) => `${n} in the room`} emptyLabel="Waiting…" accent="from-amber-400 to-orange-500" /></section>
      </div>
      <div className="w-full max-w-3xl">
        <div className={label}>Word Hunt Arena — indigo</div>
        <section className={card}><LobbyRoster players={players} countLabel={(n) => `${n} in the room`} emptyLabel="Waiting…" accent="from-indigo-500 to-violet-600" /></section>
      </div>
    </div>
  );
}
