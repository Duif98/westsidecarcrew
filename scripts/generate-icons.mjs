// Generate PWA icons from a vector "W" (no font dependency at raster time).
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, "..", "public");

const W = `<path d="M140 180 L205 340 L256 235 L307 340 L372 180"
  fill="none" stroke="#c9a877" stroke-width="34"
  stroke-linecap="round" stroke-linejoin="round"/>`;

// Rounded tile (for "any" purpose — looks good as a plain app icon).
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0a0b0d"/>
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#1e2229" stroke-width="4"/>
  ${W}
</svg>`;

// Full-bleed square (for "maskable" + iOS, which apply their own mask).
const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0b0d"/>
  ${W}
</svg>`;

async function png(svg, size, name) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(pub, name));
  console.log("wrote", name);
}

await png(rounded, 192, "icon-192.png");
await png(rounded, 512, "icon-512.png");
await png(square, 512, "icon-maskable-512.png");
await png(square, 180, "apple-touch-icon.png");
console.log("done");
