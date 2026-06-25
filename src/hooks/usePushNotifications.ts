/**
 * usePushNotifications — manage a student's push opt-in across BOTH
 * delivery channels:
 *
 *   - Web Push (Chrome / installed PWA): service worker + PushManager +
 *     VAPID. Row stored with kind='web' (endpoint + p256dh + auth).
 *   - Native FCM (Capacitor Android Play Store app): the WebView can't do
 *     Web Push, so we use @capacitor/push-notifications to get an FCM
 *     registration token. Row stored with kind='native' (endpoint = token,
 *     no key pair).
 *
 * The hook auto-detects which platform it's on. Everything is gated
 * upstream by the `push_notifications` flag; PII never leaves the device.
 *
 * Web needs VITE_VAPID_PUBLIC_KEY; native needs a Firebase-configured app
 * build. When neither is available the hook reports `supported: false`.
 */
import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "../core/supabase";
import { PUSH_CONSENT_VERSION, CLIENT_STORAGE_KEYS } from "../config/privacy-config";
import type { Language } from "./useLanguage";

// VAPID public key. Primary source is the build-time env var; if that was
// not set in the web build, we lazily fetch it from the server (the public
// key is not a secret) so Web Push still works whenever the SERVER VAPID
// keys are configured — removing the dependency on the Cloudflare build var.
let vapidPublicKey: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
let vapidKeyFetch: Promise<string | undefined> | null = null;
function ensureVapidKey(): Promise<string | undefined> {
  if (vapidPublicKey || isNative()) return Promise.resolve(vapidPublicKey);
  if (!vapidKeyFetch) {
    const api = (import.meta.env.VITE_API_URL as string | undefined) || "";
    vapidKeyFetch = fetch(`${api}/api/push/vapid-public-key`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.key) vapidPublicKey = j.key as string; return vapidPublicKey; })
      .catch(() => undefined);
  }
  return vapidKeyFetch;
}
const NATIVE_TOKEN_KEY = "vocaband_native_push_token";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export interface PushState {
  supported: boolean;
  permission: PushPermission;
  subscribed: boolean;
  busy: boolean;
}

const isNative = (): boolean => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

// Wire the "tapped the notification" handler once per app session so a tap
// deep-links to the right screen. Module-level guard avoids duplicate
// listeners when several components use this hook at the same time.
let nativeTapWired = false;
function wireNativeTap(): void {
  if (nativeTapWired || !isNative()) return;
  nativeTapWired = true;
  void PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const url = action.notification?.data?.url;
    if (typeof url === "string") { try { window.location.assign(url); } catch { /* navigation blocked */ } }
  });
}

function browserPushCapable(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function supportedNow(): boolean {
  // Native is always supported; web needs the browser APIs AND a VAPID key
  // (from the build var, or — once it resolves — the server fetch).
  return isNative() ? true : browserPushCapable() && !!vapidPublicKey;
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

function deviceLabel(): string {
  const ua = navigator.userAgent || "";
  const browser = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "device";
  return isNative() ? `App on ${os}` : `${browser} on ${os}`;
}

function keyToBase64(sub: PushSubscription, name: "p256dh" | "auth"): string {
  const key = sub.getKey(name);
  if (!key) return "";
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

// Native: ask permission, register with FCM, and resolve the device token
// from the one-shot 'registration' event (with a timeout fallback).
async function getNativeToken(): Promise<string | null> {
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return null;
  return new Promise<string | null>((resolve) => {
    let done = false;
    const finish = (v: string | null) => { if (!done) { done = true; resolve(v); } };
    PushNotifications.addListener("registration", (t) => finish(t.value));
    PushNotifications.addListener("registrationError", () => finish(null));
    void PushNotifications.register();
    setTimeout(() => finish(null), 8000);
  });
}

export function usePushNotifications(opts: { uid: string | null; lang: Language }): {
  state: PushState;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { uid, lang } = opts;
  const supported = supportedNow();
  const [state, setState] = useState<PushState>({
    supported,
    permission: supported && !isNative() ? (Notification.permission as PushPermission) : supported ? "default" : "unsupported",
    subscribed: false,
    busy: false,
  });

  const refresh = useCallback(async () => {
    if (!supported) return;
    try {
      if (isNative()) {
        const perm = await PushNotifications.checkPermissions();
        const stored = (() => { try { return localStorage.getItem(NATIVE_TOKEN_KEY); } catch { return null; } })();
        setState((s) => ({
          ...s,
          permission: perm.receive === "granted" ? "granted" : perm.receive === "denied" ? "denied" : "default",
          subscribed: !!stored && perm.receive === "granted",
        }));
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState((s) => ({ ...s, permission: Notification.permission as PushPermission, subscribed: !!sub }));
    } catch {
      /* not ready — leave state */
    }
  }, [supported]);

  useEffect(() => {
    wireNativeTap();
    // refresh() reconciles our state to the live subscription held by the
    // service worker / native plugin (external systems) — the setState only
    // fires after the async read, never synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // If the web build shipped without a VAPID key, fetch it from the server
    // and flip `supported` on once it arrives so the opt-in card can appear.
    if (!isNative() && !vapidPublicKey && browserPushCapable()) {
      void ensureVapidKey().then((k) => {
        if (k) setState((s) => ({ ...s, supported: true }));
      });
    }
  }, [refresh]);

  const storeRow = useCallback(
    async (row: { endpoint: string; p256dh: string | null; auth: string | null; kind: "web" | "native" }) => {
      if (!uid) return false;
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          uid,
          endpoint: row.endpoint,
          p256dh: row.p256dh,
          auth: row.auth,
          kind: row.kind,
          device_label: deviceLabel(),
          lang,
          consent_version: PUSH_CONSENT_VERSION,
          last_seen_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: "endpoint" },
      );
      if (error) return false;
      void supabase.from("consent_log").insert({
        uid, policy_version: PUSH_CONSENT_VERSION, terms_version: PUSH_CONSENT_VERSION, action: "accept",
      });
      try { localStorage.setItem(CLIENT_STORAGE_KEYS.pushConsentVersion, PUSH_CONSENT_VERSION); } catch { /* private mode */ }
      return true;
    },
    [uid, lang],
  );

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported || !uid) return false;
    setState((s) => ({ ...s, busy: true }));
    try {
      if (isNative()) {
        const token = await getNativeToken();
        if (!token) {
          setState((s) => ({ ...s, permission: "denied", busy: false }));
          return false;
        }
        const ok = await storeRow({ endpoint: token, p256dh: null, auth: null, kind: "native" });
        if (ok) { try { localStorage.setItem(NATIVE_TOKEN_KEY, token); } catch { /* ignore */ } }
        setState((s) => ({ ...s, permission: "granted", subscribed: ok, busy: false }));
        return ok;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((s) => ({ ...s, permission: permission as PushPermission, busy: false }));
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = await ensureVapidKey();
      if (!key) {
        setState((s) => ({ ...s, busy: false }));
        return false;
      }
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
        }));
      const ok = await storeRow({ endpoint: sub.endpoint, p256dh: keyToBase64(sub, "p256dh"), auth: keyToBase64(sub, "auth"), kind: "web" });
      setState((s) => ({ ...s, permission: "granted", subscribed: ok, busy: false }));
      return ok;
    } catch {
      setState((s) => ({ ...s, busy: false }));
      return false;
    }
  }, [supported, uid, storeRow]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!supported) return;
    setState((s) => ({ ...s, busy: true }));
    try {
      let endpoint: string | null = null;
      if (isNative()) {
        try { endpoint = localStorage.getItem(NATIVE_TOKEN_KEY); } catch { endpoint = null; }
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        endpoint = sub?.endpoint ?? null;
        if (sub) await sub.unsubscribe();
      }
      if (endpoint) {
        await supabase.from("push_subscriptions").update({ revoked_at: new Date().toISOString() }).eq("endpoint", endpoint);
        if (uid) {
          void supabase.from("consent_log").insert({
            uid, policy_version: PUSH_CONSENT_VERSION, terms_version: PUSH_CONSENT_VERSION, action: "withdraw",
          });
        }
      }
      try {
        localStorage.removeItem(CLIENT_STORAGE_KEYS.pushConsentVersion);
        localStorage.removeItem(NATIVE_TOKEN_KEY);
      } catch { /* ignore */ }
      setState((s) => ({ ...s, subscribed: false, busy: false }));
    } catch {
      setState((s) => ({ ...s, busy: false }));
    }
  }, [supported, uid]);

  return { state, subscribe, unsubscribe, refresh };
}
