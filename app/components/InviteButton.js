"use client";

import { useState } from "react";
import { getCrewCode } from "../lib/photos";
import { BASE_PATH } from "../lib/asset";

export default function InviteButton() {
  const [state, setState] = useState("idle"); // idle | busy | copied | error

  const invite = async () => {
    setState("busy");
    try {
      const code = await getCrewCode();
      const link = `${window.location.origin}${BASE_PATH}/login?code=${encodeURIComponent(code)}`;
      const text = `Kom med i West Side Car Crew 🚗\nOpret dig her – koden er allerede i linket:\n${link}`;
      if (navigator.share) {
        await navigator.share({ title: "West Side Car Crew", text });
        setState("idle");
      } else {
        await navigator.clipboard.writeText(text);
        setState("copied");
        setTimeout(() => setState("idle"), 2500);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <button className="invite-btn" onClick={invite} disabled={state === "busy"}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M18 8v6M15 11h6" />
      </svg>
      {state === "copied" ? "Link kopieret!" : state === "error" ? "Prøv igen" : state === "busy" ? "…" : "Inviter en ven"}
    </button>
  );
}
