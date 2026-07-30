"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { enrichPhotos, deletePhoto, setApproved } from "../lib/photos";
import { getAlbums, setAlbumCover, setPhotoAlbum } from "../lib/albums";
import PhotoGrid from "../components/PhotoGrid";
import PhotoLightbox from "../components/PhotoLightbox";
import PostManager from "../components/PostManager";
import EventManager from "../components/EventManager";
import CarManager from "../components/CarManager";
import AdminAddCar from "../components/AdminAddCar";
import AdminOverview from "../components/AdminOverview";
import MemberManager from "../components/MemberManager";

export default function AdminPage() {
  const router = useRouter();
  const { session, user, loading, isAdmin, profile } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [lb, setLb] = useState(null);
  const [carMgrKey, setCarMgrKey] = useState(0);
  const [view, setView] = useState(null); // null = hub; else a tool key

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (profile && !isAdmin) router.replace("/medlem");
  }, [loading, session, isAdmin, profile, router]);

  const load = useCallback(async () => {
    const [{ data }, al] = await Promise.all([
      supabase.from("photos").select("*, profiles!photos_user_id_fkey(username)").eq("visibility", "public").order("created_at", { ascending: false }),
      getAlbums(),
    ]);
    setAlbums(al);
    setPhotos(await enrichPhotos(data || [], user?.id));
  }, [user?.id]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const albumById = useMemo(() => Object.fromEntries(albums.map((a) => [a.id, a])), [albums]);

  const approve = async (id, val) => { await setApproved(id, val); await load(); };
  const remove = async (p) => { if (confirm("Slet billedet helt?")) { await deletePhoto(p); await load(); } };
  const chooseCover = async (p) => { await setAlbumCover(p.album_id, p.id); await load(); };
  const changeAlbum = async (p, albumId) => { await setPhotoAlbum(p.id, albumId); await load(); };

  if (loading || !session || !isAdmin) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  const pending = photos.filter((p) => !p.approved);
  const live = photos.filter((p) => p.approved);

  const albumTag = (p) => p.album_id && albumById[p.album_id]
    ? <span className="album-label">{albumById[p.album_id].title}{albumById[p.album_id].owner_name ? ` · ${albumById[p.album_id].owner_name}` : ""}</span>
    : <span className="album-label none">Uden album</span>;

  return (
    <main className="member">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/chat" className="mlink">Chat</Link>
            <Link href="/medlem" className="mlink">Medlem</Link>
          </div>
        </div>
      </div>

      <div className="wrap member-body">
        {view === null ? (
          <>
            <span className="overline">Admin</span>
            <h1 className="member-title">Admin</h1>

            <AdminOverview pendingCount={pending.length} liveCount={live.length} onPending={() => setView("photos")} />

            <div className="hub-grid admin-hub">
              {ADMIN_CARDS.map((c) => (
                <button key={c.key} type="button" className={`hub-card ${c.cls}`} onClick={() => setView(c.key)}>
                  <span className="hub-ico" aria-hidden="true">{c.icon}</span>
                  {c.key === "photos" && pending.length > 0 && (
                    <span className="hub-badge">{pending.length} afventer</span>
                  )}
                  <span className="hub-card-title">{c.title}</span>
                  <span className="hub-card-sub">{c.sub}</span>
                  <span className="hub-go">Åbn →</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button type="button" className="admin-back" onClick={() => setView(null)}>← Admin-oversigt</button>

            {view === "posts" && <PostManager userId={user.id} />}

            {view === "events" && <EventManager userId={user.id} />}

            {view === "cars" && (
              <>
                <AdminAddCar onCreated={() => { load(); setCarMgrKey((k) => k + 1); }} />
                <CarManager key={carMgrKey} />
              </>
            )}

            {view === "members" && <MemberManager />}

            {view === "photos" && (
              <>
                <p className="member-note">Godkend billeder til forsiden, og vælg hvilket billede der skal være bilens cover (thumbnail).</p>

                <div className="member-section">
                  <span className="overline">Afventer godkendelse ({pending.length})</span>
                  {pending.length ? (
                    <PhotoGrid
                      photos={pending} showStatus onDelete={remove}
                      onOpen={(i) => setLb({ photos: pending, index: i })}
                      userId={user?.id} canLike albums={albums} onSetAlbum={changeAlbum}
                      renderActions={(p) => (<>{albumTag(p)}<button className="ph-btn ok" onClick={() => approve(p.id, true)}>Godkend</button></>)}
                    />
                  ) : <p className="ph-empty">Ingen billeder afventer godkendelse. 👍</p>}
                </div>

                <div className="member-section">
                  <span className="overline">På forsiden ({live.length})</span>
                  {live.length ? (
                    <PhotoGrid
                      photos={live} showStatus onDelete={remove}
                      onOpen={(i) => setLb({ photos: live, index: i })}
                      userId={user?.id} canLike albums={albums} onSetAlbum={changeAlbum}
                      renderActions={(p) => (
                        <>
                          {albumTag(p)}
                          {p.album_id && (
                            albumById[p.album_id]?.cover_photo_id === p.id
                              ? <span className="ph-btn cover-on">★ Cover</span>
                              : <button className="ph-btn" onClick={() => chooseCover(p)}>Sæt som cover</button>
                          )}
                          <button className="ph-btn" onClick={() => approve(p.id, false)}>Fjern</button>
                        </>
                      )}
                    />
                  ) : <p className="ph-empty">Ingen billeder på forsiden endnu.</p>}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {lb && <PhotoLightbox photos={lb.photos} index={lb.index} onClose={() => setLb(null)} userId={user?.id} canLike />}
    </main>
  );
}

const svg = (paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
);

const ADMIN_CARDS = [
  { key: "photos", cls: "garage", title: "Foto-godkendelse", sub: "Godkend billeder til forsiden og vælg covers", icon: svg(<><path d="M4 7h4l1.5-2h5L16 7h4v12H4z" /><circle cx="12" cy="13" r="3.5" /></>) },
  { key: "posts", cls: "board", title: "Opslag", sub: "Skriv og pin nyheder på opslagstavlen", icon: svg(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h6" /></>) },
  { key: "events", cls: "events", title: "Meets", sub: "Opret, rediger og slet crewets meets", icon: svg(<><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></>) },
  { key: "cars", cls: "parts", title: "Biler", sub: "Tilføj biler, tildel ejere, VIN og solgt-status", icon: svg(<><path d="M5 16l1.5-5h11L19 16" /><path d="M3 16h18v3H3z" /><circle cx="7.5" cy="19" r="1.2" /><circle cx="16.5" cy="19" r="1.2" /></>) },
  { key: "members", cls: "board", title: "Medlemmer", sub: "Giv/fjern admin, omdøb eller fjern medlemmer", icon: svg(<><circle cx="9" cy="8" r="3" /><path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" /><path d="M16 7a3 3 0 0 1 0 6M20 20c0-2.2-1.2-3.8-3-4.5" /></>) },
];
