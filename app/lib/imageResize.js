// Downscale a user-selected image in the browser before uploading. Phone photos
// are routinely 5–10 MB, but the feed, chat and DMs only ever show them a few
// hundred px wide — so we cap the long edge and re-encode as JPEG. Typical result
// is a ~15–25× smaller file with no visible quality loss, which is the real cure
// for slow-loading images AND the egress bill (this project's Supabase plan has
// no server-side image transforms). Any failure falls back to the original file,
// so upload never breaks.
export async function shrinkImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  if (typeof document === "undefined") return file;
  if (!file || !file.type || !file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file; // keep animation intact

  try {
    const { source, width, height, close } = await decode(file);
    const scale = Math.min(1, maxDim / Math.max(width, height));

    // Already small and light? Leave it alone.
    if (scale === 1 && file.size < 1_200_000) { close?.(); return file; }

    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0, w, h);
    close?.();

    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // no gain — keep original

    const name = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

// Decode a File to something canvas can draw. Prefer createImageBitmap (fast +
// bakes in EXIF orientation), but fall back to a plain <img> — crucial on iOS
// Safari, where createImageBitmap (or its options bag) is often unsupported and
// throws. Without this fallback the whole shrink silently failed there, so phone
// uploads never got a thumbnail and every feed view pulled the full multi-MB
// original.
async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() };
    } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
