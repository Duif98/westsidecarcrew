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
          <span className="overline">The Crew</span>
        </Reveal>

        <div className="about-grid" style={{ marginTop: "2.5rem" }}>
          <div>
            <Reveal as="p" className="about-lead">
              We met over the cars — and stayed for{" "}
              <span className="g">each other</span>.
            </Reveal>

            <Reveal as="div" className="about-body" delay={120} style={{ marginTop: "1.8rem" }}>
              <p>
                West Side Car Crew started in 2022 in Esbjerg: a group of friends
                from the harbour town, each with their own taste in horsepower.
                No club, no membership fees — just a community built on a shared
                passion and late nights in the garage.
              </p>
              <p>
                Today the crew stretches from the west coast to Fredericia, and
                the garage runs wide: classic American iron, a Japanese icon,
                German engineering and raw V8. Different cars, same crew.
              </p>

              <div className="stat-row">
                <div className="stat">
                  <b>2022</b>
                  <span>Founded</span>
                </div>
                <div className="stat">
                  <b>{cars.length}</b>
                  <span>Cars</span>
                </div>
                <div className="stat">
                  <b>ESB × FRE</b>
                  <span>Esbjerg · Fredericia</span>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal as="figure" className="about-figure" delay={80}>
            <img src={figSrc} alt="Nissan GT-R by the Little Belt Bridge" loading="lazy" />
            <figcaption>Little Belt · Golden hour</figcaption>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
