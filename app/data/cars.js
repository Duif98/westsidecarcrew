import photos from "./photos.json";

// Ordered for visual rhythm across the garage grid.
const CARS = [
  {
    slug: "mark-gtr",
    make: "Nissan GT-R",
    model: "R35",
    owner: "Mark",
    spec: "Carbon · Sølv",
    tags: ["Carbon-hjelm", "APR-vinge", "Coilovers"],
    blurb:
      "Godzilla ved Lillebælt. Carbon-hjelm, fast vinge og en firehjulstrækker der spytter mod broen.",
  },
  {
    slug: "duif-m4",
    make: "BMW M4",
    model: "F82",
    owner: "Duif",
    spec: "Alpinhvid",
    tags: ["S55 Twin-Turbo", "Carbon-læbe", "M-udstødning"],
    blurb:
      "Alpinhvid F82 mod rå beton. Ren silhuet, sort tag og den karakteristiske M4-hofte.",
  },
  {
    slug: "c63s",
    make: "Mercedes-AMG",
    model: "C63 S Coupé",
    owner: "Sneff",
    spec: "Mat grå",
    tags: ["4.0 V8 Biturbo", "Mat wrap", "AMG"],
    blurb:
      "Matgrå AMG gemt i skovkanten. Bred bagpart, biturbo-V8 og en lyd der får træerne til at ryste.",
  },
  {
    slug: "corvette",
    make: "Chevrolet Corvette",
    model: "C6 Z06",
    owner: "Duif",
    spec: "Torch Red",
    tags: ["7.0 LS7 V8", "505 hk", "Targa"],
    blurb:
      "Amerikansk muskel i knaldrød. LS7-storblok, let som en fjer og højlydt som en tordenvejr.",
  },
  {
    slug: "lukas-m4",
    make: "BMW M4",
    model: "F82",
    owner: "Lukas",
    spec: "Mineralgrå · Guld",
    tags: ["Guldfælge", "Sænket", "Angel Eyes"],
    blurb:
      "Mineralgrå på guld foran Lillebæltsbroen i gyldent lys. Crewets forsidebil, uden diskussion.",
  },
  {
    slug: "hausmann-lincoln",
    make: "Lincoln Continental",
    model: "1967",
    owner: "Hausmann",
    spec: "Suicide doors",
    tags: ["V8", "Suicide doors", "Whitewalls"],
    blurb:
      "Ægte klassisk amerikaner fra ’67. Selvmordsdøre, hvide dæk og kilometervis af krom.",
  },
  {
    slug: "s8",
    make: "Audi S8",
    model: "D3",
    owner: "Thomas",
    spec: "Daytonagrå · V10",
    tags: ["5.2 V10", "Quattro", "Sleeper"],
    blurb:
      "Lamborghini-V10 i jakkesæt. En rolig direktør på motorvejen — og en ulv når det gælder.",
  },
  {
    slug: "nic-leon",
    make: "SEAT Leon",
    model: "Cupra Mk1",
    owner: "Nic",
    spec: "Recaro · Rød",
    tags: ["1.8T", "Recaro", "Sænket"],
    blurb:
      "Sleeperen fra Cupra-æraen. Recaro-skaller, dyb rød lak og turbo-hvæs mellem træerne.",
  },
  {
    slug: "panamera",
    make: "Porsche Panamera",
    model: "971",
    owner: "Dennis",
    spec: "Volcanogrå",
    tags: ["V6/V8", "GT-linje", "Fastback"],
    blurb:
      "Fire døre, ingen undskyldninger. Panameraens fastback-linje foran garageportene.",
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
