"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

// ---- Tyre maths (pure) --------------------------------------------------
const MM_IN = 25.4;
const sidewall = (w, a) => (w * a) / 100;                      // mm
const diameter = (w, a, rim) => rim * MM_IN + 2 * sidewall(w, a); // mm (overall)
const circ = (d) => Math.PI * d;                              // mm
const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const f1 = (n) => (Math.round(n * 10) / 10).toLocaleString("da-DK");
const f0 = (n) => Math.round(n).toLocaleString("da-DK");

const sizeStr = (w, a, rim) => `${w}/${a} R${rim}`;
const parseSize = (s) => { const m = String(s).match(/(\d{3})\s*\/\s*(\d{2})\s*R?\s*(\d{2})/i); return m ? { w: +m[1], a: +m[2], rim: +m[3] } : null; };

// Rim-width → fitment table (industry-standard ±): min/rec/max tyre width in mm.
const rimTable = () => {
  const rows = [];
  for (let r = 5; r <= 12.5 + 1e-9; r += 0.5) {
    const min = Math.round(155 + (r - 5) * 20);
    rows.push({ r, min, max: min + 30, rec: [min + 10, min + 20] });
  }
  return rows;
};

// Typical OEM sizes (guideline — always verify against the door-jamb label).
const PRESETS = [
  { name: "Audi RS3 (8Y)", front: "265/30 R19", rear: "265/30 R19", note: "Kvadratisk – samme for/bag (Quattro)" },
  { name: "Audi RS4 (B9)", front: "275/30 R20", rear: "275/30 R20" },
  { name: "Audi RS5 (B9)", front: "275/30 R20", rear: "275/30 R20" },
  { name: "Audi RS6 (C8)", front: "285/30 R22", rear: "285/30 R22", note: "Også 275/35 R21" },
  { name: "Audi RS7 (C8)", front: "285/30 R22", rear: "285/30 R22" },
  { name: "Audi R8 (4S)", front: "245/30 R20", rear: "305/30 R20", note: "Staggered" },
  { name: "Audi TT RS (8S)", front: "245/35 R19", rear: "245/35 R19" },
  { name: "Audi S3 (8Y)", front: "235/35 R19", rear: "235/35 R19" },
  { name: "BMW M2 (G87)", front: "275/35 R19", rear: "285/30 R20" },
  { name: "BMW M3/M4 (G8x)", front: "275/35 R19", rear: "285/30 R20" },
  { name: "BMW M3/M4 (F8x)", front: "255/35 R19", rear: "275/35 R19" },
  { name: "BMW M5 (F90)", front: "275/35 R20", rear: "285/35 R20", note: "M xDrive" },
  { name: "Mercedes-AMG C63 (W205)", front: "245/35 R19", rear: "265/35 R19" },
  { name: "Mercedes-AMG E63 S (W213)", front: "265/35 R20", rear: "295/30 R20", note: "4MATIC+" },
  { name: "VW Golf R (Mk8)", front: "235/35 R19", rear: "235/35 R19" },
  { name: "Porsche 911 Carrera (992)", front: "245/35 R20", rear: "305/30 R21", note: "Staggered, forskellig fælgstr." },
];

const STD_ASPECTS = [25, 30, 35, 40, 45, 50, 55];
const devStatus = (dev) => {
  const a = Math.abs(dev);
  if (a <= 0.5) return { cls: "ok", label: "Matcher" };
  if (a <= 1.0) return { cls: "warn", label: "Acceptabelt" };
  return { cls: "bad", label: "For stor forskel" };
};

const clampStr = (n, step, min, max) => {
  const c = Math.min(max, Math.max(min, n));
  return step < 1 ? String(Math.round(c * 10) / 10) : String(Math.round(c));
};

// Numeric field with −/+ steppers. On focus the value is selected so typing
// replaces it straight away (fixes the iOS "cursor lands on the left" annoyance).
function Stepper({ label, value, onChange, step = 1, min = 0, max = 999 }) {
  const bump = (dir) => {
    const v = parseFloat(value);
    onChange(clampStr((isFinite(v) ? v : 0) + dir * step, step, min, max));
  };
  return (
    <div className="stp">
      {label && <span className="stp-lab">{label}</span>}
      <div className="stp-row">
        <button type="button" className="stp-btn" onClick={() => bump(-1)} aria-label="mindre">−</button>
        <input
          inputMode="decimal" value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => { const el = e.target; setTimeout(() => { try { el.select(); } catch {} }, 0); }}
        />
        <button type="button" className="stp-btn" onClick={() => bump(1)} aria-label="mere">+</button>
      </div>
    </div>
  );
}

export default function DaekPage() {
  const [single, setSingle] = useState({ w: "225", a: "40", rim: "18" });
  const [cmpA, setCmpA] = useState({ w: "225", a: "40", rim: "18" });
  const [cmpB, setCmpB] = useState({ w: "235", a: "35", rim: "19" });
  const [rimW, setRimW] = useState("9");
  // Rolling-diameter match: one side locked (reference), the other suggested.
  const [lock, setLock] = useState("rear");
  const [ref, setRef] = useState({ w: "285", a: "30", rim: "20" });
  const [other, setOther] = useState({ w: "255", rim: "20" });

  // --- single tyre ---
  const sD = diameter(num(single.w), num(single.a), num(single.rim));

  // --- compare ---
  const dA = diameter(num(cmpA.w), num(cmpA.a), num(cmpA.rim));
  const dB = diameter(num(cmpB.w), num(cmpB.a), num(cmpB.rim));
  const diffPct = dA ? ((dB - dA) / dA) * 100 : 0;
  const trueAt100 = dA ? (100 * dB) / dA : 0; // speedo shows 100 (set for A), real speed on B

  // --- rim table ---
  const rows = useMemo(rimTable, []);

  // --- match ---
  const refD = diameter(num(ref.w), num(ref.a), num(ref.rim));
  const oW = num(other.w), oRim = num(other.rim);
  const idealAspect = oW ? ((refD - oRim * MM_IN) / (2 * oW)) * 100 : 0;
  const options = useMemo(() => {
    if (!refD || !oW || !oRim) return [];
    return STD_ASPECTS.map((a) => {
      const d = diameter(oW, a, oRim);
      return { a, d, dev: ((d - refD) / refD) * 100 };
    }).sort((x, y) => Math.abs(x.dev) - Math.abs(y.dev));
  }, [refD, oW, oRim]);
  const otherLabel = lock === "rear" ? "for" : "bag";
  const refLabel = lock === "rear" ? "bag" : "for";

  const applyPreset = (p) => {
    const r = parseSize(p.rear), fr = parseSize(p.front);
    if (r) setRef({ w: String(r.w), a: String(r.a), rim: String(r.rim) });
    if (fr) setOther({ w: String(fr.w), rim: String(fr.rim) });
    setLock("rear");
  };

  const Size3 = ({ val, on }) => (
    <div className="dk-sizes">
      <Stepper label="Bredde" value={val.w} step={10} min={125} max={385} onChange={(w) => on({ ...val, w })} />
      <Stepper label="Profil" value={val.a} step={5} min={20} max={85} onChange={(a) => on({ ...val, a })} />
      <Stepper label="Fælg (″)" value={val.rim} step={1} min={10} max={24} onChange={(rim) => on({ ...val, rim })} />
    </div>
  );

  return (
    <main className="member daek-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/medlem" className="mlink">Medlem</Link>
            <Link href="/#garagen" className="mlink">Garagen</Link>
          </div>
        </div>
      </div>

      <div className="wrap daek-body">
        <span className="overline">Værktøj</span>
        <h1 className="member-title">Dæk & fælge</h1>
        <p className="daek-intro">Regn på dæk- og fælgstørrelser: hvad passer på fælgen, hvor meget flytter speedometeret sig, og — vigtigst for Quattro/AWD — find en for-størrelse med samme rullediameter som bag.</p>

        {/* 1. Rim width → tyre width */}
        <section className="dk-card">
          <h2 className="dk-h">1 · Hvilke dæk passer på fælgen?</h2>
          <p className="dk-sub">Vælg din fælgbredde i tommer og se min./anbefalet/maks. dækbredde.</p>
          <div className="dk-rimw">
            <Stepper label="Fælgbredde (tommer)" value={rimW} step={0.5} min={4} max={14} onChange={setRimW} />
          </div>
          <div className="dk-scroll">
            <table className="dk-table">
              <thead><tr><th>Fælg</th><th>Min.</th><th>Anbefalet</th><th>Maks.</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.r} className={Math.abs(r.r - num(rimW)) < 0.25 ? "hit" : ""}>
                    <td>{f1(r.r)}″</td><td>{r.min} mm</td><td>{r.rec[0]}–{r.rec[1]} mm</td><td>{r.max} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Single tyre info */}
        <section className="dk-card">
          <h2 className="dk-h">2 · Læs en dækstørrelse</h2>
          <Size3 val={single} on={setSingle} />
          <div className="dk-out">
            <div><b>{f0(sidewall(num(single.w), num(single.a)))} mm</b><span>Sidehøjde</span></div>
            <div><b>{f0(sD)} mm</b><span>Ydre diameter</span></div>
            <div><b>{f1(sD / MM_IN)}″</b><span>Diameter</span></div>
            <div><b>{f0(circ(sD))} mm</b><span>Omkreds</span></div>
            <div><b>{f0(sD ? 1e6 / circ(sD) : 0)}</b><span>Omdr./km</span></div>
          </div>
        </section>

        {/* 3. Compare / speedo */}
        <section className="dk-card">
          <h2 className="dk-h">3 · Sammenlign & speedometer-afvigelse</h2>
          <div className="dk-cmp">
            <div><span className="dk-lab">Nuværende</span><Size3 val={cmpA} on={setCmpA} /></div>
            <div><span className="dk-lab">Ny</span><Size3 val={cmpB} on={setCmpB} /></div>
          </div>
          <div className="dk-out">
            <div><b>{dB - dA >= 0 ? "+" : ""}{f0(dB - dA)} mm</b><span>Diameter-forskel</span></div>
            <div className={Math.abs(diffPct) > 3 ? "bad" : Math.abs(diffPct) > 1.5 ? "warn" : "ok"}><b>{diffPct >= 0 ? "+" : ""}{f1(diffPct)} %</b><span>Afvigelse</span></div>
            <div><b>{(dB - dA) >= 0 ? "+" : ""}{f1((dB - dA) / 2)} mm</b><span>Frihøjde-ændring</span></div>
            <div><b>{f0(trueAt100)} km/t</b><span>Reel fart v. speedo 100</span></div>
          </div>
          <p className="dk-note">Tommelfingerregel: hold diameter-afvigelsen under ~3 % af hensyn til speedometer, ABS og frihøjde.</p>
        </section>

        {/* 4. Rolling-diameter match */}
        <section className="dk-card dk-star">
          <h2 className="dk-h">4 · Rullediameter-match (Quattro/AWD) ⭐</h2>
          <p className="dk-sub">På firehjulstræk <b>skal</b> for og bag have stort set samme rullediameter — ellers slider centerdifferentialet. Fastlås én side, så foreslår vi størrelser til den anden.</p>

          <div className="dk-seg">
            <button className={lock === "rear" ? "on" : ""} onClick={() => setLock("rear")}>Fastlås bag → find for</button>
            <button className={lock === "front" ? "on" : ""} onClick={() => setLock("front")}>Fastlås for → find bag</button>
          </div>

          <div className="dk-cmp">
            <div>
              <span className="dk-lab">{refLabel === "bag" ? "Bag (fastlåst)" : "For (fastlåst)"}</span>
              <Size3 val={ref} on={setRef} />
              <span className="dk-mini">Rullediameter: <b>{f0(refD)} mm</b> · omkreds {f0(circ(refD))} mm</span>
            </div>
            <div>
              <span className="dk-lab">{otherLabel === "for" ? "For (ønsket bredde/fælg)" : "Bag (ønsket bredde/fælg)"}</span>
              <div className="dk-sizes">
                <Stepper label="Bredde" value={other.w} step={10} min={125} max={385} onChange={(w) => setOther({ ...other, w })} />
                <div className="stp"><span className="stp-lab">Profil</span><div className="stp-q">?</div></div>
                <Stepper label="Fælg (″)" value={other.rim} step={1} min={10} max={24} onChange={(rim) => setOther({ ...other, rim })} />
              </div>
              <span className="dk-mini">Ideel profil: <b>{oW && refD ? f1(idealAspect) : "–"}</b> (mål)</span>
            </div>
          </div>

          {options.length > 0 && (
            <div className="dk-scroll">
              <table className="dk-table dk-opts">
                <thead><tr><th>Forslag til {otherLabel}</th><th>Diameter</th><th>Afvigelse</th><th>Vurdering</th></tr></thead>
                <tbody>
                  {options.map((o) => {
                    const st = devStatus(o.dev);
                    return (
                      <tr key={o.a} className={st.cls}>
                        <td><b>{sizeStr(oW, o.a, oRim)}</b></td>
                        <td>{f0(o.d)} mm</td>
                        <td>{o.dev >= 0 ? "+" : ""}{f1(o.dev)} %</td>
                        <td><span className={`dk-chip ${st.cls}`}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="dk-note">Grøn = under 0,5 % (anbefalet til AWD) · gul = under 1 % · rød = for stor forskel. Er du i tvivl, så spørg en fælg-/dækspecialist før du køber.</p>
        </section>

        {/* 5. OEM presets */}
        <section className="dk-card">
          <h2 className="dk-h">5 · Typiske OEM-størrelser</h2>
          <p className="dk-sub">Vælg en bil for at se de gængse original-størrelser — og få dem sat direkte ind i rullediameter-matcheren ovenfor.</p>
          <div className="dk-presets">
            {PRESETS.map((p) => {
              const fr = parseSize(p.front), r = parseSize(p.rear);
              const square = p.front === p.rear;
              const dFr = fr ? diameter(fr.w, fr.a, fr.rim) : 0;
              const dR = r ? diameter(r.w, r.a, r.rim) : 0;
              const dev = dR ? ((dFr - dR) / dR) * 100 : 0;
              return (
                <div className="dk-preset" key={p.name}>
                  <div className="dk-preset-head">
                    <b>{p.name}</b>
                    <button className="dk-preset-use" onClick={() => applyPreset(p)}>Brug ↑</button>
                  </div>
                  <div className="dk-preset-sizes">
                    <span>For: <b>{p.front}</b></span>
                    <span>Bag: <b>{p.rear}</b></span>
                    {!square && <span className={`dk-chip ${devStatus(dev).cls}`}>Δ {f1(dev)} %</span>}
                    {square && <span className="dk-chip ok">Kvadratisk</span>}
                  </div>
                  {p.note && <span className="dk-preset-note">{p.note}</span>}
                </div>
              );
            })}
          </div>
          <p className="dk-note">Vejledende. Tjek altid din bils dæk-mærkat (dørkarm/tankdæksel) og lokale regler før du skifter størrelse.</p>
        </section>

        <p className="daek-foot"><Link href="/medlem" className="c-link">← Tilbage til medlemsområdet</Link></p>
      </div>
    </main>
  );
}
