"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";
import { catalogsFor } from "../lib/catalog";

const imgUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

// Car profile: specs + build thread (byggetråd) for one album. Shown over the
// gallery lightbox. Owner/admin can edit specs and add build entries.
export default function CarProfile({ album, curated, onClose }) {
  const { user, profile } = useAuth();
  const { t, locale } = useT();
  const fmtDate = (d) => new Date(d).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState([]);
  const [spec, setSpec] = useState(album);
  const [editSpecs, setEditSpecs] = useState(false);
  const [form, setForm] = useState({
    make: album.make || "", model: album.model || "", model_year: album.model_year || "",
    power_hp: album.power_hp || "", drivetrain: album.drivetrain || "", engine: album.engine || "", mods: album.mods || "",
    vin: album.vin || "",
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
      vin: form.vin.trim().toUpperCase() || null,
    };
    const { error } = await supabase.from("albums").update(patch).eq("id", album.id);
    setBusy(false);
    if (error) { alert(t("car.saveError") + error.message); return; }
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
      alert(t("car.addError") + (err.message || err));
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
    [t("car.year"), spec.model_year],
    [t("car.engine"), spec.engine],
    [t("car.power"), spec.power_hp ? `${spec.power_hp} ${t("car.hp")}` : null],
    [t("car.drivetrain"), spec.drivetrain],
  ].filter(([, v]) => v);

  const title = spec.make || album.title;
  const sub = [spec.model, album.owner_name || curated?.owner].filter(Boolean).join(" · ");
  const curatedTags = curated?.tags || [];

  return createPortal(
    <div className="cp" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cp-panel">
        <button className="cp-close" onClick={onClose} aria-label={t("car.close")}>✕</button>

        <header className="cp-head">
          <span className="overline">{t("car.overline")}</span>
          <h2>{title}</h2>
          {sub && <p className="cp-sub">{sub}</p>}
          {canClaim && (
            <button className="btn-gold cp-claim" onClick={claim} disabled={busy}>
              {busy ? "…" : t("car.claim")}
            </button>
          )}
          {claimedBy && claimedBy === user?.id && <p className="cp-claimed">{t("car.claimed")}</p>}
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
            <span className="cp-label">{t("car.mods")}</span>
            {spec.mods
              ? <p className="cp-modtext">{spec.mods}</p>
              : <div className="cp-tags">{curatedTags.map((t) => <span key={t} className="cp-tag">{t}</span>)}</div>}
          </div>
        )}

        {curated?.blurb && !spec.mods && <p className="cp-blurb">{curated.blurb}</p>}

        {user && (
          <div className="cp-catalog">
            <span className="cp-label">{t("car.catalog")}</span>
            {spec.vin ? (
              <>
                <div className="cp-catlinks">
                  {catalogsFor(spec.make || curated?.make, spec.vin).map((c) => (
                    <a key={c.id} className="cp-catbtn" href={c.url} target="_blank" rel="noopener noreferrer">{c.label} ↗</a>
                  ))}
                </div>
                <p className="cp-cathint">{t("car.catalogHint")}</p>
              </>
            ) : (
              <p className="cp-catempty">{canEdit ? t("car.catalogAddVin") : t("car.catalogNoVin")}</p>
            )}
          </div>
        )}

        {canEdit && (
          <div className="cp-editspecs">
            <button className="ph-btn" onClick={() => setEditSpecs((s) => !s)}>{editSpecs ? t("car.closeEdit") : t("car.editSpecs")}</button>
            {editSpecs && (
              <div className="cp-specform">
                <div className="ef-grid">
                  <label className="post-field"><span>{t("car.fMake")}</span><input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="fx BMW M4" /></label>
                  <label className="post-field"><span>{t("car.fModel")}</span><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="fx F82" /></label>
                  <label className="post-field"><span>{t("car.fYear")}</span><input type="number" value={form.model_year} onChange={(e) => setForm({ ...form, model_year: e.target.value })} placeholder="2016" /></label>
                  <label className="post-field"><span>{t("car.fPower")}</span><input type="number" value={form.power_hp} onChange={(e) => setForm({ ...form, power_hp: e.target.value })} placeholder="510" /></label>
                  <label className="post-field"><span>{t("car.fEngine")}</span><input value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} placeholder="3.0 R6 Twin-Turbo" /></label>
                  <label className="post-field"><span>{t("car.fDrivetrain")}</span><input value={form.drivetrain} onChange={(e) => setForm({ ...form, drivetrain: e.target.value })} placeholder="RWD" /></label>
                  <label className="post-field ef-full"><span>{t("car.fVin")}</span><input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })} placeholder="WBS3R9C50FK330000" maxLength={17} spellCheck={false} autoCapitalize="characters" style={{ fontFamily: "var(--font-mono), monospace", letterSpacing: "0.06em" }} /></label>
                  <label className="post-field ef-full"><span>{t("car.fMods")}</span><textarea rows={2} value={form.mods} onChange={(e) => setForm({ ...form, mods: e.target.value })} placeholder={t("car.fModsPh")} /></label>
                </div>
                <button className="btn-gold" onClick={saveSpecs} disabled={busy}>{busy ? t("car.saving") : t("car.saveSpecs")}</button>
              </div>
            )}
          </div>
        )}

        <div className="cp-thread">
          <span className="cp-label">{t("car.thread")}</span>

          {canEdit && (
            <form className="cp-entryform" onSubmit={addEntry}>
              <div className="ef-grid">
                <label className="post-field"><span>{t("car.fHeadline")}</span><input value={entry.title} onChange={(e) => setEntry({ ...entry, title: e.target.value })} placeholder={t("car.fHeadlinePh")} maxLength={120} /></label>
                <label className="post-field"><span>{t("car.fDate")}</span><input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} /></label>
                <label className="post-field ef-full"><span>{t("car.fText")}</span><textarea rows={2} value={entry.body} onChange={(e) => setEntry({ ...entry, body: e.target.value })} placeholder={t("car.fTextPh")} /></label>
              </div>
              <div className="cp-entryactions">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setEntryFile(e.target.files?.[0] || null)} />
                <button type="button" className="ph-btn" onClick={() => fileRef.current?.click()}>{entryFile ? t("car.imgChosen") : t("car.addImg")}</button>
                <button className="btn-gold" type="submit" disabled={busy || !entry.title.trim()}>{busy ? "…" : t("car.add")}</button>
              </div>
            </form>
          )}

          {entries.length === 0 ? (
            <p className="cp-empty">{t("car.emptyThread")}{canEdit ? t("car.emptyThreadEdit") : t("meet.period")}</p>
          ) : (
            <div className="cp-timeline">
              {entries.map((en) => (
                <div className="cp-item" key={en.id}>
                  <div className="cp-item-dot" />
                  <div className="cp-item-body">
                    <div className="cp-item-head">
                      <b>{en.title}</b>
                      <span className="cp-item-date">{fmtDate(en.entry_date)}</span>
                      {canEdit && <button className="cp-item-del" onClick={() => removeEntry(en.id)} aria-label={t("car.deleteEntry")}>✕</button>}
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
