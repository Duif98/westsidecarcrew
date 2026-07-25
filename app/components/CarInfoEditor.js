"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Lets a member edit the specs of one of their own cars (albums) from their
// profile. Writes go through the "albums update own" RLS policy (created_by =
// auth.uid), so it only works for cars the member actually owns. VIN stays
// admin-only (managed in /admin), so it's intentionally not here.
export default function CarInfoEditor({ album, onSaved }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    make: album.make || "", model: album.model || "", model_year: album.model_year || "",
    power_hp: album.power_hp || "", drivetrain: album.drivetrain || "", engine: album.engine || "", mods: album.mods || "",
    vin: album.vin || "",
  });

  const save = async () => {
    setBusy(true);
    const patch = {
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      model_year: form.model_year ? parseInt(form.model_year, 10) : null,
      power_hp: form.power_hp ? parseInt(form.power_hp, 10) : null,
      drivetrain: form.drivetrain.trim() || null,
      engine: form.engine.trim() || null,
      mods: form.mods.trim() || null,
      vin: form.vin.trim().toUpperCase() || null,
    };
    const { error } = await supabase.from("albums").update(patch).eq("id", album.id);
    setBusy(false);
    if (error) { alert("Kunne ikke gemme: " + error.message); return; }
    onSaved?.(patch);
    setOpen(false);
  };

  return (
    <div className="cie">
      <button className="ph-btn cie-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "Luk" : `✎ ${album.make || album.title}`}
      </button>
      {open && (
        <div className="cie-form">
          <div className="ef-grid">
            <label className="post-field"><span>Mærke</span><input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="fx BMW M4" /></label>
            <label className="post-field"><span>Model</span><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="fx F82" /></label>
            <label className="post-field"><span>Årgang</span><input type="number" value={form.model_year} onChange={(e) => setForm({ ...form, model_year: e.target.value })} placeholder="2016" /></label>
            <label className="post-field"><span>Effekt (hk)</span><input type="number" value={form.power_hp} onChange={(e) => setForm({ ...form, power_hp: e.target.value })} placeholder="510" /></label>
            <label className="post-field"><span>Motor</span><input value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} placeholder="3.0 R6 Twin-Turbo" /></label>
            <label className="post-field"><span>Drivlinje</span><input value={form.drivetrain} onChange={(e) => setForm({ ...form, drivetrain: e.target.value })} placeholder="RWD" /></label>
            <label className="post-field ef-full"><span>Modifikationer</span><textarea rows={2} value={form.mods} onChange={(e) => setForm({ ...form, mods: e.target.value })} placeholder="Downpipe, coilovers, stage 2…" /></label>
            <label className="post-field ef-full"><span>VIN (valgfri — låser reservedelskataloget op)</span><input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })} placeholder="17 tegn" maxLength={17} spellCheck={false} style={{ fontFamily: "var(--font-mono), monospace", letterSpacing: "0.05em" }} /></label>
          </div>
          <button className="btn-gold cie-save" onClick={save} disabled={busy}>{busy ? "Gemmer…" : "Gem bil-info"}</button>
        </div>
      )}
    </div>
  );
}
