/**
 * Scaffold a `ru:` block in every Record<Language, T>-shaped object
 * literal that already has en/he/ar but no ru.  The inserted block
 * mirrors the `en:` value verbatim, so selecting Russian shows
 * English text until each file is translated.  Idempotent.
 *
 * Detection is structural: any object literal with en + he + ar
 * properties is treated as a translation map (locale files, inline
 * lookup maps in components, etc).
 *
 * Formatting strategy: copy the separator text that already exists
 * between the last two properties (e.g. `,\n    ` for multi-line,
 * `, ` for single-line) so the inserted block matches the host
 * literal's style.
 *
 * Run with: tsx scripts/scaffold-russian-locale.ts
 */
import * as ts from "typescript";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const propKey = (p: ts.ObjectLiteralElementLike): string | null => {
  if (!ts.isPropertyAssignment(p)) return null;
  const name = p.name;
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name)) return name.text;
  return null;
};

interface MapInfo {
  enProp: ts.PropertyAssignment;
  lastProp: ts.PropertyAssignment;
  prevProp: ts.PropertyAssignment | null;
}

const inspectLiteral = (node: ts.ObjectLiteralExpression): MapInfo | null => {
  let enProp: ts.PropertyAssignment | null = null;
  let hasHe = false;
  let hasAr = false;
  let hasRu = false;
  const assignments: ts.PropertyAssignment[] = [];
  for (const p of node.properties) {
    if (!ts.isPropertyAssignment(p)) continue;
    assignments.push(p);
    const key = propKey(p);
    if (key === "en") enProp = p;
    else if (key === "he") hasHe = true;
    else if (key === "ar") hasAr = true;
    else if (key === "ru") hasRu = true;
  }
  if (!enProp || !hasHe || !hasAr || hasRu) return null;
  if (assignments.length < 2) return null;
  const lastProp = assignments[assignments.length - 1];
  const prevProp = assignments[assignments.length - 2];
  return { enProp, lastProp, prevProp };
};

interface Edit {
  start: number;
  end: number;
  replacement: string;
}

const processFile = (filePath: string): { edits: number; changed: boolean } => {
  const source = fs.readFileSync(filePath, "utf-8");
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const edits: Edit[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const info = inspectLiteral(node);
      if (info) {
        const { enProp, lastProp, prevProp } = info;

        // Pull the verbatim text of the en value as the ru fallback.
        const enValueText = source.substring(
          enProp.initializer.getStart(sf),
          enProp.initializer.getEnd()
        );

        // Find the separator the source already uses between properties.
        // After each PropertyAssignment a trailing comma may or may not
        // exist; account for it before reading the gap to the next prop.
        const prevEnd = prevProp.getEnd();
        const prevHasComma = source[prevEnd] === ",";
        const sepStart = prevEnd + (prevHasComma ? 1 : 0);
        const sepText = source.substring(sepStart, lastProp.getStart(sf));

        // Insertion point: after the last property's trailing comma,
        // if any; otherwise right after the last property.
        const lastEnd = lastProp.getEnd();
        const lastHasComma = source[lastEnd] === ",";
        const insertPos = lastEnd + (lastHasComma ? 1 : 0);

        // Always end the new property with a comma — the host literal's
        // closing `}` follows, and a trailing comma is valid TS.
        const leadingComma = lastHasComma ? "" : ",";
        const insertion = leadingComma + sepText + "ru: " + enValueText + ",";

        edits.push({ start: insertPos, end: insertPos, replacement: insertion });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (edits.length === 0) return { edits: 0, changed: false };

  // Apply in reverse so offsets stay valid.
  edits.sort((a, b) => b.start - a.start);
  let out = source;
  for (const e of edits) {
    out = out.substring(0, e.start) + e.replacement + out.substring(e.end);
  }
  fs.writeFileSync(filePath, out, "utf-8");
  return { edits: edits.length, changed: true };
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

let totalEdits = 0;
let touched = 0;
for (const f of files) {
  const { edits, changed } = processFile(f);
  if (changed) {
    touched++;
    totalEdits += edits;
    console.log(`  + ${edits} ru block(s) → ${path.relative(ROOT, f)}`);
  }
}
console.log(`\nDone. Inserted ${totalEdits} ru block(s) across ${touched} file(s).`);
