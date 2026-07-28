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
