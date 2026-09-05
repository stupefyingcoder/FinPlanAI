import { useEffect, useState } from "react";

import { apiUrl } from "../api/config";

/**
 * Explains the free tier's cold start.
 *
 * Render's free instances sleep after inactivity and take 30–60 seconds to wake.
 * Without this, a reviewer's first click just hangs and the app looks broken —
 * which is the most likely way a working project gets dismissed.
 *
 * Silent when the API is already awake: it only appears if /health has not
 * answered within a few seconds, and disappears the moment it does.
 */

const QUIET_MS = 3500; // don't flash the banner on a warm API
const POLL_MS = 2500;
const GIVE_UP_MS = 90000;

export default function ColdStartBanner() {
  const [state, setState] = useState("checking"); // checking | waking | ready | down

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const showIfSlow = setTimeout(() => {
      if (!cancelled) setState((s) => (s === "checking" ? "waking" : s));
    }, QUIET_MS);

    const ping = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(apiUrl("/health"), { cache: "no-store" });
        if (!cancelled && res.ok) {
          setState("ready");
          return;
        }
      } catch {
        // Still asleep, or no network yet — fall through and retry.
      }
      if (cancelled) return;
      if (Date.now() - startedAt > GIVE_UP_MS) {
        setState("down");
        return;
      }
      setTimeout(ping, POLL_MS);
    };

    ping();
    return () => {
      cancelled = true;
      clearTimeout(showIfSlow);
    };
  }, []);

  if (state === "checking" || state === "ready") return null;

  const waking = state === "waking";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full text-sm px-4 py-2.5 text-center ${
        waking ? "bg-amber-50 text-amber-900 border-b border-amber-200" : "bg-red-50 text-red-800 border-b border-red-200"
      }`}
    >
      {waking ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          Waking the server — free hosting sleeps when idle. This takes up to a minute the first time.
        </span>
      ) : (
        <span>
          The API is not responding. It may still be starting up — refresh in a minute.
        </span>
      )}
    </div>
  );
}
