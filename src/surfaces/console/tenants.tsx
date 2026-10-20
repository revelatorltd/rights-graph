import type { ReactNode } from "react";
import {
  Alert,
  CollectionPage,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  FacetCard,
  Field,
  FormDialog,
  RecordIndex,
  owed,
  unanswered,
  type Command,
  type DetailFacet,
  type HeldBy,
  type ShellPlace,
} from "@revelator/pro-ui";

import { BATCHES, CONFLICTS } from "../../graph/fixtures";
import type { Tenant } from "../../graph/model";
import type { Shown } from "../surface";
import {
  SHARING_LEVELS,
  auditsOf,
  changeSharing,
  isOpen,
  policyLogOf,
  requestAudit,
  tenantById,
  tenants,
  type Audit,
  type SharingLevel,
} from "./data";
import { partyOrName, personMark } from "./marks";
import { OPS_ONLY, SIGNED_IN, consoleHref, facetOf, type Persona } from "./where";

export const TENANT_FACETS = ["Overview", "Sharing", "Access log", "Audit requests", "Policy log"] as const;
type TenantFacet = (typeof TENANT_FACETS)[number];

/** What a sharing level means to the people reading the tenant's data. */
const MEANS: Record<SharingLevel, string> = {
  Shared: "Read by the resolver and returned in answers.",
  Private: "Read by the resolver; never returned, never shown to Sureel ops outside an audit window.",
  Encrypted: "Held encrypted at rest under the contributor's key; not read by the resolver.",
};

const AUDIT_WINDOWS = [15, 30, 60] as const;

/**
 * Contributor tenants (S7-8) — the walled-off spaces UMG, Sony, Merlin and the rest upload into.
 * Ops sees their policies and every read of their data; their private terms only under audit.
 */
export function TenantsPage(): Shown {
  return {
    place: { at: "Tenants" },
    page: (
      <CollectionPage
        title="Contributor tenants"
        index={{
          rows: tenants(),
          rowKey: (one) => one.id,
          noun: { one: "tenant", many: "tenants" },
          identity: {
            title: "Tenant",
            name: (one) => one.name,
            mark: (one) => partyOrName(one.id),
            opens: (one) => consoleHref("tenants", one.id),
          },
          columns: [
            { name: "Shared fields", as: "count", value: (one) => one.sharing.filter((each) => each.level === "Shared").length },
            { name: "Private or encrypted", as: "count", value: (one) => one.sharing.filter((each) => each.level !== "Shared").length },
            { name: "Batches", as: "count", value: (one) => BATCHES.filter((each) => each.contributor === one.id).length },
            { name: "Reads logged", as: "count", value: (one) => one.access.length },
            { name: "Audit windows", as: "count", value: (one) => auditsOf(one.id).length },
            { name: "Last read", as: "date", grain: "minute", value: (one) => one.access[0]?.at },
          ],
          commands: (one) => [
            { label: "Open", opens: consoleHref("tenants", one.id) },
            { label: "Open access log", opens: consoleHref("tenants", one.id, "Access log") },
          ],
        }}
      />
    ),
  };
}

/** One field's level changed — logged, and the contributor told, before it takes effect. */
function ChangeSharing({ tenant, field, by, ...held }: HeldBy & { tenant: Tenant; field: Tenant["sharing"][number]; by: string }) {
  return (
    <FormDialog
      {...held}
      confirm="Change"
      draft={{ level: owed.choice, reason: owed.longtext }}
      onCommit={(draft) => changeSharing(tenant.id, field.field, draft.level as SharingLevel, by, draft.reason.trim())}
    >
      <Field
        as="choice"
        name="level"
        label={field.field}
        options={SHARING_LEVELS.filter((one) => one !== field.level).map((one) => ({ value: one, title: one, description: MEANS[one] }))}
      />
      <Field as="longtext" name="reason" label="Reason" help={`${tenant.name} is notified with it, and it stands in their access log.`} />
    </FormDialog>
  );
}

/**
 * "Under audit only" — a logged, TIME-BOXED window on one private field. It opens at once, closes on
 * its own, and the contributor reads it in its own access log (S5-6) as it opens.
 */
function RequestAudit({ tenant, by, ...held }: HeldBy & { tenant: Tenant; by: string }) {
  // PRIVATE fields only: an encrypted one is held under the contributor's own key, which Sureel never has.
  const hidden = tenant.sharing.filter((one) => one.level === "Private");
  const conflicts = CONFLICTS.filter((one) => one.parties.includes(tenant.id) && one.state !== "Resolved");
  return (
    <FormDialog
      {...held}
      confirm="Open window"
      draft={{ field: owed.choice, window: owed.choice, about: unanswered.choice, reason: owed.longtext }}
      onCommit={(draft) => requestAudit(tenant.id, by, draft.field, Number(draft.window), draft.reason.trim(), draft.about || undefined)}
    >
      <Field as="choice" name="field" label="Field" options={hidden.map((one) => ({ value: one.field, title: one.field, description: one.level }))} />
      <Field
        as="choice"
        name="window"
        label="Window"
        help="It closes on its own. Nothing read inside it is kept outside the conflict it serves."
        options={AUDIT_WINDOWS.map((one) => ({ value: String(one), title: `${one} minutes` }))}
      />
      {conflicts.length ? (
        <Field
          as="choice"
          name="about"
          label="For the conflict"
          options={conflicts.map((one) => ({ value: one.id, title: one.kind, description: one.id }))}
        />
      ) : null}
      <Field as="longtext" name="reason" label="Reason" help={`${tenant.name} reads it in its access log.`} />
    </FormDialog>
  );
}

export function TenantPage(id: string, written: string | undefined, persona: Persona): Shown {
  const tenant = tenants().find((one) => one.id === id);
  if (!tenant)
    return {
      place: { at: "Tenants" },
      page: (
        <Alert intent="danger" title="No such tenant">
          {`No contributor tenant ${id}.`}
        </Alert>
      ),
    };
  const facet = facetOf(TENANT_FACETS, written);
  return { place: tenantPlace(tenant, facet), page: <TenantDetail key={id} id={id} facet={facet} persona={persona} /> };
}

/**
 * One tenant, as a record with facets: what it shares, every read of its data, the audit windows
 * ops opened on it, and every change to its policy. The band's one action is the audit request —
 * the only way ops sees a private term.
 */
function TenantDetail({ id, facet, persona }: { id: string; facet: TenantFacet; persona: Persona }) {
  const tenant = tenantById(id);
  const by = SIGNED_IN[persona].name;
  const ops = persona === "Rights ops";
  const audit: Command = ops ? { label: "Request audit access", dialog: <RequestAudit tenant={tenant} by={by} /> } : { label: "Request audit access", unavailable: OPS_ONLY };

  const FACETS: Record<TenantFacet, { header?: DetailFacet; body: ReactNode }> = {
    Overview: { body: <TenantOverview tenant={tenant} /> },
    Sharing: { header: { name: "Sharing" }, body: <TenantSharing tenant={tenant} persona={persona} /> },
    "Access log": { header: { name: "Access log" }, body: <TenantAccess tenant={tenant} /> },
    "Audit requests": {
      header: { name: "Audit requests" },
      body: <TenantAudits tenant={tenant} />,
    },
    "Policy log": { header: { name: "Policy log" }, body: <TenantPolicyLog tenant={tenant} /> },
  };
  const shown = FACETS[facet];
  return (
    <DetailPage
      record={{
        mark: partyOrName(tenant.id),
        name: tenant.name,
        kind: "Contributor tenant",
        facts: [{ identifier: tenant.id, standard: "id" }, { text: `${tenant.sharing.length} fields under policy` }],
        actions: ops ? [{ label: "Request audit access", primary: true, dialog: <RequestAudit tenant={tenant} by={by} /> }] : [],
        more: [...(ops ? [] : [audit]), { label: "Open batches", opens: consoleHref("batches") }],
      }}
      facet={shown.header}
    >
      {shown.body}
    </DetailPage>
  );
}

function TenantOverview({ tenant }: { tenant: Tenant }) {
  const audits = auditsOf(tenant.id);
  return (
    <DetailOverview>
      <DetailOverviewGrid>
        <FacetCard
          title="Sharing"
          opens={consoleHref("tenants", tenant.id, "Sharing")}
          figures={SHARING_LEVELS.map((level) => ({ label: level, as: "count" as const, value: tenant.sharing.filter((one) => one.level === level).length }))}
        />
        <FacetCard
          title="Access log"
          opens={consoleHref("tenants", tenant.id, "Access log")}
          figures={[
            { label: "Reads", as: "count", value: tenant.access.length },
            { label: "Under audit", as: "count", value: tenant.access.filter((one) => one.audit).length },
          ]}
        />
        <FacetCard
          title="Audit requests"
          opens={consoleHref("tenants", tenant.id, "Audit requests")}
          figures={[
            { label: "Open now", as: "count", value: audits.filter(isOpen).length },
            { label: "All", as: "count", value: audits.length },
          ]}
        />
        <FacetCard title="Policy log" opens={consoleHref("tenants", tenant.id, "Policy log")} figures={[{ label: "Changes", as: "count", value: policyLogOf(tenant.id).length }]} />
      </DetailOverviewGrid>
    </DetailOverview>
  );
}

function TenantSharing({ tenant, persona }: { tenant: Tenant; persona: Persona }) {
  const by = SIGNED_IN[persona].name;
  return (
    <RecordIndex
      rows={tenant.sharing}
      rowKey={(one) => one.field}
      noun={{ one: "field", many: "fields" }}
      identity={{ title: "Field", name: (one) => one.field }}
      note={
        <Alert intent="info" title="A policy change is the contributor's to know">
          Every change is logged with its reason, and the contributor is notified before it takes effect.
        </Alert>
      }
      columns={[
        { name: "Level", value: (one) => SHARING_LEVELS.indexOf(one.level), cell: (one) => one.level },
        { name: "What it means", value: (one) => MEANS[one.level], cell: (one) => MEANS[one.level] },
      ]}
      readings={[
        { name: "All", holds: () => true },
        ...SHARING_LEVELS.map((level) => ({ name: level, holds: (one: Tenant["sharing"][number]) => one.level === level })),
      ]}
      commands={(one) => [
        persona === "Rights ops"
          ? { label: "Change level", mark: "share", dialog: <ChangeSharing tenant={tenant} field={one} by={by} /> }
          : { label: "Change level", mark: "share", unavailable: OPS_ONLY },
      ]}
      chooser={false}
    />
  );
}

/** Every read of the tenant's data, newest first — the same log the contributor reads (S5-6). */
function TenantAccess({ tenant }: { tenant: Tenant }) {
  return (
    <RecordIndex
      rows={tenant.access}
      rowKey={(one) => `${one.at.getTime()}-${one.who}`}
      noun={{ one: "read", many: "reads" }}
      identity={{ title: "Who", name: (one) => one.who }}
      columns={[
        { name: "When", as: "date", grain: "minute", value: (one) => one.at },
        { name: "Through", value: (one) => one.via, cell: (one) => one.via },
        { name: "What", value: (one) => one.what, cell: (one) => one.what },
      ]}
      readings={[
        { name: "All", holds: () => true },
        { name: "Under audit", holds: (one) => Boolean(one.audit) },
      ]}
      chooser={false}
      empty={{ holder: "this tenant", line: true }}
    />
  );
}

function TenantAudits({ tenant }: { tenant: Tenant }) {
  return (
    <RecordIndex
      rows={auditsOf(tenant.id)}
      rowKey={(one) => one.id}
      noun={{ one: "audit request", many: "audit requests" }}
      identity={{ title: "Request", name: (one) => one.id, mark: (one) => personMark(one.who) }}
      columns={[
        { name: "Who", value: (one) => one.who, cell: (one) => one.who },
        { name: "Field", value: (one) => one.field, cell: (one) => one.field },
        { name: "Window, minutes", as: "count", value: (one) => one.window },
        { name: "Opens", as: "date", grain: "minute", value: (one) => one.opens },
        { name: "Closes", as: "date", grain: "minute", value: (one) => one.closes },
        { name: "Conflict", value: (one) => one.about ?? "", cell: (one) => one.about ?? null },
        { name: "Reason", value: (one) => one.reason, cell: (one) => one.reason },
      ]}
      readings={[
        { name: "All", holds: () => true },
        { name: "Open now", holds: (one: Audit) => isOpen(one) },
      ]}
      commands={(one) => (one.about ? [{ label: "Open conflict", opens: consoleHref("conflicts", one.about) }] : [])}
      chooser={false}
      empty={{ holder: "this tenant", line: true }}
    />
  );
}

function TenantPolicyLog({ tenant }: { tenant: Tenant }) {
  return (
    <RecordIndex
      rows={policyLogOf(tenant.id)}
      rowKey={(one) => `${one.at.getTime()}-${one.field}`}
      noun={{ one: "change", many: "changes" }}
      identity={{ title: "Field", name: (one) => one.field }}
      columns={[
        { name: "Before", value: (one) => one.before, cell: (one) => one.before },
        { name: "After", value: (one) => one.after, cell: (one) => one.after },
        { name: "By", value: (one) => one.by, cell: (one) => one.by },
        { name: "When", as: "date", grain: "minute", value: (one) => one.at },
        { name: "Reason", value: (one) => one.reason, cell: (one) => one.reason },
        { name: "Notified", value: (one) => one.notified, cell: (one) => one.notified },
      ]}
      chooser={false}
      empty={{ holder: "this tenant", line: true }}
    />
  );
}

function tenantPlace(tenant: Tenant, facet: TenantFacet): ShellPlace {
  return {
    at: "Tenants",
    page: tenant.name,
    record: {
      back: { index: "Contributor tenants", opens: consoleHref("tenants") },
      facets: TENANT_FACETS,
      at: facet,
      addressOf: (one) => consoleHref("tenants", tenant.id, one === "Overview" ? undefined : one),
    },
    trail: [{ label: "Tenants", opens: consoleHref("tenants") }, { label: tenant.name }],
  };
}
