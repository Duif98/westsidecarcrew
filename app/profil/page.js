"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { enrichPhotos, withUrls } from "../lib/photos";
import { cars } from "../data/cars";
import { asset } from "../lib/asset";
import Lightbox from "../components/Lightbox";
import PhotoLightbox from "../components/PhotoLightbox";
import ProfileWall from "../components/ProfileWall";
import AvatarCropper from "../components/AvatarCropper";
import CarInfoEditor from "../components/CarInfoEditor";
import CarCareEditor from "../components/CarCareEditor";
import AddCarForm from "../components/AddCarForm";

const specLine = (a) => [a.model_year, a.engine, a.power_hp ? `${a.power_hp} hk` : null, a.drivetrain].filter(Boolean).join(" · ");

const memberSince = (t) => new Date(t).toLocaleDateString("da-DK", { month: "long", year: "numeric" });
const carsBySlug = Object.fromEntries(cars.map((c) => [c.slug, c]));
const avatarUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

// Preset accent colours a member can pick for their profile.
const ACCENTS = [
  { name: "Guld", hex: "#c9a877" }, { name: "Rød", hex: "#d05c5c" }, { name: "Blå", hex: "#5c8bd0" },
  { name: "Grøn", hex: "#4ec27a" }, { name: "Lilla", hex: "#b07cd0" }, { name: "Sølv", hex: "#b9c0c7" },
  { name: "Orange", hex: "#e0913f" }, { name: "Pink", hex: "#e07ab0" },
];

function ProfileInner() {
  const params = useSearchParams();
  const username = params.get("u");
  const welcome = params.get("welcome") === "1";
  const { session, user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [covers, setCovers] = useState({});
  const [photos, setPhotos] = useState([]);
  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [itemsByAlbum, setItemsByAlbum] = useState({});
  const [unclaimed, setUnclaimed] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [gallery, setGallery] = useState(null);
  const [lb, setLb] = useState(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ bio: "", location: "", accent: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [cropSource, setCropSource] = useState(null);
  const [coverCropSource, setCoverCropSource] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const avatarRef = useRef(null);
  const coverRef = useRef(null);
  const welcomedRef = useRef(false);

  const me = !!user && profile?.id === user.id;

  const openEditor = () => {
    setEdit({ bio: profile.bio || "", location: profile.location || "", accent: profile.accent_color || "" });
    setAvatarFile(null);
    setCoverFile(null);
    setEditing(true);
  };

  // Just signed up (…/profil?u=…&welcome=1): open the editor once and show the
  // welcome nudge so new members are invited to add a profile + cover photo.
  useEffect(() => {
    if (welcome && me && profile && !welcomedRef.current) {
      welcomedRef.current = true;
      openEditor();
      setShowWelcome(true);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcome, me, profile]);

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
      let cover_path = profile.cover_path || null;
      if (coverFile) {
        const ext = (coverFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        cover_path = `${user.id}/cover/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(PUBLIC_BUCKET).upload(cover_path, coverFile, { cacheControl: "3600", contentType: coverFile.type });
        if (up.error) throw up.error;
      }
      const accent = edit.accent || null;
      const { error } = await supabase.rpc("update_my_profile", { p_bio: edit.bio, p_location: edit.location, p_avatar_path: avatar_path, p_cover_path: cover_path, p_accent_color: accent });
      if (error) throw error;
      setProfile((p) => ({ ...p, bio: edit.bio.trim() || null, location: edit.location.trim() || null, avatar_path, cover_path, accent_color: accent }));
      setEditing(false);
      setShowWelcome(false);
      refreshProfile?.();
    } catch (err) {
      alert("Kunne ikke gemme profil: " + (err.message || err));
    } finally { setSavingProfile(false); }
  };

  const claimCar = async (albumId) => {
    const { error } = await supabase.rpc("claim_album", { p_album_id: albumId });
    if (error) { alert(error.message); return; }
    setReloadKey((k) => k + 1); // re-load so the car moves into the garage
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

      // For each car: a cover + the full showcase gallery (repo photos from the
      // front page + any approved uploaded album photos).
      if (albumList.length) {
        const { data: albPhotos } = await supabase
          .from("photos")
          .select("id, bucket, path, album_id, car")
          .in("album_id", albumList.map((a) => a.id))
          .eq("visibility", "public").eq("approved", true);
        const resolved = await withUrls(albPhotos || []);
        const cov = {}, items = {};
        albumList.forEach((a) => {
          const car = carsBySlug[a.slug];
          const repoItems = car
            ? car.photos.map((p) => ({ full: asset(`/cars/${car.slug}/${p.src}`), thumb: asset(`/cars/${car.slug}/thumb/${p.src}`), alt: `${car.make} ${car.model}` }))
            : [];
          const mine = resolved.filter((p) => p.album_id === a.id);
          const upItems = mine.map((p) => ({ full: p.url, thumb: p.url, alt: p.car || a.title }));
          const chosen = a.cover_photo_id ? mine.find((p) => p.id === a.cover_photo_id) : null;
          cov[a.id] = chosen?.url || mine[0]?.url || (car ? asset(`/cars/${car.slug}/thumb/${car.cover}`) : null);
          items[a.id] = [...repoItems, ...upItems];
        });
        setCovers(cov);
        setItemsByAlbum(items);
      }

      // Curated cars nobody has claimed yet (offered on your own profile).
      const { data: free } = await supabase
        .from("albums").select("*").eq("is_curated", true).is("created_by", null);
      setUnclaimed(free || []);

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
  }, [username, user?.id, reloadKey]);

  const initials = useMemo(() => (username || "?").slice(0, 2).toUpperCase(), [username]);

  if (!ready) return <div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div>;
  if (notFound) return (
    <div className="wrap" style={{ paddingTop: 120, paddingBottom: 80 }}>
      <h1 className="member-title">Medlem ikke fundet</h1>
      <p className="muted" style={{ marginTop: "0.6rem" }}><Link href="/medlemmer" className="c-link">Se alle medlemmer</Link></p>
    </div>
  );

  const accentStyle = profile.accent_color
    ? { "--gold": profile.accent_color, "--gold-bright": profile.accent_color, "--gold-deep": profile.accent_color }
    : undefined;
  const coverSrc = profile.cover_path ? avatarUrl(profile.cover_path) : null;
  const currentCars = albums.filter((a) => !a.sold);
  const soldCars = albums.filter((a) => a.sold);

  // One car card, reused by the garage and the "sold" sections.
  const carCard = (a, sold) => {
    const car = carsBySlug[a.slug];
    const items = itemsByAlbum[a.id] || [];
    const curated = car ? { spec: car.spec, tags: car.tags, blurb: car.blurb, owner: car.owner } : null;
    return (
      <button className={`pcar${sold ? " sold" : ""}`} key={a.id} disabled={items.length === 0}
        onClick={() => items.length && setGallery({ items, title: a.make || car?.make || a.title, subtitle: [a.model || car?.model, a.owner_name || car?.owner].filter(Boolean).join(" · "), album: a, curated })}>
        {sold && <span className="pcar-sold">Solgt</span>}
        {covers[a.id] ? <img src={covers[a.id]} alt={a.title} loading="lazy" /> : <div className="pcar-noimg" />}
        <div className="pcar-body">
          <span className="pcar-title">{a.make || a.title}</span>
          <span className="pcar-sub">{items.length ? `${items.length} billeder` : (a.model || (car ? car.model : "") || "Ingen billeder endnu")}</span>
          {specLine(a) && <span className="pcar-specs">{specLine(a)}</span>}
        </div>
      </button>
    );
  };

  return (
    <div className="wrap profil-body" style={accentStyle}>
      {coverSrc && <div className="profil-cover"><img src={coverSrc} alt="" /></div>}
      <div className={`profil-head${coverSrc ? " has-cover" : ""}`}>
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
          {showWelcome && (
            <div className="pe-welcome">
              <b>Velkommen i crewet! 🎉</b>
              <span>Upload et <b>profilbillede</b> og et <b>coverbillede</b>, så de andre kan sætte ansigt på dig. Du kan altid ændre det senere.</span>
            </div>
          )}
          <div className="pe-avatar-row">
            <div className="profil-avatar sm">{avatarFile ? <img src={URL.createObjectURL(avatarFile)} alt="" /> : (profile.avatar_path ? <img src={avatarUrl(profile.avatar_path)} alt="" /> : initials)}</div>
            <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => { const fl = e.target.files?.[0]; if (fl) setCropSource(fl); e.target.value = ""; }} />
            <button type="button" className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.45rem 0.9rem" }} onClick={() => avatarRef.current?.click()}>Skift profilbillede</button>
          </div>
          <div className="pe-cover-row">
            {coverFile
              ? <img className="pe-cover-preview" src={URL.createObjectURL(coverFile)} alt="" />
              : (profile.cover_path ? <img className="pe-cover-preview" src={avatarUrl(profile.cover_path)} alt="" /> : <div className="pe-cover-preview empty">Intet cover</div>)}
            <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { const fl = e.target.files?.[0]; if (fl) setCoverCropSource(fl); e.target.value = ""; }} />
            <button type="button" className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.45rem 0.9rem" }} onClick={() => coverRef.current?.click()}>Skift cover-billede</button>
          </div>
          <div className="pe-accent">
            <span className="pe-accent-label">Accent-farve</span>
            <div className="pe-swatches">
              {ACCENTS.map((a) => (
                <button key={a.hex} type="button" className={`pe-swatch${edit.accent === a.hex ? " on" : ""}`} style={{ background: a.hex }} title={a.name} aria-label={a.name} onClick={() => setEdit({ ...edit, accent: a.hex })} />
              ))}
              <button type="button" className={`pe-swatch reset${!edit.accent ? " on" : ""}`} title="Standard (guld)" aria-label="Standard" onClick={() => setEdit({ ...edit, accent: "" })}>↺</button>
            </div>
          </div>
          <label className="post-field"><span>Om mig</span>
            <textarea rows={3} value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} placeholder="Fortæl lidt om dig selv og dine biler…" maxLength={600} /></label>
          <label className="post-field"><span>Hvor hører du til</span>
            <input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} placeholder="fx Esbjerg" maxLength={80} /></label>
          <div className="post-actions">
            <button className="btn-gold" style={{ width: "auto" }} onClick={saveProfile} disabled={savingProfile}>{savingProfile ? "Gemmer…" : "Gem profil"}</button>
            <button className="ph-btn" style={{ flex: "none", width: "auto" }} onClick={() => { setEditing(false); setShowWelcome(false); }}>Annullér</button>
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
        <div className="pstat"><b>{currentCars.length}</b><span>Biler</span></div>
      </div>

      {currentCars.length > 0 && (
        <section className="profil-section">
          <span className="overline">Garage</span>
          <div className="profil-cars">
            {currentCars.map((a) => carCard(a, false))}
          </div>
        </section>
      )}

      {soldCars.length > 0 && (
        <section className="profil-section">
          <span className="overline">Solgte biler</span>
          <p className="muted" style={{ fontSize: "0.88rem", margin: "0 0 0.9rem" }}>Biler @{profile.username} har ejet, men solgt.</p>
          <div className="profil-cars">
            {soldCars.map((a) => carCard(a, true))}
          </div>
        </section>
      )}

      {me && (
        <section className="profil-section">
          <span className="overline">Tilføj bil</span>
          <p className="muted" style={{ fontSize: "0.88rem", margin: "0 0 0.9rem" }}>Har du en bil mere? Tilføj den med et billede og specs — og evt. dit VIN. Når billedet er godkendt, ryger bilen med i rotationen på forsiden på lige fod med de andre.</p>
          <AddCarForm userId={user.id} ownerName={profile.username} onCreated={() => setReloadKey((k) => k + 1)} />
        </section>
      )}

      {me && albums.some((a) => a.created_by === user.id) && (
        <section className="profil-section">
          <span className="overline">Bil-info</span>
          <p className="muted" style={{ fontSize: "0.88rem", margin: "0 0 0.9rem" }}>Skriv specs på dine biler — mærke, model, motor, effekt og modifikationer. Vises i din garage.</p>
          <div className="cie-list">
            {albums.filter((a) => a.created_by === user.id).map((a) => (
              <CarInfoEditor key={a.id} album={a} onSaved={(patch) => setAlbums((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...patch } : x)))} />
            ))}
          </div>
        </section>
      )}

      {me && albums.some((a) => a.created_by === user.id) && (
        <section className="profil-section">
          <span className="overline">Bilpleje & væsker</span>
          <p className="muted" style={{ fontSize: "0.88rem", margin: "0 0 0.9rem" }}>Notér hvad du bruger — motorolie, voks, dæk, bremser — og skriv en kort ejer-anmeldelse. Vises på bilens side.</p>
          <div className="cie-list">
            {albums.filter((a) => a.created_by === user.id).map((a) => (
              <CarCareEditor key={a.id} album={a} userId={user.id} onReviewSaved={(rev) => setAlbums((prev) => prev.map((x) => (x.id === a.id ? { ...x, owner_review: rev } : x)))} />
            ))}
          </div>
        </section>
      )}

      {me && unclaimed.length > 0 && (
        <section className="profil-section">
          <span className="overline">Claim en bil</span>
          <p className="muted" style={{ fontSize: "0.88rem", margin: "0 0 0.9rem" }}>Er en af disse biler din? Claim den, så flytter den (og dens billeder) ind i din garage.</p>
          <div className="claim-list">
            {unclaimed.map((a) => (
              <div className="claim-row" key={a.id}>
                <span className="claim-name">{a.make || a.title}{a.owner_name ? <span className="claim-owner"> · {a.owner_name}</span> : ""}</span>
                <button className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.4rem 0.9rem" }} onClick={() => claimCar(a.id)}>🚗 Claim</button>
              </div>
            ))}
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

      {cropSource && (
        <AvatarCropper
          file={cropSource}
          onCancel={() => setCropSource(null)}
          onDone={(f) => { setAvatarFile(f); setCropSource(null); }}
        />
      )}

      {coverCropSource && (
        <AvatarCropper
          file={coverCropSource}
          aspect={3} cropShape="rect" outW={1500} outH={500}
          title="Cover-billede" filename="cover.jpg"
          onCancel={() => setCoverCropSource(null)}
          onDone={(f) => { setCoverFile(f); setCoverCropSource(null); }}
        />
      )}

      <ProfileWall ownerId={profile.id} ownerName={profile.username} />

      {gallery && <Lightbox items={gallery.items} title={gallery.title} subtitle={gallery.subtitle} album={gallery.album} curated={gallery.curated} onClose={() => setGallery(null)} />}
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
