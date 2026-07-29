"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { createAlbum } from "../lib/albums";
import { uploadPhoto } from "../lib/photos";
import { lookupPlate } from "../lib/plate";

// Add a whole new car from your own profile: creates an album (created_by = you),
// writes its specs + optional VIN, and uploads a public cover photo. Once an
// admin approves the photo, the car joins the front-page garage rotation like
// any other; if a VIN is given it shows up in the parts catalog automatically.
export default function AddCarForm({ userId, ownerName, onCreated }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ make: "", model: "", model_year: "", power_hp: "", engine: "", drivetrain: "", mods: "", vin: "", sold: false });
  const [plate, setPlate] = useState("");
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Look the plate up in the Danish motor register and prefill the specs. Fails
  // soft: any problem just shows a note and leaves the manual fields for the user.
  const lookup = async () => {
    const p = plate.trim();
    if (!p) return;
    setLooking(true); setMsg("");
    const res = await lookupPlate(p);
    setLooking(false);
    if (!res.ok) {
      setMsg({
        notfound: "Ingen bil fundet på den nummerplade — skriv felterne selv.",
        unauthorized: "Log ind for at slå nummerplade op.",
        unconfigured: "Nummerplade-opslag er ikke sat op endnu — skriv felterne selv.",
        quota: "Dagens gratis opslag er brugt op — prøv igen i morgen, eller skriv felterne selv.",
        badtoken: "Nummerplade-opslag mangler en gyldig nøgle — skriv felterne selv.",
      }[res.error] || "Kunne ikke slå nummerpladen op — skriv felterne selv.");
      return;
    }
    const c = res.car || {};
    setForm((f) => ({
      ...f,
      make: [c.make, c.model].filter(Boolean).join(" ") || f.make,
      model: c.variant || f.model,
      model_year: c.model_year ? String(c.model_year) : f.model_year,
      power_hp: c.power_hp ? String(c.power_hp) : f.power_hp,
      engine: c.engine || f.engine,
      vin: c.vin || f.vin,
    }));
    setMsg("✓ Bil-data hentet fra nummerpladen — tjek felterne og ret hvis nødvendigt.");
  };

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
    setPlate("");
    setForm({ make: "", model: "", model_year: "", power_hp: "", engine: "", drivetrain: "", mods: "", vin: "", sold: false });
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
        sold: !!form.sold,
      };
      const { error } = await supabase.from("albums").update(patch).eq("id", album.id);
      if (error) throw error;
      await uploadPhoto({ file, isPublic: true, car: form.make.trim(), caption: "", userId, albumId: album.id });
      const wasSold = form.sold;
      reset();
      setMsg(wasSold
        ? "✓ Solgt bil tilføjet! Den vises under “Solgte biler” på din profil (billedet afventer godkendelse)."
        : "✓ Bilen er tilføjet! Billedet afventer admin-godkendelse — så ryger den med i rotationen på forsiden.");
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

      <div className="plate-row">
        <div className="plate-input">
          <span className="plate-flag">DK</span>
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(); } }}
            placeholder="AB12345" maxLength={8} spellCheck={false} aria-label="Nummerplade"
          />
        </div>
        <button type="button" className="ph-btn" style={{ flex: "none", width: "auto" }} onClick={lookup} disabled={looking || !plate.trim()}>
          {looking ? "Henter…" : "Hent bil-data"}
        </button>
      </div>
      <p className="plate-hint">Skriv nummerpladen, så udfylder vi mærke, model, årgang, effekt og stelnummer automatisk. Du kan altid rette bagefter.</p>

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

      <label className="check-row">
        <input type="checkbox" checked={form.sold} onChange={(e) => setForm({ ...form, sold: e.target.checked })} />
        <span><b>Bilen er solgt</b> — vises under "Solgte biler" på din profil (ikke på forsiden).</span>
      </label>

      {msg && <div className={`auth-msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</div>}

      <div className="post-actions">
        <button className="btn-gold" type="submit" disabled={busy} style={{ width: "auto" }}>{busy ? "Tilføjer…" : "Tilføj bil"}</button>
        <button type="button" className="ph-btn" style={{ flex: "none", width: "auto" }} onClick={() => { reset(); setMsg(""); setOpen(false); }}>Luk</button>
      </div>
    </form>
  );
}
