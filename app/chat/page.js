"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { markSeen } from "../lib/useUnread";
import { thumbPathFor, uploadThumb } from "../lib/photos";

const time = (t) => new Date(t).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
const EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "🙌"];
const imgUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

export default function ChatPage() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState({}); // { [messageId]: [{id, emoji, user_id}] }
  const [online, setOnline] = useState([]);
  const [members, setMembers] = useState([]);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState(null);
  const [imgView, setImgView] = useState(null);
  const [uploading, setUploading] = useState(false);
  const mapRef = useRef({});
  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  useEffect(() => {
    const uid = user?.id, uname = profile?.username;
    if (!uid || !uname) return;
    let channel;
    (async () => {
      const { data: profs } = await supabase.from("profiles").select("id, username");
      const map = {};
      (profs || []).forEach((p) => (map[p.id] = p.username));
      mapRef.current = map;
      setMembers((profs || []).map((p) => ({ id: p.id, username: p.username })).sort((a, b) => a.username.localeCompare(b.username, "da")));

      const { data: msgs } = await supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(300);
      const list = msgs || [];
      setMessages(list.map((m) => ({ ...m, username: map[m.user_id] || "medlem" })));
      setReady(true);

      // Reactions for the loaded messages (fail-safe if the table isn't set up).
      if (list.length) {
        const { data: rx } = await supabase
          .from("message_reactions")
          .select("id, message_id, user_id, emoji")
          .in("message_id", list.map((m) => m.id));
        const grouped = {};
        (rx || []).forEach((r) => (grouped[r.message_id] = [...(grouped[r.message_id] || []), r]));
        setReactions(grouped);
      }

      channel = supabase.channel("crew-chat", { config: { presence: { key: uid } } });
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, username: mapRef.current[m.user_id] || "medlem" }]));
      });
      // New signups (new profile rows) appear in the roster automatically.
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
        const p = payload.new;
        mapRef.current[p.id] = p.username;
        setMembers((prev) => (prev.some((m) => m.id === p.id)
          ? prev
          : [...prev, { id: p.id, username: p.username }].sort((a, b) => a.username.localeCompare(b.username, "da"))));
      });
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (payload) => {
        const r = payload.new;
        setReactions((prev) => {
          const cur = prev[r.message_id] || [];
          if (cur.some((x) => x.id === r.id)) return prev;
          return { ...prev, [r.message_id]: [...cur, r] };
        });
      });
      channel.on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
        const old = payload.old;
        setReactions((prev) => {
          const cur = prev[old.message_id];
          if (!cur) return prev;
          return { ...prev, [old.message_id]: cur.filter((x) => x.id !== old.id) };
        });
      });
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const list = Object.values(state).map((metas) => metas[0]).filter(Boolean);
        setOnline(list);
      });
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ user_id: uid, username: uname });
      });
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user?.id, profile?.username]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Actively in the chat → keep its unread badge cleared.
  useEffect(() => { if (session) markSeen("chat"); }, [messages.length, session]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    const { error } = await supabase.from("messages").insert({ user_id: user.id, content: content.slice(0, 1000) });
    if (error) setText(content);
  };

  const pickImage = () => fileRef.current?.click();

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/chat/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(PUBLIC_BUCKET).upload(path, file, { cacheControl: "3600", contentType: file.type });
      if (up.error) throw up.error;
      await uploadThumb(PUBLIC_BUCKET, path, file); // fast preview beside the full image
      const { error } = await supabase.from("messages").insert({ user_id: user.id, content: "", image_path: path });
      if (error) { await supabase.storage.from(PUBLIC_BUCKET).remove([path]); throw error; }
    } catch (err) {
      alert("Kunne ikke sende billedet: " + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  const toggleReaction = async (messageId, emoji) => {
    setPickerFor(null);
    const cur = reactions[messageId] || [];
    const mine = cur.find((r) => r.user_id === user.id && r.emoji === emoji);
    if (mine) {
      setReactions((prev) => ({ ...prev, [messageId]: cur.filter((r) => r.id !== mine.id) }));
      await supabase.from("message_reactions").delete().eq("id", mine.id);
    } else {
      const { data, error } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select("id, message_id, user_id, emoji")
        .single();
      if (!error && data) {
        setReactions((prev) => {
          const c = prev[messageId] || [];
          if (c.some((x) => x.id === data.id)) return prev;
          return { ...prev, [messageId]: [...c, data] };
        });
      }
    }
  };

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  const onlineMembers = Array.from(new Map(online.map((o) => [o.user_id, o])).values())
    .map((o) => ({ id: o.user_id, username: o.username || mapRef.current[o.user_id] || "medlem" }))
    .sort((a, b) => a.username.localeCompare(b.username, "da"));
  const onlineIds = new Set(onlineMembers.map((m) => m.id));
  const offlineMembers = members.filter((m) => !onlineIds.has(m.id));

  return (
    <main className="member chat-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/medlem" className="mlink">‹ Medlem</Link>
            <Link href="/upload" className="mlink">Min garage</Link>
            {isAdmin && <Link href="/admin" className="mlink gold">Admin</Link>}
            <button className="mlink" onClick={() => { signOut(); router.replace("/"); }}>Log ud</button>
          </div>
        </div>
      </div>

      <div className="chat-body wrap">
        <div className="chat-col">
          <div className="chat-head">
            <div>
              <span className="overline">Crew chat</span>
              <h1 className="member-title">Snak sammen</h1>
            </div>
            <button className="roster-toggle" onClick={() => setRosterOpen((o) => !o)} aria-expanded={rosterOpen}>
              <span className="online-dot" /> {onlineMembers.length} online
            </button>
          </div>

          <div className="chat-log" onClick={() => setPickerFor(null)}>
            {ready && messages.length === 0 && <p className="ph-empty">Ingen beskeder endnu — skriv den første! 👋</p>}
            {messages.map((m, i) => {
              const mine = m.user_id === user.id;
              const showName = !mine && (i === 0 || messages[i - 1].user_id !== m.user_id);
              const rx = reactions[m.id] || [];
              const grouped = {};
              rx.forEach((r) => { grouped[r.emoji] = grouped[r.emoji] || { count: 0, mine: false }; grouped[r.emoji].count++; if (r.user_id === user.id) grouped[r.emoji].mine = true; });
              return (
                <div key={m.id} className={`msg ${mine ? "mine" : ""}`}>
                  {showName && <span className="msg-name">@{m.username}</span>}
                  <div className="msg-row">
                    <div className="msg-bubble">
                      {m.image_path
                        ? <button className="msg-imgbtn" onClick={() => setImgView(imgUrl(m.image_path))} aria-label="Åbn billede"><img src={imgUrl(thumbPathFor(m.image_path))} alt="Delt billede" loading="lazy" decoding="async" onError={(e) => { if (e.currentTarget.src !== imgUrl(m.image_path)) e.currentTarget.src = imgUrl(m.image_path); }} /></button>
                        : <span className="msg-text">{m.content}</span>}
                      {!m.image_path && <span className="msg-time">{time(m.created_at)}</span>}
                    </div>
                    <div className="msg-react-wrap">
                      <button className="msg-react-btn" onClick={(e) => { e.stopPropagation(); setPickerFor(pickerFor === m.id ? null : m.id); }} aria-label="Reager">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
                      </button>
                      {pickerFor === m.id && (
                        <div className="emoji-pop" onClick={(e) => e.stopPropagation()}>
                          {EMOJIS.map((em) => <button key={em} onClick={() => toggleReaction(m.id, em)}>{em}</button>)}
                        </div>
                      )}
                    </div>
                  </div>
                  {Object.keys(grouped).length > 0 && (
                    <div className={`msg-reactions ${mine ? "mine" : ""}`}>
                      {Object.entries(grouped).map(([em, g]) => (
                        <button key={em} className={`rchip ${g.mine ? "on" : ""}`} onClick={() => toggleReaction(m.id, em)}>
                          {em} <b>{g.count}</b>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form className="chat-input" onSubmit={send}>
            <input ref={fileRef} type="file" accept="image/*" onChange={onImage} hidden />
            <button type="button" className="chat-img-btn" onClick={pickImage} disabled={uploading} aria-label="Send billede" title="Send billede">
              {uploading
                ? <span className="mini-spin" />
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>}
            </button>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Skriv en besked…" maxLength={1000} aria-label="Besked" />
            <button className="btn-gold" type="submit" disabled={!text.trim()}>Send</button>
          </form>
        </div>

        <aside className={`roster ${rosterOpen ? "open" : ""}`}>
          <div className="roster-group">
            <div className="roster-label">Online — {onlineMembers.length}</div>
            {onlineMembers.map((m) => (
              <div className="roster-user online" key={m.id}>
                <span className="rdot" />@{m.username}{m.id === user.id ? " (dig)" : ""}
              </div>
            ))}
            {onlineMembers.length === 0 && <div className="roster-empty">Ingen online</div>}
          </div>
          <div className="roster-group">
            <div className="roster-label">Offline — {offlineMembers.length}</div>
            {offlineMembers.map((m) => (
              <div className="roster-user" key={m.id}><span className="rdot" />@{m.username}</div>
            ))}
          </div>
        </aside>
      </div>

      {imgView && (
        <div className="img-view" onClick={() => setImgView(null)} role="dialog" aria-modal="true">
          <button className="img-view-close" onClick={() => setImgView(null)} aria-label="Luk">✕</button>
          <img src={imgView} alt="Delt billede" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </main>
  );
}
