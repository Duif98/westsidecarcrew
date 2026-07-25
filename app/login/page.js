"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";
import { BASE_PATH } from "../lib/asset";

export default function LoginPage() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const { t } = useT();
  const [mode, setMode] = useState("login"); // 'login' | 'signup' | 'forgot'
  const [f, setF] = useState({ username: "", email: "", password: "", code: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [invited, setInvited] = useState(false);

  // Prefill the crew code from an invite link (…/login?code=…).
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) { setMode("signup"); setInvited(true); setF((p) => ({ ...p, code })); }
  }, []);

  // Already signed in with a profile → go to member area.
  useEffect(() => {
    if (!loading && session && profile) router.replace("/medlem");
  }, [loading, session, profile, router]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const doLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
    if (error) throw new Error(t("login.errCreds"));
    router.replace("/medlem");
  };

  const doSignup = async () => {
    const username = f.username.trim();
    if (username.length < 2) throw new Error(t("login.errUsername"));
    // 1) Validate the crew code server-side.
    const { data: ok, error: codeErr } = await supabase.rpc("check_signup_code", { code: f.code.trim() });
    if (codeErr) throw new Error(t("login.errServer"));
    if (!ok) throw new Error(t("login.errCode"));
    // 2) Username taken?
    const { data: taken } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (taken) throw new Error(t("login.errTaken"));
    // 3) Create the account.
    const { data: su, error: suErr } = await supabase.auth.signUp({ email: f.email.trim(), password: f.password });
    if (suErr) {
      const m = suErr.message.toLowerCase();
      if (m.includes("already registered")) throw new Error(t("login.errExists"));
      if (m.includes("signups") || m.includes("disabled")) throw new Error(t("login.errSignupsOff"));
      throw new Error(suErr.message);
    }
    if (!su.session) {
      setInfo(t("login.infoConfirm"));
      setMode("login");
      return;
    }
    // 4) Create the gated profile.
    const { error: pErr } = await supabase.rpc("create_profile", { p_username: username, p_code: f.code.trim() });
    if (pErr) throw new Error(pErr.message.includes("Ugyldig") ? t("login.errCodeShort") : t("login.errProfile") + pErr.message);
    router.replace("/medlem");
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "login") await doLogin();
      else if (mode === "signup") await doSignup();
      else await doForgot();
    }
    catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };

  const doForgot = async () => {
    const redirectTo = `${window.location.origin}${BASE_PATH}/reset/`;
    const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), { redirectTo });
    if (error) throw new Error(error.message);
    setInfo(t("login.infoReset"));
  };

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="auth-home">{t("login.home")}</Link>
        <h1 className="auth-title">{mode === "login" ? t("login.titleLogin") : mode === "signup" ? t("login.titleSignup") : t("login.titleForgot")}</h1>
        <p className="auth-sub">
          {mode === "login" ? t("login.subLogin")
            : mode === "signup" ? (invited ? t("login.subSignupInvited") : t("login.subSignup"))
            : t("login.subForgot")}
        </p>

        {mode !== "forgot" && (
          <div className="auth-tabs">
            <button className={mode === "login" ? "on" : ""} onClick={() => { setMode("login"); setErr(""); setInfo(""); }} type="button">{t("login.tabLogin")}</button>
            <button className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setErr(""); setInfo(""); }} type="button">{t("login.tabSignup")}</button>
          </div>
        )}

        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <label>{t("login.username")}
              <input value={f.username} onChange={set("username")} autoComplete="username" required />
            </label>
          )}
          <label>{t("login.email")}
            <input type="email" value={f.email} onChange={set("email")} autoComplete="email" required />
          </label>
          {mode !== "forgot" && (
            <label>{t("login.password")}
              <input type="password" value={f.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required />
            </label>
          )}
          {mode === "signup" && (
            <label>{t("login.code")}
              <input value={f.code} onChange={set("code")} placeholder={t("login.codePlaceholder")} required />
            </label>
          )}

          {err && <div className="auth-msg err">{err}</div>}
          {info && <div className="auth-msg ok">{info}</div>}

          <button className="btn-gold" type="submit" disabled={busy}>
            {busy ? t("login.wait") : mode === "login" ? t("login.btnLogin") : mode === "signup" ? t("login.btnSignup") : t("login.btnForgot")}
          </button>
        </form>

        <div className="auth-alt">
          {mode === "login" && (
            <button type="button" onClick={() => { setMode("forgot"); setErr(""); setInfo(""); }}>{t("login.forgotLink")}</button>
          )}
          {mode === "forgot" && (
            <button type="button" onClick={() => { setMode("login"); setErr(""); setInfo(""); }}>{t("login.backToLogin")}</button>
          )}
        </div>
      </div>
    </main>
  );
}
