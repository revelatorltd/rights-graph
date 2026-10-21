import type { ReactNode } from "react";
import {
  Alert,
  Avatar,
  Badge,
  CollectionPage,
  ConfirmationDialog,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  EmptyState,
  FacetCard,
  RecordIndex,
  formatCount,
  formatMeta,
  type Command,
  type DetailFacet,
  type HeldBy,
  type ShellPlace,
} from "@revelator/pro-ui";

import type { Batch } from "../../graph/model";
import type { Shown } from "../surface";
import { contributorHref, facetOf, facetSlug } from "./address";
import {
  IN_FLIGHT,
  matchRecords,
  MATCH_STATES,
  downloadFailedRows,
  exportMatches,
  dropFailed,
  ingest,
  ownBatches,
  rowErrorsOf,
  batchById,
} from "./data";

const STATES: readonly Batch["state"][] = ["Received", "Validating", "Row errors", "Ingesting", "Matched", "Rejected"];
const ROWS = { one: "row", many: "rows" };

export const batchHref = (id: string, facet?: BatchFacet) =>
  contributorHref("batches", id, facet && facet !== "Overview" ? facetSlug(facet) : undefined);

/** A batch's mark: what a file is, square. */
const batchMark = (one: Batch) => <Avatar kind="document" name={one.format} />;

/** What can be done to one batch, where it stands — said once for its row and its band. */
function commandsOf(one: Batch): Command[] {
  const failed = rowErrorsOf(one.id).length > 0;
  return [
    failed
      ? { label: "Download failed rows", mark: "download", opens: () => downloadFailedRows(one) }
      : { label: "Download failed rows", mark: "download", unavailable: "No row of this batch failed the schema." },
    one.state === "Row errors"
      ? { label: "Fix and resubmit", mark: "upload", opens: contributorHref("upload", one.id) }
      : { label: "Fix and resubmit", mark: "upload", unavailable: "Only a batch held for row errors is resubmitted." },
    one.state === "Row errors"
      ? { label: "Drop failed rows and ingest", dialog: <DropAndIngest batch={one} /> }
      : { label: "Drop failed rows and ingest", unavailable: "Only a batch held for row errors has rows to drop." },
  ];
}

/** The failed rows taken out and the rest ingested — asked first, because those rows never reach the graph. */
function DropAndIngest({ batch, ...held }: HeldBy & { batch: Batch }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`${formatCount(batch.errors, ROWS)} of ${batch.file} are left out, and the ${formatCount(batch.validated, ROWS)} that passed are written to the graph and matched. Send the dropped rows again in a later file.`}
      confirm="Drop and ingest"
      onCommit={() => {
        dropFailed(batch.id);
        ingest(batch.id);
      }}
    />
  );
}

/**
 * Every file the tenant has sent, newest first — each at the stage it has reached, with the count
 * each stage holds. Divided by where a batch stands, because what a reader does next depends on it.
 */
export function Batches() {
  const batches = ownBatches();
  return (
    <CollectionPage
      title="Batches"
      actions={[{ label: "Upload file", mark: "upload", primary: true, creates: true, opens: contributorHref("upload") }]}
      index={{
        rows: batches,
        rowKey: (one) => one.id,
        noun: { one: "batch", many: "batches" },
        identity: { title: "File", name: (one) => one.file, mark: batchMark, opens: (one) => batchHref(one.id) },
        searchBy: ["File", "Batch ID"],
        columns: [
          { name: "Batch ID", as: "identifier", standard: "id", value: (one) => one.id },
          {
            name: "State",
            value: (one) => STATES.indexOf(one.state),
            cell: (one) => <Badge status={`batch:${one.state}`} />,
            readings: ["All", "In flight"],
          },
          { name: "Format", value: (one) => one.format, cell: (one) => one.format },
          { name: "Channel", value: (one) => one.channel, cell: (one) => one.channel },
          { name: "Received", as: "date", grain: "minute", value: (one) => one.received },
          { name: "Rows", as: "count", value: (one) => one.rows },
          { name: "Validated", as: "count", value: (one) => one.validated },
          { name: "Ingested", as: "count", value: (one) => one.ingested },
          { name: "Matched", as: "count", value: (one) => one.matched },
          { name: "Failed rows", as: "count", value: (one) => one.errors },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "In flight", holds: (one) => IN_FLIGHT.includes(one.state) },
          { name: "Row errors", holds: (one) => one.state === "Row errors" },
          { name: "Matched", holds: (one) => one.state === "Matched" },
          { name: "Rejected", holds: (one) => one.state === "Rejected" },
        ],
        filters: [
          { kind: "anyOf", key: "format", label: "Format", options: ["DDEX ERN", "DDEX MWN", "CWR", "CSV", "Parquet"], of: (one) => one.format },
          { kind: "anyOf", key: "channel", label: "Channel", options: ["Upload", "SFTP", "API"], of: (one) => one.channel },
        ],
        totals: [{ count: true }, { name: "Rows", sum: (one) => one.rows, as: "count" }],
        commands: (one) => [{ label: "Open", opens: batchHref(one.id) }, ...commandsOf(one)],
        empty: { holder: "this tenant", mark: "upload" },
      }}
    />
  );
}

export const BATCH_FACETS = ["Overview", "Row errors", "Match results"] as const;
export type BatchFacet = (typeof BATCH_FACETS)[number];

/** The facets a batch has: row errors where rows failed, match results once it is matched. */
const facetsOf = (one: Batch): BatchFacet[] =>
  BATCH_FACETS.filter((facet) => (facet === "Row errors" ? one.errors > 0 || rowErrorsOf(one.id).length > 0 : facet === "Match results" ? Boolean(one.results) : true));

/** `batches` — the index; `batches/<id>/<facet>` — one batch. */
export function BatchPage([id, segment]: readonly string[]): Shown {
  if (!id) return { place: { at: "Uploads", page: "Batches" }, page: <Batches /> };
  const batch = batchById(id);
  if (!batch)
    return {
      place: { at: "Uploads", page: "Batches" },
      page: <EmptyState title="No such batch" detail="It is not in this tenant — a batch is only ever its contributor's." mark="upload" />,
    };
  const facet = facetOf(facetsOf(batch), segment);
  return { place: batchPlace(batch, facet), page: <BatchDetail key={batch.id} batch={batch} facet={facet} /> };
}

/**
 * One batch, through its stages: received, validated, ingested, matched, with each stage's count.
 * The band says which file and where it stands; the one command that stands out is what moves it on.
 */
function BatchDetail({ batch, facet }: { batch: Batch; facet: BatchFacet }) {
  const FACETS: Record<BatchFacet, { header?: DetailFacet; body: ReactNode }> = {
    Overview: { body: <BatchOverview batch={batch} /> },
    "Row errors": {
      header: {
        name: "Row errors",
        actions: rowErrorsOf(batch.id).length
          ? [{ label: "Download failed rows", mark: "download", opens: () => downloadFailedRows(batch) }]
          : [],
      },
      body: <BatchRowErrors batch={batch} />,
    },
    "Match results": {
      header: {
        name: "Match results",
        actions: batch.state === "Matched" ? [{ label: "Export match results", mark: "download", opens: () => exportMatches(`${batch.id}_match_results.csv`, matchRecords().filter((one) => one.batch === batch.id)) }] : [],
      },
      body: <BatchMatches batch={batch} />,
    },
  };
  const shown = FACETS[facet];
  const actions =
    batch.state === "Row errors"
      ? [{ label: "Fix and resubmit", mark: "upload", primary: true, opens: contributorHref("upload", batch.id) }]
      : batch.state === "Rejected"
        ? [{ label: "Upload again", mark: "upload", primary: true, opens: contributorHref("upload") }]
        : batch.state === "Matched" && facet !== "Match results"
          ? [{ label: "Open match results", primary: true, opens: batchHref(batch.id, "Match results") }]
          : [];
  return (
    <DetailPage
      record={{
        mark: batchMark(batch),
        name: batch.file,
        kind: `${batch.format} batch`,
        status: `batch:${batch.state}`,
        facts: [
          { identifier: batch.id, standard: "id" },
          { text: batch.channel },
          { as: "date", value: batch.received, grain: "minute", label: "Received" },
        ],
        actions,
        more: commandsOf(batch).filter((one) => !(batch.state === "Row errors" && one.label === "Fix and resubmit")),
      }}
      facet={shown.header}
    >
      {shown.body}
    </DetailPage>
  );
}

/** What the batch says of itself at its state, before its figures. */
function stateAlert(batch: Batch) {
  switch (batch.state) {
    case "Row errors":
      return (
        <Alert intent="warn" title="Held at the schema check">
          {`${formatCount(batch.errors, ROWS)} failed the schema, so nothing in this file has been ingested. Fix them and resubmit, or drop them and ingest the ${formatCount(batch.validated, ROWS)} that passed.`}
        </Alert>
      );
    case "Validating":
      return (
        <Alert intent="info" title="Validating">
          {`${formatCount(batch.validated)} of ${formatCount(batch.rows, ROWS)} checked so far. Nothing is accepted until every row has been.`}
        </Alert>
      );
    case "Rejected":
      return (
        <Alert intent="danger" title="Rejected">
          The file could not be read as the format it was sent as — its Parquet footer is missing. Nothing was read from it.
        </Alert>
      );
    default:
      return null;
  }
}

/** The recap: each stage's count, the failed rows, and what matching made of it. */
function BatchOverview({ batch }: { batch: Batch }) {
  const failed = rowErrorsOf(batch.id).length > 0;
  return (
    <DetailOverview>
      {stateAlert(batch)}
      <DetailOverviewGrid>
        <FacetCard
          title="Stages"
          hint="Each stage counts the rows that reached it."
          figures={[
            { label: "Received", as: "count", value: batch.rows },
            { label: "Validated", as: "count", value: batch.validated },
            { label: "Ingested", as: "count", value: batch.ingested },
            { label: "Matched", as: "count", value: batch.matched },
          ]}
        />
        <FacetCard
          title="Failed rows"
          opens={failed ? batchHref(batch.id, "Row errors") : undefined}
          figures={[{ label: "Failed the schema", as: "count", value: batch.errors }]}
        />
        {batch.results ? (
          <FacetCard
            title="Match results"
            opens={batchHref(batch.id, "Match results")}
            figures={[
              { label: "Matched", as: "count", value: batch.results.matched },
              { label: "New", as: "count", value: batch.results.new },
              { label: "Conflicting", as: "count", value: batch.results.conflicting },
              { label: "Unmatched", as: "count", value: batch.results.unmatched },
            ]}
          />
        ) : null}
        <FacetCard
          title="File"
          facts={[
            { label: "Format", value: batch.format },
            { label: "Channel", value: batch.channel },
            { label: "Received", as: "date", grain: "minute", value: batch.received },
            { label: "Batch ID", value: batch.id, standard: "id" },
          ]}
        />
      </DetailOverviewGrid>
    </DetailOverview>
  );
}

/** Every row the schema refused, with the field and why — what the contributor fixes. */
function BatchRowErrors({ batch }: { batch: Batch }) {
  const errors = rowErrorsOf(batch.id);
  return (
    <RecordIndex
      rows={errors}
      rowKey={(one) => `${one.row}/${one.field}`}
      noun={{ one: "failed row", many: "failed rows" }}
      identity={{ title: "Row", name: (one) => `Row ${one.row}`, value: (one) => one.row, as: "reference" }}
      note={
        errors.length && batch.errors > errors.length ? (
          <Alert intent="info">
            {`${formatCount(errors.length, { one: "kind of error is", many: "kinds of error are" })} shown, one row each, of ${formatCount(batch.errors, ROWS)} that failed. The download holds every one.`}
          </Alert>
        ) : undefined
      }
      columns={[
        { name: "Field", value: (one) => one.field, cell: (one) => one.field },
        { name: "Value", value: (one) => one.value, cell: (one) => one.value || undefined },
        { name: "Problem", value: (one) => one.problem, cell: (one) => one.problem },
      ]}
      chooser={false}
      empty={{ none: "Every row passed the schema.", line: true }}
    />
  );
}

/** What matching made of this batch: a sample of each of the four, divided by what it became. */
function BatchMatches({ batch }: { batch: Batch }) {
  const records = matchRecords().filter((one) => one.batch === batch.id);
  const results = batch.results;
  return (
    <RecordIndex
      rows={records}
      // The four counts are the batch's, whole; the rows under them a sample of each.
      note={
        results ? (
          <Alert intent="info" title={formatMeta([`${formatCount(results.matched)} matched`, `${formatCount(results.new)} new`, `${formatCount(results.conflicting)} conflicting`, `${formatCount(results.unmatched)} unmatched`]) ?? undefined}>
            The records below are a sample of each outcome. A conflicting one goes to Sureel ops, and shows under Conflicts once it touches a claim of yours.
          </Alert>
        ) : undefined
      }
      rowKey={(one) => one.id}
      noun={{ one: "record", many: "records" }}
      identity={{ title: "Title", name: (one) => one.title }}
      columns={[
        { name: "State", value: (one) => MATCH_STATES.indexOf(one.state), cell: (one) => <Badge status={`match:${one.state}`} />, readings: ["All"] },
        { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
        { name: "Why", value: (one) => one.reason, cell: (one) => one.reason },
      ]}
      readings={[{ name: "All", holds: () => true }, ...MATCH_STATES.map((state) => ({ name: state, holds: (one: (typeof records)[number]) => one.state === state }))]}
      chooser={false}
      empty={{ none: "No sampled record from this batch.", line: true }}
    />
  );
}

/** Where one batch's page is: its facets, and a trail through the batches to it. */
function batchPlace(batch: Batch, facet: BatchFacet): ShellPlace {
  return {
    at: "Uploads",
    page: batch.file,
    record: {
      back: { index: "Batches", opens: contributorHref("batches") },
      facets: facetsOf(batch),
      at: facet,
      addressOf: (one) => batchHref(batch.id, one as BatchFacet),
    },
    trail: [
      { label: "Uploads", opens: contributorHref("batches") },
      { label: "Batches", opens: contributorHref("batches") },
      { label: batch.file },
    ],
  };
}
