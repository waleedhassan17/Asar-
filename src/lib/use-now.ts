"use client";

import { useSyncExternalStore } from "react";

/**
 * The wall clock as an external store.
 *
 * Every countdown in Asar depends on "now", which is neither a prop nor
 * derivable during render — reading Date.now() in a component body is
 * impure and would also hydrate differently to the server. Modelling the
 * clock as a subscription is the honest shape: one shared ticker, a null
 * server snapshot, and no setState-in-effect dance.
 */

let current = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  current = Date.now();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    current = Date.now();
    timer = setInterval(tick, 1000);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  return current;
}

function getServerSnapshot(): number | null {
  return null;
}

/**
 * Returns the current timestamp, or null until the component has mounted
 * on the client. Callers render a placeholder for the null case, which
 * keeps server and client markup identical.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
