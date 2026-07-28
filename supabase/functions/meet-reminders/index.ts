// West Side Car Crew — meet reminder sender (Supabase Edge Function).
// Called on a schedule (pg_cron, see 020-meet-reminders.sql). Finds meets that
// start within the next few hours and haven't been reminded yet, then pushes a
// reminder to the members who RSVP'd yes/maybe. Idempotent via events.reminder_sent_at.
//
// Uses the project's VAPID secrets (already set for send-push). Deploy with
// "Verify JWT" OFF so pg_cron can call it. See supabase/functions/README.md.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim();
const VAPID_PRIVATE = (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim();
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:whiteduif@gmail.com";

// How far ahead of a meet to send the reminder.
const LEAD_HOURS = 3;

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const now = new Date();
    const until = new Date(now.getTime() + LEAD_HOURS * 3600 * 1000);

    // Meets starting inside the window that haven't been reminded yet.
    const { data: due } = await admin
      .from("events")
      .select("id, title, location, starts_at")
      .is("reminder_sent_at", null)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", until.toISOString());

    let reminded = 0, pushed = 0;

    for (const ev of due || []) {
      // Members who said yes/maybe.
      const { data: rsvps } = await admin
        .from("event_rsvps")
        .select("user_id, status")
        .eq("event_id", ev.id)
        .in("status", ["yes", "maybe"]);
      const userIds = [...new Set((rsvps || []).map((r) => r.user_id))];

      if (userIds.length) {
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .in("user_id", userIds);

        const time = new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }).format(new Date(ev.starts_at));
        const payload = JSON.stringify({
          title: "Meet snart 🏁",
          body: `${ev.title} kl. ${time}${ev.location ? " · " + ev.location : ""}`,
          url: "/events/",
          tag: "reminder-" + ev.id,
        });

        await Promise.allSettled(
          (subs || []).map((s) =>
            webpush
              .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
              .then(() => { pushed++; })
              .catch(async (err: any) => {
                if (err?.statusCode === 404 || err?.statusCode === 410) {
                  await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
                }
              })
          )
        );
      }

      // Mark reminded regardless, so each meet only fires once.
      await admin.from("events").update({ reminder_sent_at: now.toISOString() }).eq("id", ev.id);
      reminded++;
    }

    return json({ ok: true, meets: reminded, pushed });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
