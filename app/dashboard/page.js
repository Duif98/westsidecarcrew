"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import { getCrewStats } from "../lib/stats";

// Members-only crew dashboard: a snapshot of the whole crew in numbers —
// members, cars, photos, meets, total horsepower + brand and drivetrain
// breakdowns. All derived from existing tables, no new migration.
export default function Dashboard() {
  const router = useRouter();
  const { session, profile, loading, isAdmin, signOut } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      const s = await getCrewStats();
      if (active) setStats(s);
    })();
    return () => { active = false; };
  }, [session]);

  if (loading || !session)
    return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  const tiles = stats
    ? [
        { k: "members", v: stats.members, label: "Medlemmer", ico: "👥" },
        { k: "cars", v: stats.cars, label: "Biler i crewet", ico: "🚗" },
        { k: "hp", v: stats.totalHp ? stats.totalHp.toLocaleString("da-DK") : "—", label: "Hestekræfter i alt", ico: "⚡", sub: stats.totalHp ? `fra ${stats.carsWithHp} bil${stats.carsWithHp === 1 ? "" : "er"} med specs` : "tilføj hk på din profil" },
        { k: "photos", v: stats.photos, label: "Billeder", ico: "📸" },
        { k: "meets", v: stats.meets, label: "Meets", ico: "📅" },
        { k: "likes", v: stats.likes, label: "Likes givet", ico: "❤️" },
        { k: "avg", v: stats.avgYear ?? "—", label: "Gns. årgang", ico: "🗓️", sub: stats.oldestYear && stats.newestYear ? `${stats.oldestYear}–${stats.newestYear}` : null },
        { k: "strong", v: stats.strongest ? `${stats.strongest.hp} hk` : "—", label: "Stærkeste bil", ico: "🏁", sub: stats.strongest?.title || null },
      ]
    : [];

  const maxBrand = stats?.brands.length ? stats.brands[0].n : 1;

  return (
    <main className="member dash-main">
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

      <div className="wrap dash-body">
        <span className="overline">Dashboard</span>
        <h1 className="member-title">Crewet i tal</h1>
        <p className="dash-intro">Et øjebliksbillede af hele West Side Car Crew — kun for medlemmer.</p>

        {!stats ? (
          <p className="dash-loading">Samler tallene…</p>
        ) : (
          <>
            <div className="dash-tiles">
              {tiles.map((t) => (
                <div className="dash-tile" key={t.k}>
                  <span className="dash-ico" aria-hidden="true">{t.ico}</span>
                  <b className="dash-val">{t.v}</b>
                  <span className="dash-label">{t.label}</span>
                  {t.sub && <span className="dash-sub">{t.sub}</span>}
                </div>
              ))}
            </div>

            {stats.brands.length > 0 && (
              <section className="dash-section">
                <span className="overline">Mærkefordeling</span>
                <div className="dash-bars">
                  {stats.brands.map((b) => (
                    <div className="dash-bar-row" key={b.name}>
                      <span className="dash-bar-name">{b.name}</span>
                      <span className="dash-bar-track">
                        <span className="dash-bar-fill" style={{ width: `${Math.max(8, (b.n / maxBrand) * 100)}%` }} />
                      </span>
                      <span className="dash-bar-n">{b.n}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {stats.drivetrains.length > 0 && (
              <section className="dash-section">
                <span className="overline">Drivlinjer</span>
                <div className="dash-chips">
                  {stats.drivetrains.map((d) => (
                    <span className="dash-chip" key={d.name}>{d.name} <b>{d.n}</b></span>
                  ))}
                </div>
              </section>
            )}

            <p className="dash-foot">
              Mangler din bil hk, årgang eller drivlinje? <Link href={`/profil?u=${encodeURIComponent(profile?.username || "")}`} className="dash-foot-link">Tilføj specs på din profil →</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
