import { Avatar, Badge, CollectionPage } from "@revelator/pro-ui";

import type { Asset } from "../../../graph/model";
import { recordingsEmbodying, tierOf, useGraph } from "../../../graph/resolve";
import { TierChip } from "../../../rights/kit";
import { AddWorkClaim } from "./claim-dialogs";
import { myConflicts, myShare, myWorks, registrationsOf, rightsHref, territoryReading, writersOf } from "./data";

/** A work's mark, the same on its row and on its band. */
export const workMark = (work: Asset) => <Avatar kind="work" name={work.title} />;

/** Where a registration stands at its worst, for the work's row — Missing before Rejected before Sent. */
const WORST = ["Missing", "Rejected", "Sent", "Acknowledged"] as const;
const worstRegistration = (work: Asset) => WORST.find((state) => registrationsOf(work.id).some((one) => one.state === state));

/**
 * The works Harbor Music holds a claim on (S2-1) — each read on the composition side only, its
 * share as the graph holds Harbor's own claim, and whether its claims agree territory by territory.
 *
 * A COLLECTION PAGE. Whether a work is in conflict is the readings it divides by: a publisher comes
 * here to find the works whose shares disagree.
 */
export function Works() {
  useGraph();
  const conflicted = (work: Asset) => myConflicts().some((one) => one.assetId === work.id && one.state !== "Resolved");
  return (
    <CollectionPage
      title="Works"
      actions={[{ label: "Add claim", creates: true, dialog: <AddWorkClaim /> }]}
      more={[{ label: "Export works" }]}
      index={{
        rows: myWorks(),
        rowKey: (one) => one.id,
        noun: { one: "work", many: "works" },
        identity: {
          title: "Work",
          name: (one) => one.title,
          mark: workMark,
          sortable: true,
          opens: (one) => rightsHref("works", one.id),
        },
        sort: { column: "Revenue", direction: "descending" },
        searchBy: ["Work", "ISWC", "Writers"],
        columns: [
          { name: "ISWC", as: "identifier", standard: "iswc", value: (one) => one.iswc },
          {
            name: "Writers",
            as: "entities",
            noun: { one: "writer", many: "writers" },
            entity: "person",
            value: (one) => writersOf(one.id).filter((each) => each.credit !== "Denied").map((each) => ({ name: each.name, detail: each.role })),
          },
          // Harbor's OWN share, as its own claim states it — never a combined rights figure (G-3).
          { name: "Harbor's share", as: "percent", value: (one) => myShare(one.id) },
          {
            name: "Territories",
            value: (one) => (territoryReading(one).inSync ? 1 : 0),
            cell: (one) => {
              const reading = territoryReading(one);
              return reading.inSync ? <Badge status="claim:Resolved" /> : <Badge status="claim:Contested" />;
            },
          },
          {
            name: "Registration",
            value: (one) => WORST.indexOf(worstRegistration(one) ?? "Acknowledged"),
            cell: (one) => {
              const worst = worstRegistration(one);
              return worst ? <Badge status={`registration:${worst}`} /> : null;
            },
          },
          { name: "Recordings", as: "count", value: (one) => recordingsEmbodying(one.id).length },
          { name: "Tier", value: (one) => tierOf(one.id), cell: (one) => <TierChip tier={tierOf(one.id)} /> },
          { name: "Revenue", as: "money", value: (one) => one.revenue },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "In conflict", holds: conflicted },
          { name: "Missing registration", holds: (one) => registrationsOf(one.id).some((each) => each.state === "Missing") },
        ],
        filters: [
          {
            kind: "switches",
            key: "standing",
            label: "Standing",
            switches: [{ key: "unsigned", label: "No signed agreement", holds: (one) => !writersOf(one.id).some((each) => each.publisher?.agreement) }],
          },
        ],
        totals: [{ count: true }, { name: "Composition revenue", sum: (one) => one.revenue, as: "money" }],
        commands: (one) => [
          { label: "Open", opens: rightsHref("works", one.id) },
          { label: "Add claim", dialog: <AddWorkClaim workId={one.id} /> },
          { label: "Open conflicts", opens: rightsHref("conflicts") },
        ],
        empty: { holder: "Harbor Music" },
      }}
    />
  );
}
