"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";

// Discussion thread for a single meet. Reads for everyone, posting for members,
// live via Supabase Realtime. Fail-safe: if 022 isn't run yet it just renders an
// empty thread (no crash).
export default function MeetComments({ eventId, onNeedLogin }) {
  const { user, profile, isAdmin } = useAuth();
  const { t, locale } = useT();
  const time = (ts) => new Date(ts).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const mapRef = useRef({});

  useEffect(() => {
    let active = true;
    let channel;
    (async () => {
      const { data, error } = await supabase
        .from("meet_comments")
        .select("*, profiles!meet_comments_user_id_fkey(username)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) { setReady(true); return; } // table not set up yet
      const rows = data || [];
      rows.forEach((c) => (mapRef.current[c.user_id] = c.profiles?.username));
      setItems(rows);
      setReady(true);

      channel = supabase
        .channel(`meet-comments-${eventId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "meet_comments", filter: `event_id=eq.${eventId}` },
          (payload) => {
            const c = payload.new;
            setItems((prev) => prev.some((x) => x.id === c.id) ? prev : [...prev, { ...c, profiles: { username: mapRef.current[c.user_id] || "medlem" } }]);
          })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "meet_comments", filter: `event_id=eq.${eventId}` },
          (payload) => setItems((prev) => prev.filter((x) => x.id !== payload.old.id)))
        .subscribe();
    })();
    return () => { active = false; if (channel) supabase.removeChannel(channel); };
  }, [eventId]);

  const send = async (e) => {
    e.preventDefault();
    if (!user) { onNeedLogin?.(); return; }
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const optimistic = { id: `tmp-${crypto.randomUUID()}`, event_id: eventId, user_id: user.id, body: body.slice(0, 500), created_at: new Date().toISOString(), profiles: { username: profile?.username || "mig" } };
    setItems((prev) => [...prev, optimistic]);
    setText("");
    const { data, error } = await supabase
      .from("meet_comments")
      .insert({ event_id: eventId, user_id: user.id, body: body.slice(0, 500) })
      .select("*, profiles!meet_comments_user_id_fkey(username)")
      .single();
    setBusy(false);
    if (error) { setItems((prev) => prev.filter((x) => x.id !== optimistic.id)); setText(body); return; }
    mapRef.current[user.id] = data.profiles?.username;
    setItems((prev) => prev.map((x) => (x.id === optimistic.id ? data : x)));
  };

  const remove = async (c) => {
    setItems((prev) => prev.filter((x) => x.id !== c.id));
    await supabase.from("meet_comments").delete().eq("id", c.id);
  };

  return (
    <div className="md-discuss">
      <span className="cp-label">{t("meet.discussion")}{items.length ? ` (${items.length})` : ""}</span>
      <div className="cmts-list">
        {ready && items.length === 0 && <p className="cmts-empty">{t("comments.empty")}</p>}
        {items.map((c) => {
          const mine = c.user_id === user?.id;
          return (
            <div className="cmt" key={c.id}>
              <div className="cmt-head">
                <span className="cmt-name">@{c.profiles?.username || t("comments.member")}</span>
                <span className="cmt-time">{time(c.created_at)}</span>
                {(mine || isAdmin) && !String(c.id).startsWith("tmp-") && (
                  <button className="cmt-del" onClick={() => remove(c)} aria-label={t("comments.delete")}>✕</button>
                )}
              </div>
              <p className="cmt-body">{c.body}</p>
            </div>
          );
        })}
      </div>
      <form className="cmt-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder={user ? t("comments.placeholder") : t("comments.loginPlaceholder")}
          maxLength={500} aria-label={t("comments.aria")}
          onFocus={() => { if (!user) onNeedLogin?.(); }} />
        <button className="btn-gold" type="submit" disabled={!text.trim() || busy}>{t("comments.send")}</button>
      </form>
    </div>
  );
}
