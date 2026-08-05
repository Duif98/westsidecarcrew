"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { registerSW } from "../lib/pwa";

// Registers the service worker once and captures the browser's install prompt so
// the nav menu can offer an "Install app" button. Also detects iOS (which has no
// beforeinstallprompt) so we can show the manual add-to-home-screen hint instead.
const PwaContext = createContext({ canInstall: false, isIOS: false, installed: false, promptInstall: async () => false });

export function PwaProvider({ children }) {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Register the service worker off the critical hydration path — it's not
    // needed for first paint, so let the main thread finish rendering first.
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
    const runReg = () => idle(() => registerSW());
    if (document.readyState === "complete") runReg();
    else window.addEventListener("load", runReg, { once: true });

    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari: standalone-capable but no install prompt event.
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    setIsIOS(iOS && !standalone);
    if (standalone) setInstalled(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return false;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome === "accepted";
  };

  return (
    <PwaContext.Provider value={{ canInstall: !!deferred, isIOS, installed, promptInstall }}>
      {children}
    </PwaContext.Provider>
  );
}

export const usePwa = () => useContext(PwaContext);
