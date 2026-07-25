"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { enrichPhotos, withUrls } from "../lib/photos";
import { cars } from "../data/cars";
import { asset } from "../lib/asset";
import CarProfile from "../components/CarProfile";
import PhotoLightbox from "../components/PhotoLightbox";
import ProfileWall from "../components/ProfileWall";

const memberSince = (t) => new Date(t).toLocaleDateString("da-DK", { month: "long", year: "numeric" });
const carsBySlug = Object.fromEntries(cars.map((c) => [c.slug, c]));
const avatarUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

function ProfileInner() {
  const params = useSearchParams();
  const username = params.get("u");
  const { session, user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [covers, setCovers] = useState({});
  const [photos, setPhotos] = useState([]);
  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [carOpen, setCarOpen] = useState(null);
  const [lb, setLb] = useState(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ bio: "", location: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarRef = useRef(null);

  const me = !!user && profile?.id === user.id;

  const openEditor = () => {
    setEdit({ bio: profile.bio || "", location: profile.location || "" });
    setAvatarFile(null);
    setEditing(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      let avatar_path = profile.avatar_path || null;
      if (avatarFile) {
        const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        avatar_path = `${user.id}/avatar/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(PUBLIC_BUCKET).upload(avatar_path, avatarFile, { cacheControl: "3600", contentType: avatarFile.type });
        if (up.error) throw up.error;
      }
      const { error } = await supabase.rpc("update_my_profile", { p_bio: edit.bio, p_location: edit.location, p_avatar_path: avatar_path });
      if (error) throw error;
      setProfile((p) => ({ ...p, bio: edit.bio.trim() || null, location: edit.location.trim() || null, avatar_path }));
      setEditing(false);
      refreshProfile?.();
    } catch (err) {
      alert("Kunne ikke gemme profil: " + (err.message || err));
    } finally { setSavingProfile(false); }
  };

  useEffect(() => {
    if (!username) { setNotFound(true); setReady(true); return; }
    let active = true;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!active) return;
      if (!prof) { setNotFound(true); setReady(true); return; }
      setProfile(prof);

      // Their cars: albums they created + curated cars whose owner matches.
      const { data: al } = await supabase
        .from("albums")
        .select("*")
        .or(`created_by.eq.${prof.id},and(is_curated.eq.true,owner_name.eq.${username})`);
      const albumList = al || [];
      setAlbums(albumList);

      // A cover per album: chosen cover photo, else first public photo, else the
      // curated repo cover.
      if (albumList.length) {
        const { data: albPhotos } = await supabase
          .from("photos")
          .select("id, bucket, path, album_id")
          .in("album_id", albumList.map((a) => a.id))
          .eq("visibility", "public").eq("approved", true);
        const resolved = await withUrls(albPhotos || []);
        const cov = {};
        albumList.forEach((a) => {
          const mine = resolved.filter((p) => p.album_id === a.id);
          const chosen = a.cover_photo_id ? mine.find((p) => p.id === a.cover_photo_id) : null;
          const car = carsBySlug[a.slug];
          cov[a.id] = chosen?.url || mine[0]?.url || (car ? asset(`/cars/${car.slug}/thumb/${car.cover}`) : null);
        });
        setCovers(cov);
      }

      // Recent photos by this member.
      const { data: ph } = await supabase
        .from("photos")
        .select("*, profiles!photos_user_id_fkey(username)")
        .eq("user_id", prof.id).eq("visibility", "public").eq("approved", true)
        .order("created_at", { ascending: false }).limit(12);
      setPhotos(await enrichPhotos(ph || [], user?.id));

      // Stats + badges from the leaderboard RPC.
      const { data: board } = await supabase.rpc("leaderboard");
      if (board) {
        const rows = board;
        const me = rows.find((r) => r.user_id === prof.id);
        setStats(me || { photos: 0, likes_received: 0, comments: 0 });
        const topBy = (k) => rows.reduce((m, r) => (r[k] > (m?.[k] ?? 0) ? r : m), null);
        const b = [];
        if (topBy("likes_received")?.user_id === prof.id && (me?.likes_received || 0) > 0) b.push({ e: "👑", t: "Mest liket" });
        if (topBy("photos")?.user_id === prof.id && (me?.photos || 0) > 0) b.push({ e: "📸", t: "Top fotograf" });
        if (topBy("comments")?.user_id === prof.id && (me?.comments || 0) > 0) b.push({ e: "💬", t: "Mest aktiv" });
        if (new Date(prof.created_at).getFullYear() <= 2022) b.push({ e: "🏁", t: "OG-medlem" });
        if (prof.is_admin) b.push({ e: "🛠", t: "Admin" });
        setBadges(b);
      }
      setReady(true);
    })();
    return () => { active = false; };
  }, [username, user?.id]);

  const initials = useMemo(() => (username || "?").slice(0, 2).toUpperCase(), [username]);

  if (!ready) return <div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div>;
  if (notFound) return (
    <div className="wrap" style={{ paddingTop: 120, paddingBottom: 80 }}>
      <h1 className="member-title">Medlem ikke fundet</h1>
      <p className="muted" style={{ marginTop: "0.6rem" }}><Link href="/medlemmer" className="c-link">Se alle medlemmer</Link></p>
    </div>
  );

  return (
    <div className="wrap profil-body">
      <div className="profil-head">
        <div className="profil-avatar">
          {profile.avatar_path ? <img src={avatarUrl(profile.avatar_path)} alt={profile.username} /> : initials}
        </div>
        <div className="profil-id">
          <span className="overline">Medlem</span>
          <h1 className="member-title">@{profile.username}</h1>
          <p className="profil-since">
            Medlem siden {memberSince(profile.created_at)}
            {profile.location ? ` · 📍 ${profile.location}` : ""}
          </p>
          {badges.length > 0 && (
            <div className="profil-badges">
              {badges.map((b) => <span key={b.t} className="lb-badge" title={b.t}>{b.e} {b.t}</span>)}
            </div>
          )}
          {me && !editing && <button className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.4rem 0.9rem", marginTop: "0.7rem" }} onClick={openEditor}>✎ Rediger profil</button>}
        </div>
      </div>

      {profile.bio && !editing && <p className="profil-bio">{profile.bio}</p>}

      {me && editing && (
        <div className="profil-editor">
          <div className="pe-avatar-row">
            <div className="profil-avatar sm">{avatarFile ? <img src={URL.createObjectURL(avatarFile)} alt="" /> : (profile.avatar_path ? <img src={avatarUrl(profile.avatar_path)} alt="" /> : initials)}</div>
            <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
            <button type="button" className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.45rem 0.9rem" }} onClick={() => avatarRef.current?.click()}>Skift profilbillede</button>
          </div>
          <label className="post-field"><span>Om mig</span>
            <textarea rows={3} value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} placeholder="Fortæl lidt om dig selv og dine biler…" maxLength={600} /></label>
          <label className="post-field"><span>Hvor hører du til</span>
            <input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} placeholder="fx Esbjerg" maxLength={80} /></label>
          <div className="post-actions">
            <button className="btn-gold" style={{ width: "auto" }} onClick={saveProfile} disabled={savingProfile}>{savingProfile ? "Gemmer…" : "Gem profil"}</button>
            <button className="ph-btn" style={{ flex: "none", width: "auto" }} onClick={() => setEditing(false)}>Annullér</button>
          </div>
        </div>
      )}

      {me && (
        <div className="profil-tools">
          <Link href="/chat" className="ptool">💬 Chat</Link>
          <Link href="/upload" className="ptool">📸 Upload</Link>
          <Link href="/leaderboard" className="ptool">🏆 Leaderboard</Link>
          {profile.is_admin && <Link href="/admin" className="ptool">🛠 Admin</Link>}
        </div>
      )}

      <div className="profil-stats">
        <div className="pstat"><b>{stats?.photos ?? 0}</b><span>Billeder</span></div>
        <div className="pstat"><b>{stats?.likes_received ?? 0}</b><span>Likes</span></div>
        <div className="pstat"><b>{stats?.comments ?? 0}</b><span>Kommentarer</span></div>
        <div className="pstat"><b>{albums.length}</b><span>Biler</span></div>
      </div>

      {albums.length > 0 && (
        <section className="profil-section">
          <span className="overline">Garage</span>
          <div className="profil-cars">
            {albums.map((a) => {
              const car = carsBySlug[a.slug];
              return (
                <button className="pcar" key={a.id} onClick={() => setCarOpen({ album: a, curated: car ? { spec: car.spec, tags: car.tags, blurb: car.blurb, owner: car.owner } : null })}>
                  {covers[a.id]
                    ? <img src={covers[a.id]} alt={a.title} loading="lazy" />
                    : <div className="pcar-noimg" />}
                  <div className="pcar-body">
                    <span className="pcar-title">{a.make || a.title}</span>
                    <span className="pcar-sub">{a.model || (car ? car.model : "") || "Se profil →"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <section className="profil-section">
          <span className="overline">Seneste billeder</span>
          <div className="profil-grid">
            {photos.map((p, i) => (
              <button className="pgrid-item" key={p.id} onClick={() => setLb({ index: i })} aria-label="Åbn billede">
                <img src={p.url} alt={p.car || "Bil"} loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      )}

      {albums.length === 0 && photos.length === 0 && (
        <p className="muted" style={{ marginTop: "2rem" }}>@{profile.username} har ikke delt biler eller billeder endnu.</p>
      )}

      <ProfileWall ownerId={profile.id} ownerName={profile.username} />

      {carOpen && <CarProfile album={carOpen.album} curated={carOpen.curated} onClose={() => setCarOpen(null)} />}
      {lb && <PhotoLightbox photos={photos} index={lb.index} onClose={() => setLb(null)} userId={user?.id} canLike={!!session} onNeedLogin={() => { window.location.href = "/login"; }} />}
    </div>
  );
}

export default function ProfilePage() {
  const { session, profile, signOut } = useAuth();
  return (
    <main className="member profil-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/medlemmer" className="mlink">Alle medlemmer</Link>
            {session ? <Link href="/medlem" className="mlink">Medlem</Link> : <Link href="/login" className="mlink">Log ind</Link>}
          </div>
        </div>
      </div>
      <Suspense fallback={<div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div>}>
        <ProfileInner />
      </Suspense>
    </main>
  );
}
