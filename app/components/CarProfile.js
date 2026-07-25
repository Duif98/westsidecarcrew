"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

const fmtDate = (d) => new Date(d).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
const imgUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

// Car profile: specs + build thread (byggetråd) for one album. Shown over the
// gallery lightbox. Owner/admin can edit specs and add build entries.
export default function CarProfile({ album, curated, onClose }) {
  const { user, profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState([]);
  const [spec, setSpec] = useState(album);
  const [editSpecs, setEditSpecs] = useState(false);
  const [form, setForm] = useState({
    make: album.make || "", model: album.model || "", model_year: album.model_year || "",
    power_hp: album.power_hp || "", drivetrain: album.drivetrain || "", engine: album.engine || "", mods: album.mods || "",
  });
  const [entry, setEntry] = useState({ title: "", date: new Date().toISOString().slice(0, 10), body: "" });
  const [entryFile, setEntryFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [claimedBy, setClaimedBy] = useState(album.created_by);
  const fileRef = useRef(null);

  const isAdmin = !!profile?.is_admin;
  const canEdit = !!user && (claimedBy === user.id || isAdmin);
  const canClaim = !!user && !claimedBy && album.is_curated;

  const claim = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("claim_album", { p_album_id: album.id });
    setBusy(false);
    if (error) { alert(error.message); return; }
    setClaimedBy(user.id);
  };

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("build_entries")
        .select("*")
        .eq("album_id", album.id)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (active) setEntries(data || []);
    })();
    return () => { active = false; };
  }, [album.id]);

  const saveSpecs = async () => {
    setBusy(true);
    const patch = {
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      model_year: form.model_year ? parseInt(form.model_year, 10) : null,
      power_hp: form.power_hp ? parseInt(form.power_hp, 10) : null,
      drivetrain: form.drivetrain.trim() || null,
      engine: form.engine.trim() || null,
      mods: form.mods.trim() || null,
    };
    const { error } = await supabase.from("albums").update(patch).eq("id", album.id);
    setBusy(false);
    if (error) { alert("Kunne ikke gemme: " + error.message); return; }
    setSpec({ ...spec, ...patch });
    setEditSpecs(false);
  };

  const addEntry = async (e) => {
    e.preventDefault();
    if (!entry.title.trim() || busy) return;
    setBusy(true);
    try {
      let image_path = null;
      if (entryFile) {
        const ext = (entryFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        image_path = `${user.id}/build/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(PUBLIC_BUCKET).upload(image_path, entryFile, { cacheControl: "3600", contentType: entryFile.type });
        if (up.error) throw up.error;
      }
      const { data, error } = await supabase
        .from("build_entries")
        .insert({ album_id: album.id, title: entry.title.trim().slice(0, 120), body: entry.body.trim() || null, image_path, entry_date: entry.date, created_by: user.id })
        .select()
        .single();
      if (error) { if (image_path) await supabase.storage.from(PUBLIC_BUCKET).remove([image_path]); throw error; }
      setEntries((prev) => [data, ...prev]);
      setEntry({ title: "", date: new Date().toISOString().slice(0, 10), body: "" });
      setEntryFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      alert("Kunne ikke tilføje: " + (err.message || err));
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (id) => {
    const ent = entries.find((x) => x.id === id);
    setEntries((prev) => prev.filter((x) => x.id !== id));
    if (ent?.image_path) await supabase.storage.from(PUBLIC_BUCKET).remove([ent.image_path]);
    await supabase.from("build_entries").delete().eq("id", id);
  };

  if (!mounted) return null;

  const specRows = [
    ["År", spec.model_year],
    ["Motor", spec.engine],
    ["Effekt", spec.power_hp ? `${spec.power_hp} hk` : null],
    ["Drivlinje", spec.drivetrain],
  ].filter(([, v]) => v);

  const title = spec.make || album.title;
  const sub = [spec.model, album.owner_name || curated?.owner].filter(Boolean).join(" · ");
  const curatedTags = curated?.tags || [];

  return createPortal(
    <div className="cp" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cp-panel">
        <button className="cp-close" onClick={onClose} aria-label="Luk profil">✕</button>

        <header className="cp-head">
          <span className="overline">Bil-profil</span>
          <h2>{title}</h2>
          {sub && <p className="cp-sub">{sub}</p>}
          {canClaim && (
            <button className="btn-gold cp-claim" onClick={claim} disabled={busy}>
              {busy ? "…" : "🚗 Claim denne bil (den er min)"}
            </button>
          )}
          {claimedBy && claimedBy === user?.id && <p className="cp-claimed">✓ Din bil</p>}
        </header>

        {specRows.length > 0 ? (
          <div className="cp-specs">
            {specRows.map(([k, v]) => (
              <div className="cp-spec" key={k}><span>{k}</span><b>{v}</b></div>
            ))}
          </div>
        ) : (
          curated?.spec && <p className="cp-fallback">{curated.spec}</p>
        )}

        {(spec.mods || curatedTags.length > 0) && (
          <div className="cp-mods">
            <span className="cp-label">Modifikationer</span>
            {spec.mods
              ? <p className="cp-modtext">{spec.mods}</p>
              : <div className="cp-tags">{curatedTags.map((t) => <span key={t} className="cp-tag">{t}</span>)}</div>}
          </div>
        )}

        {curated?.blurb && !spec.mods && <p className="cp-blurb">{curated.blurb}</p>}

        {canEdit && (
          <div className="cp-editspecs">
            <button className="ph-btn" onClick={() => setEditSpecs((s) => !s)}>{editSpecs ? "Luk" : "✎ Rediger specs"}</button>
            {editSpecs && (
              <div className="cp-specform">
                <div className="ef-grid">
                  <label className="post-field"><span>Mærke</span><input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="fx BMW M4" /></label>
                  <label className="post-field"><span>Model</span><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="fx F82" /></label>
                  <label className="post-field"><span>Årgang</span><input type="number" value={form.model_year} onChange={(e) => setForm({ ...form, model_year: e.target.value })} placeholder="2016" /></label>
                  <label className="post-field"><span>Effekt (hk)</span><input type="number" value={form.power_hp} onChange={(e) => setForm({ ...form, power_hp: e.target.value })} placeholder="510" /></label>
                  <label className="post-field"><span>Motor</span><input value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} placeholder="3.0 R6 Twin-Turbo" /></label>
                  <label className="post-field"><span>Drivlinje</span><input value={form.drivetrain} onChange={(e) => setForm({ ...form, drivetrain: e.target.value })} placeholder="RWD" /></label>
                  <label className="post-field ef-full"><span>Modifikationer</span><textarea rows={2} value={form.mods} onChange={(e) => setForm({ ...form, mods: e.target.value })} placeholder="Downpipe, coilovers, stage 2…" /></label>
                </div>
                <button className="btn-gold" onClick={saveSpecs} disabled={busy}>{busy ? "Gemmer…" : "Gem specs"}</button>
              </div>
            )}
          </div>
        )}

        <div className="cp-thread">
          <span className="cp-label">Byggetråd</span>

          {canEdit && (
            <form className="cp-entryform" onSubmit={addEntry}>
              <div className="ef-grid">
                <label className="post-field"><span>Overskrift</span><input value={entry.title} onChange={(e) => setEntry({ ...entry, title: e.target.value })} placeholder="fx Nye fælge" maxLength={120} /></label>
                <label className="post-field"><span>Dato</span><input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} /></label>
                <label className="post-field ef-full"><span>Tekst</span><textarea rows={2} value={entry.body} onChange={(e) => setEntry({ ...entry, body: e.target.value })} placeholder="Hvad blev der lavet?" /></label>
              </div>
              <div className="cp-entryactions">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setEntryFile(e.target.files?.[0] || null)} />
                <button type="button" className="ph-btn" onClick={() => fileRef.current?.click()}>{entryFile ? "✓ Billede valgt" : "+ Billede"}</button>
                <button className="btn-gold" type="submit" disabled={busy || !entry.title.trim()}>{busy ? "…" : "Tilføj"}</button>
              </div>
            </form>
          )}

          {entries.length === 0 ? (
            <p className="cp-empty">Ingen byggetråd endnu{canEdit ? " — tilføj den første milepæl ✎" : "."}</p>
          ) : (
            <div className="cp-timeline">
              {entries.map((en) => (
                <div className="cp-item" key={en.id}>
                  <div className="cp-item-dot" />
                  <div className="cp-item-body">
                    <div className="cp-item-head">
                      <b>{en.title}</b>
                      <span className="cp-item-date">{fmtDate(en.entry_date)}</span>
                      {canEdit && <button className="cp-item-del" onClick={() => removeEntry(en.id)} aria-label="Slet">✕</button>}
                    </div>
                    {en.body && <p className="cp-item-text">{en.body}</p>}
                    {en.image_path && <img className="cp-item-img" src={imgUrl(en.image_path)} alt={en.title} loading="lazy" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
