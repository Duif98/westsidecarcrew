"use client";

import { useEffect, useState } from "react";
import { getPosts } from "../lib/posts";
import { useAuth } from "../lib/AuthProvider";
import { markSeen } from "../lib/useUnread";
import { useT } from "../lib/i18n";
import Reveal from "./Reveal";

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
            <Reveal
              as="article"
              key={p.id}
              className={`news-card ${i === 0 ? "featured" : ""}`}
              delay={(i % 3) * 80}
            >
              {p.imageUrl && (
                <div className="news-img">
                  <img src={p.imageUrl} alt={p.title} loading="lazy" />
                </div>
              )}
              <div className="news-body">
                {p.pinned && <span className="news-pin">{t("news.pinned")}</span>}
                <h3 className="news-title">{p.title}</h3>
                {p.body && <p className="news-text">{p.body}</p>}
                <div className="news-meta">
                  {p.author ? `@${p.author} · ` : ""}{fmtDate(p.created_at)}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
