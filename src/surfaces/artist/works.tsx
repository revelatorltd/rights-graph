import { Avatar, Badge, CollectionPage, formatList } from "@revelator/pro-ui";

import { ASSERTIONS } from "../../graph/fixtures";
import { controllers, standing, tierOf } from "../../graph/resolve";
import { TierChip } from "../../rights/kit";
import type { Shown } from "../surface";
import { MEMBERSHIPS, REGISTRATIONS, assetById, creditsOf, partyName, type Reader } from "./data";
import { assetMark } from "./marks";
import { assetHref } from "./place";

/** The writer's own declared share of a work — their claim, never the resolved split. */
const ownShare = (party: string, workId: string) =>
  ASSERTIONS.find((one) => one.assetId === workId && one.partyId === party && one.shareType === "Writer" && standing(one))?.share;

/**
 * Works (S3-9, writer mode): the works the writer is credited on, who publishes them, their own
 * declared share, and their registrations society by society — a missing one counted on the row.
 */
function WorksIndex({ reader }: { reader: Reader }) {
  const party = reader.subject.id;
  const works = creditsOf(party).filter((one) => assetById(one.assetId).kind === "Work");
  return (
    <CollectionPage
      title="Works"
      index={{
        rows: works,
        rowKey: (one) => one.id,
        noun: { one: "work", many: "works" },
        identity: { title: "Work", name: (one) => assetById(one.assetId).title, mark: (one) => assetMark(assetById(one.assetId)), opens: (one) => assetHref(one.assetId) },
        columns: [
          { name: "ISWC", as: "identifier", standard: "iswc", value: (one) => assetById(one.assetId).iswc },
          { name: "Credit", value: (one) => one.state, cell: (one) => <Badge status={`credit:${one.state}`} /> },
          { name: "Role", value: (one) => one.role, cell: (one) => one.role },
          { name: "Your share", as: "percent", value: (one) => ownShare(party, one.assetId) ?? null },
          {
            name: "Publishers",
            value: (one) => controllers(one.assetId, "Composition", "GB").map((each) => partyName(each.partyId)).join(", "),
            cell: (one) => formatList(controllers(one.assetId, "Composition", "GB").map((each) => partyName(each.partyId))),
          },
          {
            name: "Registrations missing",
            as: "count",
            value: (one) => REGISTRATIONS.filter((each) => each.workId === one.assetId && each.state === "Missing").length,
          },
          { name: "Tier", value: (one) => tierOf(one.assetId), cell: (one) => <TierChip tier={tierOf(one.assetId)} /> },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "Registration missing", holds: (one) => REGISTRATIONS.some((each) => each.workId === one.assetId && each.state === "Missing") },
        ],
        empty: { none: "No work credits you as a writer yet." },
      }}
    />
  );
}

export const worksPage = (reader: Reader): Shown => ({
  place: { at: "Works", page: "Works" },
  page: <WorksIndex key={reader.persona} reader={reader} />,
});

/**
 * Societies (S3-9): where the writer's works earn, and whether they belong to a society there.
 * A territory with no affiliation is FLAGGED — the money there has no writer claim of theirs.
 */
function SocietiesIndex({ reader }: { reader: Reader }) {
  return (
    <CollectionPage
      title="Societies"
      index={{
        rows: MEMBERSHIPS.filter((one) => one.party === reader.subject.id),
        rowKey: (one) => one.id,
        noun: { one: "territory", many: "territories" },
        identity: { title: "Territory", name: (one) => one.country, mark: (one) => <Avatar kind="place" name={one.country} /> },
        columns: [
          { name: "Membership", value: (one) => one.state, cell: (one) => <Badge status={`registration:${one.state}`} /> },
          { name: "Society", value: (one) => one.society, cell: (one) => one.society },
          { name: "What it means", value: (one) => one.note, cell: (one) => one.note },
        ],
        readings: [
          { name: "Missing", holds: (one) => one.state === "Missing" },
          { name: "All", holds: () => true },
        ],
        empty: { none: "No territory collects for your works yet." },
      }}
    />
  );
}

export const societiesPage = (reader: Reader): Shown => ({
  place: { at: "Works", page: "Societies" },
  page: <SocietiesIndex key={reader.persona} reader={reader} />,
});
