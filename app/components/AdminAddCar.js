"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { createAlbum, setAlbumCover } from "../lib/albums";
import { uploadPhoto, setApproved } from "../lib/photos";
import { useAuth } from "../lib/AuthProvider";

// Admin tool: add a whole car FOR another member. RLS-safe path:
//   1) create the album as the admin ("albums insert" needs created_by = me),
//   2) reassign created_by to the chosen member + write specs/VIN via
//      "albums update admin",
//   3) optionally upload a cover photo (stored in the admin's own folder,
//      user_id = admin — allowed by "photos insert own"), approve it right away
//      ("photos update … or admin") and set it as the album cover.
// Result: the car shows on the member's profile immediately, and — once it has
// an approved photo — joins the front-page garage rotation.
export default function AdminAddCar({ onCreated }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [ownerId, setOwnerId] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ make: "", model: "", model_year: "", power_hp: "", engine: "", drivetrain: "", mods: "", vin: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("id, username").order("username").then(({ data }) => setProfiles(data || []));
  }, []);

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
    setOwnerId("");
    setForm({ make: "", model: "", model_year: "", power_hp: "", engine: "", drivetrain: "", mods: "", vin: "" });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!ownerId) { setMsg("Vælg hvem bilen tilhører."); return; }
    if (!form.make.trim()) { setMsg("Skriv hvilken bil det er."); return; }
    setBusy(true); setMsg("");
    try {
      const ownerName = profiles.find((p) => p.id === ownerId)?.username || null;
      // 1) create as admin, 2) hand it to the member + write specs/VIN.
      const album = await createAlbum({ title: form.make.trim(), owner: ownerName, userId: user.id });
      const patch = {
        created_by: ownerId,
        owner_name: ownerName,
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

      // 3) optional cover photo — uploaded as admin, approved instantly, set as cover.
      if (file) {
        const photo = await uploadPhoto({ file, isPublic: true, car: form.make.trim(), caption: "", userId: user.id, albumId: album.id });
        await setApproved(photo.id, true);
        await setAlbumCover(album.id, photo.id);
      }

      reset();
      setMsg(file
        ? `✓ Bilen er tilføjet til @${ownerName} og er live på forsiden.`
        : `✓ Bilen er tilføjet til @${ownerName}. Tilføj et billede (via medlemmets upload eller her) for at få den i garagen på forsiden.`);
      onCreated?.();
    } catch (err) {
      setMsg("Kunne ikke tilføje bilen: " + (err.message || err));
    } finally { setBusy(false); }
  };

  return (
    <div className="member-section">
      <span className="overline">Tilføj bil for et medlem</span>
      <p className="member-note">Opret en bil manuelt og tildel den til et medlem (fx Nicolais Porsche Cayenne). Bilen dukker straks op på medlemmets profil; med et billede kommer den også i rotationen på forsiden.</p>

      {!open ? (
        <button className="btn-gold" style={{ width: "auto" }} onClick={() => setOpen(true)}>+ Tilføj bil</button>
      ) : (
        <form className="acf" onSubmit={submit}>
          <label className="post-field">
            <span>Ejer (medlem) *</span>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">— vælg medlem —</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>@{p.username}</option>)}
            </select>
          </label>

          <label className="file-drop">
            <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
            {preview ? <img className="file-preview" src={preview} alt="Forhåndsvisning" /> : <span>Vælg et billede af bilen (valgfri)…</span>}
          </label>

          <div className="ef-grid">
            <label className="post-field"><span>Bil (mærke & model) *</span><input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="fx Porsche Cayenne Turbo" /></label>
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
      )}
    </div>
  );
}
