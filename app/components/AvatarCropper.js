"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";

// Draw the selected crop area onto a square canvas and return a JPEG File.
function createImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.addEventListener("load", () => res(img));
    img.addEventListener("error", rej);
    img.src = url;
  });
}
async function croppedFile(src, area, size = 512) {
  const img = await createImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

// Square avatar cropper: drag to center, slider to zoom. Returns a cropped File.
export default function AvatarCropper({ file, onCancel, onDone }) {
  const [src] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [busy, setBusy] = useState(false);
  const srcRef = useRef(src);

  const onComplete = useCallback((_, px) => setArea(px), []);
  useEffect(() => () => URL.revokeObjectURL(srcRef.current), []);

  const save = async () => {
    if (!area) return;
    setBusy(true);
    try {
      const out = await croppedFile(src, area);
      onDone(out);
    } finally { setBusy(false); }
  };

  return createPortal(
    <div className="md" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="md-panel crop-panel">
        <button className="md-close" onClick={onCancel} aria-label="Luk">✕</button>
        <span className="overline">Profilbillede</span>
        <h2 className="md-title">Placér & beskær</h2>

        <div className="crop-stage">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
          />
        </div>

        <label className="crop-zoom">
          <span>Zoom</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>

        <div className="post-actions">
          <button className="btn-gold" style={{ width: "auto" }} onClick={save} disabled={busy || !area}>{busy ? "…" : "Brug billede"}</button>
          <button className="ph-btn" style={{ flex: "none", width: "auto" }} onClick={onCancel}>Annullér</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
