import { chromium } from 'playwright';
const base='http://127.0.0.1:5200/';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage();
await p.goto(base,{waitUntil:'networkidle',timeout:60000});
await p.waitForTimeout(2500);
const acc=await p.$('button:has-text("Accept All")'); if(acc) await acc.click();
await p.waitForTimeout(1500);
// open drawer via the mobile "Sign in" pill
await p.locator('nav button:has-text("Sign in")').first().click();
await p.waitForTimeout(900);
await p.screenshot({path:'/home/user/Vocaband/.vb-drawer.png'});
const drawer = await p.evaluate(()=>{
  const d=document.querySelector('[role="dialog"][aria-modal="true"]');
  if(!d) return null;
  const items=[...d.querySelectorAll('button')].map(el=>{const r=el.getBoundingClientRect();return{t:(el.innerText||el.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,60),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};});
  const panel=d.querySelector('div.absolute.top-0');
  return {items, panelW: panel?Math.round(panel.getBoundingClientRect().width):null, panelX: panel?Math.round(panel.getBoundingClientRect().x):null};
});
console.log('DRAWER ITEMS IN DOM ORDER:'); console.log(JSON.stringify(drawer,null,1));
// Now click the teacher gate
await p.locator('[role="dialog"] button:has-text("Sign in")').first().click();
await p.waitForTimeout(3000);
const tl = await p.evaluate(()=>({
  url: location.href, path: location.pathname,
  buttons: [...document.querySelectorAll('button,a')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {t:(e.innerText||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,45), y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};}),
  bodyH: document.body.scrollHeight,
}));
console.log('TEACHER LOGIN:'); console.log(JSON.stringify(tl,null,1));
await p.screenshot({path:'/home/user/Vocaband/.vb-teacherlogin.png'});
await b.close();
