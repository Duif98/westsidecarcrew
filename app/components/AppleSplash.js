import { asset } from "../lib/asset";

// iOS PWA launch screens. iOS picks the <link rel="apple-touch-startup-image">
// whose media query matches the device, so it shows a branded splash instead of
// a blank screen while the installed app boots. One entry per common iPhone.
const SPLASHES = [
  { px: "1179x2556", w: 393, h: 852, r: 3 },
  { px: "1290x2796", w: 430, h: 932, r: 3 },
  { px: "1170x2532", w: 390, h: 844, r: 3 },
  { px: "1284x2778", w: 428, h: 926, r: 3 },
  { px: "1125x2436", w: 375, h: 812, r: 3 },
  { px: "1242x2688", w: 414, h: 896, r: 3 },
  { px: "828x1792", w: 414, h: 896, r: 2 },
  { px: "750x1334", w: 375, h: 667, r: 2 },
];

export default function AppleSplash() {
  return (
    <>
      {SPLASHES.map((s) => (
        <link
          key={s.px}
          rel="apple-touch-startup-image"
          href={asset(`/apple-splash-${s.px}.png`)}
          media={`(device-width: ${s.w}px) and (device-height: ${s.h}px) and (-webkit-device-pixel-ratio: ${s.r}) and (orientation: portrait)`}
        />
      ))}
    </>
  );
}
