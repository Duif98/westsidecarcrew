import { BASE_PATH } from "./lib/asset";

// Web app manifest (Next metadata route → /manifest.webmanifest). Next prefixes
// the route with basePath automatically, but NOT the icon/start_url values, so
// we prefix those with BASE_PATH ourselves. In production the custom domain
// means BASE_PATH is empty and everything is served from the root.
export default function manifest() {
  return {
    name: "West Side Car Crew",
    short_name: "West Side",
    description:
      "West Side Car Crew — biler, meets og galleri for crewet fra vestkysten.",
    id: `${BASE_PATH}/`,
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0b0d",
    theme_color: "#0a0b0d",
    lang: "da",
    dir: "ltr",
    categories: ["lifestyle", "social"],
    icons: [
      { src: `${BASE_PATH}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE_PATH}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${BASE_PATH}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Meets", short_name: "Meets", url: `${BASE_PATH}/events/` },
      { name: "Crew chat", short_name: "Chat", url: `${BASE_PATH}/chat/` },
      { name: "Garagen", short_name: "Garage", url: `${BASE_PATH}/#garagen` },
    ],
  };
}
