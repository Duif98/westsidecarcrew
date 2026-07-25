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

export default function AdminPage() {
  const router = useRouter();
  const { session, user, loading, isAdmin, profile } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [lb, setLb] = useState(null);

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
        <span className="overline">Admin</span>
        <h1 className="member-title">Admin</h1>

        <PostManager userId={user.id} />

        <EventManager userId={user.id} />

        <CarManager />

        <p className="member-note" style={{ marginTop: "1.5rem" }}>Godkend billeder til forsiden, og vælg hvilket billede der skal være bilens cover (thumbnail).</p>

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
      </div>

      {lb && <PhotoLightbox photos={lb.photos} index={lb.index} onClose={() => setLb(null)} userId={user?.id} canLike />}
    </main>
  );
}
