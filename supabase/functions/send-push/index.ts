// West Side Car Crew — Web Push sender (Supabase Edge Function).
// Called by a logged-in member (Supabase verifies the JWT) with a notification
// payload; fans it out to every stored subscription using the service role.
//
// Deploy + config: see supabase/functions/README.md.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:whiteduif@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { title, body, url, tag } = await req.json();
    if (!title) return json({ error: "title required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth");
    const payload = JSON.stringify({ title, body: body || "", url: url || "/", tag: tag || "wscc" });

    const results = await Promise.allSettled(
      (subs || []).map((s) =>
        webpush
          .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
          .catch(async (err: any) => {
            // Prune subscriptions the push service has retired.
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
            }
            throw err;
          })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return json({ sent, total: subs?.length || 0 });
  } catch (e) {
    return json({ error: String(e) }, 400);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
