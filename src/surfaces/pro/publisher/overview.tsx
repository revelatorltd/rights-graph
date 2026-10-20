import { DetailOverview, DetailOverviewGrid, DetailPage, FacetCard, sumMoney } from "@revelator/pro-ui";

import { GRANTS, partyById } from "../../../graph/fixtures";
import { pending, requestsFor, useGraph } from "../../../graph/resolve";
import { partyMark } from "../../../rights/kit";
import { ME, myConflicts, myWorks, registrations, rightsHref, societyOf, unlinked } from "./data";

/**
 * The publisher's Rights overview (S2, the Overview tab) — what Harbor Music's side of the graph
 * comes to, each count the way into the tab that lists it.
 *
 * A DETAIL PAGE of the organisation the reader works as, on its landing facet: the workspace has no
 * declared "home" form, and an organisation is the record these counts are true of. One tile per
 * tab, each with what it settles and its way in (gaps: the tile cannot open its tab already
 * narrowed to the reading the count names).
 */
export function PublisherOverview() {
  useGraph();
  const me = partyById(ME);
  const catalogue = myWorks();
  const toLink = unlinked().filter((one) => one.revenue > 0);
  const registered = registrations();
  const conflicts = myConflicts().filter((one) => one.state !== "Resolved");
  const inbox = requestsFor(ME);
  const owed = pending(ME);
  const grants = GRANTS.filter((one) => one.grantedBy === ME && one.side !== "Master");
  const nextDeadline = owed.map((one) => one.deadline).sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <DetailPage
      record={{
        mark: partyMark(me),
        name: me.name,
        kind: "Publisher",
        facts: [
          { identifier: me.ipi ?? "", standard: "ipi" },
          { text: societyOf(ME) ?? "No society on file" },
          { as: "count", value: catalogue.length, noun: { one: "work", many: "works" } },
        ],
        actions: [{ label: "Answer requests", opens: rightsHref("requests"), primary: true, count: owed.length }],
        more: [{ label: "Generate CWR", opens: rightsHref("registrations") }, { label: "Export rights report" }],
      }}
    >
      <DetailOverview>
        <DetailOverviewGrid>
          <FacetCard
            title="Works"
            count={catalogue.length}
            opens={rightsHref("works")}
            figures={[
              { label: "Composition revenue", as: "money", value: sumMoney(catalogue.map((one) => one.revenue)) },
              { label: "In conflict", as: "count", value: catalogue.filter((work) => conflicts.some((one) => one.assetId === work.id)).length },
            ]}
          />
          <FacetCard
            title="Recordings to link"
            count={toLink.length}
            opens={rightsHref("recordings-to-link")}
            hint="Earning recordings with no work link: their publishing income is held unmatched."
            figures={[
              { label: "Earning, unlinked", as: "count", value: toLink.length },
              { label: "Revenue unmatched", as: "money", value: sumMoney(toLink.map((one) => one.revenue)) },
            ]}
          />
          <FacetCard
            title="Registrations"
            count={registered.length}
            opens={rightsHref("registrations")}
            figures={[
              {
                label: "Missing",
                as: "count",
                value: registered.filter((one) => one.state === "Missing").length,
                marks: [{ intent: "warn", label: "Missing registrations" }],
              },
              { label: "Rejected", as: "count", value: registered.filter((one) => one.state === "Rejected").length },
            ]}
          />
          <FacetCard
            title="Conflicts"
            count={conflicts.length}
            opens={rightsHref("conflicts")}
            figures={[
              { label: "Open", as: "count", value: conflicts.length, marks: conflicts.length ? [{ intent: "danger", label: "Open conflicts" }] : undefined },
              { label: "Revenue at risk", as: "money", value: sumMoney(conflicts.map((one) => one.revenueAtRisk)) },
            ]}
          />
          <FacetCard
            title="Requests"
            count={inbox.length}
            opens={rightsHref("requests")}
            figures={[
              { label: "Needs decision", as: "count", value: owed.length },
              { label: "Next deadline", as: "date", value: nextDeadline ?? null },
            ]}
          />
          <FacetCard
            title="Clearances"
            count={grants.length}
            opens={rightsHref("clearances")}
            hint="Composition-side grants and denials Harbor Music has made — its own share only."
            figures={[
              { label: "Live", as: "count", value: grants.filter((one) => one.state === "Live").length },
              { label: "Denials", as: "count", value: grants.filter((one) => one.effect === "Deny" && one.state !== "Revoked").length },
            ]}
          />
        </DetailOverviewGrid>
      </DetailOverview>
    </DetailPage>
  );
}
