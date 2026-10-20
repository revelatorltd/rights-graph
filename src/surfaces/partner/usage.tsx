import { useState } from "react";
import {
  Avatar,
  Badge,
  CollectionPage,
  DetailPage,
  Field,
  FormDialog,
  RecordIndex,
  UploaderDocument,
  UploaderFileRow,
  owed,
  type HeldBy,
} from "@revelator/pro-ui";

import { assetById } from "../../graph/fixtures";
import { go, href } from "../../route";
import { addUpload, uploadById, uploadsOf, type Upload, type UsageRow } from "./data";
import { cannotLookUp } from "./lookups";
import { partnerHref, type PartnerPage, type Working } from "./working";

const MATCH: readonly UsageRow["state"][] = ["Unmatched", "Suggested", "Matched"];

/**
 * A usage or provenance report brought in (S6-5): what was used, when, and which outputs it went
 * into — or, for provenance, the genesis record OWEN wrote for each output. The prototype does
 * not read the file; it validates the CD-7 sample in its place (docs/gaps/s6-partner.md).
 */
export function UploadReport({ working, ...held }: HeldBy & { working: Working }) {
  const [file, setFile] = useState<File | null>(null);
  const provenance = working.partner.kind === "AI platform";
  return (
    <FormDialog
      {...held}
      confirm="Upload"
      draft={{ kind: owed("Usage") }}
      ready={() => file !== null}
      onCommit={(draft) => go(partnerHref("usage", addUpload(working.partner.id, file!.name, draft.kind as Upload["kind"])))}
    >
      <Field
        as="choice"
        name="kind"
        label="What it reports"
        options={[
          { value: "Usage", title: "Usage", description: "What was used, when, and in which outputs." },
          ...(provenance ? [{ value: "Provenance", title: "Provenance", description: "Genesis records for outputs, written via OWEN." }] : []),
        ]}
      />
      <UploaderDocument multiple={false} noun={{ one: "report", many: "reports" }} formats="CSV, JSON or DDEX ERN" accept=".csv,.json,.xml,.zip" onSelect={(files) => setFile(files[0] ?? null)}>
        {file ? <UploaderFileRow name={file.name} fileSize={file.size} phase="landed" onRemove={() => setFile(null)} /> : null}
      </UploaderDocument>
    </FormDialog>
  );
}

const unmatched = (one: Upload) => one.rows.filter((row) => row.state !== "Matched").length;

/** Every report the partner sent, each validated and linked to the graph's assets. */
export function Usage({ working }: { working: Working }) {
  const refused = cannotLookUp(working);
  return (
    <CollectionPage
      title="Usage and provenance"
      actions={refused ? [] : [{ label: "Upload report", primary: true, creates: true, dialog: <UploadReport working={working} /> }]}
      more={[
        ...(refused ? [{ label: "Upload report", unavailable: refused }] : []),
        { label: "Open the usage file reference", opens: "https://docs.sureel.example/usage" },
      ]}
      index={{
        rows: uploadsOf(working.partner.id),
        rowKey: (one) => one.id,
        noun: { one: "report", many: "reports" },
        identity: {
          title: "File",
          name: (one) => one.file,
          mark: (one) => <Avatar kind="document" name={one.file} />,
          opens: (one) => partnerHref("usage", one.id),
        },
        sort: { column: "Received", direction: "descending" },
        searchBy: ["File"],
        columns: [
          { name: "Status", value: (one) => one.state, cell: (one) => <Badge status={`batch:${one.state}`} /> },
          { name: "Reports", value: (one) => one.kind, cell: (one) => one.kind },
          { name: "Rows", as: "count", value: (one) => one.rows.length },
          { name: "Matched", as: "count", value: (one) => one.rows.filter((row) => row.state === "Matched").length },
          { name: "Unmatched", as: "count", value: unmatched },
          { name: "Received", as: "date", grain: "minute", value: (one) => one.received },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "Usage", holds: (one) => one.kind === "Usage" },
          { name: "Provenance", holds: (one) => one.kind === "Provenance" },
        ],
        commands: (one) => [{ label: "Open", opens: partnerHref("usage", one.id) }],
        empty: refused ? { none: refused } : { none: "No report yet. Upload what you used, when, and which outputs it went into." },
      }}
    />
  );
}

/** One report, row by row: linked to the asset it names, or flagged where nothing answers to it. */
export function UploadDetail({ upload }: { upload: Upload }) {
  const provenance = upload.kind === "Provenance";
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="document" name={upload.file} />,
        name: upload.file,
        status: `batch:${upload.state}`,
        facts: [
          { text: upload.kind },
          { as: "count", value: upload.rows.length, noun: { one: "row", many: "rows" } },
          { as: "date", value: upload.received, grain: "minute", label: "Received" },
        ],
      }}
    >
      <RecordIndex
        rows={upload.rows}
        rowKey={(one) => String(one.row)}
        noun={{ one: "row", many: "rows" }}
        note={
          upload.state === "Rejected"
            ? "The file could not be read as the format it claimed: nothing was linked. Send it again as CSV, JSON or DDEX ERN."
            : `${unmatched(upload)} of ${upload.rows.length} rows are not linked to an asset — nothing is attributed to them until they are.`
        }
        identity={{ title: "Title", name: (one) => one.title, mark: (one) => <Avatar kind="work" name={one.title} /> }}
        columns={[
          { name: "Match", value: (one) => MATCH.indexOf(one.state), cell: (one) => <Badge status={`match:${one.state}`} /> },
          { name: "Row", as: "count", value: (one) => one.row },
          { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => one.isrc },
          { name: "Linked to", value: (one) => (one.assetId ? assetById(one.assetId).title : ""), cell: (one) => (one.assetId ? assetById(one.assetId).title : null) },
          { name: "Used for", value: (one) => one.used, cell: (one) => one.used },
          { name: "Used on", as: "date", value: (one) => one.when },
          { name: provenance ? "Outputs" : "Outputs reported", as: "count", value: (one) => one.outputs },
          ...(provenance ? [{ name: "Genesis event", as: "identifier" as const, standard: "id" as const, value: (one: UsageRow) => one.genesis }] : []),
          { name: "Note", value: (one) => one.note ?? "", cell: (one) => one.note },
        ]}
        readings={[
          { name: "All", holds: () => true },
          { name: "Unmatched", holds: (one) => one.state !== "Matched" },
          { name: "Matched", holds: (one) => one.state === "Matched" },
        ]}
        commands={(one) =>
          one.genesis ? [{ label: "Verify the genesis record", mark: "verified", opens: href("verify", one.genesis) }] : []
        }
        empty={{ none: "Nothing was read from this file." }}
        chooser={false}
      />
    </DetailPage>
  );
}

export const USAGE_PAGES: Record<string, PartnerPage> = {
  usage: ([id], working) => {
    const upload = id ? uploadById(id) : undefined;
    if (!upload || upload.partner !== working.partner.id) return { place: { at: "Usage" }, page: <Usage working={working} /> };
    return {
      place: { at: "Usage", trail: [{ label: "Usage", opens: partnerHref("usage") }, { label: upload.file }] },
      page: <UploadDetail key={upload.id} upload={upload} />,
    };
  },
};
