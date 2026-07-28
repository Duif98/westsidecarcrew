"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { withUrls } from "../../lib/photos";
import { cars } from "../../data/cars";
import { asset } from "../../lib/asset";
import Lightbox from "../../components/Lightbox";

const carsBySlug = Object.fromEntries(cars.map((c) => [c.slug, c]));
const specLine = (a) => [a.model_year, a.engine, a.power_hp ? `${a.power_hp} hk` : null, a.drivetrain].filter(Boolean).join(" · ");

// Public showcase for one car: hero + gallery + specs, loaded client-side so it
// works for both curated (data/cars.js) and member-created (DB) cars. Anonymous
// visitors see repo photos + approved public album photos.
export default function CarShowcase({ slug }) {
  const car = carsBySlug[slug];
  const [album, setAlbum] = useState(undefined); // undefined = loading
  const [items, setItems] = useState([]);
  const [gallery, setGallery] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: al } = await supabase.from("albums").select("*").eq("slug", slug).maybeSingle();
      let up = [];
      if (al) {
        const { data: ph } = await supabase.from("photos")
          .select("id, bucket, path, album_id, car")
          .eq("album_id", al.id).eq("visibility", "public").eq("approved", true);
        up = await withUrls(ph || []);
      }
      const repoItems = car
        ? car.photos.map((p) => ({ full: asset(`/cars/${car.slug}/${p.src}`), thumb: asset(`/cars/${car.slug}/thumb/${p.src}`), alt: `${car.make} ${car.model}` }))
        : [];
      const upItems = up.map((p) => ({ full: p.url, thumb: p.url, alt: p.car || al?.title }));
      if (!active) return;
      setAlbum(al || null);
      setItems([...repoItems, ...upItems]);
    })();
    return () => { active = false; };
  }, [slug]);

  const title = album?.make || car?.make || album?.title || "Bil";
  const model = album?.model || car?.model || "";
  const owner = album?.owner_name || car?.owner || "";
  const specs = album ? specLine(album) : "";
  const cover = items[0]?.full;

  if (album === null && !car) {
    return (
      <main className="member">
        <div className="wrap" style={{ paddingTop: 120, paddingBottom: 80 }}>
          <h1 className="member-title">Bilen findes ikke</h1>
          <p className="muted" style={{ marginTop: "0.6rem" }}><Link href="/#garagen" className="c-link">Se garagen →</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main className="member car-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/#garagen" className="mlink">Garagen</Link>
          </div>
        </div>
      </div>

      <div className="wrap car-body">
        {cover && (
          <button className="car-hero" onClick={() => setGallery(0)} aria-label="Åbn galleri">
            <img src={cover} alt={`${title} ${model}`} />
          </button>
        )}
        <span className="overline">Bil{album?.sold ? " · Solgt" : ""}</span>
        <h1 className="member-title">{title}{model ? <span className="car-model"> {model}</span> : null}{album?.sold ? <span className="car-soldtag">Solgt</span> : null}</h1>
        {owner && <p className="car-owner">@{owner}</p>}
        {specs && <p className="car-specs">{specs}</p>}
        {car?.blurb && <p className="car-blurb">{car.blurb}</p>}
        {car?.tags?.length ? <div className="car-tags">{car.tags.map((tg) => <span className="car-tag" key={tg}>{tg}</span>)}</div> : null}

        {items.length > 0 ? (
          <div className="car-grid">
            {items.map((it, i) => (
              <button className="car-gitem" key={i} onClick={() => setGallery(i)} aria-label="Åbn billede">
                <img src={it.thumb || it.full} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: "1.5rem" }}>Ingen billeder endnu.</p>
        )}

        <p className="car-foot"><Link href="/#garagen" className="c-link">← Se hele crewets garage</Link></p>
      </div>

      {gallery !== null && items.length > 0 && (
        <Lightbox items={items} title={title}
          subtitle={[model, owner ? "@" + owner : null].filter(Boolean).join(" · ")}
          startIndex={gallery} onClose={() => setGallery(null)} />
      )}
    </main>
  );
}
