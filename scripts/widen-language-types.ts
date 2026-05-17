/**
 * Companion to scaffold-russian-locale.ts.  Widens the local type
 * annotations that prevented the new `ru:` blocks from typechecking:
 *
 *  - `Record<"en" | "he" | "ar", T>` → `Record<Language, T>` and
 *    inject a `Language` import if missing.
 *  - `type WorksheetLang = "en" | "he" | "ar"` → add `| "ru"`.
 *  - `type Lang = 'en' | 'he' | 'ar'` → add `| 'ru'`.
 *  - `{ en: T; he: T; ar: T }` inline shape types → add `ru: T`.
 *
 * Run with: tsx scripts/widen-language-types.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const ensureLanguageImport = (text: string, filePath: string): string => {
  if (text.includes("import type { Language }") || text.includes("import { Language }") ||
      /import\s+[^;]*\bLanguage\b[^;]*from\s+['"][^'"]*useLanguage/.test(text)) {
    return text;
  }
  // Pick a relative import path to useLanguage from the file's location.
  const fileDir = path.dirname(filePath);
  const hookPath = path.join(SRC, "hooks", "useLanguage");
  let rel = path.relative(fileDir, hookPath).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;

  // Insert after the last top-of-file import statement.
  const importRe = /^import .*?;$/gm;
  let lastEnd = -1;
  let m;
  while ((m = importRe.exec(text)) !== null) lastEnd = m.index + m[0].length;
  const importLine = `\nimport type { Language } from "${rel}";`;
  if (lastEnd >= 0) {
    return text.substring(0, lastEnd) + importLine + text.substring(lastEnd);
  }
  return importLine.trimStart() + "\n" + text;
};

const widenRecordAnnotation = (text: string): { text: string; changed: boolean } => {
  // Both quote styles.
  const re = /Record<\s*(?:"en"|'en')\s*\|\s*(?:"he"|'he')\s*\|\s*(?:"ar"|'ar')\s*,/g;
  if (!re.test(text)) return { text, changed: false };
  return { text: text.replace(re, "Record<Language,"), changed: true };
};

const widenInlineEnHeArShape = (text: string): { text: string; changed: boolean } => {
  // Match `{ en: <Type>; he: <Type>; ar: <Type> }` where the three
  // values share a single primitive/identifier type.  Cautious — we
  // only handle the simple identical-type case used in LazyComponents.
  const re = /\{\s*en:\s*([A-Za-z_$][\w$]*)\s*;\s*he:\s*\1\s*;\s*ar:\s*\1\s*\}/g;
  if (!re.test(text)) return { text, changed: false };
  return {
    text: text.replace(re, (_m, ty) => `{ en: ${ty}; he: ${ty}; ar: ${ty}; ru: ${ty} }`),
    changed: true,
  };
};

const widenWorksheetLang = (text: string): { text: string; changed: boolean } => {
  // export type WorksheetLang = "en" | "he" | "ar";  OR with single quotes
  // Idempotent: if already contains "ru", skip.
  const re = /((?:export\s+)?type\s+WorksheetLang\s*=\s*(?:"en"|'en')\s*\|\s*(?:"he"|'he')\s*\|\s*(?:"ar"|'ar'))(?!\s*\|\s*(?:"ru"|'ru'))/g;
  if (!re.test(text)) return { text, changed: false };
  return { text: text.replace(re, '$1 | "ru"'), changed: true };
};

const widenLocalLang = (text: string): { text: string; changed: boolean } => {
  // `type Lang = 'en' | 'he' | 'ar';` exact match — only widen local
  // single-file type aliases, not the central `Language` union.
  const re = /(type\s+Lang\s*=\s*(?:"en"|'en')\s*\|\s*(?:"he"|'he')\s*\|\s*(?:"ar"|'ar'))(?!\s*\|\s*(?:"ru"|'ru'))/g;
  if (!re.test(text)) return { text, changed: false };
  return { text: text.replace(re, "$1 | 'ru'"), changed: true };
};

const walk = (dir: string, hits: string[]) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, hits);
    else if (entry.isFile() && (full.endsWith(".ts") || full.endsWith(".tsx"))) hits.push(full);
  }
};

const files: string[] = [];
walk(SRC, files);

let touched = 0;
for (const f of files) {
  const before = fs.readFileSync(f, "utf-8");
  let text = before;
  let changed = false;
  let r;
  r = widenRecordAnnotation(text); text = r.text; changed = changed || r.changed;
  r = widenInlineEnHeArShape(text); text = r.text; changed = changed || r.changed;
  r = widenWorksheetLang(text); text = r.text; changed = changed || r.changed;
  r = widenLocalLang(text); text = r.text; changed = changed || r.changed;
  if (changed) {
    text = ensureLanguageImport(text, f);
    fs.writeFileSync(f, text, "utf-8");
    touched++;
    console.log(`  ~ ${path.relative(ROOT, f)}`);
  }
}
console.log(`\nDone. Widened types in ${touched} file(s).`);
