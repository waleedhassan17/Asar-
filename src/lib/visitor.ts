"use client";

/**
 * Anonymous visitor identity, held entirely in the browser.
 *
 * Contributors are not asked to create an account (that would defeat the
 * whole point of a low-friction ask), so two things live in localStorage:
 *
 *  - a stable random `visitor_hash`, used for rate limiting and for
 *    de-duplicating endorsements and give-link clicks;
 *  - the `manage_token` returned for each pledge, which is the only way
 *    to later self-confirm it (C-102).
 *
 * Neither is a credential for anything else, and neither is derived from
 * the person's IP, device or any other identifier we didn't generate.
 */

const HASH_KEY = "asar.visitor";
const PLEDGE_KEY = "asar.pledges";
const NAME_KEY = "asar.name";

export interface StoredPledge {
  id: string;
  manageToken: string;
  missionSlug: string;
  status: string;
  label: string;
  createdAt: string;
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getVisitorHash(): string {
  if (typeof window === "undefined") return "";
  try {
    let hash = localStorage.getItem(HASH_KEY);
    if (!hash) {
      hash = randomId();
      localStorage.setItem(HASH_KEY, hash);
    }
    return hash;
  } catch {
    // Private mode with storage disabled: fall back to a per-session value.
    return randomId();
  }
}

export function readStoredName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberName(name: string) {
  try {
    if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
  } catch {
    /* ignore */
  }
}

export function readPledges(missionSlug?: string): StoredPledge[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLEDGE_KEY);
    const all: StoredPledge[] = raw ? JSON.parse(raw) : [];
    return missionSlug ? all.filter((p) => p.missionSlug === missionSlug) : all;
  } catch {
    return [];
  }
}

export function savePledge(pledge: StoredPledge) {
  try {
    const all = readPledges();
    const next = [pledge, ...all.filter((p) => p.id !== pledge.id)].slice(0, 100);
    localStorage.setItem(PLEDGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  notifyPledgeChange();
}

export function updatePledgeStatus(id: string, status: string) {
  try {
    const all = readPledges().map((p) => (p.id === id ? { ...p, status } : p));
    localStorage.setItem(PLEDGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  notifyPledgeChange();
}

/* ------------------------------------------------------------------ */
/* Subscription over localStorage, so components can read pledges       */
/* through useSyncExternalStore instead of copying them into state in   */
/* an effect. Snapshots are cached per mission and only rebuilt when     */
/* something actually changes, which keeps the reference stable.        */
/* ------------------------------------------------------------------ */
const pledgeListeners = new Set<() => void>();
const snapshots = new Map<string, StoredPledge[]>();
let version = 0;
let snapshotVersion = -1;

export function subscribeToPledges(listener: () => void) {
  pledgeListeners.add(listener);

  // Another tab confirming a pledge should update this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === PLEDGE_KEY) notifyPledgeChange();
  };
  if (pledgeListeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    pledgeListeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function notifyPledgeChange() {
  version += 1;
  pledgeListeners.forEach((listener) => listener());
}

export function getPledgeSnapshot(missionSlug: string): StoredPledge[] {
  if (snapshotVersion !== version) {
    snapshots.clear();
    snapshotVersion = version;
  }
  let cached = snapshots.get(missionSlug);
  if (!cached) {
    cached = readPledges(missionSlug);
    snapshots.set(missionSlug, cached);
  }
  return cached;
}

export const EMPTY_PLEDGES: StoredPledge[] = [];
