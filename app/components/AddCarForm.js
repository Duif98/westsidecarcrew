"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { createAlbum } from "../lib/albums";
import { uploadPhoto } from "../lib/photos";

// Add a whole new car from your own profile: creates an album (created_by = you),
// writes its specs + optional VIN, and uploads a public cover photo. Once an
// admin approves the photo, the car joins the front-page garage rotation like
// any other; if a VIN is given it shows up in the parts catalog automatically.
export default function AddCarForm({ userId, ownerName, onCreated }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ make: "", model: "", model_year: "", power_hp: "", engine: "", drivetrain: "", mods: "", vin: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const pickFile = (f) => {
    if (preview) URL.revokeObjectURL(preview);
    if (f && !f.type.startsWith("image/")) { setMsg("Vælg en billedfil (jpg, png, heic …)."); setFile(null); setPreview(null); return; }
    if (f && f.size > 50 * 1024 * 1024) { setMsg("Filen er for stor (max 50 MB)."); setFile(null); setPreview(null); return; }
    setMsg("");
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null);
    setForm({ make: "", model: "", model_year: "", power_hp: "", engine: "", drivetrain: "", mods: "", vin: "" });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.make.trim()) { setMsg("Skriv hvilken bil det er."); return; }
    if (!file) { setMsg("Vælg et billede af bilen."); return; }
    setBusy(true); setMsg("");
    try {
      const album = await createAlbum({ title: form.make.trim(), owner: ownerName, userId });
      const patch = {
        make: form.make.trim() || null,
        model: form.model.trim() || null,
        model_year: form.model_year ? parseInt(form.model_year, 10) : null,
        power_hp: form.power_hp ? parseInt(form.power_hp, 10) : null,
        engine: form.engine.trim() || null,
        drivetrain: form.drivetrain.trim() || null,
        mods: form.mods.trim() || null,
        vin: form.vin.trim().toUpperCase() || null,
      };
      const { error } = await supabase.from("albums").update(patch).eq("id", album.id);
      if (error) throw error;
      await uploadPhoto({ file, isPublic: true, car: form.make.trim(), caption: "", userId, albumId: album.id });
      reset();
      setMsg("✓ Bilen er tilføjet! Billedet afventer admin-godkendelse — så ryger den med i rotationen på forsiden.");
      onCreated?.();
    } catch (err) {
      setMsg("Kunne ikke tilføje bilen: " + (err.message || err));
    } finally { setBusy(false); }
  };

  if (!open) {
    return <button className="btn-gold acf-open" style={{ width: "auto" }} onClick={() => setOpen(true)}>+ Tilføj bil</button>;
  }

  return (
    <form className="acf" onSubmit={submit}>
      <label className="file-drop">
        <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
        {preview ? <img className="file-preview" src={preview} alt="Forhåndsvisning" /> : <span>Vælg et billede af bilen…</span>}
      </label>

      <div className="ef-grid">
        <label className="post-field"><span>Bil (mærke & model)</span><input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="fx Porsche Cayenne Turbo" /></label>
        <label className="post-field"><span>Model/kode</span><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="fx 957" /></label>
        <label className="post-field"><span>Årgang</span><input type="number" value={form.model_year} onChange={(e) => setForm({ ...form, model_year: e.target.value })} placeholder="2008" /></label>
        <label className="post-field"><span>Effekt (hk)</span><input type="number" value={form.power_hp} onChange={(e) => setForm({ ...form, power_hp: e.target.value })} placeholder="500" /></label>
        <label className="post-field"><span>Motor</span><input value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} placeholder="4.8 V8 Twin-Turbo" /></label>
        <label className="post-field"><span>Drivlinje</span><input value={form.drivetrain} onChange={(e) => setForm({ ...form, drivetrain: e.target.value })} placeholder="AWD" /></label>
        <label className="post-field ef-full"><span>Modifikationer (valgfri)</span><textarea rows={2} value={form.mods} onChange={(e) => setForm({ ...form, mods: e.target.value })} placeholder="Downpipe, coilovers…" /></label>
        <label className="post-field ef-full"><span>VIN (valgfri — låser reservedelskataloget op)</span><input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })} placeholder="17 tegn" maxLength={17} spellCheck={false} style={{ fontFamily: "var(--font-mono), monospace", letterSpacing: "0.05em" }} /></label>
      </div>

      {msg && <div className={`auth-msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</div>}

      <div className="post-actions">
        <button className="btn-gold" type="submit" disabled={busy} style={{ width: "auto" }}>{busy ? "Tilføjer…" : "Tilføj bil"}</button>
        <button type="button" className="ph-btn" style={{ flex: "none", width: "auto" }} onClick={() => { reset(); setMsg(""); setOpen(false); }}>Luk</button>
      </div>
    </form>
  );
}
