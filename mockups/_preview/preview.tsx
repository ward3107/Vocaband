import TeamScoreBar from "../../src/components/game/TeamScoreBar";
import LobbyRoster from "../../src/components/game/LobbyRoster";

const entries = [
  { clientId: "1", nickname: "Maya", avatar: "🐸", score: 240, team: "red" as const },
  { clientId: "2", nickname: "Noa", avatar: "🦊", score: 210, team: "blue" as const },
  { clientId: "3", nickname: "Omar", avatar: "lucide:Crown", score: 180, team: "red" as const },
  { clientId: "4", nickname: "Adam", avatar: "🐼", score: 150, team: "blue" as const },
  { clientId: "5", nickname: "Lior", avatar: "🐯", score: 120, team: "red" as const },
  { clientId: "6", nickname: "Yael", avatar: "🦄", score: 90, team: "blue" as const },
  { clientId: "7", nickname: "Sami", avatar: "🐵", score: 60, team: "red" as const },
  { clientId: "8", nickname: "Rana", avatar: "🐱", score: 30, team: "blue" as const },
];

const card = "rounded-3xl shadow-lg border border-stone-200 bg-white p-6";
const label = "text-xs font-black uppercase tracking-widest text-stone-400 mb-2";

export default function Preview() {
  return (
    <div className="min-h-screen bg-stone-100 p-8 flex flex-col gap-6 items-center">
      <div className="w-full max-w-2xl">
        <div className={label}>Live Red vs Blue score bar (on the projector during play)</div>
        <TeamScoreBar entries={entries} />
      </div>
      <div className="w-full max-w-2xl">
        <div className={label}>Waiting room — each kid's medallion tinted by their team</div>
        <section className={card}><LobbyRoster players={entries} countLabel={(n) => `${n} in the room`} emptyLabel="Waiting…" /></section>
      </div>
    </div>
  );
}
