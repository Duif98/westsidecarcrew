// Weather for meets — data from yr.no / MET Norway (api.met.no).
// Free, no API key, CORS-open, global coverage. We are a static site so the
// fetch happens client-side. MET asks that we (1) truncate coordinates to 4
// decimals and (2) cache responses instead of hammering the API — both handled
// below. The forecast reaches ~9.5 days ahead; meets further out (or in the
// past) return a flag so the UI shows nothing.
// We use the "complete" product (not "compact") because it carries
// probability_of_precipitation, which we show in the calendar.

const FORECAST_DAYS = 9;
const CACHE_MS = 30 * 60 * 1000; // reuse a coordinate's forecast for 30 min

// Deep-link to yr.no's hour-by-hour table for a meet. ?i=<whole days from
// today> opens the meet's own day rather than the 10-day overview. Returns null
// when the meet has no coordinates. Works the same on desktop and mobile.
export function yrUrl(lat, lng, startsAt) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const d = new Date(startsAt);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const i = Math.max(0, Math.round((start - today) / 86400000));
  return `https://www.yr.no/en/forecast/hourly-table/${lat.toFixed(4)},${lng.toFixed(4)}/?i=${i}`;
}

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

const base = (code) => (code || "").replace(/_(day|night|polartwilight)$/, "");

export function symbolMeta(code) {
  if (!code) return ["🌡", "—"];
  const b = base(code);
  if (SYMBOLS[b]) return SYMBOLS[b];
  if (b.includes("thunder")) return ["⛈", "Torden"];
  if (b.includes("snow")) return ["❄️", "Sne"];
  if (b.includes("sleet")) return ["🌨", "Slud"];
  if (b.includes("rain")) return ["🌧", "Regn"];
  if (b.includes("cloud")) return ["☁️", "Skyet"];
  if (b.includes("fair")) return ["🌤", "Let skyet"];
  if (b.includes("clear")) return ["☀️", "Klart"];
  if (b.includes("fog")) return ["🌫", "Tåge"];
  return ["🌡", "—"];
}

// A coarse category used to pick a drawn (SVG) weather icon.
// clear = sun · partly = sun+cloud · cloudy = cloud · rain = cloud+rain ·
// plus snow / sleet / thunder / fog.
export function symbolCategory(code) {
  const b = base(code);
  if (!b) return "cloudy";
  if (b.includes("thunder")) return "thunder";
  if (b.includes("snow")) return "snow";
  if (b.includes("sleet")) return "sleet";
  if (b.includes("rain") || b.includes("drizzle")) return "rain";
  if (b === "fog") return "fog";
  if (b === "partlycloudy") return "partly";
  if (b === "cloudy") return "cloudy";
  if (b === "fair" || b === "clearsky") return "clear";
  return "cloudy";
}

async function getForecast(lat, lng) {
  const la = lat.toFixed(4);
  const lo = lng.toFixed(4);
  const key = `wscc_wx_${la}_${lo}`;

  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || "null");
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;
  } catch {}

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${la}&lon=${lo}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather " + res.status);
  const data = await res.json();
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {}
  return data;
}

// Returns weather for the meet's start time, or a { past } / { tooFar } flag
// when there's no forecast to show. On success:
// { temp, wind, precip, precipProb, emoji, label, category }.
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
  const code = period.summary?.symbol_code;
  const [emoji, label] = symbolMeta(code);

  return {
    temp: typeof inst.air_temperature === "number" ? Math.round(inst.air_temperature) : null,
    wind: typeof inst.wind_speed === "number" ? Math.round(inst.wind_speed) : null,
    precip: period.details?.precipitation_amount ?? null,
    precipProb: typeof period.details?.probability_of_precipitation === "number"
      ? Math.round(period.details.probability_of_precipitation) : null,
    emoji,
    label,
    category: symbolCategory(code),
  };
}
