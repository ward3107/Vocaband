import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { addHtmlScriptNonce } from '../../worker/htmlCsp';
import { VIEW_PATH } from '../utils/routes';

it('adds a fresh 128-bit nonce to both script policies without allowing arbitrary inline code', () => {
  const source = readFileSync('public/_headers', 'utf8').match(/Content-Security-Policy: (.+)/)![1];
  const first = new Headers({ 'Content-Security-Policy': source });
  const second = new Headers(first);
  addHtmlScriptNonce(first); addHtmlScriptNonce(second);
  const policy = first.get('Content-Security-Policy')!;
  const nonces = [...policy.matchAll(/'nonce-([^']+)'/g)].map(match => match[1]);
  expect(nonces).toHaveLength(2);
  expect(nonces[0]).toBe(nonces[1]);
  expect(Buffer.from(nonces[0], 'base64')).toHaveLength(16);
  expect(second.get('Content-Security-Policy')).not.toBe(policy);
  for (const name of ['script-src', 'script-src-elem']) {
    const directive = policy.split(';').find(part => part.trim().startsWith(name + ' '))!;
    expect(directive).toContain("'sha256-");
    expect(directive).not.toContain("'unsafe-inline'");
    expect(directive).not.toContain("'unsafe-eval'");
  }
  expect(policy).toContain("frame-ancestors 'none'");
});
it('routes every SPA entry through the nonce and no-store response handler', () => {
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  for (const path of [...Object.values(VIEW_PATH), '/teacher', '/student', '/index.html', '/w/*', '/j/*']) {
    expect(config.assets.run_worker_first).toContain(path);
  }
});
