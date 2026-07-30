"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import {
  getLocalPresets, saveLocalPreset, deleteLocalPreset,
  getProfileSetups, saveProfileSetup, deleteProfileSetup,
} from "../lib/suspension";

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

// --- Hunter-style 3D instrument diagrams -------------------------------
// Dark "display screen" look: shaded 3D tyres with gold rims, glowing teal
// reference lines and a perspective floor. Instrument colours are fixed
// (they mimic real hardware) rather than following the site theme.
const scrFont = { fontFamily: "var(--font-mono, monospace)" };

function ScreenDefs({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}-scr`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#182338" />
        <stop offset="1" stopColor="#05080f" />
      </linearGradient>
      <radialGradient id={`${id}-tyre`} cx="0.36" cy="0.30" r="0.9">
        <stop offset="0" stopColor="#4b5464" />
        <stop offset="0.55" stopColor="#1b212c" />
        <stop offset="1" stopColor="#080b11" />
      </radialGradient>
      <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f6e8c4" />
        <stop offset="0.5" stopColor="#caa974" />
        <stop offset="1" stopColor="#7d6337" />
      </linearGradient>
      <radialGradient id={`${id}-hub`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fdf3d7" />
        <stop offset="1" stopColor="#9a7d49" />
      </radialGradient>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#35527c" />
        <stop offset="0.5" stopColor="#1a2c46" />
        <stop offset="1" stopColor="#0b1524" />
      </linearGradient>
      <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="1.7" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  );
}

// A shared instrument "screen" frame with a titled status pill.
function Panel({ id, title, children }) {
  const tw = title.length * 5.6 + 22;
  return (
    <svg viewBox="0 0 240 150" className="uv-svg" role="img" aria-label={`${title} — instrumentvisning`}>
      <ScreenDefs id={id} />
      <rect x="1.5" y="1.5" width="237" height="147" rx="13" fill={`url(#${id}-scr)`} stroke="#27384e" strokeWidth="1.2" />
      <rect x="9" y="7" width="222" height="28" rx="9" fill="#ffffff" opacity="0.04" />
      <rect x="11" y="10" width={tw} height="16" rx="8" fill="#08201c" stroke="#1f8f74" strokeWidth="0.8" />
      <circle cx="21" cy="18" r="2.5" fill="#39e9b4" filter={`url(#${id}-glow)`} />
      <text x="29" y="21" fill="#5ff3c8" fontSize="8" fontWeight="700" style={{ ...scrFont, letterSpacing: "1.3px" }}>{title}</text>
      {children}
    </svg>
  );
}

function CamberDiagram() {
  const id = "cam";
  const cx = 90, cy = 82, rx = 25, ry = 39, dx = 9;
  return (
    <Panel id={id} title="CAMBER">
      <g opacity="0.5" stroke="#1e4650" strokeWidth="0.8">
        <line x1="14" y1="126" x2="226" y2="126" />
        <line x1="44" y1="138" x2="196" y2="138" opacity="0.5" />
      </g>
      <ellipse cx={cx} cy="127" rx="30" ry="5" fill="#000" opacity="0.4" />
      <g transform={`rotate(-11 ${cx} 126)`}>
        <ellipse cx={cx - dx} cy={cy} rx={rx} ry={ry} fill="#070a10" />
        <rect x={cx - dx} y={cy - ry} width={dx} height={ry * 2} fill={`url(#${id}-tyre)`} />
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-tyre)`} stroke="#05070c" strokeWidth="1" />
        <ellipse cx={cx} cy={cy} rx={rx - 9} ry={ry - 13} fill={`url(#${id}-rim)`} stroke="#6a5330" strokeWidth="0.7" />
        <g stroke="#6a5330" strokeWidth="1.1" opacity="0.85">
          {/* Fixed spoke endpoints (5 spokes around cx,cy). Hardcoded, not
              computed with trig, so server (build) and client render byte-
              identical strings — runtime Math.cos differs in the last float
              digit and would break hydration. */}
          {[[90, 106], [103.31, 89.42], [98.23, 62.58], [81.77, 62.58], [76.69, 89.42]].map(([x2, y2], i) => (
            <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} />
          ))}
        </g>
        <ellipse cx={cx} cy={cy} rx="4.5" ry="6.5" fill={`url(#${id}-hub)`} />
        <line x1={cx} y1={cy - ry - 4} x2={cx} y2={cy + ry + 4} stroke="#39e9b4" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.9" />
      </g>
      <line x1="172" y1="34" x2="172" y2="126" stroke="#8390a6" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="172" cy="34" r="3" fill="#8390a6" />
      <text x="176" y="44" fill="#8390a6" fontSize="7.5" style={scrFont}>lodline</text>
      <g filter={`url(#${id}-glow)`} stroke="#ecd6a0" strokeWidth="1.5">
        <line x1="118" y1="52" x2="172" y2="52" />
        <line x1="104" y1="116" x2="172" y2="116" />
      </g>
      <text x="120" y="49" fill="#ecd6a0" fontSize="7.5" style={scrFont}>top-afstand</text>
      <text x="106" y="112" fill="#ecd6a0" fontSize="7.5" style={scrFont}>bund</text>
      <path d="M 90 110 A 20 20 0 0 0 74 102" fill="none" stroke="#39e9b4" strokeWidth="1.5" filter={`url(#${id}-glow)`} />
      <text x="60" y="102" fill="#5ff3c8" fontSize="9" style={scrFont}>θ</text>
    </Panel>
  );
}

function ToeDiagram() {
  const id = "toe";
  const cx = 92, cy = 82;
  return (
    <Panel id={id} title="TOE">
      <g opacity="0.4" stroke="#1e4650" strokeWidth="0.7">
        <line x1="24" y1="130" x2="206" y2="130" />
        <line x1="58" y1="46" x2="58" y2="130" opacity="0.5" />
        <line x1="128" y1="46" x2="128" y2="130" opacity="0.5" />
      </g>
      <line x1="150" y1="40" x2="150" y2="134" stroke="#8390a6" strokeWidth="1" strokeDasharray="5 4" />
      <text x="154" y="50" fill="#8390a6" fontSize="7.5" style={scrFont}>snor</text>
      <g transform={`rotate(7 ${cx} ${cy})`}>
        <ellipse cx={cx} cy={cy} rx="20" ry="42" fill="#000" opacity="0.2" />
        <path d={`M ${cx + 13} ${cy - 40} L ${cx + 19} ${cy - 32} L ${cx + 19} ${cy + 32} L ${cx + 13} ${cy + 40} Z`} fill="#0a0e15" />
        <rect x={cx - 13} y={cy - 40} width="26" height="80" rx="9" fill={`url(#${id}-tyre)`} stroke="#05070c" strokeWidth="1" />
        <g stroke="#04060b" strokeWidth="0.8" opacity="0.6">
          <line x1={cx - 6} y1={cy - 36} x2={cx - 6} y2={cy + 36} />
          <line x1={cx} y1={cy - 38} x2={cx} y2={cy + 38} />
          <line x1={cx + 6} y1={cy - 36} x2={cx + 6} y2={cy + 36} />
        </g>
        <line x1={cx} y1={cy - 48} x2={cx} y2={cy + 48} stroke="#39e9b4" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.9" />
        <path d={`M ${cx} ${cy - 54} l -3.5 6 l 7 0 Z`} fill="#39e9b4" />
      </g>
      <g filter={`url(#${id}-glow)`} stroke="#ecd6a0" strokeWidth="1.5">
        <line x1="112" y1="50" x2="150" y2="50" />
        <line x1="118" y1="116" x2="150" y2="116" />
      </g>
      <text x="70" y="46" fill="#ecd6a0" fontSize="7.5" style={scrFont}>forkant</text>
      <text x="74" y="126" fill="#ecd6a0" fontSize="7.5" style={scrFont}>bagkant</text>
    </Panel>
  );
}

function OffsetDiagram() {
  const id = "off";
  const cy = 84, ryO = 40, rxE = 10;
  const xin = 72, xout = 152, xmount = 132, xcen = 112;
  return (
    <Panel id={id} title="OFFSET · ET">
      <line x1="20" y1="132" x2="220" y2="132" stroke="#1e4650" strokeWidth="0.8" opacity="0.5" />
      <text x="26" y="80" fill="#8390a6" fontSize="7.5" style={scrFont}>ind</text>
      <text x="206" y="80" fill="#8390a6" fontSize="7.5" style={scrFont}>ud</text>
      <line x1="42" y1={cy} x2="206" y2={cy} stroke="#55627a" strokeWidth="2" strokeLinecap="round" />
      <path d={`M ${xin} ${cy - ryO} L ${xout} ${cy - ryO} A ${rxE} ${ryO} 0 0 1 ${xout} ${cy + ryO} L ${xin} ${cy + ryO} A ${rxE} ${ryO} 0 0 0 ${xin} ${cy - ryO} Z`} fill={`url(#${id}-tyre)`} stroke="#05070c" strokeWidth="1" />
      <ellipse cx={xin} cy={cy} rx={rxE} ry={ryO} fill="#0a0e15" stroke="#05070c" strokeWidth="1" />
      <ellipse cx={xout} cy={cy} rx={rxE} ry={ryO} fill={`url(#${id}-rim)`} stroke="#6a5330" strokeWidth="0.8" />
      <ellipse cx={xout} cy={cy} rx={rxE - 4} ry={ryO - 15} fill="#0d1017" />
      <ellipse cx={xout} cy={cy} rx="3" ry="6" fill={`url(#${id}-hub)`} />
      <line x1={xcen} y1="30" x2={xcen} y2="132" stroke="#8390a6" strokeWidth="1" strokeDasharray="4 4" />
      <text x={xcen - 8} y="26" fill="#8390a6" fontSize="7.5" style={scrFont}>midt</text>
      <ellipse cx={xmount} cy={cy} rx="3.5" ry={ryO - 4} fill="none" stroke="#39e9b4" strokeWidth="1.4" strokeDasharray="3 3" filter={`url(#${id}-glow)`} />
      <text x={xmount - 14} y="142" fill="#5ff3c8" fontSize="7.5" style={scrFont}>anlægsflade</text>
      <g filter={`url(#${id}-glow)`} stroke="#ecd6a0" strokeWidth="1.5">
        <line x1={xcen} y1={cy - 30} x2={xmount} y2={cy - 30} />
        <line x1={xcen} y1={cy - 33} x2={xcen} y2={cy - 27} />
        <line x1={xmount} y1={cy - 33} x2={xmount} y2={cy - 27} />
      </g>
      <text x={xcen + 3} y={cy - 34} fill="#ecd6a0" fontSize="8" style={scrFont}>ET</text>
    </Panel>
  );
}

function CornerDiagram() {
  const id = "cor";
  const pads = [
    { t: "VF", x: 66, y: 58 }, { t: "HF", x: 174, y: 58 },
    { t: "VB", x: 66, y: 116 }, { t: "HB", x: 174, y: 116 },
  ];
  return (
    <Panel id={id} title="CORNER WEIGHTS">
      <line x1="174" y1="58" x2="66" y2="116" stroke="#39e9b4" strokeWidth="1.6" strokeDasharray="5 4" opacity="0.85" filter={`url(#${id}-glow)`} />
      <rect x="96" y="46" width="48" height="84" rx="18" fill={`url(#${id}-body)`} stroke="#2b3f5c" strokeWidth="1" />
      <path d="M101 62 L139 62 L134 74 L106 74 Z" fill="#5a7ba6" opacity="0.4" />
      <path d="M106 104 L134 104 L139 116 L101 116 Z" fill="#5a7ba6" opacity="0.26" />
      <rect x="106" y="76" width="28" height="26" rx="6" fill="#0e1a2c" opacity="0.7" />
      {[[90, 60], [150, 60], [90, 116], [150, 116]].map(([x, y], i) => (
        <rect key={i} x={x - 5} y={y - 9} width="10" height="18" rx="4" fill="#0b0e14" stroke="#04060b" strokeWidth="0.8" />
      ))}
      {pads.map((p) => (
        <g key={p.t} filter={`url(#${id}-glow)`}>
          <rect x={p.x - 16} y={p.y - 11} width="32" height="22" rx="5" fill="#08201c" stroke="#2ad4a4" strokeWidth="1" />
          <text x={p.x} y={p.y + 1} textAnchor="middle" fill="#5ff3c8" fontSize="8.5" fontWeight="700" style={scrFont}>{p.t}</text>
          <text x={p.x} y={p.y + 8.5} textAnchor="middle" fill="#2ad4a4" fontSize="5.5" style={scrFont}>kg</text>
        </g>
      ))}
      <text x="120" y="145" textAnchor="middle" fill="#5ff3c8" fontSize="7.5" style={scrFont}>diagonal = cross-weight</text>
    </Panel>
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
  // 7 · Tyre pressure vs temperature
  const [pt, setPt] = useState({ vf: "2.2", hf: "2.2", vb: "2.4", hb: "2.4", t1: "15", t2: "45", atm: "1.013" });

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

  // ---- 7 · tyre pressure vs temperature --------------------------------
  // Gay-Lussac at constant volume on ABSOLUTE pressure + Kelvin:
  //   P2_abs = P1_abs · T2/T1  →  P2_gauge = (P1_gauge + atm)·T2/T1 − atm
  const ptAtm = num(pt.atm) || 1.013;
  const ptT1 = num(pt.t1) + 273.15;
  const ptT2 = num(pt.t2) + 273.15;
  const ptRatio = ptT1 > 0 ? ptT2 / ptT1 : 1;
  const hotPressure = (cold) => { const c = num(cold); return c > 0 ? (c + ptAtm) * ptRatio - ptAtm : 0; };
  const ptCorners = [
    { t: "VF", cold: pt.vf }, { t: "HF", cold: pt.hf },
    { t: "VB", cold: pt.vb }, { t: "HB", cold: pt.hb },
  ];
  const ptDT = num(pt.t2) - num(pt.t1);
  const ptAvgCold = (num(pt.vf) + num(pt.hf) + num(pt.vb) + num(pt.hb)) / 4;
  const ptAvgDelta = ptAvgCold > 0 ? hotPressure(ptAvgCold) - ptAvgCold : 0;
  const ptPer10 = ptDT !== 0 ? (ptAvgDelta / ptDT) * 10 : 0;

  // ---- save / log ------------------------------------------------------
  const { session, user } = useAuth();
  const [setupName, setSetupName] = useState("");
  const [setupCar, setSetupCar] = useState("");
  const [setupNotes, setSetupNotes] = useState("");
  const [localPresets, setLocalPresets] = useState([]);
  const [profileSetups, setProfileSetups] = useState([]);
  const [saveMsg, setSaveMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setLocalPresets(getLocalPresets()); }, []);
  useEffect(() => {
    let on = true;
    if (session) getProfileSetups().then((r) => { if (on) setProfileSetups(r); });
    else setProfileSetups([]);
    return () => { on = false; };
  }, [session]);

  const snapshot = () => ({ cam, camConv, toe, cast, cw, spr, fit, pt });
  const restore = (d) => {
    if (!d) return;
    if (d.cam) setCam(d.cam);
    if (d.camConv) setCamConv(d.camConv);
    if (d.toe) setToe(d.toe);
    if (d.cast) setCast(d.cast);
    if (d.cw) setCw(d.cw);
    if (d.spr) setSpr(d.spr);
    if (d.fit) setFit(d.fit);
    if (d.pt) setPt(d.pt);
    setSaveMsg("✓ Setup indlæst i beregnerne ovenfor.");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const defaultName = () => setupName.trim() || `Setup ${new Date().toLocaleDateString("da-DK")}`;
  const doSaveLocal = () => {
    saveLocalPreset({ name: defaultName(), car: setupCar.trim(), notes: setupNotes.trim(), data: snapshot() });
    setLocalPresets(getLocalPresets());
    setSaveMsg("💾 Gemt som preset i denne browser.");
  };
  const doSaveProfile = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await saveProfileSetup({ userId: user.id, name: defaultName(), car: setupCar.trim(), notes: setupNotes.trim(), data: snapshot() });
    setBusy(false);
    if (error) { setSaveMsg("⚠︎ Kunne ikke gemme på profil — er migration 031 kørt i Supabase?"); return; }
    setProfileSetups(await getProfileSetups());
    setSaveMsg("⭐ Gemt på din profil.");
  };
  const doDeleteLocal = (id) => { deleteLocalPreset(id); setLocalPresets(getLocalPresets()); };
  const doDeleteProfile = async (id) => { await deleteProfileSetup(id); setProfileSetups(await getProfileSetups()); };
  const doPdf = () => { if (typeof window !== "undefined") window.print(); };

  const savedRows = [
    ...profileSetups.map((s) => ({ ...s, _b: "Profil", _del: () => doDeleteProfile(s.id) })),
    ...localPresets.map((s) => ({ ...s, _b: "Lokal", _del: () => doDeleteLocal(s.id) })),
  ];

  // Rows for the printable / PDF report.
  const reportRows = [
    ["Camber", `top ${cam.top} / bund ${cam.bottom} mm · ${cam.rim}″`, `${degStr(camAngle)} (${camAngle < 0 ? "negativ" : camAngle > 0 ? "positiv" : "nul"})`],
    ["Toe pr. hjul", `forkant ${toe.front} / bagkant ${toe.rear} mm · ${toe.rim}″`, `${degStr(toeAngle)} · ${sign(toeDiff)}${f1(Math.abs(toeDiff))} mm (${toeDiff > 0 ? "toe-in" : toeDiff < 0 ? "toe-out" : "nul"})`],
    ["Caster", `camber ud ${cast.cOut}° / ind ${cast.cIn}° · sving ${cast.theta}°`, degStr(caster)],
    ["Hjørnevægt", `VF ${cw.vf} · HF ${cw.hf} · VB ${cw.vb} · HB ${cw.hb} kg`, `total ${f0(total)} kg · for/bag ${f1(frontP)}/${f1(rearP)}% · cross ${f1(crossP)}%`],
    ["Fjeder/hjul", `${spr.rate} ${spr.unit === "Nmm" ? "N/mm" : spr.unit === "kgmm" ? "kg/mm" : "lbs/in"} · MR ${spr.mr} · ${spr.corner} kg`, `hjulrate ${f1(wheelRate)} N/mm · ${f2(freq)} Hz`],
    ["Offset/ET", `${fit.ow}″ ET${fit.oet} → ${fit.nw}″ ET${fit.net}`, `poke ${sign(outerCh)}${f1(Math.abs(outerCh))} mm · inder ${sign(innerCh)}${f1(Math.abs(innerCh))} mm`],
    ["Dæktryk v. temp", `${pt.vf}/${pt.hf}/${pt.vb}/${pt.hb} bar · ${pt.t1}→${pt.t2} °C`, `${ptCorners.map((c) => f2(hotPressure(c.cold))).join(" / ")} bar (varm)`],
  ];

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
              "Tape til at markere rattets position + noget til at låse rattet (rat-lås, spændebånd eller en stiv stang mellem rat og sæde).",
            ]}
            setup={[
              "Plan overflade, ophænget sat.",
              "Vigtigt: rattet SKAL stå 100 % lige og være låst før du måler — ellers er tallet forkert uanset hvor præcist du måler. Se “Få rattet lige” lige under her.",
              "Snoren skal løbe vandret i navhøjde og præcis parallelt med bilens køreretning (thrust-linjen). Mål samme afstand fra snor til fælg for- og bagpå bilen for at sikre den er parallel.",
            ]}
            steps={[
              "Få rattet lige (se metoden nedenfor) og LÅS det, så det ikke kan dreje under målingen.",
              "Spænd snoren op langs det hjul du måler, lige uden for fælgen.",
              "Mål den vandrette afstand fra snoren ind til fælgens FORKANT (i navhøjde).",
              "Mål afstanden fra samme snor ind til fælgens BAGKANT (samme højde).",
              "Tast fælgstørrelse + de to afstande ind. Er forkant-afstanden størst, toer hjulet IND.",
              "Gentag på det andet hjul på samme aksel. TJEK: venstre og højre hjul skal have samme toe-værdi — er de forskellige, stod rattet skævt. Læg de to tal sammen for akslens samlede toe.",
            ]}
            inputs={["Fælgstørrelse i tommer", "Afstand til forkant (mm)", "Afstand til bagkant (mm)"]}
          />

          <div className="uv-callout">
            <h4>🎯 Få rattet 100 % lige — og verificér det</h4>
            <p><b>Hvorfor:</b> Måler du toe med rattet en anelse skævt, fordeles sporingen forkert mellem de to forhjul. Bilen kan så “trække”, og rattet står skævt når du kører ligeud — selvom akslens samlede toe er rigtig. Rattets eger er <b>ikke</b> et pålideligt tjek (rattet kan være monteret skævt fra fabrik/tidligere).</p>
            <p><b>Metode A — centrér tandstangen (mest præcis):</b></p>
            <ol>
              <li>Drej rattet helt i bund til venstre, og helt i bund til højre — tæl antallet af omgange mellem anslagene.</li>
              <li>Drej tilbage til præcis halvdelen. Nu står tandstangen (rack) i sit centrum = hjulene peger lige frem.</li>
              <li>Sæt et stykke tape lodret øverst på rattet med en markering på ratkappen bagved, så du straks kan se hvis rattet flytter sig.</li>
              <li>Lås rattet i den position.</li>
            </ol>
            <p><b>Metode B — rulle-test (bekræfter at bilen faktisk kører lige):</b> Kør langsomt ligeud på en plan, lige strækning og slip rattet, så det selv-centrerer. Stop <i>uden</i> at røre rattet. Hjulene peger nu der hvor bilen naturligt kører lige. Markér ratposition med tape og lås.</p>
            <p><b>Den endelige verifikation:</b> mål toe på <b>begge</b> forhjul mod snoren/thrust-linjen. Er venstre og højre toe lige store, står rattet korrekt. Er de forskellige, justér styrestagene (skru den ene lidt ind, den anden lidt ud med samme mængde) indtil de to hjul har samme toe — så ender rattet lige når du kører ligeud, uden at akslens samlede toe ændrer sig.</p>
          </div>
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

        {/* 7 · TYRE PRESSURE vs TEMPERATURE */}
        <section className="dk-card">
          <h2 className="dk-h">7 · Dæktryk vs. temperatur</h2>
          <p className="dk-sub">Trykket stiger når luften i dækket bliver varm (koldt morgentryk → varmt tryk efter kørsel/på banen, eller kold vinter → varm sommer). Indtast de fire kolde tryk, den kolde temperatur og en ny temperatur — så regnes de nye tryk for <b>almindelig luft</b>.</p>
          <Guide
            tools={[
              "En præcis dæktryksmåler — aflæs KOLDT, før bilen har kørt.",
              "Et termometer til lufttemperaturen (den kolde tilstand + den nye/varme du vil regne til).",
            ]}
            setup={[
              "Mål de kolde tryk før kørsel, mens dækkene har omgivelsestemperatur.",
              "‘Ny temperatur’ er den lufttemperatur i dækket du vil kende trykket ved — fx dæk-temp efter et par baneomgange, eller en varm sommerdag holdt op mod en kold morgen.",
              "Dækstørrelsen er uden betydning: volumenet går ud i regnestykket, så den procentvise stigning er ens for alle fire uanset dimension.",
            ]}
            steps={[
              "Tast de fire kolde tryk (VF/HF/VB/HB) i bar.",
              "Tast den kolde (ambient) temperatur og den nye temperatur i °C.",
              "Aflæs de nye tryk og trykstigningen pr. dæk. Atmosfæretrykket kan finjusteres (avanceret, standard 1,013 bar).",
            ]}
            inputs={["4 kolde dæktryk (bar)", "Kold temperatur (°C)", "Ny temperatur (°C)"]}
          />
          <div className="uv-corner">
            <Stepper label="VF tryk" unit="bar" value={pt.vf} step={0.1} min={0} max={6} onChange={(vf) => setPt({ ...pt, vf })} />
            <Stepper label="HF tryk" unit="bar" value={pt.hf} step={0.1} min={0} max={6} onChange={(hf) => setPt({ ...pt, hf })} />
            <Stepper label="VB tryk" unit="bar" value={pt.vb} step={0.1} min={0} max={6} onChange={(vb) => setPt({ ...pt, vb })} />
            <Stepper label="HB tryk" unit="bar" value={pt.hb} step={0.1} min={0} max={6} onChange={(hb) => setPt({ ...pt, hb })} />
          </div>
          <div className="uv-inputs uv-pt-temps">
            <Stepper label="Kold temp" unit="°C" value={pt.t1} step={1} min={-30} max={60} onChange={(t1) => setPt({ ...pt, t1 })} />
            <Stepper label="Ny temp" unit="°C" value={pt.t2} step={1} min={-30} max={120} onChange={(t2) => setPt({ ...pt, t2 })} />
            <Stepper label="Atmosfæretryk" unit="bar" value={pt.atm} step={0.01} min={0.9} max={1.1} onChange={(atm) => setPt({ ...pt, atm })} />
          </div>
          <div className="dk-out">
            {ptCorners.map((c) => {
              const hot = hotPressure(c.cold);
              const d = hot - num(c.cold);
              return (
                <div key={c.t} className={ptDT > 0 ? "warn" : ptDT < 0 ? "ok" : ""}>
                  <b>{f2(hot)} bar</b>
                  <span>{c.t} · {sign(d)}{f2(Math.abs(d))} bar</span>
                </div>
              );
            })}
          </div>
          <p className="dk-note">Ved {sign(ptDT)}{f0(Math.abs(ptDT))} °C: ca. <b>{sign(ptPer10)}{f2(Math.abs(ptPer10))} bar pr. 10 °C</b> (tommelfingerregel ≈ 0,1 bar/10 °C). Beregnet med Gay-Lussacs lov på absolut tryk og Kelvin: P₂ = (P₁ + atmosfæretryk) · T₂/T₁ − atmosfæretryk. Husk: dæktryk skal altid sættes/aflæses koldt.</p>
          <div className="uv-callout">
            <h4>🧪 Nitrogen (N₂) i stedet for luft?</h4>
            <p><b>Selve temperatur-stigningen er stort set ens.</b> Tør nitrogen og tør luft følger nøjagtig samme gaslov — tallene ovenfor gælder for begge. Nitrogen giver <b>ikke</b> en markant mindre trykstigning når dækket bliver varmt.</p>
            <p><b>Hvor nitrogen faktisk hjælper:</b> det er tørt (ingen vanddamp) og siver langsommere ud end luftens ilt-molekyler. Derfor holder trykket sig mere stabilt <b>over tid</b>, og svinger mindre når fugtig værkstedsluft ellers ville bidrage ekstra ved opvarmning. Den forskel på selve temperatur-stigningen er i praksis typisk <b>under ~0,05 bar</b> — altså ubetydelig; den reelle gevinst er stabilitet og færre efterfyldninger, ikke en lavere varm-stigning.</p>
          </div>
        </section>

        {/* 8 · TARGET REFERENCE */}
        <section className="dk-card">
          <h2 className="dk-h">8 · Vejledende mål-værdier</h2>
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

        {/* GEM & LOG */}
        <section className="dk-card dk-star uv-save uv-noprint" id="gem">
          <h2 className="dk-h">Gem, log & eksportér 💾</h2>
          <p className="dk-sub">Gem dine indtastede målinger som et setup, så du kan hente det frem igen — som <b>preset</b> lokalt i browseren, eller på <b>din profil</b> (kræver login, virker på tværs af enheder). Du kan også trække en <b>PDF-rapport</b> med alle tal.</p>

          <div className="uv-inputs">
            <label className="uv-field">
              <span className="stp-lab">Navn</span>
              <input value={setupName} onChange={(e) => setSetupName(e.target.value)} placeholder="fx Bane-setup" />
            </label>
            <label className="uv-field">
              <span className="stp-lab">Bil (valgfri)</span>
              <input value={setupCar} onChange={(e) => setSetupCar(e.target.value)} placeholder="fx Duif M4" />
            </label>
          </div>
          <label className="uv-field uv-field-wide">
            <span className="stp-lab">Note (valgfri)</span>
            <textarea rows={2} value={setupNotes} onChange={(e) => setSetupNotes(e.target.value)} placeholder="fx dæktryk 2,2 bar koldt, fuld tank, sommer" />
          </label>

          <div className="uv-save-btns">
            <button type="button" className="uv-btn" onClick={doSaveLocal}>💾 Gem preset</button>
            {session ? (
              <button type="button" className="uv-btn uv-btn-gold" onClick={doSaveProfile} disabled={busy}>⭐ Gem på min profil</button>
            ) : (
              <Link href="/login" className="uv-btn">Log ind for at gemme på profil</Link>
            )}
            <button type="button" className="uv-btn" onClick={doPdf}>📄 Gem som PDF</button>
          </div>
          {saveMsg && <p className="uv-save-msg">{saveMsg}</p>}

          {savedRows.length > 0 && (
            <div className="uv-saved">
              <span className="stp-lab">Gemte setups</span>
              {savedRows.map((s) => (
                <div className="uv-saved-row" key={s._b + s.id}>
                  <div className="uv-saved-meta">
                    <span className="uv-saved-name">{s.name}</span>
                    {s.car && <span className="uv-saved-car">{s.car}</span>}
                    <span className={`dk-chip ${s._b === "Profil" ? "ok" : "warn"}`}>{s._b}</span>
                  </div>
                  <div className="uv-saved-actions">
                    <button type="button" className="uv-mini" onClick={() => restore(s.data)}>Indlæs</button>
                    <button type="button" className="uv-mini uv-mini-del" onClick={s._del}>Slet</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!session && <p className="dk-note">Presets gemmes kun i denne browser. Log ind for at gemme setups på din profil, så de følger med på tværs af mobil og computer.</p>}
        </section>

        {/* Printable / PDF report (hidden on screen, shown when printing) */}
        <div className="uv-print" aria-hidden="true">
          <h1>West Side Car Crew — Undervogns-setup</h1>
          <p className="uv-print-sub">
            {setupName.trim() || "Uden navn"}{setupCar.trim() ? ` · ${setupCar.trim()}` : ""} · {new Date().toLocaleDateString("da-DK")}
          </p>
          {setupNotes.trim() && <p className="uv-print-note">{setupNotes.trim()}</p>}
          <table className="uv-print-table">
            <thead><tr><th>Måling</th><th>Input</th><th>Resultat</th></tr></thead>
            <tbody>
              {reportRows.map((r) => (
                <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="uv-print-foot">Genereret på westsidecarcrew.dk/undervogn · vejledende tal — verificér altid mod fabriksdata.</p>
        </div>

        <p className="daek-foot uv-noprint"><Link href="/medlem" className="c-link">← Tilbage til medlemsområdet</Link> · <Link href="/daek" className="c-link">Dæk & fælge →</Link></p>
      </div>
    </main>
  );
}
