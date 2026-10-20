import type { ReactNode } from "react";
import {
  Alert,
  Badge,
  CardGrid,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  FacetCard,
  FactCard,
  Metadata,
  RecordIndex,
  formatList,
  formatMeta,
  type ActivitySave,
  type Command,
  type DetailFacet,
  type ShellPlace,
} from "@revelator/pro-ui";

import { COUNTERCLAIM_STEPS, PRECEDENCE } from "../../graph/model";
import type { Assertion, Conflict } from "../../graph/model";
import { AGREEMENTS, assertionById, assetById, conflictById, grantById, partyName } from "../../graph/fixtures";
import { tierOf } from "../../graph/resolve";
import { TerritoryChip, TierChip, decidedBy } from "../../rights/kit";
import type { Shown } from "../surface";
import { AskForEvidence, Assign, Comment, Resolve } from "./conflict-dialogs";
import { attestationById, disputeOf, noticesAbout, notesOn, trailOf } from "./data";
import { assetMark, personMark } from "./marks";
import { OPS_ONLY, SIGNED_IN, consoleHref, facetOf, type Persona } from "./where";

export const CONFLICT_FACETS = ["Overview", "Claims", "Discussion"] as const;
type ConflictFacet = (typeof CONFLICT_FACETS)[number];

/** The parties on a conflict with no claim of theirs in the graph — a borrowed lane's, private to its tenant. */
const privateParties = (conflict: Conflict, claims: readonly Assertion[]) =>
  conflict.parties.filter((party) => !claims.some((one) => one.partyId === party) && !disputeOf(conflict));

/**
 * Everything done to the conflict, newest first: raised, assigned, asked, noted, resolved — behind
 * the band's timeline, as the record's history.
 */
function historyOf(conflict: Conflict): ActivitySave[] {
  const raised: ActivitySave = {
    kind: "machine",
    actor: "Resolver",
    portrait: null,
    at: conflict.opened,
    entries: [{ action: "opened", property: conflict.raisedBy }],
  };
  const steps = trailOf(conflict.id).map(
    (one): ActivitySave => ({
      actor: one.who,
      portrait: personMark(one.who),
      at: one.at,
      entries: [{ action: one.action, property: one.property, changes: [{ before: one.before, after: one.after }] }],
    }),
  );
  const notes = notesOn(conflict.id).map(
    (one): ActivitySave => ({ actor: one.who, portrait: personMark(one.who), at: one.at, entries: [{ action: "commented", property: one.text }] }),
  );
  return [raised, ...steps, ...notes].sort((one, other) => other.at.getTime() - one.at.getTime());
}

/**
 * One conflict, as a record with facets (S7-2, F3 step 4, F5 step 3).
 *
 * The band says WHICH asset and which side, what it holds at risk and where it stands; its one
 * prominent action is the resolution, which only rights ops can take. Claims reads every claim side
 * by side, the total against 100%; Discussion is ops' own notes.
 */
export function ConflictPage(id: string, written: string | undefined, persona: Persona): Shown {
  const conflict = conflictById(id);
  if (!conflict) return missing(id);
  const facet = facetOf(CONFLICT_FACETS, written);
  return { place: conflictPlace(conflict, facet), page: <ConflictDetail key={id} conflict={conflict} facet={facet} persona={persona} /> };
}

function ConflictDetail({ conflict, facet, persona }: { conflict: Conflict; facet: ConflictFacet; persona: Persona }) {
  const by = SIGNED_IN[persona].name;
  const asset = assetById(conflict.assetId);
  const open = conflict.state !== "Resolved";
  const ops = persona === "Rights ops";

  const FACETS: Record<ConflictFacet, { header?: DetailFacet; body: ReactNode }> = {
    Overview: { body: <ConflictOverview conflict={conflict} /> },
    Claims: { header: { name: "Claims" }, body: <ConflictClaims conflict={conflict} /> },
    Discussion: {
      header: { name: "Discussion", actions: [{ label: "Add comment", creates: true, dialog: <Comment conflict={conflict} by={by} /> }] },
      body: <ConflictNotes conflict={conflict} />,
    },
  };
  const shown = FACETS[facet];

  const resolveCommand: Command = !open
    ? { label: "Resolve", unavailable: "Resolved — a new claim opens a new conflict." }
    : ops
      ? { label: "Resolve", dialog: <Resolve conflict={conflict} by={by} /> }
      : { label: "Resolve", unavailable: OPS_ONLY };

  return (
    <DetailPage
      record={{
        mark: assetMark(asset),
        name: asset.title,
        kind: formatMeta([conflict.kind, conflict.side]) ?? conflict.kind,
        status: `conflict:${conflict.state}`,
        facts: [
          { identifier: conflict.id, standard: "id" },
          { as: "money", value: conflict.revenueAtRisk, label: "At risk" },
          { text: `${conflict.severity} severity` },
        ],
        // ONE action stands out, and it is the resolution — rights ops', while the conflict is open.
        actions: open && ops ? [{ label: "Resolve", primary: true, dialog: <Resolve conflict={conflict} by={by} /> }] : [],
        more: [
          ...(open && ops ? [] : [resolveCommand]),
          open ? { label: "Assign", dialog: <Assign conflict={conflict} by={by} /> } : { label: "Assign", unavailable: "Resolved." },
          open && conflict.state === "Open"
            ? { label: "Ask for evidence", dialog: <AskForEvidence conflict={conflict} by={by} /> }
            : { label: "Ask for evidence", unavailable: open ? "Evidence has already been asked for." : "Resolved." },
          { label: "Add comment", dialog: <Comment conflict={conflict} by={by} /> },
          { label: "Open asset inspector", mark: "rights", opens: consoleHref("assets", asset.id) },
        ],
        activity: { saves: historyOf(conflict), fields: ["Assignee", "State"], records: { name: asset.title, all: "Every change" } },
      }}
      facet={shown.header}
    >
      {shown.body}
    </DetailPage>
  );
}

/**
 * The recap: where the conflict stands, what it holds, and the way into each facet. An attestation
 * dispute says first that its grant is paused, not revoked (F3); a resolved conflict says who
 * decided it, on what, and who was told.
 */
function ConflictOverview({ conflict }: { conflict: Conflict }) {
  const claims = conflict.claims.map(assertionById);
  const asset = assetById(conflict.assetId);
  const dispute = disputeOf(conflict);
  const grant = dispute ? grantById(dispute.grant) : undefined;
  const told = noticesAbout(conflict.id);
  return (
    <DetailOverview>
      {conflict.state !== "Resolved" ? (
        <Alert intent="warn" title="How the graph pays meanwhile">
          {conflict.interim}
        </Alert>
      ) : null}
      <DetailOverviewGrid>
        <FacetCard
          title="Claims"
          opens={consoleHref("conflicts", conflict.id, "Claims")}
          figures={[
            { label: "Claims", as: "count", value: claims.length + (dispute ? 2 : 0) },
            ...(conflict.total === undefined ? [] : [{ label: "Total against 100%", as: "percent" as const, value: conflict.total }]),
          ]}
        />
        <FacetCard
          title="Where it stands"
          facts={[
            { label: "State", value: <Badge status={`conflict:${conflict.state}`} /> },
            { label: "Step", value: COUNTERCLAIM_STEPS[conflict.step] },
            { label: "Assignee", value: conflict.assignee ?? "Unassigned" },
            { label: "Opened", as: "date", value: conflict.opened },
          ]}
        />
        <FacetCard
          title="Asset"
          opens={consoleHref("assets", asset.id)}
          facts={[
            { label: "Kind", value: asset.kind },
            { label: "Side in conflict", value: conflict.side },
            { label: "Territories", as: "list", value: conflict.territories },
            { label: "Tier", value: <TierChip tier={tierOf(asset.id)} /> },
          ]}
        />
        {grant ? (
          <FacetCard
            title="Disputed grant"
            facts={[
              { label: "Use", value: grant.use },
              { label: "Partners", as: "list", value: grant.partners.ids.map(partyName) },
              { label: "State", value: <Badge status={`grant:${grant.state}`} /> },
            ]}
          />
        ) : null}
        <FacetCard
          title="Discussion"
          opens={consoleHref("conflicts", conflict.id, "Discussion")}
          figures={[{ label: "Comments", as: "count", value: notesOn(conflict.id).length }]}
        />
      </DetailOverviewGrid>
      {/* The resolution reads in full, across the page: its reason is a sentence, not a tile's value. */}
      {conflict.resolution ? (
        <FactCard
          title="Resolution"
          facts={[
            { label: "Decided", value: decidedBy(conflict.resolution) },
            { label: "Reason", value: conflict.resolution.reason },
            { label: "Rule or evidence", value: conflict.resolution.rule },
            told.length
              ? { label: "Told", as: "list", value: told.map((one) => one.to) }
              : { label: "Told", value: "No notice sent — the parties read it in their own workspaces" },
          ]}
        />
      ) : null}
    </DetailOverview>
  );
}

/** One claim, as its own card — what it says, where it came from, and the precedence its source holds. */
function ClaimCard({ claim }: { claim: Assertion }) {
  return (
    <FactCard
      title={partyName(claim.partyId)}
      trail={<Badge status={`claim:${claim.state}`} />}
      facts={[
        { label: "Interest", as: "list", value: claim.interests },
        { label: "Side", value: claim.side },
        { label: "Share", as: "rate", value: claim.share },
        ...(claim.shareOf ? [{ label: "Of", value: claim.shareOf }] : []),
        typeof claim.rights === "string"
          ? { label: "Rights", value: claim.rights }
          : { label: "Rights", as: "list", value: claim.rights },
        { label: "Territory", value: <TerritoryChip set={claim.territory} /> },
        { label: "Valid from", as: "date", value: claim.from },
        { label: "Valid to", as: "date", value: claim.to },
        { label: "Source", value: claim.source },
        { label: "Precedence", value: `${PRECEDENCE[claim.source]} of 6 under the rule in force` },
        { label: "Source reference", value: claim.sourceRef, standard: "id" },
        { label: "Known since", as: "date", value: claim.known },
      ]}
    />
  );
}

/**
 * Every claim side by side — the conflict card pattern (FRD design brief, 6). An attestation dispute
 * has no share claims: its two sides are the label's attestation on the artist's behalf and the
 * artist's dispute, with the agreement clause the label cited. A party whose claim is private to
 * its tenant is said to be there, and reached under audit only.
 */
function ConflictClaims({ conflict }: { conflict: Conflict }) {
  const claims = conflict.claims.map(assertionById);
  const dispute = disputeOf(conflict);
  const hidden = privateParties(conflict, claims);
  if (dispute) {
    const attestation = attestationById(dispute.attestation);
    // The agreement the label CITED — read off the authority it attested under.
    const agreement = AGREEMENTS.find((one) => attestation.authority?.startsWith(one.code));
    const cited = agreement?.clauses?.find((one) => attestation.authority?.endsWith(one.split(" ")[0]!));
    return (
      <Metadata>
        <CardGrid columns={2}>
          <FactCard
            title={partyName(attestation.attestor)}
            trail={<Badge status={`attestation:${attestation.state}`} />}
            facts={[
              { label: "Position", value: "Attested on the artist's behalf" },
              { label: "Claim", value: attestation.claim },
              { label: "On behalf of", value: partyName(attestation.onBehalfOf ?? "") },
              { label: "Authority", value: attestation.authority },
              { label: "Assurance", value: attestation.assurance },
              { label: "Signed", as: "date", grain: "minute", value: attestation.issued },
              { label: "Key", value: attestation.keyId, standard: "id" },
            ]}
          />
          <FactCard
            title={partyName(dispute.by)}
            trail={<Badge status="attestation:Disputed" />}
            facts={[
              { label: "Position", value: "Disputes the attestation" },
              { label: "Says", value: dispute.says },
              { label: "Assurance", value: dispute.assurance },
              { label: "Raised", as: "date", grain: "minute", value: dispute.at },
              { label: "Through", value: dispute.via },
            ]}
          />
        </CardGrid>
        {agreement ? (
          <FactCard
            title={`Cited agreement ${agreement.code}`}
            facts={[
              { label: "Agreement", value: agreement.title },
              { label: "Cited clause", value: cited ?? attestation.authority },
              { label: "Parties", as: "list", value: agreement.parties.map(partyName) },
              { label: "Territory", value: <TerritoryChip set={agreement.territory} /> },
              { label: "From", as: "date", value: agreement.from },
              { label: "To", as: "date", value: agreement.to },
              { label: "Clauses", as: "list", value: agreement.clauses ?? [] },
            ]}
          />
        ) : null}
      </Metadata>
    );
  }
  return (
    <Metadata>
      {hidden.length ? (
        <Alert intent="info" title="A private claim">
          {`${formatList(hidden.map(partyName))} claims through its own tenant. Its terms are private: open them under audit only, from Tenants.`}
        </Alert>
      ) : null}
      <CardGrid columns={2}>
        {claims.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </CardGrid>
    </Metadata>
  );
}

/** Ops' notes on the conflict, oldest first — the order they were written in. */
function ConflictNotes({ conflict }: { conflict: Conflict }) {
  return (
    <RecordIndex
      rows={notesOn(conflict.id)}
      rowKey={(one) => `${one.at.getTime()}-${one.who}`}
      noun={{ one: "comment", many: "comments" }}
      identity={{ title: "By", name: (one) => one.who, mark: (one) => personMark(one.who) }}
      columns={[
        { name: "Comment", value: (one) => one.text, cell: (one) => one.text },
        { name: "Written", as: "date", grain: "minute", value: (one) => one.at },
      ]}
      chooser={false}
      empty={{ holder: "this conflict", line: true }}
    />
  );
}

function conflictPlace(conflict: Conflict, facet: ConflictFacet): ShellPlace {
  const asset = assetById(conflict.assetId);
  return {
    at: "Resolution",
    page: asset.title,
    record: {
      back: { index: "Conflicts", opens: consoleHref("conflicts") },
      facets: CONFLICT_FACETS,
      at: facet,
      addressOf: (one) => consoleHref("conflicts", conflict.id, one === "Overview" ? undefined : one),
    },
    trail: [
      { label: "Resolution", opens: consoleHref("conflicts") },
      { label: "Conflicts", opens: consoleHref("conflicts") },
      { label: formatMeta([asset.title, conflict.kind]) ?? asset.title },
    ],
  };
}

/** An address naming no conflict the graph holds. */
function missing(id: string): Shown {
  return {
    place: { at: "Resolution", page: "Conflicts" },
    page: (
      <Alert intent="danger" title="No such conflict">
        {`The graph holds no conflict ${id}. It may have been raised in another environment.`}
      </Alert>
    ),
  };
}

