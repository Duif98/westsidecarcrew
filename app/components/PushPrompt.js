"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";
import { pushState, subscribePush } from "../lib/pwa";

const KEY = "wscc_push_prompt_v1";

// A gentle, dismissible nudge shown once to a logged-in member who hasn't turned
// push notifications on yet — so the feature actually reaches the crew instead of
// staying hidden in the settings menu. Only appears when push is supported and
// neither enabled nor blocked; "Ikke nu" hides it for good (they can still enable
// it from the menu).
export default function PushPrompt() {
  const { session, user } = useAuth();
  const { t } = useT();
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!session || !user?.id) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === "1"; } catch {}
    if (dismissed) return;
    let active = true;
    const timers = [];
    (async () => {
      const s = await pushState();
      // Only nudge when it makes sense to (supported, not on, not blocked).
      if (active && (s === "granted-off" || s === "default")) {
        timers.push(setTimeout(() => active && setShow(true), 1800));
      }
    })();
    return () => { active = false; timers.forEach(clearTimeout); };
  }, [session, user?.id]);

  const dismiss = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setShow(false);
  };

  const enable = async () => {
    setBusy(true);
    await subscribePush(user?.id);
    setBusy(false);
    dismiss(); // whether granted or denied, don't nag again — the menu remains.
  };

  if (!mounted || !show) return null;

  return createPortal(
    <div className="push-prompt" role="dialog" aria-label={t("pushPrompt.title")}>
      <span className="push-prompt-ico" aria-hidden="true">🔔</span>
      <div className="push-prompt-text">
        <b>{t("pushPrompt.title")}</b>
        <span>{t("pushPrompt.body")}</span>
      </div>
      <div className="push-prompt-actions">
        <button className="push-prompt-later" onClick={dismiss}>{t("pushPrompt.later")}</button>
        <button className="push-prompt-enable" onClick={enable} disabled={busy}>
          {busy ? t("pushPrompt.enabling") : t("pushPrompt.enable")}
        </button>
      </div>
    </div>,
    document.body
  );
}
