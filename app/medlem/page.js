"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { uploadPhoto, withUrls, deletePhoto } from "../lib/photos";
import PhotoGrid from "../components/PhotoGrid";

export default function MedlemPage() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const [all, setAll] = useState([]);
  const [file, setFile] = useState(null);
  const [car, setCar] = useState("");
  const [caption, setCaption] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("photos")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false });
    setAll(await withUrls(data || []));
  }, []);

  useEffect(() => { if (session) load(); }, [session, load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setMsg("Vælg et billede først."); return; }
    setBusy(true); setMsg("");
    try {
      await uploadPhoto({ file, isPublic, car, caption, userId: user.id });
      setFile(null); setCar(""); setCaption(""); setIsPublic(false);
      e.target.reset();
      setMsg(isPublic ? "✓ Uploadet. Afventer godkendelse til forsiden." : "✓ Uploadet (privat – kun for medlemmer).");
      await load();
    } catch (e2) { setMsg(e2.message); }
    finally { setBusy(false); }
  };

  const remove = async (p) => {
    if (!confirm("Slet dette billede?")) return;
    await deletePhoto(p); await load();
  };

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  const mine = all.filter((p) => p.user_id === user.id);

  return (
    <main className="member">
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

      <div className="wrap member-body">
        <span className="overline">Min garage</span>
        <h1 className="member-title">Upload din bil</h1>

        <form className="upload-card" onSubmit={submit}>
          <label className="file-drop">
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <span>{file ? file.name : "Vælg et billede…"}</span>
          </label>
          <div className="upload-grid">
            <label>Bil <input value={car} onChange={(e) => setCar(e.target.value)} placeholder="fx BMW M4 F82" /></label>
            <label>Tekst (valgfri) <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="fx Alpinhvid, sommer 2025" /></label>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span><b>Offentligt billede</b> – må vises i Garagen på forsiden (efter admin-godkendelse). Lades feltet stå tomt, er billedet <b>privat</b> og kun synligt for indloggede medlemmer.</span>
          </label>
          {msg && <div className={`auth-msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</div>}
          <button className="btn-gold" type="submit" disabled={busy}>{busy ? "Uploader…" : "Upload billede"}</button>
        </form>

        <div className="member-section">
          <span className="overline">Mine billeder</span>
          <PhotoGrid photos={mine} showStatus onDelete={remove} />
        </div>

        <div className="member-section">
          <span className="overline">Crewets billeder</span>
          <p className="member-note">Alle billeder — også private — er synlige her for indloggede medlemmer.</p>
          <PhotoGrid photos={all} showStatus />
        </div>
      </div>
    </main>
  );
}
