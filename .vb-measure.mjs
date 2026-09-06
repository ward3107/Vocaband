import { chromium } from 'playwright';
const url = process.argv[2] || 'http://127.0.0.1:5200/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e=>console.log('goto:', e.message));
await p.waitForTimeout(3000);
// accept cookies
const acc = await p.$('button:has-text("Accept All")') || await p.$('button:has-text("Accept")');
if (acc) { await acc.click().catch(()=>{}); console.log('clicked accept'); }
await p.waitForTimeout(2000);
const res = await p.evaluate(() => {
  const nav = document.querySelector('nav');
  const rows = [];
  nav && nav.querySelectorAll('button,a').forEach(el => {
    const cs = getComputedStyle(el); if (cs.display==='none') return;
    const r = el.getBoundingClientRect();
    rows.push({ t:(el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,40), x:Math.round(r.x), right:Math.round(r.right), w:Math.round(r.width), h:Math.round(r.height), clipped: Math.round(r.right) > window.innerWidth || r.x < 0 });
  });
  const navInner = nav ? nav.firstElementChild : null;
  return {
    innerW: window.innerWidth,
    docScrollW: document.documentElement.scrollWidth,
    navScrollW: navInner ? navInner.scrollWidth : null,
    navClientW: navInner ? navInner.clientWidth : null,
    navRows: rows,
    navH: nav ? Math.round(nav.getBoundingClientRect().height) : null,
  };
});
console.log('=== NAV @390px ===');
console.log(JSON.stringify(res, null, 1));
await p.screenshot({ path: '/home/user/Vocaband/.vb-top.png' });
// Now find hero CTAs page offsets
const hero = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('main button, main a').forEach(el => {
    const cs = getComputedStyle(el); if (cs.display==='none') return;
    const r = el.getBoundingClientRect();
    const py = Math.round(r.top + window.scrollY);
    if (py < 2000) out.push({ t:(el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,70), pageY: py, w:Math.round(r.width), h:Math.round(r.height) });
  });
  return { out, vh: window.innerHeight, heroH: Math.round(document.querySelector('main section')?.getBoundingClientRect().height || 0) };
});
console.log('=== ABOVE 2000px page content ===');
console.log(JSON.stringify(hero, null, 1));
await b.close();
