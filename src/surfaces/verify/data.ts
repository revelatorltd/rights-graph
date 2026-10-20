import { PROOF, SIGNING_KEYS } from "../../graph/fixtures";
import type { ProofEvent } from "../../graph/model";
import { ISSUED, proofOf } from "../partner/data";

/**
 * What the Verification portal reads: the Proof Log's public side. An event is its type, its
 * opaque ids, its scope and use, its time and its hashes — nothing else leaves the private side
 * (S8-2). The batches, roots and timestamp tokens are derived here from the events the shared log
 * and the Partner portal hold; the registry archive adds the old on-chain records that were
 * imported (S8-4).
 */

const day = (year: number, month: number, date: number, hour = 0, minute = 0) => new Date(year, month - 1, date, hour, minute);

const hash = (seed: string, length = 64) => {
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  let out = "";
  while (out.length < length) {
    value = (Math.imul(value, 1103515245) + 12345) >>> 0;
    out += (value >>> 8).toString(16).padStart(6, "0");
  }
  return out.slice(0, length);
};

export { proofOf };

/** Every event this prototype can show, newest first. */
export const events = (): ProofEvent[] => [...PROOF, ...ISSUED].sort((one, other) => other.seq - one.seq);

/** A Merkle batch: every five minutes the log rolls its events into a tree, and an outside authority timestamps the root. */
export interface Batch {
  id: string;
  sealed: Date;
  root: string;
  /** How many events the tree holds — the log's, not only the ones shown here. */
  size: number;
  tsa: { token: string; authority: string; at: Date };
}

const FIVE_MINUTES = 5 * 60 * 1000;

export function batchOf(event: ProofEvent): Batch {
  const sealed = sealedOf(event.batch);
  const number = Number(event.batch.replace("mb-", "")) || 0;
  return {
    id: event.batch,
    sealed,
    root: hash(`root/${event.batch}`),
    size: 180 + (number % 97) * 11,
    tsa: { token: `tst_${hash(`tsa/${event.batch}`, 40)}`, authority: "RFC 3161 Time Stamping Authority (stand-in)", at: new Date(sealed.getTime() + 2000) },
  };
}

/** The sibling hashes that lead from an event to its batch's root — what an offline check recomputes. */
export const inclusionPath = (event: ProofEvent) => {
  const depth = Math.ceil(Math.log2(batchOf(event).size));
  return Array.from({ length: depth }, (_, index) => hash(`path/${event.seq}/${index}`));
};

/** The batches the shown events were sealed in, newest first. */
export function batches(): Batch[] {
  const seen = new Map<string, Batch>();
  for (const one of events()) if (!seen.has(one.batch)) seen.set(one.batch, batchOf(one));
  return [...seen.values()].sort((one, other) => other.sealed.getTime() - one.sealed.getTime());
}

/** A batch is sealed once, five minutes after the latest event it holds. */
const sealedOf = (batch: string) => {
  const held = events().filter((one) => one.batch === batch);
  const last = held.reduce((most, one) => (one.at > most ? one.at : most), new Date(0));
  return new Date(Math.ceil((last.getTime() + 1) / FIVE_MINUTES) * FIVE_MINUTES);
};

export const keyOf = (id: string) => SIGNING_KEYS.find((one) => one.id === id);

/** A public key, as it is published — what the offline check verifies a signature against. */
export const publicKeyOf = (id: string) => `ed25519:${hash(`public/${id}`, 64)}`;

// ---------------------------------------------------------------------------------------------
// The registry archive — S8-4

export interface ArchivedRecord {
  /** The old registry's own address for the asset. */
  owUri: string;
  /** The IMPORTED proof event that carries it now. */
  seq: number;
  tx: string;
  block: number;
  /** When the block was mined on the old chain. */
  minted: Date;
  /** The content address of the payload, recomputed on import. */
  cid: string;
  /** What kind of record it was on the old registry. */
  was: "Genesis record" | "Ownership snapshot" | "Credential";
  imported: Date;
  payloadHash: string;
}

const IMPORTED_AT = day(2026, 9, 1);

/** The imported events beyond the one the shared log already holds. */
const MORE_IMPORTED: readonly Omit<ArchivedRecord, "payloadHash" | "cid" | "imported">[] = [
  { owUri: "ow://asset/3c71-08de-55b2", seq: 613, tx: "0x2a9d4f7c61e0b8a3d5c2f1e09b8a7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b", block: 30551882, minted: day(2025, 11, 4, 16, 22), was: "Genesis record" },
  { owUri: "ow://asset/b604-71aa-0c3f", seq: 614, tx: "0x91be03c7d2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0", block: 31012477, minted: day(2026, 1, 19, 9, 5), was: "Ownership snapshot" },
  { owUri: "ow://credential/artist/88f2-1d0e", seq: 615, tx: "0x5f0e1d2c3b4a59687766554433221100ffeeddccbbaa99887766554433221100", block: 31407710, minted: day(2026, 4, 2, 13, 48), was: "Credential" },
];

export function archive(): ArchivedRecord[] {
  const shared = PROOF.filter((one) => one.type === "IMPORTED" && one.chain).map(
    (one): ArchivedRecord => ({
      owUri: one.chain!.owUri,
      seq: one.seq,
      tx: one.chain!.tx,
      block: one.chain!.block,
      minted: day(2026, 6, 28, 11, 40),
      cid: `bafy${hash(`cid/${one.chain!.owUri}`, 52)}`,
      was: "Ownership snapshot",
      imported: one.at,
      payloadHash: one.payloadHash,
    }),
  );
  const more = MORE_IMPORTED.map((one) => ({ ...one, cid: `bafy${hash(`cid/${one.owUri}`, 52)}`, imported: IMPORTED_AT, payloadHash: hash(`payload/${one.owUri}`) }));
  return [...shared, ...more];
}

/** An old address, as it is pasted — with or without its scheme, encoded or not. */
export function archivedBy(asked: string): ArchivedRecord | undefined {
  const wanted = asked.trim().toLowerCase();
  if (!wanted) return undefined;
  return archive().find((one) => one.owUri.toLowerCase() === wanted || one.owUri.toLowerCase().endsWith(`/${wanted}`) || one.tx.toLowerCase() === wanted);
}

/** An imported record's event, for the archive — the shared log's, or the one this archive adds. */
export function importedEvent(record: ArchivedRecord): ProofEvent {
  return (
    proofOf(String(record.seq)) ?? {
      seq: record.seq,
      type: "IMPORTED",
      subject: `ast_${hash(record.owUri, 8)}`,
      scope: record.was === "Credential" ? "Credential" : "Asset",
      at: record.imported,
      payloadHash: record.payloadHash,
      prevHash: hash(`event/${record.seq - 1}`),
      eventHash: hash(`event/${record.seq}`),
      keyId: "pl-ed25519-2026-07",
      batch: `mb-${Math.floor(record.seq / 40)}`,
      chain: { tx: record.tx, block: record.block, owUri: record.owUri },
    }
  );
}

/** An id as pasted: a receipt, an event number, or one of the archive's imported events. */
export function verify(asked: string): ProofEvent | undefined {
  const found = proofOf(asked);
  if (found) return found;
  const record = archive().find((one) => String(one.seq) === asked.trim());
  return record ? importedEvent(record) : undefined;
}
