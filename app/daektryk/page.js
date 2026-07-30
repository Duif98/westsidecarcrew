"use client";

import { useState } from "react";
import Link from "next/link";

// ---- maths (pure) ------------------------------------------------------
const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : 0; };
const f2 = (n) => (Math.round(n * 100) / 100).toLocaleString("da-DK");
const f0 = (n) => Math.round(n).toLocaleString("da-DK");
const sign = (n) => (n > 0 ? "+" : n < 0 ? "−" : "");

// Numeric field with −/+ steppers (same as /daek + /undervogn so they match).
function Stepper({ label, value, onChange, step = 1, min = -999, max = 9999, unit }) {
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

function Guide({ tools, setup, steps, inputs }) {
  return (
    <div className="uv-guide">
      <div className="uv-g-grid">
        <div className="uv-g-block">
          <h4>🧰 Værktøj</h4>
          <ul>{tools.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
        <div className="uv-g-block">
          <h4>🚗 Sådan gør du</h4>
          <ul>{setup.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      </div>
      <div className="uv-g-block uv-g-steps">
        <h4>📐 Fremgangsmåde</h4>
        <ol>{steps.map((t, i) => <li key={i}>{t}</li>)}</ol>
      </div>
      {inputs && (
        <div className="uv-g-block uv-g-inputs">
          <h4>⌨︎ Det taster du ind</h4>
          <ul>{inputs.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default function DaektrykPage() {
  const [mode, setMode] = useState("fwd"); // fwd = koldt→varmt, rev = varmt måltryk→koldt
  const [pt, setPt] = useState({ p1: "2.2", p2: "2.2", p3: "2.4", p4: "2.4", tCold: "15", tHot: "45", atm: "1.013" });
  const set = (k) => (v) => setPt({ ...pt, [k]: v });

  const fwd = mode === "fwd";
  const atm = num(pt.atm) || 1.013;
  const tC = num(pt.tCold) + 273.15;   // cold (paddock) Kelvin
  const tH = num(pt.tHot) + 273.15;    // hot (on track) Kelvin
  // fwd: known cold, find hot → ratio tH/tC. rev: known hot target, find cold → ratio tC/tH.
  const ratio = fwd ? (tC > 0 ? tH / tC : 1) : (tH > 0 ? tC / tH : 1);
  const convert = (p) => { const v = num(p); return v > 0 ? (v + atm) * ratio - atm : 0; };

  const corners = [
    { t: "VF", k: "p1" }, { t: "HF", k: "p2" },
    { t: "VB", k: "p3" }, { t: "HB", k: "p4" },
  ];
  const dT = num(pt.tHot) - num(pt.tCold);
  const avgIn = (num(pt.p1) + num(pt.p2) + num(pt.p3) + num(pt.p4)) / 4;
  const avgDelta = avgIn > 0 ? convert(avgIn) - avgIn : 0;
  const per10 = dT !== 0 ? (Math.abs(avgDelta) / Math.abs(dT)) * 10 : 0;

  const inLabel = fwd ? "Koldt tryk" : "Ønsket varmt tryk";
  const outLabel = fwd ? "Varmt tryk (på banen)" : "Sæt koldt (paddock)";

  return (
    <main className="member daek-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/undervogn" className="mlink">Undervogn</Link>
            <Link href="/daek" className="mlink">Dæk & fælge</Link>
          </div>
        </div>
      </div>

      <div className="wrap daek-body">
        <span className="overline">Værktøj · banedag</span>
        <h1 className="member-title">Dæktryk & temperatur</h1>
        <p className="daek-intro">Dæktrykket stiger når luften bliver varm. Regn begge veje: hvad de <b>kolde tryk bliver til varme</b> — eller, vigtigst i paddocken, hvilke <b>kolde tryk du skal sætte</b> for at ramme et varmt måltryk på banen. Gælder almindelig luft; alt regnes lokalt i din browser.</p>

        <div className="dk-seg" style={{ marginTop: "1.4rem" }}>
          <button className={fwd ? "on" : ""} onClick={() => setMode("fwd")}>Koldt → varmt</button>
          <button className={!fwd ? "on" : ""} onClick={() => setMode("rev")}>Varmt måltryk → koldt ⭐</button>
        </div>

        <section className="dk-card">
          <h2 className="dk-h">{fwd ? "Beregn varmt tryk" : "Find koldt måltryk"}</h2>
          <p className="dk-sub">
            {fwd
              ? "Indtast de fire kolde tryk + den kolde og den varme temperatur — se hvad trykket bliver når dækket er varmt."
              : "Indtast dit ønskede varme måltryk pr. dæk + den kolde (paddock-) og forventede varme temperatur — se hvilke kolde tryk du skal sætte for at ramme målet varmt."}
          </p>

          <Guide
            tools={[
              "En præcis dæktryksmåler — sæt/aflæs altid KOLDT, før bilen har kørt.",
              "Et termometer (eller vejrudsigt) til den kolde og den forventede varme lufttemperatur.",
              "Til varmt måltryk: en fornemmelse af hvad dækket kører bedst ved varmt (ofte oplyst af dækproducenten, fx ~2,0–2,2 bar varmt for mange semislicks).",
            ]}
            setup={[
              fwd
                ? "Mål de kolde tryk før kørsel, mens dækkene har omgivelsestemperatur."
                : "Beslut dit varme måltryk pr. dæk (det tryk du vil have NÅR dækket er varmt på banen).",
              "‘Varm temperatur’ er lufttemperaturen inde i dækket når det er varmkørt — typisk 40–70 °C afhængig af bane og tempo. Start konservativt og justér efter erfaring.",
              "Dækstørrelsen er uden betydning: volumenet går ud i regnestykket, så den procentvise ændring er ens for alle fire.",
            ]}
            steps={
              fwd
                ? [
                    "Tast de fire kolde tryk (VF/HF/VB/HB) i bar.",
                    "Tast den kolde og den varme temperatur i °C.",
                    "Aflæs de varme tryk + stigningen pr. dæk.",
                  ]
                : [
                    "Skift til ‘Varmt måltryk → koldt’ (denne fane).",
                    "Tast dit ønskede VARME tryk pr. dæk (VF/HF/VB/HB).",
                    "Tast paddock-temperaturen (kold) og den forventede varme temperatur.",
                    "Aflæs de KOLDE tryk du skal sætte nu, så du rammer målet når dækkene er varme.",
                  ]
            }
            inputs={[fwd ? "4 kolde dæktryk (bar)" : "4 ønskede varme dæktryk (bar)", "Kold temperatur (°C)", "Varm temperatur (°C)"]}
          />

          <span className="dk-lab">{inLabel}</span>
          <div className="uv-corner">
            {corners.map((c) => (
              <Stepper key={c.k} label={`${c.t}`} unit="bar" value={pt[c.k]} step={0.1} min={0} max={6} onChange={set(c.k)} />
            ))}
          </div>
          <div className="uv-inputs uv-pt-temps">
            <Stepper label="Kold temp (paddock)" unit="°C" value={pt.tCold} step={1} min={-30} max={60} onChange={set("tCold")} />
            <Stepper label="Varm temp (på banen)" unit="°C" value={pt.tHot} step={1} min={-30} max={120} onChange={set("tHot")} />
            <Stepper label="Atmosfæretryk" unit="bar" value={pt.atm} step={0.01} min={0.9} max={1.1} onChange={set("atm")} />
          </div>

          <span className="dk-lab" style={{ marginTop: "1rem", display: "block" }}>{outLabel}</span>
          <div className="dk-out">
            {corners.map((c) => {
              const out = convert(pt[c.k]);
              const d = out - num(pt[c.k]);
              return (
                <div key={c.k} className={fwd ? "warn" : "ok"}>
                  <b>{f2(out)} bar</b>
                  <span>{c.t} · {sign(d)}{f2(Math.abs(d))} bar</span>
                </div>
              );
            })}
          </div>
          <p className="dk-note">
            Ved {sign(dT)}{f0(Math.abs(dT))} °C forskel: ca. <b>{f2(per10)} bar pr. 10 °C</b> (tommelfingerregel ≈ 0,1 bar/10 °C).
            {" "}Gay-Lussacs lov på absolut tryk og Kelvin: {fwd ? "P_varm = (P_kold + atm)·T_varm/T_kold − atm" : "P_kold = (P_mål + atm)·T_kold/T_varm − atm"}. Husk: dæktryk sættes og aflæses altid koldt.
          </p>

          <div className="uv-callout">
            <h4>🧪 Nitrogen (N₂) i stedet for luft?</h4>
            <p><b>Selve temperatur-stigningen er stort set ens.</b> Tør nitrogen og tør luft følger nøjagtig samme gaslov — tallene her gælder for begge. Nitrogen giver <b>ikke</b> en markant mindre stigning når dækket bliver varmt.</p>
            <p><b>Men nitrogen ER mere stabilt</b> — bare på en anden måde: det er tørt (ingen vanddamp der svinger med) og siver langsommere ud end luftens iltmolekyler. Så trykket holder sig mere konstant <b>over tid</b> (færre efterfyldninger) og svinger mindre ved fugtig værkstedsluft. Forskellen på selve den varme stigning er dog i praksis typisk <b>under ~0,05 bar</b>.</p>
          </div>
        </section>

        <p className="daek-foot"><Link href="/undervogn" className="c-link">← Undervogn & geometri</Link> · <Link href="/daek" className="c-link">Dæk & fælge →</Link></p>
      </div>
    </main>
  );
}
