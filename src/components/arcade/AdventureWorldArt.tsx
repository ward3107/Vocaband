import type { AdventureWorldId } from '../../locales/student/adventure';

/** Decorative, self-hosted vector scenery. The playable route is real HTML below it. */
export default function AdventureWorldArt({ world }: { world: AdventureWorldId }) {
  if (world === 'jungle') return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 900 340" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="aj-sky" x2="0" y2="1"><stop stopColor="#164F50"/><stop offset=".56" stopColor="#7AB893"/><stop offset="1" stopColor="#D9BB73"/></linearGradient>
        <linearGradient id="aj-path" x2="0" y2="1"><stop stopColor="#FFE7A0"/><stop offset="1" stopColor="#B68544"/></linearGradient>
        <linearGradient id="aj-fern" x2="0" y2="1"><stop stopColor="#27674A"/><stop offset="1" stopColor="#0B332D"/></linearGradient>
        <radialGradient id="aj-light"><stop stopColor="#FFE5A4" stopOpacity=".82"/><stop offset="1" stopColor="#FFE5A4" stopOpacity="0"/></radialGradient>
      </defs>
      <path fill="url(#aj-sky)" d="M0 0h900v340H0z"/>
      <circle cx="704" cy="40" r="155" fill="url(#aj-light)"/>
      <path d="M0 207Q100 115 209 180Q335 80 477 173Q574 96 699 151Q812 73 900 148V340H0Z" fill="#3B896D" opacity=".7"/>
      <path d="M0 250Q141 154 283 216Q417 136 531 221Q678 125 900 206V340H0Z" fill="#1F6651"/>
      <path d="M0 293Q152 218 303 262Q450 202 565 266Q725 199 900 249V340H0Z" fill="#10483D"/>
      <path d="M95 340Q197 289 307 292Q417 295 489 249Q568 196 680 203Q791 204 879 139" fill="none" stroke="#735530" strokeWidth="31" opacity=".42"/>
      <path d="M95 340Q197 289 307 292Q417 295 489 249Q568 196 680 203Q791 204 879 139" fill="none" stroke="url(#aj-path)" strokeWidth="21" strokeLinecap="round" strokeDasharray="2 5"/>
      <g fill="url(#aj-fern)">
        <path d="M0 340V48Q54 103 83 172Q92 68 153 13Q151 166 113 340Z"/>
        <path d="M900 340V43Q844 110 818 180Q807 73 749 23Q752 160 788 340Z"/>
      </g>
      <g fill="#0D3D32">
        <ellipse cx="90" cy="74" rx="151" ry="38" transform="rotate(23 90 74)"/>
        <ellipse cx="22" cy="140" rx="128" ry="29" transform="rotate(-24 22 140)"/>
        <ellipse cx="813" cy="66" rx="160" ry="36" transform="rotate(-23 813 66)"/>
        <ellipse cx="894" cy="132" rx="128" ry="30" transform="rotate(24 894 132)"/>
      </g>
      <g fill="#57A36D" opacity=".95">
        <path d="M28 334q62-118 91-33q-56-28-91 33Zm58-9q64-139 103-51q-74-12-103 51Z"/>
        <path d="M876 339q-50-128-95-47q69-24 95 47Zm-60-5q-75-145-108-54q81-22 108 54Z"/>
      </g>
      <g fill="#F4CB73"><circle cx="233" cy="188" r="3"/><circle cx="326" cy="150" r="2"/><circle cx="595" cy="113" r="3"/><circle cx="747" cy="222" r="2"/></g>
    </svg>
  );

  if (world === 'ocean') return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 900 340" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="ao-sea" x2="0" y2="1"><stop stopColor="#44B7C5"/><stop offset=".5" stopColor="#0F718D"/><stop offset="1" stopColor="#073751"/></linearGradient>
        <linearGradient id="ao-sand" x2="0" y2="1"><stop stopColor="#F9E8AF"/><stop offset="1" stopColor="#C4A87B"/></linearGradient>
        <linearGradient id="ao-light" x2=".5" y2="1"><stop stopColor="#D5FFFF" stopOpacity=".8"/><stop offset="1" stopColor="#D5FFFF" stopOpacity="0"/></linearGradient>
      </defs>
      <path fill="url(#ao-sea)" d="M0 0h900v340H0z"/>
      <path d="M0 37Q167 65 316 34Q476 4 611 35Q750 69 900 25V0H0Z" fill="#B9F2EA" opacity=".62"/>
      <path d="M555 0L333 340H245L434 0Zm173 0L496 340h-59L615 0Z" fill="url(#ao-light)" opacity=".25"/>
      <path d="M0 244Q150 174 313 220Q456 155 600 212Q753 167 900 215V340H0Z" fill="#17627B" opacity=".8"/>
      <path d="M0 300Q148 230 297 264Q436 214 582 276Q744 223 900 259V340H0Z" fill="#0B4A65"/>
      <path d="M70 339Q191 260 310 274Q436 290 480 232Q559 167 680 191Q798 214 874 107" fill="none" stroke="#2F4D52" strokeWidth="36" opacity=".45"/>
      <path d="M70 339Q191 260 310 274Q436 290 480 232Q559 167 680 191Q798 214 874 107" fill="none" stroke="url(#ao-sand)" strokeWidth="24" strokeLinecap="round" strokeDasharray="3 4"/>
      <g fill="none" stroke="#4AD0B0" strokeWidth="9" strokeLinecap="round">
        <path d="M35 340q38-63 18-128m-18 80q-30-24-25-58m41 33q35-35 32-70"/>
        <path d="M857 340q-42-75-21-150m17 90q32-43 29-80m-36 62q-32-23-32-57"/>
      </g>
      <g fill="none" stroke="#F39B79" strokeWidth="9" strokeLinecap="round">
        <path d="M123 340q10-52-8-82m12 52q26-33 32-49m-38 32q-23-13-30-36"/>
        <path d="M734 340q-8-63 17-98m-16 55q-29-31-34-50m42 32q29-26 36-44"/>
      </g>
      <g fill="#B4EDE5" opacity=".77"><circle cx="146" cy="127" r="4"/><circle cx="155" cy="105" r="2"/><circle cx="643" cy="114" r="4"/><circle cx="650" cy="90" r="2"/><circle cx="667" cy="71" r="2"/></g>
      <g fill="#B9E8DD" opacity=".7"><path d="M260 139q21-13 43 0q-22 12-43 0Zm33 0 11-9v18Z"/><path d="M711 74q16-10 32 0q-16 9-32 0Zm26 0 9-7v14Z"/></g>
    </svg>
  );

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 900 340" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="as-sky" x2="0" y2="1"><stop stopColor="#15144D"/><stop offset=".65" stopColor="#333076"/><stop offset="1" stopColor="#584A96"/></linearGradient>
        <radialGradient id="as-planet"><stop stopColor="#91E6F5"/><stop offset=".66" stopColor="#4D69C0"/><stop offset="1" stopColor="#172A76"/></radialGradient>
        <linearGradient id="as-route" x2="0" y2="1"><stop stopColor="#FFF0AD"/><stop offset="1" stopColor="#DCA66A"/></linearGradient>
      </defs>
      <path fill="url(#as-sky)" d="M0 0h900v340H0z"/>
      <path d="M0 0Q250 70 490 0T900 20V128Q692 61 515 107Q251 166 0 62Z" fill="#7565B5" opacity=".2"/>
      <circle cx="715" cy="94" r="85" fill="url(#as-planet)"/>
      <circle cx="723" cy="93" r="101" fill="none" stroke="#C5B1F4" strokeWidth="5" opacity=".43" transform="rotate(-22 723 93)"/>
      <circle cx="276" cy="93" r="28" fill="#E3A1A5"/><circle cx="237" cy="131" r="8" fill="#A9C0F8"/>
      <path d="M0 319Q127 280 267 318Q384 268 496 319Q681 249 900 302V340H0Z" fill="#191D59"/>
      <path d="M0 328Q162 283 321 331Q465 280 575 327Q746 285 900 316V340H0Z" fill="#332D6F"/>
      <path d="M64 340Q158 275 286 284Q394 300 474 237Q545 176 641 205Q735 226 857 152" fill="none" stroke="#7A69B2" strokeWidth="28" opacity=".45"/>
      <path d="M64 340Q158 275 286 284Q394 300 474 237Q545 176 641 205Q735 226 857 152" fill="none" stroke="url(#as-route)" strokeWidth="9" strokeLinecap="round" strokeDasharray="2 17"/>
      <g fill="#E4CBFF"><circle cx="84" cy="44" r="2"/><circle cx="153" cy="103" r="3"/><circle cx="344" cy="48" r="2"/><circle cx="405" cy="127" r="2"/><circle cx="487" cy="33" r="3"/><circle cx="579" cy="98" r="2"/><circle cx="820" cy="39" r="2"/><circle cx="851" cy="229" r="2"/><circle cx="46" cy="198" r="2"/></g>
      <g fill="#9DE1F3" opacity=".74"><path d="m137 326 28-61 24 61Zm546 10 25-60 24 60Z"/><path d="m198 333 19-42 17 42Zm563 6 19-44 16 44Z"/></g>
    </svg>
  );
}
