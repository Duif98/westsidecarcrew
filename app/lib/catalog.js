// Parts-catalog deep links for a car. We never rehost catalog data — we link
// out to the public OEM/aftermarket catalogs, VIN-prefilled where possible.
//
//  - PartSouq is the universal, VIN-aware catalog (BMW, Mercedes, Nissan, Audi,
//    SEAT, VW, Skoda …). Its search accepts a VIN directly in the URL.
//  - RealOEM is added for BMW as the nicer official-diagram source; it has no
//    stable VIN URL param, so it opens on the VIN-lookup select page.
//
// Returns [{ id, label, url }]. Empty array when there's no VIN yet.

const clean = (s = "") => s.trim();

export function catalogsFor(make = "", vin = "") {
  const v = clean(vin).toUpperCase();
  if (!v) return [];

  const m = clean(make).toLowerCase();
  const links = [
    {
      id: "partsouq",
      label: "PartSouq",
      url: `https://partsouq.com/en/search/all?q=${encodeURIComponent(v)}`,
    },
  ];

  // BMW: add RealOEM (paste VIN into the Serial Number box there).
  if (m.includes("bmw")) {
    links.push({ id: "realoem", label: "RealOEM", url: "https://www.realoem.com/bmw/enUS/select" });
  }

  return links;
}

// Loose sanity check for the UI (VINs are 17 chars, no I/O/Q). Kept lenient so
// we never block a member from saving what's printed in their papers.
export function looksLikeVin(vin = "") {
  return /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(clean(vin));
}
