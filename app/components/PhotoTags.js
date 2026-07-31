"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPhotoTags, addUserTag, addAlbumTag, removeTag, fetchTaggableMembers, fetchTaggableCars } from "../lib/tags";
import { useT } from "../lib/i18n";

// Shows who / which cars are tagged in a photo as linked chips. The photo owner
// or an admin gets an inline editor to add and remove tags. Fail-safe: before
// 035 is run, fetch returns [] and the section simply shows nothing.
export default function PhotoTags({ photoId, canEdit, userId }) {
  const { t } = useT();
  const [tags, setTags] = useState([]);
  const [editing, setEditing] = useState(false);
  const [members, setMembers] = useState([]);
  const [cars, setCars] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    fetchPhotoTags(photoId).then((t) => on && setTags(t));
    return () => { on = false; };
  }, [photoId]);

  const openEditor = async () => {
    setEditing(true);
    if (!members.length) setMembers(await fetchTaggableMembers());
    if (!cars.length) setCars(await fetchTaggableCars());
  };

  const reload = async () => setTags(await fetchPhotoTags(photoId));

  const addMember = async (e) => {
    const id = e.target.value; e.target.value = "";
    if (!id || busy) return;
    setBusy(true);
    try { await addUserTag({ photoId, userId: id, createdBy: userId }); await reload(); } catch {}
    setBusy(false);
  };
  const addCar = async (e) => {
    const id = e.target.value; e.target.value = "";
    if (!id || busy) return;
    setBusy(true);
    try { await addAlbumTag({ photoId, albumId: id, createdBy: userId }); await reload(); } catch {}
    setBusy(false);
  };
  const remove = async (id) => {
    setTags((prev) => prev.filter((t) => t.id !== id)); // optimistic
    try { await removeTag(id); } catch { reload(); }
  };

  if (!tags.length && !canEdit) return null;

  return (
    <div className="ptg">
      {tags.length > 0 && (
        <div className="ptg-chips">
          {tags.map((tag) => (
            <span key={tag.id} className={`ptg-chip ptg-${tag.kind}`}>
              <span aria-hidden="true">{tag.kind === "user" ? "👤" : "🚗"}</span>
              {tag.href ? <Link href={tag.href} className="ptg-link">{tag.kind === "user" ? "@" : ""}{tag.label}</Link> : <span>{tag.label}</span>}
              {canEdit && <button type="button" className="ptg-x" onClick={() => remove(tag.id)} aria-label={t("tag.remove")}>×</button>}
            </span>
          ))}
        </div>
      )}
      {canEdit && (editing ? (
        <div className="ptg-editor">
          <select defaultValue="" onChange={addMember} disabled={busy} aria-label={t("tag.person")}>
            <option value="" disabled>{t("tag.person")}…</option>
            {members.map((m) => <option key={m.id} value={m.id}>@{m.username}</option>)}
          </select>
          <select defaultValue="" onChange={addCar} disabled={busy} aria-label={t("tag.car")}>
            <option value="" disabled>{t("tag.car")}…</option>
            {cars.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button type="button" className="ptg-done" onClick={() => setEditing(false)}>{t("tag.done")}</button>
        </div>
      ) : (
        <button type="button" className="ptg-add" onClick={openEditor}>+ {t("tag.add")}</button>
      ))}
    </div>
  );
}
