import GameResults from "../../src/components/game/GameResults";

const entries = [
  { clientId: "1", nickname: "Maya", avatar: "🐸", score: 240, streak: 7 },
  { clientId: "2", nickname: "Noa", avatar: "🦊", score: 210, streak: 4 },
  { clientId: "3", nickname: "Omar", avatar: "lucide:Crown", score: 180, streak: 3 },
  { clientId: "4", nickname: "Adam", avatar: "🐼", score: 150, streak: 2 },
  { clientId: "5", nickname: "Lior", avatar: "🐯", score: 120, streak: 1 },
];

export default function Preview() {
  return (
    <div className="min-h-screen bg-stone-200">
      {/* GameResults renders its own fixed overlay */}
      <GameResults entries={entries} onBack={() => {}} accent="from-fuchsia-500 to-pink-600" />
    </div>
  );
}
