"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";

const SEEN_KEY = "wscc_inbox_seen";

// Small bell that sits next to the language switcher. Links to the inbox and
// shows a badge with the number of unread items (likes/comments on your photos,
// new meets, new posts) since you last opened it. Members only. Fail-safe.
export default function NotifBell() {
  const { session, user } = useAuth();
  const { t } = useT();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session || !user?.id) { setCount(0); return; }
    let active = true;
    (async () => {
      let seen = 0;
      try { seen = Number(localStorage.getItem(SEEN_KEY) || 0); } catch {}
      const since = new Date(seen).toISOString();
      const me = user.id;
      const safeCount = async (fn) => { try { const { count } = await fn(); return count || 0; } catch { return 0; } };

      let n = 0;
      const { data: myPhotos } = await (async () => { try { return await supabase.from("photos").select("id").eq("user_id", me); } catch { return { data: [] }; } })();
      const ids = (myPhotos || []).map((p) => p.id);
      if (ids.length) {
        n += await safeCount(() => supabase.from("likes").select("*", { count: "exact", head: true }).in("photo_id", ids).neq("user_id", me).gt("created_at", since));
        n += await safeCount(() => supabase.from("comments").select("*", { count: "exact", head: true }).in("photo_id", ids).neq("user_id", me).gt("created_at", since));
      }
      n += await safeCount(() => supabase.from("events").select("*", { count: "exact", head: true }).neq("created_by", me).gt("created_at", since));
      n += await safeCount(() => supabase.from("posts").select("*", { count: "exact", head: true }).gt("created_at", since));

      if (active) setCount(n);
    })();
    return () => { active = false; };
  }, [session, user?.id]);

  if (!session) return null;

  return (
    <Link href="/notifikationer" className="notif-bell" aria-label={`${t("nav.inbox")}${count ? ` (${count})` : ""}`} title={t("nav.inbox")}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {count > 0 && <span className="nav-badge notif-bell-badge">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}
