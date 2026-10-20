import {
  Alert,
  Badge,
  CollectionPage,
  DetailPage,
  Explained,
  FactCard,
  Link,
  Metadata,
  Slot,
  SlotItem,
  Text,
  TitledCard,
  formatDate,
  formatRange,
  type ShellPlace,
} from "@revelator/pro-ui";

import {
  ATTESTATIONS,
  CONFLICTS,
  CREDITS,
  GRANTS,
  TODAY,
  assetById,
  conflictById,
  grantById,
  partyName,
  REQUESTS,
} from "../../../graph/fixtures";
import type { Request } from "../../../graph/model";
import { clearanceOf, territoryLabel } from "../../../graph/resolve";
import { ClearanceBadge, TerritoryChip, decidedBy, partyMark } from "../../../rights/kit";
import { assetMark } from "./catalogue";
import { ANSWERS, DELEGATIONS, LABEL, assetsIn, grantName, labelRequests, rightsHref, scopeLine, waiting, useText } from "./data";
import { approveBlocked, requestCommands } from "./request-dialogs";
import { exportCommand, labelActivity } from "./shared";

/** The party on the other side of a request, from the label's seat. */
const counterpart = (one: Request) => (one.from === LABEL ? one.to : one.from);

/** What a request asks, in the words a card's title takes. */
export function askOf(one: Request) {
  if (one.type === "Licence") return `${one.use} for ${partyName(one.from)}`;
  if (one.type === "Conflict response") return `Conflict response on ${one.scope.name}`;
  if (one.type === "Credit confirmation") return `Credit confirmation by ${partyName(one.to)}`;
  if (one.type === "Attestation") {
    const claim = ATTESTATIONS.find((each) => each.id === one.about)?.claim;
    return `${claim ?? one.use ?? "Attestation"} signature from ${partyName(one.to)}`;
  }
  return `Delegate approval by ${partyName(one.from)}`;
}

/** The grant a licence request was answered with, or cleared by. */
function grantFor(one: Request) {
  if (one.clearedBy) return grantById(one.clearedBy);
  return GRANTS.find(
    (grant) =>
      grant.level === one.scope.level &&
      grant.ref === one.scope.ref &&
      grant.use === one.use &&
      grant.partners.ids.includes(one.from) &&
      grant.grantedBy === LABEL,
  );
}

/**
 * Requests (S1-8, and the label's S4 inbox): every licence request a partner sent, every conflict
 * Sureel asks the label to answer, and the credit and attestation requests the label sent its
 * artists. One card shape for every type (FRD pattern 8): the requester, what and where, the term,
 * the deadline; the actions follow the type.
 *
 * A COLLECTION PAGE whose readings are where each request stands — what needs a decision first.
 * A request a standing grant cleared needs nobody: it is a reading, and a line of the history
 * behind the header's timeline control.
 */
export function Requests() {
  const rows = labelRequests();
  return (
    <CollectionPage
      title="Requests"
      more={[exportCommand("Requests")]}
      activity={labelActivity()}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "request", many: "requests" },
        identity: {
          title: "Request",
          name: askOf,
          mark: (one) => partyMark(counterpart(one)),
          opens: (one) => rightsHref("requests", one.id),
        },
        sort: { column: "Received", direction: "descending" },
        searchBy: ["Request", "Scope", "Reference"],
        columns: [
          { name: "Reference", as: "identifier", standard: "id", value: (one) => one.id.toUpperCase(), hidden: true },
          { name: "Type", value: (one) => one.type, cell: (one) => one.type },
          { name: "Scope", value: (one) => one.scope.name, cell: (one) => scopeLine(one.scope.level, one.scope.name) },
          { name: "Territory", value: (one) => territoryLabel(one.territory), cell: (one) => <TerritoryChip set={one.territory} /> },
          { name: "Term", value: (one) => one.start.getTime(), cell: (one) => formatRange(one.start, one.end ?? null, "day") },
          { name: "Deadline", as: "date", value: (one) => one.deadline },
          { name: "Received", as: "date", grain: "minute", value: (one) => one.received },
          { name: "Delegated to", value: (one) => DELEGATIONS.get(one.id)?.to ?? "", cell: (one) => DELEGATIONS.get(one.id)?.to },
          { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`request:${one.state}`} /> },
        ],
        readings: [
          { name: "Needs decision", holds: waiting },
          { name: "Sent", holds: (one) => one.from === LABEL },
          { name: "Auto-cleared", holds: (one) => one.state === "Auto-cleared" },
          { name: "Decided", holds: (one) => one.to === LABEL && ["Approved", "Declined", "Countered"].includes(one.state) },
          { name: "All", holds: () => true },
        ],
        filters: [
          { kind: "anyOf", key: "type", label: "Type", options: [...new Set(rows.map((one) => one.type))], of: (one) => one.type },
          {
            kind: "anyOf",
            key: "use",
            label: "Use",
            options: [...new Set(rows.flatMap((one) => (one.use ? [one.use] : [])))],
            of: (one) => one.use ?? null,
          },
          {
            kind: "anyOf",
            key: "from",
            label: "Requester",
            entity: "organization",
            noun: { one: "requester", many: "requesters" },
            options: [...new Set(rows.map((one) => partyName(one.from)))],
            of: (one) => partyName(one.from),
          },
        ],
        commands: (one) => requestCommands(one),
        empty: { holder: "this inbox" },
      }}
    />
  );
}

/**
 * One request, as an approval card (FRD pattern 8): who asks, for what, where and when, by when —
 * everything the decision needs one tap away (S4-2) — and the actions its type has. Beside it, what
 * the graph answers now for every asset in its scope, so the decision is taken against the answer.
 */
export function RequestDetail({ id }: { id: string }) {
  const request = REQUESTS.find((one) => one.id === id)!;
  const commands = requestCommands(request).filter((one) => one.label !== "Open");
  const [first, ...rest] = commands;
  const primary = first && !first.unavailable && waiting(request) ? first : undefined;
  const grant = request.type === "Licence" ? grantFor(request) : undefined;
  const dispute =
    grant?.state === "Paused"
      ? CONFLICTS.find((one) => one.kind === "Attestation dispute" && one.state !== "Resolved" && one.parties.includes(request.scope.ref))
      : undefined;
  const assets = assetsIn(request.scope.level, request.scope.ref).filter((one) => one.kind !== "Release");
  const delegated = DELEGATIONS.get(request.id);
  const answered = ANSWERS.get(request.id);
  const credit = request.type === "Credit confirmation" && request.about ? CREDITS.find((one) => one.id === request.about) : undefined;
  const attestation = request.type === "Attestation" && request.about ? ATTESTATIONS.find((one) => one.id === request.about) : undefined;
  // Read on the day the term starts, where it starts later: a grant for it is not live before.
  const asOf = request.start > TODAY ? request.start : TODAY;
  const conflict = request.type === "Conflict response" && request.about ? conflictById(request.about) : undefined;

  return (
    <DetailPage
      record={{
        mark: partyMark(counterpart(request)),
        name: askOf(request),
        kind: request.type,
        status: `request:${request.state}`,
        facts: [
          { identifier: request.id.toUpperCase(), standard: "id" },
          { as: "date", label: "Deadline", value: request.deadline },
          { text: scopeLine(request.scope.level, request.scope.name) },
        ],
        actions: primary && "dialog" in primary && primary.dialog ? [{ label: primary.label, primary: true, dialog: primary.dialog }] : [],
        more: primary ? rest : commands,
      }}
    >
      <Metadata>
        {request.state === "Escalated" ? (
          <Alert intent="warn" title="Escalated">
            {request.from === LABEL
              ? `${partyName(request.to)} has not answered since ${formatDate(request.received, "day")}; past its deadline of ${formatDate(request.deadline, "day")} it moved to the next role on their side. You still see it as the one who sent it.`
              : `Unanswered past its deadline of ${formatDate(request.deadline, "day")}, it moved up to Kestrel Point's label admins. You still see it as its original owner.`}
          </Alert>
        ) : null}
        {request.state === "Auto-cleared" && grant ? (
          <Alert intent="info" title="Cleared by a standing grant">
            {`${useText(grant.use)} at ${grant.level.toLowerCase()} level, for ${grant.partners.ids.map(partyName).join(", ") || "approved partners"} — logged, with nothing to decide. `}
            <Link opens={rightsHref("consent", grant.id)}>Open the grant</Link>
          </Alert>
        ) : null}
        {dispute && grant ? (
          <Alert intent="warn" title="Approved, then disputed">
            {`${partyName(request.scope.ref)} disputed the attestation the label made on their behalf. The grant to ${partyName(request.from)} is paused pending Sureel's review — not revoked. `}
            <Link opens={rightsHref("conflicts", dispute.id)}>Open the dispute</Link>
          </Alert>
        ) : null}
        {waiting(request) && approveBlocked(request) ? (
          <Alert intent="danger" title="Cannot be approved">
            {approveBlocked(request)}
          </Alert>
        ) : null}
        <FactCard
          title="Request"
          facts={[
            { label: "Requester", value: partyName(request.from) },
            { label: "For", value: partyName(request.to) },
            { label: "Use", value: request.use },
            { label: "Side", value: request.side },
            { label: "Scope", value: scopeLine(request.scope.level, request.scope.name) },
            { label: "Assets", as: "count", value: request.scope.assets },
            { label: "Territory", value: <TerritoryChip set={request.territory} /> },
            { label: "Starts", as: "date", value: request.start },
            { label: "Ends", as: "date", value: request.end },
            { label: "Deadline", as: "date", value: request.deadline },
            { label: "Received", as: "date", grain: "minute", value: request.received },
            { label: "Licence model", value: request.licenceModel },
            { label: "Purpose", value: request.purpose },
          ]}
        />
        {request.decided ? (
          <FactCard
            title="Decision"
            facts={[
              { label: "Answer", value: <Badge status={`request:${request.state}`} /> },
              { label: "Decided by", value: decidedBy(request.decided) },
              { label: "Grant", value: grant ? <Link opens={rightsHref("consent", grant.id)}>{grantName(grant)}</Link> : undefined },
              ...(answered ? [{ label: "Note", value: answered.note }] : []),
              ...(answered?.counter
                ? [
                    { label: "Counter territory", value: <TerritoryChip set={answered.counter.territory} /> },
                    { label: "Counter ends", as: "date" as const, value: answered.counter.end },
                    { label: "Counter model", value: answered.counter.model },
                  ]
                : []),
            ]}
          />
        ) : null}
        {delegated ? (
          <FactCard
            title="Delegated"
            facts={[
              { label: "To", value: delegated.to },
              { label: "At", as: "date", grain: "minute", value: delegated.at },
              { label: "Note", value: delegated.note },
            ]}
          />
        ) : null}
        {conflict ? (
          <FactCard
            title="Conflict"
            facts={[
              { label: "Kind", value: <Link opens={rightsHref("conflicts", conflict.id)}>{conflict.kind}</Link> },
              { label: "State", value: <Badge status={`conflict:${conflict.state}`} /> },
              { label: "Revenue at risk", as: "money", value: conflict.revenueAtRisk },
              { label: "Meanwhile", value: conflict.interim },
            ]}
          />
        ) : null}
        {credit ? (
          <FactCard
            title="Credit"
            facts={[
              { label: "Credited", value: credit.credited },
              { label: "Role", value: credit.role },
              { label: "On", value: assetById(credit.assetId).title },
              { label: "State", value: <Badge status={`credit:${credit.state}`} /> },
            ]}
          />
        ) : null}
        {attestation ? (
          <FactCard
            title="Attestation"
            facts={[
              { label: "Claim", value: attestation.claim },
              { label: "Recorded by", value: partyName(attestation.attestor) },
              { label: "Authority", value: attestation.authority },
              { label: "State", value: <Badge status={`attestation:${attestation.state}`} /> },
            ]}
          />
        ) : null}
        {request.use && assets.length ? (
          <TitledCard title={`What the graph answers on ${formatDate(asOf, "day")}`} count={assets.length}>
            <Slot layout="list">
              {assets.map((asset) => {
                const answer = clearanceOf(asset.id, request.use!, {
                  partner: request.type === "Licence" ? request.from : undefined,
                  country: request.territory.include === "World" ? "US" : request.territory.include[0],
                  at: asOf,
                });
                return (
                  <SlotItem
                    key={asset.id}
                    opens={rightsHref("clearances", asset.id)}
                    trail={
                      <Explained why={`Decided at ${answer.decidedAt.toLowerCase()} level. ${answer.reason}`}>
                        <ClearanceBadge state={answer.state} />
                      </Explained>
                    }
                  >
                    {assetMark(asset)}
                    <Text kind="title">{asset.title}</Text>
                  </SlotItem>
                );
              })}
            </Slot>
          </TitledCard>
        ) : null}
      </Metadata>
    </DetailPage>
  );
}

/** Where one request's page is: under Requests, reached past the inbox. */
export const requestPlace = (id: string): ShellPlace => {
  const request = REQUESTS.find((one) => one.id === id);
  return {
    at: "Rights",
    page: "Requests",
    trail: [
      { label: "Rights", opens: rightsHref("overview") },
      { label: "Requests", opens: rightsHref("requests") },
      { label: request ? askOf(request) : id.toUpperCase() },
    ],
  };
};
