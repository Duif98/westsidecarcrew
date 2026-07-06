import photos from "./photos.json";

// Ordered for visual rhythm across the garage grid.
const CARS = [
  {
    slug: "mark-gtr",
    make: "Nissan GT-R",
    model: "R35",
    owner: "Mark",
    spec: "Carbon · Silver",
    tags: ["Carbon hood", "APR wing", "Coilovers"],
    blurb:
      "Godzilla by the Little Belt. Carbon hood, fixed wing and all-wheel drive launching toward the bridge.",
  },
  {
    slug: "duif-m4",
    make: "BMW M4",
    model: "F82",
    owner: "Duif",
    spec: "Alpine White",
    tags: ["S55 Twin-Turbo", "Carbon lip", "M exhaust"],
    blurb:
      "Alpine White F82 against raw concrete. Clean silhouette, black roof and that signature M4 haunch.",
  },
  {
    slug: "c63s",
    make: "Mercedes-AMG",
    model: "C63 S Coupé",
    owner: "Sneff",
    spec: "Matte grey",
    tags: ["4.0 V8 Biturbo", "Matte wrap", "AMG"],
    blurb:
      "Matte-grey AMG tucked into the treeline. Wide hips, a biturbo V8 and a soundtrack that shakes the branches.",
  },
  {
    slug: "corvette",
    make: "Chevrolet Corvette",
    model: "C6 Z06",
    owner: "Duif",
    spec: "Torch Red",
    tags: ["7.0 LS7 V8", "505 hp", "Targa"],
    blurb:
      "American muscle in bright red. LS7 big block, feather-light and loud as a thunderstorm.",
  },
  {
    slug: "lukas-m4",
    make: "BMW M4",
    model: "F82",
    owner: "Lukas",
    spec: "Mineral Grey · Gold",
    tags: ["Gold wheels", "Lowered", "Angel Eyes"],
    blurb:
      "Mineral grey on gold in front of the Little Belt Bridge at golden hour. The crew's cover car, no debate.",
  },
  {
    slug: "hausmann-lincoln",
    make: "Lincoln Continental",
    model: "1967",
    owner: "Hausmann",
    spec: "Suicide doors",
    tags: ["V8", "Suicide doors", "Whitewalls"],
    blurb:
      "A genuine '67 American classic. Suicide doors, whitewall tyres and miles of chrome.",
  },
  {
    slug: "s8",
    make: "Audi S8",
    model: "D3",
    owner: "Thomas",
    spec: "Daytona Grey · V10",
    tags: ["5.2 V10", "Quattro", "Sleeper"],
    blurb:
      "A Lamborghini V10 in a business suit. A calm executive on the motorway — and a wolf when it counts.",
  },
  {
    slug: "nic-leon",
    make: "SEAT Leon",
    model: "Cupra Mk1",
    owner: "Nic",
    spec: "Recaro · Red",
    tags: ["1.8T", "Recaro", "Lowered"],
    blurb:
      "The sleeper from the Cupra era. Recaro buckets, deep red paint and turbo hiss between the trees.",
  },
  {
    slug: "panamera",
    make: "Porsche Panamera",
    model: "971",
    owner: "Dennis",
    spec: "Volcano Grey",
    tags: ["V6/V8", "GT line", "Fastback"],
    blurb:
      "Four doors, no apologies. The Panamera's fastback line in front of the garage doors.",
  },
];

export const cars = CARS.map((c) => {
  const set = photos[c.slug] || [];
  return {
    ...c,
    photos: set,
    cover: set[0]?.src ?? null,
    count: set.length,
  };
});

export const totalPhotos = cars.reduce((n, c) => n + c.count, 0);
