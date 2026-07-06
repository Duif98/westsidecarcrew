import Reveal from "./Reveal";

const IG = "https://www.instagram.com/westsidecarcrew/";

export default function Footer() {
  return (
    <footer className="footer" id="kontakt">
      <div className="wrap">
        <Reveal className="footer-grid" as="div">
          <div className="footer-mark">
            West Side <em>Car Crew</em>
          </div>
          <div className="footer-cta">
            <span className="overline">Follow along</span>
            <a className="ig-btn" href={IG} target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
              </svg>
              @westsidecarcrew
            </a>
          </div>
        </Reveal>

        <div className="footer-fine">
          <span>Esbjerg × Fredericia · Est. 2022</span>
          <span>Built for the crew</span>
        </div>
      </div>
    </footer>
  );
}
