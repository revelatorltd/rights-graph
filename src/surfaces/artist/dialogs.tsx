import { ConfirmationDialog, Field, FormDialog, owed, unanswered, type HeldBy } from "@revelator/pro-ui";

import { CREDITS } from "../../graph/fixtures";
import type { Attestation, Credit, Request } from "../../graph/model";
import { TIERS } from "../../graph/model";
import { tierOf, territoryLabel } from "../../graph/resolve";
import {
  DELEGATE_SCOPES,
  approveRequest,
  assetById,
  claimProfile,
  confirmCredit,
  declineRequest,
  denyCredit,
  disputeAttestation,
  grantVoice,
  grantById,
  inviteDelegate,
  partyName,
  voicePartners,
  type Reader,
} from "./data";

/**
 * The questions the artist app asks before it writes. Every one is a claim — a signed attestation,
 * a grant, a dispute — and says so in its question; none edits an answer the graph holds (G-1).
 * Each is HELD by the command that opens it, which titles it with its own words.
 */

/** S3-3: confirming signs a role attestation with the artist's ArtistID. */
export function ConfirmCredit({ reader, credit, ...held }: HeldBy & { reader: Reader; credit: Credit }) {
  const asset = assetById(credit.assetId);
  const tier = tierOf(asset.id);
  return (
    <ConfirmationDialog
      {...held}
      asks={`You sign that you are the ${credit.role.toLowerCase()} on ${asset.title}, with your ArtistID (${reader.subject.assurance ?? "Basic"}). ${asset.title} is T${tier} now; a signed role is what T4 asks for — ${TIERS[4].requires.toLowerCase()}.`}
      confirm="Confirm credit"
      onCommit={() => confirmCredit(reader, credit)}
    />
  );
}

/** Denying is signed too: the credit stays on the record as denied, with who denied it. */
export function DenyCredit({ reader, credit, ...held }: HeldBy & { reader: Reader; credit: Credit }) {
  const asset = assetById(credit.assetId);
  return (
    <ConfirmationDialog
      {...held}
      asks={`You sign that you are not the ${credit.role.toLowerCase()} on ${asset.title}. The label is told, and the credit stays on the record as denied.`}
      confirm="Deny credit"
      onCommit={() => denyCredit(reader, credit)}
    />
  );
}

/** S4-3: a request approved — for a Voice/NIL licence, the approval IS the artist's grant. */
export function ApproveRequest({ reader, request, ...held }: HeldBy & { reader: Reader; request: Request }) {
  // A credit confirmation is the credit's own question, tier and all.
  const credit = request.type === "Credit confirmation" ? CREDITS.find((one) => one.id === request.about) : undefined;
  if (credit) return <ConfirmCredit {...held} reader={reader} credit={credit} />;
  const what =
    request.type === "Licence"
      ? `${partyName(request.from)} may use ${request.use} of ${request.scope.name} in ${territoryLabel(request.territory)}, for ${request.purpose.toLowerCase().replace(/\.$/, "")}.`
      : `${request.purpose}`;
  return (
    <ConfirmationDialog
      {...held}
      asks={`${what} ${partyName(request.from)} is told, and your answer is signed with your ArtistID.`}
      confirm="Approve"
      onCommit={() => approveRequest(reader, request)}
    />
  );
}

export function DeclineRequest({ reader, request, ...held }: HeldBy & { reader: Reader; request: Request }) {
  const credit = request.type === "Credit confirmation" ? CREDITS.find((one) => one.id === request.about) : undefined;
  if (credit) return <DenyCredit {...held} reader={reader} credit={credit} />;
  return (
    <ConfirmationDialog
      {...held}
      asks={`${partyName(request.from)} is told no for ${request.scope.name}. Nothing they asked for is granted.`}
      confirm="Decline"
      onCommit={() => declineRequest(reader, request)}
    />
  );
}

/**
 * F3 step 3: a dispute opens a conflict with Sureel and pauses the grant — it never revokes it.
 * The question says so, because "pause" and "revoke" are the two answers a reader confuses.
 */
export function DisputeAttestation({ reader, attestation, ...held }: HeldBy & { reader: Reader; attestation: Attestation }) {
  const grant = attestation.subject.kind === "Grant" ? grantById(attestation.subject.id) : undefined;
  const partners = grant?.partners.ids.map(partyName).join(", ") ?? "the partner";
  return (
    <ConfirmationDialog
      {...held}
      asks={`Sureel opens a conflict between you and ${partyName(attestation.attestor)}, who cited ${attestation.authority ?? "no agreement"}. ${partners}'s grant is paused while it is reviewed — not revoked.`}
      confirm="Dispute"
      onCommit={() => disputeAttestation(reader, attestation)}
    />
  );
}

/** S3-4 "limit": one partner allowed, but only somewhere and until a day. */
export function LimitVoice({ reader, ...held }: HeldBy & { reader: Reader }) {
  return (
    <FormDialog
      {...held}
      confirm="Allow with limits"
      draft={{ partner: owed.choice, countries: unanswered.several, until: unanswered.date }}
      onCommit={(draft) =>
        grantVoice(reader, draft.partner, {
          territory: draft.countries.length ? { include: draft.countries } : undefined,
          to: draft.until ?? undefined,
        })
      }
    >
      <Field
        as="choice"
        name="partner"
        label="Partner"
        options={voicePartners().map((one) => ({ value: one.id, title: one.name }))}
      />
      <Field as="country" several name="countries" label="Only in" help="Leave it empty for everywhere." />
      <Field as="date" name="until" label="Until" help="Leave it empty for no end." />
    </FormDialog>
  );
}

/** S3-2: a profile in the graph claimed — the label or Sureel confirms it. */
export function ClaimProfile({ reader, ...held }: HeldBy & { reader: Reader }) {
  return (
    <FormDialog
      {...held}
      confirm="Claim"
      draft={{ name: owed.text, kind: owed.choice, code: unanswered.identifier }}
      onCommit={(draft) =>
        claimProfile({
          party: reader.subject.id,
          name: draft.name.trim(),
          kind: draft.kind === "Writer entry" ? "Writer entry" : "Artist entry",
          standard: draft.kind === "Writer entry" ? "ipi" : "isni",
          code: draft.code || undefined,
        })
      }
    >
      <Field as="text" name="name" label="Name on the entry" />
      <Field
        as="choice"
        name="kind"
        label="Entry"
        options={[
          { value: "Artist entry", title: "Artist entry", description: "Credited on recordings — named by an ISNI." },
          { value: "Writer entry", title: "Writer entry", description: "Credited on works — named by an IPI." },
        ]}
      />
      <Field as="identifier" standard="isni" name="code" label="ISNI or IPI" help="Where you know it. Sureel matches it either way." />
    </FormDialog>
  );
}

/** S3-8: a manager or lawyer invited, with the approvals they may give on the artist's behalf. */
export function InviteDelegate({ reader, ...held }: HeldBy & { reader: Reader }) {
  return (
    <FormDialog
      {...held}
      confirm="Invite"
      draft={{ name: owed.text, email: owed.email, role: owed.choice, scope: owed.choices }}
      onCommit={(draft) =>
        inviteDelegate({
          for: reader.subject.id,
          name: draft.name.trim(),
          email: draft.email.trim(),
          role: draft.role === "Lawyer" ? "Lawyer" : "Manager",
          scope: draft.scope,
        })
      }
    >
      <Field as="text" name="name" label="Name" />
      <Field as="email" name="email" label="Email" />
      <Field
        as="choice"
        name="role"
        label="Role"
        options={[
          { value: "Manager", title: "Manager" },
          { value: "Lawyer", title: "Lawyer" },
        ]}
      />
      <Field
        as="choices"
        name="scope"
        label="May approve"
        help="Voice/NIL and the AI opt-out stay yours: no delegate can set them."
        options={DELEGATE_SCOPES.map((one) => ({ value: one, title: one }))}
      />
    </FormDialog>
  );
}
