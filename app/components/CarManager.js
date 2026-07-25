"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getAlbums } from "../lib/albums";

// Admin: assign each car (album) to a member and edit its VIN. Assigning sets
// albums.created_by so the car shows on that member's profile; the VIN feeds
// the members-only parts catalog. Both writes rely on the "albums update admin"
// RLS policy — no extra RPC needed.
export default function CarManager() {
  const [albums, setAlbums] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [busy, setBusy] = useState(null);
  const [vinDraft, setVinDraft] = useState({});

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
            </div>
          );
        })}
      </div>
    </div>
  );
}
