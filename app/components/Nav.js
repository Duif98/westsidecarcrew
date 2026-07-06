"use client";

import { useEffect, useState } from "react";

const IG = "https://www.instagram.com/westsidecarcrew/";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        <a href="#top" className="wordmark" aria-label="West Side Car Crew — to top">
          <span className="dot" />
          <span className="wm-full">West Side Car Crew</span>
          <span className="wm-abbr">WSCC</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#crewet" className="hide-sm">
            The Crew
          </a>
          <a href="#garagen">The Garage</a>
          <a href={IG} target="_blank" rel="noopener noreferrer" className="ig">
            Instagram
          </a>
        </nav>
      </div>
    </header>
  );
}
