import { ConfirmationDialog, Field, FormDialog, formatDate, formatPercent, formatRange, owed, unanswered, type Command, type HeldBy } from "@revelator/pro-ui";

import { ASSERTIONS, addGrant, assetById, conflictById, partyName, setRequestState, works } from "../../../graph/fixtures";
import { AI_USES, type Assertion, type Request } from "../../../graph/model";
import { recordingsEmbodying, territoryLabel, useWord } from "../../../graph/resolve";
import { ME, MY_NAME, TERRITORY_SETS, decidedNow, meta, myWorks, rightsHref, withdrawClaim } from "./data";

/** AGR-101 §11.3 — the writer's written consent, a condition every AI grant of Harbor's carries. */
export const AI_CONDITION = "Writer's written consent — AGR-101 §11.3";

/** The works a request reaches on Harbor's side — the one it names, or every Harbor work on the label's recordings. */
export function worksAsked(request: Request) {
  if (request.scope.level === "Asset") {
    const asset = assetById(request.scope.ref);
    return asset.kind === "Work" ? [asset] : works().filter((one) => recordingsEmbodying(one.id).some((each) => each.id === asset.id));
  }
  return myWorks().filter((work) => recordingsEmbodying(work.id).some((one) => one.labelId === "p-kestrel"));
}

/** What the request's window reads as, start to end. */
const windowOf = (request: Request) => (request.end ? formatRange(request.start, request.end, "day") : `from ${formatDate(request.start, "day")}`);

/**
 * The grant or the denial a licence decision writes — at the scope the request names, for the
 * partner who asked, for its territory and window, on the composition side. Who decided, for whom
 * and under what authority is stamped on it (G-5).
 */
function decide(request: Request, effect: "Grant" | "Deny") {
  const decided = decidedNow();
  addGrant({
    level: request.scope.level === "Catalogue" ? "Catalogue" : "Asset",
    ref: request.scope.level === "Catalogue" ? ME : request.scope.ref,
    side: "Composition",
    use: request.use!,
    effect,
    partners: { mode: "Allowlist", ids: [request.from] },
    territory: request.territory,
    from: request.start,
    to: request.end,
    grantedBy: ME,
    decided: { ...decided, authority: meta(decided.authority, `inbox ${request.id.toUpperCase()}`) },
    conditions: effect === "Grant" && request.use && AI_USES.includes(request.use) ? [AI_CONDITION] : undefined,
    state: "Live",
  });
  setRequestState(request.id, effect === "Grant" ? "Approved" : "Declined", decided);
}

/** A licence approved — asked first, because the partner is cleared on Harbor's share the moment it commits. */
export function ApproveRequest({ request, ...held }: HeldBy & { request: Request }) {
  const condition = request.use && AI_USES.includes(request.use) ? ` It carries ${AI_CONDITION}.` : "";
  return (
    <ConfirmationDialog
      {...held}
      asks={`${partyName(request.from)} is granted ${useWord(request.use!)} on ${MY_NAME}'s composition share of ${worksAsked(request).length} works, ${territoryLabel(request.territory)}, ${windowOf(request)}.${condition}`}
      confirm="Approve"
      onCommit={() => decide(request, "Grant")}
    />
  );
}

/** A licence declined — a denial is written for that partner, so the answer is Denied, not merely unanswered. */
export function DeclineRequest({ request, ...held }: HeldBy & { request: Request }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`${partyName(request.from)} is denied ${useWord(request.use!)} on ${MY_NAME}'s composition share, ${territoryLabel(request.territory)}. Other publishers answer for their own shares.`}
      confirm="Decline"
      destructive
      onCommit={() => decide(request, "Deny")}
    />
  );
}

/** The terms a counter offers, held by request until the partner answers — nothing is granted yet. */
export const COUNTERS = new Map<string, { territory: string; until?: Date; model: string; note: string }>();

/** A counter-offer: a narrower territory, a shorter window, another licence model. It grants nothing until accepted. */
export function CounterRequest({ request, ...held }: HeldBy & { request: Request }) {
  return (
    <FormDialog
      {...held}
      confirm="Send counter"
      draft={{
        territory: owed(Object.keys(TERRITORY_SETS).find((key) => territoryLabel(TERRITORY_SETS[key]!) === territoryLabel(request.territory)) ?? "World"),
        until: request.end ?? unanswered.date,
        model: owed<string>(request.licenceModel ?? "Flat"),
        note: unanswered.longtext,
      }}
      onCommit={(draft) => {
        COUNTERS.set(request.id, { territory: draft.territory, until: draft.until ?? undefined, model: draft.model, note: draft.note ?? "" });
        setRequestState(request.id, "Countered", decidedNow());
      }}
    >
      <Field as="choice" name="territory" label="Territory" options={Object.keys(TERRITORY_SETS).map((one) => ({ value: one, title: one }))} />
      <Field as="date" name="until" label="Until" help="Left blank, the window the partner asked for." />
      <Field
        as="choice"
        name="model"
        label="Licence model"
        options={[
          { value: "Flat", title: "Flat", description: "One fee for the term." },
          { value: "Dynamic", title: "Dynamic", description: "Paid on reported usage." },
        ]}
      />
      <Field as="longtext" name="note" label="Note to the partner" />
    </FormDialog>
  );
}

/** Harbor's own claim a conflict response is about — the one it can withdraw. */
const claimAtIssue = (request: Request) => {
  if (!request.about) return undefined;
  const conflict = conflictById(request.about);
  return conflict?.claims.map((id) => ASSERTIONS.find((one) => one.id === id)).find((one) => one?.partyId === ME && one.state !== "Superseded" && one.state !== "Withdrawn");
};

/**
 * What can be done with an inbox item, by its type (S4-3) — the same commands on its row and its
 * page. A decision taken leaves nothing to take again: each command then says why.
 */
export function requestCommands(request: Request): Command[] {
  const open = request.state === "Needs decision" || request.state === "Escalated";
  const done = `Decided: ${request.state.toLowerCase()}.`;
  if (request.type === "Licence")
    return [
      open ? { label: "Approve", dialog: <ApproveRequest request={request} /> } : { label: "Approve", unavailable: done },
      open ? { label: "Counter", dialog: <CounterRequest request={request} /> } : { label: "Counter", unavailable: done },
      open ? { label: "Decline", destructive: true, dialog: <DeclineRequest request={request} /> } : { label: "Decline", destructive: true, unavailable: done },
      { label: "Delegate", unavailable: "No delegate is set up for Harbor Music." },
    ];
  if (request.type === "Conflict response") {
    const claim = claimAtIssue(request);
    return [
      { label: "Respond with evidence", mark: "upload", opens: rightsHref("conflicts", request.about, "counterclaim") },
      claim && open
        ? {
            label: "Withdraw claim",
            destructive: true,
            dialog: <WithdrawClaimAndAnswer request={request} claim={claim} />,
          }
        : { label: "Withdraw claim", destructive: true, unavailable: open ? "Harbor Music has no standing claim in this conflict." : done },
    ];
  }
  return [{ label: "Open", opens: rightsHref("requests", request.id) }];
}

/** Withdrawing the claim answers the conflict response: the request is closed with it. */
function WithdrawClaimAndAnswer({ request, claim, ...held }: HeldBy & { request: Request; claim: Assertion }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`Harbor Music's ${formatPercent(claim.share)} claim (${claim.sourceRef}) is withdrawn, which answers this request. It stays on record as withdrawn.`}
      confirm="Withdraw"
      destructive
      onCommit={() => {
        withdrawClaim(claim);
        setRequestState(request.id, "Approved", { ...decidedNow(), authority: "Claim withdrawn" });
      }}
    />
  );
}

