// West Side Car Crew — Danish license-plate lookup (Supabase Edge Function).
// A logged-in member sends { reg }; we proxy to MotorAPI (v1.motorapi.dk) with
// our server-side token and return normalized car specs to prefill "Add car".
// The API token never reaches the browser, and there is no browser CORS to fight.
//
// Auth: deployed with verify_jwt OFF (the platform's JWT gate 401s the browser's
// CORS preflight — the same trap send-push hit). Instead we verify the caller's
// token here with getUser(), so only logged-in members can spend the API quota.
//
// Deploy + config: see supabase/functions/README.md.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const MOTORAPI_TOKEN = Deno.env.get("MOTORAPI_TOKEN") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    // Members only — protects the daily API quota from anon/bots.
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    const sb = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(jwt);
    if (!user) return json({ ok: false, error: "unauthorized" }, 401);

    if (!MOTORAPI_TOKEN) return json({ ok: false, error: "unconfigured" });

    const { reg } = await req.json();
    const plate = String(reg || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!plate) return json({ ok: false, error: "noplate" });

    const r = await fetch(`https://v1.motorapi.dk/vehicles/${encodeURIComponent(plate)}`, {
      headers: { "X-AUTH-TOKEN": MOTORAPI_TOKEN, Accept: "application/json" },
    });
    if (r.status === 404) return json({ ok: false, error: "notfound" });
    if (r.status === 401 || r.status === 403) return json({ ok: false, error: "badtoken" });
    if (r.status === 429) return json({ ok: false, error: "quota" });
    if (!r.ok) return json({ ok: false, error: "upstream", status: r.status });

    const raw = await r.json();
    // `raw` is returned too so the exact MotorAPI field names can be verified on
    // the first live lookup and the normalizer tightened if a field is missed.
    return json({ ok: true, car: normalize(raw), raw });
  } catch (e) {
    return json({ ok: false, error: String(e) });
  }
});

// The MotorAPI response schema isn't public without a key, so find fields by a
// deep, case/underscore-insensitive key search across candidate names.
function deepFind(obj: any, names: string[]): any {
  const want = names.map((k) => k.toLowerCase().replace(/[_\s]/g, ""));
  let found: any;
  const walk = (o: any) => {
    if (found !== undefined || o == null || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      const nk = k.toLowerCase().replace(/[_\s]/g, "");
      if (want.includes(nk) && v != null && v !== "" && typeof v !== "object") { found = v; return; }
    }
    for (const v of Object.values(o)) if (v && typeof v === "object") walk(v);
  };
  walk(obj);
  return found;
}

function normalize(raw: any) {
  const make = deepFind(raw, ["make", "brand", "maerke", "vehicleMake", "manufacturer", "fabrikat"]);
  const model = deepFind(raw, ["model", "vehicleModel", "modelName"]);
  const variant = deepFind(raw, ["variant", "version", "type"]);
  const vin = deepFind(raw, ["vin", "chassisNumber", "stelnummer", "chassis"]);
  const fuel = deepFind(raw, ["fuelType", "fuel", "drivkraft", "drivmiddel", "braendstof"]);

  // Year: explicit model year, else the year part of first registration.
  let year = deepFind(raw, ["modelYear", "model_year", "year", "aargang", "aar"]);
  if (!year) {
    const first = deepFind(raw, [
      "firstRegistrationDate", "firstRegistration", "registrationDate",
      "foersteRegistreringsdato", "regFirstDate", "firstReg",
    ]);
    const m = first && String(first).match(/(\d{4})/);
    if (m) year = m[1];
  }

  // Power: DMR stores kW → convert to hp. Accept hp directly if present.
  let hp = deepFind(raw, ["enginePowerHp", "powerHp", "hk", "hestekraefter", "horsepower", "hp"]);
  if (!hp) {
    const kw = deepFind(raw, ["enginePower", "power", "kw", "effekt", "motorEffekt", "powerKw"]);
    if (kw) hp = Math.round(Number(kw) * 1.35962);
  }

  // Engine label: prefer an explicit description, else build from displacement + fuel.
  let engine = deepFind(raw, ["engine", "engineDescription", "motor", "engineName"]);
  if (!engine) {
    const disp = deepFind(raw, ["engineVolume", "displacement", "slagvolumen", "ccm", "cylinderVolume"]);
    const litre = disp ? (Number(disp) >= 100 ? (Number(disp) / 1000).toFixed(1) + "L" : Number(disp).toFixed(1) + "L") : "";
    engine = [litre, fuel].filter(Boolean).join(" ").trim() || null;
  }

  return {
    make: make ? String(make) : null,
    model: model ? String(model) : null,
    variant: variant ? String(variant) : null,
    model_year: year ? parseInt(String(year), 10) : null,
    power_hp: hp ? Math.round(Number(hp)) : null,
    engine: engine || null,
    vin: vin ? String(vin).toUpperCase() : null,
    fuel: fuel ? String(fuel) : null,
  };
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
