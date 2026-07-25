// Weather for meets — data from yr.no / MET Norway (api.met.no).
// Free, no API key, CORS-open, global coverage. We are a static site so the
// fetch happens client-side. MET asks that we (1) truncate coordinates to 4
// decimals and (2) cache responses instead of hammering the API — both handled
// below. The forecast reaches ~9.5 days ahead; meets further out (or in the
// past) return null so the UI shows nothing.

const FORECAST_DAYS = 9;
const CACHE_MS = 30 * 60 * 1000; // reuse a coordinate's forecast for 30 min

// Map a MET symbol_code (minus its _day/_night/_polartwilight suffix) to an
// emoji + Danish label. Falls back to substring matching for the many
// light/heavy variants so we never show a blank.
const SYMBOLS = {
  clearsky: ["☀️", "Klart"],
  fair: ["🌤", "Let skyet"],
  partlycloudy: ["⛅", "Delvist skyet"],
  cloudy: ["☁️", "Skyet"],
  fog: ["🌫", "Tåge"],
  lightrain: ["🌦", "Let regn"],
  rain: ["🌧", "Regn"],
  heavyrain: ["🌧", "Kraftig regn"],
  lightrainshowers: ["🌦", "Lette regnbyger"],
  rainshowers: ["🌦", "Regnbyger"],
  heavyrainshowers: ["🌧", "Kraftige regnbyger"],
  sleet: ["🌨", "Slud"],
  sleetshowers: ["🌨", "Sludbyger"],
  snow: ["❄️", "Sne"],
  snowshowers: ["🌨", "Snebyger"],
  heavysnow: ["❄️", "Kraftig sne"],
};

export function symbolMeta(code) {
  if (!code) return ["🌡", "—"];
  const base = code.replace(/_(day|night|polartwilight)$/, "");
  if (SYMBOLS[base]) return SYMBOLS[base];
  if (base.includes("thunder")) return ["⛈", "Torden"];
  if (base.includes("snow")) return ["❄️", "Sne"];
  if (base.includes("sleet")) return ["🌨", "Slud"];
  if (base.includes("rain")) return ["🌧", "Regn"];
  if (base.includes("cloud")) return ["☁️", "Skyet"];
  if (base.includes("fair")) return ["🌤", "Let skyet"];
  if (base.includes("clear")) return ["☀️", "Klart"];
  if (base.includes("fog")) return ["🌫", "Tåge"];
  return ["🌡", "—"];
}

async function getForecast(lat, lng) {
  const la = lat.toFixed(4);
  const lo = lng.toFixed(4);
  const key = `wscc_wx_${la}_${lo}`;

  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || "null");
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;
  } catch {}

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${la}&lon=${lo}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather " + res.status);
  const data = await res.json();
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {}
  return data;
}

// Returns { temp, emoji, label, wind, precip } for the meet's start time,
// or null when there's no forecast to show (no coords, too far out, or past).
export async function fetchMeetWeather(lat, lng, startsAt) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const target = new Date(startsAt).getTime();
  const now = Date.now();
  if (isNaN(target)) return null;
  if (target < now - 3 * 60 * 60 * 1000) return { past: true };
  if (target > now + FORECAST_DAYS * 24 * 60 * 60 * 1000) return { tooFar: true };

  const data = await getForecast(lat, lng);
  const series = data?.properties?.timeseries || [];
  if (!series.length) return null;

  // Pick the timeseries entry closest to the meet's start time.
  let best = series[0];
  let bestDiff = Infinity;
  for (const t of series) {
    const diff = Math.abs(new Date(t.time).getTime() - target);
    if (diff < bestDiff) { bestDiff = diff; best = t; }
  }

  const inst = best.data?.instant?.details || {};
  const period = best.data?.next_1_hours || best.data?.next_6_hours || best.data?.next_12_hours || {};
  const [emoji, label] = symbolMeta(period.summary?.symbol_code);

  return {
    temp: typeof inst.air_temperature === "number" ? Math.round(inst.air_temperature) : null,
    wind: typeof inst.wind_speed === "number" ? Math.round(inst.wind_speed) : null,
    precip: period.details?.precipitation_amount ?? null,
    emoji,
    label,
  };
}
