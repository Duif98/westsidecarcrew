# Web Push — opsætning (Edge Function `send-push`)

Push-notifikationer kræver ét stykke server-kode (kan ikke ligge på det statiske
site): Edge Function'en `send-push`, der sender til alle gemte abonnementer.

## 1. Kør migrationen

Kør `supabase/019-push.sql` i Supabase → SQL Editor.

## 2. Generér VAPID-nøgler (én gang)

VAPID = de nøgler push-tjenesterne bruger til at verificere afsenderen.

```bash
npx web-push generate-vapid-keys
```

Det giver en **Public Key** og en **Private Key**.

## 3. Gem den offentlige nøgle så klienten kan hente den

Den offentlige nøgle er ikke hemmelig. Kør i SQL Editor (kræver `016-app-secrets.sql`):

```sql
insert into public.app_secrets(key, value)
values ('vapid_public_key', 'DIN_PUBLIC_KEY')
on conflict (key) do update set value = excluded.value;
```

## 4. Deploy funktionen + sæt hemmeligheder

```bash
# Log ind + link projektet (projekt-ref: neezyfqzxhpxhjrefuam)
supabase login
supabase link --project-ref neezyfqzxhpxhjrefuam

# Hemmeligheder (SUPABASE_URL + SERVICE_ROLE_KEY er sat automatisk)
supabase secrets set VAPID_PUBLIC_KEY=DIN_PUBLIC_KEY
supabase secrets set VAPID_PRIVATE_KEY=DIN_PRIVATE_KEY
supabase secrets set VAPID_SUBJECT=mailto:whiteduif@gmail.com

# Deploy (verify_jwt er til som standard → kun indloggede medlemmer kan kalde den)
supabase functions deploy send-push
```

## Sådan virker det

- Medlemmer slår notifikationer til i menuen (☰ → Indstillinger → 🔔). Browseren
  spørger om lov, og abonnementet gemmes i `push_subscriptions`.
- Når et medlem opretter et **meet** (eller en admin slår en **nyhed** op),
  kalder sitet `send-push`, som sender en notifikation til alle abonnementer.
- Uden opsætningen fejler alt blødt: knappen viser bare "ikke sat op endnu", og
  intet går i stykker.

> Bemærk: iOS kræver at sitet først er **installeret** til hjemmeskærmen (PWA)
> før web push virker. Android/desktop Chrome virker uden installation.

---

# Kalender-feed (`calendar-feed`)

En Edge Function der returnerer alle meets som et levende `.ics`-feed, så folk kan
**abonnere én gang** og få nye meets automatisk i deres kalender.

1. **Deploy** funktionen i dashboardet (Edge Functions → Create a new function),
   navngiv den `calendar-feed`, indsæt koden fra
   `supabase/functions/calendar-feed/index.ts`, og **Deploy**.
2. **Slå "Verify JWT" FRA** for funktionen (kalender-apps kan ikke logge ind).
   Feed'et viser kun offentlige meet-data.
3. Ingen secrets nødvendige.

På sitet er der en **"Abonnér på kalender"**-knap på `/calendar` (bruger
`webcal://…/calendar-feed`). Bemærk: hvis slug'en bliver auto-navngivet (fx
`swift-xxx`), skal `app/lib/calfeed.js` pege på det rigtige navn — samme fælde som
med send-push. Sigt efter slug `calendar-feed`.

---

# Meet-påmindelser (`meet-reminders`)

Sender automatisk en push ~3 timer før et meet til dem der har sagt ja/måske.

1. **Deploy** funktionen `meet-reminders` (kode i
   `supabase/functions/meet-reminders/index.ts`), **Verify JWT FRA**.
   - Bruger de samme VAPID-secrets som `send-push` (de er projekt-brede, så intet
     nyt at sætte).
2. **Kør `supabase/020-meet-reminders.sql`** i SQL Editor. Den tilføjer
   `events.reminder_sent_at`, slår `pg_cron` + `pg_net` til, og planlægger et job
   der kalder funktionen hvert 15. minut.
   - **VIGTIGT:** deploy funktionen FØR du kører 020 (så cron har noget at kalde).
   - Tjek jobbet: `select * from cron.job;`
   - Se kørsler: `select * from cron.job_run_details order by start_time desc limit 20;`

Funktionen er idempotent (`reminder_sent_at`), så hvert meet minder kun én gang.
