import { useMemo, type ReactNode } from "react";
import {
  Alert,
  Avatar,
  Badge,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  FacetCard,
  RecordIndex,
  formatList,
  formatPercent,
  type DetailFacet,
  type RecordNavProps,
  type ShellPlace,
} from "@revelator/pro-ui";

import { assertionsOn, assetById, partyName } from "../../../graph/fixtures";
import { PRECEDENCE, TIERS, type Asset } from "../../../graph/model";
import { recordingsEmbodying, tierOf, useGraph } from "../../../graph/resolve";
import { TerritoryChip, TierChip, partyMark } from "../../../rights/kit";
import { slug } from "../../../route";
import { AddWorkClaim, CorrectClaim, WithdrawClaim, isMine } from "./claim-dialogs";
import {
  ME,
  chainOf,
  conventionOf,
  countryName,
  flagRegistrations,
  meta,
  myClaims,
  myConflicts,
  myShare,
  registrationsOf,
  rightsHref,
  shareLines,
  territoriesOf,
  territoryReading,
  trackRightsHref,
  writersOf,
  type ShareLine,
} from "./data";
import { workMark } from "./works";

export const WORK_FACETS = ["Overview", "Shares", "Writers", "Chain of title", "Recordings", "Claims", "Registrations"] as const;
export type WorkFacet = (typeof WORK_FACETS)[number];

/** A work's facet, read off its address segment. */
export const workFacetOf = (segment?: string): WorkFacet => WORK_FACETS.find((one) => slug(one) === segment) ?? "Overview";
export const workHref = (id: string, facet: WorkFacet = "Overview") => rightsHref("works", id, facet === "Overview" ? undefined : slug(facet));

const sources = (line: ShareLine) => formatList([...new Set(line.claims.map((one) => one.source))]) ?? "";

/** The shares' standing, as a state: the claims agree, or a conflict is open there. */
const lineState = (line: ShareLine) => (line.state === "Whole" ? <Badge status="claim:Resolved" /> : <Badge status="conflict:Open" />);

/** What the territory reading says — the claims agree everywhere, or where they do not. */
function readingOf(work: Asset) {
  const reading = territoryReading(work);
  if (reading.inSync) return { inSync: true, says: "In sync in all territories" };
  const where = reading.out.map(({ country, totals, conflict }) => {
    const off = totals.filter((one) => one.state !== "Whole").map((one) => meta(`${one.shareType} share`, formatPercent(one.total)));
    const claimed = conflict?.total !== undefined ? [meta(`${conflict.kind} claimed`, formatPercent(conflict.total))] : [];
    return `${countryName(country)} (${formatList(off.length ? off : claimed) ?? conflict?.kind ?? ""})`;
  });
  return { inSync: false, says: `Out of sync in ${formatList(where)}` };
}

/**
 * One work, as Harbor Music reads it (S2-1, S2-2): its writers and their IPIs, the chain of title
 * hop by hop, the shares by right type and territory — the writer line and the publisher line
 * apart, the society's convention beside each — the recordings that embody it, and every claim on
 * it with its source and tier.
 *
 * The band says WHICH work and what it earns; every facet is a page of its own. Harbor never edits
 * the work's owners: it adds, corrects or withdraws its OWN claim (G-1), from the band or the row.
 */
export function WorkDetail({ id, facet }: { id: string; facet: WorkFacet }) {
  useGraph();
  const work = assetById(id);
  const tier = tierOf(work.id);
  const conflict = myConflicts().find((one) => one.assetId === work.id && one.state !== "Resolved");
  const main = myClaims(work.id).find((one) => isMine(one) && one.interests.includes("Owns"));

  const FACETS: Record<WorkFacet, { header?: DetailFacet; body: ReactNode }> = {
    Overview: { body: <WorkOverview work={work} /> },
    Shares: { header: { name: "Shares" }, body: <WorkShares work={work} /> },
    Writers: { header: { name: "Writers" }, body: <WorkWriters work={work} /> },
    "Chain of title": { header: { name: "Chain of title" }, body: <WorkChain work={work} /> },
    Recordings: {
      header: { name: "Recordings", actions: [{ label: "Link a recording", opens: rightsHref("recordings-to-link") }] },
      body: <WorkRecordings work={work} />,
    },
    Claims: {
      header: { name: "Claims", actions: [{ label: "Add claim", creates: true, dialog: <AddWorkClaim workId={work.id} /> }] },
      body: <WorkClaims work={work} />,
    },
    Registrations: {
      header: { name: "Registrations", actions: [{ label: "Generate CWR", opens: rightsHref("registrations") }] },
      body: <WorkRegistrations work={work} />,
    },
  };
  const shown = FACETS[facet];

  return (
    <DetailPage
      record={{
        mark: workMark(work),
        name: work.title,
        kind: "Work",
        status: conflict ? `conflict:${conflict.state}` : undefined,
        facts: [
          work.iswc ? { identifier: work.iswc, standard: "iswc" } : { text: "ISWC pending" },
          { as: "money", value: work.revenue, label: "Revenue" },
          { text: `T${tier} ${TIERS[tier].name}` },
        ],
        actions: [
          main
            ? { label: "Correct my claim", primary: true, dialog: <CorrectClaim claim={main} /> }
            : { label: "Add claim", primary: true, dialog: <AddWorkClaim workId={work.id} /> },
        ],
        more: [
          ...(main ? [{ label: "Add claim", dialog: <AddWorkClaim workId={work.id} /> }, { label: "Withdraw my claim", destructive: true, dialog: <WithdrawClaim claim={main} /> }] : []),
          ...(conflict ? [{ label: "Open conflict", opens: rightsHref("conflicts", conflict.id) }] : []),
          { label: "Generate CWR", opens: rightsHref("registrations") },
        ],
      }}
      facet={shown.header}
    >
      {shown.body}
    </DetailPage>
  );
}

/** The recap: one tile per facet, each with what it comes to and the way into it. */
function WorkOverview({ work }: { work: Asset }) {
  const writers = writersOf(work.id);
  const chain = chainOf(work.id);
  const linked = recordingsEmbodying(work.id);
  const claims = assertionsOn(work.id);
  const registered = registrationsOf(work.id);
  const reading = readingOf(work);
  return (
    <DetailOverview>
      <DetailOverviewGrid>
        <FacetCard
          title="Shares"
          opens={workHref(work.id, "Shares")}
          facts={[
            { label: "Territories", value: reading.says },
            { label: "Harbor's share", as: "percent", value: myShare(work.id) },
          ]}
        />
        <FacetCard
          title="Writers"
          count={writers.length}
          opens={workHref(work.id, "Writers")}
          figures={[
            { label: "Confirmed", as: "count", value: writers.filter((one) => one.credit === "Confirmed").length },
            { label: "To confirm", as: "count", value: writers.filter((one) => one.credit === "To confirm").length },
          ]}
        />
        <FacetCard
          title="Chain of title"
          count={chain.length}
          opens={workHref(work.id, "Chain of title")}
          hint="Writer to publisher to sub-publisher to collector, each hop with its agreement."
          figures={[
            { label: "Publishers", as: "count", value: chain.filter((one) => one.role !== "Collector").length },
            { label: "Without an agreement", as: "count", value: chain.filter((one) => one.role !== "Collector" && !one.agreement).length },
          ]}
        />
        <FacetCard
          title="Recordings"
          count={linked.length}
          opens={workHref(work.id, "Recordings")}
          figures={[{ label: "Recording revenue", as: "money", value: linked.reduce((sum, one) => sum + one.revenue, 0) }]}
        />
        <FacetCard
          title="Claims"
          count={claims.length}
          opens={workHref(work.id, "Claims")}
          figures={[
            { label: "Standing", as: "count", value: claims.filter((one) => one.state === "Resolved").length },
            {
              label: "Contested",
              as: "count",
              value: claims.filter((one) => one.state === "Contested").length,
              marks: claims.some((one) => one.state === "Contested") ? [{ intent: "danger", label: "Contested claims" }] : undefined,
            },
          ]}
        />
        <FacetCard
          title="Registrations"
          count={registered.length}
          opens={workHref(work.id, "Registrations")}
          figures={[
            { label: "Acknowledged", as: "count", value: registered.filter((one) => one.state === "Acknowledged").length },
            { label: "Missing", as: "count", value: registered.filter((one) => one.state === "Missing").length },
          ]}
        />
      </DetailOverviewGrid>
    </DetailOverview>
  );
}

/**
 * The shares by right type and territory (S2-2): for each territory a reading, and in it the
 * WRITER line and the PUBLISHER line apart, per right — who holds what, from which source, who
 * collects it there, and the society convention the split follows. The totals are the resolver's.
 */
function WorkShares({ work }: { work: Asset }) {
  const version = useGraph();
  const countries = territoriesOf(work);
  // The SAME rows until the graph changes: the index lets go of what is held when its rows do.
  const rows = useMemo(() => countries.flatMap((country) => shareLines(work.id, country)), [work.id, version, countries.join()]);
  const reading = readingOf(work);
  return (
    <RecordIndex
      rows={rows}
      rowKey={(one) => one.key}
      noun={{ one: "share line", many: "share lines" }}
      identity={{ title: "Share", name: (one) => `${one.shareType} share`, plain: true }}
      note={
        reading.inSync ? (
          <Alert intent="success" title="In sync in all territories">
            Writer and publisher shares total 100% in every territory this work is read in.
          </Alert>
        ) : (
          <Alert intent="danger" title="Out of sync">
            {`${reading.says}. The resolver keeps paying on the claims that stood before until it is resolved.`}
          </Alert>
        )
      }
      columns={[
        { name: "Right", value: (one) => one.right, cell: (one) => one.right },
        {
          name: "Holders",
          as: "entities",
          noun: { one: "holder", many: "holders" },
          entity: "party",
          value: (one) => one.claims.map((claim) => ({ name: partyName(claim.partyId), detail: meta(formatPercent(claim.share), claim.source) })),
        },
        { name: "Total", as: "percent", value: (one) => one.total },
        { name: "Resolution", value: (one) => one.state, cell: lineState },
        { name: "Collected by", as: "entities", noun: { one: "collector", many: "collectors" }, entity: "organization", value: (one) => one.collectors },
        {
          name: "Society convention",
          value: (one) => conventionOf(one.country, one.right).society,
          cell: (one) => {
            const convention = conventionOf(one.country, one.right);
            return `${convention.society}: ${convention.rule}`;
          },
        },
        { name: "Source", value: sources, cell: sources },
        { name: "Tier", value: () => tierOf(work.id), cell: () => <TierChip tier={tierOf(work.id)} /> },
      ]}
      // TERRITORY BY TERRITORY: each a reading, so the two lines of one right are read side by side.
      readings={countries.map((country) => ({ name: countryName(country), holds: (one: ShareLine) => one.country === country }))}
      filters={[{ kind: "anyOf", key: "right", label: "Right", options: ["Performance", "Mechanical", "Sync"], of: (one) => one.right }]}
      chooser={false}
      empty={{ holder: "this work", line: true }}
    />
  );
}

/** Who wrote it — each writer's role, IPI, society, share and who publishes them. */
function WorkWriters({ work }: { work: Asset }) {
  return (
    <RecordIndex
      rows={writersOf(work.id)}
      rowKey={(one) => one.partyId}
      noun={{ one: "writer", many: "writers" }}
      identity={{ title: "Writer", name: (one) => one.name, mark: (one) => <Avatar kind="person" name={one.name} /> }}
      columns={[
        { name: "Role", value: (one) => one.role, cell: (one) => one.role },
        { name: "IPI", as: "identifier", standard: "ipi", value: (one) => one.ipi },
        { name: "Society", value: (one) => one.society ?? "", cell: (one) => one.society },
        { name: "Writer share", as: "percent", value: (one) => one.claim?.share },
        {
          name: "Published by",
          value: (one) => (one.publisher ? partyName(one.publisher.partyId) : ""),
          cell: (one) =>
            one.publisher ? meta(partyName(one.publisher.partyId), one.publisher.agreement?.code) : null,
        },
        { name: "Credit", value: (one) => one.credit, cell: (one) => <Badge status={`credit:${one.credit}`} /> },
        { name: "Source", value: (one) => one.claim?.source ?? "", cell: (one) => (one.claim ? meta(one.claim.source, one.claim.sourceRef) : null) },
        { name: "Tier", value: () => tierOf(work.id), cell: () => <TierChip tier={tierOf(work.id)} /> },
      ]}
      chooser={false}
      empty={{ holder: "this work", line: true }}
    />
  );
}

/**
 * The chain of title (S2-1): writer → publisher → sub-publisher → collector, each hop with the
 * agreement behind it, its territory and its dates. Each writer's share is a reading of its own,
 * so one chain is read from end to end.
 */
function WorkChain({ work }: { work: Asset }) {
  const hops = chainOf(work.id);
  const writers = [...new Set(hops.map((one) => one.writer))];
  return (
    <RecordIndex
      rows={hops}
      rowKey={(one) => one.key}
      noun={{ one: "hop", many: "hops" }}
      identity={{
        title: "To",
        name: (one) => one.to,
        mark: (one) => (one.toParty ? partyMark(one.toParty) : <Avatar kind="organization" name={one.to} />),
      }}
      columns={[
        { name: "Hop", value: (one) => one.role, cell: (one) => one.role },
        { name: "From", value: (one) => one.from, cell: (one) => one.from },
        {
          name: "Agreement",
          value: (one) => one.agreement?.code ?? "",
          cell: (one) => (one.agreement ? meta(one.agreement.code, one.agreement.kind) : one.role === "Collector" ? "Society affiliation" : "None on file"),
        },
        { name: "Interest", value: (one) => one.interests.join(", "), cell: (one) => one.interests.join(", ") },
        { name: "Rights", value: (one) => one.rights, cell: (one) => one.rights },
        { name: "Territory", value: (one) => one.territory.include === "World" ? "World" : one.territory.include.join(), cell: (one) => <TerritoryChip set={one.territory} /> },
        { name: "From date", as: "date", value: (one) => one.start },
        { name: "To date", as: "date", value: (one) => one.end },
        { name: "Basis", value: (one) => one.basis ?? "", cell: (one) => one.basis },
        { name: "Source", value: (one) => one.claim?.source ?? "", cell: (one) => (one.claim ? meta(one.claim.source, one.claim.sourceRef) : null) },
        { name: "Tier", value: () => tierOf(work.id), cell: () => <TierChip tier={tierOf(work.id)} /> },
      ]}
      readings={writers.map((writer) => ({ name: writer, holds: (one: (typeof hops)[number]) => one.writer === writer }))}
      chooser={false}
      empty={{ holder: "this work", line: true }}
    />
  );
}

/** The recordings the graph holds as embodying the work — each opens on the catalogue's rights tab. */
function WorkRecordings({ work }: { work: Asset }) {
  return (
    <RecordIndex
      rows={recordingsEmbodying(work.id)}
      rowKey={(one) => one.id}
      noun={{ one: "recording", many: "recordings" }}
      identity={{ title: "Recording", name: (one) => one.title, mark: (one) => <Avatar kind="work" name={one.title} />, opens: (one) => trackRightsHref(one.id) }}
      sort={{ column: "Revenue", direction: "descending" }}
      columns={[
        { name: "Artist", value: (one) => one.artist ?? "", cell: (one) => one.artist },
        { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => one.isrc },
        { name: "Label", value: (one) => partyName(one.labelId ?? ""), cell: (one) => (one.labelId ? partyName(one.labelId) : null) },
        {
          name: "Linked by",
          value: (one) => one.embodies?.find((link) => link.workId === work.id)?.source ?? "",
          cell: (one) => {
            const link = one.embodies?.find((each) => each.workId === work.id);
            return link ? meta(link.source, link.portion) : null;
          },
        },
        { name: "Tier", value: (one) => tierOf(one.id), cell: (one) => <TierChip tier={tierOf(one.id)} /> },
        { name: "Revenue", as: "money", value: (one) => one.revenue },
      ]}
      chooser={false}
      empty={{ holder: "this work", line: true }}
    />
  );
}

/**
 * Every claim on the work, each with its source, precedence and tier — the superseded and the
 * withdrawn kept, so a correction is read as a chain (G-1). Harbor corrects or withdraws its own;
 * another party's claim is answered from Conflicts, never edited.
 */
function WorkClaims({ work }: { work: Asset }) {
  return (
    <RecordIndex
      rows={assertionsOn(work.id)}
      rowKey={(one) => one.id}
      noun={{ one: "claim", many: "claims" }}
      identity={{ title: "Party", name: (one) => partyName(one.partyId), mark: (one) => partyMark(one.partyId) }}
      columns={[
        { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`claim:${one.state}`} /> },
        { name: "Interest", value: (one) => one.interests.join(", "), cell: (one) => one.interests.join(", ") },
        { name: "Share type", value: (one) => one.shareType, cell: (one) => one.shareType },
        { name: "Share", as: "percent", value: (one) => one.share },
        { name: "Of", value: (one) => one.shareOf ?? "", cell: (one) => one.shareOf },
        { name: "Rights", value: (one) => (typeof one.rights === "string" ? one.rights : one.rights.join(", ")), cell: (one) => (typeof one.rights === "string" ? one.rights : one.rights.join(", ")) },
        { name: "Territory", value: (one) => (one.territory.include === "World" ? "World" : one.territory.include.join()), cell: (one) => <TerritoryChip set={one.territory} /> },
        { name: "Valid from", as: "date", value: (one) => one.from },
        { name: "Valid to", as: "date", value: (one) => one.to },
        { name: "Source", value: (one) => PRECEDENCE[one.source], cell: (one) => one.source },
        { name: "Reference", value: (one) => one.sourceRef, cell: (one) => one.sourceRef },
        { name: "Known since", as: "date", value: (one) => one.known },
        { name: "Tier", value: () => tierOf(work.id), cell: () => <TierChip tier={tierOf(work.id)} /> },
      ]}
      readings={[
        { name: "Standing", holds: (one) => one.state !== "Superseded" && one.state !== "Withdrawn" },
        { name: "Harbor Music's", holds: (one) => one.partyId === ME },
        { name: "History", holds: (one) => one.state === "Superseded" || one.state === "Withdrawn" },
      ]}
      commands={(one) =>
        isMine(one)
          ? [
              { label: "Correct", dialog: <CorrectClaim claim={one} /> },
              { label: "Withdraw", destructive: true, dialog: <WithdrawClaim claim={one} /> },
            ]
          : [
              {
                label: "Correct",
                unavailable:
                  one.partyId === ME ? "This claim was already corrected or withdrawn." : `Only ${partyName(one.partyId)} corrects its own claim. Answer it from Conflicts.`,
              },
            ]
      }
      chooser={false}
      empty={{ holder: "this work", line: true }}
    />
  );
}

/** Where the work is registered, society by society — a missing one can go in the next CWR file. */
function WorkRegistrations({ work }: { work: Asset }) {
  return (
    <RecordIndex
      rows={registrationsOf(work.id)}
      rowKey={(one) => one.id}
      noun={{ one: "registration", many: "registrations" }}
      identity={{ title: "Society", name: (one) => one.society, mark: (one) => <Avatar kind="organization" name={one.society} /> }}
      columns={[
        { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`registration:${one.state}`} /> },
        { name: "Next CWR", value: (one) => (one.flagged ? 1 : 0), cell: (one) => (one.flagged ? "Included" : null) },
        { name: "File", value: (one) => one.file ?? "", cell: (one) => one.file },
        { name: "Sent", as: "date", value: (one) => one.sent },
        { name: "Acknowledged", as: "date", value: (one) => one.acknowledged },
        { name: "Work number", value: (one) => one.workNumber ?? "", cell: (one) => one.workNumber },
        { name: "Note", value: (one) => one.reason ?? "", cell: (one) => one.reason },
      ]}
      commands={(one) => [
        one.state === "Acknowledged" || one.state === "Sent"
          ? { label: "Include in next CWR", unavailable: one.state === "Sent" ? "Sent already; waiting on the society's acknowledgement." : "Acknowledged: nothing to send." }
          : one.flagged
            ? { label: "Leave out of next CWR", opens: () => flagRegistrations([one.id], false) }
            : { label: "Include in next CWR", opens: () => flagRegistrations([one.id], true) },
      ]}
      chooser={false}
      empty={{ holder: "this work", line: true }}
    />
  );
}

/** The work's facets, and the way back to the works. */
function workNav({ id, facet }: { id: string; facet: WorkFacet }): RecordNavProps<WorkFacet> {
  return {
    back: { index: "Works", opens: rightsHref("works") },
    facets: WORK_FACETS,
    at: facet,
    addressOf: (one) => workHref(id, one),
  };
}

/** Where one work's page is: its facets, and a trail that reaches past the index to it. */
export const workPlace = ({ id, facet }: { id: string; facet: WorkFacet }): ShellPlace => ({
  at: "Rights",
  page: assetById(id).title,
  record: workNav({ id, facet }),
  trail: [
    { label: "Rights", opens: rightsHref("overview") },
    { label: "Works", opens: rightsHref("works") },
    { label: assetById(id).title },
  ],
});
