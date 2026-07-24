"use client";

import { useEffect, useMemo, useState } from "react";
import Reveal from "./Reveal";
import Lightbox from "./Lightbox";
import CommunityGallery from "./CommunityGallery";
import { asset } from "../lib/asset";
import { cars } from "../data/cars";
import { supabase } from "../lib/supabaseClient";
import { getAlbums } from "../lib/albums";
import { withUrls } from "../lib/photos";

const FEATURE = new Set([0, 5]); // wider editorial tiles

export default function Garage() {
  const [open, setOpen] = useState(null); // { items, title, subtitle }
  const [extra, setExtra] = useState({ bySlug: {}, covers: {}, newAlbums: [] });

  useEffect(() => {
    let active = true;
    (async () => {
      const albums = await getAlbums();
      const { data } = await supabase
        .from("photos")
        .select("id, bucket, path, car, album_id")
        .eq("visibility", "public").eq("approved", true)
        .not("album_id", "is", null)
        .order("created_at", { ascending: true });
      const resolved = await withUrls(data || []);
      if (!active) return;
      const albumById = Object.fromEntries(albums.map((a) => [a.id, a]));
      const bySlug = {};
      resolved.forEach((p) => {
        const a = albumById[p.album_id];
        if (a) (bySlug[a.slug] ||= []).push(p);
      });
      const covers = {};
      albums.forEach((a) => {
        if (a.cover_photo_id) {
          const cp = resolved.find((p) => p.id === a.cover_photo_id);
          if (cp) covers[a.slug] = cp.url;
        }
      });
      const newAlbums = albums.filter((a) => !a.is_curated && bySlug[a.slug]?.length);
      setExtra({ bySlug, covers, newAlbums });
    })();
    return () => { active = false; };
  }, []);

  const showcases = useMemo(() => {
    const repoItems = (car) => car.photos.map((p) => ({
      full: asset(`/cars/${car.slug}/${p.src}`),
      thumb: asset(`/cars/${car.slug}/thumb/${p.src}`),
      alt: `${car.make} ${car.model}`,
    }));
    const uploadItems = (slug) => (extra.bySlug[slug] || []).map((p) => ({ full: p.url, thumb: p.url, alt: p.car || "" }));

    const curated = cars.map((car, idx) => {
      const items = [...repoItems(car), ...uploadItems(car.slug)];
      return {
        key: car.slug, feature: FEATURE.has(idx),
        coverUrl: extra.covers[car.slug] || asset(`/cars/${car.slug}/thumb/${car.cover}`),
        tag: car.spec, title: car.make, model: car.model, owner: car.owner,
        count: items.length, items,
        lbTitle: car.make, lbSubtitle: [car.owner, car.spec].filter(Boolean).join(" · "),
      };
    });
    const news = extra.newAlbums.map((a) => {
      const items = uploadItems(a.slug);
      return {
        key: a.slug, feature: false,
        coverUrl: extra.covers[a.slug] || items[0]?.full,
        tag: "Crew album", title: a.title, model: "", owner: a.owner_name,
        count: items.length, items,
        lbTitle: a.title, lbSubtitle: a.owner_name || "",
      };
    });
    return [...curated, ...news];
  }, [extra]);

  return (
    <section className="section garage" id="garagen">
      <div className="wrap">
        <Reveal className="section-head" as="div">
          <span className="overline">The Garage</span>
          <h2>One crew, every car.</h2>
          <p>From classic American muscle to a Japanese icon. Tap a car to open its gallery.</p>
        </Reveal>

        <div className="grid">
          {showcases.map((s, idx) => (
            <Reveal
              key={s.key}
              as="button"
              className={`card ${s.feature ? "feature" : ""}`}
              delay={(idx % 3) * 90}
              onClick={() => setOpen({ items: s.items, title: s.lbTitle, subtitle: s.lbSubtitle })}
              aria-label={`Open gallery: ${s.title}${s.owner ? " — " + s.owner : ""}`}
            >
              {s.coverUrl && <img src={s.coverUrl} alt={`${s.title}${s.owner ? " — " + s.owner : ""}`} loading="lazy" />}
              <span className="card-count">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M3 15l5-4 5 4M14 12l3-2 4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {s.count}
              </span>
              <div className="card-body">
                <span className="card-tag">{s.tag}</span>
                <span className="card-make">{s.title}</span>
                <span className="card-meta">
                  {s.owner && <span className="owner">{s.owner}</span>}
                  {s.owner && s.model && <span className="sep" />}
                  {s.model && <span>{s.model}</span>}
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        <CommunityGallery />
      </div>

      {open && <Lightbox items={open.items} title={open.title} subtitle={open.subtitle} onClose={() => setOpen(null)} />}
    </section>
  );
}
