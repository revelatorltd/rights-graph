import { Badge, CollectionPage, DetailPage, FactCard, Metadata, type Command } from "@revelator/pro-ui";

import { REQUESTS } from "../../graph/fixtures";
import type { Request } from "../../graph/model";
import { ClearanceBadge, TerritoryChip, decidedBy, partyMark } from "../../rights/kit";
import { EscalatedAlert } from "../notify/escalated";
import type { Shown } from "../surface";
import { inboxOf, isOpen, optOutOf, outOfScope, partyName, voiceAnswer, type Reader } from "./data";
import { ApproveRequest, DeclineRequest } from "./dialogs";
import { artistHref, requestHref } from "./place";

const STATES: readonly Request["state"][] = ["Needs decision", "Escalated", "Countered", "Approved", "Declined", "Auto-cleared"];

/** A request named by what it asks — the type, and the use where it is a licence. */
export const requestName = (one: Request) =>
  one.type === "Licence"
    ? `${one.use} licence for ${partyName(one.from)}`
    : one.type === "Delegate approval"
      ? `${one.use ?? "Approval"} on ${one.scope.name}`
      : `${one.type} — ${one.scope.name}`;

/**
 * What can be done to one request. A decision the reader cannot take says why, in place: a
 * delegate outside their scope, a Voice/NIL request the opt-out already refuses, a request decided.
 */
export function requestCommands(reader: Reader, one: Request): Command[] {
  const why =
    one.to !== reader.subject.id
      ? `${partyName(one.to)} answers this one — it reached you for your record.`
      : !isOpen(one)
      ? `${one.state} already${one.decided ? ` — ${decidedBy(one.decided)}` : ""}.`
      : outOfScope(reader, { kind: one.type === "Credit confirmation" ? "credit" : "request", use: one.use });
  const blocked = one.use === "Voice/NIL" && optOutOf(reader.subject.id) ? "Your AI opt-out refuses every Voice/NIL request." : undefined;
  return [
    why || blocked
      ? { label: "Approve", unavailable: (why ?? blocked)! }
      : { label: "Approve", mark: "check", dialog: <ApproveRequest reader={reader} request={one} /> },
    why ? { label: "Decline", unavailable: why } : { label: "Decline", mark: "prohibit", dialog: <DeclineRequest reader={reader} request={one} /> },
  ];
}

/**
 * The approval inbox (S4) in the artist app: every request that is the artist's to answer —
 * credit confirmations, and the Voice/NIL licences that are theirs and not the label's. Opens on
 * what still needs them; each row approves or declines where it stands, or opens the whole ask.
 */
function RequestsIndex({ reader }: { reader: Reader }) {
  return (
    <CollectionPage
      title="Requests"
      index={{
        rows: inboxOf(reader.subject.id),
        rowKey: (one) => one.id,
        noun: { one: "request", many: "requests" },
        identity: {
          title: "Request",
          name: requestName,
          mark: (one) => partyMark(one.from),
          opens: (one) => requestHref(one.id),
        },
        sort: { column: "Received", direction: "descending" },
        columns: [
          {
            name: "Status",
            value: (one) => STATES.indexOf(one.state),
            cell: (one) => <Badge status={`request:${one.state}`} />,
            readings: ["All", "Decided"],
          },
          { name: "From", value: (one) => partyName(one.from), cell: (one) => partyName(one.from) },
          { name: "Territory", value: (one) => (one.territory.include === "World" ? "World" : one.territory.include.join(", ")), cell: (one) => <TerritoryChip set={one.territory} /> },
          { name: "Deadline", as: "date", value: (one) => one.deadline },
          { name: "Received", as: "date", value: (one) => one.received },
          { name: "Decided by", value: (one) => (one.decided ? decidedBy(one.decided) : ""), cell: (one) => (one.decided ? decidedBy(one.decided) : null) },
        ],
        readings: [
          { name: "Needs you", holds: isOpen },
          { name: "Decided", holds: (one) => !isOpen(one) },
          { name: "All", holds: () => true },
        ],
        commands: (one) => [{ label: "Open", opens: requestHref(one.id) }, ...requestCommands(reader, one)],
        empty: { none: "Nobody has asked you anything yet. Requests from your label and from partners arrive here." },
      }}
    />
  );
}

export const requestsPage = (reader: Reader): Shown => ({
  place: { at: "Home", page: "Requests" },
  page: <RequestsIndex key={reader.persona} reader={reader} />,
});

/**
 * One request, whole (S4-2): who asks, for what, where, when, by when — nothing needed for the
 * decision more than this page away — and what the graph answers for it now.
 */
function RequestBody({ reader, request }: { reader: Reader; request: Request }) {
  const commands = requestCommands(reader, request);
  const answer = request.use === "Voice/NIL" ? voiceAnswer(reader.subject.id, request.from) : undefined;
  const ready = commands[0]!.dialog;
  return (
    <DetailPage
      record={{
        mark: partyMark(request.from),
        name: requestName(request),
        kind: request.type,
        status: `request:${request.state}`,
        facts: [
          { text: `From ${partyName(request.from)}` },
          { label: "Deadline", as: "date", value: request.deadline },
        ],
        actions: ready ? [{ label: "Approve", primary: true, dialog: ready }] : undefined,
        more: ready ? commands.slice(1) : commands,
      }}
    >
      <Metadata>
        <EscalatedAlert request={request} />
        <FactCard
          title="What they ask"
          facts={[
            { label: "Requester", value: partyName(request.from) },
            { label: "Why", value: request.purpose },
            { label: "Use", value: request.use ?? null },
            { label: "Side", value: request.side ?? null },
            { label: "Scope", value: request.scope.name },
            { label: "Assets", as: "count", value: request.scope.assets },
            { label: "Territory", value: <TerritoryChip set={request.territory} /> },
            { label: "From", as: "date", value: request.start },
            { label: "Until", as: "date", value: request.end ?? null },
            { label: "Answer by", as: "date", value: request.deadline },
            { label: "Received", as: "date", value: request.received, grain: "minute" },
          ]}
        />
        <FactCard
          title="Decision"
          facts={[
            { label: "Status", value: <Badge status={`request:${request.state}`} /> },
            { label: "Decided by", value: request.decided ? decidedBy(request.decided) : null },
          ]}
        />
        {answer ? (
          <FactCard
            title="What the graph answers now"
            facts={[
              { label: "Voice/NIL", value: <ClearanceBadge state={answer.state} /> },
              { label: "Why", value: answer.reason },
              { label: "Decided at", value: answer.decidedAt },
            ]}
          />
        ) : null}
      </Metadata>
    </DetailPage>
  );
}

export function requestPage(reader: Reader, id: string): Shown {
  const request = REQUESTS.find((one) => one.id === id && (one.to === reader.subject.id || one.scope.ref === reader.subject.id)) ?? inboxOf(reader.subject.id)[0];
  if (!request) return requestsPage(reader);
  return {
    place: {
      at: "Home",
      page: requestName(request),
      trail: [
        { label: "Requests", opens: artistHref("requests") },
        { label: requestName(request) },
      ],
    },
    page: <RequestBody key={`${reader.persona}/${request.id}`} reader={reader} request={request} />,
  };
}
