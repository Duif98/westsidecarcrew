// West Side Car Crew — subscribable calendar feed (Edge Function).
// Returns all meets as a live iCalendar (text/calendar) so members can subscribe
// once (webcal://) and have every future meet sync into Apple/Google Calendar
// automatically. Public data only (meets are already publicly readable), so this
// runs with "Verify JWT" OFF.
//
// Deploy: see supabase/functions/README.md.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function toICSDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function esc(s = "") {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function fold(line: string) {
  if (line.length <= 74) return line;
  const parts = [line.slice(0, 74)];
  let s = line.slice(74);
  while (s.length) { parts.push(" " + s.slice(0, 73)); s = s.slice(73); }
  return parts.join("\r\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    // Everything from the last 90 days onward, so the calendar keeps some history.
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const { data: events } = await admin
      .from("events")
      .select("id, title, description, location, location_url, link_url, lat, lng, starts_at, created_at")
      .gte("starts_at", since)
      .order("starts_at", { ascending: true });

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//West Side Car Crew//Meets//DA",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:West Side Car Crew — Meets",
      "X-WR-TIMEZONE:Europe/Copenhagen",
      "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
      "X-PUBLISHED-TTL:PT6H",
    ];

    for (const ev of events || []) {
      const start = new Date(ev.starts_at);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const descParts: string[] = [];
      if (ev.description) descParts.push(ev.description);
      if (ev.link_url) descParts.push(ev.link_url);
      if (ev.location_url) descParts.push(ev.location_url);
      const url = ev.link_url || ev.location_url || "";
      const stamp = ev.created_at ? new Date(ev.created_at) : new Date();

      lines.push(
        "BEGIN:VEVENT",
        `UID:meet-${ev.id}@westsidecarcrew`,
        `DTSTAMP:${toICSDate(stamp)}`,
        `DTSTART:${toICSDate(start)}`,
        `DTEND:${toICSDate(end)}`,
        fold(`SUMMARY:${esc(ev.title)}`),
        ev.location ? fold(`LOCATION:${esc(ev.location)}`) : "",
        descParts.length ? fold(`DESCRIPTION:${esc(descParts.join("\n\n"))}`) : "",
        url ? fold(`URL:${esc(url)}`) : "",
        typeof ev.lat === "number" && typeof ev.lng === "number" ? `GEO:${ev.lat};${ev.lng}` : "",
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");

    const body = lines.filter(Boolean).join("\r\n");
    return new Response(body, {
      headers: {
        ...cors,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="west-side-car-crew.ics"',
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: cors });
  }
});
