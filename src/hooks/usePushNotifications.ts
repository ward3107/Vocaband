/**
 * usePushNotifications — manage a student's Web Push opt-in.
 *
 * Responsibilities:
 *   - Detect browser support (serviceWorker + PushManager + Notification).
 *   - Subscribe: request permission → PushManager.subscribe(VAPID) → store
 *     the subscription in `push_subscriptions` and log consent.
 *   - Unsubscribe: tear down the browser subscription, soft-revoke the row,
 *     and log withdrawal.
 *
 * The whole feature is gated upstream by the `push_notifications` flag —
 * this hook just does the plumbing. PII never leaves the device here: we
 * store only the opaque endpoint + the W3C public keys.
 *
 * Requires VITE_VAPID_PUBLIC_KEY at build time; when absent the hook
 * reports `supported: false` so the UI hides itself cleanly.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import { PUSH_CONSENT_VERSION, CLIENT_STORAGE_KEYS } from "../config/privacy-config";
import type { Language } from "./useLanguage";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export interface PushState {
  /** Browser can do Web Push AND we have a VAPID key configured. */
  supported: boolean;
  /** Current Notification permission, or 'unsupported'. */
  permission: PushPermission;
  /** True when an active push subscription exists for this device. */
  subscribed: boolean;
  /** A subscribe/unsubscribe call is in flight. */
  busy: boolean;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

// VAPID keys are base64url; PushManager wants a Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Best-effort, human-readable device label (UX only, never used for auth).
function deviceLabel(): string {
  const ua = navigator.userAgent || "";
  const browser = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "device";
  return `${browser} on ${os}`;
}

function keyToBase64(sub: PushSubscription, name: "p256dh" | "auth"): string {
  const key = sub.getKey(name);
  if (!key) return "";
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

export function usePushNotifications(opts: { uid: string | null; lang: Language }): {
  state: PushState;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { uid, lang } = opts;
  const supported = isSupported();
  const [state, setState] = useState<PushState>({
    supported,
    permission: supported ? (Notification.permission as PushPermission) : "unsupported",
    subscribed: false,
    busy: false,
  });

  const refresh = useCallback(async () => {
    if (!supported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState((s) => ({
        ...s,
        permission: Notification.permission as PushPermission,
        subscribed: !!sub,
      }));
    } catch {
      /* SW not ready yet — leave state as-is */
    }
  }, [supported]);

  useEffect(() => {
    // refresh() reads the live subscription state from the service worker
    // (an external system) and reconciles our state to it — the setState
    // only fires after the async SW read, never synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported || !uid) return false;
    setState((s) => ({ ...s, busy: true }));
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((s) => ({ ...s, permission: permission as PushPermission, busy: false }));
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string) as BufferSource,
        }));

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          uid,
          endpoint: sub.endpoint,
          p256dh: keyToBase64(sub, "p256dh"),
          auth: keyToBase64(sub, "auth"),
          device_label: deviceLabel(),
          lang,
          consent_version: PUSH_CONSENT_VERSION,
          last_seen_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: "endpoint" },
      );
      if (error) throw error;

      // Record the channel-consent opt-in (best-effort).
      void supabase.from("consent_log").insert({
        uid,
        policy_version: PUSH_CONSENT_VERSION,
        terms_version: PUSH_CONSENT_VERSION,
        action: "accept",
      });
      try {
        localStorage.setItem(CLIENT_STORAGE_KEYS.pushConsentVersion, PUSH_CONSENT_VERSION);
      } catch {
        /* private mode — server row is the source of truth */
      }

      setState((s) => ({ ...s, permission: "granted", subscribed: true, busy: false }));
      return true;
    } catch {
      setState((s) => ({ ...s, busy: false }));
      return false;
    }
  }, [supported, uid, lang]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!supported) return;
    setState((s) => ({ ...s, busy: true }));
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase
          .from("push_subscriptions")
          .update({ revoked_at: new Date().toISOString() })
          .eq("endpoint", sub.endpoint);
        if (uid) {
          void supabase.from("consent_log").insert({
            uid,
            policy_version: PUSH_CONSENT_VERSION,
            terms_version: PUSH_CONSENT_VERSION,
            action: "withdraw",
          });
        }
        await sub.unsubscribe();
      }
      try {
        localStorage.removeItem(CLIENT_STORAGE_KEYS.pushConsentVersion);
      } catch {
        /* ignore */
      }
      setState((s) => ({ ...s, subscribed: false, busy: false }));
    } catch {
      setState((s) => ({ ...s, busy: false }));
    }
  }, [supported, uid]);

  return { state, subscribe, unsubscribe, refresh };
}
