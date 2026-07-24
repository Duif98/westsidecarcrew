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
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
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

      const { data: msgs } = await supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(300);
      setMessages((msgs || []).map((m) => ({ ...m, username: map[m.user_id] || "medlem" })));
      setReady(true);

      channel = supabase.channel("crew-chat", { config: { presence: { key: uid } } });
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, username: mapRef.current[m.user_id] || "medlem" }]));
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

  return (
    <main className="member chat-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/medlem" className="mlink">Medlem</Link>
            {isAdmin && <Link href="/admin" className="mlink gold">Admin</Link>}
            <button className="mlink" onClick={() => { signOut(); router.replace("/"); }}>Log ud</button>
          </div>
        </div>
      </div>

      <div className="wrap chat-wrap">
        <div className="chat-head">
          <div>
            <span className="overline">Crew chat</span>
            <h1 className="member-title">Snak sammen</h1>
          </div>
          <div className="online-box">
            <span className="online-dot" /> {online.length} online
            <div className="online-names">{online.map((o) => `@${o.username}`).join(", ")}</div>
          </div>
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
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Skriv en besked…"
            maxLength={1000}
            aria-label="Besked"
          />
          <button className="btn-gold" type="submit" disabled={!text.trim()}>Send</button>
        </form>
      </div>
    </main>
  );
}
