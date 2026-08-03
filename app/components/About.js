"use client";

import Reveal from "./Reveal";
import { asset } from "../lib/asset";
import { cars } from "../data/cars";
import { useT } from "../lib/i18n";

export default function About() {
  const { t } = useT();
  const figure = cars.find((c) => c.slug === "mark-gtr");
  const figSrc = figure?.cover
    ? asset(`/cars/${figure.slug}/${figure.cover}`)
    : asset("/hero-gtr-hd.webp");

  return (
    <section className="section about" id="crewet">
      <div className="wrap">
        <Reveal className="section-head" as="div">
          <span className="overline">{t("about.overline")}</span>
        </Reveal>

        <div className="about-grid" style={{ marginTop: "2.5rem" }}>
          <div>
            <Reveal as="p" className="about-lead">
              {t("about.leadA")}
              <span className="g">{t("about.leadEm")}</span>{t("about.leadB")}
            </Reveal>

            <Reveal as="div" className="about-body" delay={120} style={{ marginTop: "1.8rem" }}>
              <p>{t("about.p1")}</p>
              <p>{t("about.p2")}</p>

              <div className="stat-row">
                <div className="stat">
                  <b>2022</b>
                  <span>{t("about.founded")}</span>
                </div>
                <div className="stat">
                  <b>{cars.length}</b>
                  <span>{t("about.cars")}</span>
                </div>
                <div className="stat">
                  <b>ESB × FRE</b>
                  <span>{t("about.esbFreSub")}</span>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal as="figure" className="about-figure" delay={80}>
            <img src={figSrc} alt={t("about.figAlt")} loading="lazy" />
            <figcaption>{t("about.figCaption")}</figcaption>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
