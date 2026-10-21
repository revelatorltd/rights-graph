import { Alert, Field, FormDialog, owed, unanswered, useAnswer, type Command, type HeldBy } from "@revelator/pro-ui";

import { conflictById, partyName, setRequestState } from "../../../graph/fixtures";
import type { Request, Use } from "../../../graph/model";
import { territoryLabel } from "../../../graph/resolve";
import { RespondWithEvidence } from "./conflict-dialogs";
import { claimOfRequest } from "../../../graph/identity";
import { claimCommands } from "../../artist/claim-review";
import {
  COUNTRIES,
  DEPENDENCY_REASON,
  LABEL,
  ME,
  answer,
  authorities,
  decision,
  delegate,
  dependsOnTraining,
  reachOf,
  rightsHref,
  trainingAcross,
  waiting,
  writeGrant,
  useText,
} from "./data";

/** Who at the label a request can be handed to. */
export const COLLEAGUES = [
  { value: "Sam Okoro", title: "Sam Okoro", description: "Label member — drafts, cannot grant" },
  { value: "Ines Varga", title: "Ines Varga", description: "Business affairs — label admin" },
];

const PATHS = [
  { value: "ask", title: "Ask the artist to confirm", description: "The artist signs in the artist app; nothing clears until they do." },
  { value: "attest", title: "Attest on the artist's behalf", description: "Live at once, under the agreement cited. The artist is told." },
];
const MODELS = [
  { value: "Dynamic", title: "Dynamic", description: "Paid on reported usage." },
  { value: "Flat", title: "Flat", description: "One fee for the term." },
];
const REACH = [
  { value: "World", title: "Worldwide" },
  { value: "Only", title: "Only in" },
  { value: "Except", title: "All except" },
];

/** The agreement clause, asked only on the path that needs one. */
function AgreementField() {
  const path = useAnswer("path");
  if (path !== "attest") return null;
  return (
    <Field
      as="choice"
      name="agreement"
      label="Agreement reference"
      noun={{ one: "clause", many: "clauses" }}
      options={authorities().filter((one) => /attest/i.test(one.description))}
      help="The clause that lets the label attest for the artist — cited on the grant and in the artist's notice."
    />
  );
}

/**
 * Approving a licence request: ONE grant at the scope asked, for the partner asking, over the
 * territory and term asked (S4-3) — and, for Voice/NIL, the path the artist's consent takes (S1-7).
 */
export function ApproveRequest({ request, ...held }: HeldBy & { request: Request }) {
  const voice = request.use === "Voice/NIL";
  // Where training is cleared on only part of the scope, the dependent use stays denied on the rest.
  const read = dependsOnTraining(request.use) ? trainingAcross(request.scope.level, request.scope.ref, request.from) : undefined;
  const partial = read && read.cleared < read.of ? read.blocked.map((one) => one.title).join(", ") : undefined;
  return (
    <FormDialog
      {...held}
      confirm="Approve"
      draft={{ authority: owed.choice, path: voice ? owed.choice : unanswered.choice, agreement: unanswered.choice }}
      ready={(draft) => !voice || draft.path !== "attest" || Boolean(draft.agreement)}
      onCommit={(draft) => {
        const artist = request.scope.level === "Artist" ? request.scope.ref : undefined;
        writeGrant(
          {
            level: request.scope.level,
            ref: request.scope.ref,
            side: request.side ?? "Master",
            use: request.use!,
            effect: "Grant",
            partners: { mode: "Allowlist", ids: [request.from] },
            territory: request.territory,
            from: request.start,
            to: request.end,
            conditions: [
              `${request.licenceModel ?? "Flat"} licence model`,
              `Answers ${request.id.toUpperCase()}`,
              `Authority ${draft.authority}`,
            ],
          },
          voice && artist
            ? { path: draft.path as "ask" | "attest", artist, authority: draft.path === "attest" ? draft.agreement : undefined }
            : undefined,
        );
        setRequestState(
          request.id,
          "Approved",
          decision(voice && artist ? partyName(artist) : ME.label, voice && draft.path === "attest" ? draft.agreement : draft.authority),
        );
      }}
    >
      <Field
        as="choice"
        name="authority"
        label="Authority"
        noun={{ one: "clause", many: "clauses" }}
        options={authorities()}
        help={`Grants ${request.use ? useText(request.use) : "the use"} on the master side to ${partyName(request.from)} at ${request.scope.name}, ${territoryLabel(request.territory)}. Publishers answer the composition side.`}
      />
      {partial ? (
        <Alert intent="warn" title="Part of the scope stays denied">
          {`AI training is not cleared for ${partyName(request.from)} on ${partial}: ${useText(request.use!)} reads Denied there even once approved.`}
        </Alert>
      ) : null}
      {voice ? <Field as="choice" name="path" label="Voice/NIL path" options={PATHS} /> : null}
      {voice ? <AgreementField /> : null}
    </FormDialog>
  );
}

/** Declining — the reason goes back to the requester with the answer. */
export function DeclineRequest({ request, ...held }: HeldBy & { request: Request }) {
  return (
    <FormDialog
      {...held}
      confirm="Decline"
      draft={{ note: owed.longtext }}
      onCommit={(draft) => {
        answer(request.id, { note: draft.note });
        setRequestState(request.id, "Declined", decision(ME.label));
      }}
    >
      <Field as="longtext" name="note" label="Reason" help={`Sent to ${partyName(request.from)} with the answer.`} />
    </FormDialog>
  );
}

function CodesField() {
  const reach = useAnswer("reach");
  if (reach === "World") return null;
  return (
    <Field
      as="choices"
      name="codes"
      label={reach === "Only" ? "Only in" : "All except"}
      options={COUNTRIES.map((code) => ({ value: code, title: code }))}
    />
  );
}

/** Countering — the terms the label would grant instead, sent back for the requester to accept. */
export function CounterRequest({ request, ...held }: HeldBy & { request: Request }) {
  const territory = request.territory;
  const reach = territory.include === "World" ? (territory.exclude?.length ? "Except" : "World") : "Only";
  return (
    <FormDialog
      {...held}
      confirm="Send counter"
      draft={{
        reach: owed(reach),
        codes: territory.include === "World" ? (territory.exclude ?? []) : territory.include,
        end: request.end ?? unanswered.date,
        model: owed(request.licenceModel ?? "Flat"),
        note: owed.longtext,
      }}
      onCommit={(draft) => {
        answer(request.id, {
          counter: { territory: reachOf(draft.reach, draft.codes), end: draft.end || undefined, model: draft.model },
          note: draft.note,
        });
        setRequestState(request.id, "Countered", decision(ME.label));
      }}
    >
      <Field as="choice" name="reach" label="Territory" options={REACH} />
      <CodesField />
      <Field as="date" name="end" label="Ends" help="Left blank, the term runs until either side ends it." />
      <Field as="choice" name="model" label="Licence model" options={MODELS} />
      <Field as="longtext" name="note" label="Note" help={`What ${partyName(request.from)} reads beside the terms.`} />
    </FormDialog>
  );
}

/** Handing a request to a colleague — the label keeps it in its inbox, under their name. */
export function DelegateRequest({ request, ...held }: HeldBy & { request: Request }) {
  return (
    <FormDialog
      {...held}
      confirm="Delegate"
      draft={{ to: owed.record, note: unanswered.longtext }}
      onCommit={(draft) => delegate(request.id, draft.to, draft.note || undefined)}
    >
      <Field as="record" name="to" label="Colleague" entity="person" noun={{ one: "colleague", many: "colleagues" }} options={COLLEAGUES} />
      <Field as="longtext" name="note" label="Note" />
    </FormDialog>
  );
}

/** Why approving is not open now, where it is not: the dependency rule (S1-6). */
export function approveBlocked(request: Request) {
  if (!dependsOnTraining(request.use as Use | undefined)) return undefined;
  const read = trainingAcross(request.scope.level, request.scope.ref, request.from);
  return read.cleared === 0
    ? `${DEPENDENCY_REASON} ${partyName(request.from)} has no training clearance on ${request.scope.name}.`
    : undefined;
}

/**
 * What the label can do with a request — one shape for every type (FRD pattern 8), the actions its
 * type has: approve, decline, counter for a licence; respond for a conflict; delegate for both.
 * A request the label sent is the artist's to answer, and says so.
 */
export function requestCommands(request: Request): Command[] {
  const open: Command = { label: "Open", opens: rightsHref("requests", request.id) };
  // An ArtistID claim (S3-2) is confirmed or declined, never approved as a licence.
  const claim = claimOfRequest(request);
  if (claim) return claimCommands(claim, { actor: ME.name, for: ME.label }, open);
  if (request.from === LABEL)
    return [
      open,
      { label: "Approve", unavailable: `${partyName(request.to)} answers this in the artist app.` },
      { label: "Send reminder" },
    ];
  if (!waiting(request)) return [open];
  const hand: Command = { label: "Delegate", mark: "members", dialog: <DelegateRequest request={request} /> };
  if (request.type === "Conflict response" && request.about) {
    const conflict = conflictById(request.about);
    return [
      open,
      { label: "Respond", mark: "upload", dialog: <RespondWithEvidence conflict={conflict} request={request} /> },
      { label: "Open conflict", opens: rightsHref("conflicts", conflict.id) },
      hand,
    ];
  }
  const blocked = approveBlocked(request);
  return [
    open,
    blocked
      ? { label: "Approve", unavailable: blocked }
      : { label: "Approve", mark: "success", dialog: <ApproveRequest request={request} /> },
    { label: "Counter", mark: "edit", dialog: <CounterRequest request={request} /> },
    { label: "Decline", mark: "rejection", dialog: <DeclineRequest request={request} /> },
    hand,
  ];
}
