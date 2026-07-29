import { supabase } from "./supabaseClient";

// Danish license-plate → car specs, via the members-only "plate-lookup" Edge
// Function which proxies MotorAPI server-side so the API token never ships to
// the browser (and there is no browser CORS to fight). Fails soft so the manual
// "Add car" form always works even when the lookup is down or unconfigured.
//
// NB: Supabase's dashboard auto-names deployed functions (send-push became
// "swift-service"). If this function's slug differs, update PLATE_FN to match —
// otherwise the invoke 404s and lookups silently fall back to manual entry.
const PLATE_FN = "plate-lookup";

// → { ok:true, car:{make,model,variant,model_year,power_hp,engine,vin,fuel} }
//   or { ok:false, error:"notfound"|"unauthorized"|"unconfigured"|"quota"|… }
export async function lookupPlate(reg) {
  const plate = String(reg || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (plate.length < 2) return { ok: false, error: "noplate" };
  try {
    const { data, error } = await supabase.functions.invoke(PLATE_FN, { body: { reg: plate } });
    if (error) return { ok: false, error: "network" };
    return data || { ok: false, error: "empty" };
  } catch {
    return { ok: false, error: "network" };
  }
}
