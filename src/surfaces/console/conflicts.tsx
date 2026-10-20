import { Badge, CollectionPage } from "@revelator/pro-ui";

import { assetById, partyName } from "../../graph/fixtures";
import type { Conflict, ConflictKind, Side } from "../../graph/model";
import type { Drawn } from "../surface";
import { SEVERITIES, laneOf, queue } from "./data";
import { assetMark } from "./marks";
import { SIGNED_IN, consoleHref } from "./where";

const STATES: readonly Conflict["state"][] = ["Open", "Awaiting evidence", "Resolved"];
const KINDS: readonly ConflictKind[] = [
  "Overclaim",
  "Gap",
  "Missing work link",
  "Territory overlap",
  "Expired but paying",
  "Attestation dispute",
  "Unauthorized grant",
];
const SIDES: readonly Side[] = ["Master", "Composition"];

/**
 * The conflict queue (S7-2) — every disagreement the resolver would not pick a side on, across every
 * lane and every party, HIGH first and then by the revenue it holds.
 *
 * The order is the queue's and not a column's: the rows arrive in it, so the table opens on it and
 * a sort the reader chooses is theirs to undo. Severity is a level, not a state — words, until the
 * system has a scale for it (gaps). The side stands on every row: a master and a composition
 * conflict are never one.
 */
export function ConflictsPage(): Drawn {
  const me = SIGNED_IN["Rights ops"].name;
  return {
    place: { at: "Resolution", page: "Conflicts" },
    page: (
      <CollectionPage
        title="Conflicts"
        index={{
          rows: queue(),
          rowKey: (one) => one.id,
          noun: { one: "conflict", many: "conflicts" },
          identity: {
            title: "Asset",
            name: (one) => assetById(one.assetId).title,
            mark: (one) => assetMark(one.assetId),
            opens: (one) => consoleHref("conflicts", one.id),
          },
          searchBy: ["Asset", "Kind", "Parties"],
          columns: [
            { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
            { name: "Severity", value: (one) => SEVERITIES.indexOf(one.severity), cell: (one) => one.severity },
            { name: "Revenue at risk", as: "money", value: (one) => one.revenueAtRisk },
            { name: "Side", value: (one) => one.side, cell: (one) => one.side },
            {
              name: "State",
              value: (one) => STATES.indexOf(one.state),
              cell: (one) => <Badge status={`conflict:${one.state}`} />,
            },
            { name: "Territories", value: (one) => one.territories.join(", "), cell: (one) => one.territories.join(", ") },
            {
              name: "Parties",
              as: "entities",
              noun: { one: "party", many: "parties" },
              entity: "organization",
              value: (one) => one.parties.map(partyName),
            },
            { name: "Assignee", value: (one) => one.assignee ?? "", cell: (one) => one.assignee ?? "Unassigned" },
            { name: "Lane", value: (one) => laneOf(one), cell: (one) => laneOf(one) },
            { name: "Opened", as: "date", value: (one) => one.opened },
          ],
          readings: [
            { name: "Unresolved", holds: (one: Conflict) => one.state !== "Resolved" },
            { name: "Assigned to me", holds: (one: Conflict) => one.state !== "Resolved" && one.assignee === me },
            { name: "Unassigned", holds: (one: Conflict) => one.state !== "Resolved" && !one.assignee },
            { name: "Resolved", holds: (one: Conflict) => one.state === "Resolved" },
          ],
          filters: [
            { kind: "anyOf", key: "kind", label: "Kind", options: KINDS, of: (one) => one.kind },
            { kind: "anyOf", key: "severity", label: "Severity", options: SEVERITIES, of: (one) => one.severity },
            { kind: "anyOf", key: "side", label: "Side", options: SIDES, of: (one) => one.side },
          ],
          totals: [
            { count: true },
            { name: "High", count: (one) => one.severity === "High" },
            { name: "Revenue at risk", sum: (one) => one.revenueAtRisk, as: "money" },
          ],
          commands: (one) => [
            { label: "Open", opens: consoleHref("conflicts", one.id) },
            { label: "Open asset inspector", mark: "rights", opens: consoleHref("assets", one.assetId) },
          ],
          empty: { holder: "the queue" },
        }}
      />
    ),
  };
}
