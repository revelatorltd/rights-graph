import type { ReactNode } from "react";
import {
  Alert,
  Badge,
  CollectionPage,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  FacetCard,
  FactCard,
  Link,
  Metadata,
  RecordIndex,
  formatMeta,
  formatRate,
  type DetailFacet,
  type ShellPlace,
} from "@revelator/pro-ui";

import { ASSERTIONS, ASSETS, CONFLICTS, assetById, partyName } from "../../graph/fixtures";
import { PRECEDENCE, USES } from "../../graph/model";
import type { Assertion, Asset, AssetKind, Side } from "../../graph/model";
import {
  GRAPH_VERSION,
  RULE_VERSION,
  claimsBehind,
  clearanceOf,
  controllers,
  shareTotals,
  standing,
  tierOf,
  worksOf,
  type Answer,
} from "../../graph/resolve";
import { ClearanceBadge, TerritoryChip, TierChip, decidedBy, partyMark } from "../../rights/kit";
import type { Shown } from "../surface";
import { territoriesOn } from "./data";
import { assetMark } from "./marks";
import { consoleHref, facetOf } from "./where";

const KINDS: readonly AssetKind[] = ["Recording", "Work", "Video", "Release"];
const ANSWERS: readonly Answer[] = ["Granted", "Needs review", "Denied"];
const CLAIM_STATES: readonly Assertion["state"][] = ["Resolved", "Contested", "No authority", "Superseded", "Withdrawn"];

export const ASSET_FACETS = ["Overview", "Resolved", "Claims", "Clearance", "Conflicts"] as const;
type AssetFacet = (typeof ASSET_FACETS)[number];

/** Every claim that bears on an asset — its own, and on the works it embodies (the composition side). */
const claimsOn = (asset: Asset) => {
  const ids = new Set([asset.id, ...worksOf(asset).map((one) => one.id)]);
  return ASSERTIONS.filter((one) => ids.has(one.assetId));
};

/** The sides an asset is read on, master first — a work has no master, so it is read on one. */
const sidesOf = (asset: Asset): Side[] => (asset.kind === "Work" ? ["Composition"] : ["Master", "Composition"]);

const rightsOf = (claim: Assertion) => (typeof claim.rights === "string" ? [claim.rights] : [...claim.rights]);

/** What a claim says, as one name — the party, its interest and its share. */
const claimName = (claim: Assertion) =>
  formatMeta([partyName(claim.partyId), claim.interests.join(" and "), `${formatRate(claim.share)} ${claim.shareType.toLowerCase()}`]) ?? claim.id;

/**
 * Every asset in the graph — what the inspector opens on. The graph holds four kinds and never
 * mixes them up: a release packages, a recording and a video hold the master, a work the
 * composition.
 */
export function AssetsPage(): Shown {
  return {
    place: { at: "Resolution", page: "Assets" },
    page: (
      <CollectionPage
        title="Assets"
        index={{
          rows: ASSETS,
          rowKey: (one) => one.id,
          noun: { one: "asset", many: "assets" },
          identity: {
            title: "Asset",
            name: (one) => one.title,
            mark: (one) => assetMark(one),
            opens: (one) => consoleHref("assets", one.id),
          },
          searchBy: ["Asset", "Artist", "ISRC", "ISWC"],
          columns: [
            { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind, readings: ["All"] },
            { name: "Artist", value: (one) => one.artist ?? "", cell: (one) => one.artist ?? "" },
            { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => one.isrc },
            { name: "ISWC", as: "identifier", standard: "iswc", value: (one) => one.iswc },
            { name: "Tier", value: (one) => tierOf(one.id), cell: (one) => <TierChip tier={tierOf(one.id)} /> },
            { name: "Revenue, 12 months", as: "money", value: (one) => one.revenue },
            { name: "Claims", as: "count", value: (one) => claimsOn(one).length },
            {
              name: "Open conflicts",
              as: "count",
              value: (one) => CONFLICTS.filter((each) => each.assetId === one.id && each.state !== "Resolved").length,
            },
          ],
          readings: [
            { name: "All", holds: () => true },
            ...KINDS.map((kind) => ({ name: `${kind}s`, holds: (one: Asset) => one.kind === kind })),
          ],
          totals: [{ count: true }, { name: "Revenue, 12 months", sum: (one) => one.revenue, as: "money" }],
          commands: (one) => [{ label: "Inspect", mark: "rights", opens: consoleHref("assets", one.id) }],
        }}
      />
    ),
  };
}

/**
 * One asset in the inspector (S7-5): every claim on it, the resolved view, and WHY. Every resolved
 * value names its winning claims — each a link to the claim — and the rule version that picked
 * them; every claim carries its source's precedence; clearance is read use by use.
 */
export function AssetPage(id: string, written: string | undefined): Shown {
  const asset = ASSETS.find((one) => one.id === id);
  if (!asset)
    return {
      place: { at: "Resolution", page: "Assets" },
      page: (
        <Alert intent="danger" title="No such asset">
          {`The graph holds no asset ${id}.`}
        </Alert>
      ),
    };
  const facet = facetOf(ASSET_FACETS, written);
  return { place: assetPlace(asset, facet), page: <AssetDetail key={id} asset={asset} facet={facet} /> };
}

function AssetDetail({ asset, facet }: { asset: Asset; facet: AssetFacet }) {
  const FACETS: Record<AssetFacet, { header?: DetailFacet; body: ReactNode }> = {
    Overview: { body: <AssetOverview asset={asset} /> },
    Resolved: { header: { name: "Resolved" }, body: <AssetResolved asset={asset} /> },
    Claims: { header: { name: "Claims" }, body: <AssetClaims asset={asset} /> },
    Clearance: { header: { name: "Clearance" }, body: <AssetClearance asset={asset} /> },
    Conflicts: { header: { name: "Conflicts" }, body: <AssetConflicts asset={asset} /> },
  };
  const shown = FACETS[facet];
  const code = asset.isrc
    ? { identifier: asset.isrc, standard: "isrc" as const }
    : asset.iswc
      ? { identifier: asset.iswc, standard: "iswc" as const }
      : asset.upc
        ? { identifier: asset.upc, standard: "upc" as const }
        : { identifier: asset.id, standard: "id" as const };
  return (
    <DetailPage
      record={{
        mark: assetMark(asset),
        name: asset.title,
        marks: <TierChip tier={tierOf(asset.id)} />,
        kind: asset.kind,
        facts: [code, ...(asset.artist ? [{ text: asset.artist }] : []), { as: "money" as const, value: asset.revenue, label: "Last 12 months" }],
        more: [{ label: "Open in conflicts", opens: consoleHref("assets", asset.id, "Conflicts") }],
      }}
      facet={shown.header}
    >
      {shown.body}
    </DetailPage>
  );
}

/** What the graph holds as of now, and since when it knew — the two clocks every claim keeps. */
function Bitemporal() {
  return (
    <Alert intent="info" title="Read as of today">
      {`Resolved under ${RULE_VERSION} on graph ${GRAPH_VERSION}. A claim keeps when it holds (valid from, to) apart from when the graph learned it (known since); a correction supersedes and never overwrites.`}
    </Alert>
  );
}

/**
 * The recap: the two sides apart, master first, then the claims, clearance and conflicts each
 * counted, with the way into each. Read in the US, where every partner's default read is taken.
 */
function AssetOverview({ asset }: { asset: Asset }) {
  const claims = claimsOn(asset);
  const linked = worksOf(asset);
  const answers = USES.map((use) => clearanceOf(asset.id, use).state);
  const conflicts = CONFLICTS.filter((one) => one.assetId === asset.id);
  const masterHeld = asset.kind === "Work" || asset.kind === "Release" ? [] : controllers(asset.id, "Master", "US");
  const publishers = linked.flatMap((work) => controllers(work.id, "Composition", "US"));
  return (
    <DetailOverview>
      <Bitemporal />
      <DetailOverviewGrid>
        <FacetCard
          title="Master"
          opens={consoleHref("assets", asset.id, "Resolved")}
          facts={
            asset.kind === "Work"
              ? [{ label: "Master side", value: "A work holds no master" }]
              : [
                  { label: "Controls in the US", as: "list", value: masterHeld.map((one) => partyName(one.partyId)) },
                  { label: "Tier", value: <TierChip tier={tierOf(asset.id)} /> },
                ]
          }
        />
        <FacetCard
          title="Composition"
          opens={consoleHref("assets", asset.id, "Resolved")}
          facts={[
            linked.length
              ? { label: "Works", as: "list", value: linked.map((one) => one.title) }
              : { label: "Works", value: "No work link — a missing link never defaults to cleared" },
            { label: "Controls in the US", as: "list", value: [...new Set(publishers.map((one) => partyName(one.partyId)))] },
          ]}
        />
        <FacetCard
          title="Claims"
          opens={consoleHref("assets", asset.id, "Claims")}
          figures={[
            { label: "Standing", as: "count", value: claims.filter(standing).length },
            { label: "Superseded or withdrawn", as: "count", value: claims.filter((one) => !standing(one)).length },
          ]}
        />
        <FacetCard
          title="Clearance"
          opens={consoleHref("assets", asset.id, "Clearance")}
          figures={ANSWERS.map((answer) => ({ label: answer, as: "count" as const, value: answers.filter((one) => one === answer).length }))}
        />
        <FacetCard
          title="Conflicts"
          opens={consoleHref("assets", asset.id, "Conflicts")}
          figures={[
            { label: "Open", as: "count", value: conflicts.filter((one) => one.state !== "Resolved").length },
            { label: "Resolved", as: "count", value: conflicts.filter((one) => one.state === "Resolved").length },
          ]}
        />
      </DetailOverviewGrid>
    </DetailOverview>
  );
}

/** One resolved value, in the territories where the graph answers it the same way. */
interface Resolved {
  key: string;
  side: Side;
  /** The asset the value is of — the recording, or the work it embodies. */
  of: Asset;
  value: string;
  territories: string[];
  total?: number;
  reads: string;
  claims: Assertion[];
}

/**
 * The resolved view, territory by territory: each share type's total and whether it over- or
 * under-claims, and who controls — each from `shareTotals` and `controllers`, never from the page.
 * Territories answered alike are read as one row.
 */
function resolvedOf(asset: Asset): Resolved[] {
  const rows = new Map<string, Resolved>();
  const add = (row: Omit<Resolved, "key" | "territories">, territory: string) => {
    const key = [row.side, row.of.id, row.value, row.total, row.reads, ...row.claims.map((one) => one.id)].join("/");
    const held = rows.get(key);
    if (held) held.territories.push(territory);
    else rows.set(key, { ...row, key, territories: [territory] });
  };
  const sides: { side: Side; of: Asset }[] = [
    ...(asset.kind === "Work" || asset.kind === "Release" ? [] : [{ side: "Master" as const, of: asset }]),
    ...worksOf(asset).map((work) => ({ side: "Composition" as const, of: work })),
  ];
  for (const { side, of } of sides) {
    for (const territory of territoriesOn(ASSERTIONS.filter((one) => one.assetId === of.id))) {
      for (const total of shareTotals(of.id, territory)) {
        const counted = claimsBehind(of.id, territory).filter((one) => one.shareType === total.shareType);
        add({ side, of, value: `${total.shareType} share`, total: total.total, reads: total.state, claims: counted }, territory);
      }
      const held = controllers(of.id, side, territory);
      add({ side, of, value: "Control", reads: held.length ? "Controlled" : "No one controls", claims: held }, territory);
    }
  }
  return [...rows.values()];
}

/** A claim, as a way into it — the winning claim a resolved value names. */
const claimLink = (claim: Assertion) => (
  <Link key={claim.id} opens={consoleHref("claims", claim.id)}>
    {claimName(claim)}
  </Link>
);

function AssetResolved({ asset }: { asset: Asset }) {
  const rows = resolvedOf(asset);
  return (
    <RecordIndex
      rows={rows}
      rowKey={(one) => one.key}
      noun={{ one: "resolved value", many: "resolved values" }}
      identity={{ title: "Value", name: (one) => one.value }}
      note={<Bitemporal />}
      columns={[
        { name: "Of", value: (one) => one.of.title, cell: (one) => one.of.title },
        { name: "Territories", value: (one) => one.territories.join(" "), cell: (one) => formatMeta(one.territories) },
        { name: "Total", as: "rate", value: (one) => one.total },
        { name: "Reads", value: (one) => one.reads, cell: (one) => one.reads },
        {
          name: "Winning claims",
          value: (one) => one.claims.length,
          cell: (one) => (one.claims.length ? one.claims.map(claimLink) : null),
        },
        {
          name: "Rule",
          value: (one) => one.claims.map((each) => PRECEDENCE[each.source]).sort()[0] ?? 9,
          cell: (one) =>
            formatMeta([RULE_VERSION, ...[...new Set(one.claims.map((each) => `precedence ${PRECEDENCE[each.source]}`))]]),
        },
      ]}
      // The two sides are two sets, and there is no reading of both at once (G-3).
      readings={sidesOf(asset).map((side) => ({ name: side, holds: (one: Resolved) => one.side === side }))}
      chooser={false}
      empty={{ holder: "this side", line: true }}
    />
  );
}

/**
 * Every claim on the asset — both sides, every source, the superseded and the withdrawn too, which
 * stay on the record and no longer count. Each with the precedence its source holds and when the
 * graph learned it.
 */
function AssetClaims({ asset }: { asset: Asset }) {
  return (
    <RecordIndex
      rows={claimsOn(asset)}
      rowKey={(one) => one.id}
      noun={{ one: "claim", many: "claims" }}
      identity={{
        title: "Party",
        name: (one) => partyName(one.partyId),
        mark: (one) => partyMark(one.partyId),
        opens: (one) => consoleHref("claims", one.id),
      }}
      columns={[
        { name: "State", value: (one) => CLAIM_STATES.indexOf(one.state), cell: (one) => <Badge status={`claim:${one.state}`} /> },
        { name: "Of", value: (one) => assetById(one.assetId).title, cell: (one) => assetById(one.assetId).title },
        { name: "Interest", value: (one) => one.interests.join(" "), cell: (one) => formatMeta([...one.interests]) },
        { name: "Share type", value: (one) => one.shareType, cell: (one) => one.shareType },
        { name: "Share", as: "rate", value: (one) => one.share },
        { name: "Rights", value: (one) => rightsOf(one).join(" "), cell: (one) => formatMeta(rightsOf(one)) },
        { name: "Territory", value: (one) => one.id, cell: (one) => <TerritoryChip set={one.territory} /> },
        { name: "Valid from", as: "date", value: (one) => one.from },
        { name: "Valid to", as: "date", value: (one) => one.to },
        { name: "Known since", as: "date", value: (one) => one.known },
        { name: "Source", value: (one) => one.source, cell: (one) => one.source },
        { name: "Precedence", as: "count", value: (one) => PRECEDENCE[one.source] },
        { name: "Reference", as: "identifier", standard: "id", value: (one) => one.sourceRef },
      ]}
      readings={sidesOf(asset).map((side) => ({ name: side, holds: (one: Assertion) => one.side === side }))}
      filters={[
        { kind: "switches", key: "counting", label: "Counting", switches: [{ key: "standing", label: "Standing claims only", holds: standing }] },
        { kind: "anyOf", key: "state", label: "State", options: CLAIM_STATES, of: (one) => one.state },
      ]}
      chooser={false}
      empty={{ holder: "this side", line: true }}
    />
  );
}

/**
 * Clearance, use by use, as a partner in the US is told it today: the answer, each side's, the
 * scope that decided it, the grant and who made it, and the rule version.
 */
function AssetClearance({ asset }: { asset: Asset }) {
  const rows = USES.map((use) => ({ use, answer: clearanceOf(asset.id, use) }));
  return (
    <RecordIndex
      rows={rows}
      rowKey={(one) => one.use}
      noun={{ one: "use", many: "uses" }}
      identity={{ title: "Use", name: (one) => one.use }}
      note={
        <Alert intent="info" title="Read for a partner in the US, today">
          {`Effective clearance under ${RULE_VERSION}: most specific scope first, deny before grant, and every AI use depends on AI training.`}
        </Alert>
      }
      columns={[
        { name: "Answer", value: (one) => ANSWERS.indexOf(one.answer.state), cell: (one) => <ClearanceBadge state={one.answer.state} /> },
        {
          name: "Master",
          value: (one) => ANSWERS.indexOf(one.answer.master.state),
          cell: (one) => (asset.kind === "Work" ? "No master" : <ClearanceBadge state={one.answer.master.state} />),
        },
        {
          name: "Composition",
          value: (one) => one.answer.composition.length,
          cell: (one) =>
            one.answer.composition.length
              ? one.answer.composition.map((side, index) => <ClearanceBadge key={index} state={side.state} />)
              : "Not touched",
        },
        { name: "Decided at", value: (one) => one.answer.decidedAt, cell: (one) => one.answer.decidedAt },
        {
          name: "Decided by",
          value: (one) => one.answer.master.grant?.id ?? "",
          cell: (one) => (one.answer.master.grant ? decidedBy(one.answer.master.grant.decided) : "The default"),
        },
        { name: "Why", value: (one) => one.answer.reason, cell: (one) => one.answer.reason },
        { name: "Rule", value: () => RULE_VERSION, cell: () => RULE_VERSION },
      ]}
      chooser={false}
    />
  );
}

/** The conflicts raised on the asset, open and resolved. */
function AssetConflicts({ asset }: { asset: Asset }) {
  return (
    <RecordIndex
      rows={CONFLICTS.filter((one) => one.assetId === asset.id)}
      rowKey={(one) => one.id}
      noun={{ one: "conflict", many: "conflicts" }}
      identity={{ title: "Kind", name: (one) => one.kind, opens: (one) => consoleHref("conflicts", one.id) }}
      columns={[
        { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`conflict:${one.state}`} /> },
        { name: "Side", value: (one) => one.side, cell: (one) => one.side },
        { name: "Severity", value: (one) => one.severity, cell: (one) => one.severity },
        { name: "Revenue at risk", as: "money", value: (one) => one.revenueAtRisk },
        { name: "Opened", as: "date", value: (one) => one.opened },
      ]}
      chooser={false}
      empty={{ holder: "this asset", line: true }}
    />
  );
}

function assetPlace(asset: Asset, facet: AssetFacet): ShellPlace {
  return {
    at: "Resolution",
    page: asset.title,
    record: {
      back: { index: "Assets", opens: consoleHref("assets") },
      facets: ASSET_FACETS,
      at: facet,
      addressOf: (one) => consoleHref("assets", asset.id, one === "Overview" ? undefined : one),
    },
    trail: [
      { label: "Resolution", opens: consoleHref("conflicts") },
      { label: "Assets", opens: consoleHref("assets") },
      { label: asset.title },
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// One claim

/**
 * One claim, read in full — what a resolved value links to. What it says, where it came from and
 * the precedence that source holds, and both clocks: when it holds and when the graph learned it.
 * A correction chain reads both ways: what it superseded, and what superseded it.
 */
export function ClaimPage(id: string): Shown {
  const claim = ASSERTIONS.find((one) => one.id === id);
  if (!claim)
    return {
      place: { at: "Resolution", page: "Assets" },
      page: (
        <Alert intent="danger" title="No such claim">
          {`The graph holds no claim ${id}.`}
        </Alert>
      ),
    };
  const asset = assetById(claim.assetId);
  const before = claim.supersedes ? ASSERTIONS.find((one) => one.id === claim.supersedes) : undefined;
  const after = ASSERTIONS.filter((one) => one.supersedes === claim.id);
  const siblings = ASSERTIONS.filter((one) => one.id !== claim.id && one.assetId === claim.assetId && one.partyId === claim.partyId);
  return {
    place: {
      at: "Resolution",
      page: asset.title,
      record: {
        back: { index: asset.title, opens: consoleHref("assets", asset.id, "Claims") },
        facets: ["Details"],
        at: "Details",
        addressOf: () => consoleHref("claims", claim.id),
      },
      trail: [
        { label: "Assets", opens: consoleHref("assets") },
        { label: asset.title, opens: consoleHref("assets", asset.id, "Claims") },
        { label: partyName(claim.partyId) },
      ],
    },
    page: (
      <DetailPage
        record={{
          mark: partyMark(claim.partyId),
          name: claimName(claim),
          kind: `${claim.side} claim`,
          status: `claim:${claim.state}`,
          facts: [{ identifier: claim.id, standard: "id" }, { text: asset.title }],
          more: [{ label: "Open asset inspector", mark: "rights", opens: consoleHref("assets", asset.id) }],
        }}
      >
        <Metadata>
          <Bitemporal />
          <FactCard
            title="What it claims"
            facts={[
              { label: "Asset", value: <Link opens={consoleHref("assets", asset.id)}>{asset.title}</Link> },
              { label: "Interest", as: "list", value: claim.interests },
              { label: "Side", value: claim.side },
              { label: "Share type", value: claim.shareType },
              { label: "Share", as: "rate", value: claim.share },
              ...(claim.shareOf ? [{ label: "Of", value: claim.shareOf }] : []),
              { label: "Rights", as: "list", value: rightsOf(claim) },
              { label: "Territory", value: <TerritoryChip set={claim.territory} /> },
              { label: "Basis", value: claim.basis ?? "At source" },
            ]}
          />
          <FactCard
            title="When"
            facts={[
              { label: "Valid from", as: "date", value: claim.from },
              { label: "Valid to", as: "date", value: claim.to },
              { label: "Known since", as: "date", value: claim.known },
            ]}
          />
          <FactCard
            title="Where it came from"
            facts={[
              { label: "Source", value: claim.source },
              { label: "Precedence", value: `${PRECEDENCE[claim.source]} of 6 under ${RULE_VERSION}` },
              { label: "Reference", value: claim.sourceRef, standard: "id" },
              { label: "Agreement", value: claim.agreementId, standard: "id" },
              { label: "Evidence", as: "list", value: claim.evidence ?? [] },
            ]}
          />
          <FactCard
            title="Corrections"
            facts={[
              { label: "Supersedes", value: before ? claimLink(before) : "Nothing — it is the first" },
              { label: "Superseded by", value: after.length ? after.map(claimLink) : "Nothing — it stands" },
              ...(siblings.length ? [{ label: "Same party's other claims here", value: siblings.map(claimLink) }] : []),
            ]}
          />
        </Metadata>
      </DetailPage>
    ),
  };
}

