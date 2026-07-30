"use client";

import { useEffect, useState } from "react";
import { getMembers, setMemberRole, renameMember, deleteMember } from "../lib/admin";
import { useAuth } from "../lib/AuthProvider";

export default function MemberManager() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(null);
  const [nameDraft, setNameDraft] = useState("");

  const load = () => getMembers().then(setMembers);
  useEffect(() => { load(); }, []);

  const toggleAdmin = async (m) => {
    const { error } = await setMemberRole(m.id, !m.is_admin);
    if (error) return setMsg("Kunne ikke ændre rolle — er migration 032 kørt?");
    setMsg(`${m.username} er nu ${!m.is_admin ? "admin" : "medlem"}.`);
    load();
  };
  const startRename = (m) => { setEditing(m.id); setNameDraft(m.username); };
  const saveRename = async (m) => {
    const { error } = await renameMember(m.id, nameDraft);
    if (error) return setMsg("Kunne ikke omdøbe — navnet er måske optaget (eller migration 032 mangler).");
    setEditing(null);
    setMsg(`Omdøbt til ${nameDraft}.`);
    load();
  };
  const remove = async (m) => {
    const typed = prompt(`Fjern ${m.username} PERMANENT?\n\nDette sletter deres profil, biler og fotos og kan ikke fortrydes. Skriv brugernavnet for at bekræfte:`);
    if (typed === null) return;
    if (typed !== m.username) { setMsg("Bekræftelse matchede ikke — intet blev slettet."); return; }
    const { error } = await deleteMember(m.id);
    if (error) return setMsg("Kunne ikke fjerne medlem — er migration 032 kørt?");
    setMsg(`${m.username} er fjernet.`);
    load();
  };

  return (
    <section className="member-section">
      <span className="overline">Medlemmer ({members.length})</span>
      <p className="member-note">Giv eller fjern admin, omdøb, eller fjern et medlem. Fjernelse er permanent og sletter deres data.</p>
      {msg && <p className="mm-msg">{msg}</p>}
      <div className="mm-list">
        {members.map((m) => (
          <div className="mm-row" key={m.id}>
            <div className="mm-meta">
              {editing === m.id ? (
                <input className="mm-input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus />
              ) : (
                <span className="mm-name">{m.username}</span>
              )}
              {m.is_admin && <span className="dk-chip ok">admin</span>}
              {m.id === user?.id && <span className="dk-chip warn">dig</span>}
            </div>
            <div className="mm-actions">
              {editing === m.id ? (
                <>
                  <button className="uv-mini" onClick={() => saveRename(m)}>Gem</button>
                  <button className="uv-mini" onClick={() => setEditing(null)}>Fortryd</button>
                </>
              ) : (
                <>
                  <button className="uv-mini" onClick={() => toggleAdmin(m)}>{m.is_admin ? "Fjern admin" : "Gør admin"}</button>
                  <button className="uv-mini" onClick={() => startRename(m)}>Omdøb</button>
                  {m.id !== user?.id && <button className="uv-mini uv-mini-del" onClick={() => remove(m)}>Fjern</button>}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
