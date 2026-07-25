"use client";

import { useEffect, useRef } from "react";
import { asset } from "../lib/asset";
import { totalPhotos, cars } from "../data/cars";
import { useT } from "../lib/i18n";

export default function Hero() {
  const mediaRef = useRef(null);
  const { t } = useT();

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
        <img
          src={asset("/hero.webp")}
          alt={t("hero.imgAlt")}
          fetchPriority="high"
        />
      </div>
      <div className="hero-scrim" />

      <div className="hero-inner">
        <div className="hero-overline">
          <p className="overline rise" style={{ animationDelay: "0.1s" }}>
            {t("hero.overline")}
          </p>
        </div>
        <h1>
          <span className="rise" style={{ display: "block", animationDelay: "0.18s" }}>
            West Side
          </span>
          <span className="rise" style={{ display: "block", animationDelay: "0.28s" }}>
            <em>Car Crew</em>
          </span>
        </h1>
        <p className="hero-sub rise" style={{ animationDelay: "0.42s" }}>
          {t("hero.sub")}
        </p>

        <div className="hero-meta rise" style={{ animationDelay: "0.54s" }}>
          <div className="stat">
            <b>{cars.length}</b>
            <span>{t("hero.cars")}</span>
          </div>
          <div className="stat">
            <b>2022</b>
            <span>{t("hero.founded")}</span>
          </div>
          <div className="stat">
            <b>{totalPhotos}</b>
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
