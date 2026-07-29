"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { getLivePositions, updateMyPosition, clearMyPosition, CONVOY_STALE_MS } from "../lib/convoy";

// Leaflet touches window → load the map only in the browser.
const ConvoyMap = dynamic(() => import("../components/ConvoyMap"), { ssr: false });

const INTERVAL = 10000; // ms between position updates — gentle on the battery
const MAX_MS = 3 * 3600 * 1000; // auto-stop after 3 hours as a safety net

// Members-only: a live convoy map for group cruises. Opt-in, foreground-only,
// stops on its own — so it never quietly drains a phone in someone's pocket.
export default function KonvojPage() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const [positions, setPositions] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [msg, setMsg] = useState("");
  const geoRef = useRef(null);
  const wakeRef = useRef(null);
  const startRef = useRef(0);

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  const load = async () => setPositions(await getLivePositions());

  // See the convoy whether or not you're sharing yet.
  useEffect(() => {
    if (!session) return;
    load();
    const ch = supabase
      .channel("convoy")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_positions" }, load)
      .subscribe();
    const tick = setInterval(load, 20000); // refresh + drop stale members
    return () => { supabase.removeChannel(ch); clearInterval(tick); };
  }, [session]);

  const acquireWake = async () => { try { wakeRef.current = await navigator.wakeLock?.request("screen"); } catch {} };
  const releaseWake = async () => { try { await wakeRef.current?.release(); } catch {} wakeRef.current = null; };

  // Wake Lock is auto-released when the tab is hidden — re-acquire on return.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible" && sharing && !wakeRef.current) acquireWake(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sharing]);

  const pushOnce = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { updateMyPosition({ userId: user.id, lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {}); },
      (err) => { if (err.code === 1) { setMsg("Adgang til placering blev afvist."); stop(); } },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 9000 }
    );
  };

  const start = () => {
    if (!navigator.geolocation) { setMsg("Din browser understøtter ikke placering."); return; }
    setMsg("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setSharing(true);
        startRef.current = Date.now();
        try { await updateMyPosition({ userId: user.id, lat: pos.coords.latitude, lng: pos.coords.longitude }); } catch {}
        load();
        geoRef.current = setInterval(() => {
          if (Date.now() - startRef.current > MAX_MS) { stop(); return; }
          pushOnce();
        }, INTERVAL);
        acquireWake();
      },
      (err) => { setMsg(err.code === 1 ? "Tillad placering i browseren for at være med i konvojen." : "Kunne ikke hente din placering — prøv igen."); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    );
  };

  const stop = () => {
    if (geoRef.current) { clearInterval(geoRef.current); geoRef.current = null; }
    releaseWake();
    if (user?.id) clearMyPosition(user.id);
    setSharing(false);
    load();
  };

  // Leaving the page stops sharing; otherwise the 2-min staleness cleans it up.
  useEffect(() => {
    const onUnload = () => { if (user?.id) clearMyPosition(user.id); };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (geoRef.current) clearInterval(geoRef.current);
      releaseWake();
      if (user?.id) clearMyPosition(user.id);
    };
  }, [user?.id]);

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  const live = positions.filter((p) => Date.now() - new Date(p.updated_at).getTime() < CONVOY_STALE_MS);

  return (
    <main className="member convoy-page">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/medlem" className="mlink">Medlem</Link>
            {isAdmin && <Link href="/admin" className="mlink gold">Admin</Link>}
            <button className="mlink" onClick={() => { signOut(); router.replace("/"); }}>Log ud</button>
          </div>
        </div>
      </div>

      <div className="wrap convoy-body">
        <span className="overline">Konvoj</span>
        <h1 className="member-title">Følg konvojen live 🛰</h1>
        <p className="convoy-intro">Del din placering under en fælles tur, så I kan holde sammen — også gennem lyskryds og frakørsler. Del kun mens siden er åben; positionen opdateres hvert 10. sekund og stopper af sig selv efter et par timer.</p>

        <div className={`convoy-toggle${sharing ? " on" : ""}`}>
          <div className="convoy-toggle-txt">
            <b>{sharing ? "Du deler din placering" : "Del din placering"}</b>
            <span>{sharing ? `${live.length} med i konvojen lige nu` : "Andre i crewet kan se hvor du er, mens turen kører"}</span>
          </div>
          <button className={sharing ? "convoy-btn stop" : "convoy-btn go"} onClick={sharing ? stop : start}>
            {sharing ? "Stop deling" : "Del position"}
          </button>
        </div>

        {msg && <div className="auth-msg err" style={{ marginTop: "0.8rem" }}>{msg}</div>}

        <div className="convoy-map-wrap">
          {live.length === 0 && !sharing && (
            <div className="convoy-map-empty">Ingen deler position lige nu. Tryk “Del position” for at starte konvojen.</div>
          )}
          <ConvoyMap positions={live} meId={user.id} />
        </div>

        {live.length > 0 && (
          <div className="convoy-people">
            {live.map((p) => (
              <span key={p.user_id} className={`convoy-chip${p.user_id === user.id ? " me" : ""}`}>
                <span className="convoy-dot" />@{p.profile?.username || "medlem"}{p.user_id === user.id ? " (dig)" : ""}
              </span>
            ))}
          </div>
        )}

        <p className="convoy-note">🔋 Skånsom mod batteriet: deler kun i forgrunden, hvert 10. sekund. Virker på både Android og iPhone. Baggrunds-sporing er ikke muligt i en browser — hold siden åben (skærmen holdes tændt automatisk).</p>
      </div>
    </main>
  );
}
