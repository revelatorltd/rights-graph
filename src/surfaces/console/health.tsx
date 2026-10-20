import { Alert, Badge, CollectionPage, ConfirmationDialog, formatList, type HeldBy } from "@revelator/pro-ui";

import { BATCHES, FEEDS, partyName } from "../../graph/fixtures";
import type { Batch, Feed } from "../../graph/model";
import type { Drawn } from "../surface";
import { flagged, retry, retryOf } from "./data";
import { SIGNED_IN, consoleHref, type Persona } from "./where";

const FEED_STATES: readonly Feed["state"][] = ["On time", "Late", "Failing"];
const BATCH_STATES: readonly Batch["state"][] = ["Received", "Validating", "Row errors", "Ingesting", "Matched", "Rejected"];
const LANES: readonly Feed["lane"][] = ["Owned", "Free", "Borrowed", "Bought", "Revelator"];

/**
 * What the home view says before any row: every feed past due or erroring over its budget, by
 * name — a late feed is flagged here, not found by sorting (S7-1). A danger where one is failing,
 * a warning where they are only late.
 */
function Flagged() {
  const late = flagged();
  if (!late.length) return null;
  const failing = late.filter((one) => one.state === "Failing");
  return (
    <Alert intent={failing.length ? "danger" : "warn"} title={`${late.length} of ${FEEDS.length} feeds need attention`}>
      {formatList(late.map((one) => `${one.name} — ${one.state.toLowerCase()}, ${one.lagHours} hours behind`))}
    </Alert>
  );
}

/** A feed fetched again from its source — asked first, because a retry re-reads the whole batch. */
function Retry({ feed, persona, ...held }: HeldBy & { feed: Feed; persona: Persona }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`${feed.name} is fetched again from its source over ${feed.channel}. Rows already ingested are matched again, not duplicated.`}
      confirm="Retry"
      onCommit={() => retry(feed, SIGNED_IN[persona].name)}
    />
  );
}

/**
 * Ingestion health — the console's home view (S7-1). Every source feeding the graph, by lane: when
 * its last batch came, when it was due, how far behind it runs and how many of its rows failed.
 *
 * A COLLECTION PAGE: the feeds are the set, and the flag over them is the index's note.
 */
export function HealthPage(persona: Persona): Drawn {
  return {
    place: { at: "Ingestion", page: "Health" },
    page: (
      <CollectionPage
        title="Ingestion health"
        index={{
          rows: FEEDS,
          rowKey: (one) => one.id,
          noun: { one: "feed", many: "feeds" },
          identity: { title: "Feed", name: (one) => one.name },
          note: <Flagged />,
          columns: [
            {
              name: "State",
              value: (one) => FEED_STATES.indexOf(one.state),
              cell: (one) => <Badge status={`feed:${one.state}`} />,
              readings: ["All"],
            },
            { name: "Lane", value: (one) => one.lane, cell: (one) => one.lane },
            { name: "Channel", value: (one) => one.channel, cell: (one) => one.channel },
            { name: "Last batch", as: "date", grain: "minute", value: (one) => one.last },
            { name: "Due", as: "date", grain: "minute", value: (one) => one.due },
            { name: "Hours behind", as: "count", value: (one) => one.lagHours },
            { name: "Error rate", as: "percent", value: (one) => one.errorRate },
            { name: "Rows", as: "count", value: (one) => one.rows },
            { name: "Retried", as: "date", grain: "minute", value: (one) => retryOf(one)?.at },
          ],
          readings: [
            { name: "All", holds: () => true },
            ...FEED_STATES.map((state) => ({ name: state, holds: (one: Feed) => one.state === state })),
          ],
          filters: [{ kind: "anyOf", key: "lane", label: "Lane", options: LANES, of: (one) => one.lane }],
          totals: [
            { count: true },
            { name: "Late or failing", count: (one) => one.state !== "On time" },
            { name: "Rows", sum: (one) => one.rows, as: "count" },
          ],
          commands: (one) => [
            { label: "Retry", dialog: <Retry feed={one} persona={persona} /> },
            { label: "Open batches", opens: consoleHref("batches") },
          ],
          chooser: false,
        }}
      />
    ),
  };
}

/**
 * Every batch the contributor lanes sent, newest first — validated, ingested, matched, and what
 * matching made of it. A batch whose matching turned up conflicts leads to the queue.
 */
export function BatchesPage(): Drawn {
  return {
    place: { at: "Ingestion", page: "Batches" },
    page: (
      <CollectionPage
        title="Batches"
        index={{
          rows: BATCHES,
          rowKey: (one) => one.id,
          noun: { one: "batch", many: "batches" },
          identity: { title: "File", name: (one) => one.file },
          sort: { column: "Received", direction: "descending" },
          searchBy: ["File", "Contributor"],
          columns: [
            {
              name: "State",
              value: (one) => BATCH_STATES.indexOf(one.state),
              cell: (one) => <Badge status={`batch:${one.state}`} />,
              readings: ["All"],
            },
            { name: "Contributor", value: (one) => partyName(one.contributor), cell: (one) => partyName(one.contributor) },
            { name: "Format", value: (one) => one.format, cell: (one) => one.format },
            { name: "Channel", value: (one) => one.channel, cell: (one) => one.channel },
            { name: "Received", as: "date", grain: "minute", value: (one) => one.received },
            { name: "Rows", as: "count", value: (one) => one.rows },
            { name: "Row errors", as: "count", value: (one) => one.errors },
            { name: "Matched", as: "count", value: (one) => one.results?.matched },
            { name: "New", as: "count", value: (one) => one.results?.new },
            { name: "Conflicting", as: "count", value: (one) => one.results?.conflicting },
            { name: "Unmatched", as: "count", value: (one) => one.results?.unmatched },
          ],
          readings: [
            { name: "All", holds: () => true },
            { name: "In progress", holds: (one: Batch) => ["Received", "Validating", "Ingesting"].includes(one.state) },
            { name: "Needs attention", holds: (one: Batch) => one.state === "Row errors" || one.state === "Rejected" },
            { name: "Matched", holds: (one: Batch) => one.state === "Matched" },
          ],
          totals: [
            { count: true },
            { name: "Rows", sum: (one) => one.rows, as: "count" },
            { name: "Conflicting", sum: (one) => one.results?.conflicting ?? 0, as: "count" },
          ],
          commands: (one) => [
            one.results?.conflicting
              ? { label: "Open conflicts", opens: consoleHref("conflicts") }
              : { label: "Open conflicts", unavailable: "Matching turned up no conflicts in this batch." },
          ],
          chooser: false,
          empty: { holder: "the contributor lanes" },
        }}
      />
    ),
  };
}
