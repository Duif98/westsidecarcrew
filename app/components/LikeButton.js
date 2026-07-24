"use client";

import { useState } from "react";
import { toggleLike } from "../lib/photos";

export default function LikeButton({ photo, userId, canLike, onNeedLogin }) {
  const [liked, setLiked] = useState(!!photo.likedByMe);
  const [count, setCount] = useState(photo.likeCount || 0);
  const [busy, setBusy] = useState(false);

  const click = async (e) => {
    e.stopPropagation();
    if (!canLike) { onNeedLogin?.(); return; }
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next); setCount((c) => c + (next ? 1 : -1)); // optimistic
    try {
      await toggleLike(photo.id, userId, liked);
    } catch {
      setLiked(!next); setCount((c) => c + (next ? -1 : 1)); // revert
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`like-btn${liked ? " liked" : ""}`}
      onClick={click}
      aria-pressed={liked}
      aria-label={liked ? "Fjern like" : "Synes godt om"}
      title={canLike ? "" : "Log ind for at like"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20s-7-4.6-9.5-9C1 8.5 2.2 5.5 5.2 5.1 7 4.9 8.6 5.9 12 9c3.4-3.1 5-4.1 6.8-3.9 3 .4 4.2 3.4 2.7 5.9C19 15.4 12 20 12 20z" />
      </svg>
      {count > 0 && <span className="like-count">{count}</span>}
    </button>
  );
}
