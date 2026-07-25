"use client";

import { useEffect, useState } from "react";
import { getPosts } from "../lib/posts";
import { useAuth } from "../lib/AuthProvider";
import { markSeen } from "../lib/useUnread";
import Reveal from "./Reveal";

const fmtDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function NewsBoard() {
  const { session } = useAuth();
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
          <span className="overline">Notice board</span>
          <h2>News from the crew</h2>
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
                {p.pinned && <span className="news-pin">Pinned</span>}
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
