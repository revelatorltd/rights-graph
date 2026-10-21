import { formatDate, formatMeta } from "@revelator/pro-ui";

import { TODAY } from "../../graph/fixtures";
import { GRAPH_VERSION } from "../../graph/resolve";
import { download } from "../../rights/files";
import { slug } from "../../route";
import { DOCS, KINDS, docById, productAt, type Doc, type DocKind, type Table } from "./data";

/**
 * The docs as Markdown — ONE serializer over the same data the pages draw, so a file and the screen
 * never drift. A doc is its sections in the page's order: headings, paragraphs, GFM tables, numbered
 * steps, `- [ ]` checklists and a `> [!WARNING]` for what is still open. A collection is a front
 * matter, a table of contents, then each doc a level down.
 */

const MARKDOWN = "text/markdown;charset=utf-8";

/** A cell as a GFM table holds it: no pipe and no line break may break the row. */
const cellOf = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

function table(columns: readonly string[], rows: readonly (readonly string[])[]): string {
  return [
    `| ${columns.map(cellOf).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((_, at) => cellOf(row[at] ?? "")).join(" | ")} |`),
  ].join("\n");
}

const tableOf = (one: Table) => table(one.columns, one.rows);

/** A URL's fragment mark — what a link to a heading inside the same file starts with. */
const FRAGMENT = "#";

/** A heading's anchor, as GitHub writes it. */
const anchorOf = (heading: string) =>
  FRAGMENT +
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");

const headingOf = (doc: Doc) => `${doc.id} ${doc.title}`;

/**
 * A prototype address as a link a reader can follow from the file: the page where the site is
 * served — the published site, or the dev server the file was saved from — and the address on it.
 */
const linkTo = (address: string) => {
  const site = new URL(".", globalThis.document?.baseURI ?? "http://localhost:5195/").href;
  // An address is the hash route, with the persona query before it where it has one.
  const route = address.startsWith("?") || address.startsWith("#") ? address : "#".concat(address);
  return `[${address}](${site}${route})`;
};

/** The front matter a file opens with. */
function frontMatter(fields: Record<string, string>): string {
  return ["---", ...Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`), "---"].join("\n");
}

/** One doc's body, its sections headed one level below `depth`. */
function body(doc: Doc, depth: number): string {
  const h = "#".repeat(depth + 1);
  const parts: string[] = [];
  parts.push(
    [
      formatMeta([`**${doc.id}**`, doc.kind, `Applies to ${doc.appliesTo}`, `Owner: ${doc.owner}`, `Updated ${formatDate(doc.updated, "day")}`]),
      "",
      `Open in the prototype: ${linkTo(doc.prototype)}`,
    ].join("\n"),
  );
  if (doc.kind === "Playbook") {
    parts.push(`${h} When to use\n\n${doc.when}`);
    parts.push(`${h} Steps\n\n${doc.steps.map((one, at) => `${at + 1}. ${one.does}${one.opens ? ` — ${linkTo(one.opens)}` : ""}`).join("\n")}`);
    if (doc.rules.length) parts.push(`${h} Decision rules\n\n${doc.rules.map((one) => `- ${one}`).join("\n")}`);
    parts.push(`${h} ${doc.checklist.title}\n\n${doc.checklist.items.map((one) => `- [ ] ${one}`).join("\n")}`);
    if (doc.table) parts.push(`${h} ${doc.table.title}\n\n${tableOf(doc.table)}`);
    parts.push(
      `${h} Never break\n\nOne break fails the work.\n\n${table(
        ["ID", "Never", "Damage"],
        doc.invariants.map((one) => [one.id, one.rule, one.damage]),
      )}`,
    );
    if (doc.open.length) parts.push(["> [!WARNING]", "> **Open items [CONFIRM]**", ">", ...doc.open.map((one) => `> - ${one}`)].join("\n"));
  } else {
    parts.push(`${h} Summary\n\n${doc.summary}`);
    if (doc.kind === "Specification")
      parts.push(
        `${h} Requirements\n\n${table(
          ["ID", "Requirement", "Priority", "Acceptance", "In the prototype", "Where", "Stand-in"],
          doc.requirements.map((one) => [
            one.id,
            one.requirement,
            one.priority,
            one.acceptance,
            one.built,
            one.where ? `${productAt(one.where)} — ${linkTo(one.where)}` : "",
            one.note ?? "",
          ]),
        )}`,
      );
    for (const one of doc.tables ?? []) parts.push(`${h} ${one.title}\n\n${tableOf(one)}`);
    parts.push(
      `${h} Decisions and open questions\n\n${doc.questions.map((one) => `- **${one.state}** — ${one.question} ${one.answer}`).join("\n")}`,
    );
  }
  const related = doc.related.map(docById).filter((one): one is Doc => Boolean(one));
  if (related.length) parts.push(`${h} Related docs\n\n${related.map((one) => `- ${headingOf(one)} (${one.kind})`).join("\n")}`);
  return parts.join("\n\n");
}

/** One doc as its own file. */
export function docMarkdown(doc: Doc): string {
  const head = frontMatter({
    title: doc.title,
    id: doc.id,
    kind: doc.kind,
    version: GRAPH_VERSION,
    generated: formatDate(TODAY, "day"),
  });
  return `${head}\n\n# ${headingOf(doc)}\n\n${body(doc, 1)}\n`;
}

/** Several docs as one file: a contents, then each doc in the library's order. */
export function collectionMarkdown(title: string, docs: readonly Doc[], kind?: DocKind): string {
  const head = frontMatter({
    title,
    id: kind ? (KINDS.find((one) => one.kind === kind)?.segment ?? "docs") : "docs",
    kind: kind ?? "Library",
    version: GRAPH_VERSION,
    generated: formatDate(TODAY, "day"),
  });
  const contents = docs.map((one) => `- [${headingOf(one)}](${anchorOf(headingOf(one))})`).join("\n");
  const sections = docs.map((one) => `## ${headingOf(one)}\n\n${body(one, 2)}`).join("\n\n---\n\n");
  return `${head}\n\n# ${title}\n\n## Contents\n\n${contents}\n\n---\n\n${sections}\n`;
}

/** The file a doc is saved under — `SPEC-03-s1-rights-workspace.md`. */
export const fileOf = (doc: Doc) => `${doc.id}-${slug(doc.title)}.md`;

export const downloadDoc = (doc: Doc) => download(fileOf(doc), docMarkdown(doc), MARKDOWN);

/** A kind of doc, or the whole library, as one file. */
export function downloadCollection(kind?: DocKind) {
  const filed = KINDS.find((one) => one.kind === kind);
  const docs = filed ? DOCS.filter((one) => one.kind === filed.kind) : DOCS;
  const title = filed ? `Rights Graph — ${filed.page}` : "Rights Graph — Docs";
  download(`rights-graph-${filed?.segment ?? "docs"}.md`, collectionMarkdown(title, docs, filed?.kind), MARKDOWN);
}

/** The index's downloads: each kind, then everything. */
export const DOWNLOADS = [
  { label: "Download all specifications", opens: () => downloadCollection("Specification") },
  { label: "Download all architecture", opens: () => downloadCollection("Architecture") },
  { label: "Download all playbooks", opens: () => downloadCollection("Playbook") },
  { label: "Download everything", opens: () => downloadCollection() },
] as const;
