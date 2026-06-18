import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 2 });
await p.goto("file://" + process.cwd() + "/mockups/avatars-set.html");
await p.waitForTimeout(400);
await p.screenshot({ path: "mockups/avatars-set.png", fullPage: true });
await b.close(); console.log("shot");
