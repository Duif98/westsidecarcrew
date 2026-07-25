"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";

// Comment thread for a single photo. Reads for everyone, posting for members.
// Fail-safe: if the comments table isn't set up yet it just shows nothing broken.
export default function Comments({ photoId, onCountChange, onNeedLogin }) {
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
        .from("comments")
        .select("*, profiles!comments_user_id_fkey(username)")
        .eq("photo_id", photoId)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) { setReady(true); return; } // table not set up yet
      const rows = data || [];
      rows.forEach((c) => (mapRef.current[c.user_id] = c.profiles?.username));
      setItems(rows);
      setReady(true);
      onCountChange?.(rows.length);

      channel = supabase
        .channel(`comments-${photoId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "comments", filter: `photo_id=eq.${photoId}` },
          (payload) => {
            const c = payload.new;
            setItems((prev) => {
              if (prev.some((x) => x.id === c.id)) return prev;
              const next = [...prev, { ...c, profiles: { username: mapRef.current[c.user_id] || "medlem" } }];
              onCountChange?.(next.length);
              return next;
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "comments", filter: `photo_id=eq.${photoId}` },
          (payload) => {
            setItems((prev) => {
              const next = prev.filter((x) => x.id !== payload.old.id);
              onCountChange?.(next.length);
              return next;
            });
          }
        )
        .subscribe();
    })();
    return () => { active = false; if (channel) supabase.removeChannel(channel); };
  }, [photoId]);

  const send = async (e) => {
    e.preventDefault();
    if (!user) { onNeedLogin?.(); return; }
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const optimistic = {
      id: `tmp-${crypto.randomUUID()}`,
      photo_id: photoId,
      user_id: user.id,
      body: body.slice(0, 500),
      created_at: new Date().toISOString(),
      profiles: { username: profile?.username || "mig" },
    };
    setItems((prev) => { const n = [...prev, optimistic]; onCountChange?.(n.length); return n; });
    setText("");
    const { data, error } = await supabase
      .from("comments")
      .insert({ photo_id: photoId, user_id: user.id, body: body.slice(0, 500) })
      .select("*, profiles!comments_user_id_fkey(username)")
      .single();
    setBusy(false);
    if (error) {
      setItems((prev) => { const n = prev.filter((x) => x.id !== optimistic.id); onCountChange?.(n.length); return n; });
      setText(body);
      return;
    }
    mapRef.current[user.id] = data.profiles?.username;
    setItems((prev) => prev.map((x) => (x.id === optimistic.id ? data : x)));
  };

  const remove = async (c) => {
    setItems((prev) => { const n = prev.filter((x) => x.id !== c.id); onCountChange?.(n.length); return n; });
    await supabase.from("comments").delete().eq("id", c.id);
  };

  return (
    <div className="cmts">
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
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={user ? t("comments.placeholder") : t("comments.loginPlaceholder")}
          maxLength={500}
          aria-label={t("comments.aria")}
          onFocus={() => { if (!user) onNeedLogin?.(); }}
        />
        <button className="btn-gold" type="submit" disabled={!text.trim() || busy}>{t("comments.send")}</button>
      </form>
    </div>
  );
}
