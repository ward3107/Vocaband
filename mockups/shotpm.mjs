import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 2 });
await p.goto("file://" + process.cwd() + "/mockups/premium.html");
await p.waitForTimeout(500);
await p.screenshot({ path: "mockups/premium.png", fullPage: true });
await b.close(); console.log("shot");
