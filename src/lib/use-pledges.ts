"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  EMPTY_PLEDGES,
  getPledgeSnapshot,
  subscribeToPledges,
  type StoredPledge,
} from "@/lib/visitor";

/**
 * The pledges this browser has made on a given mission (C-102).
 *
 * localStorage is an external mutable source, so it's read through a
 * subscription rather than copied into state inside an effect. The server
 * snapshot is a shared empty array, which means the section renders as
 * absent during SSR and fills in on hydration.
 */
export function usePledges(missionSlug: string): StoredPledge[] {
  const getSnapshot = useCallback(() => getPledgeSnapshot(missionSlug), [missionSlug]);
  const getServerSnapshot = useCallback(() => EMPTY_PLEDGES, []);

  return useSyncExternalStore(subscribeToPledges, getSnapshot, getServerSnapshot);
}
