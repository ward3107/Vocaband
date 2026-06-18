import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 2 });
await p.goto("file://" + process.cwd() + "/mockups/design-iter.html");
await p.waitForTimeout(400);
await p.screenshot({ path: "mockups/design-iter.png", fullPage: true });
await b.close(); console.log("shot");
