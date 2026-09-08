"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Dev-only Turbopack chunks aren't content-hashed the way production
    // bundles are, so a cache-first service worker serves stale JS/CSS
    // across restarts during development. Production-only registration
    // avoids that entirely — the SRS's PWA requirements are about the
    // shipped app, not the dev loop.
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
