"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { getActiveWashes, startWash, endWash, joinWash, leaveWash } from "../lib/wash";
import { notifyCrew } from "../lib/pwa";

const avatarUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

// Default the "om et par timer" time to ~2 hours from now, rounded to the half hour.
const defaultSoon = () => {
  const d = new Date(Date.now() + 2 * 3600 * 1000);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (d.getMinutes() === 0) d.setHours(d.getHours() + (new Date().getMinutes() < 30 ? 0 : 1));
  // datetime-local wants local time without seconds/zone
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const timeStr = (ts) => new Date(ts).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
const relStr = (ts) => {
  const mins = Math.round((new Date(ts).getTime() - Date.now()) / 60000);
  if (mins <= 5) return "snart";
  if (mins < 60) return `om ${mins} min`;
  const h = Math.round(mins / 60);
  return `om ca. ${h} ${h === 1 ? "time" : "timer"}`;
};

// Members-only: a spontaneous "I'm washing my car" board.
export default function VaskPage() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const [washes, setWashes] = useState(null);
  const [status, setStatus] = useState("now"); // 'now' | 'soon'
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [soonAt, setSoonAt] = useState(defaultSoon());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const tickRef = useRef(null);

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  const load = async () => setWashes(await getActiveWashes());

  useEffect(() => {
    if (!session) return;
    load();
    // Live: any change to sessions or joins reloads the board.
    const ch = supabase
      .channel("wash-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "wash_sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "wash_joins" }, load)
      .subscribe();
    // Reload once a minute so expired sessions drop off on their own.
    tickRef.current = setInterval(load, 60000);
    return () => { supabase.removeChannel(ch); clearInterval(tickRef.current); };
  }, [session]);

  const start = async () => {
    setBusy(true); setMsg("");
    try {
      const w = await startWash({ userId: user.id, status, location, note, startsAt: status === "soon" ? soonAt : null });
      const where = location.trim() ? ` ved ${location.trim()}` : "";
      // Let the crew know so someone can come wash along.
      notifyCrew({
        title: status === "now" ? "🧽 Nogen vasker bil nu" : "🧽 Bilvask på vej",
        body: status === "now"
          ? `@${profile?.username} vasker bil nu${where} — kom og vask med!`
          : `@${profile?.username} vasker bil ${relStr(w.starts_at)}${where}`,
        url: "/vask", tag: "wash",
      });
      setLocation(""); setNote("");
      setMsg(status === "now" ? "✓ Sat i gang — crewet er sagt til!" : "✓ Meldt til — crewet er sagt til!");
    } catch (e) {
      setMsg("Kunne ikke sætte i gang: " + (e.message || e));
    } finally { setBusy(false); }
  };

  const remove = async (id) => { try { await endWash(id); load(); } catch (e) { setMsg(e.message || String(e)); } };
  const toggleJoin = async (w, joined) => {
    try { joined ? await leaveWash(w.id, user.id) : await joinWash(w.id, user.id); load(); }
    catch (e) { setMsg(e.message || String(e)); }
  };

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  return (
    <main className="member wash-main">
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

      <div className="wrap wash-body">
        <span className="overline">Vask bil</span>
        <h1 className="member-title">Vasker du bil? 🧽</h1>
        <p className="wash-intro">Sig til når du går i gang — så kan de andre komme og vaske med. Meldingen forsvinder af sig selv efter et par timer.</p>

        <div className="wash-start">
          <div className="wash-seg">
            <button type="button" className={status === "now" ? "on" : ""} onClick={() => setStatus("now")}>Jeg går i gang nu</button>
            <button type="button" className={status === "soon" ? "on" : ""} onClick={() => setStatus("soon")}>Om et par timer</button>
          </div>

          {status === "soon" && (
            <label className="post-field"><span>Hvornår</span>
              <input type="datetime-local" value={soonAt} onChange={(e) => setSoonAt(e.target.value)} />
            </label>
          )}
          <label className="post-field"><span>Hvor</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="fx hjemme i Vejle, eller Circle K Esbjerg" maxLength={80} />
          </label>
          <label className="post-field"><span>Note (valgfri)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="fx tager foam-kanon med, kom endelig forbi" maxLength={140} />
          </label>

          {msg && <div className={`auth-msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</div>}

          <button className="btn-gold" onClick={start} disabled={busy} style={{ width: "auto" }}>
            {busy ? "Sætter i gang…" : status === "now" ? "Jeg vasker nu 🧽" : "Meld til 🧽"}
          </button>
        </div>

        <div className="wash-list">
          {washes == null ? (
            <p className="muted">Indlæser…</p>
          ) : washes.length === 0 ? (
            <div className="wash-empty">
              <span className="wash-empty-ico" aria-hidden="true">🫧</span>
              <p>Ingen vasker bil lige nu. Vær den første — så får de andre besked.</p>
            </div>
          ) : (
            washes.map((w) => {
              const joins = w.joins || [];
              const joined = joins.some((j) => j.user_id === user.id);
              const mine = w.user_id === user.id;
              const av = w.creator?.avatar_path;
              return (
                <div className={`wash-card${w.status === "now" ? " live" : ""}`} key={w.id}>
                  <div className="wash-card-head">
                    <div className="wash-av">{av ? <img src={avatarUrl(av)} alt="" /> : (w.creator?.username?.[0]?.toUpperCase() || "?")}</div>
                    <div className="wash-who">
                      <b>@{w.creator?.username || "medlem"}</b>
                      <span className={`wash-when${w.status === "now" ? " now" : ""}`}>
                        {w.status === "now" ? "● Vasker nu" : `Om et par timer · kl. ${timeStr(w.starts_at)} (${relStr(w.starts_at)})`}
                      </span>
                    </div>
                    {mine && <button className="wash-end" onClick={() => remove(w.id)} title="Afslut">Afslut</button>}
                  </div>

                  {w.location && <div className="wash-loc">📍 {w.location}</div>}
                  {w.note && <div className="wash-note">{w.note}</div>}

                  <div className="wash-card-foot">
                    {joins.length > 0 && (
                      <span className="wash-joiners">🧽 {joins.map((j) => `@${j.joiner?.username || "?"}`).join(", ")} vasker med</span>
                    )}
                    {!mine && (
                      <button className={`wash-join${joined ? " on" : ""}`} onClick={() => toggleJoin(w, joined)}>
                        {joined ? "Vasker med ✓" : "Jeg vasker med"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
