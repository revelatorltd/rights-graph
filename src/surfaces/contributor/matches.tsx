import { Alert, Avatar, Badge, CollectionPage, formatCount, formatMeta } from "@revelator/pro-ui";

import { contributorHref } from "./address";
import { batchHref } from "./batches";
import { matchRecords, MATCH_STATES, matchTotals, type MatchRecord } from "./data";

/**
 * What matching made of everything the tenant sent (S5-3): the four counts over every matched
 * batch, and the records behind each — a reading per outcome, so each count drills into its own.
 * A conflicting record opens its conflict; every other its batch.
 */
export function MatchResults() {
  const totals = matchTotals();
  return (
    <CollectionPage
      title="Match results"
      more={[{ label: "Export" }]}
      index={{
        rows: matchRecords(),
        rowKey: (one) => one.id,
        noun: { one: "record", many: "records" },
        identity: {
          title: "Title",
          name: (one) => one.title,
          mark: (one) => <Avatar kind="work" name={one.title} />,
          opens: (one) => (one.conflict ? contributorHref("conflicts", one.conflict) : batchHref(one.batch)),
        },
        // The four counts are the batches', in the millions; the rows under them are a sample of each.
        // FOUR figures, one past what a stat row holds (gaps, 6) — said in the note instead.
        note: (
          <Alert intent="info" title="Across every matched batch">
            {`${formatMeta([
              `${formatCount(totals.matched)} matched`,
              `${formatCount(totals.new)} new`,
              `${formatCount(totals.conflicting)} conflicting`,
              `${formatCount(totals.unmatched)} unmatched`,
            ])}. The records below are a sample of each outcome; an unmatched record is fixed at its source row and sent again.`}
          </Alert>
        ),
        columns: [
          { name: "State", value: (one) => MATCH_STATES.indexOf(one.state), cell: (one) => <Badge status={`match:${one.state}`} />, readings: ["All"] },
          { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
          { name: "Credited", value: (one) => one.by, cell: (one) => one.by },
          { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => (one.standard === "isrc" ? one.code : undefined) },
          { name: "ISWC", as: "identifier", standard: "iswc", value: (one) => (one.standard === "iswc" ? one.code : undefined) },
          { name: "Matched to", as: "identifier", standard: "id", value: (one) => one.matchedTo, readings: ["All", "Matched", "Conflicting"] },
          { name: "Method", value: (one) => one.method ?? "", cell: (one) => one.method, readings: ["All", "Matched", "Conflicting"] },
          { name: "Confidence", as: "percent", value: (one) => (one.confidence === undefined ? undefined : one.confidence * 100), readings: ["All", "Matched", "Conflicting"] },
          { name: "Why", value: (one) => one.reason, cell: (one) => one.reason },
          { name: "Batch", as: "identifier", standard: "id", value: (one) => one.batch, hidden: true },
        ],
        readings: [
          { name: "All", holds: () => true },
          ...MATCH_STATES.map((state) => ({ name: state, holds: (one: MatchRecord) => one.state === state })),
        ],
        filters: [{ kind: "anyOf", key: "kind", label: "Kind", options: ["Recording", "Work"], of: (one) => one.kind }],
        commands: (one) => [
          one.conflict ? { label: "Open conflict", opens: contributorHref("conflicts", one.conflict) } : { label: "Open batch", opens: batchHref(one.batch) },
        ],
      }}
    />
  );
}
