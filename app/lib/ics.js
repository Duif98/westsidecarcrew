// "Add to calendar" — generate a standard iCalendar (.ics) file from a meet and
// let the browser download it. Works with Apple Calendar, Google Calendar
// (import), Outlook etc. Everything runs client-side; nothing is uploaded.

// Format a Date as an iCal UTC timestamp: 20260802T130000Z
function toICSDate(d) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Escape text per RFC 5545 (backslash, comma, semicolon, newlines).
function esc(s = "") {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold lines longer than 75 octets (RFC 5545) so strict parsers accept them.
function fold(line) {
  if (line.length <= 74) return line;
  const parts = [];
  let s = line;
  parts.push(s.slice(0, 74));
  s = s.slice(74);
  while (s.length) { parts.push(" " + s.slice(0, 73)); s = s.slice(73); }
  return parts.join("\r\n");
}

// Build the .ics text for one meet. Defaults to a 2-hour duration since meets
// don't store an end time.
export function buildICS(event) {
  const start = new Date(event.starts_at);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const descParts = [];
  if (event.description) descParts.push(event.description);
  if (event.link_url) descParts.push(event.link_url);
  if (event.location_url) descParts.push(event.location_url);
  const description = descParts.join("\n\n");
  const url = event.link_url || event.location_url || "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//West Side Car Crew//Meets//DA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:meet-${event.id}@westsidecarcrew`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${esc(event.title)}`,
    event.location ? `LOCATION:${esc(event.location)}` : null,
    description ? `DESCRIPTION:${esc(description)}` : null,
    url ? `URL:${esc(url)}` : null,
    typeof event.lat === "number" && typeof event.lng === "number"
      ? `GEO:${event.lat};${event.lng}`
      : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.map(fold).join("\r\n");
}

// Trigger a download of the .ics file for a meet.
export function downloadICS(event) {
  const ics = buildICS(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const slug = (event.title || "meet").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "meet";
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
