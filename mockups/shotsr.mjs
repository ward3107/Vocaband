import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
await p.goto("file://" + process.cwd() + "/mockups/style-refine.html");
await p.waitForTimeout(450);
await p.screenshot({ path: "mockups/style-refine.png", fullPage: true });
await b.close(); console.log(errs.length?("ERR:"+errs.join("|")):"ok");
