import { AppShell, type ShellProduct } from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";

import { resetGraph } from "../../graph/fixtures";
import { NETWORKS, setNetwork, useNetwork, type Network } from "../../graph/network";
import { advanceClock } from "../../graph/notify";
import { href } from "../../route";
import { Arriving } from "../arriving";
import { homeHref, pageOf } from "./pages";

/**
 * The map of the prototypes — what a reviewer opens first. Nine surfaces around one graph, the
 * parties who use them, the six flows that prove they fit, the approaches taken where the FRD left a
 * choice, and every gap the screens found in the design system.
 */
const productOf = (network: Network): ShellProduct => ({
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
  user: {
    name: "Bruno Guez",
    email: "bruno@revelator.com",
    commands: [
      [{ label: "Reset the demo", opens: resetGraph }],
      // The demo clock (S4-5): a week on, what is left unanswered goes up a role.
      [
        { label: "Advance the clock a week", opens: () => advanceClock(7) },
        { label: "Open the escalation clock", opens: href("console", "notifications", "escalation") },
      ],
      // The network the graph is read over (a stand-in): slow to watch pages arrive, offline to see them fail.
      [
        {
          label: "Network",
          options: NETWORKS.map((one) => ({ value: one, label: one })),
          value: network,
          onValueChange: (value) => setNetwork(NETWORKS.find((one) => one === value) ?? "Normal"),
          noun: { one: "network", many: "networks" },
        },
      ],
      [{ label: "Sign out", opens: () => {} }],
    ],
  },
});

export function Home({ path }: { path: readonly string[] }) {
  const [page = "surfaces", id] = path;
  const { place, body } = pageOf(page, id);
  const network = useNetwork();
  return (
    <AppShell product={productOf(network)} place={place}>
      <Arriving>{body}</Arriving>
    </AppShell>
  );
}

