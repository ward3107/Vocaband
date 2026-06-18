import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
await p.goto("file://" + process.cwd() + "/mockups/rich-world-big.html");
await p.waitForTimeout(500);
await p.screenshot({ path: "mockups/rich-world-big.png", fullPage: true });
await b.close();
console.log(errs.length?("ERR:"+errs.join("|")):"ok");
