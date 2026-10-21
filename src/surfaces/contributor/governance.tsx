import { Alert, Avatar, CollectionPage, DetailPage, FactCard, Metadata } from "@revelator/pro-ui";

import { downloadJson } from "../../rights/files";
import { SIGNING_KEYS, TODAY } from "../../graph/fixtures";
import { href } from "../../route";
import { AUDITS, CHARTER, type AuditReport } from "./data";

type Key = (typeof SIGNING_KEYS)[number];
const current = (one: Key) => one.from <= TODAY && (!one.to || TODAY <= one.to);

/** What each promise is about, so the charter reads as a list a reader scans down. */
const PROMISE_TOPICS = ["Tenancy", "Private fields", "Audit access", "Resolutions", "Withdrawal"];

/**
 * The charter the graph is run under (S5-8) — what every contributor is promised, said once. A
 * DETAIL PAGE on the charter itself: it is one document, with a version and a date it was adopted.
 */
export function Charter() {
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="document" name={CHARTER.title} />,
        name: CHARTER.title,
        kind: `Charter ${CHARTER.version}`,
        facts: [
          { as: "date", value: CHARTER.adopted, label: "Adopted" },
          { as: "count", value: CHARTER.signatories, noun: { one: "signatory", many: "signatories" } },
        ],
        actions: [{ label: "Download", mark: "download", iconOnly: true, opens: () => downloadJson(`contributor-charter-${CHARTER.version}.json`, CHARTER) }],
      }}
    >
      <Metadata>
        <FactCard
          title="What every contributor is promised"
          facts={CHARTER.promises.map((promise, at) => ({ label: PROMISE_TOPICS[at] ?? `Promise ${at + 1}`, value: promise }))}
        />
        <FactCard
          title="Charter"
          facts={[
            { label: "Version", value: CHARTER.version },
            { label: "Adopted", as: "date", value: CHARTER.adopted },
            { label: "Operator", value: CHARTER.steward },
            { label: "Signatories", as: "count", value: CHARTER.signatories },
          ]}
        />
      </Metadata>
    </DetailPage>
  );
}

/** The independent audits of how the graph is run, newest first — each published the day it is signed. */
export function AuditReports() {
  return (
    <CollectionPage
      title="Audit reports"
      index={{
        rows: AUDITS,
        rowKey: (one) => one.id,
        noun: { one: "audit report", many: "audit reports" },
        identity: { title: "Report", name: (one) => one.title, mark: (one) => <Avatar kind="document" name={one.title} /> },
        note: (
          <Alert intent="info" title="Published when signed">
            A new audit appears here the day its auditor signs it, exceptions and all.
          </Alert>
        ),
        sort: { column: "Published", direction: "descending" },
        columns: [
          { name: "Auditor", value: (one) => one.auditor, cell: (one) => one.auditor },
          { name: "Period", value: (one) => one.period, cell: (one) => one.period },
          { name: "Published", as: "date", value: (one) => one.published },
          { name: "Findings", as: "count", value: (one) => one.findings },
          { name: "Outcome", value: (one) => one.outcome, cell: (one: AuditReport) => one.outcome },
        ],
        commands: () => [{ label: "Download", opens: () => {} }],
        empty: { none: "No audit has been published yet." },
      }}
    />
  );
}

/** The keys that sign the Proof Log — the one a receipt names is checked here, or offline. */
export function SigningKeys() {
  return (
    <CollectionPage
      title="Signing keys"
      index={{
        rows: SIGNING_KEYS,
        rowKey: (one) => one.id,
        noun: { one: "signing key", many: "signing keys" },
        identity: { title: "Key", name: (one) => one.id, as: "reference" },
        note: (
          <Alert intent="info" title="Rotated, never withdrawn">
            A receipt signed by a retired key still verifies against it. Check any receipt in the verification portal, without an account.
          </Alert>
        ),
        columns: [
          { name: "In use", value: (one) => (current(one) ? 1 : 0), cell: (one) => (current(one) ? "Current" : "Retired") },
          { name: "Algorithm", value: (one) => one.algorithm, cell: (one) => one.algorithm },
          { name: "Fingerprint", as: "identifier", standard: "id", value: (one) => one.fingerprint },
          { name: "From", as: "date", value: (one) => one.from },
          { name: "To", as: "date", value: (one) => one.to },
        ],
        commands: () => [{ label: "Verify a receipt", opens: href("verify") }],
      }}
    />
  );
}
