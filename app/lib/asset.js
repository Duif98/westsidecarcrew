// Prefix public assets with the GitHub Pages base path when deployed.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const asset = (p) => `${BASE_PATH}${p}`;
