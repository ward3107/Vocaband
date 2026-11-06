type LiveGameArtworkProps = {
  game: "quick" | "race" | "speed" | "arena";
};

const PALETTE = {
  quick: { from: "#4727C7", to: "#A34CF5", deep: "#422298" },
  race: { from: "#BD1D67", to: "#F54898", deep: "#8C1354" },
  speed: { from: "#B84016", to: "#FF8F3D", deep: "#823011" },
  arena: { from: "#087C75", to: "#22C8B1", deep: "#065D59" },
} as const;

/** One visual language for the four games, with a diagram of each play mechanic. */
export default function LiveGameArtwork({ game }: LiveGameArtworkProps) {
  const color = PALETTE[game];
  const gradientId = "live-game-" + game;

  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="1" y2="0">
          <stop stopColor={color.from} />
          <stop offset="1" stopColor={color.to} />
        </linearGradient>
      </defs>
      <rect width="320" height="150" fill={"url(#" + gradientId + ")"} />
      <circle cx="285" cy="-18" r="94" fill="#fff" opacity=".10" />
      <circle cx="26" cy="130" r="82" fill="#fff" opacity=".08" />
      <path d="M0 125c66-28 104 17 163 2s98-30 157-2v25H0Z" fill="#fff" opacity=".13" />
      <circle cx="28" cy="25" r="3" fill="#fff" opacity=".55" />
      <circle cx="292" cy="115" r="4" fill="#fff" opacity=".5" />

      {game === "quick" && (
        <>
          <rect x="96" y="16" width="126" height="126" rx="22" fill="#fff" opacity=".96" transform="rotate(-6 159 79)" />
          <rect x="111" y="29" width="96" height="97" rx="13" fill={color.deep} opacity=".11" transform="rotate(-6 159 79)" />
          <path d="M126 50h21v21h-21zm47 0h21v21h-21zm-47 45h21v21h-21zm30-24h11v11h-11zm17 20h21v7h-21zm0 13h8v12h-8zm13 0h8v12h-8z" fill={color.deep} />
          <path d="M132 56h9v9h-9zm47 0h9v9h-9zm-47 45h9v9h-9z" fill="#fff" />
          <circle cx="230" cy="96" r="30" fill="#fff" opacity=".96" />
          <path d="m233 75-16 24h12l-5 20 18-27h-12z" fill={color.from} />
        </>
      )}

      {game === "race" && (
        <>
          <rect x="93" y="22" width="196" height="113" rx="19" fill="#fff" opacity=".95" />
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <rect x="112" y={39 + row * 28} width="157" height="20" rx="8" fill={color.deep} opacity={row === 0 ? ".16" : ".09"} />
              <circle cx="127" cy={49 + row * 28} r="5" fill={color.from} opacity={row === 0 ? "1" : ".5"} />
              <path d={"M143 " + (49 + row * 28) + "h65m10 0h29"} stroke={color.deep} strokeWidth="4" strokeLinecap="round" opacity=".42" />
            </g>
          ))}
          <rect x="28" y="38" width="78" height="78" rx="20" fill="#fff" />
          <rect x="35" y="45" width="64" height="64" rx="16" fill={color.deep} />
          <text x="67" y="91" textAnchor="middle" fill="#fff" fontFamily="Arial, sans-serif" fontSize="50" fontWeight="800">B</text>
        </>
      )}

      {game === "speed" && (
        <>
          <circle cx="153" cy="79" r="57" fill="#fff" opacity=".95" />
          <circle cx="153" cy="79" r="44" fill="none" stroke={color.to} strokeWidth="9" opacity=".35" />
          <circle cx="153" cy="79" r="44" fill="none" stroke={color.from} strokeWidth="9" strokeDasharray="205 75" strokeLinecap="round" transform="rotate(-90 153 79)" />
          <rect x="143" y="12" width="20" height="11" rx="4" fill="#fff" />
          <text x="153" y="92" textAnchor="middle" fill={color.deep} fontFamily="Arial, sans-serif" fontSize="38" fontWeight="800">03</text>
          <path d="M63 48H39m34 13H51m25 57H48" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".7" />
          <rect x="224" y="49" width="60" height="17" rx="8.5" fill="#fff" opacity=".96" />
          <rect x="224" y="75" width="48" height="17" rx="8.5" fill="#fff" opacity=".67" />
          <rect x="224" y="101" width="38" height="17" rx="8.5" fill="#fff" opacity=".4" />
        </>
      )}

      {game === "arena" && (
        <>
          <path d="M20 108c55-13 62-71 123-66s52 72 101 60 42-60 75-58" fill="none" stroke="#fff" strokeWidth="28" strokeLinecap="round" opacity=".94" />
          <path d="M20 108c55-13 62-71 123-66s52 72 101 60 42-60 75-58" fill="none" stroke={color.deep} strokeWidth="2" strokeDasharray="4 7" strokeLinecap="round" opacity=".5" />
          <circle cx="60" cy="80" r="22" fill="#fff" />
          <path d="m50 80 7 7 14-17" fill="none" stroke={color.deep} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="166" cy="69" r="22" fill="#fff" />
          <path d="m166 56 4 8 9 1-7 7 2 9-8-4-8 4 2-9-7-7 9-1z" fill={color.from} />
          <circle cx="272" cy="82" r="22" fill="#fff" />
          <rect x="266" y="72" width="12" height="19" rx="3" fill={color.deep} />
          <circle cx="123" cy="39" r="12" fill={color.deep} stroke="#fff" strokeWidth="3" />
          <circle cx="123" cy="36" r="3" fill="#fff" />
          <path d="M114 47c2-6 16-6 18 0" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
