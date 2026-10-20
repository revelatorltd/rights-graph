import { TODAY, partyName } from "../../graph/fixtures";
import { GRAPH_VERSION, RULE_VERSION } from "../../graph/resolve";
import type { Use } from "../../graph/model";
import { opaqueOf, proofOf, territoryName, type Snapshot } from "./data";
import { download } from "./working";

/**
 * A signed receipt, as the partner keeps it (S6-6): the answer it was given, the reasons per side,
 * and the proof event that seals it — which the Verification portal checks without an account.
 * The receipt is the partner's own evidence and so names the holders; the public portal shows
 * none of it, only the event's type, opaque ids, scope, use, time and hashes (S8-2).
 */
export function downloadReceipt(receipt: string, given: { assetId: string; use: Use; country: string; asked: Date; answer: Snapshot; partner: string }) {
  const event = proofOf(receipt);
  download(`${receipt}.json`, {
    receipt,
    issuedTo: partyName(given.partner),
    subject: opaqueOf(given.assetId),
    use: given.use,
    territory: territoryName(given.country),
    askedAt: given.asked,
    answer: given.answer,
    resolver: { rule: RULE_VERSION, graph: GRAPH_VERSION },
    proof: event
      ? {
          event: event.seq,
          type: event.type,
          payloadHash: event.payloadHash,
          prevHash: event.prevHash,
          eventHash: event.eventHash,
          batch: event.batch,
          key: event.keyId,
        }
      : null,
    signature: { algorithm: "Ed25519", key: event?.keyId, value: `sig_${event?.eventHash.slice(0, 48) ?? ""}` },
    verify: `#/verify/${receipt}`,
    downloaded: TODAY,
  });
}
