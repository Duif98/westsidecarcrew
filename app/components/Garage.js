"use client";

import { useState } from "react";
import Reveal from "./Reveal";
import Lightbox from "./Lightbox";
import { asset } from "../lib/asset";
import { cars } from "../data/cars";

const FEATURE = new Set([0, 5]); // wider editorial tiles

export default function Garage() {
  const [open, setOpen] = useState(null);

  return (
    <section className="section garage" id="garagen">
      <div className="wrap">
        <Reveal className="section-head" as="div">
          <span className="overline">The Garage</span>
          <h2>Nine cars. One crew.</h2>
          <p>
            From classic American muscle to a Japanese icon. Tap a car to open
            its gallery.
          </p>
        </Reveal>

        <div className="grid">
          {cars.map((car, idx) => (
            <Reveal
              key={car.slug}
              as="button"
              className={`card ${FEATURE.has(idx) ? "feature" : ""}`}
              delay={(idx % 3) * 90}
              onClick={() => setOpen(car)}
              aria-label={`Open gallery: ${car.make} ${car.model}${
                car.owner ? " — " + car.owner : ""
              }`}
            >
              {car.cover && (
                <img
                  src={asset(`/cars/${car.slug}/thumb/${car.cover}`)}
                  alt={`${car.make} ${car.model}${car.owner ? " — " + car.owner : ""}`}
                  loading="lazy"
                />
              )}
              <span className="card-count">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M3 15l5-4 5 4M14 12l3-2 4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {car.count}
              </span>
              <div className="card-body">
                <span className="card-tag">{car.spec}</span>
                <span className="card-make">{car.make}</span>
                <span className="card-meta">
                  {car.owner && <span className="owner">{car.owner}</span>}
                  {car.owner && <span className="sep" />}
                  <span>{car.model}</span>
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {open && <Lightbox car={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
