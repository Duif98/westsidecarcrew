/** @type {import('next').NextConfig} */

// On GitHub Pages a project site is served from /<repo>, so every asset needs
// that prefix. The deploy workflow sets NEXT_PUBLIC_BASE_PATH automatically;
// locally it is empty so the site runs from the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
