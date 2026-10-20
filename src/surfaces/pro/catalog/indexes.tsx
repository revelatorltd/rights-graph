import { Avatar, Badge, CollectionPage } from "@revelator/pro-ui";
import { coverAt, stillAt } from "@revelator/pro-ui/assets";

import { assetById } from "../../../graph/fixtures";
import type { Asset } from "../../../graph/model";
import { clearanceOf, controllers, recordingsOf, tierOf, useGraph, worksOf } from "../../../graph/resolve";
import { ClearanceBadge, TierChip } from "../../../rights/kit";
import { proHref } from "../index";
import { catalogueOf, clearanceCounts, countriesOf, openConflictsOn, placesLabel } from "./data";

/** Where a catalogue record is: `#/pro/catalog/<tracks|releases|videos>/<id>/<facet>`. */
export const assetHref = (asset: Asset, facet?: string) =>
  proHref("catalog", asset.kind === "Recording" ? "tracks" : asset.kind === "Release" ? "releases" : "videos", asset.id, facet);

/** A catalogue record's mark: its cover, square — a video's still, wide. */
export const assetMark = (asset: Asset) => (
  <Avatar kind="work" name={asset.title}>
    <img src={asset.kind === "Video" ? stillAt(asset.cover ?? 0) : coverAt(asset.cover ?? 0)} alt="" />
  </Avatar>
);

/** The master is controlled everywhere — or where it is not, which is a gap the row should say. */
const masterHeld = (asset: Asset) => {
  // Asked in every country a claim on it names, and once for everywhere else.
  const all = countriesOf([asset.id]);
  const missing = all.filter((country) => controllers(asset.id, "Master", country).length === 0);
  return missing.length ? `Gap in ${placesLabel(missing, all)}` : "Controlled";
};

const TIER_OPTIONS = ["T1", "T2", "T3", "T4", "T5"];

/**
 * The label's tracks — every recording in its catalogue, each with what a reader checks before
 * opening it: the identifier, who performs it, its tier, whether its master is held everywhere,
 * whether it is linked to a work (unmatched publishing money where it is not) and how cleared it is.
 *
 * A COLLECTION PAGE, as the replica's catalogue lists are; the rights readings are columns of the
 * graph's answers, never the page's own.
 */
export function Tracks() {
  useGraph();
  const rows = catalogueOf("Recording");
  return (
    <CollectionPage
      title="Tracks"
      more={[{ label: "Export rights report" }]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "track", many: "tracks" },
        identity: {
          title: "Title",
          name: (one) => one.title,
          mark: assetMark,
          sortable: true,
          opens: (one) => assetHref(one),
        },
        searchBy: ["Title", "ISRC", "Artist"],
        columns: [
          { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => one.isrc },
          { name: "Artist", value: (one) => one.artist ?? "", cell: (one) => one.artist },
          {
            name: "Release",
            value: (one) => (one.releaseId ? assetById(one.releaseId).title : ""),
            cell: (one) => (one.releaseId ? assetById(one.releaseId).title : null),
          },
          { name: "Tier", value: (one) => tierOf(one.id), cell: (one) => <TierChip tier={tierOf(one.id)} /> },
          { name: "Master", value: masterHeld, cell: masterHeld },
          {
            name: "Work link",
            value: (one) => worksOf(one).length,
            // A missing link is unmatched publishing money — a state, so a badge.
            cell: (one) => <Badge status={worksOf(one).length ? "match:Matched" : "match:Unmatched"} />,
          },
          {
            name: "Cleared uses",
            value: (one) => clearanceCounts(one.id).granted,
            cell: (one) => `${clearanceCounts(one.id).granted} of 8`,
          },
          {
            name: "AI training",
            value: (one) => clearanceOf(one.id, "AI training").state,
            cell: (one) => <ClearanceBadge state={clearanceOf(one.id, "AI training").state} />,
          },
          { name: "Open conflicts", as: "count", value: (one) => openConflictsOn([one.id, ...worksOf(one).map((work) => work.id)]).length },
          { name: "Revenue", as: "money", value: (one) => one.revenue, hidden: true },
          { name: "Released", as: "date", value: (one) => one.released ?? null },
        ],
        // What a rights reader moves between: everything, what needs them, and the money unmatched.
        readings: [
          { name: "All", holds: () => true },
          {
            name: "Needs attention",
            holds: (one) => openConflictsOn([one.id, ...worksOf(one).map((work) => work.id)]).length > 0 || masterHeld(one) !== "Controlled",
          },
          { name: "No work link", holds: (one) => worksOf(one).length === 0 },
        ],
        filters: [
          { kind: "anyOf", key: "artist", label: "Artist", options: [...new Set(rows.map((one) => one.artist ?? ""))], of: (one) => one.artist ?? "" },
          { kind: "anyOf", key: "tier", label: "Tier", options: TIER_OPTIONS, of: (one) => `T${tierOf(one.id)}` },
        ],
        totals: [{ count: true }, { name: "Revenue", as: "money", sum: (one) => one.revenue }],
        commands: (one) => [
          { label: "Open", opens: assetHref(one) },
          { label: "Open rights", opens: assetHref(one, "rights") },
          { label: "Open clearances", opens: assetHref(one, "clearances") },
        ],
        empty: { holder: "this catalogue" },
      }}
    />
  );
}

/**
 * The label's releases. A release holds no rights of its own — it packages tracks — so what it
 * reads is its tracks': the least cleared, the lowest tier, the conflicts any of them carries.
 */
export function Releases() {
  useGraph();
  const rows = catalogueOf("Release");
  const tracksOf = (one: Asset) => recordingsOf(one);
  const lowest = (one: Asset) => Math.min(...tracksOf(one).map((track) => tierOf(track.id))) as 1 | 2 | 3 | 4 | 5;
  return (
    <CollectionPage
      title="Releases"
      more={[{ label: "Export rights report" }]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "release", many: "releases" },
        identity: { title: "Title", name: (one) => one.title, mark: assetMark, sortable: true, opens: (one) => assetHref(one) },
        searchBy: ["Title", "UPC", "Artist"],
        columns: [
          { name: "UPC", as: "identifier", standard: "upc", value: (one) => one.upc },
          { name: "Artist", value: (one) => one.artist ?? "", cell: (one) => one.artist },
          { name: "Tracks", as: "count", value: (one) => tracksOf(one).length },
          // The weakest track's tier is the release's: a release is as sure as its least sure track.
          { name: "Lowest tier", value: lowest, cell: (one) => <TierChip tier={lowest(one)} /> },
          {
            name: "Tracks unlinked",
            as: "count",
            value: (one) => tracksOf(one).filter((track) => worksOf(track).length === 0).length,
          },
          {
            name: "Stream",
            value: (one) => clearanceOf(one.id, "Stream").state,
            cell: (one) => <ClearanceBadge state={clearanceOf(one.id, "Stream").state} />,
          },
          {
            name: "AI training",
            value: (one) => clearanceOf(one.id, "AI training").state,
            cell: (one) => <ClearanceBadge state={clearanceOf(one.id, "AI training").state} />,
          },
          {
            name: "Open conflicts",
            as: "count",
            value: (one) => openConflictsOn(tracksOf(one).flatMap((track) => [track.id, ...worksOf(track).map((work) => work.id)])).length,
          },
          { name: "Released", as: "date", value: (one) => one.released ?? null },
        ],
        sort: { column: "Released", direction: "descending" },
        filters: [{ kind: "anyOf", key: "artist", label: "Artist", options: [...new Set(rows.map((one) => one.artist ?? ""))], of: (one) => one.artist ?? "" }],
        totals: [{ count: true }],
        commands: (one) => [
          { label: "Open", opens: assetHref(one) },
          { label: "Open rights", opens: assetHref(one, "rights") },
        ],
        empty: { holder: "this catalogue" },
      }}
    />
  );
}

/**
 * The label's videos. A video inherits its master from the recordings it contains and needs every
 * work they embody cleared — so sync, the use a video is licensed for, is read on both sides.
 */
export function Videos() {
  useGraph();
  const rows = catalogueOf("Video");
  return (
    <CollectionPage
      title="Videos"
      more={[{ label: "Export rights report" }]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "video", many: "videos" },
        identity: { title: "Title", name: (one) => one.title, mark: assetMark, sortable: true, opens: (one) => assetHref(one) },
        searchBy: ["Title", "ISRC", "Artist"],
        columns: [
          { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => one.isrc },
          { name: "Artist", value: (one) => one.artist ?? "", cell: (one) => one.artist },
          { name: "Recordings", as: "count", value: (one) => recordingsOf(one).length },
          { name: "Works embodied", as: "count", value: (one) => worksOf(one).length },
          { name: "Tier", value: (one) => tierOf(one.id), cell: (one) => <TierChip tier={tierOf(one.id)} /> },
          {
            name: "Sync in US",
            value: (one) => clearanceOf(one.id, "Sync", { country: "US" }).state,
            cell: (one) => <ClearanceBadge state={clearanceOf(one.id, "Sync", { country: "US" }).state} />,
          },
          {
            name: "Open conflicts",
            as: "count",
            value: (one) => openConflictsOn([one.id, ...recordingsOf(one).map((track) => track.id), ...worksOf(one).map((work) => work.id)]).length,
          },
          { name: "Released", as: "date", value: (one) => one.released ?? null },
        ],
        totals: [{ count: true }],
        commands: (one) => [
          { label: "Open", opens: assetHref(one) },
          { label: "Open rights", opens: assetHref(one, "rights") },
        ],
        empty: { holder: "this catalogue" },
      }}
    />
  );
}
