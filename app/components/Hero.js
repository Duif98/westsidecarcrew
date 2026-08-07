"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { asset } from "../lib/asset";
import { totalPhotos, cars } from "../data/cars";
import { useT } from "../lib/i18n";

// Count from 0 up to `target` once, on mount. Honours reduced-motion.
function useCountUp(target, ms = 1400, delay = 500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVal(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      if (!start) start = now;
      const p = Math.min((now - start) / ms, 1);
      setVal(Math.round(ease(p) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const to = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(to);
      cancelAnimationFrame(raf);
    };
  }, [target, ms, delay]);
  return val;
}

export default function Hero() {
  const mediaRef = useRef(null);
  const { t } = useT();
  const carsN = useCountUp(cars.length, 1200, 620);
  const photosN = useCountUp(totalPhotos, 1600, 700);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight);
        el.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="hero" id="top">
      <div className="hero-media" ref={mediaRef}>
        <picture>
          {/* Phones get a tall portrait crop — sharp on a tall screen without
              upscaling the wide landscape frame ~3x, and no bigger to download. */}
          <source media="(max-width: 640px)" type="image/avif" srcSet={asset("/hero-gtr-portrait.avif")} />
          <source media="(max-width: 640px)" type="image/webp" srcSet={asset("/hero-gtr-portrait.webp")} />
          {/* Tablet/desktop: landscape — AVIF first (≈40% smaller), WebP fallback.
              The hero is object-fit:cover in a full-height box, so a narrow/tall
              window (e.g. an ultrawide split into side zones) is height-bound and
              needs far more than 100vw of pixels — ask for ~2x there so it picks
              the tall hd file (1707px, enough for any ≤1440p screen) and stays sharp. */}
          <source
            type="image/avif"
            srcSet={`${asset("/hero-gtr-1280.avif")} 1280w, ${asset("/hero-gtr-1920.avif")} 1920w, ${asset("/hero-gtr-hd.avif")} 2560w`}
            sizes="(max-aspect-ratio: 3/2) 200vw, 100vw"
          />
          <source
            type="image/webp"
            srcSet={`${asset("/hero-gtr-1280.webp")} 1280w, ${asset("/hero-gtr-1920.webp")} 1920w, ${asset("/hero-gtr-hd.webp")} 2560w`}
            sizes="(max-aspect-ratio: 3/2) 200vw, 100vw"
          />
          <img src={asset("/hero-gtr-1280.webp")} alt={t("hero.imgAlt")} fetchPriority="high" />
        </picture>
      </div>
      <div className="hero-scrim" />

      <div className="hero-inner">
        <div className="hero-overline">
          <p className="overline rise" style={{ animationDelay: "0.1s" }}>
            {t("hero.overline")}
          </p>
        </div>
        <h1>
          <span className="line">
            <span className="line-i" style={{ "--d": "0.16s" }}>
              West Side
            </span>
          </span>
          <span className="line">
            <span className="line-i" style={{ "--d": "0.28s" }}>
              <em>Car Crew</em>
            </span>
          </span>
        </h1>
        <p className="hero-sub rise" style={{ animationDelay: "0.46s" }}>
          {t("hero.sub")}
        </p>

        <div className="hero-cta rise" style={{ animationDelay: "0.62s" }}>
          <a className="hero-btn primary" href="#garagen">
            <span>{t("hero.ctaGarage")}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <Link className="hero-btn ghost" href="/login">
            {t("hero.ctaJoin")}
          </Link>
        </div>

        <div className="hero-meta rise" style={{ animationDelay: "0.74s" }}>
          <div className="stat">
            <b>{carsN}</b>
            <span>{t("hero.cars")}</span>
          </div>
          <div className="stat">
            <b>2022</b>
            <span>{t("hero.founded")}</span>
          </div>
          <div className="stat">
            <b>{photosN}</b>
            <span>{t("hero.photos")}</span>
          </div>
        </div>
      </div>

      <a className="hero-scroll" href="#crewet" aria-label={t("hero.scrollAria")}>
        <span>{t("hero.scroll")}</span>
        <span className="line" />
      </a>
    </section>
  );
}
