/**
 * useFeatureFlag — read an admin-managed kill-switch from public.feature_flags.
 *
 * Pattern: a single module-level cache holds the snapshot of all flags after
 * the first read; subsequent calls resolve synchronously. A background refresh
 * every 5 minutes keeps the cache fresh enough for kill-switch latency.
 *
 * If the table isn't deployed yet (migration not applied), the hook degrades
 * to `defaultValue` so callers don't crash. The cache also seeds with the
 * caller's default so the first paint isn't blocked on the network.
 *
 * Writes (admin only) happen via the developer dashboard RPCs.
 */
import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";

interface FlagRow {
  key: string;
  enabled: boolean;
}

let flagsSnapshot: Map<string, boolean> | null = null;
let inflight: Promise<Map<string, boolean>> | null = null;
let lastFetchedAt = 0;
const REFRESH_MS = 5 * 60 * 1000;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

async function loadFlags(): Promise<Map<string, boolean>> {
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, enabled");
    if (error) {
      // Table missing / RLS denied → empty snapshot, callers fall back to default.
      flagsSnapshot = new Map();
    } else {
      flagsSnapshot = new Map((data ?? []).map((r: FlagRow) => [r.key, r.enabled]));
    }
    lastFetchedAt = Date.now();
    notify();
    return flagsSnapshot;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Force a refresh of all flags. Useful after admin toggles. */
export function refreshFeatureFlags(): Promise<void> {
  flagsSnapshot = null;
  lastFetchedAt = 0;
  return loadFlags().then(() => undefined);
}

export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const [value, setValue] = useState<boolean>(() => flagsSnapshot?.get(key) ?? defaultValue);

  useEffect(() => {
    const update = () => setValue(flagsSnapshot?.get(key) ?? defaultValue);
    listeners.add(update);

    const stale = !flagsSnapshot || Date.now() - lastFetchedAt > REFRESH_MS;
    if (stale) void loadFlags();
    else update();

    return () => {
      listeners.delete(update);
    };
  }, [key, defaultValue]);

  return value;
}
