"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VIEW_COUNT_KEY = "club90s:pageViews";
const DISMISSED_KEY = "club90s:installDismissed";
const MIN_VIEWS_BEFORE_PROMPT = 2;

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const views = Number(sessionStorage.getItem(VIEW_COUNT_KEY) ?? "0") + 1;
      sessionStorage.setItem(VIEW_COUNT_KEY, String(views));
    } catch {
      // Storage unavailable (private mode etc.) — install prompt just won't show. Non-critical.
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
      try {
        const views = Number(sessionStorage.getItem(VIEW_COUNT_KEY) ?? "0");
        const dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
        if (views >= MIN_VIEWS_BEFORE_PROMPT && !dismissed) setVisible(true);
      } catch {
        setVisible(true);
      }
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!visible || !deferredEvent) return null;

  async function install() {
    setVisible(false);
    await deferredEvent!.prompt();
    await deferredEvent!.userChoice;
    setDeferredEvent(null);
  }

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:w-80">
      <p className="text-sm text-card-foreground">Install CLUB 90s for quicker access.</p>
      <div className="flex shrink-0 gap-2">
        <button onClick={dismiss} className="rounded-md px-2 py-1 text-sm text-muted-foreground">
          Not now
        </button>
        <button onClick={install} className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
          Install
        </button>
      </div>
    </div>
  );
}
