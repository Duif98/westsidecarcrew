import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { asset } from "./lib/asset";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "West Side Car Crew — Bilentusiaster fra vestkysten",
  description:
    "West Side Car Crew er en vennegruppe af bilentusiaster fra Esbjerg og Fredericia, grundlagt i 2022. Se garagen: BMW M4, Nissan GT-R, AMG C63 S, Corvette Z06 og flere.",
  metadataBase: new URL("https://westsidecarcrew.github.io"),
  openGraph: {
    title: "West Side Car Crew",
    description:
      "En vennegruppe af bilentusiaster fra vestkysten. Se garagen.",
    images: [{ url: asset("/og.jpg"), width: 1200, height: 630 }],
    type: "website",
  },
  icons: {
    icon: [{ url: asset("/favicon.svg"), type: "image/svg+xml" }],
  },
};

export const viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="da" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
