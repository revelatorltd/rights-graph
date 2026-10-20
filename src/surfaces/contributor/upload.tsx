import { useState } from "react";
import {
  Alert,
  Field,
  Link,
  RecordIndex,
  UploaderDocument,
  UploaderFileRow,
  Wizard,
  WizardRow,
  WizardRowBody,
  WizardRowTip,
  WizardRowTips,
  WizardSection,
  WizardSectionBody,
  WizardSectionHeader,
  formatCount,
  owed,
  useAnswer,
} from "@revelator/pro-ui";

import { go } from "../../route";
import { contributorHref } from "./address";
import { batchHref } from "./batches";
import {
  CHANNELS,
  CHANNEL_ENDPOINT,
  FORMATS,
  batchById,
  dropFailed,
  ingest,
  mappingFor,
  mappings,
  receive,
  resubmit,
  rowErrorsOf,
  type Channel,
  type Format,
} from "./data";

const STAGES = ["File", "Schema check", "Ingest"] as const;
const ROWS = { one: "row", many: "rows" };

/** What each format is, in the words a contributor's data team uses. */
const FORMAT_OPTIONS = [
  { value: "DDEX ERN", title: "DDEX ERN", description: "Releases and recordings, ERN 4.3." },
  { value: "DDEX MWN", title: "DDEX MWN", description: "Musical works notifications." },
  { value: "CWR", title: "CWR", description: "Works and writer shares, CWR 2.2 or 3.1." },
  { value: "CSV", title: "CSV", description: "Any columns: mapped to the graph's fields first." },
  { value: "Parquet", title: "Parquet", description: "A bulk extract, schema in the footer." },
];
const CHANNEL_OPTIONS = [
  { value: "Upload", title: "Upload here", description: "One file from this computer." },
  { value: "SFTP", title: "SFTP", description: "Your feed drops it in your inbound folder." },
  { value: "API", title: "API", description: "Your system posts it to the batches endpoint." },
];
const FIX_OPTIONS = [
  { value: "fix", title: "Upload a corrected file", description: "The whole file again, its failed rows fixed. It is checked again from the first row." },
  { value: "drop", title: "Drop the failed rows", description: "Go on with the rows that passed; send the others in a later file." },
];

/** What a file holds, by its format — invented, the size a peer major's extract comes in at. */
const ROWS_OF: Record<Format, number> = { "DDEX ERN": 412880, "DDEX MWN": 96230, CWR: 40118, CSV: 88412, Parquet: 1310044 };
const EXTENSION: Record<Format, string> = { "DDEX ERN": "zip", "DDEX MWN": "zip", CWR: "cwr", CSV: "csv", Parquet: "parquet" };
/** What arrives by a feed, where nobody picks a file here. */
const fedName = (format: Format) => `MMG_${format.replace(/\s/g, "")}_2026-10-20.${EXTENSION[format]}`;

/**
 * A file into the tenant, through the stages F4 walks: chosen and received, checked against the
 * schema BEFORE anything is accepted, fixed or dropped where rows fail, then ingested and matched.
 *
 * A STEPPED WIZARD, because each stage needs the one before it settled: no row reaches the graph
 * until the check has passed, and the reader is told so at every stage. Opened on a held batch, it
 * begins at the schema check — the file is already in.
 */
export function UploadFlow({ resubmitting }: { resubmitting?: string }) {
  const held = resubmitting ? batchById(resubmitting) : undefined;
  const [stage, setStage] = useState(held ? 1 : 0);
  const [batchId, setBatchId] = useState(held?.id);
  const [file, setFile] = useState<File | null>(null);
  const [fixed, setFixed] = useState<File | null>(null);
  const batch = batchId ? batchById(batchId) : undefined;
  const errors = batch ? rowErrorsOf(batch.id) : [];
  const blocked = batch?.state === "Row errors";
  const leave = () => go(batch ? batchHref(batch.id) : contributorHref("batches"));

  return (
    <Wizard
      verb="Upload"
      noun={{ one: "file", many: "files" }}
      note="Every row is checked against the schema before anything is accepted. Nothing reaches the graph until the check passes — fix the failed rows, or drop them."
      onExit={leave}
      stages={STAGES}
      stage={stage}
      onStage={(to) => setStage(to)}
      subject={(answers) => ({
        kind: "organization",
        name: batch?.file ?? file?.name ?? (answers.channel && answers.channel !== "Upload" && answers.format ? fedName(answers.format as Format) : ""),
        mark: "upload",
        meta: [String(answers.format ?? batch?.format ?? ""), String(answers.channel ?? batch?.channel ?? "")].filter(Boolean),
      })}
      draft={{
        format: owed(held?.format ?? ""),
        channel: owed(held?.channel ?? "Upload"),
        fix: owed("" as string),
      }}
      ready={(answers) => {
        if (stage === 0) return answers.channel !== "Upload" || file !== null;
        if (stage === 1 && blocked) return answers.fix === "drop" || (answers.fix === "fix" && fixed !== null);
        return true;
      }}
      onCommit={(answers) => {
        if (stage === 0) {
          // RECEIVED once: going back to the first stage of a file already in does not send it twice.
          if (!batch) {
            const format = answers.format as Format;
            const channel = answers.channel as Channel;
            setBatchId(receive(file?.name ?? fedName(format), format, channel, ROWS_OF[format]));
          }
          setStage(1);
          return;
        }
        if (stage === 1) {
          if (blocked && answers.fix === "drop") dropFailed(batch!.id);
          if (blocked && answers.fix === "fix") resubmit(batch!.id, fixed!.name);
          setStage(2);
          return;
        }
        ingest(batch!.id);
        go(batchHref(batch!.id, "Match results"));
      }}
    >
      {stage === 0 ? <ChooseFile file={file} onFile={setFile} /> : null}
      {stage === 1 && batch ? (
        <WizardSection>
          <WizardSectionHeader title="Schema check" />
          <WizardSectionBody>
            {batch.format === "CSV" ? <MappingApplied /> : null}
            {blocked ? (
              <>
                <WizardRow title="Rows that failed">
                  <WizardRowBody>
                    <Alert intent="warn" title={`${formatCount(batch.errors, ROWS)} failed the schema`}>
                      {`Nothing from ${batch.file} has been ingested. ${formatCount(batch.validated, ROWS)} passed.`}
                    </Alert>
                    <RecordIndex
                      rows={errors}
                      rowKey={(one) => String(one.row)}
                      noun={{ one: "failed row", many: "failed rows" }}
                      identity={{ title: "Row", name: (one) => `Row ${one.row}`, value: (one) => one.row, as: "reference" }}
                      columns={[
                        { name: "Field", value: (one) => one.field, cell: (one) => one.field },
                        { name: "Value", value: (one) => one.value, cell: (one) => one.value || undefined },
                        { name: "Problem", value: (one) => one.problem, cell: (one) => one.problem },
                      ]}
                      chooser={false}
                      empty={{ none: "Every row passed the schema.", line: true }}
                    />
                  </WizardRowBody>
                  <WizardRowTips>
                    <WizardRowTip>One row of each kind is shown. Download every failed row from the batch, fix them in your system, and send the whole file again.</WizardRowTip>
                  </WizardRowTips>
                </WizardRow>
                <WizardRow title="How to go on">
                  <WizardRowBody>
                    <Field as="choice" name="fix" label="Failed rows" options={FIX_OPTIONS} />
                    <FixedFile fixed={fixed} onFixed={setFixed} />
                  </WizardRowBody>
                  <WizardRowTips>
                    <WizardRowTip term="Corrected file">The check runs again over every row. It is the same batch, resubmitted.</WizardRowTip>
                    <WizardRowTip term="Dropped rows">They never reach the graph, and nothing about them is matched.</WizardRowTip>
                  </WizardRowTips>
                </WizardRow>
              </>
            ) : (
              <WizardRow title="Result">
                <WizardRowBody>
                  <Alert intent="success" title="Every row passed">
                    {`${formatCount(batch.validated, ROWS)} of ${batch.file} passed the schema. Nothing has been ingested yet.`}
                  </Alert>
                </WizardRowBody>
              </WizardRow>
            )}
          </WizardSectionBody>
        </WizardSection>
      ) : null}
      {stage === 2 && batch ? (
        <WizardSection>
          <WizardSectionHeader title="Ingest" />
          <WizardSectionBody>
            <WizardRow title="What is written">
              <WizardRowBody>
                <Alert intent="info" title={`${formatCount(batch.validated, ROWS)} to your tenant`}>
                  Each row is written to the graph as your claim, at T1 Self-declared, and matched against what the graph already holds. Your Shared fields are read by the resolver; your Private and Encrypted fields stay in your tenant.
                </Alert>
              </WizardRowBody>
              <WizardRowTips>
                <WizardRowTip term="Conflicting">A claim that disagrees with another tenant's goes to Sureel ops. You see that there is one and its share totals — never their private terms, and they never see yours.</WizardRowTip>
                <WizardRowTip term="Coverage">Your coverage is read again once matching ends, against this upload.</WizardRowTip>
              </WizardRowTips>
            </WizardRow>
          </WizardSectionBody>
        </WizardSection>
      ) : null}
    </Wizard>
  );
}

/** The first stage: what the file is, how it travels, and — uploaded here — the file. */
function ChooseFile({ file, onFile }: { file: File | null; onFile: (file: File | null) => void }) {
  return (
    <WizardSection>
      <WizardSectionHeader title="File" />
      <WizardSectionBody>
        <WizardRow title="Format">
          <WizardRowBody>
            <Field as="choice" name="format" label="Format" options={FORMAT_OPTIONS} />
          </WizardRowBody>
          <WizardRowTips>
            <WizardRowTip term="CSV">Your saved mapping is applied by its headers; a header it does not know waits in Field mapping.</WizardRowTip>
          </WizardRowTips>
        </WizardRow>
        <WizardRow title="Channel">
          <WizardRowBody>
            <Field as="choice" name="channel" label="Channel" options={CHANNEL_OPTIONS} />
            <ChannelFile file={file} onFile={onFile} />
          </WizardRowBody>
          <WizardRowTips>
            {CHANNELS.map((one) => (
              <WizardRowTip key={one} term={one}>
                {CHANNEL_ENDPOINT[one]}
              </WizardRowTip>
            ))}
          </WizardRowTips>
        </WizardRow>
      </WizardSectionBody>
    </WizardSection>
  );
}

/** The file itself, where it is uploaded here; a feed's file arrives on its own. */
function ChannelFile({ file, onFile }: { file: File | null; onFile: (file: File | null) => void }) {
  if (useAnswer("channel") !== "Upload") return null;
  return (
    <UploaderDocument
      multiple={false}
      formats={FORMATS.join(", ")}
      noun={{ one: "file", many: "files" }}
      onSelect={(files) => onFile(files[0] ?? null)}
    >
      {file ? <UploaderFileRow name={file.name} phase="landed" fileSize={file.size} onRemove={() => onFile(null)} /> : null}
    </UploaderDocument>
  );
}

/** The corrected file, asked for only where the contributor resubmits rather than drops. */
function FixedFile({ fixed, onFixed }: { fixed: File | null; onFixed: (file: File | null) => void }) {
  if (useAnswer("fix") !== "fix") return null;
  return (
    <UploaderDocument
      multiple={false}
      noun={{ one: "corrected file", many: "corrected files" }}
      onSelect={(files) => onFixed(files[0] ?? null)}
    >
      {fixed ? <UploaderFileRow name={fixed.name} phase="landed" fileSize={fixed.size} onRemove={() => onFixed(null)} /> : null}
    </UploaderDocument>
  );
}

/** A CSV is read through the saved mapping its headers fit — applied without being asked (S5-9). */
function MappingApplied() {
  const saved = mappingFor("CSV");
  const rows = mappings();
  const done = rows.filter((one) => one.state === "Completed").length;
  if (!saved) return null;
  return (
    <WizardRow title="Mapping">
      <WizardRowBody>
        <Alert intent="info" title={`Mapped with “${saved.name}”`}>
          {`${done} of ${rows.length} headers map to the graph's fields; the rest are held back until they are mapped.`}
        </Alert>
        <Link opens={contributorHref("mapping")}>Review the mapping</Link>
      </WizardRowBody>
    </WizardRow>
  );
}
