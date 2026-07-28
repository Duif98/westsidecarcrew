"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { getAlbums } from "../lib/albums";
import { uploadPhoto } from "../lib/photos";

// Admin: assign each car (album) to a member and edit its VIN. Assigning sets
// albums.created_by so the car shows on that member's profile; the VIN feeds
// the members-only parts catalog. Both writes rely on the "albums update admin"
// RLS policy — no extra RPC needed.
export default function CarManager() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [busy, setBusy] = useState(null);
  const [vinDraft, setVinDraft] = useState({});
  const [upState, setUpState] = useState({}); // { [albumId]: "3/5" | "✓ 5 uploadet" | "fejl: …" }
  const fileRefs = useRef({});

  const load = async () => {
    const [al, { data: pf }] = await Promise.all([
      getAlbums(),
      supabase.from("profiles").select("id, username").order("username"),
    ]);
    setAlbums(al);
    setProfiles(pf || []);
  };
  useEffect(() => { load(); }, []);

  const usernameById = Object.fromEntries(profiles.map((p) => [p.id, p.username]));

  const assign = async (albumId, userId) => {
    setBusy(albumId);
    const { error } = await supabase.from("albums").update({ created_by: userId || null }).eq("id", albumId);
    setBusy(null);
    if (error) { alert(error.message); return; }
    load();
  };

  // Admin uploads photos straight into a car's showcase: attributed to the car's
  // owner (so they appear as part of that member's garage), public + approved so
  // they show on the front page immediately.
  const uploadToCar = async (album, fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const ownerId = album.created_by || user.id;
    // Prefer attributing to the car's owner; if migration 021 isn't run yet the
    // insert is blocked, so fall back to attributing to the admin (still lands in
    // the car's showcase via album_id).
    let attributeOwner = ownerId !== user.id;
    let done = 0;
    setUpState((s) => ({ ...s, [album.id]: `0/${files.length}` }));
    try {
      for (const file of files) {
        const base = { file, isPublic: true, car: album.title, userId: user.id, albumId: album.id, approved: true };
        try {
          await uploadPhoto({ ...base, ownerId: attributeOwner ? ownerId : user.id });
        } catch (e) {
          if (!attributeOwner) throw e;
          attributeOwner = false; // 021 not run — attribute to admin from here on
          await uploadPhoto({ ...base, ownerId: user.id });
        }
        done++;
        setUpState((s) => ({ ...s, [album.id]: `${done}/${files.length}` }));
      }
      setUpState((s) => ({ ...s, [album.id]: `✓ ${done} uploadet` }));
    } catch (e) {
      setUpState((s) => ({ ...s, [album.id]: "fejl: " + (e.message || e) }));
    }
  };

  const saveVin = async (albumId) => {
    const vin = (vinDraft[albumId] ?? "").trim().toUpperCase();
    setBusy(albumId);
    const { error } = await supabase.from("albums").update({ vin: vin || null }).eq("id", albumId);
    setBusy(null);
    if (error) { alert(error.message); return; }
    setVinDraft((d) => { const n = { ...d }; delete n[albumId]; return n; });
    load();
  };

  return (
    <div className="member-section">
      <span className="overline">Biler — tildel & VIN ({albums.length})</span>
      <p className="member-note">Tildel en bil til et medlem (så den vises på deres profil), og rediger bilens VIN til reservedelskataloget.</p>

      <div className="cm-list">
        {albums.map((a) => {
          const draft = vinDraft[a.id] ?? (a.vin || "");
          const dirty = draft.trim().toUpperCase() !== (a.vin || "");
          return (
            <div className="cm-row" key={a.id}>
              <div className="cm-car">
                <b>{a.title}</b>
                <span className="cm-sub">
                  {a.owner_name || "—"}
                  {a.created_by ? ` · @${usernameById[a.created_by] || "?"}` : " · ikke tildelt"}
                </span>
              </div>

              <label className="cm-field">
                <span>Tildel til</span>
                <select value={a.created_by || ""} onChange={(e) => assign(a.id, e.target.value)} disabled={busy === a.id}>
                  <option value="">— ikke tildelt —</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>@{p.username}</option>)}
                </select>
              </label>

              <label className="cm-field">
                <span>VIN</span>
                <div className="cm-vin">
                  <input
                    value={draft}
                    onChange={(e) => setVinDraft({ ...vinDraft, [a.id]: e.target.value.toUpperCase() })}
                    placeholder="17 tegn" maxLength={17} spellCheck={false}
                  />
                  <button className="ph-btn" onClick={() => saveVin(a.id)} disabled={busy === a.id || !dirty}>Gem</button>
                </div>
              </label>

              <label className="cm-field">
                <span>Billeder</span>
                <div className="cm-upload">
                  <input
                    ref={(el) => (fileRefs.current[a.id] = el)}
                    type="file" accept="image/*" multiple hidden
                    onChange={(e) => { uploadToCar(a, e.target.files); e.target.value = ""; }}
                  />
                  <button className="ph-btn" onClick={() => fileRefs.current[a.id]?.click()}>+ Upload billeder</button>
                  {upState[a.id] && <span className="cm-upmsg">{upState[a.id]}</span>}
                </div>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
