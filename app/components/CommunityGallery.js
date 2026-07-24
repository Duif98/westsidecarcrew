"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { enrichPhotos } from "../lib/photos";
import { useAuth } from "../lib/AuthProvider";
import Reveal from "./Reveal";
import LikeButton from "./LikeButton";
import PhotoLightbox from "./PhotoLightbox";

export default function CommunityGallery() {
  const router = useRouter();
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [ready, setReady] = useState(false);
  const [lb, setLb] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("photos")
        .select("*, profiles!photos_user_id_fkey(username)")
        .eq("visibility", "public")
        .eq("approved", true)
        .is("album_id", null)
        .order("created_at", { ascending: false })
        .limit(24);
      if (!active) return;
      setPhotos(await enrichPhotos(data || [], user?.id));
      setReady(true);
    })();
    return () => { active = false; };
  }, [user?.id]);

  if (!ready || photos.length === 0) return null;

  const needLogin = () => router.push("/login");

  return (
    <div className="community" id="crew-billeder">
      <Reveal className="section-head" as="div">
        <span className="overline">From the crew</span>
        <h2>Members&rsquo; photos</h2>
        <p>Uploaded by the crew. <Link href="/login" className="c-link">Log in</Link> to see every photo and share your own.</p>
      </Reveal>
      <div className="community-grid">
        {photos.map((p, idx) => (
          <figure className="c-card" key={p.id}>
            <button className="c-imgbtn" onClick={() => setLb({ index: idx })} aria-label={`Åbn ${p.car || "billede"}`}>
              <img src={p.url} alt={p.car || "Bil"} loading="lazy" />
            </button>
            <figcaption>
              <div className="c-textcol">
                <span className="c-car">{p.car || "Uden titel"}</span>
                <span className="c-owner">@{p.profiles?.username || "medlem"}</span>
              </div>
              <LikeButton photo={p} userId={user?.id} canLike={!!user} onNeedLogin={needLogin} />
            </figcaption>
          </figure>
        ))}
      </div>

      {lb && (
        <PhotoLightbox
          photos={photos}
          index={lb.index}
          onClose={() => setLb(null)}
          userId={user?.id}
          canLike={!!user}
          onNeedLogin={needLogin}
        />
      )}
    </div>
  );
}
