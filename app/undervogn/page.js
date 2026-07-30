"use client";

import { useState } from "react";
import Link from "next/link";

// ---- Geometry maths (pure) ---------------------------------------------
const MM_IN = 25.4;
const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : 0; };
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const f2 = (n) => (Math.round(n * 100) / 100).toLocaleString("da-DK");
const f1 = (n) => (Math.round(n * 10) / 10).toLocaleString("da-DK");
const f0 = (n) => Math.round(n).toLocaleString("da-DK");
const sign = (n) => (n > 0 ? "+" : n < 0 ? "−" : "");
// Show a signed angle with the leading minus as a proper unicode minus.
const degStr = (n) => `${n < 0 ? "−" : ""}${f2(Math.abs(n))}°`;

// Numeric field with −/+ steppers (copied from /daek so the two tools match).
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

// A prominent, always-visible measuring guide for a section.
function Guide({ tools, setup, steps, inputs }) {
  return (
    <div className="uv-guide">
      <div className="uv-g-grid">
        <div className="uv-g-block">
          <h4>🧰 Værktøj</h4>
          <ul>{tools.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
        <div className="uv-g-block">
          <h4>🚗 Sådan skal bilen stå</h4>
          <ul>{setup.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      </div>
      <div className="uv-g-block uv-g-steps">
        <h4>📐 Fremgangsmåde</h4>
        <ol>{steps.map((t, i) => <li key={i}>{t}</li>)}</ol>
      </div>
      {inputs && (
        <div className="uv-g-block uv-g-inputs">
          <h4>⌨︎ Det taster du ind nedenfor</h4>
          <ul>{inputs.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// --- little inline diagrams (stroke = gold, so they follow the theme) ---
const S = { fill: "none", stroke: "var(--gold-bright)", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
const Sd = { ...S, strokeDasharray: "4 4", stroke: "var(--faint)" };
const Lbl = { fill: "var(--muted)", fontSize: 9, fontFamily: "var(--font-mono), monospace" };

function CamberDiagram() {
  return (
    <svg viewBox="0 0 200 130" className="uv-svg" role="img" aria-label="Camber-måling set forfra">
      {/* ground */}
      <line x1="10" y1="118" x2="190" y2="118" {...S} />
      {/* plumb line */}
      <line x1="150" y1="14" x2="150" y2="118" {...Sd} />
      <circle cx="150" cy="14" r="3" fill="var(--faint)" stroke="none" />
      {/* tilted wheel (negative camber: top leans left/in) */}
      <g transform="rotate(-9 90 70)">
        <rect x="70" y="30" width="40" height="80" rx="6" {...S} />
        <line x1="90" y1="30" x2="90" y2="110" {...Sd} />
      </g>
      {/* top gap */}
      <line x1="84" y1="34" x2="150" y2="34" {...{ ...S, stroke: "var(--gold)" }} />
      <text x="112" y="28" {...Lbl}>top-afstand</text>
      {/* bottom gap */}
      <line x1="97" y1="106" x2="150" y2="106" {...{ ...S, stroke: "var(--gold)" }} />
      <text x="106" y="115" {...Lbl}>bund</text>
    </svg>
  );
}

function ToeDiagram() {
  return (
    <svg viewBox="0 0 200 130" className="uv-svg" role="img" aria-label="Toe-måling set fra oven">
      {/* string */}
      <line x1="14" y1="20" x2="186" y2="20" {...Sd} />
      <text x="150" y="14" {...Lbl}>snor</text>
      {/* wheel from above, slight toe-in (front edge = left, further from string) */}
      <g transform="rotate(6 90 70)">
        <rect x="70" y="35" width="40" height="70" rx="5" {...S} />
      </g>
      <text x="60" y="120" {...Lbl}>forkant</text>
      <text x="112" y="120" {...Lbl}>bagkant</text>
      {/* front gap */}
      <line x1="66" y1="20" x2="66" y2="44" {...{ ...S, stroke: "var(--gold)" }} />
      {/* rear gap */}
      <line x1="114" y1="20" x2="114" y2="38" {...{ ...S, stroke: "var(--gold)" }} />
    </svg>
  );
}

function OffsetDiagram() {
  return (
    <svg viewBox="0 0 200 130" className="uv-svg" role="img" aria-label="Fælg-offset (ET) set ovenfra">
      {/* car side (inboard) at left */}
      <text x="8" y="66" {...Lbl}>ind</text>
      <text x="180" y="66" {...Lbl}>ud</text>
      {/* wheel width */}
      <rect x="60" y="30" width="80" height="70" rx="4" {...S} />
      {/* centerline */}
      <line x1="100" y1="18" x2="100" y2="112" {...Sd} />
      <text x="86" y="14" {...Lbl}>midt</text>
      {/* mounting face */}
      <line x1="118" y1="24" x2="118" y2="106" {...{ ...S, stroke: "var(--gold)" }} />
      <text x="120" y="120" {...Lbl}>anlægsflade</text>
      {/* ET arrow */}
      <line x1="100" y1="65" x2="118" y2="65" {...{ ...S, stroke: "var(--gold)" }} />
      <text x="100" y="60" {...Lbl}>ET</text>
    </svg>
  );
}

function CornerDiagram() {
  return (
    <svg viewBox="0 0 200 130" className="uv-svg" role="img" aria-label="Hjørnevægt — bilens fire hjørner">
      <rect x="55" y="20" width="90" height="90" rx="10" {...S} />
      <text x="92" y="14" {...Lbl}>front</text>
      {[["VF", 48, 26], ["HF", 140, 26], ["VB", 48, 108], ["HB", 140, 108]].map(([t, x, y]) => (
        <g key={t}>
          <circle cx={x} cy={y - 4} r="9" {...{ ...S, stroke: "var(--gold)" }} />
          <text x={x} y={y - 1} textAnchor="middle" style={{ fill: "var(--gold-bright)", fontSize: 8, fontFamily: "var(--font-mono), monospace" }}>{t}</text>
        </g>
      ))}
      {/* diagonal */}
      <line x1="48" y1="104" x2="140" y2="22" {...Sd} />
      <text x="150" y="70" {...Lbl}>diagonal</text>
    </svg>
  );
}

export default function UndervognPage() {
  // 1 · Camber (default = typical negative camber: top leans in, matches diagram)
  const [cam, setCam] = useState({ top: "38", bottom: "20", rim: "18" });
  const [camConv, setCamConv] = useState({ deg: "-2", rim: "18" });
  // 2 · Toe
  const [toe, setToe] = useState({ front: "24", rear: "20", rim: "18" });
  // 3 · Caster (default = normal positive caster: more negative camber turned in)
  const [cast, setCast] = useState({ cOut: "-1.2", cIn: "-3.4", theta: "20" });
  // 4 · Corner weights
  const [cw, setCw] = useState({ vf: "420", hf: "410", vb: "380", hb: "390" });
  // 5 · Spring / wheel rate
  const [spr, setSpr] = useState({ rate: "60", mr: "1", corner: "320", unit: "Nmm" });
  // 6 · Offset / fitment
  const [fit, setFit] = useState({ ow: "9", oet: "35", nw: "9.5", net: "25" });

  // ---- 1 · camber -------------------------------------------------------
  const camD = num(cam.rim) * MM_IN;                       // measuring span (mm)
  const camDiff = num(cam.bottom) - num(cam.top);          // + = bottom further out
  const camAngle = camD ? deg(Math.atan(camDiff / camD)) : 0; // negative = top in
  const convMm = num(camConv.rim) * MM_IN * Math.tan(rad(num(camConv.deg)));

  // ---- 2 · toe ----------------------------------------------------------
  const toeD = num(toe.rim) * MM_IN;
  const toeDiff = num(toe.front) - num(toe.rear);          // + = toe-in (per wheel)
  const toeAngle = toeD ? deg(Math.atan(toeDiff / toeD)) : 0;

  // ---- 3 · caster -------------------------------------------------------
  const sinT = Math.sin(rad(num(cast.theta)));
  const caster = sinT ? (num(cast.cOut) - num(cast.cIn)) / (2 * sinT) : 0;

  // ---- 4 · corner weights ----------------------------------------------
  const vf = num(cw.vf), hf = num(cw.hf), vb = num(cw.vb), hb = num(cw.hb);
  const total = vf + hf + vb + hb;
  const pct = (n) => (total ? (n / total) * 100 : 0);
  const frontP = pct(vf + hf), rearP = pct(vb + hb);
  const leftP = pct(vf + vb), rightP = pct(hf + hb);
  const crossP = pct(hf + vb);                             // HF + VB diagonal
  const crossDev = crossP - 50;
  const crossStatus = Math.abs(crossDev) <= 0.5 ? "ok" : Math.abs(crossDev) <= 1.5 ? "warn" : "bad";

  // ---- 5 · spring / wheel rate -----------------------------------------
  const toNmm = { Nmm: 1, kgmm: 9.80665, lbin: 1 / 5.71014716 };
  const rateNmm = num(spr.rate) * toNmm[spr.unit];         // N/mm
  const mr = num(spr.mr);
  const wheelRate = rateNmm * mr * mr;                     // N/mm at the wheel
  const mass = num(spr.corner);                            // kg on the corner (sprung)
  const freq = mass > 0 ? (1 / (2 * Math.PI)) * Math.sqrt((wheelRate * 1000) / mass) : 0; // Hz

  // ---- 6 · offset / fitment --------------------------------------------
  const dWidthMm = (num(fit.nw) - num(fit.ow)) * MM_IN;
  const dEt = num(fit.net) - num(fit.oet);
  const outerCh = dWidthMm / 2 - dEt;                      // + = mere poke (ud)
  const innerCh = dWidthMm / 2 + dEt;                      // + = tættere på fjederben

  return (
    <main className="member daek-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/medlem" className="mlink">Medlem</Link>
            <Link href="/daek" className="mlink">Dæk & fælge</Link>
          </div>
        </div>
      </div>

      <div className="wrap daek-body">
        <span className="overline">Værktøj</span>
        <h1 className="member-title">Undervogn & geometri</h1>
        <p className="daek-intro">Mål og regn på din undervogn selv: camber, toe, caster, hjørnevægt, fjederrate og fælg-offset. Hver måling har en trin-for-trin-guide — værktøj, hvordan bilen skal stå, og præcis hvor du måler. Alt regnes lokalt i din browser; intet gemmes.</p>

        {/* Fælles forudsætning */}
        <section className="dk-card uv-pre">
          <h2 className="dk-h">Før du går i gang — gælder alle målinger</h2>
          <ul className="uv-pre-list">
            <li><b>Helt plan, vandret overflade.</b> Et garagegulv der hælder ødelægger camber- og hjørnevægt-tal. Tjek med et langt vaterpas. Bane-folk bruger fliser/plader til at udligne.</li>
            <li><b>Korrekt og ens dæktryk</b> på alle fire hjul (koldt) — tryk ændrer højde og dermed geometrien.</li>
            <li><b>Køreklar vægt.</b> Samme brændstofniveau og vægt i bilen som når du kører — helst med en person i sædet ved bane-setup. Tøm bagagerummet for løst grej.</li>
            <li><b>Sæt ophænget.</b> Rul bilen 2–3 m frem og tilbage (eller gynge den) efter hver justering, så fjedre og bøsninger falder på plads, før du måler.</li>
            <li><b>Rattet lige ud</b> og centreret ved alle målinger undtagen caster-svinget.</li>
          </ul>
        </section>

        {/* 1 · CAMBER */}
        <section className="dk-card">
          <h2 className="dk-h">1 · Camber</h2>
          <p className="dk-sub">Hjulets hældning set forfra. <b>Negativ camber</b> = toppen hælder ind mod bilen (giver greb i sving). Måles pr. hjul.</p>
          <div className="uv-diagram"><CamberDiagram /></div>
          <Guide
            tools={[
              "Digital vinkelmåler / telefon-app med vaterpas — ELLER en lodline (snor + vægt) og en tommestok/skydelære.",
              "Et fast, lodret referencepunkt (lodlinen hænges fri af hjulet).",
            ]}
            setup={[
              "Plan overflade, rattet lige ud, ophænget sat (se boksen øverst).",
              "Fælgen ren på inder- og yderlæbe der hvor du måler — mudder giver falske mm.",
            ]}
            steps={[
              "Har du en digital vinkelmåler: læg den lodret mod fælgens yderlæbe (ikke mod dækket) og aflæs graderne direkte — brug så mini-omregneren nedenfor til at tjekke mm.",
              "Uden vinkelmåler: hæng lodlinen så den falder frit lige uden for hjulet.",
              "Mål den vandrette afstand fra lodlinen ind til fælgens ØVERSTE kant.",
              "Mål afstanden fra samme lodline ind til fælgens NEDERSTE kant — samme lodrette linje, direkte under det øverste punkt.",
              "Tast fælgstørrelsen + de to afstande ind. Er bunden længere ude end toppen, er camberen negativ.",
            ]}
            inputs={["Fælgstørrelse i tommer (afstanden mellem dine to målepunkter ≈ fælgdiameteren)", "Afstand til top (mm)", "Afstand til bund (mm)"]}
          />
          <div className="uv-inputs">
            <Stepper label="Fælg" unit="″" value={cam.rim} step={1} min={10} max={24} onChange={(rim) => setCam({ ...cam, rim })} />
            <Stepper label="Afstand top" unit="mm" value={cam.top} step={1} min={0} max={400} onChange={(top) => setCam({ ...cam, top })} />
            <Stepper label="Afstand bund" unit="mm" value={cam.bottom} step={1} min={0} max={400} onChange={(bottom) => setCam({ ...cam, bottom })} />
          </div>
          <div className="dk-out">
            <div className={camAngle < 0 ? "ok" : camAngle > 0 ? "warn" : ""}><b>{degStr(camAngle)}</b><span>Camber</span></div>
            <div><b>{camAngle < 0 ? "Negativ (top ind)" : camAngle > 0 ? "Positiv (top ud)" : "Nul"}</b><span>Retning</span></div>
            <div><b>{sign(camDiff)}{f1(Math.abs(camDiff))} mm</b><span>Top↔bund-forskel</span></div>
          </div>

          <div className="uv-sub">
            <h3 className="uv-h3">Mini-omregner: grader ↔ mm</h3>
            <p className="dk-sub">Ved du hvor mange grader du vil have, viser den hvor mange mm det svarer til over fælgens diameter (nyttigt når du justerer topskål/camber-bolte).</p>
            <div className="uv-inputs">
              <Stepper label="Ønsket camber" unit="°" value={camConv.deg} step={0.1} min={-8} max={8} onChange={(d) => setCamConv({ ...camConv, deg: d })} />
              <Stepper label="Fælg" unit="″" value={camConv.rim} step={1} min={10} max={24} onChange={(rim) => setCamConv({ ...camConv, rim })} />
            </div>
            <div className="dk-out">
              <div><b>{sign(convMm)}{f1(Math.abs(convMm))} mm</b><span>Top↔bund over fælgen</span></div>
            </div>
          </div>
          <p className="dk-note">Tommelfingerregel: gade ~ −0,5° til −1,5°, sportslig gade/track-day ~ −2° til −3,5°. For meget negativ camber slider dækkets inderkant og forringer bremselængden i lige retning.</p>
        </section>

        {/* 2 · TOE */}
        <section className="dk-card">
          <h2 className="dk-h">2 · Toe (sporing)</h2>
          <p className="dk-sub">Om hjulets forkant peger ind mod (<b>toe-in</b>) eller væk fra (<b>toe-out</b>) bilen set fra oven. Streng-metoden — ét hjul ad gangen.</p>
          <div className="uv-diagram"><ToeDiagram /></div>
          <Guide
            tools={[
              "En taut snor/fiskeline langs bilens side (fx spændt mellem to akselbukke), parallel med bilens midterlinje.",
              "Målebånd eller skydelære.",
            ]}
            setup={[
              "Plan overflade, rattet centreret og låst (rat-lås eller en stang mellem rat og sæde), ophænget sat.",
              "Snoren skal løbe vandret i navhøjde og præcis parallelt med bilens køreretning (thrust-linjen). Mål samme afstand fra snor til fælg for- og bagpå bilen for at sikre den er parallel.",
            ]}
            steps={[
              "Spænd snoren op langs det hjul du måler, lige uden for fælgen.",
              "Mål den vandrette afstand fra snoren ind til fælgens FORKANT (i navhøjde).",
              "Mål afstanden fra samme snor ind til fælgens BAGKANT (samme højde).",
              "Tast fælgstørrelse + de to afstande ind. Er forkant-afstanden størst, toer hjulet IND.",
              "Gentag på det andet hjul på samme aksel og læg de to tal sammen for at få akslens samlede toe.",
            ]}
            inputs={["Fælgstørrelse i tommer", "Afstand til forkant (mm)", "Afstand til bagkant (mm)"]}
          />
          <div className="uv-inputs">
            <Stepper label="Fælg" unit="″" value={toe.rim} step={1} min={10} max={24} onChange={(rim) => setToe({ ...toe, rim })} />
            <Stepper label="Forkant-afstand" unit="mm" value={toe.front} step={1} min={0} max={400} onChange={(front) => setToe({ ...toe, front })} />
            <Stepper label="Bagkant-afstand" unit="mm" value={toe.rear} step={1} min={0} max={400} onChange={(rear) => setToe({ ...toe, rear })} />
          </div>
          <div className="dk-out">
            <div className={Math.abs(toeAngle) < 0.05 ? "" : "ok"}><b>{degStr(toeAngle)}</b><span>Toe pr. hjul</span></div>
            <div><b>{toeDiff > 0 ? "Toe-IN" : toeDiff < 0 ? "Toe-OUT" : "Nul"}</b><span>Retning</span></div>
            <div><b>{sign(toeDiff)}{f1(Math.abs(toeDiff))} mm</b><span>Toe pr. hjul (v. fælg)</span></div>
            <div><b>{sign(toeDiff * 2)}{f1(Math.abs(toeDiff * 2))} mm</b><span>Samlet aksel (×2)</span></div>
          </div>
          <p className="dk-note">Retning: lidt toe-in bagpå og tæt på nul foran giver stabilitet på gaden; toe-out foran giver kvikkere indstyring men mere dækslid og uro ved lige kørsel. “Samlet aksel” antager symmetri — mål begge hjul for at være sikker.</p>
        </section>

        {/* 3 · CASTER */}
        <section className="dk-card">
          <h2 className="dk-h">3 · Caster (sving-metoden)</h2>
          <p className="dk-sub">Styreaksens hældning bagud set fra siden. Kan ikke måles direkte — den udregnes af hvor meget camberen ændrer sig når du drejer hjulet lige meget hver vej.</p>
          <Guide
            tools={[
              "Digital vinkelmåler / camber-gauge (samme som til camber).",
              "Drejeplader under forhjulene — eller to glatte fliser/plastposer med fedt imellem, så hjulet kan dreje frit.",
              "En vinkelmåler/gradskive til at aflæse rat-/hjuludslag (typisk 20° hver vej).",
            ]}
            setup={[
              "Plan overflade, forhjulene på drejeplader så de kan dreje uden at ‘gå i spænd’, ophænget sat.",
              "Mål på ét forhjul ad gangen.",
            ]}
            steps={[
              "Drej hjulet så det peger 20° UD (væk fra bilen). Aflæs camber og skriv det i ‘Camber v. 20° ud’.",
              "Drej hjulet 20° IND (mod bilen). Aflæs camber og skriv det i ‘Camber v. 20° ind’.",
              "Brug samme udslag begge veje (står i ‘Drejevinkel’, standard 20°).",
              "Aflæs casteren. Positiv caster (næsten altid tilfældet) betyder at hjulet bliver mere negativt i camber når det drejes IND mod bilen — som det ydre hjul i et sving.",
            ]}
            inputs={["Camber ved 20° ud (°, fx −3,4)", "Camber ved 20° ind (°, fx −1,2)", "Drejevinkel (° hver vej, standard 20)"]}
          />
          <div className="uv-inputs">
            <Stepper label="Camber 20° ud" unit="°" value={cast.cOut} step={0.1} min={-10} max={10} onChange={(cOut) => setCast({ ...cast, cOut })} />
            <Stepper label="Camber 20° ind" unit="°" value={cast.cIn} step={0.1} min={-10} max={10} onChange={(cIn) => setCast({ ...cast, cIn })} />
            <Stepper label="Drejevinkel" unit="°" value={cast.theta} step={1} min={5} max={30} onChange={(theta) => setCast({ ...cast, theta })} />
          </div>
          <div className="dk-out">
            <div className={caster > 0 ? "ok" : "warn"}><b>{degStr(caster)}</b><span>Caster</span></div>
            <div><b>{caster > 0 ? "Positiv (normal)" : caster < 0 ? "Negativ" : "Nul"}</b><span>Retning</span></div>
          </div>
          <p className="dk-note">Formel: caster = (camber_ud − camber_ind) / (2·sin(drejevinkel)). Mest brugbart til at tjekke at venstre og højre side er ens — er de forskellige, trækker bilen til én side. Caster er svær at måle pinpoint uden rigtige drejeplader; se det som vejledende.</p>
        </section>

        {/* 4 · CORNER WEIGHTS */}
        <section className="dk-card dk-star">
          <h2 className="dk-h">4 · Hjørnevægt & cross-weight ⭐</h2>
          <p className="dk-sub">Vægten på hvert hjul. <b>Cross-weight</b> (kilevægt) er summen af den ene diagonal i procent af totalen — mål 50 % for en bil der opfører sig ens i venstre- og højresving.</p>
          <div className="uv-diagram"><CornerDiagram /></div>
          <Guide
            tools={[
              "Fire hjørnevægte (corner scales) — én under hvert hjul.",
              "Evt. plader/plyworth under vægtene så alle fire står i præcis samme plan.",
              "Justerbare fjederplatforme (coilovers) hvis du vil rette cross-weight bagefter.",
            ]}
            setup={[
              "Kritisk: alle fire vægte i nøjagtig samme vandrette plan (brug vaterpas + udligningsplader).",
              "Køreklar bil med fører i sædet (eller tilsvarende vægt), korrekt dæktryk, tank som du normalt kører.",
              "Rul frem/tilbage og slip bilen ned på vægtene uden at skubbe; gynge den så ophænget sætter sig. Håndbremse af, gear i frigear.",
            ]}
            steps={[
              "Aflæs vægten under hvert af de fire hjul.",
              "Tast dem ind på deres rigtige plads: VF = venstre for, HF = højre for, VB = venstre bag, HB = højre bag.",
              "Aflæs cross-weight. Over 50 % → sænk fjederplatformen i den tunge diagonal (eller hæv den lette); under 50 % → omvendt.",
            ]}
            inputs={["De fire hjørnevægte i kg (eller samme enhed på alle fire — procenterne er ens uanset enhed)"]}
          />
          <div className="uv-corner">
            <Stepper label="VF venstre for" unit="kg" value={cw.vf} step={5} min={0} max={2000} onChange={(vf) => setCw({ ...cw, vf })} />
            <Stepper label="HF højre for" unit="kg" value={cw.hf} step={5} min={0} max={2000} onChange={(hf) => setCw({ ...cw, hf })} />
            <Stepper label="VB venstre bag" unit="kg" value={cw.vb} step={5} min={0} max={2000} onChange={(vb) => setCw({ ...cw, vb })} />
            <Stepper label="HB højre bag" unit="kg" value={cw.hb} step={5} min={0} max={2000} onChange={(hb) => setCw({ ...cw, hb })} />
          </div>
          <div className="dk-out">
            <div><b>{f0(total)} kg</b><span>Total</span></div>
            <div><b>{f1(frontP)} / {f1(rearP)} %</b><span>For / bag</span></div>
            <div><b>{f1(leftP)} / {f1(rightP)} %</b><span>Venstre / højre</span></div>
            <div className={crossStatus}><b>{f1(crossP)} %</b><span>Cross-weight</span></div>
            <div className={crossStatus}><b>{sign(crossDev)}{f1(Math.abs(crossDev))} %</b><span>Afvigelse fra 50</span></div>
          </div>
          <p className="dk-note">Grøn ≤ 0,5 % fra 50 · gul ≤ 1,5 % · rød = juster. Cross-weight er kun meningsfuldt på en bil med justerbart ophæng — på en standardbil er tallet en sundhedstjek af vægtfordelingen, ikke noget du kan skrue på.</p>
        </section>

        {/* 5 · SPRING / WHEEL RATE */}
        <section className="dk-card">
          <h2 className="dk-h">5 · Fjederrate → hjulrate & frekvens</h2>
          <p className="dk-sub">Sammenlign coilover-opsætninger objektivt. Hjulraten (raten målt ved hjulet) og fjedringens egenfrekvens siger mere om følelsen end fjederens tal alene.</p>
          <Guide
            tools={[
              "Fjederens rate fra databladet (står ofte på fjederen: fx 6K = 6 kg/mm).",
              "Bilens hjørnevægt (fra sektion 4 — den affjedrede vægt på hjørnet).",
              "Motion ratio: forholdet mellem fjedervandring og hjulvandring (≈1 ved coilover monteret direkte på benet; lavere når fjederen sidder inde på en vippearm).",
            ]}
            setup={[
              "Ingen fysisk opstilling — det er en ren beregning. Har du ikke motion ratio, så lad den stå på 1 (typisk for MacPherson/direkte coilover).",
              "For at estimere motion ratio: mål hvor langt fjederen trykkes sammen når hjulet flyttes en kendt afstand — ratio = fjedervandring ÷ hjulvandring.",
            ]}
            steps={[
              "Vælg fjederratens enhed (N/mm, kg/mm eller lbs/in) og tast raten.",
              "Tast motion ratio (1 hvis du er i tvivl og har direkte-monteret coilover).",
              "Tast hjørnevægten i kg.",
              "Aflæs hjulraten og egenfrekvensen — sammenlign to setups: højere frekvens = strammere/mere sporty.",
            ]}
            inputs={["Fjederrate + enhed", "Motion ratio (0–1,2)", "Hjørnevægt (kg)"]}
          />
          <div className="uv-seg dk-seg">
            {[["Nmm", "N/mm"], ["kgmm", "kg/mm"], ["lbin", "lbs/in"]].map(([k, l]) => (
              <button key={k} className={spr.unit === k ? "on" : ""} onClick={() => setSpr({ ...spr, unit: k })}>{l}</button>
            ))}
          </div>
          <div className="uv-inputs">
            <Stepper label="Fjederrate" value={spr.rate} step={1} min={0} max={2000} onChange={(rate) => setSpr({ ...spr, rate })} />
            <Stepper label="Motion ratio" value={spr.mr} step={0.05} min={0.2} max={1.2} onChange={(m) => setSpr({ ...spr, mr: m })} />
            <Stepper label="Hjørnevægt" unit="kg" value={spr.corner} step={5} min={50} max={1200} onChange={(corner) => setSpr({ ...spr, corner })} />
          </div>
          <div className="dk-out">
            <div><b>{f1(rateNmm)} N/mm</b><span>Fjederrate</span></div>
            <div><b>{f1(wheelRate)} N/mm</b><span>Hjulrate</span></div>
            <div><b>{f2(freq)} Hz</b><span>Egenfrekvens</span></div>
          </div>
          <p className="dk-note">Vejledende frekvenser: komfort-gade ~1,0–1,3 Hz · sporty gade ~1,3–1,8 Hz · bane/downforce ~2,0 Hz+. Hjulrate = fjederrate × motion ratio². Enheder: 1 kg/mm ≈ 9,81 N/mm ≈ 56 lbs/in.</p>
        </section>

        {/* 6 · OFFSET / FITMENT */}
        <section className="dk-card">
          <h2 className="dk-h">6 · Offset & fitment (ET)</h2>
          <p className="dk-sub">Hvor meget en ny fælgbredde + ET flytter yder- og inderkant. Lavere ET = fælgen stikker længere ud. Kobler direkte på dæk-beregneren på <Link href="/daek" className="c-link">/daek</Link>.</p>
          <div className="uv-diagram"><OffsetDiagram /></div>
          <Guide
            tools={[
              "Fælgdata: bredde i tommer og ET (offset) — står på fælgens bagside/eger, fx ‘8.5J ET35’.",
              "Til frigangs-tjek: målebånd, og bilen i normal køjehøjde.",
            ]}
            setup={[
              "For selve beregningen: ingen opstilling — den sammenligner bare to fælge.",
              "Vil du tjekke om det går fri: mål ved køjehøjde afstanden fra dækkets inderside til fjederben/bremse (inderkant) og fra dæk til skærmkant (yderkant), og hold dem op mod de mm beregneren viser.",
            ]}
            steps={[
              "Tast din NUVÆRENDE fælgs bredde og ET.",
              "Tast den NYE fælgs bredde og ET.",
              "Aflæs hvor mange mm yderkanten flytter sig ud (poke) og inderkanten flytter sig ind (mod fjederben).",
            ]}
            inputs={["Nuværende bredde (tommer) + ET (mm)", "Ny bredde (tommer) + ET (mm)"]}
          />
          <div className="uv-cmp2">
            <div>
              <span className="dk-lab">Nuværende fælg</span>
              <div className="uv-inputs">
                <Stepper label="Bredde" unit="″" value={fit.ow} step={0.5} min={5} max={14} onChange={(ow) => setFit({ ...fit, ow })} />
                <Stepper label="ET" unit="mm" value={fit.oet} step={1} min={-30} max={80} onChange={(oet) => setFit({ ...fit, oet })} />
              </div>
            </div>
            <div>
              <span className="dk-lab">Ny fælg</span>
              <div className="uv-inputs">
                <Stepper label="Bredde" unit="″" value={fit.nw} step={0.5} min={5} max={14} onChange={(nw) => setFit({ ...fit, nw })} />
                <Stepper label="ET" unit="mm" value={fit.net} step={1} min={-30} max={80} onChange={(net) => setFit({ ...fit, net })} />
              </div>
            </div>
          </div>
          <div className="dk-out">
            <div className={outerCh > 0 ? "warn" : "ok"}><b>{sign(outerCh)}{f1(Math.abs(outerCh))} mm</b><span>Yderkant (poke)</span></div>
            <div className={innerCh > 0 ? "warn" : "ok"}><b>{sign(innerCh)}{f1(Math.abs(innerCh))} mm</b><span>Inderkant (mod ben)</span></div>
            <div><b>{sign(dEt)}{f0(Math.abs(dEt))} mm</b><span>ET-ændring</span></div>
            <div><b>{sign(dWidthMm)}{f0(Math.abs(dWidthMm))} mm</b><span>Bredde-ændring</span></div>
          </div>
          <p className="dk-note">Positiv yderkant = mere poke/tættere på skærmen. Positiv inderkant = tættere på fjederben/bremse — tjek altid fysisk frigang. Dette regner kun på fælgen; husk at bredere dæk også vokser i bredden (se dæk-beregneren).</p>
        </section>

        {/* 7 · TARGET REFERENCE */}
        <section className="dk-card">
          <h2 className="dk-h">7 · Vejledende mål-værdier</h2>
          <p className="dk-sub">Typiske udgangspunkter — ikke facit. Den enkelte bils fabriksdata (værkstedshåndbog) og dæk/brug afgør det rigtige. Justér altid i små skridt.</p>
          <div className="dk-scroll">
            <table className="dk-table">
              <thead><tr><th>Brug</th><th>Camber for</th><th>Camber bag</th><th>Toe for</th><th>Toe bag</th><th>Caster</th></tr></thead>
              <tbody>
                <tr><td>Komfort / daglig</td><td>−0,3° til −0,8°</td><td>−0,8° til −1,3°</td><td>0 til lidt in</td><td>lidt toe-in</td><td>+4° til +7°</td></tr>
                <tr><td>Sporty gade</td><td>−1,0° til −2,0°</td><td>−1,3° til −2,0°</td><td>0</td><td>lidt toe-in</td><td>+5° til +8°</td></tr>
                <tr><td>Track-day</td><td>−2,5° til −3,5°</td><td>−1,8° til −2,8°</td><td>lidt toe-out</td><td>lidt toe-in</td><td>så meget som muligt</td></tr>
              </tbody>
            </table>
          </div>
          <p className="dk-note">Mere negativ camber + toe-out foran = kvikkere men mere dækslid og uroligere lige-kørsel. Overdreven camber koster bremselængde og dæklevetid på gaden. Er du i tvivl, så få et rigtigt 4-hjuls-opmålings-print hos en specialist og brug værktøjet her til at forstå og finjustere tallene.</p>
        </section>

        <p className="daek-foot"><Link href="/medlem" className="c-link">← Tilbage til medlemsområdet</Link> · <Link href="/daek" className="c-link">Dæk & fælge →</Link></p>
      </div>
    </main>
  );
}
