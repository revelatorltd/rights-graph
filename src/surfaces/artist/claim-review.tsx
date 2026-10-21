import { Alert, Badge, CollectionPage, ConfirmationDialog, Field, FormDialog, owed, type Command, type HeldBy } from "@revelator/pro-ui";

import { now, partyById, partyName } from "../../graph/fixtures";
import {
  assuranceOf,
  claimDecision,
  claimState,
  claimsTo,
  confirmClaim,
  declineClaim,
  lastCheck,
  type ProfileClaim,
} from "../../graph/identity";
import type { Decision } from "../../graph/model";
import { decidedBy, partyMark } from "../../rights/kit";
import type { Shown } from "../surface";

/**
 * The other half of S3-2: a claim CONFIRMED by whoever can vouch for the person — the label, from
 * its Pro inbox (the request is an Attestation request there), or Sureel, from the console. Written
 * here so both seats confirm the same way; each seat only wires its commands in.
 */

/** Who is confirming, and in whose name the decision is recorded (G-5). */
export interface Confirmer {
  actor: string;
  /** The organisation the actor confirms for — the label, or Sureel. */
  for: string;
  /** Why this reader cannot confirm, where they cannot. */
  unavailable?: string;
}

const decisionOf = (by: Confirmer, authority: string): Decision => ({ actor: by.actor, onBehalfOf: by.for, authority, at: now() });

/** What the confirmer is asked to say is true, in one sentence. */
export function claimAsk(claim: ProfileClaim) {
  const entry = partyById(claim.entry);
  return `${partyName(claim.by)} claims the ${entry.kind.toLowerCase()} entry ${entry.name}`;
}

/** What they know when they decide: the entry's code, and how far the person's own check got. */
function evidenceOf(claim: ProfileClaim) {
  const entry = partyById(claim.entry);
  const check = lastCheck(claim.by);
  const code = entry.isni ? `ISNI ${entry.isni}` : entry.ipi ? `IPI ${entry.ipi}` : "no ISNI or IPI";
  return `${entry.name} — ${code}. ${partyName(claim.by)} holds ArtistID ${assuranceOf(claim.by)}; ${
    check ? `their ${check.document.toLowerCase()} check ${check.outcome === "Passed" ? "passed" : check.outcome === "Failed" ? "failed" : "needs another photo"}` : "they have not checked an ID"
  }.`;
}

function ConfirmClaim({ claim, by, ...held }: HeldBy & { claim: ProfileClaim; by: Confirmer }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`${evidenceOf(claim)} Confirming says ${by.for} knows this person to be that ${partyById(claim.entry).kind.toLowerCase()}: the profile shows as verified, and their ArtistID rises to ${lastCheck(claim.by)?.outcome === "Passed" ? "Verified + ID" : "Verified"}.`}
      confirm="Confirm"
      onCommit={() => confirmClaim(claim, decisionOf(by, "Profile claim confirmed"))}
    />
  );
}

function DeclineClaim({ claim, by, ...held }: HeldBy & { claim: ProfileClaim; by: Confirmer }) {
  return (
    <FormDialog
      {...held}
      confirm="Decline"
      draft={{ reason: owed.longtext }}
      onCommit={(draft) => declineClaim(claim, decisionOf(by, draft.reason.trim()))}
    >
      <Field as="longtext" name="reason" label="Why" help="The person reads this, and can claim the entry again with evidence." />
    </FormDialog>
  );
}

/** Confirm and Decline on a waiting claim; nothing once it is decided. */
export function claimCommands(claim: ProfileClaim, by: Confirmer, open?: Command): Command[] {
  const first = open ? [open] : [];
  if (claimState(claim) !== "Pending") return first;
  if (by.unavailable) return [...first, { label: "Confirm", unavailable: by.unavailable }, { label: "Decline", unavailable: by.unavailable }];
  return [
    ...first,
    { label: "Confirm", mark: "success", dialog: <ConfirmClaim claim={claim} by={by} /> },
    { label: "Decline", mark: "rejection", dialog: <DeclineClaim claim={claim} by={by} /> },
  ];
}

const stateBadge = (claim: ProfileClaim) => {
  const state = claimState(claim);
  return <Badge status={state === "Verified" ? "verification:Verified" : state === "Declined" ? "request:Declined" : "verification:Pending"} />;
};

/**
 * Sureel's queue of ArtistID claims (Console › Matching): the claims a person sent to Sureel
 * because no label of theirs works in Revelator Pro, or because they chose Sureel. Waiting first.
 */
export function IdentityClaimsPage(by: Confirmer): Shown {
  const rows = claimsTo("p-sureel");
  return {
    place: { at: "Matching", page: "ArtistID claims" },
    page: (
      <CollectionPage
        title="ArtistID claims"
        index={{
          rows,
          rowKey: (one) => one.id,
          noun: { one: "claim", many: "claims" },
          identity: { title: "Claim", name: claimAsk, mark: (one) => partyMark(one.by) },
          sort: { column: "Claimed", direction: "descending" },
          note: (
            <Alert intent="info" title="Confirm only what you can stand behind">
              Confirming joins the person's ArtistID to the entry: every credit and consent on it becomes theirs to answer. Check their ID result and evidence against the entry first.
            </Alert>
          ),
          columns: [
            { name: "State", value: (one) => claimState(one), cell: stateBadge },
            { name: "Entry", value: (one) => partyName(one.entry), cell: (one) => partyName(one.entry) },
            {
              name: "Code",
              value: (one) => partyById(one.entry).isni ?? partyById(one.entry).ipi ?? "",
              cell: (one) => (partyById(one.entry).isni ? `ISNI ${partyById(one.entry).isni}` : partyById(one.entry).ipi ? `IPI ${partyById(one.entry).ipi}` : undefined),
            },
            { name: "ArtistID", value: (one) => assuranceOf(one.by), cell: (one) => assuranceOf(one.by) },
            { name: "ID check", value: (one) => lastCheck(one.by)?.outcome ?? "", cell: (one) => lastCheck(one.by)?.outcome ?? "Not done" },
            { name: "Evidence", value: (one) => one.evidence ?? "", cell: (one) => one.evidence },
            { name: "Decided by", value: (one) => claimDecision(one)?.actor ?? "", cell: (one) => (claimDecision(one) ? decidedBy(claimDecision(one)!) : undefined) },
            { name: "Claimed", as: "date", grain: "minute", value: (one) => one.claimed },
          ],
          readings: [
            { name: "Waiting", holds: (one: ProfileClaim) => claimState(one) === "Pending" },
            { name: "Decided", holds: (one: ProfileClaim) => claimState(one) !== "Pending" },
            { name: "All", holds: () => true },
          ],
          commands: (one) => claimCommands(one, by),
          empty: { none: "No ArtistID claim is waiting on Sureel. A person who signs up in the artist app and sends their claim to Sureel lands here." },
        }}
      />
    ),
  };
}
