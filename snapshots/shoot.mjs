import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.SNAP_URL || "http://127.0.0.1:4317/snapshots/index.html";
const OUT = "snapshots-out";
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (name, fn) => { try { await fn(); } catch (e) { console.log(`  ! ${name}: ${e.message.split("\n")[0]}`); } };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByText("Teachers", { exact: false }).first().waitFor({ timeout: 8000 });
await sleep(900);

// 1 — command-center overview (sticky bar + KPI sparklines)
await page.screenshot({ path: `${OUT}/01-overview.png` });
console.log("✓ 01-overview");

// 2 — Classes tab: bulk select + an expanded row's actions
await step("classes tab", async () => {
  await page.getByRole("button", { name: "Classes", exact: true }).click();
  await page.getByText("Grade 7 — Set 2").first().waitFor({ timeout: 5000 });
  await sleep(400);
  const boxes = page.getByRole("checkbox");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.getByRole("button", { name: /Grade 9 — Set 3/ }).click(); // expand a row → show actions
  await sleep(500);
});
await page.screenshot({ path: `${OUT}/02-classes-bulk.png` });
console.log("✓ 02-classes-bulk");

// 3 — ⌘K command palette with a live cross-entity query
await step("palette", async () => {
  await page.keyboard.press("Control+KeyK");
  await sleep(300);
  await page.keyboard.type("haifa", { delay: 50 });
  await sleep(800);
  await page.mouse.move(5, 5); // park cursor so no row shows a hover highlight
  await sleep(150);
});
await page.screenshot({ path: `${OUT}/03-command-palette.png` });
await step("close palette", async () => { await page.keyboard.press("Escape"); await sleep(300); });
console.log("✓ 03-command-palette");

// 4 — Person 360 drawer (via User lookup → Open full profile)
await step("person drawer", async () => {
  await page.getByRole("button", { name: "User lookup", exact: true }).click();
  await sleep(300);
  await page.getByPlaceholder(/Search by email/).fill("ariella");
  await page.getByText("Ariella Katz").first().waitFor({ timeout: 5000 });
  await sleep(400);
  await page.getByRole("button", { name: /Ariella Katz/ }).click();
  await sleep(300);
  await page.getByRole("button", { name: /Open full profile/ }).click();
  await sleep(600);
});
await page.screenshot({ path: `${OUT}/04-person-360.png` });
console.log("✓ 04-person-360");

// 5 — Entitlements tab: bulk multi-select bar
await step("entitlements bulk", async () => {
  await page.keyboard.press("Escape"); // close the drawer if open
  await page.getByRole("button", { name: "Entitlements", exact: true }).click();
  await page.getByText("ariella.katz@telaviv-bilingual.edu").first().waitFor({ timeout: 5000 });
  await sleep(300);
  const boxes = page.getByRole("checkbox");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await sleep(400);
});
await page.screenshot({ path: `${OUT}/05-entitlements-bulk.png` });
console.log("✓ 05-entitlements-bulk");

// 6 — Security ops tab: folded authorization-failure log
await step("security authz", async () => {
  await page.getByRole("button", { name: "Security ops", exact: true }).click();
  await page.getByText("Authorization failures").first().waitFor({ timeout: 5000 });
  await sleep(500);
});
await page.screenshot({ path: `${OUT}/06-security-authz.png` });
console.log("✓ 06-security-authz");

await browser.close();
console.log("done");
