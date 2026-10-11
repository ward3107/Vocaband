/** Cloudflare's JavaScript Detections bootstrap varies by response, so a
 * checked-in hash cannot authorize it. Cloudflare copies an HTTP CSP nonce
 * onto its own injected script. Keep the app's existing hash/source policy:
 * arbitrary inline scripts and event handlers remain blocked.
 * https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/#if-you-have-a-content-security-policy-csp
 */
export function addHtmlScriptNonce(headers: Headers): void {
  const policy = headers.get('Content-Security-Policy');
  if (!policy) return;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...bytes));
  headers.set('Content-Security-Policy', policy.split(';').map(part => {
    const directive = part.trim().split(/\s+/, 1)[0];
    return directive === 'script-src' || directive === 'script-src-elem'
      ? `${part.trim()} 'nonce-${nonce}'` : part.trim();
  }).join('; '));
}
