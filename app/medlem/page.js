"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { uploadPhoto, enrichPhotos, deletePhoto } from "../lib/photos";
import { getAlbums, createAlbum, setPhotoAlbum } from "../lib/albums";
import PhotoGrid from "../components/PhotoGrid";
import PhotoLightbox from "../components/PhotoLightbox";
import InviteButton from "../components/InviteButton";

export default function MedlemPage() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const [all, setAll] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [car, setCar] = useState("");
  const [caption, setCaption] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [albumSel, setAlbumSel] = useState(""); // "" | album id | "__new__"
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [lb, setLb] = useState(null); // { photos, index }

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  useEffect(() => { if (session) getAlbums().then(setAlbums); }, [session]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("photos")
      .select("*, profiles!photos_user_id_fkey(username)")
      .order("created_at", { ascending: false });
    setAll(await enrichPhotos(data || [], user?.id));
  }, [user?.id]);

  useEffect(() => { if (session) load(); }, [session, load]);

  const pickFile = (f) => {
    if (preview) URL.revokeObjectURL(preview);
    if (f && !f.type.startsWith("image/")) { setMsg("Vælg en billedfil (jpg, png, heic …)."); setFile(null); setPreview(null); return; }
    if (f && f.size > 50 * 1024 * 1024) { setMsg("Filen er for stor (max 50 MB). Er det mon en video?"); setFile(null); setPreview(null); return; }
    setMsg("");
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setMsg("Vælg et billede først."); return; }
    setBusy(true); setMsg("");
    try {
      let albumId = albumSel && albumSel !== "__new__" ? albumSel : null;
      if (albumSel === "__new__") {
        if (!newTitle.trim()) { setMsg("Giv det nye album et navn."); setBusy(false); return; }
        const created = await createAlbum({ title: newTitle, owner: newOwner, userId: user.id });
        albumId = created.id;
        setAlbums(await getAlbums());
      }
      await uploadPhoto({ file, isPublic, car, caption, userId: user.id, albumId });
      if (preview) URL.revokeObjectURL(preview);
      setFile(null); setPreview(null); setCar(""); setCaption(""); setIsPublic(false);
      setAlbumSel(""); setNewTitle(""); setNewOwner("");
      e.target.reset();
      setMsg(isPublic ? "✓ Uploadet i fuld kvalitet. Afventer godkendelse til forsiden." : "✓ Uploadet i fuld kvalitet (privat – kun for medlemmer).");
      await load();
    } catch (e2) { setMsg(e2.message); }
    finally { setBusy(false); }
  };

  const remove = async (p) => {
    if (!confirm("Slet dette billede?")) return;
    await deletePhoto(p); await load();
  };

  const changeAlbum = async (p, albumId) => { await setPhotoAlbum(p.id, albumId); await load(); };

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  const mine = all.filter((p) => p.user_id === user.id);
  const likeProps = { userId: user.id, canLike: true };

  return (
    <main className="member">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/chat" className="mlink">Chat</Link>
            {isAdmin && <Link href="/admin" className="mlink gold">Admin</Link>}
            <span className="mlink muted">@{profile?.username}</span>
            <button className="mlink" onClick={() => { signOut(); router.replace("/"); }}>Log ud</button>
          </div>
        </div>
      </div>

      <div className="wrap member-body">
        <div className="member-head">
          <div>
            <span className="overline">Min garage</span>
            <h1 className="member-title">Upload din bil</h1>
          </div>
          <InviteButton />
        </div>
        <p className="onboard">
          Velkommen, @{profile?.username} 👋 Vælg et billede, giv det en titel, og bestem om det er{" "}
          <b>offentligt</b> (kan vises på forsiden efter godkendelse) eller <b>privat</b> (kun for crewet).
          Billeder uploades altid i <b>fuld kvalitet</b>.
        </p>

        <form className="upload-card" onSubmit={submit}>
          <label className="file-drop">
            <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
            {preview ? (
              <img className="file-preview" src={preview} alt="Forhåndsvisning" />
            ) : (
              <span>Vælg eller tag et billede…</span>
            )}
          </label>
          <div className="upload-grid">
            <label>Bil <input value={car} onChange={(e) => setCar(e.target.value)} placeholder="fx BMW M4 F82" /></label>
            <label>Tekst (valgfri) <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="fx Alpinhvid, sommer 2025" /></label>
          </div>
          <label className="album-select">Bil-album <span className="muted-hint">— hvilken bils showcase skal billedet ind under?</span>
            <select value={albumSel} onChange={(e) => setAlbumSel(e.target.value)}>
              <option value="">Intet album (kun mit galleri)</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>{a.title}{a.owner_name ? ` · ${a.owner_name}` : ""}</option>
              ))}
              <option value="__new__">➕ Opret nyt bil-album…</option>
            </select>
          </label>
          {albumSel === "__new__" && (
            <div className="upload-grid">
              <label>Nyt album – navn <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="fx Audi RS6" /></label>
              <label>Ejer (valgfri) <input value={newOwner} onChange={(e) => setNewOwner(e.target.value)} placeholder="fx Kasper" /></label>
            </div>
          )}
          <label className="check-row">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span><b>Offentligt billede</b> – må vises i Garagen på forsiden (efter admin-godkendelse). Lades feltet stå tomt, er billedet <b>privat</b> og kun synligt for indloggede medlemmer.</span>
          </label>
          {msg && <div className={`auth-msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</div>}
          <button className="btn-gold" type="submit" disabled={busy}>{busy ? "Uploader…" : "Upload billede"}</button>
        </form>

        <div className="member-section">
          <span className="overline">Mine billeder</span>
          {mine.length ? (
            <PhotoGrid photos={mine} showStatus onDelete={remove} onOpen={(i) => setLb({ photos: mine, index: i })} albums={albums} onSetAlbum={changeAlbum} {...likeProps} />
          ) : (
            <p className="ph-empty">Du har ikke uploadet endnu — vælg et billede ovenfor 👆</p>
          )}
        </div>

        <div className="member-section">
          <span className="overline">Crewets billeder</span>
          <p className="member-note">Alle billeder — også private — er synlige her for indloggede medlemmer.</p>
          {all.length ? (
            <PhotoGrid photos={all} showStatus onOpen={(i) => setLb({ photos: all, index: i })} {...likeProps} />
          ) : (
            <p className="ph-empty">Ingen billeder endnu. Vær den første til at vise din bil! 🚗</p>
          )}
        </div>
      </div>

      {lb && (
        <PhotoLightbox photos={lb.photos} index={lb.index} onClose={() => setLb(null)} userId={user.id} canLike />
      )}
    </main>
  );
}
