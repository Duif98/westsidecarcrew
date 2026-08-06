"use client";

import { useEffect, useState } from "react";
import { getPosts } from "../lib/posts";
import { useAuth } from "../lib/AuthProvider";
import { markSeen } from "../lib/useUnread";
import { useT } from "../lib/i18n";
import Reveal from "./Reveal";

// A long post body is a wall of text on the front page. Show a teaser that
// expands in place (there is no post detail page, so nothing may be hidden
// permanently). Short posts render in full with no toggle.
const CLAMP_AT = 240;

function NewsCard({ post, index, fmtDate, t }) {
  const [open, setOpen] = useState(false);
  const long = (post.body || "").length > CLAMP_AT;

  return (
    <Reveal as="article" className={`news-card ${index === 0 ? "featured" : ""}`} delay={(index % 3) * 80}>
      {post.imageUrl && (
        <div className="news-img">
          <img src={post.imageUrl} alt={post.title} loading="lazy" />
        </div>
      )}
      <div className="news-body">
        {post.pinned && <span className="news-pin">{t("news.pinned")}</span>}
        <h3 className="news-title">{post.title}</h3>
        {post.body && (
          <p className={`news-text ${long && !open ? "clamp" : ""}`}>{post.body}</p>
        )}
        {long && (
          <button type="button" className="news-more" onClick={() => setOpen((v) => !v)}>
            {open ? t("news.less") : t("news.more")}
            <span className="news-more-i" aria-hidden="true">{open ? "↑" : "↓"}</span>
          </button>
        )}
        <div className="news-meta">
          {post.author ? `@${post.author} · ` : ""}{fmtDate(post.created_at)}
        </div>
      </div>
    </Reveal>
  );
}

export default function NewsBoard() {
  const { session } = useAuth();
  const { t, locale } = useT();
  const fmtDate = (ts) => new Date(ts).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  const [posts, setPosts] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getPosts().then((p) => { if (active) { setPosts(p); setReady(true); } });
    return () => { active = false; };
  }, []);

  // A member seeing the front-page board has caught up on posts.
  useEffect(() => { if (ready && session) markSeen("posts"); }, [ready, session]);

  if (!ready || posts.length === 0) return null;

  return (
    <section className="section newsboard" id="nyheder">
      <div className="wrap">
        <Reveal className="section-head" as="div">
          <span className="overline">{t("news.overline")}</span>
          <h2>{t("news.title")}</h2>
        </Reveal>

        <div className="news-grid">
          {posts.map((p, i) => (
            <NewsCard key={p.id} post={p} index={i} fmtDate={fmtDate} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
