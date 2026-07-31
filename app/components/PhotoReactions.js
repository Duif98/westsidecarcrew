"use client";

import { useEffect, useState } from "react";
import { PHOTO_EMOJIS, togglePhotoReaction, groupReactions, fetchReactions } from "../lib/reactions";
import { notifyUser } from "../lib/pwa";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";

// Emoji reactions on a photo. Optimistic: the chip updates instantly and reverts
// only if the write fails. Fail-safe: before 033 is run the insert throws and we
// silently roll back, so nothing breaks.
export default function PhotoReactions({ photoId, initial = [], autoLoad = false, userId, canReact, onNeedLogin, photoOwnerId, photoLabel }) {
  const { t } = useT();
  const { profile } = useAuth();
  const [rows, setRows] = useState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const grouped = groupReactions(rows, userId);

  // When the host doesn't preload reactions (e.g. the lightbox), fetch fresh
  // counts on mount / photo change so others' reactions are visible.
  useEffect(() => {
    if (!autoLoad) return;
    let on = true;
    fetchReactions(photoId).then((r) => on && setRows(r)).catch(() => {});
    return () => { on = false; };
  }, [photoId, autoLoad]);

  const react = async (emoji) => {
    setPickerOpen(false);
    if (!canReact) { onNeedLogin?.(); return; }
    const mine = rows.find((r) => r.user_id === userId && r.emoji === emoji);
    if (mine) {
      setRows((prev) => prev.filter((r) => r.id !== mine.id)); // optimistic remove
      try { await togglePhotoReaction({ photoId, userId, emoji, existingId: mine.id }); }
      catch { setRows((prev) => [...prev, mine]); }
      return;
    }
    const temp = { id: `tmp-${emoji}-${userId}`, photo_id: photoId, user_id: userId, emoji };
    setRows((prev) => [...prev, temp]); // optimistic add
    try {
      const saved = await togglePhotoReaction({ photoId, userId, emoji });
      setRows((prev) => prev.map((r) => (r.id === temp.id ? saved : r)));
      if (photoOwnerId && photoOwnerId !== userId) {
        notifyUser(photoOwnerId, {
          title: `${emoji} Ny reaktion`,
          body: `@${profile?.username || "Et medlem"} reagerede på dit billede${photoLabel ? " · " + photoLabel : ""}`,
          url: "/", tag: "react-" + photoId,
        });
      }
    } catch {
      setRows((prev) => prev.filter((r) => r.id !== temp.id)); // revert
    }
  };

  return (
    <div className="prx">
      {Object.entries(grouped).map(([em, g]) => (
        <button key={em} type="button" className={`prx-chip${g.mine ? " on" : ""}`} onClick={() => react(em)} aria-pressed={g.mine}>
          {em} <b>{g.count}</b>
        </button>
      ))}
      <div className="prx-add-wrap">
        <button type="button" className="prx-add" onClick={() => (canReact ? setPickerOpen((o) => !o) : onNeedLogin?.())} aria-label={t("react.add")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
        </button>
        {pickerOpen && (
          <div className="prx-pop" onClick={(e) => e.stopPropagation()}>
            {PHOTO_EMOJIS.map((em) => <button key={em} type="button" onClick={() => react(em)}>{em}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}
