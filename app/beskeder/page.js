"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";
import { timeAgo, clockTime } from "../lib/time";
import { fetchThreads, fetchConversation, sendDM, markConversationRead, dmImageUrl, signalDMRead } from "../lib/dm";
import { notifyUser } from "../lib/pwa";
import { thumbPathFor, uploadThumb } from "../lib/photos";
import { uuid } from "../lib/uuid";
import EmojiPicker from "../components/EmojiPicker";

const avatarUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

function Messages() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, user, profile, loading, signOut } = useAuth();
  const { t, lang } = useT();

  const [members, setMembers] = useState([]);       // [{id, username, avatar_path}]
  const [threads, setThreads] = useState([]);        // derived thread summaries
  const [openId, setOpenId] = useState(null);        // other user's id
  const [convo, setConvo] = useState([]);            // messages in open conversation
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mapRef = useRef({});
  const openRef = useRef(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);
  useEffect(() => { openRef.current = openId; }, [openId]);

  const refreshThreads = useCallback(async () => {
    if (!user?.id) return;
    try { setThreads(await fetchThreads(user.id)); } catch {}
  }, [user?.id]);

  const openThread = useCallback(async (otherId) => {
    setOpenId(otherId);
    setConvo([]);
    try {
      const msgs = await fetchConversation(user.id, otherId);
      setConvo(msgs);
      await markConversationRead(user.id, otherId);
      signalDMRead();
      refreshThreads();
    } catch {}
  }, [user?.id, refreshThreads]);

  // Initial load + realtime.
  useEffect(() => {
    if (!user?.id) return;
    let channel;
    (async () => {
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_path").order("username");
      const map = {};
      (profs || []).forEach((p) => (map[p.id] = p));
      mapRef.current = map;
      setMembers((profs || []).filter((p) => p.id !== user.id));
      await refreshThreads();
      setReady(true);

      const startWith = params.get("u");
      if (startWith) {
        const target = (profs || []).find((p) => p.username?.toLowerCase() === startWith.toLowerCase());
        if (target) openThread(target.id);
      }

      channel = supabase.channel(`dm-${user.id}`);
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, (payload) => {
        const m = payload.new;
        if (m.sender_id !== user.id && m.recipient_id !== user.id) return; // RLS already filters, belt-and-braces
        const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        if (other === openRef.current) {
          setConvo((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.recipient_id === user.id) markConversationRead(user.id, other).then(signalDMRead);
        }
        refreshThreads();
      });
      channel.on("postgres_changes", { event: "DELETE", schema: "public", table: "dm_messages" }, (payload) => {
        setConvo((prev) => prev.filter((x) => x.id !== payload.old.id));
        refreshThreads();
      });
      channel.subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [convo]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !openId) return;
    setText("");
    const temp = { id: `tmp-${Date.now()}`, sender_id: user.id, recipient_id: openId, content, image_path: null, created_at: new Date().toISOString(), read_at: null };
    setConvo((prev) => [...prev, temp]); // optimistic
    try {
      const saved = await sendDM({ senderId: user.id, recipientId: openId, content });
      setConvo((prev) => prev.map((m) => (m.id === temp.id ? saved : m)));
      refreshThreads();
      notifyUser(openId, { title: `✉️ @${profile?.username || "Et medlem"}`, body: content.slice(0, 80), url: "/beskeder", tag: "dm-" + user.id });
    } catch {
      setConvo((prev) => prev.filter((m) => m.id !== temp.id));
      setText(content);
    }
  };

  const sendImageFile = useCallback(async (file) => {
    if (!file || uploading || !openId || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/dm/${uuid()}.${ext}`;
      const up = await supabase.storage.from(PUBLIC_BUCKET).upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (up.error) throw up.error;
      await uploadThumb(PUBLIC_BUCKET, path, file); // fast preview beside the full image
      const saved = await sendDM({ senderId: user.id, recipientId: openId, content: "", imagePath: path });
      setConvo((prev) => [...prev, saved]);
      refreshThreads();
      notifyUser(openId, { title: `📷 @${profile?.username || "Et medlem"}`, body: t("dm.sentPhoto"), url: "/beskeder", tag: "dm-" + user.id });
    } catch (err) {
      alert(t("dm.imgError") + " " + (err.message || err));
    } finally { setUploading(false); }
  }, [uploading, openId, user?.id, profile?.username, refreshThreads, t]);

  const onImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    sendImageFile(file);
  };

  // Paste an image straight from the clipboard (e.g. Windows Snipping Tool).
  const onPaste = (e) => {
    if (!openId) return;
    const item = [...(e.clipboardData?.items || [])].find((it) => it.type.startsWith("image/"));
    if (item) { e.preventDefault(); sendImageFile(item.getAsFile()); }
  };

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>{t("common.loading")}</div></main>;

  const other = openId ? mapRef.current[openId] : null;
  // Members who don't yet have a thread, for starting a new conversation.
  const threadIds = new Set(threads.map((th) => th.otherId));
  const startable = members.filter((m) => !threadIds.has(m.id));

  return (
    <main className="member dm-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/medlem" className="mlink">‹ {t("feed.member")}</Link>
            <button className="mlink" onClick={() => { signOut(); router.replace("/"); }}>{t("nav.logout")}</button>
          </div>
        </div>
      </div>

      <div className="dm-body wrap">
        {/* Thread list */}
        <aside className={`dm-threads${openId ? " has-open" : ""}`}>
          <div className="dm-threads-head">
            <span className="overline">{t("dm.overline")}</span>
            <h1 className="member-title">{t("dm.title")}</h1>
          </div>
          {!ready ? <p className="muted">{t("common.loading")}</p> : (
            <div className="dm-thread-list">
              {threads.map((th) => {
                const m = mapRef.current[th.otherId] || {};
                const last = th.last;
                const preview = last?.image_path ? "📷 " + t("dm.photo") : (last?.content || "");
                return (
                  <button key={th.otherId} className={`dm-thread${openId === th.otherId ? " active" : ""}${th.unread ? " unread" : ""}`} onClick={() => openThread(th.otherId)}>
                    <span className="dm-av">{m.avatar_path ? <img src={avatarUrl(m.avatar_path)} alt="" /> : (m.username || "?").slice(0, 2).toUpperCase()}</span>
                    <span className="dm-thread-txt">
                      <b>@{m.username || "medlem"}</b>
                      <span className="dm-preview">{th.fromMe ? t("dm.you") + " " : ""}{preview}</span>
                    </span>
                    <span className="dm-thread-meta">
                      <span className="dm-when">{timeAgo(th.lastAt, lang)}</span>
                      {th.unread > 0 && <span className="dm-badge">{th.unread}</span>}
                    </span>
                  </button>
                );
              })}
              {startable.length > 0 && (
                <>
                  <div className="dm-start-label">{t("dm.startNew")}</div>
                  {startable.map((m) => (
                    <button key={m.id} className="dm-thread dm-startable" onClick={() => openThread(m.id)}>
                      <span className="dm-av">{m.avatar_path ? <img src={avatarUrl(m.avatar_path)} alt="" /> : (m.username || "?").slice(0, 2).toUpperCase()}</span>
                      <span className="dm-thread-txt"><b>@{m.username}</b></span>
                    </button>
                  ))}
                </>
              )}
              {threads.length === 0 && startable.length === 0 && <p className="muted">{t("dm.noMembers")}</p>}
            </div>
          )}
        </aside>

        {/* Conversation */}
        <section className={`dm-convo${openId ? " open" : ""}`}>
          {!openId ? (
            <div className="dm-empty">{t("dm.pick")}</div>
          ) : (
            <>
              <div className="dm-convo-head">
                <button className="dm-back" onClick={() => setOpenId(null)} aria-label={t("dm.back")}>‹</button>
                <Link href={other?.username ? `/profil?u=${encodeURIComponent(other.username)}` : "#"} className="dm-convo-user">
                  <span className="dm-av sm">{other?.avatar_path ? <img src={avatarUrl(other.avatar_path)} alt="" /> : (other?.username || "?").slice(0, 2).toUpperCase()}</span>
                  @{other?.username || "medlem"}
                </Link>
              </div>
              <div className="dm-log">
                {convo.map((m, idx) => {
                  const mine = m.sender_id === user.id;
                  const showTime = idx === convo.length - 1 || convo[idx + 1]?.sender_id !== m.sender_id;
                  return (
                    <div key={m.id} className={`dm-msg${mine ? " mine" : ""}`}>
                      <div className="dm-bubble">
                        {m.image_path
                          ? <img className="dm-img" src={dmImageUrl(thumbPathFor(m.image_path))} alt="" loading="lazy" decoding="async" onError={(e) => { if (e.currentTarget.src !== dmImageUrl(m.image_path)) e.currentTarget.src = dmImageUrl(m.image_path); }} />
                          : <span>{m.content}</span>}
                      </div>
                      {showTime && <span className="dm-time">{clockTime(m.created_at, lang)}</span>}
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              <form className="dm-input" onSubmit={send}>
                <input ref={fileRef} type="file" accept="image/*" onChange={onImage} hidden />
                <button type="button" className="chat-img-btn" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label={t("dm.sendPhoto")}>
                  {uploading ? <span className="mini-spin" /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>}
                </button>
                <input ref={textRef} value={text} onChange={(e) => setText(e.target.value)} onPaste={onPaste} placeholder={t("dm.placeholder")} maxLength={2000} aria-label={t("dm.message")} />
                <EmojiPicker targetRef={textRef} value={text} onChange={setText} className="up" />
                <button className="btn-gold" type="submit" disabled={!text.trim()}>{t("dm.send")}</button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function DMPage() {
  return <Suspense fallback={<main className="member"><div className="wrap" style={{ paddingTop: 120 }}>…</div></main>}><Messages /></Suspense>;
}
