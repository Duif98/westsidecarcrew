"use client";

import { useEffect, useState } from "react";
import { CARE_CATEGORIES, getCarProducts, addCarProduct, deleteCarProduct, saveOwnerReview } from "../lib/carcare";

// Lets an owner note the products/fluids they run on one of their cars, plus a
// short owner review. Writes rely on the "car_products …own…" + "albums update
// own" RLS policies, so it only works for the member's own cars.
export default function CarCareEditor({ album, userId, onReviewSaved }) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [review, setReview] = useState(album.owner_review || "");
  const [draft, setDraft] = useState({ category: CARE_CATEGORIES[0], name: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (open) getCarProducts(album.id).then(setProducts);
  }, [open, album.id]);

  const add = async () => {
    if (!draft.name.trim()) return;
    setBusy(true);
    try {
      const row = await addCarProduct({ albumId: album.id, userId, category: draft.category, name: draft.name, note: draft.note });
      setProducts((p) => [...p, row]);
      setDraft({ category: draft.category, name: "", note: "" });
    } catch (e) { alert("Kunne ikke tilføje: " + (e.message || e)); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await deleteCarProduct(id); setProducts((p) => p.filter((x) => x.id !== id)); }
    catch (e) { alert(e.message || String(e)); }
  };

  const saveReview = async () => {
    setBusy(true); setSavedMsg("");
    try { await saveOwnerReview(album.id, review); onReviewSaved?.(review.trim() || null); setSavedMsg("✓ Gemt"); setTimeout(() => setSavedMsg(""), 2000); }
    catch (e) { alert("Kunne ikke gemme: " + (e.message || e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="cie">
      <button className="ph-btn cie-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "Luk" : `🧴 ${album.make || album.title}`}
      </button>
      {open && (
        <div className="cie-form care-form">
          <label className="post-field"><span>Ejerens ord (valgfri)</span>
            <textarea rows={3} value={review} onChange={(e) => setReview(e.target.value)} placeholder="Sådan er den at eje — hvad koster den i drift, hvad går i stykker, er den pengene værd…" maxLength={800} />
          </label>
          <button className="ph-btn" style={{ width: "auto", flex: "none" }} onClick={saveReview} disabled={busy}>{busy ? "Gemmer…" : "Gem ejer-note"}{savedMsg && <span style={{ marginLeft: 8, color: "#4ec27a" }}>{savedMsg}</span>}</button>

          <div className="care-divider" />
          <span className="care-label">Produkter & væsker</span>

          {products.length > 0 && (
            <div className="care-list">
              {products.map((p) => (
                <div className="care-row" key={p.id}>
                  <span className="care-cat">{p.category}</span>
                  <span className="care-name">{p.name}{p.note ? <span className="care-note"> · {p.note}</span> : null}</span>
                  <button className="care-del" onClick={() => remove(p.id)} aria-label="Fjern" title="Fjern">✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="care-add">
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {CARE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="fx Castrol Edge 5W-30" maxLength={80}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
            <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="note (valgfri)" maxLength={80}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
            <button className="btn-gold" style={{ width: "auto", flex: "none" }} onClick={add} disabled={busy || !draft.name.trim()}>Tilføj</button>
          </div>
        </div>
      )}
    </div>
  );
}
