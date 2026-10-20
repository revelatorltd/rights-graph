import { AppShell, type ShellProduct } from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";

import { resetGraph } from "../../graph/fixtures";
import { homeHref, pageOf } from "./pages";

/**
 * The map of the prototypes — what a reviewer opens first. Nine surfaces around one graph, the
 * parties who use them, the six flows that prove they fit, the approaches taken where the FRD left a
 * choice, and every gap the screens found in the design system.
 */
const PRODUCT: ShellProduct = {
  workspace: { name: "Rights Graph", mark: ORGANIZATIONS.revelator.art },
  destinations: [
    {
      name: "Map",
      mark: "grid",
      opens: homeHref("surfaces"),
      pages: [
        {
          pages: [
            { name: "Surfaces", opens: homeHref("surfaces") },
            { name: "Personas", opens: homeHref("personas") },
            { name: "Flows", opens: homeHref("flows") },
            { name: "Approaches", opens: homeHref("approaches") },
            { name: "Design system gaps", opens: homeHref("gaps") },
          ],
        },
      ],
    },
  ],
  user: { name: "Bruno Guez", email: "bruno@revelator.com", commands: [[{ label: "Reset the demo", opens: resetGraph }], [{ label: "Sign out", opens: () => {} }]] },
};

export function Home({ path }: { path: readonly string[] }) {
  const [page = "surfaces", id] = path;
  const { place, body } = pageOf(page, id);
  return (
    <AppShell product={PRODUCT} place={place}>
      {body}
    </AppShell>
  );
}

