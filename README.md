# West Side Car Crew

Mørk, luksuriøs one-page hjemmeside til bilentusiast-vennegruppen **West Side Car Crew**
(Esbjerg × Fredericia, est. 2022). Bygget i Next.js, statisk eksporteret og klar til GitHub Pages.

- Hero med parallax + Ken Burns-zoom
- "Crewet"-sektion med redaktionel typografi
- "Garagen" — galleri-grid med 9 biler og fuldskærms lightbox (tastatur + swipe)
- Elegante scroll-animationer, fuldt responsivt, respekterer `prefers-reduced-motion`

## Kom i gang

Kræver [Node.js](https://nodejs.org) 18+ (allerede installeret på denne maskine).

```bash
npm install       # installer afhængigheder (kørt én gang)
npm run dev       # udviklingsserver på http://localhost:3000
npm run build     # statisk build → mappen ./out
```

## Billeder

Original-fotos ligger **uden for** projektet (`C:\Users\chris\Desktop\Lightroom biler`).
De web-optimerede WebP-filer i `public/cars/**` er genereret og committes med i repoet.

Genskab dem (fx efter du har tilføjet nye fotos):

```bash
npm run optimize
```

Scriptet (`scripts/optimize-images.mjs`) laver to størrelser pr. billede (fuld + thumbnail),
et hero-billede og et `og.jpg` til deling, samt `app/data/photos.json`.

### Tilføj / rediger en bil

1. Læg fotos i en mappe under kilde-stien og tilføj den i `CARS`-objektet i
   `scripts/optimize-images.mjs` (vælg et `cover`-billede).
2. Kør `npm run optimize`.
3. Tilføj bilens tekst (mærke, model, ejer, spec, blurb) i `app/data/cars.js`.

`IMG_4082-Enhanced-NR.jpg` og mappen `Nurburgring Lightroom` er bevidst udeladt.

## Deploy til GitHub Pages

1. Opret et GitHub-repo og push koden:

   ```bash
   git init
   git add .
   git commit -m "West Side Car Crew website"
   git branch -M main
   git remote add origin https://github.com/<bruger>/<repo>.git
   git push -u origin main
   ```

2. På GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Den medfølgende workflow (`.github/workflows/deploy.yml`) bygger og udgiver automatisk
   ved hvert push til `main`. Sti-præfikset (`/<repo>`) sættes automatisk — så det virker
   både på `bruger.github.io/repo` og på et `bruger.github.io`-repo (root).

Siden er live et par minutter senere på adressen der vises under **Settings → Pages**.

## Teknik

Next.js 14 (App Router, `output: "export"`) · self-hostede Google Fonts (Fraunces / Inter /
JetBrains Mono) · ingen runtime-afhængigheder ud over React. Al interaktivitet er ren CSS +
små klient-komponenter, så første load er ~93 kB JS.
