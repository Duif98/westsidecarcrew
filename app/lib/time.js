// Shared relative timestamp ("2 min siden" / "2 min ago" / "vor 2 Min.").
// Language-aware without pulling in the i18n context, so it works in plain
// helpers too. Falls back to a localized absolute date for anything older than
// a week.

const L = {
  da: { now: "lige nu", min: "min siden", hour: "t siden", day: "d siden", locale: "da-DK" },
  en: { now: "just now", min: "min ago", hour: "h ago", day: "d ago", locale: "en-GB" },
  de: { now: "gerade eben", min: "Min.", hour: "Std.", day: "Tg.", locale: "de-DE" },
};

export function timeAgo(ts, lang = "da") {
  if (!ts) return "";
  const w = L[lang] || L.da;
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return w.now;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} ${w.min}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${w.hour}`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ${w.day}`;
  return new Date(ts).toLocaleDateString(w.locale, { day: "numeric", month: "short" });
}

// Short clock time, e.g. for chat bubbles.
export function clockTime(ts, lang = "da") {
  const w = L[lang] || L.da;
  return new Date(ts).toLocaleTimeString(w.locale, { hour: "2-digit", minute: "2-digit" });
}
