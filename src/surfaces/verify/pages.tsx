import { useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  CollectionPage,
  DetailPage,
  EmptyState,
  FactCard,
  Field,
  FormDialog,
  Metadata,
  UploaderDocument,
  WayOut,
  owed,
  type HeldBy,
} from "@revelator/pro-ui";

import { SIGNING_KEYS } from "../../graph/fixtures";
import type { ProofEvent } from "../../graph/model";
import { go, href } from "../../route";
import { ChosenRow, SampleFiles, type Chosen } from "../../rights/file-parts";
import { checkReceipt, downloadJson, proofBundle, readFile } from "../../rights/files";
import { archive, archivedBy, batchOf, batches, importedEvent, inclusionPath, keyOf, proofOf, publicKeyOf, type ArchivedRecord, type Batch } from "./data";

export const verifyHref = (...path: (string | undefined)[]) => href("verify", ...path);

/** What each event type is called on the page — the log's own name is kept beside it. */
const TYPE: Record<ProofEvent["type"], string> = {
  GENESIS: "Genesis record",
  OWNERSHIP_SNAPSHOT: "Ownership snapshot",
  CLEARANCE_GRANTED: "Clearance granted",
  CLEARANCE_RECEIPT: "Clearance receipt",
  ATTESTATION_SIGNED: "Attestation signed",
  CONFLICT_OPENED: "Conflict opened",
  CONFLICT_RESOLVED: "Conflict resolved",
  SETTLEMENT: "Settlement",
  SUPERSEDE: "Correction",
  IMPORTED: "Imported from the on-chain registry",
};

/** What this page shows of any event, and what it never shows — said on every event (S8-2). */
const SHOWN =
  "Only the event's type, its opaque IDs, its scope and use, its time and its hashes. Amounts, attribution percentages and private terms never leave the private side — for any event, to anyone.";

/**
 * A receipt or an event ID, pasted — the one thing a visitor brings. No account: the answer is the
 * Proof Log's, and anyone may ask it (FRD S8, F6 step 2).
 */
export function VerifyDialog(held: HeldBy) {
  return (
    <FormDialog {...held} confirm="Verify" draft={{ id: owed.text }} onCommit={(draft) => go(verifyHref(encodeURIComponent(draft.id.trim())))}>
      <Field as="text" name="id" label="Receipt or event ID" help="A receipt reads like rcpt_7Q2M-9F4K-CD7A; an event ID is a number, like 612." />
    </FormDialog>
  );
}

/** Asked of the old registry: an owAssetUri, or the transaction that wrote it. */
export function ArchiveDialog(held: HeldBy) {
  return (
    <FormDialog {...held} confirm="Find" draft={{ uri: owed.text }} onCommit={(draft) => go(verifyHref("archive", encodeURIComponent(draft.uri.trim())))}>
      <Field as="text" name="uri" label="owAssetUri or transaction hash" help="As the old registry wrote it — ow://asset/9b2f-44c1-a7e0, or its 0x transaction hash." />
    </FormDialog>
  );
}

/**
 * The bundle an auditor keeps (S8-3): the event's public fields, the path to its batch's root,
 * the timestamp token and the public key — enough to check it with no network and no account.
 */
export function downloadBundle(event: ProofEvent) {
  const batch = batchOf(event);
  const key = keyOf(event.keyId);
  downloadJson(
    `proof-${event.receipt ?? event.seq}.json`,
    proofBundle({
      event: {
        seq: event.seq,
        type: event.type,
        subject: event.subject,
        scope: event.scope,
        use: event.use,
        at: event.at,
        receipt: event.receipt,
        payloadHash: event.payloadHash,
        prevHash: event.prevHash,
        eventHash: event.eventHash,
        chain: event.chain,
      },
      signature: { key: event.keyId, algorithm: key?.algorithm, publicKey: publicKeyOf(event.keyId), value: `sig_${event.eventHash.slice(0, 48)}` },
      inclusion: { batch: batch.id, root: batch.root, path: inclusionPath(event) },
      timestamp: batch.tsa,
      check: [
        "Hash the payload you hold (RFC 8785 canonical JSON, SHA-256): it must equal payloadHash.",
        "Verify the signature over eventHash with the public key.",
        "Fold eventHash up the inclusion path: it must reach the batch root.",
        "Verify the RFC 3161 token over the root: it proves the root existed at its time.",
      ],
    }),
  );
}

/** What a receipt file came to, checked against the log. */
interface Checked {
  event?: ProofEvent;
  intact?: boolean;
  problem?: string;
}

/** A receipt file read and checked: its digest recomputed, its event found in the log, its event hash the log's. */
async function checkFile(file: File): Promise<Checked> {
  try {
    const said = await checkReceipt(await readFile(file));
    const event = proofOf(said.receipt ?? String(said.event ?? ""));
    if (!event) return { problem: `The Proof Log holds no event for ${said.receipt ?? said.event ?? "what this file names"}.` };
    if (said.eventHash && said.eventHash !== event.eventHash) return { event, problem: "The event hash in the file is not the one the log holds for this event." };
    if (said.intact === false) return { event, intact: false, problem: "The file was changed after it was issued: its digest no longer matches what it holds." };
    return { event, intact: said.intact };
  } catch {
    return { problem: "Not a receipt or proof bundle: the file is not the JSON either is written as." };
  }
}

/**
 * A receipt file brought instead of pasted — the file a partner kept (S8, F6 step 2). It is read
 * here, never sent: its digest is recomputed over what it holds now, its event found in the log
 * and its event hash compared. Verified, the event's page opens.
 */
export function VerifyFileDialog(held: HeldBy) {
  const [file, setFile] = useState<Chosen | null>(null);
  const [checked, setChecked] = useState<Checked | null>(null);
  const take = (picked: File | undefined) => {
    setChecked(null);
    if (!picked) return setFile(null);
    setFile({ name: picked.name, size: picked.size, reading: true });
    void checkFile(picked).then((result) => {
      setChecked(result);
      setFile({ name: picked.name, size: picked.size, refused: result.problem });
    });
  };
  return (
    <FormDialog
      {...held}
      confirm="Open the event"
      onClose={() => {
        setFile(null);
        setChecked(null);
      }}
      ready={() => Boolean(checked?.event && !checked.problem)}
      onCommit={() => go(verifyHref(encodeURIComponent(checked!.event!.receipt ?? String(checked!.event!.seq))))}
    >
      <UploaderDocument multiple={false} noun={{ one: "receipt file", many: "receipt files" }} formats="JSON" accept=".json" onSelect={(files) => take(files[0])}>
        {file ? <ChosenRow chosen={file} onRemove={() => take(undefined)} /> : null}
      </UploaderDocument>
      {checked?.event && !checked.problem ? (
        <Alert intent="success" title="The file matches the log">
          {`Event ${checked.event.seq}, ${TYPE[checked.event.type]}: ${checked.intact ? "its digest holds over every field, and " : ""}its event hash is the one the Proof Log holds.`}
        </Alert>
      ) : null}
      <SampleFiles
        samples={[
          { name: "receipt_sample.json", label: "Download a sample receipt" },
          { name: "receipt_sample_altered.json", label: "Download an altered receipt" },
        ]}
      />
    </FormDialog>
  );
}

/** The public transparency log: every batch's root and the token that timestamps it. Where a visitor lands. */
export function Batches() {
  return (
    <CollectionPage
      title="Proof batches"
      actions={[{ label: "Verify a receipt", primary: true, mark: "verified", dialog: <VerifyDialog /> }]}
      more={[{ label: "Verify a receipt file", mark: "upload", dialog: <VerifyFileDialog /> }]}
      index={{
        rows: batches(),
        rowKey: (one) => one.id,
        noun: { one: "batch", many: "batches" },
        note: "Every five minutes the Proof Log rolls its events into a Merkle tree, and an outside authority timestamps the root. Paste a receipt to see the event it proves.",
        identity: { title: "Batch", name: (one) => one.id, as: "reference" },
        sort: { column: "Sealed", direction: "descending" },
        columns: [
          { name: "Sealed", as: "date", grain: "minute", value: (one) => one.sealed },
          { name: "Events", as: "count", value: (one) => one.size },
          { name: "Root", as: "identifier", standard: "id", value: (one) => one.root },
          { name: "Timestamp token", as: "identifier", standard: "id", value: (one) => one.tsa.token },
        ],
        commands: (one: Batch) => [{ label: "Download root and token", opens: () => downloadJson(`${one.id}.json`, one) }],
        chooser: false,
      }}
    />
  );
}

/** The keys that have signed the log — rotated, never withdrawn, each a download for the offline check. */
export function Keys() {
  return (
    <CollectionPage
      title="Signing keys"
      index={{
        rows: SIGNING_KEYS,
        rowKey: (one) => one.id,
        noun: { one: "key", many: "keys" },
        identity: { title: "Key", name: (one) => one.id, as: "reference" },
        columns: [
          { name: "Algorithm", value: (one) => one.algorithm, cell: (one) => one.algorithm },
          { name: "Fingerprint", as: "identifier", standard: "id", value: (one) => one.fingerprint },
          { name: "Signs from", as: "date", value: (one) => one.from },
          { name: "Until", as: "date", value: (one) => one.to },
        ],
        commands: (one) => [{ label: "Download public key", opens: () => downloadJson(`${one.id}.pub.json`, { ...one, publicKey: publicKeyOf(one.id) }) }],
        chooser: false,
      }}
    />
  );
}

/**
 * One event, verified: what it is, that its hashes hold, who signed it and when its batch was
 * timestamped. Read by an auditor with no account; it shows nothing a private record holds.
 */
export function EventDetail({ event }: { event: ProofEvent }) {
  const batch = batchOf(event);
  const key = keyOf(event.keyId);
  const archived = event.chain ? archivedBy(event.chain.owUri) : undefined;
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="document" name={TYPE[event.type]} />,
        name: event.receipt ?? `Event ${event.seq}`,
        status: "verification:Verified",
        facts: [
          { text: TYPE[event.type] },
          { identifier: String(event.seq), standard: "id" },
          { as: "date", value: event.at, grain: "minute", label: "Recorded" },
        ],
        actions: [{ label: "Download proof bundle", primary: true, opens: () => downloadBundle(event) }],
        more: [
          { label: "Verify another", mark: "verified", dialog: <VerifyDialog /> },
          { label: "Verify a receipt file", mark: "upload", dialog: <VerifyFileDialog /> },
        ],
      }}
    >
      <Metadata>
        <Alert intent="info" title="What this page shows">
          {SHOWN}
        </Alert>
        <FactCard
          title="Event"
          facts={[
            { label: "Type", value: TYPE[event.type] },
            { label: "Log type", value: event.type, standard: "id" },
            { label: "Subject", value: event.subject, standard: "id" },
            { label: "Scope", value: event.scope },
            { label: "Use", value: event.use },
            { label: "Recorded", as: "date", value: event.at, grain: "minute" },
            { label: "Receipt", value: event.receipt, standard: "id" },
          ]}
        />
        <FactCard
          title="Integrity"
          facts={[
            { label: "Status", value: <Badge status="verification:Verified" /> },
            { label: "Payload hash", value: event.payloadHash, standard: "id" },
            { label: "Previous event hash", value: event.prevHash, standard: "id" },
            { label: "Event hash", value: event.eventHash, standard: "id" },
            { label: "Chain", value: "Intact — the event hash covers the event before it; an edit or a deletion would break it." },
          ]}
        />
        <FactCard
          title="Signature"
          facts={[
            { label: "Signing key", value: event.keyId, standard: "id" },
            { label: "Algorithm", value: key?.algorithm },
            { label: "Fingerprint", value: key?.fingerprint, standard: "id" },
            { label: "Key signs from", as: "date", value: key?.from ?? null },
            key?.to ? { label: "Key signed until", as: "date", value: key.to } : { label: "Key signed until", value: "Still signing" },
          ]}
        />
        <FactCard
          title="Timestamp"
          facts={[
            { label: "Merkle batch", value: batch.id, standard: "id" },
            { label: "Batch root", value: batch.root, standard: "id" },
            { label: "Inclusion path", as: "count", value: inclusionPath(event).length },
            { label: "Timestamp token", value: batch.tsa.token, standard: "id" },
            { label: "Timestamped", as: "date", value: batch.tsa.at, grain: "minute" },
            { label: "Authority", value: batch.tsa.authority },
          ]}
        />
        {event.chain ? (
          <FactCard
            title="On-chain origin"
            trail={archived ? <WayOut opens={verifyHref("archive", encodeURIComponent(archived.owUri))} /> : undefined}
            facts={[
              { label: "owAssetUri", value: event.chain.owUri, standard: "id" },
              { label: "Transaction hash", value: event.chain.tx, standard: "id" },
              { label: "Block", value: String(event.chain.block), standard: "id" },
            ]}
          />
        ) : null}
      </Metadata>
    </DetailPage>
  );
}

/** Nothing answers to what was pasted — said plainly, with the way to try again. */
export function NotFound({ asked, archiveOnly }: { asked: string; archiveOnly?: boolean }) {
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="document" name={asked || "Nothing"} />,
        name: asked || "Nothing pasted",
        status: "verification:Failing",
        facts: [{ text: archiveOnly ? "Not in the registry archive" : "Not in the Proof Log" }],
        actions: [archiveOnly ? { label: "Find another", primary: true, dialog: <ArchiveDialog /> } : { label: "Verify another", primary: true, mark: "verified", dialog: <VerifyDialog /> }],
      }}
    >
      <EmptyState
        mark="error"
        title={archiveOnly ? "No imported record answers to this" : "Nothing in the Proof Log answers to this ID"}
        detail={
          archiveOnly
            ? "Paste the owAssetUri as the old registry wrote it, or the transaction that wrote it. Records the registry never held were not imported."
            : "A receipt reads rcpt_ and three groups of four characters; an event ID is a number. Check it was copied whole — a receipt that was altered no longer verifies."
        }
      />
    </DetailPage>
  );
}

/** The old on-chain registry, read-only (S8-4): every record that was imported, with its original transaction. */
export function Archive() {
  return (
    <CollectionPage
      title="Registry archive"
      actions={[{ label: "Find an owAssetUri", primary: true, dialog: <ArchiveDialog /> }]}
      index={{
        rows: archive(),
        rowKey: (one) => one.owUri,
        noun: { one: "record", many: "records" },
        note: "registry.original.works is read-only. Each record it held was replayed into the Proof Log as an imported event, keeping its original transaction and block.",
        identity: { title: "owAssetUri", name: (one) => one.owUri, as: "reference", opens: (one) => verifyHref("archive", encodeURIComponent(one.owUri)) },
        searchBy: ["owAssetUri", "Transaction"],
        columns: [
          { name: "Was", value: (one) => one.was, cell: (one) => one.was },
          { name: "Transaction", as: "identifier", standard: "id", value: (one) => one.tx },
          { name: "Block", as: "count", value: (one) => one.block },
          { name: "Mined", as: "date", value: (one) => one.minted },
          { name: "Imported", as: "date", value: (one) => one.imported },
        ],
        commands: (one) => [
          { label: "Open", opens: verifyHref("archive", encodeURIComponent(one.owUri)) },
          { label: "Verify the imported event", mark: "verified", opens: verifyHref(String(one.seq)) },
        ],
        chooser: false,
      }}
    />
  );
}

/** One record of the old registry, and the event that carries it now. */
export function ArchivedDetail({ record }: { record: ArchivedRecord }) {
  const event = importedEvent(record);
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="document" name={record.was} />,
        name: record.owUri,
        status: "verification:Verified",
        facts: [{ text: record.was }, { identifier: record.tx, standard: "id" }, { as: "date", value: record.minted, label: "Mined" }],
        actions: [{ label: "Download proof bundle", primary: true, opens: () => downloadBundle(event) }],
        more: [{ label: "Verify the imported event", mark: "verified", opens: verifyHref(String(record.seq)) }],
      }}
    >
      <Metadata>
        <Alert intent="info" title="Read-only">
          The on-chain registry no longer takes writes. This record was replayed into the Proof Log, and it is verified there.
        </Alert>
        <FactCard
          title="On the old registry"
          facts={[
            { label: "owAssetUri", value: record.owUri, standard: "id" },
            { label: "Record", value: record.was },
            { label: "Transaction hash", value: record.tx, standard: "id" },
            { label: "Block", value: String(record.block), standard: "id" },
            { label: "Mined", as: "date", value: record.minted, grain: "minute" },
            { label: "Payload CID", value: record.cid, standard: "id" },
          ]}
        />
        <FactCard
          title="In the Proof Log"
          trail={<WayOut opens={verifyHref(String(record.seq))} />}
          facts={[
            { label: "Event", value: String(record.seq), standard: "id" },
            { label: "Type", value: TYPE.IMPORTED },
            { label: "Imported", as: "date", value: record.imported },
            { label: "Payload hash", value: record.payloadHash, standard: "id" },
            { label: "Replay check", value: "The payload hash was recomputed against the CID on import, and matches." },
          ]}
        />
      </Metadata>
    </DetailPage>
  );
}

