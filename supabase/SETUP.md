# Supabase-opsætning (West Side Car Crew medlemsdel)

Engangsopsætning. Tager ca. 10 minutter.

## 1. Opret projekt
1. Log ind på [supabase.com](https://supabase.com) og opret et nyt projekt (vælg en region i EU, fx Frankfurt).
2. Vent til projektet er klar.

## 2. Kør databasen op
1. Gå til **SQL Editor → New query**.
2. Kopiér HELE indholdet af [`schema.sql`](schema.sql) ind og tryk **Run**.
   Det opretter tabeller, sikkerhedsregler, de to fil-lagre (`private` + `public`) og kode-lågen.

## 3. Auth-indstillinger (vigtigt)
Under **Authentication → Sign In / Providers → Email**:
1. Sørg for at **Email**-provideren er **aktiveret**, og at **"Allow new users to sign up"** er slået **TIL**
   (ellers svarer serveren "Email signups are disabled").
2. Slå **"Confirm email"** **FRA** → **Save** — så kan medlemmer logge ind med det samme efter oprettelse
   (ellers oprettes profilen ikke automatisk).

## 4. Hent dine nøgler
- **Project Settings → API**:
  - **Project URL** (fx `https://xxxx.supabase.co`)
  - **anon / public** key
- Disse to er allerede lagt ind i sitet (`app/lib/supabaseClient.js`). Anon-nøglen er
  offentlig af design og beskyttet af sikkerhedsreglerne — helt trygt at have i koden.

## 5. Gør dig selv til admin
Efter du har oprettet din egen profil på sitet første gang:
- **SQL Editor → New query**, kør (skift til dit brugernavn):
  ```sql
  update public.profiles set is_admin = true where username = 'DIT_BRUGERNAVN';
  ```
- Nu kan du se **/admin** og godkende offentlige billeder til forsiden.

## Ændre oprettelses-koden senere
```sql
update public.app_config set value = 'NY_KODE' where key = 'signup_code';
```

## Sådan hænger det sammen
- **Privat billede** → `private`-lageret, kun synligt for indloggede medlemmer (via signeret link).
- **Offentligt billede** → `public`-lageret, men vises først i "Garagen" på forsiden når du har
  sat **approved = true** (godkendt-fluebenet på /admin).
