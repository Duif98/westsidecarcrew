"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [f, setF] = useState({ username: "", email: "", password: "", code: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // Already signed in with a profile → go to member area.
  useEffect(() => {
    if (!loading && session && profile) router.replace("/medlem");
  }, [loading, session, profile, router]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const doLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
    if (error) throw new Error("Forkert email eller adgangskode.");
    router.replace("/medlem");
  };

  const doSignup = async () => {
    const username = f.username.trim();
    if (username.length < 2) throw new Error("Vælg et brugernavn (mindst 2 tegn).");
    // 1) Validate the crew code server-side.
    const { data: ok, error: codeErr } = await supabase.rpc("check_signup_code", { code: f.code.trim() });
    if (codeErr) throw new Error("Kunne ikke kontakte serveren. Prøv igen.");
    if (!ok) throw new Error("Forkert kode. Du skal bruge crewets oprettelses-kode.");
    // 2) Username taken?
    const { data: taken } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (taken) throw new Error("Brugernavnet er optaget – vælg et andet.");
    // 3) Create the account.
    const { data: su, error: suErr } = await supabase.auth.signUp({ email: f.email.trim(), password: f.password });
    if (suErr) {
      const m = suErr.message.toLowerCase();
      if (m.includes("already registered")) throw new Error("Der findes allerede en konto med den email – log ind i stedet.");
      if (m.includes("signups") || m.includes("disabled")) throw new Error("Oprettelse er slået fra i Supabase. Admin skal aktivere email-signups i dashboardet.");
      throw new Error(suErr.message);
    }
    if (!su.session) {
      setInfo("Konto oprettet. Bekræft din email, og log derefter ind. (Admin kan slå email-bekræftelse fra for at springe dette over.)");
      setMode("login");
      return;
    }
    // 4) Create the gated profile.
    const { error: pErr } = await supabase.rpc("create_profile", { p_username: username, p_code: f.code.trim() });
    if (pErr) throw new Error(pErr.message.includes("Ugyldig") ? "Forkert kode." : "Kunne ikke oprette profil: " + pErr.message);
    router.replace("/medlem");
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    try { mode === "login" ? await doLogin() : await doSignup(); }
    catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="auth-home">← West Side Car Crew</Link>
        <h1 className="auth-title">{mode === "login" ? "Log ind" : "Bliv medlem"}</h1>
        <p className="auth-sub">{mode === "login" ? "Log ind for at se og uploade billeder." : "Opret din profil med crewets kode."}</p>

        <div className="auth-tabs">
          <button className={mode === "login" ? "on" : ""} onClick={() => { setMode("login"); setErr(""); }} type="button">Log ind</button>
          <button className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setErr(""); }} type="button">Opret</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <label>Brugernavn
              <input value={f.username} onChange={set("username")} autoComplete="username" required />
            </label>
          )}
          <label>Email
            <input type="email" value={f.email} onChange={set("email")} autoComplete="email" required />
          </label>
          <label>Adgangskode
            <input type="password" value={f.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required />
          </label>
          {mode === "signup" && (
            <label>Oprettelses-kode
              <input value={f.code} onChange={set("code")} placeholder="Crewets kode" required />
            </label>
          )}

          {err && <div className="auth-msg err">{err}</div>}
          {info && <div className="auth-msg ok">{info}</div>}

          <button className="btn-gold" type="submit" disabled={busy}>
            {busy ? "Vent…" : mode === "login" ? "Log ind" : "Opret profil"}
          </button>
        </form>
      </div>
    </main>
  );
}
