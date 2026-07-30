import { supabase } from "./supabaseClient";

// Builds a flat, client-side search index across the public data the site
// already exposes: members, cars (albums), meets and posts. Fail-safe — a
// missing table or blocked query just contributes nothing.
const rows = (p) => p.then((r) => r.data || []).catch(() => []);

export async function getSearchIndex() {
  const [profiles, albums, events, posts] = await Promise.all([
    rows(supabase.from("profiles").select("id, username, avatar_path")),
    rows(supabase.from("albums").select("id, slug, title, make, model, sold")),
    rows(supabase.from("events").select("id, title, starts_at")),
    rows(supabase.from("posts").select("id, title")),
  ]);

  const items = [];
  for (const p of profiles) {
    if (!p.username) continue;
    items.push({ type: "Medlem", label: p.username, sub: "", href: `/profil?u=${encodeURIComponent(p.username)}` });
  }
  for (const a of albums) {
    const spec = [a.make, a.model].filter(Boolean).join(" ");
    items.push({
      type: "Bil",
      label: a.title || spec || "Bil",
      sub: a.sold ? "solgt" : spec,
      href: a.slug ? `/bil/${a.slug}/` : "/#garagen",
    });
  }
  for (const e of events) {
    items.push({
      type: "Meet",
      label: e.title || "Meet",
      sub: e.starts_at ? new Date(e.starts_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" }) : "",
      href: "/events",
    });
  }
  for (const p of posts) {
    items.push({ type: "Opslag", label: p.title || "Opslag", sub: "", href: "/" });
  }
  return items;
}
