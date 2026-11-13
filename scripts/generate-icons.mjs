// Generates the PWA icons in public/icons from one SVG mark.
// Run with `pnpm icons` after changing the artwork below.
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const OUT_DIR = "public/icons";
const BG_FROM = "#D2532F";
const BG_TO = "#A8371F";
const INK = "#FFF6E8";
const SAFFRON = "#F4B740";

/** The pot mark on a 64×64 grid (same paths as components/ui/brand.tsx). */
const mark = `
  <g fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round">
    <path d="M23 6c-3.2 4 3.2 6.500 0 11"/>
    <path d="M32 4c-3.2 4 3.2 6.500 0 11"/>
    <path d="M41 6c-3.2 4 3.2 6.500 0 11"/>
  </g>
  <g fill="${INK}">
    <rect x="13" y="23" width="38" height="5.500" rx="2.750"/>
    <path d="M11.500 31.500h41v9.500c0 9.500-7.400 16-20.500 16S11.500 50.500 11.500 41z"/>
    <rect x="4" y="33.500" width="9" height="5.500" rx="2.750"/>
    <rect x="51" y="33.500" width="9" height="5.500" rx="2.750"/>
  </g>
  <circle cx="32" cy="43" r="4.200" fill="${SAFFRON}"/>`;

/**
 * @param {object} options
 * @param {number} options.radius  corner radius of the background, in 512-units
 * @param {number} options.scale   size of the mark relative to the canvas (maskable icons need a smaller mark)
 */
function iconSvg({ radius, scale }) {
  const size = 512;
  const markSize = size * scale;
  const offset = (size - markSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG_FROM}"/>
      <stop offset="1" stop-color="${BG_TO}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <circle cx="${size * 0.82}" cy="${size * 0.14}" r="${size * 0.2}" fill="#ffffff" opacity="0.07"/>
  <g transform="translate(${offset} ${offset + markSize * 0.02}) scale(${markSize / 64})">${mark}</g>
</svg>`;
}

mkdirSync(OUT_DIR, { recursive: true });

const rounded = iconSvg({ radius: 112, scale: 0.62 });
const square = iconSvg({ radius: 0, scale: 0.62 });
const maskable = iconSvg({ radius: 0, scale: 0.5 });

writeFileSync(`${OUT_DIR}/icon.svg`, rounded);

const outputs = [
  ["icon-192.png", rounded, 192],
  ["icon-512.png", rounded, 512],
  ["icon-maskable-192.png", maskable, 192],
  ["icon-maskable-512.png", maskable, 512],
  ["apple-touch-icon.png", square, 180],
];

for (const [name, svg, size] of outputs) {
  await sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toFile(`${OUT_DIR}/${name}`);
  console.log(`✓ ${OUT_DIR}/${name}`);
}
