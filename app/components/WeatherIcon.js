"use client";

// Drawn (SVG) weather icons matching the meet-day forecast category.
// clear = sun · partly = sun behind cloud · cloudy = cloud · rain = cloud with
// animated falling rain · snow / sleet / thunder / fog handled too.
// Colors are inline so the icon reads the same on any background; rain/snow are
// animated via keyframes in globals.css (.wx-drop / .wx-flake).

const SUN = "#e9b949";
const CLOUD = "#c8ccd2";
const CLOUD_DK = "#9aa0a8";
const RAIN = "#6fb4e6";
const SNOW = "#eaf3fb";
const BOLT = "#f2c14e";

function Sun() {
  return (
    <g>
      {[...Array(8)].map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x = 16 + Math.cos(a) * 11;
        const y = 16 + Math.sin(a) * 11;
        const x2 = 16 + Math.cos(a) * 8;
        const y2 = 16 + Math.sin(a) * 8;
        return <line key={i} x1={x2} y1={y2} x2={x} y2={y} stroke={SUN} strokeWidth="1.6" strokeLinecap="round" />;
      })}
      <circle cx="16" cy="16" r="6" fill={SUN} />
    </g>
  );
}

function Cloud({ cx = 16, cy = 18, s = 1, fill = CLOUD, stroke = CLOUD_DK }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <path
        d="M-9 3 a4.5 4.5 0 0 1 0.6 -8.9 a6 6 0 0 1 11.4 -1.6 a5 5 0 0 1 3.5 10.5 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.8"
      />
    </g>
  );
}

export default function WeatherIcon({ category = "cloudy", size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="wx-icon">
      {category === "clear" && <Sun />}

      {category === "partly" && (
        <>
          <g transform="translate(-3 -3)"><Sun /></g>
          <Cloud cx="19" cy="21" s="0.9" />
        </>
      )}

      {category === "cloudy" && <Cloud cx="16" cy="15" s="1.15" />}
      {category === "fog" && (
        <>
          <Cloud cx="16" cy="12" s="1.05" />
          {[22, 26, 30].map((y, i) => (
            <line key={i} x1={i % 2 ? 8 : 5} y1={y} x2={i % 2 ? 27 : 24} y2={y} stroke={CLOUD_DK} strokeWidth="1.6" strokeLinecap="round" />
          ))}
        </>
      )}

      {(category === "rain" || category === "sleet") && (
        <>
          <Cloud cx="16" cy="12" s="1.1" />
          {[10, 16, 22].map((x, i) => (
            <line
              key={i}
              className="wx-drop"
              style={{ animationDelay: `${i * 0.25}s` }}
              x1={x} y1="20" x2={x - 2} y2="26"
              stroke={RAIN} strokeWidth="1.8" strokeLinecap="round"
            />
          ))}
        </>
      )}

      {category === "snow" && (
        <>
          <Cloud cx="16" cy="12" s="1.1" />
          {[10, 16, 22].map((x, i) => (
            <circle key={i} className="wx-flake" style={{ animationDelay: `${i * 0.3}s` }} cx={x} cy="23" r="1.5" fill={SNOW} />
          ))}
        </>
      )}

      {category === "thunder" && (
        <>
          <Cloud cx="16" cy="12" s="1.1" />
          <path d="M16 19 l-4 6 h3 l-2 5 l6 -7 h-3 l2 -4 Z" fill={BOLT} />
        </>
      )}
    </svg>
  );
}
