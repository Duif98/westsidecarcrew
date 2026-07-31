"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PhotoTags from "./PhotoTags";
import { updateCaption, fetchEditHistory } from "../lib/postEdit";
import { timeAgo } from "../lib/time";
import { useT } from "../lib/i18n";

// Facebook-style "•••" menu on a post. The owner can edit (change the text + tag
// people/cars); the owner and admins can view the edit history. Editing is
// owner-only — admins never get "edit" on someone else's post here.
export default function PostMenu({ photo, userId, isAdmin, onSaved, onClosed }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // "edit" | "history"
  const [caption, setCaption] = useState(photo.caption || "");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState(null);

  const canEdit = !!userId && photo.user_id === userId;
  const canHistory = canEdit || isAdmin;

  useEffect(() => {
    if (!open) return;
    const onDoc = () => setOpen(false);
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  if (!canEdit && !canHistory) return null;

  const openEdit = () => { setCaption(photo.caption || ""); setMode("edit"); setOpen(false); };
  const openHistory = async () => {
    setMode("history"); setOpen(false); setHistory(null);
    setHistory(await fetchEditHistory(photo.id));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await updateCaption({ photoId: photo.id, oldCaption: photo.caption, newCaption: caption, editorId: userId });
      onSaved?.(res.caption, res.edited_at);
      setMode(null);
      onClosed?.();
    } catch (e) {
      alert(t("post.saveError") + " " + (e.message || e));
    } finally { setSaving(false); }
  };

  const close = () => { const wasEdit = mode === "edit"; setMode(null); if (wasEdit) onClosed?.(); };

  const modal = mode && createPortal(
    <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="pm-card" role="dialog" aria-modal="true">
        <div className="pm-card-head">
          <h3>{mode === "edit" ? t("post.editTitle") : t("post.historyTitle")}</h3>
          <button className="pm-close" onClick={close} aria-label={t("post.cancel")}>✕</button>
        </div>

        {mode === "edit" ? (
          <div className="pm-edit">
            <label className="pm-label">{t("post.caption")}</label>
            <textarea className="pm-textarea" value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} maxLength={600} placeholder={t("post.captionPlaceholder")} />
            <div className="pm-tags-block">
              <span className="pm-label">{t("post.tagPeopleCars")}</span>
              <PhotoTags photoId={photo.id} canEdit userId={userId} />
            </div>
            <div className="pm-actions">
              <button className="pm-btn ghost" onClick={close}>{t("post.cancel")}</button>
              <button className="pm-btn gold" onClick={save} disabled={saving}>{saving ? t("post.saving") : t("post.save")}</button>
            </div>
          </div>
        ) : (
          <div className="pm-history">
            {history == null ? <p className="muted">{t("common.loading")}</p>
              : history.length === 0 ? <p className="muted">{t("post.noHistory")}</p>
              : (
                <ul className="pm-hist-list">
                  {history.map((h) => (
                    <li key={h.id} className="pm-hist-item">
                      <div className="pm-hist-meta">@{h.editor?.username || "medlem"} · {timeAgo(h.created_at, lang)}</div>
                      <div className="pm-hist-diff">
                        <span className="pm-hist-old">{h.old_caption || t("post.emptyText")}</span>
                        <span className="pm-hist-arrow">→</span>
                        <span className="pm-hist-new">{h.new_caption || t("post.emptyText")}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="pm-wrap">
      <button className="pm-menu-btn" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} aria-label={t("post.menu")} aria-haspopup="true" aria-expanded={open}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
      </button>
      {open && (
        <div className="pm-menu" onClick={(e) => e.stopPropagation()}>
          {canEdit && <button className="pm-item" onClick={openEdit}>✏️ {t("post.edit")}</button>}
          {canHistory && <button className="pm-item" onClick={openHistory}>🕓 {t("post.history")}</button>}
        </div>
      )}
      {modal}
    </div>
  );
}
