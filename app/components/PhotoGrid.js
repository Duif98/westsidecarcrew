"use client";

function statusChip(p) {
  if (p.visibility === "private") return { txt: "Privat", cls: "priv" };
  if (p.approved) return { txt: "På forsiden", cls: "pub" };
  return { txt: "Afventer godkendelse", cls: "wait" };
}

export default function PhotoGrid({ photos, showStatus, onDelete, renderActions }) {
  if (!photos.length) return <p className="ph-empty">Ingen billeder endnu.</p>;
  return (
    <div className="ph-grid">
      {photos.map((p) => {
        const s = statusChip(p);
        return (
          <figure className="ph-card" key={p.id}>
            <div className="ph-imgwrap">
              {p.url ? <img src={p.url} alt={p.car || p.caption || "Bil"} loading="lazy" /> : <div className="ph-missing">Billede utilgængeligt</div>}
              {showStatus && <span className={`ph-chip ${s.cls}`}>{s.txt}</span>}
            </div>
            <figcaption className="ph-meta">
              <div className="ph-car">{p.car || "Uden titel"}</div>
              {p.caption && <div className="ph-cap">{p.caption}</div>}
              <div className="ph-owner">@{p.profiles?.username || "medlem"}</div>
            </figcaption>
            {(onDelete || renderActions) && (
              <div className="ph-actions">
                {renderActions && renderActions(p)}
                {onDelete && <button className="ph-btn del" onClick={() => onDelete(p)}>Slet</button>}
              </div>
            )}
          </figure>
        );
      })}
    </div>
  );
}
