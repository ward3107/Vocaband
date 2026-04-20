/**
 * Post-build prerender: boots headless Chrome against the built SPA,
 * waits for the landing page React tree to paint, and writes the
 * rendered HTML back into dist/client/index.html.
 *
 * Visitors landing from Google now see the real hero + CTA immediately
 * instead of the gray "Loading Vocaband..." fallback.  React hydrates
 * over the static HTML on load — no visible flash.
 *
 * Detection signal the app uses to stay quiet during prerender:
 *   navigator.userAgent.includes('VocabandPrerender')
 * main.tsx short-circuits the PKCE bootstrap when it sees this UA.
 */

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import puppeteer from 'puppeteer';

const DIST_DIR = join(process.cwd(), 'dist');
const PORT = 4173;
const ROUTES = ['/'];

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.mp3': 'audio/mpeg',
};

function startStaticServer(): Promise<() => Promise<void>> {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://localhost:${PORT}`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/' || !extname(pathname)) {
        pathname = '/index.html';
      }
      const filePath = join(DIST_DIR, pathname);
      if (!filePath.startsWith(DIST_DIR)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const content = await readFile(filePath);
      res.writeHead(200, {
        'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, () => {
      resolve(
        () =>
          new Promise<void>(resolveClose => {
            server.close(() => resolveClose());
          })
      );
    });
  });
}

async function prerenderRoute(
  browser: Awaited<ReturnType<typeof puppeteer.launch>>,
  route: string
): Promise<void> {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (compatible; HeadlessChrome) VocabandPrerender/1.0'
  );
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    console.log(`[prerender:browser:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[prerender:browser:pageerror] ${message}`);
  });
  page.on('requestfailed', req => {
    console.log(
      `[prerender:browser:requestfailed] ${req.url()} — ${req.failure()?.errorText ?? 'unknown'}`
    );
  });

  const target = `http://localhost:${PORT}${route}`;
  console.log(`[prerender] navigating to ${target}`);

  await page.goto(target, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  try {
    await page.waitForSelector('[data-landing-ready]', { timeout: 30_000 });
  } catch (err) {
    const rootSnapshot = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.slice(0, 2000) : '(no root)';
    });
    console.log('[prerender] TIMEOUT — #root contents snapshot:');
    console.log(rootSnapshot);
    throw err;
  }

  const rootHTML = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML : '';
  });

  if (!rootHTML || rootHTML.length < 500) {
    throw new Error(
      `[prerender] captured HTML is suspiciously small (${rootHTML.length} bytes) — aborting.`
    );
  }

  const indexPath = join(DIST_DIR, 'index.html');
  let html = await readFile(indexPath, 'utf8');

  // Swap the `<div id="root">…</div>` fallback for the rendered tree.
  // The non-greedy regex stops at the FIRST `</div></div>` after the
  // root opening tag — matching the current loader shape of
  // `<div id="root"><div id="boot-debug">…</div></div>`.
  const replaced = html.replace(
    /<div id="root">[\s\S]*?<\/div><\/div>/,
    `<div id="root">${rootHTML}</div>`
  );

  if (replaced === html) {
    throw new Error(
      '[prerender] failed to locate <div id="root">…</div></div> in index.html'
    );
  }

  await writeFile(indexPath, replaced, 'utf8');
  console.log(
    `[prerender] wrote ${rootHTML.length.toLocaleString()} bytes to ${indexPath} for ${route}`
  );
  await page.close();
}

async function main() {
  const stop = await startStaticServer();
  console.log(`[prerender] serving ${DIST_DIR} on :${PORT}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const route of ROUTES) {
      await prerenderRoute(browser, route);
    }
  } finally {
    await browser.close();
    await stop();
  }
  console.log('[prerender] done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
