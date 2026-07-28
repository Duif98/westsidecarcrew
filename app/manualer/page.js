"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import { getAlbums } from "../lib/albums";
import { getCarDocs, uploadCarDoc, createLinkDoc, deleteCarDoc, docUrl } from "../lib/cardocs";

const DOC_TYPES = ["Servicemanual", "Ejermanual", "Reparationsvejledning", "El-diagram", "Andet"];

// Members-only catalogue of car documents (service manuals etc). Everyone can
// download; admins upload/remove. Files are private (signed URLs).
export default function Manualer() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [mode, setMode] = useState("file"); // "file" | "link"
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  const load = async () => {
    const [al, dc] = await Promise.all([getAlbums(), getCarDocs()]);
    setAlbums(al);
    setDocs(dc);
  };
  useEffect(() => { if (session) load(); }, [session]);

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  const countFor = (albumId) => docs.filter((d) => d.album_id === albumId).length;
  // Every member can add docs, so show every car.
  const cars = albums;
  const selDocs = selected ? docs.filter((d) => d.album_id === selected.id) : [];

  const open = async (doc) => {
    if (doc.link_url) { window.open(doc.link_url, "_blank", "noopener"); return; }
    const url = await docUrl(doc.file_path);
    if (url) window.open(url, "_blank", "noopener");
  };

  const addLink = async () => {
    if (!selected) return;
    if (!title.trim()) { setMsg("Giv dokumentet en titel."); return; }
    setBusy(true); setMsg("");
    try {
      await createLinkDoc({ title, docType, linkUrl, albumId: selected.id, userId: user.id });
      setTitle(""); setLinkUrl("");
      await load();
      setMsg("✓ Link tilføjet.");
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const upload = async (fileList) => {
    const file = Array.from(fileList || [])[0];
    if (!file || !selected) return;
    if (!title.trim()) { setMsg("Giv dokumentet en titel."); return; }
    setBusy(true); setMsg("");
    try {
      await uploadCarDoc({ file, title, docType, albumId: selected.id, userId: user.id });
      setTitle("");
      await load();
      setMsg("✓ Uploadet.");
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (doc) => {
    if (!confirm("Slet dette dokument?")) return;
    await deleteCarDoc(doc);
    await load();
  };

  return (
    <main className="member pk-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            {isAdmin && <Link href="/admin" className="mlink gold">Admin</Link>}
            <span className="mlink muted">@{profile?.username}</span>
            <button className="mlink" onClick={() => { signOut(); router.replace("/"); }}>Log ud</button>
          </div>
        </div>
      </div>

      <div className="wrap pk-body">
        <span className="overline">Manualer</span>

        {!selected ? (
          <>
            <h1 className="pk-title">Bil-manualer</h1>
            <p className="pk-intro">Service- og ejermanualer m.m. pr. bil. Vælg en bil for at hente dokumenterne — eller for at lægge en fil eller et link op til enhver bil.</p>
            {cars.length === 0 ? (
              <p className="pk-empty">Der er ingen biler endnu.</p>
            ) : (
              <div className="pk-grid">
                {cars.map((c) => {
                  const n = countFor(c.id);
                  return (
                    <button key={c.id} className="pk-card" onClick={() => { setSelected(c); setMsg(""); }}>
                      <span className="pk-car">{c.make || c.title}</span>
                      <span className="pk-meta">
                        {c.owner_name && <span className="pk-owner">{c.owner_name}</span>}
                        {c.owner_name && n ? <span className="pk-sep" /> : null}
                        <span>{n ? `${n} dokument${n === 1 ? "" : "er"}` : "Ingen endnu"}</span>
                      </span>
                      <span className="pk-go">{n ? "Åbn →" : "Tilføj →"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <button className="pk-back" onClick={() => setSelected(null)}>← Alle biler</button>
            <h1 className="pk-title">{selected.make || selected.title}</h1>
            <p className="pk-intro">{[selected.owner_name, selected.model].filter(Boolean).join(" · ")}</p>

            <div className="md-list" style={{ marginTop: "1.2rem" }}>
              {selDocs.length === 0 ? (
                <p className="pk-empty">Ingen dokumenter til denne bil endnu.</p>
              ) : selDocs.map((d) => (
                <div className="doc-row" key={d.id}>
                  <span className="doc-ico" aria-hidden="true">{d.link_url ? "🔗" : "📄"}</span>
                  <button className="doc-open" onClick={() => open(d)}>
                    <span className="doc-title">{d.title}</span>
                    <span className="doc-sub">{[d.doc_type, d.link_url ? "Link" : d.file_name].filter(Boolean).join(" · ")}</span>
                  </button>
                  {(isAdmin || d.uploaded_by === user.id) && <button className="ph-btn del" style={{ flex: "none", width: "auto", padding: "0.35rem 0.7rem" }} onClick={() => remove(d)}>Slet</button>}
                </div>
              ))}
            </div>

            {session && (
              <div className="doc-upload">
                <span className="cp-label">Tilføj dokument</span>
                <div className="set-seg" style={{ marginTop: "0.6rem" }}>
                  <button className={mode === "file" ? "on" : ""} onClick={() => { setMode("file"); setMsg(""); }}>📄 Upload fil</button>
                  <button className={mode === "link" ? "on" : ""} onClick={() => { setMode("link"); setMsg(""); }}>🔗 Indsæt link</button>
                </div>
                <p className="set-hint">Filer op til 50 MB uploades direkte. Større filer (fx en stor PDF) lægges på Google Drive o.l. og indsættes som link.</p>
                <div className="doc-upform">
                  <input className="doc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel — fx Servicemanual 2018" maxLength={120} />
                  <select className="doc-input" value={docType} onChange={(e) => setDocType(e.target.value)}>
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {mode === "file" ? (
                    <>
                      <input ref={fileRef} type="file" hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
                      <button className="btn-gold" style={{ width: "auto" }} disabled={busy || !title.trim()} onClick={() => fileRef.current?.click()}>{busy ? "Uploader…" : "Vælg fil & upload"}</button>
                    </>
                  ) : (
                    <>
                      <input className="doc-input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://drive.google.com/…" />
                      <button className="btn-gold" style={{ width: "auto" }} disabled={busy || !title.trim() || !linkUrl.trim()} onClick={addLink}>{busy ? "Gemmer…" : "Tilføj link"}</button>
                    </>
                  )}
                </div>
                {msg && <div className={`auth-msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</div>}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
