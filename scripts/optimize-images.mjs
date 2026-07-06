// Optimizes the raw Lightroom exports into web-ready WebP assets.
// Run: npm run optimize
// Source photos live outside the repo; the committed output is public/cars/**.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = process.env.PHOTO_SRC || "C:/Users/chris/Desktop/Lightroom biler";
const OUT = path.join(ROOT, "public", "cars");

// slug -> { folder, cover, exclude[] }. Cover is rendered first in each set.
const CARS = {
  "duif-m4": { folder: "Duif M4 Lightroom", cover: "IMG_6311-Enhanced-NR.jpg" },
  "lukas-m4": { folder: "Lukas M4 Lightroom", cover: "IMG_6305-Enhanced-NR.jpg" },
  "mark-gtr": { folder: "Mark GTR Lightroom", cover: "IMG_6288-Enhanced-NR.jpg" },
  "c63s": { folder: "C63S Lightroom", cover: "IMG_4180.jpg" },
  "corvette": { folder: "Corvette Lightroom", cover: "IMG_4407.jpg" },
  "nic-leon": { folder: "Nic Leon Lightroom", cover: "OK_IMG_4850.jpg" },
  "s8": { folder: "S8 Lightroom", cover: "IMG_4097.jpg" },
  "hausmann-lincoln": { folder: "Hausmann Lincoln Lightroom", cover: "IMG_6271-Enhanced-NR.jpg" },
  "panamera": { folder: "Panamera Salg Lightroom", cover: "IMG_5810.jpg" },
};

const HERO = { slug: "lukas-m4", file: "IMG_6305-Enhanced-NR.jpg" };

const FULL_W = 1920;
const THUMB_W = 900;
const HERO_W = 2400;

async function listJpgs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && /\.jpe?g$/i.test(e.name))
    .map((e) => e.name);
  // Drop "-2" alternate edits when the base frame is also present.
  const bases = new Set(files.map((f) => f.replace(/-2(\.[^.]+)$/i, "$1")));
  return files
    .filter((f) => !(/-2\.[^.]+$/i.test(f) && bases.has(f.replace(/-2(\.[^.]+)$/i, "$1"))))
    .sort();
}

function outName(file) {
  return file.replace(/\.[^.]+$/, "").replace(/[^a-z0-9\-_]/gi, "_") + ".webp";
}

async function render(srcPath, destPath, width, quality) {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await sharp(srcPath)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toFile(destPath);
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  const manifest = {};

  for (const [slug, cfg] of Object.entries(CARS)) {
    const dir = path.join(SRC, cfg.folder);
    let files;
    try {
      files = await listJpgs(dir);
    } catch {
      console.warn(`! Missing source folder: ${dir}`);
      continue;
    }
    // Cover first, then the rest.
    files = files.sort((a, b) =>
      a === cfg.cover ? -1 : b === cfg.cover ? 1 : a.localeCompare(b)
    );

    manifest[slug] = [];
    for (const file of files) {
      const src = path.join(dir, file);
      const name = outName(file);
      const meta = await sharp(src).rotate().metadata();
      await render(src, path.join(OUT, slug, name), FULL_W, 80);
      await render(src, path.join(OUT, slug, "thumb", name), THUMB_W, 74);
      const w = Math.min(meta.width, FULL_W);
      const h = Math.round(w * (meta.height / meta.width));
      manifest[slug].push({ src: name, w, h });
      process.stdout.write(`  ${slug}/${name}\r`);
    }
    console.log(`✓ ${slug}: ${files.length} photos`);
  }

  // Hero (wider) + social preview image.
  const heroSrc = path.join(SRC, CARS[HERO.slug].folder, HERO.file);
  await render(heroSrc, path.join(ROOT, "public", "hero.webp"), HERO_W, 82);
  await fs.mkdir(path.join(ROOT, "public"), { recursive: true });
  await sharp(heroSrc)
    .rotate()
    .resize({ width: 1200, height: 630, fit: "cover", position: "attention" })
    .jpeg({ quality: 82 })
    .toFile(path.join(ROOT, "public", "og.jpg"));
  console.log("✓ hero.webp + og.jpg");

  await fs.writeFile(
    path.join(ROOT, "app", "data", "photos.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log("✓ app/data/photos.json written");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
