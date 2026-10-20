import { Avatar, CollectionPage, Text, formatPercent } from "@revelator/pro-ui";
import { coverAt } from "@revelator/pro-ui/assets";

import { ASSERTIONS, partyName } from "../../../graph/fixtures";
import type { Asset } from "../../../graph/model";
import { coverageOf, standing, tierOf, worksOf } from "../../../graph/resolve";
import { TerritoryChip, TierChip } from "../../../rights/kit";
import { assetRightsHref, catalogue, conflictsOn, labelRecordings, rightsHref } from "./data";
import { exportCommand } from "./shared";

/** The narrowings the overview links to, by the segment that names them. */
export const CATALOGUE_NARROWINGS = ["below-t3", "unlinked", "conflicts"] as const;

/** The master claims the graph resolved on an asset — the owner and where it controls. */
const masterOf = (asset: Asset) =>
  ASSERTIONS.filter(
    (one) => one.assetId === asset.id && one.side === "Master" && standing(one) && one.state === "Resolved" && one.shareType === "Master",
  );
const owner = (asset: Asset) => masterOf(asset).find((one) => one.interests.includes("Owns"));

/** An asset's mark: its cover, square, as the catalogue draws it. */
export const assetMark = (asset: Asset) => (
  <Avatar kind="work" name={asset.title}>
    {asset.cover === undefined ? null : <img src={coverAt(asset.cover)} alt="" />}
  </Avatar>
);

/**
 * Catalogue rights: every recording and video the label holds masters on, with what the graph
 * resolved for it — who owns and controls the master and where, how many works it is linked to,
 * the tier its claims reached, what is open against it and what it earns.
 *
 * A COLLECTION PAGE: the set is produced by the catalogue and not grown here, so it has no action
 * of its own — a claim is added on the asset, which every row opens on its Rights facet (S1-2,
 * S1-3, another builder's). Master and composition stay apart (G-3): the master's owner and
 * territory are columns, the composition side is the count of works the graph links.
 */
export function Catalogue({ narrowed }: { narrowed?: string }) {
  const rows = catalogue();
  const coverage = coverageOf(labelRecordings());
  return (
    <CollectionPage
      title="Catalogue rights"
      more={[exportCommand("Catalogue rights")]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "asset", many: "assets" },
        note: (
          <Text>
            {`${formatPercent(coverage.resolved)} of the catalogue's recording revenue is resolved at T3 or above; ${formatPercent(coverage.linked)} is linked to a work.`}
          </Text>
        ),
        identity: {
          title: "Asset",
          name: (one) => one.title,
          mark: assetMark,
          sortable: true,
          opens: (one) => assetRightsHref(one),
        },
        // Ranked by what it earns: a conflict on a track that earns is the one to look at first.
        sort: { column: "Revenue", direction: "descending" },
        searchBy: ["Asset", "Artist", "ISRC"],
        columns: [
          { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => one.isrc, hidden: true },
          { name: "Artist", value: (one) => one.artist ?? "", cell: (one) => one.artist },
          {
            name: "Master owner",
            value: (one) => (owner(one) ? partyName(owner(one)!.partyId) : ""),
            cell: (one) => (owner(one) ? partyName(owner(one)!.partyId) : undefined),
          },
          {
            name: "Controlled in",
            value: (one) => masterOf(one).filter((claim) => claim.interests.includes("Controls")).length,
            cell: (one) => {
              const control = masterOf(one).find((claim) => claim.interests.includes("Controls"));
              return control ? <TerritoryChip set={control.territory} /> : undefined;
            },
          },
          { name: "Source", value: (one) => owner(one)?.source ?? "", cell: (one) => owner(one)?.source },
          { name: "Tier", value: (one) => tierOf(one.id), cell: (one) => <TierChip tier={tierOf(one.id)} /> },
          { name: "Linked works", as: "count", value: (one) => worksOf(one).length },
          { name: "Open conflicts", as: "count", value: (one) => conflictsOn(one).length },
          { name: "Revenue", as: "money", value: (one) => one.revenue },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "Recordings", holds: (one) => one.kind === "Recording" },
          { name: "Videos", holds: (one) => one.kind === "Video" },
        ],
        filters: [
          {
            kind: "switches",
            key: "standing",
            label: "Standing",
            switches: [
              { key: "below-t3", label: "Below T3", holds: (one) => tierOf(one.id) < 3, initially: narrowed === "below-t3" },
              {
                key: "unlinked",
                label: "No work link",
                holds: (one) => one.kind === "Recording" && worksOf(one).length === 0,
                initially: narrowed === "unlinked",
              },
              {
                key: "conflicts",
                label: "Open conflicts",
                holds: (one) => conflictsOn(one).length > 0,
                initially: narrowed === "conflicts",
              },
            ],
          },
          {
            kind: "anyOf",
            key: "artist",
            label: "Artist",
            entity: "person",
            noun: { one: "artist", many: "artists" },
            options: [...new Set(rows.map((one) => one.artist ?? ""))].filter(Boolean),
            of: (one) => one.artist ?? "",
          },
        ],
        totals: [{ count: true }, { name: "Total Revenue", as: "money", sum: (one) => one.revenue }],
        commands: (one) => [
          { label: "Open rights", opens: assetRightsHref(one) },
          { label: "Open clearances", opens: rightsHref("clearances", one.id) },
        ],
        empty: { holder: "this catalogue" },
      }}
    />
  );
}
