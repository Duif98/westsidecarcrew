"use client";

import { useState } from "react";
import Link from "next/link";

// ---- maths (pure, runs locally in the browser) -------------------------
const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : 0; };
const f1 = (n) => (Math.round(n * 10) / 10).toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f2 = (n) => (Math.round(n * 100) / 100).toLocaleString("da-DK");

// Octane gain scales with the mix ratio (ml booster per litre of fuel).
// A booster is rated on its label as: `doseMl` treats `refTank` litres for
// `ratedGain` octane. The actual gain is that, scaled by how your concentration
// compares to the rated one:
//   gain = ratedGain × (ml/tank) ÷ (doseMl/refTank)
function octaneGain({ ml, tank, doseMl, refTank, ratedGain }) {
  if (tank <= 0 || doseMl <= 0 || refTank <= 0) return 0;
  const actualConc = ml / tank;          // ml per litre
  const ratedConc = doseMl / refTank;    // ml per litre at the rated dose
  if (ratedConc <= 0) return 0;
  return ratedGain * (actualConc / ratedConc);
}

// Booster presets. Values are approximate label claims (manufacturers state
// "up to X octane" and it varies with dose) — verify against your own bottle,
// or pick "Brugerdefineret" and type the exact numbers. doseMl treats refTank
// litres for ratedGain octane (RON).
const PRODUCTS = [
  // These three have verified label dosing (thansen.dk product pages).
  { id: "sonax",     name: "SONAX Octane Power (250 ml)",              doseMl: 250, refTank: 50, ratedGain: 4 },
  { id: "putoline",  name: "Putoline Octan Booster (150 ml)",         doseMl: 150, refTank: 20, ratedGain: 5 },
  { id: "lindemann", name: "Lindemann Octan Boost Pro Racing (400 ml)", doseMl: 400, refTank: 60, ratedGain: 5 },
  // The rest are approximate typical values — verify against the bottle.
  { id: "liquimoly", name: "Liqui Moly Oktan Plus",       doseMl: 250, refTank: 70, ratedGain: 2 },
  { id: "bardahl",   name: "Bardahl Octane Booster",      doseMl: 300, refTank: 60, ratedGain: 3 },
  { id: "wynns",     name: "Wynn's Octane Booster",       doseMl: 325, refTank: 60, ratedGain: 3 },
  { id: "stp",       name: "STP Octane Booster",          doseMl: 200, refTank: 55, ratedGain: 2 },
  { id: "nos",       name: "NOS Racing Formula",          doseMl: 355, refTank: 60, ratedGain: 5 },
  { id: "torco",     name: "Torco Accelerator (race)",    doseMl: 240, refTank: 60, ratedGain: 5 },
  { id: "boostane",  name: "BOOSTane Professional",       doseMl: 473, refTank: 60, ratedGain: 7 },
  { id: "mild",      name: "Generisk — mild",             doseMl: 300, refTank: 60, ratedGain: 2 },
  { id: "medium",    name: "Generisk — middel",           doseMl: 300, refTank: 60, ratedGain: 4 },
  { id: "strong",    name: "Generisk — kraftig",          doseMl: 300, refTank: 60, ratedGain: 6 },
];

function Stepper({ label, value, onChange, step = 1, min = 0, max = 9999, unit }) {
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const bump = (dir) => {
    const v = parseFloat(String(value).replace(",", "."));
    const nv = clamp((isFinite(v) ? v : 0) + dir * step);
    onChange(step < 1 ? String(Math.round(nv * 100) / 100) : String(Math.round(nv)));
  };
  return (
    <div className="stp">
      {label && <span className="stp-lab">{label}{unit ? ` (${unit})` : ""}</span>}
      <div className="stp-row">
        <button type="button" className="stp-btn" onClick={() => bump(-1)} aria-label="mindre">−</button>
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => { const el = e.target; setTimeout(() => { try { el.select(); } catch {} }, 0); }} />
        <button type="button" className="stp-btn" onClick={() => bump(1)} aria-label="mere">+</button>
      </div>
    </div>
  );
}

export default function OktanPage() {
  const [base, setBase] = useState(95);          // base fuel octane (RON)
  const [tank, setTank] = useState("60");        // litres
  const [ml, setMl] = useState("300");           // ml booster added
  const [productId, setProductId] = useState("sonax");
  const [spec, setSpec] = useState({ doseMl: "300", refTank: "60", ratedGain: "4" });

  // Active booster strength: the chosen product, or the custom label entry.
  const isCustom = productId === "custom";
  const product = PRODUCTS.find((p) => p.id === productId) || PRODUCTS[0];
  const strength = isCustom
    ? { doseMl: num(spec.doseMl), refTank: num(spec.refTank), ratedGain: num(spec.ratedGain) }
    : { doseMl: product.doseMl, refTank: product.refTank, ratedGain: product.ratedGain };

  const tankL = num(tank);
  const mlAdded = num(ml);
  const gain = octaneGain({ ml: mlAdded, tank: tankL, doseMl: strength.doseMl, refTank: strength.refTank, ratedGain: strength.ratedGain });
  const finalOctane = base + gain;

  const mlPerL = tankL > 0 ? mlAdded / tankL : 0;
  const pct = tankL > 0 ? (mlAdded / (tankL * 1000)) * 100 : 0;
  const ratedConc = strength.refTank > 0 ? strength.doseMl / strength.refTank : 0;
  const overdose = ratedConc > 0 && mlPerL > ratedConc * 2.5;
  // Recommended dose for this booster scaled to the actual tank (same mix ratio).
  const recMl = strength.refTank > 0 && tankL > 0 ? Math.round(strength.doseMl * (tankL / strength.refTank)) : 0;

  const setSpecK = (k) => (v) => setSpec({ ...spec, [k]: v });

  return (
    <main className="member daek-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/daek" className="mlink">Dæk & fælge</Link>
            <Link href="/daektryk" className="mlink">Dæktryk</Link>
          </div>
        </div>
      </div>

      <div className="wrap daek-body">
        <span className="overline">Værktøj · brændstof</span>
        <h1 className="member-title">Oktan-booster</h1>
        <p className="daek-intro">Regn ud hvor mange oktan (RON) du ender på, når du hælder booster i tanken. Sæt tankstørrelse, hvilken benzin du har tanket, og hvor mange <b>ml</b> booster du tilføjer — så får du det endelige oktantal. Oktan-stigningen følger <b>blandingsforholdet</b> (ml pr. liter), så en dosis virker mest i en lille tank. Alt regnes lokalt i din browser.</p>

        <section className="dk-card">
          <h2 className="dk-h">Beregn oktantal</h2>

          <span className="dk-lab">Hvilken benzin har du tanket?</span>
          <div className="dk-seg" style={{ marginTop: "0.5rem" }}>
            {[95, 98, 100, 102].map((o) => (
              <button key={o} className={base === o ? "on" : ""} onClick={() => setBase(o)}>{o}</button>
            ))}
          </div>

          <div className="uv-inputs" style={{ marginTop: "1.2rem" }}>
            <Stepper label="Tankstørrelse" unit="L" value={tank} step={1} min={1} max={200} onChange={setTank} />
            <Stepper label="Booster tilføjet" unit="ml" value={ml} step={25} min={0} max={5000} onChange={setMl} />
          </div>

          <span className="dk-lab" style={{ marginTop: "1.2rem", display: "block" }}>Booster / produkt</span>
          <p className="dk-sub" style={{ marginTop: "0.3rem" }}>Vælg din booster — så udfyldes styrken automatisk. Eller vælg <b>Brugerdefineret</b> og tast tallene fra din flaskes etiket.</p>
          <select className="ob-select" value={productId} onChange={(e) => setProductId(e.target.value)} aria-label="Vælg booster">
            {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="custom">Brugerdefineret (tast fra etiket)…</option>
          </select>

          {isCustom ? (
            <div className="uv-inputs ob-adv">
              <Stepper label="Dosis fra etiket" unit="ml" value={spec.doseMl} step={25} min={1} max={2000} onChange={setSpecK("doseMl")} />
              <Stepper label="Til tank" unit="L" value={spec.refTank} step={5} min={1} max={200} onChange={setSpecK("refTank")} />
              <Stepper label="Hæver oktan" unit="RON" value={spec.ratedGain} step={1} min={1} max={20} onChange={setSpecK("ratedGain")} />
            </div>
          ) : (
            <p className="dk-sub" style={{ marginTop: "0.5rem" }}>
              <b>{product.name}</b>: {f0Ml(product.doseMl)} ml hæver ca. <b>+{product.ratedGain} oktan</b> i {product.refTank} L. <span className="ob-approx">Vejledende tal — tjek din etiket.</span>
            </p>
          )}

          {recMl > 0 && (
            <button type="button" className="ob-rec-btn" onClick={() => setMl(String(recMl))}>
              📏 Brug anbefalet dosis til {f2(tankL)} L: ~{f0Ml(recMl)} ml
            </button>
          )}

          <div className="ob-result">
            <div className="ob-final">
              <span className="ob-final-lab">Endeligt oktantal</span>
              <b className="ob-octane">{f1(finalOctane)}<small> RON</small></b>
              <span className="ob-gain">{base} + {f1(gain)} oktan</span>
            </div>
            <div className="ob-stats">
              <div><b>+{f1(gain)}</b><span>Oktan-gevinst</span></div>
              <div><b>{f2(mlPerL)}</b><span>ml pr. liter</span></div>
              <div><b>{f2(pct)}%</b><span>Blanding</span></div>
            </div>
          </div>

          {mlAdded > 0 && tankL > 0 && (
            <p className="dk-note">
              {f0Ml(mlAdded)} ml i {f2(tankL)} L{base} giver et blandingsforhold på <b>{f2(mlPerL)} ml/L</b> ({f2(pct)}%) → ca. <b>+{f1(gain)} oktan</b>, altså <b>{f1(finalOctane)} RON</b>.
              {overdose && <> <b>OBS:</b> du er langt over boosterens anbefalede dosering — i praksis er der aftagende effekt (og risiko for skidt i systemet), så tallet er nok optimistisk.</>}
            </p>
          )}

          <div className="uv-callout">
            <h4>⚠️ Læs det med et gran salt</h4>
            <p>Oktan-boostere er <b>ikke</b> ens. Beregningen bruger din valgte styrke og antager at effekten skalerer lineært med blandingsforholdet — det passer godt ved normale doser, men <b>ikke</b> hvis du overdoserer voldsomt. Tjek altid <b>din egen flaskes etiket</b> for den rigtige dosis og oktan-stigning, og overdoser aldrig.</p>
            <p><b>RON vs. andre skalaer:</b> tallene her er RON (den skala 95/98/100/102 refererer til i Europa). Boostere angiver typisk også RON — men nogle amerikanske produkter bruger (R+M)/2, som stiger langsommere. Sørg for at etiketten er i samme skala.</p>
          </div>
        </section>

        <p className="daek-foot"><Link href="/daektryk" className="c-link">← Dæktryk & temperatur</Link> · <Link href="/daek" className="c-link">Dæk & fælge →</Link></p>
      </div>
    </main>
  );
}

// Whole-ml formatter kept separate so the note reads cleanly.
function f0Ml(n) { return Math.round(n).toLocaleString("da-DK"); }
