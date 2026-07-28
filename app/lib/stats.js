import { supabase } from "./supabaseClient";

// Aggregate crew-wide numbers for the members-only dashboard. Everything is
// derived from tables we already have (albums, profiles, photos, events,
// likes) — no new migration. Fail-safe: any missing table/column just yields
// zero for that metric so the page still renders before a migration is run.

const brandOf = (a) => {
  const s = (a.make || a.title || "").trim();
  return s.split(/\s+/)[0] || "";
};

// A head-count query that returns 0 instead of throwing if the table is missing.
async function count(table) {
  try {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    return error ? 0 : count || 0;
  } catch {
    return 0;
  }
}

export async function getCrewStats() {
  const [{ data: albums }, members, photos, meets, likes] = await Promise.all([
    supabase.from("albums").select("title, make, model_year, power_hp, drivetrain").then((r) => ({ data: r.data || [] })),
    count("profiles"),
    count("photos"),
    count("events"),
    count("likes"),
  ]);

  const cars = albums.length;

  // Horsepower — only cars whose power is filled in count toward the totals.
  const withHp = albums.filter((a) => Number(a.power_hp) > 0);
  const totalHp = withHp.reduce((n, a) => n + Number(a.power_hp), 0);
  const strongest = withHp.reduce((m, a) => (Number(a.power_hp) > Number(m?.power_hp || 0) ? a : m), null);

  // Model year — average + span across cars that have a year.
  const years = albums.map((a) => Number(a.model_year)).filter((y) => y > 1900);
  const avgYear = years.length ? Math.round(years.reduce((n, y) => n + y, 0) / years.length) : null;
  const oldestYear = years.length ? Math.min(...years) : null;
  const newestYear = years.length ? Math.max(...years) : null;

  // Brand distribution (first word of make/title), most cars first.
  const brandMap = {};
  albums.forEach((a) => {
    const b = brandOf(a);
    if (b) brandMap[b] = (brandMap[b] || 0) + 1;
  });
  const brands = Object.entries(brandMap)
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "da"));

  // Drivetrain split (normalised to upper case, blanks ignored).
  const driveMap = {};
  albums.forEach((a) => {
    const d = (a.drivetrain || "").trim().toUpperCase();
    if (d) driveMap[d] = (driveMap[d] || 0) + 1;
  });
  const drivetrains = Object.entries(driveMap)
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n);

  return {
    members,
    cars,
    photos,
    meets,
    likes,
    totalHp,
    strongest: strongest ? { title: strongest.title, hp: Number(strongest.power_hp) } : null,
    carsWithHp: withHp.length,
    avgYear,
    oldestYear,
    newestYear,
    brands,
    drivetrains,
  };
}
