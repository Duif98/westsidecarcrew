"use client";

// Shows how complete the member's own profile is + what's missing. Renders
// nothing once everything is filled in. Derived purely from existing data.
export default function ProfileCompletion({ profile, myCars = [], onEdit }) {
  const checks = [
    { ok: !!profile.avatar_path, label: "Profilbillede" },
    { ok: !!profile.cover_path, label: "Cover-billede" },
    { ok: !!(profile.bio && profile.bio.trim()), label: "Bio" },
    { ok: !!(profile.location && profile.location.trim()), label: "Lokation" },
    { ok: myCars.length > 0, label: "Mindst én bil" },
    { ok: myCars.some((a) => a.make || a.model), label: "Bil-specs" },
    { ok: myCars.some((a) => a.vin), label: "VIN på en bil" },
  ];
  const done = checks.filter((c) => c.ok).length;
  const pct = Math.round((done / checks.length) * 100);
  if (pct >= 100) return null;

  return (
    <section className="pc-card">
      <div className="pc-head">
        <span className="pc-title">Din profil er {pct}% færdig</span>
        {onEdit && <button type="button" className="uv-mini" onClick={onEdit}>Rediger profil</button>}
      </div>
      <div className="pc-bar"><div className="pc-fill" style={{ width: `${pct}%` }} /></div>
      <div className="pc-checks">
        {checks.map((c) => (
          <span key={c.label} className={`pc-check${c.ok ? " ok" : ""}`}>{c.ok ? "✓" : "○"} {c.label}</span>
        ))}
      </div>
    </section>
  );
}
