import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
const errs = [];
page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", e => errs.push(String(e)));
await page.goto("http://localhost:5174/dev/arena-map", { waitUntil: "networkidle" });
await page.waitForTimeout(1500); // let the RAF camera settle + word float anim
await page.screenshot({ path: "mockups/arena-real-both.png", fullPage: true });
const cols = page.locator("body > div > div");
await cols.nth(0).screenshot({ path: "mockups/arena-real-student.png" });
await cols.nth(1).screenshot({ path: "mockups/arena-real-host.png" });
if (errs.length) console.log("PAGE ERRORS:\n" + errs.join("\n"));
else console.log("ok, no page errors");
await browser.close();
