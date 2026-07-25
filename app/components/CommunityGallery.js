"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { enrichPhotos } from "../lib/photos";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";
import Reveal from "./Reveal";
import LikeButton from "./LikeButton";
import PhotoLightbox from "./PhotoLightbox";

export default function CommunityGallery() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useT();
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
        <span className="overline">{t("community.overline")}</span>
        <h2>{t("community.title")}</h2>
        <p>{t("community.subA")}<Link href="/login" className="c-link">{t("community.subLogin")}</Link>{t("community.subB")}</p>
      </Reveal>
      <div className="community-grid">
        {photos.map((p, idx) => (
          <figure className="c-card" key={p.id}>
            <button className="c-imgbtn" onClick={() => setLb({ index: idx })} aria-label={t("community.openAria", { name: p.car || t("community.car").toLowerCase() })}>
              <img src={p.url} alt={p.car || t("community.car")} loading="lazy" />
            </button>
            <figcaption>
              <div className="c-textcol">
                <span className="c-car">{p.car || t("community.untitled")}</span>
                <span className="c-owner">@{p.profiles?.username || t("community.member")}</span>
              </div>
              <div className="c-meta">
                {p.commentCount > 0 && (
                  <span className="c-cmt" title={t("community.commentsTitle", { n: p.commentCount })}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z" /></svg>
                    {p.commentCount}
                  </span>
                )}
                <LikeButton photo={p} userId={user?.id} canLike={!!user} onNeedLogin={needLogin} />
              </div>
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
