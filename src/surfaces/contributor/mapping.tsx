import { Alert, CollectionPage, Field, FormDialog, formatDate, formatList, owed, type HeldBy } from "@revelator/pro-ui";

import { TARGET_FIELDS } from "../../graph/fixtures";
import {
  confirmMappings,
  mapHeader,
  mappings,
  saveMapping,
  savedMappings,
  unmapHeader,
  type MappingRow,
} from "./data";

const STATES: readonly MappingRow["state"][] = ["Unmatched", "Suggested", "Completed"];

/** The target field library, as a choice a header is mapped to — searchable, it is long. */
const TARGETS = TARGET_FIELDS.map((one) => ({ value: one, title: one }));

/** One header mapped by hand to a field from the library. */
function MapHeader({ row, ...held }: HeldBy & { row: MappingRow }) {
  return (
    <FormDialog
      {...held}
      confirm="Map"
      draft={{ target: owed(row.target ?? "") }}
      onCommit={(draft) => mapHeader(row.header, draft.target)}
    >
      <Field
        as="choice"
        name="target"
        label={`Graph field for “${row.header}”`}
        noun={{ one: "target field", many: "target fields" }}
        options={TARGETS}
        help={`Its first value reads “${row.sample}”.`}
      />
    </FormDialog>
  );
}

/** The mapping kept by name, so the next file with these headers is mapped without asking. */
function SaveMapping({ ...held }: HeldBy) {
  return (
    <FormDialog {...held} confirm="Save" draft={{ name: owed(savedMappings()[0]?.name ?? "") }} onCommit={(draft) => saveMapping(draft.name.trim())}>
      <Field as="text" name="name" label="Mapping name" help="A file whose headers match is mapped with it automatically. The same name replaces it." />
    </FormDialog>
  );
}

/**
 * A non-standard file's headers, and the graph field each goes to (S5-9, after the BMAT
 * prototype). Three readings — what nothing matched, what matching suggests, what is settled — and
 * suggestions confirmed in bulk by holding them. Settled, the mapping is saved and the next file
 * with these headers is mapped by it without asking.
 */
export function FieldMapping() {
  const rows = mappings();
  const saved = savedMappings();
  const applied = saved.find((one) => one.appliedTo.length);
  return (
    <CollectionPage
      title="Field mapping"
      actions={[{ label: "Save as mapping", dialog: <SaveMapping /> }]}
      index={{
        rows,
        rowKey: (one) => one.header,
        noun: { one: "header", many: "headers" },
        identity: { title: "Header", name: (one) => one.header },
        note: (
          <Alert intent="info" title="MMG_publishing_splits_Q3.csv">
            {`${applied ? `Mapped automatically with “${applied.name}”, saved ${formatDate(applied.saved, "day")}. ` : ""}A header left unmapped is never ingested — it stays in your tenant. Saved mappings: ${formatList(saved.map((one) => one.name)) ?? "none yet"}.`}
          </Alert>
        ),
        columns: [
          { name: "First value", value: (one) => one.sample, cell: (one) => one.sample },
          { name: "Graph field", value: (one) => one.target ?? "", cell: (one) => one.target },
          { name: "Confidence", as: "percent", value: (one) => (one.confidence === undefined ? undefined : one.confidence * 100), readings: ["Suggested"] },
        ],
        readings: STATES.map((state) => ({ name: state, holds: (one: MappingRow) => one.state === state })),
        // Gmail-style: hold the suggestions, confirm them at once.
        selection: (held) => [
          held.every((one) => one.target)
            ? { label: "Confirm", mark: "check", opens: () => confirmMappings(held.map((one) => one.header)) }
            : { label: "Confirm", mark: "check", unavailable: "An unmatched header has no field to confirm: map it first." },
          { label: "Leave unmapped", opens: () => held.forEach((one) => unmapHeader(one.header)) },
        ],
        single: (one) => [
          { label: one.target ? "Map to another field" : "Map to a field", dialog: <MapHeader row={one} /> },
        ],
        chooser: false,
        empty: { none: "Every header of this file has a field." },
      }}
    />
  );
}
