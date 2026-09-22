export function inIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** Grok/Doke in-app browser — WebUSB is blocked. Need real Chrome. */
export function isAndroidWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  return isAndroid() && /; wv\)/.test(navigator.userAgent);
}

export function usbBlockedReason(): "iframe" | "webview" | null {
  if (inIframe()) return "iframe";
  if (isAndroidWebView()) return "webview";
  return null;
}

export function openFullTab() {
  if (typeof window === "undefined") return;
  window.open(window.location.href, "_blank", "noopener,noreferrer");
}
