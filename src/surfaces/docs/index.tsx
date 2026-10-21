import { AppShell, type ShellPageGroup, type ShellProduct } from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";

import { href } from "../../route";
import { Arriving } from "../arriving";
import { DOCS as DOCS_UTILITY, UTILITIES, elsewhereFrom } from "../family";
import { KINDS } from "./data";
import { docsHref, pageOf } from "./pages";

/**
 * The docs library — specifications, architecture and playbooks — read as one product behind the
 * book at the foot of every surface's rail. It has no destinations of its own: the book IS the
 * library, so the book is the destination its section nav hangs from.
 */
const LIBRARY: readonly ShellPageGroup[] = [
  { label: "Library", pages: [{ name: "All docs", opens: docsHref() }] },
  { label: "By kind", pages: KINDS.map((one) => ({ name: one.page, opens: docsHref(one.segment) })) },
];

const PRODUCT: ShellProduct = {
  workspace: { name: "Rights Graph", mark: ORGANIZATIONS.revelator.art },
  destinations: [],
  // The rail's foot, as on every surface — the book given the library's pages, so its nav shows here.
  utilities: UTILITIES.map((one) => (one === DOCS_UTILITY ? { ...one, pages: LIBRARY } : one)),
  elsewhere: elsewhereFrom("docs"),
  user: { name: "Reader", email: "The docs need no account", commands: [[{ label: "Open the map", opens: href("home") }]] },
};

/** `#/docs`, `#/docs/<kind>`, `#/docs/<docId>`. */
export function Docs({ path }: { path: readonly string[] }) {
  const { place, body } = pageOf(path[0]);
  return (
    <AppShell product={PRODUCT} place={place}>
      <Arriving>{body}</Arriving>
    </AppShell>
  );
}
