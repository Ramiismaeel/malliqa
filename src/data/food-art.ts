// Small drawings for dishes and ingredients that no emoji describes well
// (stuffed grape leaves, shanklish, mansaf, a Levantine zucchini…).
//
// A recipe or ingredient uses one by setting `emoji: "art:<name>"`; the
// `Emoji` component then renders the drawing instead of a glyph. Each entry is
// the inner markup of an `<svg viewBox="0 0 64 64">`, kept as plain text so
// the content studio (plain Node, no React) can serve the same drawings.
//
// To add one: compose it from the helpers below and add it to `foodArt`.

type N = number;

const c = (cx: N, cy: N, r: N, fill: string, more = ""): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${more}/>`;
const e = (cx: N, cy: N, rx: N, ry: N, fill: string, more = ""): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${more}/>`;
const p = (d: string, fill: string): string => `<path d="${d}" fill="${fill}"/>`;
const line = (d: string, stroke: string, width: N): string =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rot = (deg: N, cx: N, cy: N): string => ` transform="rotate(${deg} ${cx} ${cy})"`;
const turned = (deg: N, cx: N, cy: N, content: string): string =>
  `<g transform="rotate(${deg} ${cx} ${cy})">${content}</g>`;
const each = <T>(items: readonly T[], draw: (item: T, index: number) => string): string => items.map(draw).join("");

// ── containers ───────────────────────────────────────────────────────────────

const BOWLS = {
  clay: ["#cf6f47", "#eb9a72", "#a9532f"],
  blue: ["#4c82c0", "#93bcea", "#38669c"],
  white: ["#e2d7c4", "#fcf7ee", "#c9bba3"],
} as const;

/** A deep bowl seen from the front and slightly above; `surface` is what fills it. */
function bowl(surface: string, items: string, tone: keyof typeof BOWLS = "clay"): string {
  const [body, rim, foot] = BOWLS[tone];
  return (
    p("M21 54h22v4a3 3 0 0 1-3 3H24a3 3 0 0 1-3-3z", foot) +
    p("M3 31c1 15 13 26 29 26s28-11 29-26z", body) +
    e(32, 31, 29, 12, rim) +
    e(32, 31.5, 25.5, 9.5, surface) +
    items
  );
}

/** A round plate seen from above, covered with `food` up to `radius`. */
function plate(food: string, items: string, radius = 21.5): string {
  return c(32, 33.5, 29.5, "#cdbfa9") + c(32, 32, 29.5, "#fffaf0") + c(32, 32, 24.5, "#ece1cf") + c(32, 32, radius, food) + items;
}

// ── food bits ────────────────────────────────────────────────────────────────

const BROWN = "#74401f";
const BROWN_LIGHT = "#9a5c35";
const HERB = "#2f8a3a";

/** Short strokes scattered over a mound: rice, freekeh, bulgur. */
const grains = (color: string, points: ReadonlyArray<readonly [N, N, N]>): string =>
  each(points, ([x, y, deg]) => e(x, y, 2.1, 1, color, rot(deg, x, y)));

const RING: ReadonlyArray<readonly [N, N, N]> = [
  [16, 26, 20], [19, 39, -30], [25, 47, 10], [35, 49, -15], [44, 44, 30], [49, 33, -20],
  [46, 22, 15], [36, 14, -10], [25, 16, 40], [14, 33, 0], [41, 50, 5], [29, 13, -25],
];
const dots = (color: string, r: N, points: ReadonlyArray<readonly [N, N]>): string =>
  each(points, ([x, y]) => c(x, y, r, color));

const chunk = (x: N, y: N, deg = 0, w = 9, h = 7.5): string =>
  turned(
    deg,
    x + w / 2,
    y + h / 2,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.4" fill="${BROWN}"/>` +
      `<rect x="${x + 1.2}" y="${y + 1}" width="${w - 3.6}" height="${(h / 2.6).toFixed(1)}" rx="1.3" fill="${BROWN_LIGHT}"/>`,
  );

const meatball = (cx: N, cy: N, r: N): string =>
  c(cx, cy, r, BROWN) + e(cx - r * 0.3, cy - r * 0.35, r * 0.42, r * 0.26, BROWN_LIGHT, rot(-30, cx, cy));

const pea = (cx: N, cy: N): string => c(cx, cy, 2.6, "#5fae3c") + c(cx - 0.8, cy - 0.8, 0.8, "#aee084");

const nut = (cx: N, cy: N, deg: N): string => e(cx, cy, 2.4, 1.3, "#e0b46c", rot(deg, cx, cy));

/** A round slice with a rind, flattened by `squash` when it lies in a bowl. */
const slice = (cx: N, cy: N, r: N, rind: string, flesh: string, squash = 1): string =>
  e(cx, cy, r, r * squash, rind) + e(cx, cy, r - 1.3, (r - 1.3) * squash, flesh);

const cucumber = (cx: N, cy: N, r = 5, squash = 0.72): string =>
  slice(cx, cy, r, "#3f8f3a", "#d3ecaa", squash) + e(cx, cy, r * 0.36, r * 0.36 * squash, "#bde08c");

const lemon = (cx: N, cy: N, r = 6, squash = 1): string =>
  slice(cx, cy, r, "#f0be12", "#fdee9a", squash) +
  line(`M${cx - r + 2.6} ${cy}H${cx + r - 2.6}M${cx} ${cy - (r - 2.6) * squash}V${cy + (r - 2.6) * squash}`, "#f0be12", 1);

const tomato = (cx: N, cy: N): string => e(cx, cy, 4.6, 3.4, "#e23d28") + e(cx - 1.2, cy - 0.9, 1.7, 0.9, "#f7907a");

/** A glossy ball: awameh, chickpea, jameed. */
const ball = (cx: N, cy: N, r: N, dark: string, light: string, shine: string): string =>
  c(cx, cy, r, dark) +
  c(cx - 0.8, cy - 0.9, r - 1.7, light) +
  e(cx - r * 0.32, cy - r * 0.38, r * 0.3, r * 0.17, shine, rot(-35, cx - r * 0.32, cy - r * 0.38));

const PYRAMID: ReadonlyArray<readonly [N, N]> = [[32, 14.5], [22, 30], [42, 30], [13, 45.5], [32, 46], [51, 45.5]];

/** A stuffed grape-leaf roll lying on its side, rice showing at one end. */
const roll = (x: N, y: N, len: N, h = 11): string =>
  `<rect x="${x}" y="${y}" width="${len}" height="${h}" rx="${h / 2}" fill="#55752e"/>` +
  line(`M${x + 6} ${y + h * 0.28}h${len - 15}`, "#84a54f", 2) +
  line(`M${x + len * 0.34} ${y + 1.6}l-2.6 ${h - 3.2}M${x + len * 0.64} ${y + 1.6}l-2.6 ${h - 3.2}`, "#3c5620", 1.3) +
  e(x + len - 3.6, y + h / 2, 2.7, h * 0.36, "#3c5620") +
  e(x + len - 3.6, y + h / 2, 1.5, h * 0.22, "#f0e8cc");

const drumstick =
  line("M38 27L47.5 17.5", "#f6eedd", 4.6) +
  c(46.5, 14.8, 3.1, "#f6eedd") +
  c(50.2, 18.4, 3.1, "#f6eedd") +
  e(28, 35, 13.5, 10.5, "#c47a27", rot(-35, 28, 35)) +
  e(24.5, 31, 6, 3.4, "#e4a653", rot(-35, 24.5, 31));

const ZUCCHINI = "#a8cf78";
const ZUCCHINI_LIGHT = "#d2ebab";

/** A short stub of stuffed zucchini, the meat filling showing at one end. */
const zucchiniPiece = (x: N, y: N, deg: N): string =>
  turned(
    deg,
    x + 8.5,
    y + 4,
    `<rect x="${x}" y="${y}" width="17" height="8" rx="4" fill="${ZUCCHINI}"/>` +
      line(`M${x + 4} ${y + 2.6}h7`, ZUCCHINI_LIGHT, 1.6) +
      e(x + 14.8, y + 4, 1.8, 2.9, "#7a4a2c"),
  );

const kofta = (x: N, y: N, len: N, deg: N): string =>
  turned(
    deg,
    x + len / 2,
    y + 4,
    `<rect x="${x}" y="${y}" width="${len}" height="8.4" rx="4.2" fill="${BROWN}"/>` +
      line(`M${x + 4.5} ${y + 2.6}h${len - 10}`, BROWN_LIGHT, 1.8) +
      line(`M${x + len * 0.36} ${y + 5}l2 2.4M${x + len * 0.62} ${y + 5}l2 2.4`, "#4f2a12", 1.2),
  );

const penne = (x: N, y: N, deg: N): string =>
  turned(
    deg,
    x + 6.5,
    y + 2.8,
    `<rect x="${x}" y="${y}" width="13" height="5.6" rx="2" fill="#efcc68"/>` +
      line(`M${x + 2.5} ${y + 1.7}h6.5`, "#f9e6a6", 1.2) +
      e(x + 12, y + 2.8, 1.2, 2.2, "#c69b38"),
  );

const leaf = (cx: N, cy: N, deg: N): string =>
  turned(deg, cx, cy, e(cx, cy, 6.6, 3.6, "#3f8a37") + line(`M${cx - 5.6} ${cy}h10.4`, "#e6f1d2", 1.3));

const shred = (cx: N, cy: N, deg: N): string =>
  turned(deg, cx, cy, e(cx, cy, 5.6, 3.4, "#cf8f3c") + e(cx - 1, cy - 0.9, 2.7, 1.1, "#ecbd72"));

const bean = (cx: N, cy: N, deg: N): string =>
  turned(deg, cx, cy, e(cx, cy, 4.5, 2.9, "#79ad42") + line(`M${cx - 2.4} ${cy + 0.2}c1.6 1 3.2 1 4.8 0`, "#557f29", 1));

// ── the drawings ─────────────────────────────────────────────────────────────

export const foodArt: Readonly<Record<string, string>> = {
  // Levantine zucchini: short, pale green, thicker at the blossom end.
  zucchini: turned(
    -38,
    32,
    32,
    p("M52 28.5h5.5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H52z", "#6b8436") +
      p("M6 33c0-7 6-12 15-12 8 0 14 3 21 3 7 0 11 3.5 11 9s-4 9-11 9c-7 0-13 3-21 3-9 0-15-5-15-12z", ZUCCHINI) +
      line("M12 28c3-3 6-4 10-4 6 0 12 2 18 2.5", ZUCCHINI_LIGHT, 2.4) +
      line("M14 37h6M24 40h8M36 37h7M27 32h6M41 31.5h5", "#86b758", 1.5) +
      c(7.5, 33, 2, "#c9ae74"),
  ),

  "zucchini-yogurt": bowl(
    "#fcfbf5",
    zucchiniPiece(9, 27, -10) + zucchiniPiece(30, 24.5, 8) + zucchiniPiece(22, 32, -2) +
      dots("#3c7a34", 1.1, [[20, 24.5], [45, 35], [15, 36], [38, 37.5], [27, 23]]) +
      nut(47, 30.5, 20) + nut(13, 31.5, -30),
  ),

  "grape-rolls": turned(-12, 32, 32, roll(7, 41, 50) + roll(10, 28.5, 45) + roll(14, 16, 37)),

  "grape-rolls-lemon": plate(
    "#ece1cf",
    roll(14, 17, 29, 9) + roll(11, 27.5, 31, 9) + roll(14, 38, 29, 9) + lemon(49, 24.5, 6) + lemon(48.5, 40.5, 6),
  ),

  "freekeh-chicken": plate("#a39657", grains("#7d7240", RING.filter((_, i) => i % 2 === 0)) + grains("#c6ba7a", RING.filter((_, i) => i % 2 === 1)) + drumstick),

  "freekeh-meat": plate(
    "#a39657",
    grains("#7d7240", RING.filter((_, i) => i % 2 === 0)) + grains("#c6ba7a", RING.filter((_, i) => i % 2 === 1)) +
      chunk(18, 21, -12, 11, 9) + chunk(31, 27, 10, 11, 9) + chunk(20, 35, 5, 10.5, 8.5) +
      pea(41, 21) + pea(45, 41) + pea(35, 44) + pea(28, 16.5) + pea(15, 31) +
      nut(44, 32, 20) + nut(27, 47.5, -30),
  ),

  "peas-carrot-meat": bowl(
    "#d6492b",
    each([[17, 30], [39, 26.5], [31, 36.5]] as const, ([x, y]) => e(x, y, 4.3, 3.1, "#f08a24") + e(x, y, 2.1, 1.5, "#f9b55f")) +
      chunk(23, 23.5, -8, 8.5, 6.5) + chunk(42.5, 30.5, 10, 8.5, 6.5) +
      pea(12, 33) + pea(24, 34) + pea(35, 31) + pea(50, 27.5) + pea(40, 37.5) + pea(23, 38),
  ),

  "kebab-tomato": plate(
    "#d6492b",
    line("M17 20c4-4 9-6 15-6", "#e9765a", 2) +
      kofta(15, 20, 24, -8) + kofta(20, 30, 25, -8) + kofta(15, 40, 22, -8) +
      tomato(46.5, 23.5) + dots(HERB, 1.4, [[45, 41], [48.5, 33.5], [14.5, 33], [41, 46]]),
  ),

  "cherry-kebab": plate(
    "#7d1830",
    line("M17 21c4-4 9-6.5 15-7", "#a3304c", 2) +
      meatball(24, 25, 5.8) + meatball(38.5, 23, 5.8) + meatball(31, 35, 5.8) + meatball(19.5, 38, 5.2) + meatball(43.5, 36.5, 5.4) +
      each([[30.5, 15.5], [15, 29.5], [47.5, 28], [30, 46], [41, 46.5]] as const, ([x, y]) => c(x, y, 3.6, "#e2233c") + c(x - 1.1, y - 1.2, 1, "#ffa2ad")) +
      nut(36.5, 29.5, -20) + nut(25.5, 44, 10) + dots(HERB, 1.3, [[36.5, 42.5], [21.5, 17.5], [45, 20.5]]),
  ),

  "kishk-soup": bowl(
    "#e9dcbb",
    line("M15 31c5-4 12-5 17-2s11 3 16-1", "#d6c597", 2) +
      dots("#c9552f", 1.5, [[22, 35.5], [40, 34.5], [31, 26.5], [46, 28.5]]) +
      dots("#4c7d3a", 1.1, [[26, 29], [37, 38], [17, 30.5], [43, 31.5]]),
    "blue",
  ),

  "fava-rice": plate(
    "#fbf4e2",
    grains("#e3d6b4", RING) +
      bean(20, 22, -20) + bean(34, 18, 15) + bean(44.5, 27, -30) + bean(40, 40.5, 20) + bean(26, 45, -10) + bean(16, 35, 40) + bean(31, 31, 0) +
      dots("#7a4426", 2.2, [[27, 25.5], [38, 33.5], [22, 30.5], [33, 41], [46, 35], [24.5, 38.5]]) +
      nut(39, 22.5, 30) + nut(17.5, 28, -40),
  ),

  awameh: each(PYRAMID, ([x, y]) => ball(x, y, 10, "#b3631a", "#cf8a34", "#fae3b3") + c(x - 4.4, y - 4.9, 1, "#fff8e8")),

  hummus: plate(
    "#e6cf9c",
    `<circle cx="32" cy="32" r="13.5" fill="none" stroke="#d2b672" stroke-width="3.2"/>` +
      c(32, 32, 7.6, "#c8a625") + e(29.8, 29.8, 2.6, 1.3, "#e8d263", rot(-30, 29.8, 29.8)) +
      each([[30, 33.6], [35, 31.4], [32.6, 36.4]] as const, ([x, y]) => c(x, y, 2.5, "#e3b23c") + c(x - 0.7, y - 0.7, 0.9, "#f6dc8c")) +
      dots("#c7432a", 1.1, [[20, 22], [44, 23.5], [43, 42], [21.5, 43], [32, 14.5], [15, 33], [49, 32.5]]) +
      dots(HERB, 1.4, [[25.5, 17], [46.5, 37.5], [18.5, 38]]),
  ),

  "arabic-salad": bowl(
    "#dfeccb",
    cucumber(16, 30.5, 5.2) + tomato(24.5, 35.5) + cucumber(33, 25.5, 5.4) + tomato(41, 28.5) + tomato(26, 26.5) +
      cucumber(46.5, 33.5, 5) + tomato(36.5, 36.5) + dots(HERB, 1.3, [[20, 25.5], [31, 32], [43, 37.5], [50, 28.5], [13.5, 35]]),
    "blue",
  ),

  "cucumber-yogurt": bowl(
    "#fdfcf7",
    cucumber(15.5, 31, 4.6) + cucumber(27, 26.5, 4.6) + cucumber(41, 27.5, 4.6) + cucumber(48, 34, 4.4) + cucumber(31, 35.5, 4.8) +
      dots("#3c7a34", 1.1, [[22, 34], [35.5, 30.5], [40.5, 37.5], [19.5, 26], [34, 23.5], [47.5, 29]]),
    "blue",
  ),

  // A dried cheese ball: grey-red spiced crust, white inside where it is cut.
  shanklish:
    e(32, 57, 19, 3.6, "#000", ` opacity="0.12"`) +
    c(32, 31, 25, "#8e6a61") +
    dots("#b4483a", 1.7, [[19, 20], [31, 12.5], [14, 34], [24, 44], [36, 50], [41, 15.5], [26, 28]]) +
    dots("#5d4a44", 1.4, [[25, 16], [12.5, 26], [18, 41], [31, 46], [36, 21], [22, 35]]) +
    dots("#6f7354", 1.4, [[15, 16.5], [29, 21], [11.5, 31], [29, 38], [44, 51], [20, 49]]) +
    p("M32 31L55.5 22.4A25 25 0 0 1 51.2 47.1z", "#f4eddb") +
    line("M32 31L55.5 22.4M32 31L51.2 47.1", "#d6ccb5", 1.2) +
    line("M55.5 22.4A25 25 0 0 1 51.2 47.1", "#8e6a61", 2.4) +
    dots("#ded4bc", 1.2, [[44, 30], [47.5, 36], [41, 36.5], [49, 28.5]]),

  chickpeas: each(
    PYRAMID,
    ([x, y]) => ball(x, y, 10, "#d79f24", "#eec457", "#fcebb0") + line(`M${x + 1.5} ${y + 7}c1.4-2 1.4-4.6 0-6.6`, "#c0871a", 1.3),
  ),

  // A large shared platter: rice, big pieces of meat, toasted nuts.
  mansaf: plate(
    "#fbf2d9",
    grains("#e6d9b0", RING.map(([x, y, deg]) => [32 + (x - 32) * 1.18, 32 + (y - 32) * 1.18, deg] as const)) +
      chunk(18, 20, -10, 12, 10) + chunk(33, 18.5, 8, 12, 10) + chunk(20, 33.5, 6, 12, 10) + chunk(34.5, 32.5, -6, 12, 10) +
      nut(14, 33, 50) + nut(31, 46.5, 0) + nut(49, 29, -50) + nut(27, 14, 10) + nut(46.5, 42, 30) +
      dots(HERB, 1.4, [[17, 44], [44, 17], [50, 36], [38, 48], [13.5, 26]]),
    25,
  ),

  "lentil-chard": bowl(
    "#9c8743",
    leaf(17, 30.5, -15) + leaf(30, 36, 10) + leaf(27.5, 26, 18) +
      lemon(44, 29.5, 6.6, 0.72) +
      dots("#5e3d1f", 1.5, [[37, 37], [13, 35.5], [37, 24.5], [21.5, 37], [49, 36], [41, 38.5], [19, 24.5]]),
    "white",
  ),

  "fattet-djaj": plate(
    "#fbf4e2",
    grains("#e3d6b4", RING) +
      c(32, 32.7, 14.6, "#e6dfcf") + c(32, 32, 14.4, "#ffffff") +
      shred(25, 27, -20) + shred(37.5, 26, 25) + shred(31, 36.5, 5) + shred(40.5, 37, -30) + shred(22.5, 37, 40) +
      nut(31.5, 29.5, 30) + nut(36, 42.5, -20) + dots("#c7432a", 1, [[28, 22.5], [43, 31.5], [26.5, 42]]) +
      dots(HERB, 1.3, [[33, 21], [20.5, 31.5], [43.5, 42]]),
  ),

  // Rice cooked in milk until creamy, roast chicken on top.
  saleeg: plate(
    "#fdf8ea",
    grains("#ece0c2", RING) + line("M15 36c2 7 8 12 16 13M44 16c3 3 5 7 5.5 11", "#f0cc5a", 2.2) + drumstick,
  ),

  "white-pasta": bowl(
    "#fbf5e3",
    penne(10, 28, -15) + penne(24, 24, 10) + penne(38, 25.5, -8) + penne(16.5, 33.5, 8) + penne(31, 32, -12) + penne(42, 33, 14) +
      e(25.5, 30.5, 5.5, 2, "#fffdf6") + e(39, 31, 4.6, 1.7, "#fffdf6") +
      dots("#3b3b3b", 0.7, [[21, 27], [35, 29.5], [29, 37], [46, 30], [15, 32]]) +
      dots(HERB, 1.2, [[33, 23.5], [22.5, 38], [41, 38]]),
  ),

  // A samoun roll stuffed with spiced minced meat and pickles.
  "samoun-sandwich": turned(
    -14,
    32,
    32,
    p("M6 37h52c0 8-10 12-26 12S6 45 6 37z", "#cf8d3a") +
      p("M5 31c0-2 2-3 4-3h46c2 0 4 1 4 3v5c0 2-2 3-4 3H9c-2 0-4-1-4-3z", "#6f3219") +
      each([[12, 31.5, 3.6], [20, 30.5, 4], [28.5, 31, 3.8], [37, 30.5, 4], [45, 31, 3.8], [52, 32, 3.2]] as const, ([x, y, r], i) =>
        c(x, y, r, i % 2 ? "#7d3a1e" : "#8f4726"),
      ) +
      each([[17, 36.5], [33, 37], [47, 36.5]] as const, ([x, y]) => e(x, y, 5, 2, "#86b03c") + e(x, y, 3.3, 0.9, "#bfdc7a")) +
      dots("#c8452c", 1, [[25, 35], [41, 35.5]]) +
      p("M5 30c0-11 12-18 27-18s27 7 27 18z", "#e0a047") +
      line("M13 23c4-4.5 10-7 17-7", "#f4cd8d", 2.6),
  ),

  // Dried yogurt, shaped into rough greyish-white balls.
  jameed: each([[32, 20], [19.5, 42], [44.5, 42]] as const, ([x, y]) =>
    ball(x, y, 12.5, "#cfc9bb", "#ebe7dc", "#fbf9f2") + line(`M${x + 2} ${y + 3}l3 2.5M${x - 5} ${y + 5.5}l2.5 1`, "#bdb6a6", 1.1),
  ),
};

/** The whole drawing as a standalone SVG document (used by the content studio). */
export function foodArtSvg(name: string): string | undefined {
  const art = foodArt[name];
  return art ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${art}</svg>` : undefined;
}
