/**
 * Detect when the app is running inside a third-party in-app browser
 * (Instagram / Facebook / WhatsApp / TikTok / LinkedIn WebView).
 *
 * Why this matters: in-app WebViews ship with crippled WebKit/Chromium
 * builds. Service workers don't register, IndexedDB quota is tiny,
 * `beforeinstallprompt` never fires, and Web Push doesn't exist. A user
 * who taps a Vocaband link from an Instagram DM lands in the Instagram
 * WebView and sees a broken-feeling experience — the offline cache
 * silently fails, the install gate has nothing to install, and the
 * student loses progress between rounds.
 *
 * Detection is intentionally UA-based. The official Apple / Google docs
 * say "use feature detection," but every actionable hint we'd test
 * (SW present, IDB quota) requires us to already be inside the WebView
 * to test, and by then the SW registration has already silently failed.
 * Reading the UA is the only way to surface the warning *before* the
 * SPA boots its caching layer.
 */

export type InAppBrowserKind =
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'tiktok'
  | 'linkedin'
  | 'snapchat'
  | 'twitter'
  | 'wechat'
  | 'line'
  | 'generic-webview'
  | null;

export interface InAppBrowserInfo {
  kind: InAppBrowserKind;
  isInApp: boolean;
  platform: 'ios' | 'android' | 'other';
}

export function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof navigator === 'undefined') {
    return { kind: null, isInApp: false, platform: 'other' };
  }
  const ua = navigator.userAgent;

  // Platform — needed because the recovery instructions differ.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const platform: InAppBrowserInfo['platform'] =
    isIOS ? 'ios' : isAndroid ? 'android' : 'other';

  // Order matters — TikTok injects "FBAN" markers in some regions, and
  // WhatsApp's UA contains "wv" too. Match the specific brands first,
  // then fall through to generic Android WebView.
  let kind: InAppBrowserKind = null;
  if (/Instagram/.test(ua)) kind = 'instagram';
  else if (/FBAN|FBAV|FB_IAB|FBIOS/.test(ua)) kind = 'facebook';
  else if (/WhatsApp/.test(ua)) kind = 'whatsapp';
  else if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) kind = 'tiktok';
  else if (/LinkedInApp/i.test(ua)) kind = 'linkedin';
  else if (/Snapchat/i.test(ua)) kind = 'snapchat';
  else if (/Twitter|TwitterAndroid/i.test(ua)) kind = 'twitter';
  else if (/MicroMessenger/i.test(ua)) kind = 'wechat';
  else if (/Line\//i.test(ua)) kind = 'line';
  else if (isAndroid && /\bwv\b|Version\/[\d.]+\s+Chrome\/[\d.]+\s+Mobile/.test(ua) && !/SamsungBrowser|EdgA|FxiOS|CriOS/.test(ua)) {
    // Generic Android WebView heuristic: the "; wv)" marker OR a Chrome
    // build that's not branded as Samsung / Edge / Firefox / Chrome-iOS.
    // Real Chrome on Android always carries "Chrome/" without "wv" and
    // without the embedded-app version suffix pattern.
    kind = 'generic-webview';
  }

  return { kind, isInApp: kind !== null, platform };
}
