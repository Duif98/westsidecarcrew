"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function ResetPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  // Supabase turns the recovery link into a session automatically; wait for it.
  useEffect(() => {
    let settled = false;
    const finish = (ok) => { if (settled) return; settled = true; setReady(ok); setChecking(false); };
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") finish(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(true);
      else setTimeout(() => finish(false), 1800);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (pw.length < 6) { setErr("Adgangskoden skal være mindst 6 tegn."); return; }
    if (pw !== pw2) { setErr("De to adgangskoder er ikke ens."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
    setTimeout(() => router.replace("/medlem"), 1400);
  };

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="auth-home">← West Side Car Crew</Link>
        <h1 className="auth-title">Ny adgangskode</h1>

        {checking && <p className="auth-sub">Kontrollerer link…</p>}

        {!checking && !ready && (
          <>
            <p className="auth-sub">Linket er udløbet eller ugyldigt. Bed om et nyt fra login-siden.</p>
            <Link href="/login" className="btn-gold" style={{ marginTop: "1rem" }}>Til login</Link>
          </>
        )}

        {!checking && ready && !done && (
          <>
            <p className="auth-sub">Vælg en ny adgangskode til din konto.</p>
            <form onSubmit={submit} className="auth-form">
              <label>Ny adgangskode
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={6} required />
              </label>
              <label>Gentag adgangskode
                <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" minLength={6} required />
              </label>
              {err && <div className="auth-msg err">{err}</div>}
              <button className="btn-gold" type="submit" disabled={busy}>{busy ? "Gemmer…" : "Gem ny adgangskode"}</button>
            </form>
          </>
        )}

        {done && <div className="auth-msg ok" style={{ marginTop: "1rem" }}>✓ Adgangskoden er opdateret. Sender dig videre…</div>}
      </div>
    </main>
  );
}
