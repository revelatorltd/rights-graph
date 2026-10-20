import {
  Alert,
  Badge,
  CollectionPage,
  DetailPage,
  FactCard,
  Link,
  Metadata,
  Step,
  Stepper,
  TitledCard,
  formatMeta,
  type Command,
  type ShellPlace,
} from "@revelator/pro-ui";

import { ASSERTIONS, ATTESTATIONS, assetById, conflictById, partyById, partyName } from "../../../graph/fixtures";
import { COUNTERCLAIM_STEPS, type Conflict } from "../../../graph/model";
import { shareTotals, tierOf } from "../../../graph/resolve";
import { TerritoryChip, TierChip, decidedBy } from "../../../rights/kit";
import { assetMark } from "./catalogue";
import { RESPONSES, RespondWithEvidence, WithdrawClaim, canWithdraw } from "./conflict-dialogs";
import { LABEL, assetRightsHref, isParty, labelConflicts, rightsHref } from "./data";
import { exportCommand } from "./shared";

const SEVERITY = ["High", "Medium", "Low"] as const;

/** What the next step needs, said for the step the counterclaim is on (S1-13). */
const NEEDED: readonly string[] = [
  "Respond with evidence, or withdraw the claim.",
  "Sureel reviews the evidence submitted.",
  "The other party answers with evidence of its own.",
  "Sureel records the resolution and its reason.",
];

/** What the label may do with a conflict — saying why where it may not. */
function conflictCommands(conflict: Conflict): Command[] {
  if (conflict.state === "Resolved") return [{ label: "Respond", unavailable: "Resolved — nothing is open to answer." }];
  if (!isParty(conflict))
    return [{ label: "Respond", unavailable: "Kestrel Point is not a party: only the publishers who claim here can respond." }];
  return [
    { label: "Respond", mark: "upload", dialog: <RespondWithEvidence conflict={conflict} /> },
    canWithdraw(conflict)
      ? { label: "Withdraw claim", destructive: true, dialog: <WithdrawClaim conflict={conflict} /> }
      : {
          label: "Withdraw claim",
          destructive: true,
          unavailable: "The graph resolved Kestrel Point's claim here: respond with evidence instead.",
        },
  ];
}

const titleOf = (conflict: Conflict) => formatMeta([conflict.kind, assetById(conflict.assetId).title]) ?? conflict.kind;

/**
 * Conflicts (S1-9): every conflict on the label's catalogue — those it is party to, and those on
 * the works its recordings embody, which it reads but only the publishers answer. Ranked by what
 * they hold back, with severity, kind and side, each opening its conflict card.
 */
export function Conflicts({ narrowed }: { narrowed?: string }) {
  const rows = labelConflicts();
  return (
    <CollectionPage
      title="Conflicts"
      more={[exportCommand("Conflicts")]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "conflict", many: "conflicts" },
        identity: {
          title: "Conflict",
          name: titleOf,
          mark: (one) => assetMark(assetById(one.assetId)),
          opens: (one) => rightsHref("conflicts", one.id),
        },
        sort: { column: "Revenue at risk", direction: "descending" },
        columns: [
          { name: "Side", value: (one) => one.side, cell: (one) => one.side },
          { name: "Severity", value: (one) => SEVERITY.indexOf(one.severity), cell: (one) => one.severity },
          { name: "Revenue at risk", as: "money", value: (one) => one.revenueAtRisk },
          {
            name: "Territories",
            value: (one) => one.territories.join(", "),
            cell: (one) => <TerritoryChip set={{ include: one.territories.includes("World") ? "World" : one.territories }} />,
          },
          {
            name: "Parties",
            as: "entities",
            entity: "organization",
            noun: { one: "party", many: "parties" },
            value: (one) => one.parties.map(partyName),
          },
          { name: "Step", value: (one) => one.step, cell: (one) => COUNTERCLAIM_STEPS[one.step] },
          { name: "Opened", as: "date", value: (one) => one.opened },
          { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`conflict:${one.state}`} /> },
        ],
        readings: [
          { name: "Open", holds: (one) => one.state !== "Resolved" },
          { name: "Resolved", holds: (one) => one.state === "Resolved" },
          { name: "All", holds: () => true },
        ],
        filters: [
          { kind: "anyOf", key: "kind", label: "Kind", options: [...new Set(rows.map((one) => one.kind))], of: (one) => one.kind },
          { kind: "anyOf", key: "severity", label: "Severity", options: SEVERITY, of: (one) => one.severity },
          { kind: "anyOf", key: "side", label: "Side", options: ["Master", "Composition"], of: (one) => one.side },
          {
            kind: "switches",
            key: "standing",
            label: "Standing",
            switches: [
              { key: "party", label: "You can respond", holds: isParty, initially: narrowed === "respond" },
              { key: "at-risk", label: "Revenue at risk", holds: (one) => one.revenueAtRisk > 0, initially: narrowed === "at-risk" },
            ],
          },
        ],
        totals: [{ count: true }, { name: "Total at risk", as: "money", sum: (one) => (one.state === "Resolved" ? 0 : one.revenueAtRisk) }],
        commands: (one) => [{ label: "Open", opens: rightsHref("conflicts", one.id) }, ...conflictCommands(one)],
        empty: { none: "Nothing disagrees on the catalogue." },
      }}
    />
  );
}

/**
 * One conflict, as its card (FRD pattern 6): every party's claim with its source and tier, the
 * totals against 100%, what it holds back and how the graph pays meanwhile — and the counterclaim's
 * four steps, with what the next one needs (S1-13). The label responds with evidence or withdraws
 * its own claim (S1-9); it never resolves — Sureel does, with a reason.
 */
export function ConflictDetail({ id }: { id: string }) {
  const conflict = conflictById(id);
  const asset = assetById(conflict.assetId);
  const claims = ASSERTIONS.filter((one) => conflict.claims.includes(one.id));
  const unclaimed = conflict.parties.filter((party) => !claims.some((one) => one.partyId === party));
  const country = conflict.territories[0] ?? "World";
  const totals = shareTotals(asset.id, country === "World" ? "US" : country);
  const disputed =
    conflict.kind === "Attestation dispute"
      ? ATTESTATIONS.filter((one) => one.state === "Disputed" && conflict.parties.includes(one.onBehalfOf ?? one.attestor))
      : [];
  const response = RESPONSES.get(conflict.id);
  const commands = conflictCommands(conflict);
  const [respond, ...rest] = commands;
  const open = respond && !respond.unavailable && "dialog" in respond && respond.dialog ? respond : undefined;

  return (
    <DetailPage
      record={{
        mark: assetMark(asset),
        name: `${conflict.kind} on ${asset.title}`,
        kind: `${conflict.side} side`,
        status: `conflict:${conflict.state}`,
        facts: [
          { text: `${conflict.severity} severity` },
          { as: "money", label: "At risk", value: conflict.revenueAtRisk },
          { as: "date", label: "Opened", value: conflict.opened },
        ],
        actions: open ? [{ label: "Respond with evidence", primary: true, dialog: open.dialog! }] : [],
        more: [...(open ? rest : commands), ...(asset.kind === "Work" ? [] : [{ label: "Open rights", opens: assetRightsHref(asset) }])],
      }}
    >
      <Metadata>
        {conflict.resolution ? (
          <Alert intent="success" title="Resolved">
            {`${conflict.resolution.reason} ${decidedBy(conflict.resolution)}${conflict.resolution.rule ? ` · ${conflict.resolution.rule}` : ""}`}
          </Alert>
        ) : (
          <Alert intent="info" title="Meanwhile">
            {conflict.interim}
          </Alert>
        )}
        {isParty(conflict) ? null : (
          <Alert intent="info" title="Read only">
            Kestrel Point is not a party to this conflict. It sits on a work its recordings embody, so it is shown here; only the publishers
            who claim can respond.
          </Alert>
        )}
        <TitledCard title="Counterclaim">
          <Stepper>
            {COUNTERCLAIM_STEPS.map((label, index) => (
              <Step
                key={label}
                index={index + 1}
                label={label}
                state={conflict.state === "Resolved" || index < conflict.step ? "done" : index === conflict.step ? "current" : "todo"}
              />
            ))}
          </Stepper>
        </TitledCard>
        <FactCard
          title="Where it stands"
          facts={[
            { label: "Step", value: COUNTERCLAIM_STEPS[conflict.step] },
            { label: "Needed next", value: conflict.state === "Resolved" ? undefined : NEEDED[conflict.step] },
            { label: "Assigned to", value: conflict.assignee },
            { label: "Raised by", value: conflict.raisedBy },
            {
              label: "Territories",
              value: <TerritoryChip set={{ include: conflict.territories.includes("World") ? "World" : conflict.territories }} />,
            },
            { label: "Revenue at risk", as: "money", value: conflict.revenueAtRisk },
          ]}
        />
        {conflict.total !== undefined || ["Overclaim", "Gap", "Territory overlap"].includes(conflict.kind) ? (
          <FactCard
            title={`Shares against 100% in ${country}`}
            facts={[
              ...(conflict.total !== undefined ? [{ label: "Claimed in total", as: "rate" as const, value: conflict.total }] : []),
              ...totals.flatMap((one) => [
                { label: `${one.shareType} shares standing`, as: "rate" as const, value: one.total },
                ...(one.state === "Whole"
                  ? []
                  : [
                      {
                        label: one.state === "Overclaim" ? "Over 100% by" : "Short of 100% by",
                        as: "rate" as const,
                        value: Math.abs(one.total - 100),
                      },
                    ]),
              ]),
            ]}
          />
        ) : null}
        {claims.map((one) => (
          <FactCard
            key={one.id}
            title={one.partyId === LABEL ? `${partyName(one.partyId)} (you)` : partyName(one.partyId)}
            facts={[
              { label: "State", value: <Badge status={`claim:${one.state}`} /> },
              { label: "Interest", as: "list", value: one.interests },
              { label: "Share", as: "rate", value: one.share },
              { label: "Share of", value: one.shareOf },
              { label: "Rights", as: "list", value: typeof one.rights === "string" ? [one.rights] : one.rights },
              { label: "Territory", value: <TerritoryChip set={one.territory} /> },
              { label: "From", as: "date", value: one.from },
              { label: "To", as: "date", value: one.to },
              { label: "Source", value: one.source },
              { label: "Reference", value: one.sourceRef },
              { label: "Tier", value: <TierChip tier={tierOf(one.assetId)} /> },
              { label: "Known since", as: "date", value: one.known },
              { label: "Evidence", as: "list", value: one.evidence ?? [] },
            ]}
          />
        ))}
        {unclaimed.map((party) => (
          <FactCard
            key={party}
            title={partyName(party)}
            facts={[
              {
                label: "Claim",
                value:
                  conflict.kind === "Attestation dispute"
                    ? party === LABEL
                      ? "Its attestation, below"
                      : "Disputes the attestation, from the artist app"
                    : partyById(party).kind === "Contributor"
                      ? "Held in its own tenant: its terms are private to it and to Sureel under audit."
                      : "No claim on file here",
              },
            ]}
          />
        ))}
        {disputed.map((one) => (
          <FactCard
            key={one.id}
            title="Disputed attestation"
            facts={[
              { label: "State", value: <Badge status={`attestation:${one.state}`} /> },
              { label: "Claim", value: one.claim },
              { label: "Attested by", value: partyName(one.attestor) },
              { label: "On behalf of", value: one.onBehalfOf ? partyName(one.onBehalfOf) : undefined },
              { label: "Authority", value: one.authority },
              { label: "Issued", as: "date", grain: "minute", value: one.issued },
              {
                label: "Grant",
                value:
                  one.subject.kind === "Grant" ? (
                    <Link opens={rightsHref("consent", one.subject.id)}>Open the paused grant</Link>
                  ) : undefined,
              },
            ]}
          />
        ))}
        {response ? (
          <FactCard
            title="Your response"
            facts={[
              { label: "Statement", value: response.statement },
              { label: "Agreement", value: response.agreement },
              { label: "Evidence", value: response.evidence },
              { label: "Sent", as: "date", grain: "minute", value: response.at },
              { label: "By", value: response.by },
            ]}
          />
        ) : null}
      </Metadata>
    </DetailPage>
  );
}

/** Where one conflict's page is: under Conflicts, reached past the index. */
export const conflictPlace = (id: string): ShellPlace => {
  const conflict = conflictById(id);
  return {
    at: "Rights",
    page: "Conflicts",
    trail: [
      { label: "Rights", opens: rightsHref("overview") },
      { label: "Conflicts", opens: rightsHref("conflicts") },
      { label: conflict ? titleOf(conflict) : id },
    ],
  };
};
