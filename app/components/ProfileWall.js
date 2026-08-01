"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { shrinkImage } from "../lib/imageResize";

const when = (t) => new Date(t).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const imgUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

// A profile's wall (opslagstavle). Any logged-in member can post; the author,
// the wall owner, or an admin can delete. Fail-safe if the table isn't set up.
export default function ProfileWall({ ownerId, ownerName }) {
  const { session, user, profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const isAdmin = !!profile?.is_admin;

  const load = async () => {
    const { data, error } = await supabase
      .from("wall_posts")
      .select("*, profiles!wall_posts_author_id_fkey(username, avatar_path)")
      .eq("wall_owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (error) { setReady(true); return; }
    setPosts(data || []);
    setReady(true);
  };
  useEffect(() => { load(); }, [ownerId]);

  const submit = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !file) || busy) return;
    setBusy(true);
    try {
      let image_path = null;
      if (file) {
        const small = await shrinkImage(file);
        const ext = (small.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        image_path = `${user.id}/wall/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(PUBLIC_BUCKET).upload(image_path, small, { cacheControl: "3600", contentType: small.type });
        if (up.error) throw up.error;
      }
      const { error } = await supabase.from("wall_posts").insert({
        wall_owner_id: ownerId, author_id: user.id, body: text.trim() || null, image_path,
      });
      if (error) { if (image_path) await supabase.storage.from(PUBLIC_BUCKET).remove([image_path]); throw error; }
      setText(""); setFile(null); if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      alert("Kunne ikke slå op: " + (err.message || err));
    } finally { setBusy(false); }
  };

  const del = async (p) => {
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    if (p.image_path) await supabase.storage.from(PUBLIC_BUCKET).remove([p.image_path]);
    await supabase.from("wall_posts").delete().eq("id", p.id);
  };

  const isOwn = user?.id === ownerId;

  return (
    <section className="profil-section wall">
      <span className="overline">Opslagstavle</span>

      {session ? (
        <form className="wall-form" onSubmit={submit}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
            placeholder={isOwn ? "Skriv noget på din væg…" : `Skriv til @${ownerName}…`} maxLength={1000} />
          <div className="wall-form-actions">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button type="button" className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.45rem 0.8rem" }} onClick={() => fileRef.current?.click()}>
              {file ? "✓ Billede" : "+ Billede"}
            </button>
            <button className="btn-gold" type="submit" disabled={busy || (!text.trim() && !file)} style={{ width: "auto", marginLeft: "auto" }}>
              {busy ? "…" : "Slå op"}
            </button>
          </div>
        </form>
      ) : (
        <p className="muted" style={{ fontSize: "0.88rem" }}>Log ind for at skrive på væggen.</p>
      )}

      <div className="wall-list">
        {ready && posts.length === 0 && <p className="cmts-empty">Ingen opslag på væggen endnu.</p>}
        {posts.map((p) => {
          const canDel = user && (p.author_id === user.id || isOwn || isAdmin);
          const av = p.profiles?.avatar_path;
          return (
            <div className="wall-post" key={p.id}>
              <div className="wall-av">{av ? <img src={imgUrl(av)} alt="" /> : (p.profiles?.username || "?").slice(0, 2).toUpperCase()}</div>
              <div className="wall-post-body">
                <div className="wall-post-head">
                  <b>@{p.profiles?.username || "medlem"}</b>
                  <span className="wall-time">{when(p.created_at)}</span>
                  {canDel && <button className="cmt-del" onClick={() => del(p)} aria-label="Slet">✕</button>}
                </div>
                {p.body && <p className="wall-text">{p.body}</p>}
                {p.image_path && <img className="wall-img" src={imgUrl(p.image_path)} alt="" loading="lazy" />}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
