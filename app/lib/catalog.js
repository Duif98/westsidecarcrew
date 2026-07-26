// Parts-catalog deep links for a car. We never rehost catalog data — we link
// out to the public OEM/aftermarket catalogs, VIN-prefilled where possible.
//
//  - PartSouq is the universal, VIN-aware catalog (BMW, Mercedes, Nissan, Audi,
//    SEAT, VW, Skoda …). Its search accepts a VIN directly in the URL, but it
//    can't decode some EU-spec VINs and doesn't carry Mini at all.
//  - RealOEM is the official-diagram source for the BMW group (BMW, Mini,
//    Rolls-Royce). Its serial search is a GET on /select with the VIN's last 7
//    chars; from there one "Browse Parts" click reaches /partgrp?id=<resolved>.
//  - 7zap gives stable, token-free OEM catalogs for VAG cars (SEAT, VW …) and
//    Porsche — handy for EU-spec VINs the other two can't decode.
//
// Returns [{ id, label, url }]. Empty array when there's no VIN yet.

const clean = (s = "") => s.trim();

// Normalise a VIN for matching: uppercase, strip anything that isn't a letter or
// digit (spaces, hyphens). So "wp1zzz 9pz8la81990" still matches the keys below.
const vinKey = (s = "") => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

// Per-VIN exact catalog buttons. When a VIN is listed here these buttons are
// shown verbatim and the default make-based logic is skipped — so this also
// decides which providers appear (e.g. dropping PartSouq for cars it can't
// decode). Use it whenever a VIN needs a hand-resolved catalog URL. Keyed by
// normalised VIN (see vinKey).
const VIN_CATALOGS = {
  // Nicolai's Porsche Cayenne Turbo (957, EU 2008). PartSouq can't decode the EU
  // VIN, so we open the resolved Cayenne catalog directly and keep a VIN-search
  // fallback in case that deep link's session token ever expires.
  WP1ZZZ9PZ8LA81990: [
    {
      id: "partsouq",
      label: "PartSouq — katalog",
      url: "https://partsouq.com/en/catalog/genuine/vehicle?c=Porsche&ssd=%24%2AKwGTp7aI08_L4sXa4-mBlcvf__jml5iVlIapmtLU5_Pv6-nqr7iU_tDU0OH37v-5pK6TmuTH2MXJy53WvJmA89PTwsiFj5-eyYDTz9HU1cqWn4mBx8LH08LI3YaAj8ng3ITDgoef2NS67oKLhoPTyofYzMqD8uPxg4yHh5vUypuAlpaSkYuF2pvIgZqHhJjw5pTa2sqD08SEgZqHh8Gmq-DploSNgIXAm9TKm4CFkpmVlofU1sjVw4WGm4CF5MzO35OC2gAAAABuMqrN%24&vid=857&q=",
    },
    { id: "partsouq-vin", label: "PartSouq — søg på VIN", url: "https://partsouq.com/en/search/all?q=WP1ZZZ9PZ8LA81990" },
  ],

  // Nic's Mini JCW (F56, EU 2015). Not in PartSouq. RealOEM's resolved part-
  // groups URL lands straight in the catalog — no "Browse Parts" step.
  WMWXM9100GT898496: [
    { id: "realoem", label: "RealOEM", url: "https://www.realoem.com/bmw/enUS/partgrp?id=XM91-EUR-09-2015-F56-Mini-JCW" },
  ],

  // Nic's SEAT Leon Cupra (Typ 1M, EU 2000). Not in PartSouq, and its VIN is
  // absent from the ETKA VIN decoders — so we link 7zap's stable model catalog.
  VSSZZZ1MZYR030626: [
    { id: "7zap", label: "7zap — katalog", url: "https://7zap.com/en/catalog/cars/seat/europe/leon-typ-1m-parts-catalog/" },
  ],

  // Crew BMWs, pinned to their RealOEM /partgrp id (resolved once from the VIN's
  // serial) so the button lands straight in the catalog with no "Browse Parts"
  // step. PartSouq is kept too — BMW VINs decode fine there.
  // Duif's M4 (F82, EU 2014).
  WBS3R91080K322159: [
    { id: "partsouq", label: "PartSouq", url: "https://partsouq.com/en/search/all?q=WBS3R91080K322159" },
    { id: "realoem", label: "RealOEM", url: "https://www.realoem.com/bmw/enUS/partgrp?id=3R91-EUR-10-2014-F82-BMW-M4" },
  ],
  // Lukas's M4 (F82 LCI, EU 2018).
  WBS4Y9101JAC58466: [
    { id: "partsouq", label: "PartSouq", url: "https://partsouq.com/en/search/all?q=WBS4Y9101JAC58466" },
    { id: "realoem", label: "RealOEM", url: "https://www.realoem.com/bmw/enUS/partgrp?id=4Y91-EUR-05-2018-F82N-BMW-M4" },
  ],
  // Rasmus's BMW (E46 330i, EU 2000).
  WBAAV51050JT02148: [
    { id: "partsouq", label: "PartSouq", url: "https://partsouq.com/en/search/all?q=WBAAV51050JT02148" },
    { id: "realoem", label: "RealOEM", url: "https://www.realoem.com/bmw/enUS/partgrp?id=AN55-EUR-10-2000-E46-BMW-330i" },
  ],
  // Rodmund's M2 Competition (F87 LCI, EU 2018).
  WBS2U7103KVJ13119: [
    { id: "partsouq", label: "PartSouq", url: "https://partsouq.com/en/search/all?q=WBS2U7103KVJ13119" },
    { id: "realoem", label: "RealOEM", url: "https://www.realoem.com/bmw/enUS/partgrp?id=2U71-EUR-09-2018-F87N-BMW-M2_Competition" },
  ],
};

export function catalogsFor(make = "", vin = "") {
  const v = clean(vin).toUpperCase();
  if (!v) return [];

  const pinned = VIN_CATALOGS[vinKey(vin)];
  if (pinned) return pinned;

  const m = clean(make).toLowerCase();
  const links = [];

  // PartSouq covers most makes — but not Mini, so skip it there.
  if (!m.includes("mini")) {
    links.push({ id: "partsouq", label: "PartSouq", url: `https://partsouq.com/en/search/all?q=${encodeURIComponent(v)}` });
  }

  // BMW group (BMW, Mini, Rolls-Royce) → RealOEM serial search (last 7 VIN
  // chars). That resolves the vehicle, then one "Browse Parts" click opens the
  // catalog; pin the VIN in VIN_CATALOGS to skip straight to /partgrp.
  if (m.includes("bmw") || m.includes("mini") || m.includes("rolls")) {
    links.push({
      id: "realoem",
      label: "RealOEM",
      url: `https://www.realoem.com/bmw/enUS/select?vin=${encodeURIComponent(v.slice(-7))}`,
    });
  }

  return links;
}

// Loose sanity check for the UI (VINs are 17 chars, no I/O/Q). Kept lenient so
// we never block a member from saving what's printed in their papers.
export function looksLikeVin(vin = "") {
  return /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(clean(vin));
}
