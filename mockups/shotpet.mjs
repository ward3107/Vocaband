import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 2 });
await p.goto("file://" + process.cwd() + "/mockups/pets.html");
await p.waitForTimeout(450);
await p.screenshot({ path: "mockups/pets.png", fullPage: true });
await b.close(); console.log("shot");
