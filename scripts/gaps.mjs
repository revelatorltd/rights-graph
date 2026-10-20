/**
 * Every surface's gaps file, read into the map's Gaps page: `docs/gaps/*.md` → `src/surfaces/home/gaps.ts`.
 * A row is a gap when it sits in a table whose header starts `| # | Asked for |`.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const folder = join(root, "docs/gaps");
const plain = (cell) => {
  const text = cell.replace(/\*\*/g, "").replace(/`/g, "").trim();
  return /^[—–-]$/.test(text) ? "" : text;
};
const gaps = [];
for (const file of readdirSync(folder).filter((one) => one.endsWith(".md")).sort()) {
  const text = readFileSync(join(folder, file), "utf8");
  const title = /^#\s+(.+)$/m.exec(text)?.[1]?.replace(/^Gaps\s*[—-]\s*/, "") ?? file;
  let inTable = false;
  for (const line of text.split("\n")) {
    if (/^\|\s*#\s*\|\s*Asked for/i.test(line)) { inTable = true; continue; }
    if (!line.startsWith("|")) { inTable = false; continue; }
    if (!inTable || /^\|\s*-/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map(plain);
    if (cells.length < 3) continue;
    const [id, asked, ...rest] = cells;
    const here = rest.at(-1) ?? "";
    const frd = rest.length > 1 ? rest[0] : "";
    gaps.push({ surface: title, id, asked, frd, here });
  }
}
// DATA, not code: the rows are prose quoted from the logs, read by the Gaps page as written.
writeFileSync(join(root, "src/surfaces/home/gaps.json"), `${JSON.stringify(gaps, null, 2)}\n`);
console.log(`${gaps.length} gaps from ${new Set(gaps.map((one) => one.surface)).size} surfaces`);
