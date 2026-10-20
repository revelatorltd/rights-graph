import { Badge, CollectionPage, type Command } from "@revelator/pro-ui";

import type { Credit } from "../../graph/model";
import { tierOf } from "../../graph/resolve";
import { TierChip } from "../../rights/kit";
import type { Shown } from "../surface";
import { assetById, creditsOf, outOfScope, type Reader } from "./data";
import { ConfirmCredit, DenyCredit } from "./dialogs";
import { assetMark } from "./marks";
import { assetHref } from "./place";

const STATES: readonly Credit["state"][] = ["To confirm", "Confirmed", "Denied"];

/** What can be done to one credit, from its row and from its page alike. */
export function creditCommands(reader: Reader, credit: Credit): Command[] {
  const why = outOfScope(reader, { kind: "credit" });
  if (why) return [{ label: "Confirm credit", unavailable: why }, { label: "Deny credit", unavailable: why }];
  return [
    credit.state === "Confirmed"
      ? { label: "Confirm credit", unavailable: "Confirmed and signed already." }
      : { label: "Confirm credit", mark: "check", dialog: <ConfirmCredit reader={reader} credit={credit} /> },
    credit.state === "Denied"
      ? { label: "Deny credit", unavailable: "Denied and signed already." }
      : { label: "Deny credit", mark: "prohibit", dialog: <DenyCredit reader={reader} credit={credit} /> },
  ];
}

/**
 * Credits (S3-3): every recording and work the reader is credited on, with the role, and the way to
 * confirm or deny each. A COLLECTION PAGE: the credits are a set read by where they stand — to
 * confirm first — and each row carries its own two commands. Confirming signs a role attestation,
 * which is what lets the asset's tier rise to T4; the tier shown is the graph's, read again after.
 */
function CreditsIndex({ reader }: { reader: Reader }) {
  return (
    <CollectionPage
      title="Credits"
      index={{
        rows: creditsOf(reader.subject.id),
        rowKey: (one) => one.id,
        noun: { one: "credit", many: "credits" },
        identity: {
          title: "Credited on",
          name: (one) => assetById(one.assetId).title,
          mark: (one) => assetMark(assetById(one.assetId)),
          opens: (one) => assetHref(one.assetId),
        },
        columns: [
          { name: "Role", value: (one) => one.role, cell: (one) => one.role },
          {
            name: "Status",
            value: (one) => STATES.indexOf(one.state),
            cell: (one) => <Badge status={`credit:${one.state}`} />,
            readings: ["All"],
          },
          // A work and a recording are two sides (G-3): the row says which it is.
          { name: "Side", value: (one) => (assetById(one.assetId).kind === "Work" ? "Composition" : "Master"), cell: (one) => (assetById(one.assetId).kind === "Work" ? "Composition" : "Master") },
          { name: "Credited as", value: (one) => one.credited, cell: (one) => one.credited },
          { name: "Tier", value: (one) => tierOf(one.assetId), cell: (one) => <TierChip tier={tierOf(one.assetId)} /> },
        ],
        readings: [
          { name: "To confirm", holds: (one) => one.state === "To confirm" },
          { name: "All", holds: () => true },
          { name: "Confirmed", holds: (one) => one.state === "Confirmed" },
          { name: "Denied", holds: (one) => one.state === "Denied" },
        ],
        commands: (one) => [{ label: "Open", opens: assetHref(one.assetId) }, ...creditCommands(reader, one)],
        empty: { none: "No recording or work credits you yet." },
      }}
    />
  );
}

export const creditsPage = (reader: Reader): Shown => ({
  place: { at: "Credits" },
  page: <CreditsIndex key={reader.persona} reader={reader} />,
});
