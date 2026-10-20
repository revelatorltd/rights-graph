import { Avatar, Badge, CollectionPage } from "@revelator/pro-ui";

import { partyName } from "../../../graph/fixtures";
import { COUNTERCLAIM_STEPS, type Conflict } from "../../../graph/model";
import { useGraph } from "../../../graph/resolve";
import { ME, assetName, myConflicts, rightsHref } from "./data";

const SEVERITY = ["High", "Medium", "Low"] as const;
/** Sureel's — a party to a conflict responds; only rights ops resolves (Roles and permissions). */
export const OPS_ONLY = "Only Sureel rights ops resolves a conflict. Respond with evidence, accept the current state, or withdraw your claim.";

export const conflictName = (one: Conflict) => `${one.kind} — ${assetName(one.assetId)}`;

/**
 * The conflicts Harbor Music is a party to (S2-6) — share overclaims across publishers first,
 * each with what it puts at risk and how far its counterclaim has come. What each claim rests on
 * is read on the conflict's own page.
 */
export function Conflicts() {
  useGraph();
  return (
    <CollectionPage
      title="Conflicts"
      index={{
        rows: myConflicts(),
        rowKey: (one) => one.id,
        noun: { one: "conflict", many: "conflicts" },
        identity: {
          title: "Conflict",
          name: conflictName,
          mark: (one) => <Avatar kind="work" name={assetName(one.assetId)} />,
          opens: (one) => rightsHref("conflicts", one.id),
        },
        sort: { column: "Revenue at risk", direction: "descending" },
        columns: [
          { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`conflict:${one.state}`} /> },
          { name: "Claimed", as: "percent", value: (one) => one.total },
          {
            name: "Territories",
            value: (one) => one.territories.length - (one.accepted?.length ?? 0),
            cell: (one) => {
              const open = one.territories.length - (one.accepted?.length ?? 0);
              return one.state === "Resolved" ? `${one.territories.length} closed` : `${open} of ${one.territories.length} open`;
            },
          },
          {
            name: "With",
            as: "entities",
            noun: { one: "party", many: "parties" },
            entity: "organization",
            value: (one) => one.parties.filter((party) => party !== ME).map(partyName),
          },
          { name: "Severity", value: (one) => SEVERITY.indexOf(one.severity), cell: (one) => one.severity },
          { name: "Step", value: (one) => one.step, cell: (one) => COUNTERCLAIM_STEPS[one.step] },
          { name: "Raised by", value: (one) => one.raisedBy, cell: (one) => one.raisedBy },
          { name: "Revenue at risk", as: "money", value: (one) => one.revenueAtRisk },
          { name: "Opened", as: "date", value: (one) => one.opened },
        ],
        readings: [
          { name: "Open", holds: (one) => one.state !== "Resolved" },
          { name: "Resolved", holds: (one) => one.state === "Resolved" },
          { name: "All", holds: () => true },
        ],
        filters: [{ kind: "anyOf", key: "kind", label: "Kind", options: ["Overclaim", "Gap", "Missing work link", "Territory overlap"], of: (one) => one.kind }],
        totals: [{ count: true }, { name: "Revenue at risk", sum: (one) => (one.state === "Resolved" ? 0 : one.revenueAtRisk), as: "money" }],
        commands: (one) => [
          { label: "Open", opens: rightsHref("conflicts", one.id) },
          one.state === "Resolved"
            ? { label: "Accept by territory", unavailable: "Resolved: nothing is left to accept." }
            : { label: "Accept by territory", opens: rightsHref("conflicts", one.id, "territories") },
          { label: "Counterclaim", opens: rightsHref("conflicts", one.id, "counterclaim") },
          { label: "Resolve", unavailable: OPS_ONLY },
        ],
        empty: { none: "No claim of Harbor Music's disagrees with another." },
      }}
    />
  );
}
