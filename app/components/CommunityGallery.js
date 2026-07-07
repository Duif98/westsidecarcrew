"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { withUrls } from "../lib/photos";
import Reveal from "./Reveal";

export default function CommunityGallery() {
  const [photos, setPhotos] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("photos")
        .select("*, profiles(username)")
        .eq("visibility", "public")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (!active) return;
      setPhotos(await withUrls(data || []));
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  // Nothing to show yet — stay invisible so the page looks intentional.
  if (!ready || photos.length === 0) return null;

  return (
    <div className="community" id="crew-billeder">
      <Reveal className="section-head" as="div">
        <span className="overline">Fra crewet</span>
        <h2>Medlemmernes billeder</h2>
        <p>Uploadet af crewet selv. <Link href="/login" className="c-link">Log ind</Link> for at se alle billeder og dele dine egne.</p>
      </Reveal>
      <div className="community-grid">
        {photos.map((p) => (
          <figure className="c-card" key={p.id}>
            <img src={p.url} alt={p.car || "Bil"} loading="lazy" />
            <figcaption>
              <span className="c-car">{p.car || "Uden titel"}</span>
              <span className="c-owner">@{p.profiles?.username || "medlem"}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
