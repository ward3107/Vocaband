type LiveGameArtworkProps = {
  game: "race" | "speed" | "arena";
};

/** Small diagrams of the actual play mechanic, rather than decorative emoji. */
export default function LiveGameArtwork({ game }: LiveGameArtworkProps) {
  if (game === "race") {
    return (
      <svg viewBox="0 0 300 132" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="300" height="132" fill="#FCE9F1" />
        <path d="M0 104c55-35 94-35 143-11s99 21 157-12v51H0Z" fill="#F7D7E5" />
        <rect x="90" y="16" width="188" height="104" rx="16" fill="#fff" stroke="#EBB7CE" strokeWidth="1.5" />
        <rect x="106" y="31" width="155" height="20" rx="7" fill="#FBE6EE" />
        <circle cx="120" cy="41" r="5" fill="#D94A86" />
        <path d="M137 41h41m9 0h33" stroke="#CD86A5" strokeWidth="4" strokeLinecap="round" />
        <rect x="106" y="58" width="155" height="20" rx="7" fill="#FDF2F6" />
        <circle cx="120" cy="68" r="5" fill="#E987AC" />
        <path d="M137 68h60m9 0h22" stroke="#D5A5B8" strokeWidth="4" strokeLinecap="round" />
        <rect x="106" y="85" width="155" height="20" rx="7" fill="#FDF2F6" />
        <circle cx="120" cy="95" r="5" fill="#E987AC" />
        <path d="M137 95h34m9 0h50" stroke="#D5A5B8" strokeWidth="4" strokeLinecap="round" />
        <rect x="25" y="32" width="70" height="70" rx="20" fill="#9D174D" />
        <rect x="31" y="38" width="58" height="58" rx="16" fill="#BB245F" />
        <text x="60" y="80" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="45" fontWeight="800">B</text>
        <path d="m29 110 11-4 8 8" fill="none" stroke="#D94A86" strokeWidth="3" strokeLinecap="round" />
        <circle cx="273" cy="14" r="3" fill="#D94A86" />
      </svg>
    );
  }

  if (game === "speed") {
    return (
      <svg viewBox="0 0 300 132" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="300" height="132" fill="#FFF0E1" />
        <path d="M0 111c60-29 94-21 145 3s98 17 155-16v34H0Z" fill="#FFE2C4" />
        <path d="M87 23h-26m18 11H45m48 75H59" stroke="#F6BD88" strokeWidth="4" strokeLinecap="round" />
        <circle cx="153" cy="67" r="48" fill="#FFF9F2" stroke="#F7C693" strokeWidth="2" />
        <circle cx="153" cy="67" r="39" fill="none" stroke="#E86130" strokeWidth="8" strokeDasharray="181 65" strokeLinecap="round" transform="rotate(-90 153 67)" />
        <rect x="145" y="7" width="16" height="9" rx="3" fill="#9C3415" />
        <text x="153" y="77" textAnchor="middle" fill="#9C3415" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="800">03</text>
        <path d="m215 35 17-8m-7 24 24-3m-31 42 22 12" stroke="#EFB780" strokeWidth="3" strokeLinecap="round" />
        <rect x="225" y="58" width="51" height="15" rx="7.5" fill="#E86130" />
        <rect x="225" y="80" width="41" height="15" rx="7.5" fill="#F5BA87" />
        <circle cx="236" cy="65.5" r="3" fill="#fff" />
        <circle cx="236" cy="87.5" r="3" fill="#A44B2E" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 300 132" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="300" height="132" fill="#E1F5F1" />
      <path d="M-10 42c61-31 86 16 141 6s77-48 179-15v-43H-10Z" fill="#C8EAE2" />
      <path d="M-8 112c62-32 91-7 141 2s103-20 178-43v68H-8Z" fill="#C8EAE2" />
      <path d="M20 84c48-4 52-48 104-48s53 64 104 53 39-52 76-51" fill="none" stroke="#fff" strokeWidth="24" strokeLinecap="round" />
      <path d="M20 84c48-4 52-48 104-48s53 64 104 53 39-52 76-51" fill="none" stroke="#92C9BE" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" />
      <circle cx="58" cy="68" r="18" fill="#fff" stroke="#72C6B8" strokeWidth="2" />
      <path d="m52 68 4 4 8-9" fill="none" stroke="#0C7A6B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="176" cy="68" r="18" fill="#fff" stroke="#72C6B8" strokeWidth="2" />
      <rect x="171" y="61" width="11" height="14" rx="2" fill="#12A591" />
      <circle cx="261" cy="62" r="18" fill="#fff" stroke="#72C6B8" strokeWidth="2" />
      <path d="m261 53 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#12A591" />
      <circle cx="115" cy="35" r="11" fill="#075E58" stroke="#fff" strokeWidth="3" />
      <circle cx="115" cy="33" r="3" fill="#fff" />
      <path d="M107 42c2-4 14-4 16 0" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
