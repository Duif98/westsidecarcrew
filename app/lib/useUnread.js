"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

// Lightweight in-app notifications for a static site: we remember, per browser,
// when the member last opened each area, and count rows created since. Live
// updates arrive over one realtime channel. No server tables needed.

const KEY = "wscc_seen_v1";
const AREAS = ["chat", "events", "posts"];

const readSeen = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};
const writeSeen = (s) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
};

// Call when a member opens an area so its badge clears.
export function markSeen(area) {
  const s = readSeen();
  s[area] = new Date().toISOString();
  writeSeen(s);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("wscc-seen"));
}

// Returns { chat, events, posts, total } unread counts for the logged-in member.
export function useUnread(session, userId) {
  const [counts, setCounts] = useState({ chat: 0, events: 0, posts: 0, total: 0 });
  // Unique per hook instance so multiple mounts (e.g. Nav + NavMenu) don't
  // collide on one shared realtime channel (which throws "cannot add callbacks
  // after subscribe()").
  const channelName = useRef(`wscc-notify-${Math.random().toString(36).slice(2)}`);

  const refresh = useCallback(async () => {
    if (!session) { setCounts({ chat: 0, events: 0, posts: 0, total: 0 }); return; }

    // First visit ever: baseline every area to "now" so old content isn't all "new".
    const seen = readSeen();
    let changed = false;
    AREAS.forEach((a) => { if (!seen[a]) { seen[a] = new Date().toISOString(); changed = true; } });
    if (changed) writeSeen(seen);

    const count = async (build) => {
      try { const { count } = await build(); return count || 0; } catch { return 0; }
    };

    const [chat, events, posts] = await Promise.all([
      count(() => {
        let q = supabase.from("messages").select("*", { count: "exact", head: true }).gt("created_at", seen.chat);
        if (userId) q = q.neq("user_id", userId);
        return q;
      }),
      count(() => {
        let q = supabase.from("events").select("*", { count: "exact", head: true }).gt("created_at", seen.events);
        if (userId) q = q.neq("created_by", userId);
        return q;
      }),
      count(() => supabase.from("posts").select("*", { count: "exact", head: true }).gt("created_at", seen.posts)),
    ]);

    setCounts({ chat, events, posts, total: chat + events + posts });
  }, [session, userId]);

  useEffect(() => {
    refresh();
    if (!session) return;

    const channel = supabase
      .channel(channelName.current)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "events" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, refresh)
      .subscribe();

    const onSeen = () => refresh();
    const onFocus = () => refresh();
    window.addEventListener("wscc-seen", onSeen);
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("wscc-seen", onSeen);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, session]);

  return counts;
}
