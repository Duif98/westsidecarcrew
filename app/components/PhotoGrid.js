"use client";

import LikeButton from "./LikeButton";

function statusChip(p) {
  if (p.visibility === "private") return { txt: "Privat", cls: "priv" };
  if (p.approved) return { txt: "På forsiden", cls: "pub" };
  return { txt: "Afventer godkendelse", cls: "wait" };
}

export default function PhotoGrid({ photos, showStatus, onDelete, renderActions, onOpen, userId, canLike, onNeedLogin }) {
  if (!photos.length) return null;
  return (
    <div className="ph-grid">
      {photos.map((p, idx) => {
        const s = statusChip(p);
        return (
          <figure className="ph-card" key={p.id}>
            <button className="ph-imgwrap" onClick={() => onOpen?.(idx)} aria-label={`Åbn ${p.car || "billede"}`}>
              {p.url ? <img src={p.url} alt={p.car || p.caption || "Bil"} loading="lazy" /> : <div className="ph-missing">Billede utilgængeligt</div>}
              {showStatus && <span className={`ph-chip ${s.cls}`}>{s.txt}</span>}
            </button>
            <figcaption className="ph-meta">
              <div className="ph-car">{p.car || "Uden titel"}</div>
              {p.caption && <div className="ph-cap">{p.caption}</div>}
              <div className="ph-metarow">
                <span className="ph-owner">@{p.profiles?.username || "medlem"}</span>
                <LikeButton photo={p} userId={userId} canLike={canLike} onNeedLogin={onNeedLogin} />
              </div>
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
