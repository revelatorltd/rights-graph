import { Alert, CollectionPage, Code, formatCount } from "@revelator/pro-ui";

import { api, type Logged } from "../../api/client";
import { partyName } from "../../graph/fixtures";
import type { Shown } from "../surface";

/** A status as a reader scans a column of them: the code and its class. */
const classOf = (status: number) => (status >= 500 ? "Server errors" : status >= 400 ? "Refused" : "Answered");

/** The 95th percentile of the latencies — the read model's target is P95 under 400 ms. */
function p95(rows: readonly Logged[]) {
  if (!rows.length) return 0;
  const sorted = rows.map((one) => one.latency).sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]!;
}

/**
 * S9 traffic — every call made to the Graph API this session, across partners: the endpoint, who
 * called with which key, the status, the latency. Read from the in-browser request log
 * (`src/api/client.ts`): the morning's calls run through the handlers when the session opens,
 * then every call the Partner portal's explorer sends. Calls to the dev server's `/api` are that
 * server's and are not seen here.
 */
export function TrafficPage(): Shown {
  const rows = api.log();
  const refused = rows.filter((one) => one.status >= 400).length;
  return {
    place: { at: "S9 traffic" },
    page: (
      <CollectionPage
        title="S9 traffic"
        index={{
          rows,
          rowKey: (one) => one.id,
          noun: { one: "call", many: "calls" },
          identity: { title: "Endpoint", name: (one) => `${one.method} ${one.endpoint}`, as: "reference" },
          sort: { column: "At", direction: "descending" },
          searchBy: ["Endpoint", "Key", "Path"],
          note: (
            <Alert intent="info" title={`P95 latency ${formatCount(p95(rows), { one: "ms", many: "ms" })}`}>
              {`${formatCount(refused, { one: "call", many: "calls" })} refused. The effective-clearance read model's target is P95 under 400 ms at 500 requests a second; these are the handlers' own times, measured in this browser, with no network between.`}
            </Alert>
          ),
          columns: [
            { name: "Partner", value: (one) => (one.holder ? partyName(one.holder) : "No key"), cell: (one) => (one.holder ? partyName(one.holder) : "No key") },
            { name: "Key", as: "identifier", standard: "id", value: (one) => one.key },
            { name: "Status", value: (one) => one.status, cell: (one) => <Code>{String(one.status)}</Code> },
            { name: "Latency, ms", as: "count", value: (one) => one.latency },
            { name: "At", as: "date", grain: "minute", value: (one) => one.at },
            { name: "Path", value: (one) => one.path, cell: (one) => <Code>{one.path}</Code>, hidden: true },
            { name: "From", value: (one) => one.via, cell: (one) => one.via },
          ],
          readings: [
            { name: "All", holds: () => true },
            { name: "Answered", holds: (one) => classOf(one.status) === "Answered" },
            { name: "Refused", holds: (one) => classOf(one.status) === "Refused" },
          ],
          filters: [
            { kind: "anyOf", key: "partner", label: "Partner", options: [...new Set(rows.map((one) => (one.holder ? partyName(one.holder) : "No key")))], of: (one) => (one.holder ? partyName(one.holder) : "No key") },
            { kind: "anyOf", key: "endpoint", label: "Endpoint", options: [...new Set(rows.map((one) => one.endpoint))], of: (one) => one.endpoint },
          ],
          totals: [{ count: true }, { name: "Refused", count: (one) => one.status >= 400 }],
          empty: { none: "No call yet. Partners' calls from the explorer appear here as they are made." },
        }}
      />
    ),
  };
}
