/**
 * Regenerates public/og-image.png — the preview image Facebook,
 * WhatsApp, iMessage etc. show when someone shares vocaband.com.
 *
 * The previous file was 512x512 with transparent corners, so every
 * social preview showed the violet rounded-square logo with WHITE
 * around it in the rectangular preview slot. This version is 1200x630
 * (Facebook's recommended OG size) with a full-bleed gradient
 * background, so the preview is edge-to-edge brand colour with the
 * circle logo + wordmark centred — no white anywhere.
 *
 * Run:
 *   npx tsx scripts/generate-og-image.ts
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WIDTH = 1200;
const HEIGHT = 630;
const OUT = resolve(process.cwd(), 'public/og-image.png');

// Full-bleed gradient that matches src/index.css's signature palette
// (indigo→violet→fuchsia) so the OG preview looks like the landing page.
// A circle logo sits in the middle with "Vocaband" as a wordmark below.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#6366f1"/>
      <stop offset="50%"  stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#d946ef"/>
    </linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05"/>
    </linearGradient>
  </defs>

  <!-- Full-bleed gradient background: no transparent corners means no
       white bleed when Facebook / WhatsApp render the preview. -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>

  <!-- Soft glow behind the circle so it reads as 3D. -->
  <circle cx="600" cy="280" r="200" fill="#ffffff" opacity="0.08"/>

  <!-- Circle logo with white V, rotated 8° to match the favicon. -->
  <circle cx="600" cy="280" r="160" fill="url(#ring)" stroke="#ffffff" stroke-opacity="0.5" stroke-width="4"/>
  <text x="600" y="360" text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif"
        font-weight="900" font-size="230" font-style="italic"
        fill="#ffffff"
        transform="rotate(8 600 280)">V</text>

  <!-- Wordmark. -->
  <text x="600" y="510" text-anchor="middle"
        font-family="'Plus Jakarta Sans', Arial, sans-serif"
        font-weight="900" font-size="84"
        fill="#ffffff"
        letter-spacing="-1">Vocaband</text>

  <!-- Tagline. -->
  <text x="600" y="560" text-anchor="middle"
        font-family="'Plus Jakarta Sans', Arial, sans-serif"
        font-weight="600" font-size="26"
        fill="#ffffff" opacity="0.85">
    Gamified English vocabulary for Israeli schools
  </text>
</svg>
`.trim();

async function main() {
  const buf = await sharp(Buffer.from(svg)).png({ quality: 92, compressionLevel: 9 }).toBuffer();
  writeFileSync(OUT, buf);
  console.log(`Wrote ${OUT} (${(buf.length / 1024).toFixed(1)} kB, ${WIDTH}x${HEIGHT})`);
}

main().catch(err => { console.error(err); process.exit(1); });
