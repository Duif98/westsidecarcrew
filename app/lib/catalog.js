// Parts-catalog deep links for a car. We never rehost catalog data — we link
// out to the public OEM/aftermarket catalogs, VIN-prefilled where possible.
//
//  - PartSouq is the universal, VIN-aware catalog (BMW, Mercedes, Nissan, Audi,
//    SEAT, VW, Skoda …). Its search accepts a VIN directly in the URL.
//  - RealOEM is the nicer official-diagram source for the whole BMW group (BMW,
//    Mini, Rolls-Royce). Its "Serial Number" lookup is a plain GET on /select
//    with the VIN's last 7 chars, so we deep-link straight into that search
//    instead of dumping the member on the empty select page.
//
// Returns [{ id, label, url }]. Empty array when there's no VIN yet.

const clean = (s = "") => s.trim();

// Normalise a VIN for matching: uppercase, strip anything that isn't a letter or
// digit (spaces, hyphens). So "wp1zzz 9pz8la81990" still matches the key below.
const vinKey = (s = "") => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

// Per-VIN PartSouq overrides. Some cars can't be resolved by PartSouq's VIN
// search — typically EU-spec models whose VIN carries the "ZZZ" filler that the
// decoder rejects. For those we hard-link the exact catalog URL we want the
// member's PartSouq button to open. Keyed by normalised VIN (see vinKey).
//
//  - WP1ZZZ9PZ8LA81990: Nicolai's Porsche Cayenne Turbo (957, EU 2008). PartSouq
//    can't decode the EU VIN, so the button opens this resolved Cayenne catalog
//    URL directly instead of the (failing) VIN search.
const PARTSOUQ_VIN_OVERRIDES = {
  WP1ZZZ9PZ8LA81990:
    "https://partsouq.com/en/catalog/genuine/vehicle?c=Porsche&ssd=%24%2AKwGTp7aI08_L4sXa4-mBlcvf__jml5iVlIapmtLU5_Pv6-nqr7iU_tDU0OH37v-5pK6TmuTH2MXJy53WvJmA89PTwsiFj5-eyYDTz9HU1cqWn4mBx8LH08LI3YaAj8ng3ITDgoef2NS67oKLhoPTyofYzMqD8uPxg4yHh5vUypuAlpaSkYuF2pvIgZqHhJjw5pTa2sqD08SEgZqHh8Gmq-DploSNgIXAm9TKm4CFkpmVlofU1sjVw4WGm4CF5MzO35OC2gAAAABuMqrN%24&vid=857&q=",
};

// Per-VIN RealOEM overrides — an exact catalog URL we resolved by hand for a
// specific car. RealOEM's URLs are stable and carry no session token, so these
// don't expire like the PartSouq deep links do. Keyed by normalised VIN.
//
//  - WMWXM9100GT898496: a crew member's Mini JCW (F56, EU 2015). PartSouq can't
//    decode it, and RealOEM's live serial search can be flaky, so we pin the
//    resolved part-groups page directly.
const REALOEM_VIN_OVERRIDES = {
  WMWXM9100GT898496:
    "https://www.realoem.com/bmw/enUS/partgrp?id=XM91-EUR-09-2015-F56-Mini-JCW",
};

export function catalogsFor(make = "", vin = "") {
  const v = clean(vin).toUpperCase();
  if (!v) return [];

  const m = clean(make).toLowerCase();
  const override = PARTSOUQ_VIN_OVERRIDES[vinKey(vin)];
  const vinSearch = `https://partsouq.com/en/search/all?q=${encodeURIComponent(v)}`;

  const links = [
    {
      id: "partsouq",
      label: override ? "PartSouq — katalog" : "PartSouq",
      url: override || vinSearch,
    },
  ];

  // When we hard-link a resolved catalog URL (which can carry an expiring
  // session token), keep a plain VIN-search button as a fallback so the member
  // always has a working path if that deep link ever stops resolving.
  if (override) {
    links.push({ id: "partsouq-vin", label: "PartSouq — søg på VIN", url: vinSearch });
  }

  // BMW group (BMW, Mini, Rolls-Royce) → RealOEM. Deep-link the serial search
  // (last 7 VIN chars) so it runs the lookup instead of opening a blank form,
  // unless we've pinned an exact resolved catalog URL for this VIN.
  if (m.includes("bmw") || m.includes("mini") || m.includes("rolls")) {
    const serial = v.slice(-7);
    links.push({
      id: "realoem",
      label: "RealOEM",
      url:
        REALOEM_VIN_OVERRIDES[vinKey(vin)] ||
        `https://www.realoem.com/bmw/enUS/select?vin=${encodeURIComponent(serial)}`,
    });
  }

  return links;
}

// Loose sanity check for the UI (VINs are 17 chars, no I/O/Q). Kept lenient so
// we never block a member from saving what's printed in their papers.
export function looksLikeVin(vin = "") {
  return /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(clean(vin));
}
