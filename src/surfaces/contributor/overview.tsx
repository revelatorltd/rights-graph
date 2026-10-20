import {
  Alert,
  Avatar,
  CollectionPage,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  FacetCard,
  formatDate,
  formatPercent,
} from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";

import { TODAY } from "../../graph/fixtures";
import { contributorHref } from "./address";
import {
  LAST_UPLOAD,
  access,
  batchById,
  coverage,
  inFlight,
  matchTotals,
  ownBatches,
  ownConflicts,
  sharing,
  tenant,
  type Coverage,
} from "./data";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** The tenant's mark — the stand-in the shell wears, square because a tenant is a company. */
export const tenantMark = () => (
  <Avatar kind="organization" name={tenant().name}>
    <img src={ORGANIZATIONS.fieldhouse.art} alt="" />
  </Avatar>
);

/**
 * What the tenant gave and what came back, on one page.
 *
 * A DETAIL PAGE on the tenant itself, landing: the band says whose tenant this is and offers the
 * one thing a contributor comes to do — upload — and the overview is one tile per part of the
 * portal, each with the way in. Coverage leads, because it is what the contribution bought.
 */
export function Overview() {
  const batches = ownBatches();
  const flying = batches.filter(inFlight);
  const failing = batches.filter((one) => one.state === "Row errors");
  const totals = matchTotals();
  const conflicts = ownConflicts().filter((one) => one.state !== "Resolved");
  const reads = access().filter((one) => TODAY.getTime() - one.at.getTime() <= WEEK);
  const levels = sharing();
  const last = batchById(LAST_UPLOAD);
  const measures = coverage();
  const of = (measure: Coverage["measure"]) => measures.find((one) => one.measure === measure)!;

  return (
    <DetailPage
      record={{
        mark: tenantMark(),
        name: tenant().name,
        kind: "Contributor tenant",
        facts: [
          { identifier: tenant().id, standard: "id" },
          // Its LANE: what the graph files every claim this tenant writes under.
          { text: "Borrowed lane" },
          ...(last ? [{ as: "date" as const, value: last.received, label: "Last upload" }] : []),
        ],
        actions: [{ label: "Upload file", mark: "upload", primary: true, creates: true, opens: contributorHref("upload") }],
      }}
    >
      <DetailOverview>
        {failing.length ? (
          <Alert intent="warn" title={`${failing.length === 1 ? "A batch is" : `${failing.length} batches are`} held at the schema check`}>
            {`${failing.map((one) => one.file).join(", ")}: nothing in it is ingested until its failed rows are fixed or dropped.`}
          </Alert>
        ) : null}
        <DetailOverviewGrid>
          <FacetCard
            title="Coverage"
            opens={contributorHref("coverage")}
            hint="Your own catalogue only, weighted by each asset's revenue over the last 12 months."
            figures={[
              { label: "Master resolved", as: "percent", value: of("Master resolved").now },
              { label: "Join rate", as: "percent", value: of("Join rate").now },
              { label: "Composition resolved", as: "percent", value: of("Composition resolved").now },
              { label: "Conflict rate", as: "percent", value: of("Conflict rate").now },
            ]}
          />
          <FacetCard
            title="Since your last upload"
            opens={contributorHref("coverage")}
            hint={last ? `Read against ${last.file}, matched ${formatDate(last.received, "day")}.` : undefined}
            // The CHANGE, signed — the system writes a share but not a movement of one (gaps, 5).
            facts={measures.map((one) => ({
              label: one.measure,
              value: `${one.now >= one.before ? "+" : "−"}${formatPercent(Math.abs(one.now - one.before))}`,
            }))}
          />
          <FacetCard
            title="Uploads"
            opens={contributorHref("batches")}
            figures={[
              { label: "In flight", as: "count", value: flying.length },
              { label: "Held for row errors", as: "count", value: failing.length },
              { label: "Matched", as: "count", value: batches.filter((one) => one.state === "Matched").length },
            ]}
          />
          <FacetCard
            title="Match results"
            opens={contributorHref("matches")}
            hint="Every matched batch, summed."
            figures={[
              { label: "Matched", as: "count", value: totals.matched },
              { label: "New", as: "count", value: totals.new },
              { label: "Conflicting", as: "count", value: totals.conflicting },
              { label: "Unmatched", as: "count", value: totals.unmatched },
            ]}
          />
          <FacetCard
            title="Conflicts on your claims"
            opens={contributorHref("conflicts")}
            figures={[
              { label: "Open", as: "count", value: conflicts.length },
              { label: "Revenue at risk", as: "money", value: conflicts.reduce((sum, one) => sum + one.revenueAtRisk, 0) },
            ]}
          />
          <FacetCard
            title="Sharing"
            opens={contributorHref("sharing")}
            hint="No other tenant, WMG included, reads a Private or Encrypted field."
            figures={[
              { label: "Shared fields", as: "count", value: levels.filter((one) => one.level === "Shared").length },
              { label: "Private", as: "count", value: levels.filter((one) => one.level === "Private").length },
              { label: "Encrypted", as: "count", value: levels.filter((one) => one.level === "Encrypted").length },
            ]}
          />
          <FacetCard
            title="Access log"
            opens={contributorHref("access")}
            figures={[
              { label: "Reads this week", as: "count", value: reads.length },
              { label: "Under audit only", as: "count", value: reads.filter((one) => one.audit).length },
            ]}
          />
        </DetailOverviewGrid>
      </DetailOverview>
    </DetailPage>
  );
}

/**
 * The four coverage measures, over the tenant's own catalogue — and what the last matched upload
 * moved each by. A COLLECTION of four, because each is read against the same two readings.
 */
export function CoveragePage() {
  const last = batchById(LAST_UPLOAD);
  return (
    <CollectionPage
      title="Coverage"
      more={[{ label: "Export" }]}
      index={{
        rows: coverage(),
        rowKey: (one) => one.measure,
        noun: { one: "measure", many: "measures" },
        identity: { title: "Measure", name: (one) => one.measure },
        note: (
          <Alert intent="info" title="Your catalogue, weighted by revenue">
            {`Each measure counts your own assets only, weighted by their revenue over the last 12 months — the graph-wide figure is Sureel's. The change is read against ${last ? last.file : "your last matched upload"}. A rise in the conflict rate is the one rise that is bad news.`}
          </Alert>
        ),
        columns: [
          { name: "Now", as: "percent", value: (one) => one.now },
          { name: "Before last upload", as: "percent", value: (one) => one.before },
          { name: "Change", as: "percent", value: (one) => one.now - one.before },
          { name: "What it counts", value: (one) => one.means, cell: (one) => one.means },
        ],
        chooser: false,
      }}
    />
  );
}
