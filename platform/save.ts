/**
 * The two things the browser does for a file that no declared form of the design system does yet
 * (gaps.md B6, docs/gaps/files.md): SAVE bytes under a name, and PRINT a report to a page.
 *
 * Kept OUT of `src/` on purpose. `check:page` reads every file under `src/` as a page, and a page
 * may neither draw an element nor press one from code — rightly. This is not a page: it is the
 * stand-in for the `downloads` command the system is asked for, and it goes when that lands.
 * Everything that decides WHAT is saved — the name, the format, the content — is in
 * `src/rights/files.ts`, which the check reads like any page.
 */

/** Bytes saved under the name given: an anchor with `download`, pressed once and removed; its address revoked after. */
export function saveBlob(name: string, blob: Blob) {
  const address = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = address;
  anchor.download = name;
  anchor.rel = "noopener";
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoked once the browser has taken the bytes — at once would cancel the save in some browsers.
  setTimeout(() => URL.revokeObjectURL(address), 1000);
}

const escape = (text: string) => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);

/**
 * A table printed as its own document — the print dialog's "Save as PDF" makes the file. Drawn in
 * a hidden frame, outside the app's page, in the browser's own type; the frame goes after.
 */
export function printTable(title: string, lines: readonly string[], headers: readonly string[], rows: readonly (readonly string[])[]) {
  const html = [
    `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title></head><body>`,
    `<h1>${escape(title)}</h1>`,
    ...lines.map((one) => `<p>${escape(one)}</p>`),
    `<table border="1" cellspacing="0" cellpadding="4"><thead><tr>${headers.map((one) => `<th>${escape(one)}</th>`).join("")}</tr></thead><tbody>`,
    ...rows.map((row) => `<tr>${row.map((one) => `<td>${escape(one)}</td>`).join("")}</tr>`),
    "</tbody></table></body></html>",
  ].join("");
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.append(frame);
}
