"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import { getAlbums } from "../lib/albums";
import { catalogsFor } from "../lib/catalog";

// Members-only parts catalog. Lists every car we have a VIN for (driven by the
// albums table, not the garage) so a member can pick their car and jump straight
// to the external OEM catalogs. Cars without photos still show — members can
// upload pictures later, independently.
export default function PartsCatalog() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const [cars, setCars] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      const albums = await getAlbums();
      if (!active) return;
      const uname = (profile?.username || "").toLowerCase();
      const mine = (a) =>
        (!!user && a.created_by === user.id) ||
        (!!uname && (a.owner_name || "").toLowerCase() === uname);
      const list = albums
        .filter((a) => a.vin)
        .map((a) => ({ ...a, mine: mine(a) }))
        .sort((a, b) => (b.mine - a.mine) || (a.title || "").localeCompare(b.title || ""));
      setCars(list);
    })();
    return () => { active = false; };
  }, [session, user, profile]);

  if (loading || !session)
    return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  const links = selected ? catalogsFor(selected.make || selected.title, selected.vin) : [];

  return (
    <main className="member pk-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            {isAdmin && <Link href="/admin" className="mlink gold">Admin</Link>}
            <span className="mlink muted">@{profile?.username}</span>
            <button className="mlink" onClick={() => { signOut(); router.replace("/"); }}>Log ud</button>
          </div>
        </div>
      </div>

      <div className="wrap pk-body">
        <span className="overline">Reservedelskatalog</span>

        {!selected ? (
          <>
            <h1 className="pk-title">Vælg din bil</h1>
            <p className="pk-intro">
              Tryk på din bil, så åbner vi det rigtige originaldels-katalog med din VIN.
              Vi hoster ikke katalogerne — vi linker direkte ind i dem.
            </p>

            {cars == null ? (
              <p className="pk-empty">Indlæser biler…</p>
            ) : cars.length === 0 ? (
              <p className="pk-empty">Der er ingen biler med VIN endnu. Bed en admin om at tilføje dit stelnummer.</p>
            ) : (
              <div className="pk-grid">
                {cars.map((c) => (
                  <button key={c.id} className={`pk-card${c.mine ? " mine" : ""}`} onClick={() => setSelected(c)}>
                    {c.mine && <span className="pk-badge">Din bil</span>}
                    <span className="pk-car">{c.title}</span>
                    <span className="pk-meta">
                      {c.owner_name && <span className="pk-owner">{c.owner_name}</span>}
                      {c.owner_name && c.model && <span className="pk-sep" />}
                      {c.model && <span>{c.model}</span>}
                    </span>
                    <span className="pk-go">Åbn katalog →</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button className="pk-back" onClick={() => setSelected(null)}>← Alle biler</button>
            <h1 className="pk-title">{selected.title}</h1>
            <p className="pk-intro">
              {[selected.owner_name, selected.model].filter(Boolean).join(" · ")}
              {selected.mine ? " — din bil" : ""}
            </p>

            <div className="pk-detail">
              <div className="pk-vin">
                <span>VIN</span>
                <b>{selected.vin}</b>
              </div>

              <div className="pk-links">
                {links.map((l) => (
                  <a key={l.id} className="cp-catbtn" href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
                ))}
              </div>

              <p className="pk-hint">
                Vi sender dig direkte til det rigtige katalog. De fleste biler slås op på VIN;
                nogle — fx EU-modeller PartSouq ikke kan dekode — har vi linket direkte til den
                rette model. Har din bil flere knapper, viser de samme katalog fra hver sin kilde.
              </p>

              <p className="pk-hint">
                Mangler din bil billeder i garagen? <Link href="/upload" className="pk-uploadlink">Upload dem her →</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
