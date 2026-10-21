import { ConfirmationDialog, Field, FormDialog, owed, unanswered, type HeldBy } from "@revelator/pro-ui";

import {
  ASSERTIONS,
  ATTESTATIONS,
  GRANTS,
  assetById,
  setAttestationState,
  setGrantState,
  setRequestState,
  updateConflict,
} from "../../../graph/fixtures";
import type { Conflict, Request } from "../../../graph/model";
import { RULE_VERSION } from "../../../graph/resolve";
import { LABEL, ME, NOW, decision, labelAgreements, withdrawClaims } from "./data";

/** What the label answered on a conflict — kept beside the graph's own record of it. */
export const RESPONSES = new Map<string, { statement: string; agreement?: string; evidence?: string; at: Date; by: string }>();

/**
 * What the label can withdraw from a conflict: its own claims the graph did not resolve, the grants
 * flagged for want of authority, the attestations disputed. A claim the graph resolved in its
 * favour is never offered — withdrawing it would surrender what it holds.
 */
export function withdrawable(conflict: Conflict) {
  const asset = assetById(conflict.assetId);
  return {
    claims: ASSERTIONS.filter(
      (one) => conflict.claims.includes(one.id) && one.partyId === LABEL && (one.state === "No authority" || one.state === "Contested"),
    ),
    grants: GRANTS.filter(
      (one) =>
        one.grantedBy === LABEL &&
        one.state !== "Revoked" &&
        ((conflict.kind === "Unauthorized grant" && one.unauthorized && one.ref === asset.id) ||
          (conflict.kind === "Attestation dispute" && ATTESTATIONS.some((at) => at.subject.id === one.id && at.state === "Disputed"))),
    ),
    attestations: ATTESTATIONS.filter(
      (one) => conflict.kind === "Attestation dispute" && one.attestor === LABEL && one.state === "Disputed",
    ),
  };
}
export const canWithdraw = (conflict: Conflict) => {
  const what = withdrawable(conflict);
  return what.claims.length + what.grants.length + what.attestations.length > 0;
};

/**
 * Responding to a conflict with evidence (S1-9, S4-3): what the label says, the agreement it
 * rests on, and the evidence. The counterclaim moves to its second step — the evidence waits on
 * Sureel's approval — and the inbox item it came from is answered.
 */
export function RespondWithEvidence({ conflict, request, ...held }: HeldBy & { conflict: Conflict; request?: Request }) {
  return (
    <FormDialog
      {...held}
      confirm="Send response"
      draft={{ statement: owed.longtext, agreement: unanswered.choice, evidence: unanswered.text }}
      onCommit={(draft) => {
        RESPONSES.set(conflict.id, {
          statement: draft.statement,
          agreement: draft.agreement || undefined,
          evidence: draft.evidence || undefined,
          at: NOW,
          by: ME.name,
        });
        updateConflict(conflict.id, { step: Math.max(conflict.step, 1), state: "Awaiting evidence" }, "p-kestrel");
        if (request) setRequestState(request.id, "Approved", decision(ME.label, draft.agreement || undefined));
      }}
    >
      <Field
        as="longtext"
        name="statement"
        label="Statement"
        help="What the label holds here, and why the graph should read it that way."
      />
      <Field
        as="choice"
        name="agreement"
        label="Agreement"
        noun={{ one: "agreement", many: "agreements" }}
        options={labelAgreements().map((one) => ({ value: one.code, title: one.code, description: one.title }))}
      />
      <Field
        as="text"
        name="evidence"
        label="Evidence"
        help="The file or reference Sureel reviews — a signed agreement, a delivery receipt."
      />
    </FormDialog>
  );
}

/**
 * Withdrawing the label's side of a conflict (G-1): its claims stop standing — the rows stay,
 * withdrawn — its flagged grants and disputed attestations are revoked, and the resolver closes
 * the conflict with the withdrawal as its reason.
 */
export function WithdrawClaim({ conflict, ...held }: HeldBy & { conflict: Conflict }) {
  const what = withdrawable(conflict);
  const parts = [
    what.claims.length ? `${what.claims.length === 1 ? "its claim" : `its ${what.claims.length} claims`} stop standing` : "",
    what.grants.length
      ? `${what.grants.length === 1 ? "the grant" : `${what.grants.length} grants`} it made here ${what.grants.length === 1 ? "is" : "are"} revoked`
      : "",
    what.attestations.length ? "the attestation it made is revoked" : "",
  ].filter(Boolean);
  return (
    <ConfirmationDialog
      {...held}
      asks={`Kestrel Point's side of this conflict is withdrawn: ${parts.join(", ")}. The rows stay in the graph as withdrawn; claiming again means a new claim.`}
      confirm="Withdraw"
      destructive
      onCommit={() => {
        withdrawClaims(what.claims.map((one) => one.id));
        for (const one of what.grants) setGrantState(one.id, "Revoked");
        for (const one of what.attestations) setAttestationState(one.id, "Revoked");
        updateConflict(conflict.id, {
          state: "Resolved",
          step: 3,
          resolution: {
            actor: `Resolver ${RULE_VERSION}`,
            at: NOW,
            reason: `${ME.label} withdrew its side.`,
            rule: `Resolver ${RULE_VERSION} · withdrawal`,
          },
        }, "p-kestrel");
      }}
    />
  );
}
