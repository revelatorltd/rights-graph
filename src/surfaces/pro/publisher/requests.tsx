import { Badge, CollectionPage } from "@revelator/pro-ui";

import { partyName } from "../../../graph/fixtures";
import type { Request } from "../../../graph/model";
import { requestsFor, territoryLabel, useGraph } from "../../../graph/resolve";
import { TerritoryChip, partyMark } from "../../../rights/kit";
import { ME, meta, rightsHref } from "./data";
import { requestCommands } from "./decisions";

const OPEN: readonly Request["state"][] = ["Needs decision", "Escalated"];
const STATES: readonly Request["state"][] = ["Needs decision", "Escalated", "Countered", "Approved", "Declined", "Auto-cleared"];

/** What a request asks, in a few words: the use for a licence, the type otherwise. */
export const askOf = (request: Request) => (request.use ? meta(request.use, request.side ?? "Composition") : request.type);

/**
 * Harbor Music's approval inbox (S4 inside S2) — every request that needs a person, whatever it
 * started as: licence requests from partners, conflict responses Sureel asks for. Each row carries
 * what the decision needs (S4-2) and the commands its type takes (S4-3); its page holds the rest.
 *
 * A COLLECTION PAGE whose readings are what is owed and what is done.
 */
export function Requests() {
  useGraph();
  return (
    <CollectionPage
      title="Requests"
      index={{
        rows: requestsFor(ME),
        rowKey: (one) => one.id,
        noun: { one: "request", many: "requests" },
        identity: {
          title: "Request",
          name: (one) => `${askOf(one)} — ${partyName(one.from)}`,
          mark: (one) => partyMark(one.from),
          opens: (one) => rightsHref("requests", one.id),
        },
        // The DEADLINE first: an inbox is worked in the order its answers fall due.
        sort: { column: "Deadline", direction: "ascending" },
        searchBy: ["Request", "Scope"],
        columns: [
          { name: "Type", value: (one) => one.type, cell: (one) => one.type },
          { name: "State", value: (one) => STATES.indexOf(one.state), cell: (one) => <Badge status={`request:${one.state}`} /> },
          { name: "Scope", value: (one) => one.scope.name, cell: (one) => meta(one.scope.level, one.scope.name) },
          { name: "Assets", as: "count", value: (one) => one.scope.assets },
          { name: "Territory", value: (one) => territoryLabel(one.territory), cell: (one) => <TerritoryChip set={one.territory} /> },
          { name: "Starts", as: "date", value: (one) => one.start },
          { name: "Ends", as: "date", value: (one) => one.end },
          { name: "Deadline", as: "date", value: (one) => one.deadline },
          { name: "Received", as: "date", grain: "minute", value: (one) => one.received },
        ],
        readings: [
          { name: "Needs decision", holds: (one) => OPEN.includes(one.state) },
          { name: "Decided", holds: (one) => !OPEN.includes(one.state) },
          { name: "All", holds: () => true },
        ],
        filters: [
          { kind: "anyOf", key: "type", label: "Type", options: ["Licence", "Conflict response", "Attestation", "Credit confirmation", "Delegate approval"], of: (one) => one.type },
        ],
        totals: [{ count: true }],
        commands: (one) => [{ label: "Open", opens: rightsHref("requests", one.id) }, ...requestCommands(one)],
        empty: { none: "Nothing is waiting on Harbor Music." },
      }}
    />
  );
}
