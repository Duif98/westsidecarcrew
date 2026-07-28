// Generate iOS PWA launch screens (apple-touch-startup-image) from the brand
// "W". Dark background + centred gold W, at each common iPhone's native
// resolution. Run: node scripts/generate-splash.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, "..", "public");

// [pixelWidth, pixelHeight] portrait, for recent iPhones (covers ~2018→now).
const SIZES = [
  [1179, 2556], [1290, 2796], [1170, 2532], [1284, 2778],
  [1125, 2436], [1242, 2688], [828, 1792], [750, 1334],
];

// The W lives in a 512 box: x[140..372] (cx 256), y[180..340] (cy 260).
const W_CX = 256, W_CY = 260;

function splashSvg(w, h) {
  const k = (Math.min(w, h) * 0.34) / 512;            // logo ~34% of the short side
  const tx = w / 2 - W_CX * k;
  const ty = h / 2 - W_CY * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#0a0b0d"/>
    <g transform="translate(${tx} ${ty}) scale(${k})">
      <path d="M140 180 L205 340 L256 235 L307 340 L372 180" fill="none" stroke="#c9a877"
        stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`;
}

for (const [w, h] of SIZES) {
  const name = `apple-splash-${w}x${h}.png`;
  await sharp(Buffer.from(splashSvg(w, h))).png().toFile(join(pub, name));
  console.log("wrote", name);
}
console.log("done");
