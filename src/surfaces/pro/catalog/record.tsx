import { useState, type ReactNode } from "react";
import {
  Badge,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  EmptyState,
  FacetCard,
  FactCard,
  Link,
  RecordIndex,
  Sections,
  TitledSection,
  type Command,
  type DetailFacet,
  type RecordNavProps,
  type ShellPlace,
} from "@revelator/pro-ui";

import { ASSETS, ATTESTATIONS, assetById, partyName, setDelivered } from "../../../graph/fixtures";
import type { Asset } from "../../../graph/model";
import { recordingsOf, tierOf, useGraph, worksOf } from "../../../graph/resolve";
import { TierChip } from "../../../rights/kit";
import { proHref, usePersonaOf, type Persona } from "../index";
import { ClearancesFacet, FIRST_ASK, type Asking } from "./clearances";
import {
  KIND_WORD,
  NOW,
  assetsUnder,
  attestationsOn,
  claimsOn,
  clearanceCounts,
  glancePlace,
  creditsOn,
  historyOf,
  isPast,
  masterAssets,
  openConflictsOn,
  subjectWords,
  type Reading,
} from "./data";
import { ACTOR, ClaimDialog } from "./dialogs";
import { assetHref, assetMark } from "./indexes";
import { READER, RightsFacet } from "./rights";

/** A catalogue record's facets, in the order its nav lists them — the one it opens on first. */
export const FACETS = ["Overview", "Rights", "Clearances", "Credits", "History"] as const;
export type Facet = (typeof FACETS)[number];
export const facetOf = (segment: string | undefined): Facet =>
  FACETS.find((one) => one.toLowerCase() === segment) ?? "Overview";

const SEGMENT: Record<Asset["kind"], string> = { Recording: "tracks", Release: "releases", Video: "videos", Work: "tracks" };
const INDEX: Record<Asset["kind"], string> = { Recording: "Tracks", Release: "Releases", Video: "Videos", Work: "Tracks" };

type PageAction = NonNullable<DetailFacet["actions"]>[number];

const facetHref = (asset: Asset, facet: Facet) => assetHref(asset, facet === "Overview" ? undefined : facet.toLowerCase());

/**
 * One catalogue record — a track, a release or a video — with the rights facets every record
 * carries (FRD S1, "Rights also appear as a tab on every release, track and video page").
 *
 * The band says WHAT it is and how sure the graph is of it; the facets are the rights tab the FRD
 * asks for, cut where the questions part: who holds it (Rights), what it may be used for
 * (Clearances), who made it (Credits), and what changed (History).
 */
export function AssetRecord({ id, facet }: { id: string; facet: Facet }) {
  useGraph();
  const persona = usePersonaOf();
  const [reading, setReading] = useState<Reading>(NOW);
  const [ask, setAsk] = useState<Asking>(FIRST_ASK);
  const asset = ASSETS.find((one) => one.id === id);
  if (!asset)
    return <EmptyState mark="catalog" title="No such record" detail="It is not in this catalogue, or it was never delivered." />;

  const past = isPast(reading);
  const adds = addCommands(asset, persona, past);
  const BODIES: Record<Facet, { header?: DetailFacet; body: ReactNode }> = {
    Overview: { body: <AssetOverview asset={asset} /> },
    Rights: {
      header: {
        name: "Rights",
      },
      body: <RightsFacet asset={asset} reading={reading} persona={persona} onReading={setReading} />,
    },
    Clearances: {
      header: { name: "Clearances", more: [{ label: "Export clearance report" }] },
      body: <ClearancesFacet asset={asset} ask={ask} onAsk={setAsk} />,
    },
    Credits: { header: { name: "Credits" }, body: <AssetCredits asset={asset} /> },
    History: { header: { name: "History" }, body: <AssetHistory asset={asset} /> },
  };
  const shown = BODIES[facet];
  const conflicts = openConflictsOn(assetsUnder(asset).map((one) => one.id));

  return (
    <DetailPage
      record={{
        mark: assetMark(asset),
        name: asset.title,
        kind: KIND_WORD[asset.kind],
        facts: [
          ...(asset.isrc ? [{ identifier: asset.isrc, standard: "isrc" as const }] : []),
          ...(asset.upc ? [{ identifier: asset.upc, standard: "upc" as const }] : []),
          ...(asset.artist ? [{ text: asset.artist }] : []),
          ...(asset.released ? [{ as: "date" as const, value: asset.released, label: "Released" }] : []),
        ],
        // The one command that stands out is the reader's way into the rights: their own claim. It
        // stands over every facet, so no facet repeats it.
        actions: asset.kind === "Release" ? [{ label: "Open rights", opens: facetHref(asset, "Rights"), primary: true }] : adds.actions.map((one) => ({ ...one, primary: true })),
        more: [
          ...(asset.kind === "Release" ? [] : adds.more),
          // F1 step 3: the distributor's DSP delivery is an event into the graph (S9), not a claim.
          ...(asset.kind === "Recording" && asset.delivered === false && persona === "Label"
            ? [{ label: "Deliver to DSPs", opens: () => setDelivered(asset.id) }]
            : []),
          ...(conflicts.length ? [{ label: "Open conflicts", opens: proHref("rights", "conflicts") }] : []),
          { label: "Export rights report" },
        ],
      }}
      facet={shown.header}
    >
      {shown.body}
    </DetailPage>
  );
}

/**
 * Adding a claim, by persona: a label claims the master and only reads the composition; a
 * publisher claims the composition and only reads the master. The side a reader cannot claim is
 * still offered, unavailable, with why — the permission-denied state.
 */
function addCommands(asset: Asset, persona: Persona, past: boolean): { actions: PageAction[]; more: Command[] } {
  const party = READER[persona];
  const actor = ACTOR[persona];
  const linked = worksOf(asset);
  // A page action cannot be unavailable (gap): what the reader cannot do now waits in the overflow, with why.
  const pastWhy = "A past state is read-only: clear the dates to claim.";
  if (persona === "Label") {
    const other: Command = { label: "Add composition claim", unavailable: "Composition claims are the publishers' own; Kestrel Point reads them." };
    return past
      ? { actions: [], more: [{ label: "Add master claim", unavailable: pastWhy }, other] }
      : { actions: [{ label: "Add master claim", dialog: <ClaimDialog on={[asset]} side="Master" party={party} actor={actor} /> }], more: [other] };
  }
  const other: Command = { label: "Add master claim", unavailable: "The master is the label's: Harbor Music holds no master interest here." };
  if (past) return { actions: [], more: [{ label: "Add composition claim", unavailable: pastWhy }, other] };
  if (!linked.length) return { actions: [], more: [{ label: "Add composition claim", unavailable: "No work is linked yet: link one first." }, other] };
  return {
    actions: [{ label: "Add composition claim", dialog: <ClaimDialog on={linked} side="Composition" party={party} actor={actor} /> }],
    more: [other],
  };
}

/**
 * The recap: one tile per facet, each with what it comes to and the way in. The rights tile counts
 * the two sides apart — never one figure for both (G-3).
 */
function AssetOverview({ asset }: { asset: Asset }) {
  const masters = masterAssets(asset);
  const linked = worksOf(asset);
  const masterClaims = masters.flatMap((one) => claimsOn(one.id, NOW)).filter((one) => one.state !== "Superseded" && one.state !== "Withdrawn");
  const compositionClaims = linked.flatMap((one) => claimsOn(one.id, NOW)).filter((one) => one.state !== "Superseded" && one.state !== "Withdrawn");
  const conflicts = openConflictsOn(assetsUnder(asset).map((one) => one.id));
  const counts = clearanceCounts(asset.id);
  const credits = creditsOn(asset.kind === "Recording" ? [asset.id] : recordingsOf(asset).map((one) => one.id));
  const history = historyOf(asset);
  return (
    <DetailOverview>
      <DetailOverviewGrid>
        <FacetCard
          title="Rights"
          opens={facetHref(asset, "Rights")}
          figures={[
            { label: "Master claims", as: "count", value: masterClaims.length },
            { label: "Composition claims", as: "count", value: compositionClaims.length },
            { label: "Works linked", as: "count", value: linked.length },
            {
              label: "Open conflicts",
              as: "count",
              value: conflicts.length,
              marks: conflicts.length ? [{ intent: "danger", label: `${conflicts.length} open` }] : undefined,
            },
          ]}
        />
        <FacetCard
          title="Clearances"
          opens={facetHref(asset, "Clearances")}
          hint={
            counts.country === "US"
              ? "For any approved partner, in the United States, today."
              : `For any approved partner, in ${glancePlace(asset, counts.country)} — where the master is controlled — today.`
          }
          figures={[
            { label: "Granted", as: "count", value: counts.granted },
            { label: "Denied", as: "count", value: counts.denied },
            { label: "Needs review", as: "count", value: counts.review },
          ]}
        />
        <FacetCard
          title="Credits"
          opens={facetHref(asset, "Credits")}
          figures={[
            { label: "Confirmed", as: "count", value: credits.filter((one) => one.state === "Confirmed").length },
            { label: "To confirm", as: "count", value: credits.filter((one) => one.state === "To confirm").length },
          ]}
        />
        <FacetCard
          title="History"
          opens={facetHref(asset, "History")}
          figures={[
            { label: "Events", as: "count", value: history.length },
            { label: "Corrections", as: "count", value: history.filter((one) => one.name === "Claim corrected").length },
          ]}
        />
        <FactCard
          title={KIND_WORD[asset.kind]}
          facts={[
            { label: "Artist", value: asset.artist },
            ...(asset.releaseId
              ? [{ label: "Release", value: <Link opens={assetHref(assetById(asset.releaseId))}>{assetById(asset.releaseId).title}</Link> }]
              : []),
            ...(asset.kind === "Release" ? [{ label: "Tracks", as: "count" as const, value: recordingsOf(asset).length }] : []),
            ...(asset.kind === "Video"
              ? [{ label: "Contains", value: recordingsOf(asset).map((one) => one.title).join(", ") }]
              : []),
            { label: "Made", value: asset.creation },
            { label: "Delivered", value: asset.delivered === undefined ? undefined : asset.delivered ? "Yes — DSP delivery succeeded" : "Not yet" },
            // A release's tier is its least sure track's: it holds no rights to be sure of itself.
            {
              label: asset.kind === "Release" ? "Lowest tier" : "Tier",
              value: (
                <TierChip
                  tier={asset.kind === "Release" ? (Math.min(...recordingsOf(asset).map((one) => tierOf(one.id))) as 1 | 2 | 3 | 4 | 5) : tierOf(asset.id)}
                />
              ),
            },
            ...(asset.kind === "Release" ? [] : [{ label: "Revenue, last 12 months", as: "money" as const, value: asset.revenue }]),
          ]}
        />
      </DetailOverviewGrid>
    </DetailOverview>
  );
}

/**
 * Who made it: each contribution with its state, and the attestations signed about it or its
 * credits — the signatures that lift a recording toward T4. A recording also reads the writers of
 * the work it embodies; a release and a video read the credits of what they hold.
 */
function AssetCredits({ asset }: { asset: Asset }) {
  const on = asset.kind === "Recording" ? [asset.id] : recordingsOf(asset).map((one) => one.id);
  const credits = creditsOn(on);
  const writers = creditsOn(worksOf(asset).map((one) => one.id));
  const attestations = attestationsOn([...on, ...worksOf(asset).map((one) => one.id), asset.id]);
  const attestationOf = (credit: string) => ATTESTATIONS.find((one) => one.subject.kind === "Credit" && one.subject.id === credit);
  const creditColumns = [
    { name: "Role", value: (one: (typeof credits)[number]) => one.role, cell: (one: (typeof credits)[number]) => one.role },
    { name: "Credited as", value: (one: (typeof credits)[number]) => one.credited, cell: (one: (typeof credits)[number]) => one.credited },
    ...(asset.kind === "Recording" ? [] : [{ name: "On", value: (one: (typeof credits)[number]) => assetById(one.assetId).title, cell: (one: (typeof credits)[number]) => assetById(one.assetId).title }]),
    { name: "State", value: (one: (typeof credits)[number]) => one.state, cell: (one: (typeof credits)[number]) => <Badge status={`credit:${one.state}`} /> },
    {
      name: "Attestation",
      value: (one: (typeof credits)[number]) => attestationOf(one.id)?.state ?? "",
      cell: (one: (typeof credits)[number]) => {
        const signed = attestationOf(one.id);
        return signed ? <Badge status={`attestation:${signed.state}`} /> : null;
      },
    },
  ];
  return (
    <Sections>
      <TitledSection title="Contributions">
        <RecordIndex
          rows={credits}
          rowKey={(one) => one.id}
          noun={{ one: "credit", many: "credits" }}
          identity={{ title: "Contributor", name: (one) => partyName(one.partyId) }}
          columns={creditColumns}
          // Asking the artist to confirm is a request into their app (S3-3) — not wired here.
          commands={(one) => (one.state === "To confirm" ? [{ label: "Request confirmation" }] : [])}
          chooser={false}
          empty={{ holder: "this record", line: true }}
        />
      </TitledSection>
      {asset.kind === "Release" ? null : (
        <TitledSection title="Writers, on the linked work">
          <RecordIndex
            rows={writers}
            rowKey={(one) => one.id}
            noun={{ one: "writer", many: "writers" }}
            identity={{ title: "Writer", name: (one) => partyName(one.partyId) }}
            columns={[
              { name: "Role", value: (one) => one.role, cell: (one) => one.role },
              { name: "Work", value: (one) => assetById(one.assetId).title, cell: (one) => assetById(one.assetId).title },
              { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`credit:${one.state}`} /> },
            ]}
            chooser={false}
            empty={worksOf(asset).length ? { holder: "the linked work", line: true } : { none: "No work is linked, so no writer is credited.", line: true }}
          />
        </TitledSection>
      )}
      <TitledSection title="Attestations">
        <RecordIndex
          rows={attestations}
          rowKey={(one) => one.id}
          noun={{ one: "attestation", many: "attestations" }}
          identity={{ title: "Claim", name: (one) => one.claim }}
          columns={[
            { name: "About", value: (one) => subjectWords(one.subject), cell: (one) => subjectWords(one.subject) },
            // G-5: who signed, on whose behalf, under what.
            {
              name: "Attested by",
              value: (one) => partyName(one.attestor),
              cell: (one) => (one.onBehalfOf ? `${partyName(one.attestor)} for ${partyName(one.onBehalfOf)}` : partyName(one.attestor)),
            },
            { name: "Authority", value: (one) => one.authority ?? "", cell: (one) => one.authority },
            { name: "Assurance", value: (one) => one.assurance, cell: (one) => one.assurance },
            { name: "Issued", as: "date", grain: "minute", value: (one) => one.issued },
            { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`attestation:${one.state}`} /> },
          ]}
          chooser={false}
          empty={{ holder: "this record", line: true }}
        />
      </TitledSection>
    </Sections>
  );
}

/**
 * What changed, newest first: every claim added, corrected or withdrawn on what the record holds —
 * the replaced claim kept beside its correction — and every grant decided and conflict opened or
 * resolved, each with who did it (G-5).
 */
function AssetHistory({ asset }: { asset: Asset }) {
  return (
    <RecordIndex
      rows={historyOf(asset)}
      rowKey={(one) => one.id}
      noun={{ one: "event", many: "events" }}
      identity={{ title: "Event", name: (one) => one.name }}
      sort={{ column: "When", direction: "descending" }}
      columns={[
        { name: "What", value: (one) => one.what, cell: (one) => one.what },
        { name: "By", value: (one) => one.who, cell: (one) => one.who },
        { name: "Replaces", value: (one) => one.replaces ?? "", cell: (one) => one.replaces },
        { name: "When", as: "date", value: (one) => one.at },
        { name: "State", value: (one) => one.status ?? "", cell: (one) => (one.status ? <Badge status={one.status} /> : null) },
      ]}
      readings={[
        { name: "All", holds: () => true },
        { name: "Claims", holds: (one) => one.name.startsWith("Claim") },
        { name: "Decisions", holds: (one) => !one.name.startsWith("Claim") },
      ]}
      chooser={false}
      empty={{ holder: "this record", line: true }}
    />
  );
}

/** The record's facets — a release's Rights is its tracks' — and the way back to its index. */
function assetNav(asset: Asset, facet: Facet): RecordNavProps<Facet> {
  return {
    back: { index: INDEX[asset.kind], opens: proHref("catalog", SEGMENT[asset.kind]) },
    facets: FACETS,
    at: facet,
    addressOf: (one) => facetHref(asset, one),
  };
}

/** Where one record's page is: its facets, and a trail that reaches past the index to it. */
export const assetPlace = (id: string, facet: Facet): ShellPlace => {
  const asset = ASSETS.find((one) => one.id === id);
  if (!asset) return { at: "Catalog", page: "Tracks" };
  return {
    at: "Catalog",
    page: INDEX[asset.kind],
    record: assetNav(asset, facet),
    trail: [
      { label: "Catalog", opens: proHref("catalog", "tracks") },
      { label: INDEX[asset.kind], opens: proHref("catalog", SEGMENT[asset.kind]) },
      { label: asset.title },
    ],
  };
};
