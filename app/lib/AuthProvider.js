"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { BASE_PATH } from "./asset";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      loadProfile(s?.user?.id);
      // A password-recovery link signs the user in on whatever page it lands on
      // (often the site root), which just looks like "I'm logged in" and never
      // shows the change-password form. Send them to /reset/ wherever they land.
      if (event === "PASSWORD_RECOVERY" && typeof window !== "undefined"
          && !window.location.pathname.includes("/reset")) {
        window.location.assign(`${BASE_PATH}/reset/`);
      }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signOut = async () => { await supabase.auth.signOut(); setProfile(null); };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAdmin: !!profile?.is_admin,
    refreshProfile: () => loadProfile(session?.user?.id),
    signOut,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
