"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { withUrls, deletePhoto, setApproved } from "../lib/photos";
import PhotoGrid from "../components/PhotoGrid";

export default function AdminPage() {
  const router = useRouter();
  const { session, loading, isAdmin, profile } = useAuth();
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (profile && !isAdmin) router.replace("/medlem");
  }, [loading, session, isAdmin, profile, router]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("photos")
      .select("*, profiles(username)")
      .eq("visibility", "public")
      .order("created_at", { ascending: false });
    setPhotos(await withUrls(data || []));
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const approve = async (id, val) => { await setApproved(id, val); await load(); };
  const remove = async (p) => { if (confirm("Slet billedet helt?")) { await deletePhoto(p); await load(); } };

  if (loading || !session || !isAdmin) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  const pending = photos.filter((p) => !p.approved);
  const live = photos.filter((p) => p.approved);

  return (
    <main className="member">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/medlem" className="mlink">Medlem</Link>
          </div>
        </div>
      </div>

      <div className="wrap member-body">
        <span className="overline">Admin</span>
        <h1 className="member-title">Godkend forside-billeder</h1>

        <div className="member-section">
          <span className="overline">Afventer godkendelse ({pending.length})</span>
          <PhotoGrid
            photos={pending}
            showStatus
            onDelete={remove}
            renderActions={(p) => <button className="ph-btn ok" onClick={() => approve(p.id, true)}>Godkend</button>}
          />
        </div>

        <div className="member-section">
          <span className="overline">På forsiden ({live.length})</span>
          <PhotoGrid
            photos={live}
            showStatus
            onDelete={remove}
            renderActions={(p) => <button className="ph-btn" onClick={() => approve(p.id, false)}>Fjern fra forside</button>}
          />
        </div>
      </div>
    </main>
  );
}
