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
import { useT } from "../lib/i18n";

// Deterministic shuffle so the order is stable within a visit but rotates
// between visits (which car sits in the wide/top tiles changes over time).
function shuffle(arr, seed) {
  const a = [...arr];
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Garage() {
  const { t } = useT();
  const [open, setOpen] = useState(null); // { items, title, subtitle }
  const [extra, setExtra] = useState({ bySlug: {}, covers: {}, newAlbums: [], albumBySlug: {} });
  const [seed, setSeed] = useState(null);

  // Set the shuffle seed after mount (keeps SSR/first render stable -> no hydration mismatch).
  useEffect(() => { setSeed(Math.floor(Math.random() * 1e9)); }, []);

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
      const albumBySlug = Object.fromEntries(albums.map((a) => [a.slug, a]));
      setExtra({ bySlug, covers, newAlbums, albumBySlug });
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
    // Put the chosen cover first, so it's the card thumbnail AND the first image on open.
    const coverFirst = (items, coverUrl) => {
      const ci = items.findIndex((it) => it.full === coverUrl);
      return ci > 0 ? [items[ci], ...items.slice(0, ci), ...items.slice(ci + 1)] : items;
    };

    const curated = cars.map((car) => {
      const coverUrl = extra.covers[car.slug] || asset(`/cars/${car.slug}/thumb/${car.cover}`);
      const items = coverFirst([...repoItems(car), ...uploadItems(car.slug)], coverUrl);
      return {
        key: car.slug, coverUrl,
        tag: car.spec, title: car.make, model: car.model, owner: car.owner,
        count: items.length, items,
        lbTitle: car.make, lbSubtitle: [car.owner, car.spec].filter(Boolean).join(" · "),
        album: extra.albumBySlug[car.slug],
        curated: { spec: car.spec, tags: car.tags, blurb: car.blurb, owner: car.owner },
      };
    });
    const news = extra.newAlbums.map((a) => {
      const raw = uploadItems(a.slug);
      const coverUrl = extra.covers[a.slug] || raw[0]?.full;
      const items = coverFirst(raw, coverUrl);
      const specTag = [a.model_year, a.power_hp ? `${a.power_hp} hk` : null].filter(Boolean).join(" · ");
      return {
        key: a.slug, coverUrl,
        tag: specTag || t("garage.crewAlbum"), title: a.make || a.title, model: a.model || "", owner: a.owner_name,
        count: items.length, items,
        lbTitle: a.make || a.title, lbSubtitle: [a.owner_name, a.model].filter(Boolean).join(" · "),
        album: extra.albumBySlug[a.slug], curated: null,
      };
    });
    // Member cars sit in the same pool as the curated ones and shuffle together,
    // so an added car can land anywhere in the rotation (incl. a feature tile).
    const pool = [...curated, ...news];
    return seed == null ? pool : shuffle(pool, seed);
  }, [extra, seed, t]);

  return (
    <section className="section garage" id="garagen">
      <div className="wrap">
        <Reveal className="section-head" as="div">
          <span className="overline">{t("garage.overline")}</span>
          <h2>{t("garage.title")}</h2>
          <p>{t("garage.sub")}</p>
        </Reveal>

        <div className="grid">
          {showcases.map((s, idx) => (
            <Reveal
              key={s.key}
              as="button"
              className={`card ${idx === 0 || idx === 5 ? "feature" : ""}`}
              delay={(idx % 3) * 90}
              onClick={() => setOpen({ items: s.items, title: s.lbTitle, subtitle: s.lbSubtitle, album: s.album, curated: s.curated })}
              aria-label={t("garage.openAria", { title: `${s.title}${s.owner ? " — " + s.owner : ""}` })}
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

      {open && <Lightbox items={open.items} title={open.title} subtitle={open.subtitle} album={open.album} curated={open.curated} onClose={() => setOpen(null)} />}
    </section>
  );
}
