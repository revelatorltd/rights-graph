import type { ReactNode } from "react";
import {
  Alert,
  Avatar,
  Badge,
  CollectionPage,
  ConfirmationDialog,
  DetailPage,
  EmptyState,
  FactCard,
  Field,
  FormDialog,
  Metadata,
  RecordIndex,
  Step,
  Stepper,
  TitledCard,
  UploaderDocument,
  UploaderFileRow,
  formatPercent,
  owed,
  unanswered,
  type Command,
  type DetailFacet,
  type HeldBy,
  type ShellPlace,
} from "@revelator/pro-ui";
import { useState } from "react";

import { partyName, ASSERTIONS, assetById, now, updateConflict } from "../../graph/fixtures";
import { COUNTERCLAIM_STEPS, type Conflict } from "../../graph/model";
import { shareTotals, standing, tierOf } from "../../graph/resolve";
import { TerritoryChip, TierChip, decidedBy } from "../../rights/kit";
import type { Shown } from "../surface";
import { contributorHref, facetOf, facetSlug } from "./address";
import { TENANT_ID, correctClaim, levelOf, ownClaimOn, ownConflicts, type OwnClaim } from "./data";

const STATES: readonly Conflict["state"][] = ["Open", "Awaiting evidence", "Resolved"];
const total = (claim: OwnClaim) => claim.shares.reduce((sum, one) => sum + one.share, 0);
/** The other parties to a conflict — never this tenant. */
const othersOf = (one: Conflict) => one.parties.filter((party) => party !== TENANT_ID);

export const conflictHref = (id: string, facet?: ConflictFacet) =>
  contributorHref("conflicts", id, facet && facet !== "Overview" ? facetSlug(facet) : undefined);

/**
 * The conflicts that involve one of the tenant's claims (S5-7). The other party is named and its
 * share totals shown — what its sharing allows — and never its private terms.
 */
export function Conflicts() {
  return (
    <CollectionPage
      title="Conflicts"
      index={{
        rows: ownConflicts(),
        rowKey: (one) => one.id,
        noun: { one: "conflict", many: "conflicts" },
        identity: {
          title: "Asset",
          name: (one) => assetById(one.assetId).title,
          mark: () => <Avatar kind="work" name="Work" />,
          opens: (one) => conflictHref(one.id),
        },
        note: (
          <Alert intent="info" title="Only what their sharing allows">
            You see that another party claims the same asset, and its share totals — never its private terms. It sees your claim the same way, through your own sharing. Sureel ops resolves; you respond.
          </Alert>
        ),
        columns: [
          { name: "State", value: (one) => STATES.indexOf(one.state), cell: (one) => <Badge status={`conflict:${one.state}`} />, readings: ["All"] },
          { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
          { name: "Side", value: (one) => one.side, cell: (one) => one.side },
          { name: "Share total", as: "percent", value: (one) => one.total },
          { name: "With", value: (one) => othersOf(one).map(partyName).join(", "), cell: (one) => othersOf(one).map(partyName).join(", ") },
          { name: "Territories", value: (one) => one.territories.length, cell: (one) => <TerritoryChip set={{ include: one.territories }} /> },
          { name: "Revenue at risk", as: "money", value: (one) => one.revenueAtRisk },
          { name: "Opened", as: "date", value: (one) => one.opened },
        ],
        readings: [
          { name: "Open", holds: (one) => one.state !== "Resolved" },
          { name: "Resolved", holds: (one) => one.state === "Resolved" },
          { name: "All", holds: () => true },
        ],
        commands: (one) => [{ label: "Open", opens: conflictHref(one.id) }],
        empty: { none: "No claim of yours disagrees with another party's.", mark: "success" },
      }}
    />
  );
}

export const CONFLICT_FACETS = ["Overview", "Share totals"] as const;
export type ConflictFacet = (typeof CONFLICT_FACETS)[number];

/** `conflicts` — the index; `conflicts/<id>/<facet>` — one conflict. */
export function ConflictPage([id, segment]: readonly string[]): Shown {
  if (!id) return { place: { at: "Matching", page: "Conflicts" }, page: <Conflicts /> };
  const conflict = ownConflicts().find((one) => one.id === id);
  if (!conflict)
    return {
      place: { at: "Matching", page: "Conflicts" },
      // PERMISSION-DENIED, not missing: a conflict that holds no claim of this tenant's is not its to read.
      page: <EmptyState title="Not a conflict on your claims" detail="You can open a conflict only where one of the claims in it is yours." mark="locker" />,
    };
  const facet = facetOf(CONFLICT_FACETS, segment);
  return { place: conflictPlace(conflict, facet), page: <ConflictDetail key={conflict.id} conflict={conflict} facet={facet} /> };
}

/**
 * One conflict on the tenant's claim: the claims side by side — the tenant's in full, the other
 * party's to the extent its sharing allows — the totals against 100%, and how far it has come.
 * The tenant RESPONDS — evidence, a correction, a withdrawal — and Sureel ops resolves.
 */
function ConflictDetail({ conflict, facet }: { conflict: Conflict; facet: ConflictFacet }) {
  const asset = assetById(conflict.assetId);
  const resolved = conflict.state === "Resolved";
  const claim = ownClaimOn(conflict.id);
  const closed = "It is resolved: nothing is left to respond to.";
  const more: Command[] = [
    resolved || !claim
      ? { label: "Correct your claim", unavailable: resolved ? closed : "No claim of yours is on record here." }
      : { label: "Correct your claim", mark: "edit", dialog: <CorrectClaim conflict={conflict} claim={claim} /> },
    resolved
      ? { label: "Withdraw your claim", destructive: true, unavailable: closed }
      : { label: "Withdraw your claim", destructive: true, dialog: <WithdrawClaim conflict={conflict} /> },
    // PERMISSION-DENIED, said where it is looked for: a contributor responds; ops resolves.
    { label: "Resolve", unavailable: "Only Sureel ops resolves a conflict. You respond with evidence, or correct or withdraw your claim." },
    {
      label: `Read ${othersOf(conflict).map(partyName).join(", ")}'s agreement`,
      unavailable: "Private to its party. No tenant reads it, WMG included; Sureel only under a logged audit request.",
    },
  ];
  const FACETS: Record<ConflictFacet, { header?: DetailFacet; body: ReactNode }> = {
    Overview: { body: <ConflictOverview conflict={conflict} claim={claim} /> },
    "Share totals": { header: { name: "Share totals" }, body: <ShareTotals conflict={conflict} claim={claim} /> },
  };
  const shown = FACETS[facet];
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="work" name={asset.title} />,
        name: asset.title,
        kind: conflict.kind,
        status: `conflict:${conflict.state}`,
        facts: [
          { identifier: asset.iswc ?? asset.id, standard: asset.iswc ? "iswc" : "id" },
          // The SIDE, beside the name: composition and recording never share a figure (G-3).
          { text: `${conflict.side} side` },
          ...(conflict.total !== undefined ? [{ as: "percent" as const, value: conflict.total, label: "Total" }] : []),
          { as: "date", value: conflict.opened, label: "Opened" },
        ],
        actions: resolved ? [] : [{ label: "Upload evidence", mark: "upload", primary: true, dialog: <UploadEvidence conflict={conflict} /> }],
        more,
      }}
      facet={shown.header}
    >
      {shown.body}
    </DetailPage>
  );
}

/** The other party's standing claims on the asset — read for its share totals and its shape only. */
const theirClaims = (conflict: Conflict) =>
  ASSERTIONS.filter((one) => one.assetId === conflict.assetId && othersOf(conflict).includes(one.partyId) && standing(one));

function ConflictOverview({ conflict, claim }: { conflict: Conflict; claim?: OwnClaim }) {
  const theirs = theirClaims(conflict);
  const lead = theirs[0];
  const country = conflict.territories[0] ?? "World";
  const resolvedTotals = shareTotals(conflict.assetId, country);
  const writer = resolvedTotals.find((one) => one.shareType === "Writer");
  return (
    <Metadata>
      {conflict.state === "Resolved" && conflict.resolution ? (
        <Alert intent="success" title="Resolved">
          {conflict.resolution.reason}
        </Alert>
      ) : (
        <Alert intent="warn" title="Held while Sureel ops decides">
          {`${conflict.interim} Raised by ${conflict.raisedBy}. Your claim is held, not lost: respond with evidence, or correct or withdraw it.`}
        </Alert>
      )}
      <TitledCard title="Where it stands">
        <Stepper>
          {COUNTERCLAIM_STEPS.map((label, at) => (
            <Step key={label} index={at + 1} label={label} state={at < conflict.step || conflict.state === "Resolved" ? "done" : at === conflict.step ? "current" : "todo"} />
          ))}
        </Stepper>
      </TitledCard>
      {claim ? (
        <FactCard
          title="Your claim"
          trail={<TierChip tier={claim.tier} />}
          facts={[
            { label: "Side", value: conflict.side },
            { label: "Writer shares", as: "list", value: claim.shares.map((one) => `${one.writer} ${formatPercent(one.share)}`) },
            { label: "Total", as: "percent", value: total(claim) },
            { label: "Territory", value: <TerritoryChip set={claim.territory} /> },
            { label: "From", as: "date", value: claim.from },
            { label: "Source", value: claim.source },
            { label: "Your agreement reference", value: claim.agreement },
            {
              label: "What the other party sees of it",
              value: `Its share totals and territories (${levelOf("Ownership share totals")}); your agreement reference is ${levelOf("Agreement references").toLowerCase()}.`,
            },
          ]}
        />
      ) : null}
      {lead ? (
        <FactCard
          title={`${partyName(lead.partyId)}'s claim, as its sharing allows`}
          trail={<TierChip tier={tierOf(conflict.assetId)} />}
          facts={[
            { label: "Party", value: partyName(lead.partyId) },
            { label: "Interest", as: "list", value: [...new Set(theirs.flatMap((one) => one.interests))] },
            { label: "Side", value: lead.side },
            { label: "Writer shares, resolved", as: "percent", value: writer?.total },
            { label: "Territory", value: <TerritoryChip set={lead.territory} /> },
            { label: "From", as: "date", value: lead.from },
            { label: "To", as: "date", value: lead.to },
            { label: "Source", value: lead.source },
            { label: "Agreement and terms", value: `Private to ${partyName(lead.partyId)}` },
          ]}
        />
      ) : null}
      {conflict.resolution ? (
        <FactCard
          title="Resolution"
          facts={[
            { label: "Decided", value: decidedBy(conflict.resolution) },
            { label: "Reason", value: conflict.resolution.reason },
            { label: "Rule", value: conflict.resolution.rule },
          ]}
        />
      ) : null}
    </Metadata>
  );
}

/** The totals against 100%, territory by territory — what the graph holds beside what the tenant claims. */
function ShareTotals({ conflict, claim }: { conflict: Conflict; claim?: OwnClaim }) {
  const rows = conflict.territories.map((country) => {
    const held = shareTotals(conflict.assetId, country).find((one) => one.shareType === "Writer");
    return { country, yours: claim ? total(claim) : undefined, graph: held?.total, accepted: conflict.accepted?.includes(country) ?? false };
  });
  return (
    <RecordIndex
      rows={rows}
      rowKey={(one) => one.country}
      noun={{ one: "territory", many: "territories" }}
      identity={{ title: "Territory", name: (one) => one.country }}
      note={
        <Alert intent="info">
          The graph's figure is the resolved writer total from every standing claim but yours. Whose shares make it up is shown only where each party shares it.
        </Alert>
      }
      columns={[
        { name: "Your claim", as: "percent", value: (one) => one.yours },
        { name: "Graph holds", as: "percent", value: (one) => one.graph },
        { name: "Conflict total", as: "percent", value: () => conflict.total },
        { name: "Accepted here", value: (one) => (one.accepted ? 1 : 0), cell: (one) => (one.accepted ? "Yes" : "No") },
      ]}
      chooser={false}
      empty={{ none: "The conflict names no territory.", line: true }}
    />
  );
}

/** Evidence for the tenant's side — the counterclaim moves to its second step. */
function UploadEvidence({ conflict, ...held }: HeldBy & { conflict: Conflict }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <FormDialog
      {...held}
      confirm="Upload"
      draft={{ note: unanswered.longtext }}
      ready={file !== null}
      onCommit={() =>
        updateConflict(conflict.id, { state: "Awaiting evidence", step: Math.max(conflict.step, 1) }, "p-meridian")
      }
    >
      <UploaderDocument multiple={false} formats="PDF" noun={{ one: "agreement", many: "agreements" }} onSelect={(files) => setFile(files[0] ?? null)}>
        {file ? <UploaderFileRow name={file.name} phase="landed" fileSize={file.size} onRemove={() => setFile(null)} /> : null}
      </UploaderDocument>
      <Field as="longtext" name="note" label="Note to Sureel ops" help="Read by Sureel ops only. The other party sees that evidence arrived, not what it says." />
    </FormDialog>
  );
}

/** The tenant's claim corrected — superseding the one it uploaded; the original stays on record. */
function CorrectClaim({ conflict, claim, ...held }: HeldBy & { conflict: Conflict; claim: OwnClaim }) {
  const draft = Object.fromEntries(claim.shares.map((one, at) => [`share${at}`, owed(one.share)]));
  return (
    <FormDialog
      {...held}
      confirm="Correct"
      draft={draft}
      onCommit={(answers) => {
        const shares = claim.shares.map((one, at) => ({ ...one, share: Number(answers[`share${at}`]) }));
        correctClaim(conflict.id, shares, `Correction by Meridian Music Group, ${conflict.id}`);
        const sum = shares.reduce((all, one) => all + one.share, 0);
        // The resolver reads the correction at once: a total of 100% leaves nothing to dispute.
        if (sum <= 100)
          updateConflict(conflict.id, {
            state: "Resolved",
            step: 3,
            total: sum,
            resolution: { actor: "Resolver v1.3", onBehalfOf: "Sureel", at: now(), reason: `Meridian Music Group corrected its claim: writer shares now total ${formatPercent(sum)}.`, rule: "Resolver v1.3 · supersede" },
          }, "p-meridian");
        else updateConflict(conflict.id, { total: sum }, "p-meridian");
      }}
    >
      {claim.shares.map((one, at) => (
        <Field key={one.writer} as="percent" name={`share${at}`} label={one.writer} help={at === 0 ? "Writer shares across the work total 100%." : undefined} />
      ))}
    </FormDialog>
  );
}

/** The tenant takes its claim back — the conflict closes; the claim stays on the Proof Log as withdrawn. */
function WithdrawClaim({ conflict, ...held }: HeldBy & { conflict: Conflict }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`Your claim on ${assetById(conflict.assetId).title} stops counting in every territory it named. It stays on the record as withdrawn.`}
      confirm="Withdraw"
      destructive
      onCommit={() =>
        updateConflict(conflict.id, {
          state: "Resolved",
          step: 3,
          resolution: { actor: "Meridian Music Group admin", at: now(), reason: "Meridian Music Group withdrew its claim." },
        }, "p-meridian")
      }
    />
  );
}

function conflictPlace(conflict: Conflict, facet: ConflictFacet): ShellPlace {
  const title = assetById(conflict.assetId).title;
  return {
    at: "Matching",
    page: title,
    record: {
      back: { index: "Conflicts", opens: contributorHref("conflicts") },
      facets: CONFLICT_FACETS,
      at: facet,
      addressOf: (one) => conflictHref(conflict.id, one as ConflictFacet),
    },
    trail: [
      { label: "Matching", opens: contributorHref("matches") },
      { label: "Conflicts", opens: contributorHref("conflicts") },
      { label: title },
    ],
  };
}
