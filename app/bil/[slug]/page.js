import { cars } from "../../data/cars";
import { asset } from "../../lib/asset";
import CarShowcase from "./CarShowcase";

// Public, shareable car pages (/bil/<slug>). Static export needs every slug up
// front: the curated cars from data/cars.js, plus any member albums fetched from
// Supabase at build time (public data). Falls back to the curated list if the
// build-time fetch fails.
const SB = "https://neezyfqzxhpxhjrefuam.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZXp5ZnF6eGhweGhqcmVmdWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MTIyMDEsImV4cCI6MjA5ODk4ODIwMX0.BPMTyMLGWKeXYZ-suh8ZY8CRpUaIBJRhl-giwUGUgbY";

export const dynamicParams = false;

export async function generateStaticParams() {
  const base = cars.map((c) => ({ slug: c.slug }));
  try {
    const r = await fetch(`${SB}/rest/v1/albums?select=slug`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
    if (!r.ok) return base;
    const albums = await r.json();
    const set = new Set(base.map((b) => b.slug));
    (albums || []).forEach((a) => a.slug && set.add(a.slug));
    return [...set].map((slug) => ({ slug }));
  } catch {
    return base;
  }
}

export async function generateMetadata({ params }) {
  const car = cars.find((c) => c.slug === params.slug);
  if (car) {
    return {
      title: `${car.make} ${car.model} — ${car.owner} · West Side Car Crew`,
      description: car.blurb,
      openGraph: {
        title: `${car.make} ${car.model}`,
        description: car.blurb,
        images: car.cover ? [{ url: asset(`/cars/${car.slug}/${car.cover}`) }] : [],
        type: "website",
      },
    };
  }
  return { title: "Bil · West Side Car Crew", description: "En bil fra West Side Car Crew." };
}

export default function Page({ params }) {
  return <CarShowcase slug={params.slug} />;
}
