import type { ReactNode } from "react";
import {
  Alert,
  Avatar,
  Badge,
  CheckboxField,
  CheckboxGroup,
  CollectionPage,
  DetailOverview,
  DetailPage,
  EmptyState,
  Explained,
  formatCount,
  formatDate,
  formatMeta,
  Icon,
  RecordIndex,
  Slot,
  Text,
  TitledCard,
  type ShellPlace,
} from "@revelator/pro-ui";

import { href } from "../../route";
import {
  DOCS,
  KINDS,
  docById,
  productAt,
  sectionsOf,
  type Doc,
  type Invariant,
  type Playbook,
  type Requirement,
  type Step,
  type Table,
} from "./data";
import { DOWNLOADS, downloadDoc } from "./markdown";

export const docsHref = (...path: string[]) => href("docs", ...path);
const docHref = (doc: Doc) => docsHref(doc.id.toLowerCase());
const kindOf = (doc: Doc) => KINDS.find((one) => one.kind === doc.kind)!;

/**
 * A sentence in a table cell. A cell is a value, never prose, and the column cuts it short — so the
 * whole sentence stands behind the hint, where the cut-off one is still reachable (docs/gaps/docs.md).
 */
const SHORT = 32;
const sentence = (text: string | undefined) =>
  !text ? null : text.length > SHORT ? <Explained why={text}>{text}</Explained> : text;

/** The page an address names — the library, one kind of doc, or one doc — and where it puts the reader. */
export function pageOf(segment?: string): { place: ShellPlace; body: ReactNode } {
  const kind = KINDS.find((one) => one.segment === segment);
  if (kind) return { place: { at: "Docs", page: kind.page }, body: <Library key={kind.segment} kind={kind.kind} title={kind.page} /> };
  if (!segment) return { place: { at: "Docs", page: "All docs" }, body: <Library key="all" title="All docs" /> };
  const doc = docById(segment);
  if (!doc)
    return {
      place: { at: "Docs", page: "All docs" },
      body: (
        <Slot layout="empty">
          <EmptyState mark="search" title="No such doc" detail={`Nothing in the library is called ${segment}. Every doc is listed under All docs.`} />
        </Slot>
      ),
    };
  const filed = kindOf(doc);
  return {
    place: {
      at: "Docs",
      page: filed.page,
      trail: [{ label: "Docs", opens: docsHref() }, { label: filed.page, opens: docsHref(filed.segment) }, { label: doc.id }],
    },
    body: <DocPage key={doc.id} doc={doc} />,
  };
}

/** A doc's mark: what KIND of doc it is, the same for every doc of that kind. */
function DocMark({ doc }: { doc: Doc }) {
  return (
    <Avatar kind="document" tone="muted" name={doc.kind}>
      <Icon name={kindOf(doc).mark} />
    </Avatar>
  );
}

/** The library, or one kind of it: every doc, searchable, read by kind. */
function Library({ kind, title }: { kind?: Doc["kind"]; title: string }) {
  const rows = kind ? DOCS.filter((one) => one.kind === kind) : DOCS;
  return (
    <CollectionPage
      title={title}
      // Teams take one kind of doc, or all of it, as Markdown written from these same records.
      more={DOWNLOADS.map((one) => ({ ...one, mark: "download" }))}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "doc", many: "docs" },
        identity: { title: "Doc", name: (one) => one.title, mark: (one) => <DocMark doc={one} />, opens: docHref },
        searchBy: ["Doc", "ID", "Applies to", "Owner"],
        columns: [
          { name: "ID", as: "identifier", standard: "id", value: (one) => one.id },
          { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
          { name: "Applies to", value: (one) => one.appliesTo, cell: (one) => one.appliesTo },
          { name: "Owner", value: (one) => one.owner, cell: (one) => one.owner },
          { name: "Sections", as: "count", value: sectionsOf },
          { name: "Steps", as: "count", value: (one) => (one.kind === "Playbook" ? one.steps.length : null) },
          { name: "Updated", as: "date", value: (one) => one.updated },
        ],
        // Cards as the reference's index has them; the list beside them. A doc has no picture, so
        // its tile is the frame's own placeholder and what it is rides the meta line (docs/gaps/docs.md).
        grid: {
          aspect: "square",
          // A library is browsed by what each doc is: it opens as tiles, the table a press away.
          first: true,
          picture: () => null,
          meta: (one) => [
            one.id,
            one.appliesTo,
            one.owner,
            one.kind === "Playbook"
              ? formatCount(one.steps.length, { one: "step", many: "steps" })
              : one.kind === "Specification"
                ? formatCount(one.requirements.length, { one: "requirement", many: "requirements" })
                : formatCount(one.tables.length, { one: "table", many: "tables" }),
            `Updated ${formatDate(one.updated, "day")}`,
          ],
        },
        // The kinds as readings on the whole library; a kind's own page needs none.
        readings: kind
          ? undefined
          : [{ name: "All", holds: () => true }, ...KINDS.map((one) => ({ name: one.page, holds: (doc: Doc) => doc.kind === one.kind }))],
      }}
    />
  );
}

/** One doc: its record, then its sections, short and scannable. */
function DocPage({ doc }: { doc: Doc }) {
  const run = DOCS.filter((one) => one.kind === doc.kind);
  const at = run.indexOf(doc);
  const previous = run[at - 1];
  const next = run[at + 1];
  return (
    <DetailPage
      record={{
        mark: <DocMark doc={doc} />,
        name: doc.title,
        kind: doc.kind,
        facts: [
          { identifier: doc.id, standard: "id" },
          { text: doc.owner, mark: "user" },
          { as: "date", value: doc.updated, label: "Updated" },
          { text: doc.appliesTo, mark: "crosslink" },
        ],
        actions: [
          // Marks alone at a desk, so the name keeps the band; each still says which doc it opens.
          ...(previous ? [{ label: `Previous: ${previous.id}`, mark: "arrow-left", iconOnly: true, opens: docHref(previous) }] : []),
          ...(next ? [{ label: `Next: ${next.id}`, mark: "arrow-right", iconOnly: true, opens: docHref(next) }] : []),
          { label: "Download as Markdown", mark: "download", opens: () => downloadDoc(doc) },
          { label: "Open in the prototype", primary: true, opens: doc.prototype },
        ],
      }}
    >
      <DetailOverview>
        {doc.kind === "Playbook" ? <PlaybookBody doc={doc} /> : <ReferenceBody doc={doc} />}
        <TitledCard title="Related docs" count={doc.related.length}>
          <RecordIndex<Doc>
            rows={doc.related.map(docById).filter((one): one is Doc => Boolean(one))}
            rowKey={(one) => one.id}
            noun={{ one: "doc", many: "docs" }}
            identity={{ title: "Doc", name: (one) => one.title, mark: (one) => <DocMark doc={one} />, opens: docHref }}
            columns={[
              { name: "ID", as: "identifier", standard: "id", value: (one) => one.id },
              { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
            ]}
          />
        </TitledCard>
      </DetailOverview>
    </DetailPage>
  );
}

/** A specification or an architecture doc: summary, its requirements or tables, its decisions. */
function ReferenceBody({ doc }: { doc: Exclude<Doc, Playbook> }) {
  return (
    <>
      {/* Prose, as the system sets it: Text that runs past a line. */}
      <TitledCard title="Summary">
        <Text multiline>{doc.summary}</Text>
      </TitledCard>
      {doc.kind === "Specification" ? <Requirements doc={doc} rows={doc.requirements} /> : null}
      {(doc.tables ?? []).map((table) => (
        <DocTable key={table.title} table={table} />
      ))}
      {/* A question and its answer are prose: each is an Alert — taken, or still open — not a table row. */}
      <TitledCard title="Decisions and open questions" count={doc.questions.length}>
        {doc.questions.map((one) => (
          <Alert key={one.question} intent={one.state === "Open" ? "warn" : "info"} emphasis="soft" title={`${one.state}: ${one.question}`}>
            {one.answer}
          </Alert>
        ))}
      </TitledCard>
    </>
  );
}

/** The requirement table: each requirement, its acceptance, and whether — and where — the prototype builds it. */
function Requirements({ doc, rows }: { doc: Doc; rows: readonly Requirement[] }) {
  return (
    <TitledCard title="Requirements" count={rows.length}>
      <RecordIndex<Requirement>
        rows={rows}
        rowKey={(one) => one.id}
        noun={{ one: "requirement", many: "requirements" }}
        // Each requirement opens the page that answers it; one not built opens the page the doc describes.
        identity={{ title: "Requirement", name: (one) => one.requirement, opens: (one) => one.where ?? doc.prototype }}
        columns={[
          { name: "ID", as: "identifier", standard: "id", value: (one) => one.id },
          { name: "Priority", value: (one) => one.priority, cell: (one) => one.priority },
          { name: "Acceptance", value: (one) => one.acceptance, cell: (one) => sentence(one.acceptance) },
          // Built, and in which product — the row itself opens the page.
          { name: "In the prototype", value: (one) => one.built, cell: (one) => formatMeta(one.where ? [one.built, productAt(one.where)] : [one.built]) },
          { name: "Stand-in", value: (one) => one.note ?? "", cell: (one) => sentence(one.note) },
        ]}
        readings={[
          { name: "All", holds: () => true },
          { name: "Built", holds: (one) => one.built === "Built" },
          { name: "Partly built", holds: (one) => one.built === "Partly built" },
          { name: "Not built", holds: (one) => one.built === "Not built" },
        ]}
      />
    </TitledCard>
  );
}

/** A table of the doc's own, its first column naming each row. */
function DocTable({ table }: { table: Table }) {
  const [first = "", ...rest] = table.columns;
  return (
    <TitledCard title={table.title} count={table.rows.length}>
      <RecordIndex<readonly string[]>
        rows={table.rows}
        rowKey={(one) => one.join("|")}
        noun={{ one: "row", many: "rows" }}
        identity={{ title: first, name: (one) => one[0] ?? "" }}
        columns={rest.map((name, at) => ({ name, value: (one: readonly string[]) => one[at + 1] ?? "", cell: (one: readonly string[]) => sentence(one[at + 1]) }))}
      />
    </TitledCard>
  );
}

/** A playbook, in the reference's sections and order. */
function PlaybookBody({ doc }: { doc: Playbook }) {
  return (
    <>
      <TitledCard title="When to use">
        <Text multiline>{doc.when}</Text>
      </TitledCard>
      <TitledCard title="Steps" count={doc.steps.length}>
        <RecordIndex<Step>
          rows={doc.steps}
          rowKey={(one) => one.does}
          noun={{ one: "step", many: "steps" }}
          identity={{
            title: "Step",
            name: (one) => one.does,
            rank: (one) => doc.steps.indexOf(one) + 1,
            opens: (one) => one.opens ?? doc.prototype,
          }}
          columns={[{ name: "On", value: (one) => productAt(one.opens ?? doc.prototype), cell: (one) => productAt(one.opens ?? doc.prototype) }]}
        />
      </TitledCard>
      {doc.rules.length ? (
        <TitledCard title="Decision rules" count={doc.rules.length}>
          <RecordIndex<string>
            rows={doc.rules}
            rowKey={(one) => one}
            noun={{ one: "rule", many: "rules" }}
            identity={{ title: "Rule", name: (one) => one }}
            columns={[]}
          />
        </TitledCard>
      ) : null}
      {/* Nothing is saved: a checklist is read against the work, as the reference has it. */}
      <TitledCard title={doc.checklist.title} count={doc.checklist.items.length}>
        <CheckboxGroup>
          {doc.checklist.items.map((item) => (
            <CheckboxField key={item} label={item} />
          ))}
        </CheckboxGroup>
      </TitledCard>
      {doc.table ? <DocTable table={doc.table} /> : null}
      <TitledCard title="Never break" count={doc.invariants.length}>
        <RecordIndex<Invariant>
          rows={doc.invariants}
          rowKey={(one) => one.id}
          noun={{ one: "invariant", many: "invariants" }}
          identity={{ title: "Invariant", name: (one) => one.rule }}
          columns={[
            { name: "ID", as: "identifier", standard: "id", value: (one) => one.id },
            { name: "Damage", value: (one) => one.damage, cell: (one) => sentence(one.damage) },
            // One break fails the work: the verification family's failing state, until the system has one for an invariant.
            { name: "If broken", cell: () => <Badge status="verification:Failing" /> },
          ]}
        />
      </TitledCard>
      {doc.open.length ? (
        <Alert intent="warn" emphasis="soft" title="Open items [CONFIRM]">
          {doc.open.join(" ")}
        </Alert>
      ) : null}
    </>
  );
}
