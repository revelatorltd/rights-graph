import { Field, FormDialog, Icon, formatList, formatMeta, owed, type ActivitySave, type Command, type HeldBy } from "@revelator/pro-ui";
import { faceFor } from "@revelator/pro-ui/assets";

import { ATTESTATIONS, assetById, partyName } from "../../../graph/fixtures";
import { USES, type Asset, type Use } from "../../../graph/model";
import { GRAPH_VERSION, RULE_VERSION, clearanceOf, tierOf, type Clearance } from "../../../graph/resolve";
import { slug } from "../../../route";
import { downloadCsv, printReport } from "../../../rights/files";
import { EXPORTS, LABEL, exported, grantName, labelConflicts, labelGrants, labelRecordings, labelRequests, rightsHref } from "./data";

/**
 * What more than one page of the label's Rights section says the same way: the export every list
 * offers (S1-10), and the history the overview and the inbox read (S1-8's "auto-cleared ones show
 * as activity").
 */

const FORMATS = [
  { value: "CSV", title: "CSV", description: "One row per asset and use, for a spreadsheet or a royalty engine." },
  { value: "PDF", title: "PDF", description: "The report as a printable page — save it as PDF from the print dialog." },
];

/** One line of the report: an asset and a use, as the graph answers it now. */
interface ReportLine {
  asset: Asset;
  use: Use;
  answer: Clearance;
}

const REPORT_COLUMNS = [
  { name: "Asset", value: (one: ReportLine) => one.asset.title },
  { name: "ISRC", value: (one: ReportLine) => one.asset.isrc },
  { name: "Use", value: (one: ReportLine) => one.use },
  { name: "Clearance", value: (one: ReportLine) => one.answer.state },
  { name: "Master", value: (one: ReportLine) => one.answer.master.state },
  { name: "Composition", value: (one: ReportLine) => formatList(one.answer.composition.map((side) => side.state)) ?? "No work linked" },
  { name: "Decided at", value: (one: ReportLine) => one.answer.decidedAt },
  { name: "Tier", value: (one: ReportLine) => `T${tierOf(one.asset.id, one.use)}` },
  { name: "Why", value: (one: ReportLine) => one.answer.reason },
];

/** The report's lines: every recording of the label's, every use, master and composition apart (G-3). */
const reportLines = (): ReportLine[] => labelRecordings().flatMap((asset) => USES.map((use) => ({ asset, use, answer: clearanceOf(asset.id, use) })));

/**
 * The rights and clearance report, taken as a file (S1-10), named for what it was taken from and
 * the graph version it was read at — which its first line says again, so a file can be checked
 * against the graph it came from. CSV is a download; PDF is the report as a printable page, the
 * browser's print dialog making the file (docs/gaps/files.md).
 */
export function ExportReport({ of, ...held }: HeldBy & { of: string }) {
  return (
    <FormDialog
      {...held}
      confirm="Export"
      draft={{ format: owed<string>("CSV") }}
      onCommit={(draft) => {
        exported(draft.format, of, GRAPH_VERSION);
        const first = formatMeta(["Kestrel Point Recordings", of, `graph ${GRAPH_VERSION}`, `rule ${RULE_VERSION}`]) ?? of;
        if (draft.format === "PDF") printReport(`Rights report — ${of}`, [first, "Clearance read for every recording and use, master and composition apart."], REPORT_COLUMNS, reportLines());
        else downloadCsv(`kestrel-point_${slug(of)}_${GRAPH_VERSION}.csv`, REPORT_COLUMNS, reportLines(), first);
      }}
    >
      <Field
        as="choice"
        name="format"
        label="Format"
        options={FORMATS}
        notice={`Read at graph version ${GRAPH_VERSION}, rule ${RULE_VERSION} — the file says so on its first line.`}
      />
    </FormDialog>
  );
}

/** The export, as a list's overflow offers it — what acts on all of the set. */
export const exportCommand = (of: string): Command => ({ label: "Export rights report", dialog: <ExportReport of={of} /> });

const person = (name: string) => <img src={faceFor(name)} alt="" />;
const machine = <Icon name="rights" />;

/**
 * The label's history in the graph, newest first — every consent it gave, every request decided or
 * cleared on its behalf, every conflict opened or resolved on its catalogue, every export taken.
 */
export function labelHistory(): ActivitySave[] {
  const saves: ActivitySave[] = [];
  for (const grant of labelGrants())
    saves.push({
      actor: grant.decided.actor,
      portrait: person(grant.decided.actor),
      at: grant.decided.at,
      record: grantName(grant),
      recordHref: rightsHref("consent", grant.id),
      entries: [{ action: grant.effect === "Deny" ? "denied" : "granted", property: "Consent" }],
    });
  for (const request of labelRequests()) {
    const record = request.id.toUpperCase();
    const recordHref = rightsHref("requests", request.id);
    if (request.state === "Auto-cleared")
      saves.push({
        kind: "machine",
        actor: "Clearance engine",
        portrait: machine,
        at: request.received,
        record: formatMeta([record, request.use ? `${request.use} for ${partyName(request.from)}` : ""].filter(Boolean)) ?? record,
        recordHref,
        entries: [{ action: "auto-cleared", property: "Request" }],
      });
    else if (request.decided)
      saves.push({
        actor: request.decided.actor,
        portrait: person(request.decided.actor),
        at: request.decided.at,
        record,
        recordHref,
        entries: [{ action: request.state.toLowerCase(), property: "Request" }],
      });
  }
  for (const attestation of ATTESTATIONS.filter((one) => one.attestor === LABEL || one.onBehalfOf === LABEL))
    saves.push({
      actor: partyName(attestation.attestor),
      portrait: machine,
      kind: "machine",
      at: attestation.issued,
      record:
        formatMeta([attestation.claim, attestation.onBehalfOf ? partyName(attestation.onBehalfOf) : partyName(attestation.attestor)]) ??
        attestation.claim,
      entries: [{ action: attestation.state === "Requested" ? "asked for" : "signed", property: "Attestation" }],
    });
  for (const conflict of labelConflicts()) {
    const record = formatMeta([conflict.kind, assetById(conflict.assetId).title]) ?? conflict.kind;
    saves.push({
      kind: "machine",
      actor: conflict.raisedBy,
      portrait: machine,
      at: conflict.opened,
      record,
      recordHref: rightsHref("conflicts", conflict.id),
      entries: [{ action: "opened", property: "Conflict" }],
    });
    if (conflict.resolution)
      saves.push({
        actor: conflict.resolution.actor,
        portrait: person(conflict.resolution.actor),
        at: conflict.resolution.at,
        record,
        recordHref: rightsHref("conflicts", conflict.id),
        entries: [{ action: "resolved", property: "Conflict" }],
      });
  }
  for (const one of EXPORTS)
    saves.push({
      actor: "Priya Raman",
      portrait: person("Priya Raman"),
      at: one.at,
      record: formatMeta([one.of, one.graph]) ?? one.of,
      entries: [{ action: `exported a ${one.format}`, property: "Report" }],
    });
  return saves.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** The history, as a header's timeline control takes it. */
export const labelActivity = () => ({
  saves: labelHistory(),
  fields: ["Consent", "Request", "Attestation", "Conflict", "Report"],
  records: { name: "Record", all: "All records" },
});
