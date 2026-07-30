import { supabase } from "./supabaseClient";

// Builds a flat, client-side search index. It covers both the site's pages /
// tools (so "dæk", "meets", "tryk" find the right page) AND the live data
// (members, cars, meets, posts). Every item carries a lowercase `kw` string
// that the search matches against. Fail-safe — a blocked query adds nothing.
const rows = (p) => p.then((r) => r.data || []).catch(() => []);

// Static pages & tools with search keywords (incl. English + related terms).
const PAGES = [
  { type: "Side", label: "Garage", sub: "Forsiden", href: "/", kw: "garage forside hjem biler crew galleri" },
  { type: "Side", label: "Meets", sub: "Cruises & træf", href: "/events", kw: "meets meet møde cruise træf event events samling" },
  { type: "Side", label: "Kalender", sub: "Meets i kalenderen", href: "/calendar", kw: "kalender calendar dato meets" },
  { type: "Side", label: "Kort", sub: "Meets på kort", href: "/kort", kw: "kort map lokation meets" },
  { type: "Side", label: "Medlemmer", sub: "Hele crewet", href: "/medlemmer", kw: "medlemmer members crew folk" },
  { type: "Side", label: "Leaderboard", sub: "Rangliste", href: "/leaderboard", kw: "leaderboard rangliste point likes" },
  { type: "Værktøj", label: "Dæk & fælge", sub: "Dækstørrelser & rullediameter", href: "/daek", kw: "dæk daek fælge felge tyres wheels rullediameter offset størrelse quattro" },
  { type: "Værktøj", label: "Undervogn & geometri", sub: "Camber, toe, caster…", href: "/undervogn", kw: "undervogn geometri camber toe caster sporing hjørnevægt offset fjeder setup alignment" },
  { type: "Værktøj", label: "Dæktryk & temperatur", sub: "Koldt ↔ varmt tryk", href: "/daektryk", kw: "dæktryk daektryk tryk temperatur bar nitrogen dæk daek kold varm banedag pressure" },
  { type: "Side", label: "Reservedelskatalog", sub: "Slå dele op via VIN", href: "/reservedelskatalog", kw: "reservedele reservedel dele katalog vin parts stelnummer" },
  { type: "Side", label: "Manualer", sub: "Service- & ejermanualer", href: "/manualer", kw: "manualer manual dokumenter service håndbog pdf" },
  { type: "Side", label: "Dashboard", sub: "Crewet i tal", href: "/dashboard", kw: "dashboard tal statistik hestekræfter hk mærker" },
  { type: "Side", label: "Vask bil", sub: "Vask med crewet", href: "/vask", kw: "vask bil wash rengøring" },
  { type: "Side", label: "Crew chat", sub: "Snak sammen", href: "/chat", kw: "chat besked snak crew" },
  { type: "Side", label: "Mine meets", sub: "Dine tilmeldte meets", href: "/mine-meets", kw: "mine meets tilmeldt" },
  { type: "Side", label: "Notifikationer", sub: "Seneste aktivitet", href: "/notifikationer", kw: "notifikationer inbox aktivitet beskeder" },
  { type: "Side", label: "Upload billeder", sub: "Til din garage", href: "/upload", kw: "upload billeder foto garage" },
  { type: "Side", label: "Indstillinger", sub: "Tema, sprog, notifikationer", href: "/indstillinger", kw: "indstillinger settings tema sprog notifikationer push" },
];

const norm = (s) => (s || "").toLowerCase();

export async function getSearchIndex() {
  const [profiles, albums, events, posts] = await Promise.all([
    rows(supabase.from("profiles").select("id, username, avatar_path")),
    rows(supabase.from("albums").select("id, slug, title, make, model, sold")),
    rows(supabase.from("events").select("id, title, starts_at")),
    rows(supabase.from("posts").select("id, title")),
  ]);

  const items = [...PAGES];

  for (const p of profiles) {
    if (!p.username) continue;
    items.push({ type: "Medlem", label: p.username, sub: "", href: `/profil?u=${encodeURIComponent(p.username)}`, kw: `${norm(p.username)} medlem member` });
  }
  for (const a of albums) {
    const spec = [a.make, a.model].filter(Boolean).join(" ");
    const label = a.title || spec || "Bil";
    items.push({
      type: "Bil",
      label,
      sub: a.sold ? "solgt" : spec,
      href: a.slug ? `/bil/${a.slug}/` : "/#garagen",
      kw: `${norm(label)} ${norm(spec)} bil car ${a.sold ? "solgt" : ""}`,
    });
  }
  for (const e of events) {
    const label = e.title || "Meet";
    items.push({
      type: "Meet",
      label,
      sub: e.starts_at ? new Date(e.starts_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" }) : "",
      href: "/events",
      kw: `${norm(label)} meet møde event cruise træf`,
    });
  }
  for (const p of posts) {
    const label = p.title || "Opslag";
    items.push({ type: "Opslag", label, sub: "", href: "/", kw: `${norm(label)} opslag nyhed post tavle` });
  }
  return items;
}
