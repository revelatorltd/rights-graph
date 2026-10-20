import { Alert, CollectionPage } from "@revelator/pro-ui";

import { PROOF, SIGNING_KEYS } from "../../graph/fixtures";
import type { ProofEvent } from "../../graph/model";
import type { Shown } from "../surface";

const TYPES: readonly ProofEvent["type"][] = [
  "GENESIS",
  "OWNERSHIP_SNAPSHOT",
  "CLEARANCE_GRANTED",
  "CLEARANCE_RECEIPT",
  "ATTESTATION_SIGNED",
  "CONFLICT_OPENED",
  "CONFLICT_RESOLVED",
  "SETTLEMENT",
  "SUPERSEDE",
  "IMPORTED",
];

/**
 * The Proof Log, read-only — the hash chain every resolution, grant and receipt is written to.
 * Each event carries the hash of the one before it; nothing here can be changed, only read, and an
 * auditor checks the same events in the verification portal (S8) without an account.
 */
export function ProofPage(): Shown {
  return {
    place: { at: "Proof log" },
    page: (
      <CollectionPage
        title="Proof log"
        index={{
          rows: PROOF,
          rowKey: (one) => String(one.seq),
          noun: { one: "event", many: "events" },
          identity: { title: "Event", name: (one) => one.type, value: (one) => one.seq },
          sort: { column: "At", direction: "descending" },
          searchBy: ["Event", "Subject", "Receipt"],
          note: (
            <Alert intent="info" title="Append-only">
              {`Signed with ${SIGNING_KEYS[0]!.algorithm} keys, rotated and never withdrawn. Each event's hash covers its payload and the hash before it.`}
            </Alert>
          ),
          columns: [
            { name: "Sequence", as: "count", value: (one) => one.seq },
            { name: "Subject", as: "identifier", standard: "id", value: (one) => one.subject },
            { name: "Scope", value: (one) => one.scope ?? "", cell: (one) => one.scope ?? null },
            { name: "Use", value: (one) => one.use ?? "", cell: (one) => one.use ?? null },
            { name: "At", as: "date", grain: "minute", value: (one) => one.at },
            { name: "Receipt", as: "identifier", standard: "id", value: (one) => one.receipt },
            { name: "Event hash", as: "identifier", standard: "id", value: (one) => one.eventHash },
            { name: "Previous hash", as: "identifier", standard: "id", value: (one) => one.prevHash },
            { name: "Key", as: "identifier", standard: "id", value: (one) => one.keyId },
            { name: "Batch", as: "identifier", standard: "id", value: (one) => one.batch },
          ],
          filters: [{ kind: "anyOf", key: "type", label: "Event type", options: TYPES, of: (one) => one.type }],
          totals: [{ count: true }, { name: "Receipts", count: (one) => Boolean(one.receipt) }],
        }}
      />
    ),
  };
}
