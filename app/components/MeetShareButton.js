"use client";

import { useState } from "react";
import { BASE_PATH } from "../lib/asset";
import { toastSuccess, toastError } from "../lib/toast";
import { success, tap } from "../lib/haptics";
import { useT } from "../lib/i18n";

// Share a single meet outside the site. On mobile this opens the native share
// sheet (Messenger, WhatsApp, SMS, …); elsewhere it copies the deep link.
// The link opens /events with ?meet=<id>, which pops the meet's detail dialog.
export default function MeetShareButton({ event, className = "" }) {
  const { t, locale } = useT();
  const [state, setState] = useState("idle"); // idle | busy | copied

  const share = async () => {
    tap();
    setState("busy");
    const url = `${window.location.origin}${BASE_PATH}/events/?meet=${event.id}`;
    const when = new Date(event.starts_at).toLocaleString(locale, {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
    const text = `${event.title} — ${when}${event.location ? " · " + event.location : ""}\n${t("meet.shareText")}`;

    const copy = async () => {
      await navigator.clipboard.writeText(url);
      setState("copied");
      success();
      toastSuccess(t("meet.shareCopied"));
      setTimeout(() => setState("idle"), 2500);
    };

    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text, url });
        setState("idle");
      } else {
        await copy();
      }
    } catch (e) {
      if (e?.name === "AbortError") { setState("idle"); return; } // user dismissed the sheet
      // Share unavailable/blocked — fall back to copying the link.
      try { await copy(); }
      catch { setState("idle"); toastError(t("meet.shareError")); }
    }
  };

  return (
    <button type="button" className={`md-dir md-share ${className}`} onClick={share} disabled={state === "busy"}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {state === "copied" ? t("meet.shareCopied") : t("meet.share")}
    </button>
  );
}
