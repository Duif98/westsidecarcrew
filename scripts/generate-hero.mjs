// Regenerates the front-page hero (GT-R at Lillebælt) from the high-res original
// into web assets that stay sharp on tall phones WITHOUT a heavier download:
//   • Landscape AVIF + WebP (desktop/tablet) — AVIF is ~40% smaller than WebP.
//   • A PORTRAIT crop (phones) — a phone's tall screen otherwise upscales the wide
//     landscape frame ~3x; a portrait crop gives it few, sharp pixels instead.
// Run: node scripts/generate-hero.mjs   (override crop with PORT_POS=left|right|attention)

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC =
  process.env.HERO_SRC ||
  "C:/Users/chris/Desktop/Lightroom biler/Mark GTR Lightroom/IMG_6288-Enhanced-NR.jpg";
const OUT = path.join(ROOT, "public");

// Landscape fills a large screen with lots of smooth sky/water, where low-quality
// AVIF shows grain/banding — so it gets a higher quality. The small portrait crop
// (phones) can stay leaner.
const AVIF_LAND = { quality: 68, effort: 4 };
const AVIF_PORT = { quality: 58, effort: 4 };
const WEBP = { quality: 80, effort: 5 };

const LAND = [["1280", 1280], ["1920", 1920], ["hd", 2560]];
const PORT_W = 1290;
const PORT_H = 2150; // ~3:5 — tall enough for phones, downscaled from a 3456px-tall source
const PORT_POS = process.env.PORT_POS || "center";

const kb = (p) => Math.round(fs.statSync(p).size / 1024) + "KB";

async function main() {
  const meta = await sharp(SRC).rotate().metadata();
  console.log("source", meta.width + "x" + meta.height);

  for (const [name, w] of LAND) {
    const avif = path.join(OUT, `hero-gtr-${name}.avif`);
    const webp = path.join(OUT, `hero-gtr-${name}.webp`);
    await sharp(SRC).rotate().resize({ width: w }).avif(AVIF_LAND).toFile(avif);
    await sharp(SRC).rotate().resize({ width: w }).webp(WEBP).toFile(webp);
    console.log(`landscape ${name} (${w}w): avif ${kb(avif)} · webp ${kb(webp)}`);
  }

  const pos = PORT_POS === "attention" ? sharp.strategy.attention : PORT_POS;
  const pAvif = path.join(OUT, "hero-gtr-portrait.avif");
  const pWebp = path.join(OUT, "hero-gtr-portrait.webp");
  await sharp(SRC).rotate().resize({ width: PORT_W, height: PORT_H, fit: "cover", position: pos }).avif(AVIF_PORT).toFile(pAvif);
  await sharp(SRC).rotate().resize({ width: PORT_W, height: PORT_H, fit: "cover", position: pos }).webp(WEBP).toFile(pWebp);
  console.log(`portrait ${PORT_W}x${PORT_H} (${PORT_POS}): avif ${kb(pAvif)} · webp ${kb(pWebp)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
