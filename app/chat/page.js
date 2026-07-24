"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

const time = (t) => new Date(t).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });

export default function ChatPage() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState([]);
  const [members, setMembers] = useState([]);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const mapRef = useRef({});
  const endRef = useRef(null);

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
      setMessages((msgs || []).map((m) => ({ ...m, username: map[m.user_id] || "medlem" })));
      setReady(true);

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

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    const { error } = await supabase.from("messages").insert({ user_id: user.id, content: content.slice(0, 1000) });
    if (error) setText(content);
  };

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  // Online comes straight from presence (so brand-new members show instantly);
  // offline = every known member who isn't currently online.
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

          <div className="chat-log">
            {ready && messages.length === 0 && <p className="ph-empty">Ingen beskeder endnu — skriv den første! 👋</p>}
            {messages.map((m, i) => {
              const mine = m.user_id === user.id;
              const showName = !mine && (i === 0 || messages[i - 1].user_id !== m.user_id);
              return (
                <div key={m.id} className={`msg ${mine ? "mine" : ""}`}>
                  {showName && <span className="msg-name">@{m.username}</span>}
                  <div className="msg-bubble">
                    <span className="msg-text">{m.content}</span>
                    <span className="msg-time">{time(m.created_at)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form className="chat-input" onSubmit={send}>
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
    </main>
  );
}
