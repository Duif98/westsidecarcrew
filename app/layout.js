import { Fraunces, Hanken_Grotesk } from "next/font/google";
import { asset } from "./lib/asset";
import AuthProvider from "./lib/AuthProvider";
import NavMenu from "./components/NavMenu";
import TabBar from "./components/TabBar";
import SwipeBack from "./components/SwipeBack";
import ScrollTop from "./components/ScrollTop";
import Toaster from "./components/Toaster";
import LangSwitcher from "./components/LangSwitcher";
import { PwaProvider } from "./components/PwaProvider";
import { PresenceProvider } from "./components/PresenceProvider";
import PushPrompt from "./components/PushPrompt";
import AppleSplash from "./components/AppleSplash";
import { I18nProvider } from "./lib/i18n";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "West Side Car Crew — Car enthusiasts from the west coast",
  description:
    "West Side Car Crew is a group of friends and car enthusiasts from Esbjerg and Fredericia, founded in 2022. See the garage: BMW M4, Nissan GT-R, AMG C63 S, Corvette Z06 and more.",
  metadataBase: new URL("https://westsidecarcrew.dk"),
  openGraph: {
    title: "West Side Car Crew",
    description:
      "A group of friends and car enthusiasts from the west coast. See the garage.",
    images: [{ url: asset("/og-gtr.jpg"), width: 1200, height: 630 }],
    type: "website",
  },
  icons: {
    icon: [
      { url: asset("/favicon.svg"), type: "image/svg+xml" },
      { url: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: asset("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: asset("/apple-touch-icon.png"), sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "West Side", statusBarStyle: "black-translucent" },
  applicationName: "West Side Car Crew",
};

export const viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
};

// Brand structured data so Google can recognise "West Side Car Crew" as an
// organisation (name, logo, socials, area) — helps the site show for the brand
// name. Update SITE_URL if the site moves to a custom domain.
const SITE_URL = "https://westsidecarcrew.dk";
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "West Side Car Crew",
  alternateName: "WestSideCarCrew",
  url: SITE_URL,
  // Google wants a square, crawlable logo (min 112×112) for the brand result —
  // the wide og.jpg photo doesn't qualify, so point at the square PWA icon.
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/icon-512.png`,
    width: 512,
    height: 512,
  },
  image: `${SITE_URL}/og-gtr.jpg`,
  foundingDate: "2022",
  areaServed: "Esbjerg, Fredericia, Denmark",
  sameAs: ["https://www.instagram.com/westsidecarcrew/"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="da" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <body>
        {/* Warm the connection to Supabase so the first auth/data/image request
            (especially on member pages) doesn't pay DNS+TLS cost cold. */}
        <link rel="preconnect" href="https://neezyfqzxhpxhjrefuam.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://neezyfqzxhpxhjrefuam.supabase.co" />
        <AppleSplash />
        {/* Apply the saved light/dark theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('wscc_theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <I18nProvider>
          <AuthProvider>
            <PresenceProvider>
              <PwaProvider>
                <div id="app-shell">{children}</div>
                <NavMenu />
                <TabBar />
                <SwipeBack />
                <ScrollTop />
                <Toaster />
                <LangSwitcher />
                <PushPrompt />
              </PwaProvider>
            </PresenceProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
