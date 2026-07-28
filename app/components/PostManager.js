"use client";

import { useEffect, useState } from "react";
import { getPosts, createPost, updatePost, deletePost, togglePin } from "../lib/posts";
import { notifyCrew } from "../lib/pwa";

const fmtDate = (t) => new Date(t).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
const EMPTY = { title: "", body: "", pinned: false, editingId: null, oldImagePath: null, removeImage: false };

export default function PostManager({ userId }) {
  const [posts, setPosts] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => getPosts().then(setPosts);
  useEffect(() => { load(); }, []);

  const reset = () => {
    if (preview && file) URL.revokeObjectURL(preview);
    setF(EMPTY); setFile(null); setPreview(null); setMsg("");
  };

  const pick = (fl) => {
    if (preview && file) URL.revokeObjectURL(preview);
    if (fl && !fl.type.startsWith("image/")) { setMsg("Vælg en billedfil."); return; }
    setFile(fl || null);
    setPreview(fl ? URL.createObjectURL(fl) : null);
    if (fl) setF((s) => ({ ...s, removeImage: false }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) { setMsg("Skriv en titel."); return; }
    setBusy(true); setMsg("");
    try {
      if (f.editingId) {
        await updatePost(f.editingId, { title: f.title, body: f.body, pinned: f.pinned, imageFile: file, removeImage: f.removeImage, oldImagePath: f.oldImagePath, userId });
      } else {
        await createPost({ title: f.title, body: f.body, imageFile: file, pinned: f.pinned, userId });
        // Notify the crew about the news post (best-effort; no-op until push is set up).
        notifyCrew({ title: "Nyt opslag 📣", body: f.title.trim(), url: "/", tag: "news" });
      }
      reset();
      setMsg("✓ Gemt.");
      await load();
    } catch (e2) { setMsg(e2.message); }
    finally { setBusy(false); }
  };

  const edit = (p) => {
    setF({ title: p.title, body: p.body || "", pinned: p.pinned, editingId: p.id, oldImagePath: p.image_path, removeImage: false });
    setFile(null);
    setPreview(p.imageUrl || null);
    setMsg("");
    document.getElementById("post-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const del = async (p) => { if (confirm("Slet dette opslag?")) { await deletePost(p); await load(); if (f.editingId === p.id) reset(); } };
  const pin = async (p) => { await togglePin(p.id, !p.pinned); await load(); };

  return (
    <div className="member-section">
      <span className="overline">Opslagstavle</span>
      <p className="member-note">Del nyheder på forsiden (fx kommende ture). Opslag vises offentligt, øverst under hero'en.</p>

      <form id="post-form" className="upload-card" onSubmit={submit}>
        <label className="file-drop">
          <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0] || null)} />
          {preview ? <img className="file-preview" src={preview} alt="Billede" /> : <span>Vælg et billede (valgfrit)…</span>}
        </label>
        {preview && (
          <button type="button" className="ph-btn" style={{ alignSelf: "flex-start" }} onClick={() => { if (file) URL.revokeObjectURL(preview); setFile(null); setPreview(null); setF((s) => ({ ...s, removeImage: true })); }}>Fjern billede</button>
        )}
        <label className="post-field">Titel <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="fx Alpetur 2026 🏔️" /></label>
        <label className="post-field">Tekst <textarea rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Skriv nyheden her…" /></label>
        <label className="check-row"><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /><span><b>Fastgør øverst</b> — vises altid først på tavlen.</span></label>
        {msg && <div className={`auth-msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</div>}
        <div className="post-actions">
          <button className="btn-gold" type="submit" disabled={busy}>{busy ? "Gemmer…" : f.editingId ? "Gem ændringer" : "Slå op"}</button>
          {f.editingId && <button type="button" className="ph-btn" onClick={reset}>Annullér</button>}
        </div>
      </form>

      {posts.length > 0 && (
        <div className="post-list">
          {posts.map((p) => (
            <div className="post-row" key={p.id}>
              {p.imageUrl ? <img className="post-thumb" src={p.imageUrl} alt="" /> : <div className="post-thumb none" />}
              <div className="post-info">
                <b>{p.pinned ? "📌 " : ""}{p.title}</b>
                <span>{fmtDate(p.created_at)}{p.author ? ` · @${p.author}` : ""}</span>
              </div>
              <div className="post-row-actions">
                <button className="ph-btn" onClick={() => edit(p)}>Redigér</button>
                <button className="ph-btn" onClick={() => pin(p)}>{p.pinned ? "Frigør" : "Fastgør"}</button>
                <button className="ph-btn del" onClick={() => del(p)}>Slet</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
