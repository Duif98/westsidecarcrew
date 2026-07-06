import Reveal from "./Reveal";
import { asset } from "../lib/asset";
import { cars } from "../data/cars";

export default function About() {
  const figure = cars.find((c) => c.slug === "mark-gtr");
  const figSrc = figure?.cover
    ? asset(`/cars/${figure.slug}/${figure.cover}`)
    : asset("/hero.webp");

  return (
    <section className="section about" id="crewet">
      <div className="wrap">
        <Reveal className="section-head" as="div">
          <span className="overline">Crewet</span>
        </Reveal>

        <div className="about-grid" style={{ marginTop: "2.5rem" }}>
          <div>
            <Reveal as="p" className="about-lead">
              Vi mødtes over bilerne — og blev hængende for{" "}
              <span className="g">hinandens skyld</span>.
            </Reveal>

            <Reveal as="div" className="about-body" delay={120} style={{ marginTop: "1.8rem" }}>
              <p>
                West Side Car Crew startede i 2022 i Esbjerg: en flok venner fra
                havnebyen med hver sin smag i benzin. Ingen klub, intet
                kontingent — bare et fællesskab bygget på fælles interesse og
                sene aftener i garagen.
              </p>
              <p>
                I dag strækker crewet sig fra vestkysten til Fredericia, og
                garagen spænder vidt: klassisk amerikaner, japansk ikon, tysk
                håndværk og rå V8. Forskellige biler, samme besætning.
              </p>

              <div className="stat-row">
                <div className="stat">
                  <b>2022</b>
                  <span>Grundlagt</span>
                </div>
                <div className="stat">
                  <b>{cars.length}</b>
                  <span>Biler</span>
                </div>
                <div className="stat">
                  <b>ESB × FRE</b>
                  <span>Esbjerg · Fredericia</span>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal as="figure" className="about-figure" delay={80}>
            <img src={figSrc} alt="Nissan GT-R foran Lillebæltsbroen" loading="lazy" />
            <figcaption>Lillebælt · Golden hour</figcaption>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
