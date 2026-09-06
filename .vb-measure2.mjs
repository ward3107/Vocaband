import { chromium } from 'playwright';
const base = 'http://127.0.0.1:5200/';
const b = await chromium.launch();
for (const [w,h,lang] of [[390,844,'en'],[360,740,'en'],[320,568,'en'],[390,844,'he'],[390,844,'ar']]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const p = await ctx.newPage();
  await p.goto(base + '?lang=' + lang, { waitUntil:'networkidle', timeout:60000 }).catch(e=>console.log('goto',e.message));
  await p.waitForTimeout(2500);
  for (const sel of ['button:has-text("Accept All")','button:has-text("קבל")','button:has-text("قبول")','button:has-text("Accept")']) {
    const el = await p.$(sel); if (el) { await el.click().catch(()=>{}); break; }
  }
  await p.waitForTimeout(1800);
  const r = await p.evaluate(() => {
    const nav = document.querySelector('nav');
    const rows=[];
    nav && nav.querySelectorAll('button').forEach(el=>{ const cs=getComputedStyle(el); if(cs.display==='none')return; const b=el.getBoundingClientRect();
      rows.push({t:(el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,24), x:Math.round(b.x), right:Math.round(b.right), w:Math.round(b.width), h:Math.round(b.height), off: Math.round(b.right)>window.innerWidth||Math.round(b.x)<0});
    });
    const hero=[];
    document.querySelectorAll('main button').forEach(el=>{ const cs=getComputedStyle(el); if(cs.display==='none')return; const bb=el.getBoundingClientRect(); const py=Math.round(bb.top+window.scrollY);
      if(py<1400) hero.push({t:(el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,40), pageY:py, h:Math.round(bb.height)});
    });
    const sticky = [...document.querySelectorAll('body > div > button')].map(el=>{const bb=el.getBoundingClientRect();return {t:(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,30), top:Math.round(bb.top), op:getComputedStyle(el).opacity};});
    return { innerW:window.innerWidth, innerH:window.innerHeight, docW:document.documentElement.scrollWidth, rows, hero, sticky, dir:document.documentElement.dir, lang:document.documentElement.lang };
  });
  console.log(`\n##### ${w}x${h} lang=${lang} dir=${r.dir} docScrollW=${r.docW} #####`);
  console.log('NAV:', JSON.stringify(r.rows));
  console.log('HERO:', JSON.stringify(r.hero));
  console.log('STICKY:', JSON.stringify(r.sticky));
  await p.screenshot({ path: `/home/user/Vocaband/.vb-${w}-${lang}.png` });
  await ctx.close();
}
await b.close();
