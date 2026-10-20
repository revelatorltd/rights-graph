import {
  Badge,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  FacetCard,
  Slot,
  SlotItem,
  StatCard,
  StatCardRow,
  Text,
  TitledCard,
  type StatusKey,
} from "@revelator/pro-ui";

import { assetById, partyById } from "../../../graph/fixtures";
import type { Conflict, Request } from "../../../graph/model";
import { coverageOf, tierOf } from "../../../graph/resolve";
import { partyMark } from "../../../rights/kit";
import {
  LABEL,
  catalogue,
  hasReleaseGrants,
  inbox,
  isNew,
  isParty,
  labelConflicts,
  labelGrants,
  labelRecordings,
  labelReleases,
  openOf,
  rightsHref,
  waiting,
} from "./data";
import { askOf } from "./requests";
import { exportCommand, labelActivity } from "./shared";

const requestStatus = (state: Request["state"]): StatusKey => `request:${state}`;
const conflictStatus = (state: Conflict["state"]): StatusKey => `conflict:${state}`;

/** One thing the label owes next: what, where it opens, and the state that says why. */
interface Owed {
  key: string;
  title: string;
  opens: string;
  status?: StatusKey;
  due?: Date;
}

/**
 * The Rights overview (S1-1): the label as a record, read on its landing facet.
 *
 * A DETAIL OVERVIEW and not an analytics page: nothing here is read over a period — every figure
 * is true now, and each part opens the list it counts. The headline band holds the FRD's four
 * counts; the tiles under it are what each is made of, every one the way into its rows, narrowed
 * to what it counts. What the label owes next closes the grid; its history is behind the header's
 * timeline control.
 */
export function Overview() {
  const label = partyById(LABEL);
  const recordings = labelRecordings();
  const assets = catalogue();
  const coverage = coverageOf(recordings);
  const conflicts = openOf(labelConflicts());
  const atRisk = (side?: "Master" | "Composition") =>
    conflicts.filter((one) => !side || one.side === side).reduce((sum, one) => sum + one.revenueAtRisk, 0);
  const requests = inbox();
  const pending = requests.filter(waiting);
  const grants = labelGrants().filter((one) => one.grantedBy === LABEL);

  const owed: Owed[] = [
    ...pending.map((one) => ({
      key: one.id,
      title: askOf(one),
      opens: rightsHref("requests", one.id),
      status: requestStatus(one.state),
      due: one.deadline,
    })),
    // F1: a new release whose AI consent has not started from the defaults yet.
    ...labelReleases()
      .filter((one) => isNew(one) && !hasReleaseGrants(one.id))
      .map((one) => ({
        key: one.id,
        title: `Apply release defaults to ${one.title}`,
        opens: rightsHref("consent", "defaults"),
        due: one.released,
      })),
    ...conflicts
      // Not where an inbox item already asks for the answer — it is listed once, as the request.
      .filter((one) => isParty(one) && one.step === 0 && !pending.some((request) => request.about === one.id))
      .map((one) => ({
        key: one.id,
        title: `Respond to the ${one.kind.toLowerCase()} on ${assetById(one.assetId).title}`,
        opens: rightsHref("conflicts", one.id),
        status: conflictStatus(one.state),
      })),
  ];

  return (
    <DetailPage
      record={{
        mark: partyMark(label),
        name: label.name,
        kind: "Label",
        facts: [
          { as: "count", value: recordings.length, noun: { one: "recording", many: "recordings" } },
          { as: "count", value: assets.length - recordings.length, noun: { one: "video", many: "videos" } },
          { text: label.country ?? "" },
        ],
        actions: [{ label: "Grant consent", primary: true, creates: true, opens: rightsHref("consent", "new") }],
        more: [exportCommand("Kestrel Point catalogue")],
        activity: labelActivity(),
      }}
    >
      <DetailOverview>
        {/* The FRD's four counts, true now — each read further in the tile that opens its rows. */}
        <StatCardRow>
          <StatCard
            name="Coverage"
            as="percent"
            value={coverage.resolved}
            hint="Share of the catalogue's last-12-month recording revenue resolved at T3 or above."
          />
          <StatCard name="Open conflicts" as="count" value={conflicts.length} />
          <StatCard name="Pending requests" as="count" value={pending.length} />
        </StatCardRow>
        <DetailOverviewGrid>
          <FacetCard
            title="Catalogue rights"
            opens={rightsHref("catalogue", "below-t3")}
            hint="Resolved means T3 or above: an agreement linked, royalty history, identifiers verified."
            figures={[
              { label: "Below T3", as: "count", value: assets.filter((one) => tierOf(one.id) < 3).length },
              { label: "No work link", as: "count", value: recordings.filter((one) => !(one.embodies ?? []).length).length },
              { label: "Linked revenue", as: "percent", value: coverage.linked },
            ]}
          />
          <FacetCard
            title="Conflicts"
            count={conflicts.length}
            opens={rightsHref("conflicts")}
            figures={[
              { label: "High", as: "count", value: conflicts.filter((one) => one.severity === "High").length },
              { label: "Medium", as: "count", value: conflicts.filter((one) => one.severity === "Medium").length },
              { label: "Low", as: "count", value: conflicts.filter((one) => one.severity === "Low").length },
            ]}
          />
          <FacetCard
            title="Requests"
            count={pending.length}
            opens={rightsHref("requests")}
            figures={[
              { label: "Needs decision", as: "count", value: pending.filter((one) => one.state === "Needs decision").length },
              { label: "Escalated", as: "count", value: pending.filter((one) => one.state === "Escalated").length },
              { label: "Auto-cleared", as: "count", value: requests.filter((one) => one.state === "Auto-cleared").length },
            ]}
          />
          <FacetCard
            title="Revenue at risk"
            opens={rightsHref("conflicts", "at-risk")}
            hint="What the open conflicts hold back, and the side of the copyright each sits on."
            figures={[
              { label: "Total", as: "money", value: atRisk(), span: true },
              { label: "Master", as: "money", value: atRisk("Master") },
              { label: "Composition", as: "money", value: atRisk("Composition") },
            ]}
          />
          <FacetCard
            title="AI consent"
            opens={rightsHref("consent")}
            figures={[
              { label: "Live", as: "count", value: grants.filter((one) => one.state === "Live").length },
              { label: "Paused", as: "count", value: grants.filter((one) => one.state === "Paused").length },
              { label: "Denied", as: "count", value: grants.filter((one) => one.effect === "Deny").length },
            ]}
          />
          <TitledCard title="Needs you next" count={owed.length}>
            <Slot layout="list">
              {owed.map((one) => (
                <SlotItem key={one.key} opens={one.opens} trail={one.status ? <Badge status={one.status} /> : undefined}>
                  <Text kind="title">{one.title}</Text>
                </SlotItem>
              ))}
            </Slot>
          </TitledCard>
        </DetailOverviewGrid>
      </DetailOverview>
    </DetailPage>
  );
}
