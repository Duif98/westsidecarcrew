// Downscale a user-selected image in the browser before uploading. Phone photos
// are routinely 5–10 MB, but the feed, chat and DMs only ever show them a few
// hundred px wide — so we cap the long edge and re-encode as JPEG. Typical result
// is a ~15–25× smaller file with no visible quality loss, which is the real cure
// for slow-loading images (this project's Supabase plan has no server-side image
// transforms). Any failure falls back to the original file, so upload never breaks.
export async function shrinkImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  if (typeof document === "undefined") return file;
  if (!file || !file.type || !file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file; // keep animation intact

  try {
    // `from-image` bakes in EXIF orientation so rotated phone photos stay upright.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));

    // Already small and light? Leave it alone.
    if (scale === 1 && file.size < 1_200_000) { bitmap.close?.(); return file; }

    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // no gain — keep original

    const name = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
