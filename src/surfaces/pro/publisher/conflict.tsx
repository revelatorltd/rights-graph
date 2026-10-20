import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Avatar,
  Badge,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  FacetCard,
  FactCard,
  Field,
  FormDialog,
  RecordIndex,
  SectionRun,
  Sections,
  StatCard,
  StatCardRow,
  Step,
  Stepper,
  TitledSection,
  UploaderDocument,
  UploaderFileRow,
  formatPercent,
  owed,
  type DetailFacet,
  type HeldBy,
  type RecordNavProps,
  type ShellPlace,
} from "@revelator/pro-ui";

import { AGREEMENTS, conflictById, partyById, partyName } from "../../../graph/fixtures";
import { COUNTERCLAIM_STEPS, type Assertion, type Conflict, type Interest, type ShareType, type TerritorySet } from "../../../graph/model";
import { shareTotals, standing, territoryLabel, tierOf, useGraph } from "../../../graph/resolve";
import { TerritoryChip, TierChip, decidedBy, partyMark } from "../../../rights/kit";
import { slug } from "../../../route";
import { WithdrawClaim } from "./claim-dialogs";
import { OPS_ONLY, conflictName } from "./conflicts";
import {
  ME,
  SHARE_RIGHTS,
  acceptIn,
  assetName,
  chainOf,
  claimsOf,
  countryName,
  evidenceOn,
  fileEvidence,
  meta,
  reportedOn,
  rightsHref,
  shareLines,
  societyOf,
} from "./data";

export const CONFLICT_FACETS = ["Overview", "Claims", "Territories", "Counterclaim"] as const;
export type ConflictFacet = (typeof CONFLICT_FACETS)[number];
export const conflictFacetOf = (segment?: string): ConflictFacet => CONFLICT_FACETS.find((one) => slug(one) === segment) ?? "Overview";
const conflictHref = (id: string, facet: ConflictFacet = "Overview") => rightsHref("conflicts", id, facet === "Overview" ? undefined : slug(facet));

/** A claim the conflict counts — one the graph holds, or one a contributor reported in its tenant. */
interface ClaimRow {
  key: string;
  partyId: string;
  interests: readonly Interest[];
  shareType: ShareType;
  share: number;
  shareOf?: string;
  territory: TerritorySet;
  source: string;
  sourceRef: string;
  state: Assertion["state"];
  /** Held in the graph — or only reported, its agreement private to whoever reported it. */
  held: boolean;
}

function rowsOf(conflict: Conflict): ClaimRow[] {
  return [
    ...claimsOf(conflict).map((one) => ({ ...one, key: one.id, held: true })),
    ...reportedOn(conflict.id).map((one) => ({ ...one, state: "Contested" as const, held: false })),
  ];
}

/** Harbor's own standing claim in the conflict — what it can withdraw or back with evidence. */
const mineIn = (conflict: Conflict) => claimsOf(conflict).find((one) => one.partyId === ME && standing(one));

/**
 * Harbor's evidence on a conflict — the agreement it rests on, uploaded (F5 step 4). Filing it
 * moves the tracker on, and the other side reads the same tracker.
 */
function UploadEvidence({ conflict, ...held }: HeldBy & { conflict: Conflict }) {
  const [files, setFiles] = useState<File[]>([]);
  const agreements = AGREEMENTS.filter((one) => one.parties.includes(ME));
  return (
    <FormDialog
      {...held}
      confirm="Upload evidence"
      onClose={() => setFiles([])}
      ready={files.length > 0}
      draft={{ agreement: owed(agreements.find((one) => one.kind === "Sub-publishing")?.id ?? agreements[0]!.id) }}
      onCommit={(draft) => {
        const agreement = AGREEMENTS.find((one) => one.id === draft.agreement);
        for (const file of files) fileEvidence(conflictById(conflict.id), { name: file.name, size: file.size, agreement: agreement?.code });
        setFiles([]);
      }}
    >
      <Field
        as="choice"
        name="agreement"
        label="What it proves"
        help="The agreement the file is a copy of — it is filed against that agreement."
        options={agreements.map((one) => ({ value: one.id, title: one.code, description: one.title }))}
      />
      <UploaderDocument
        accept=".pdf"
        formats="PDF"
        noun={{ one: "agreement", many: "agreements" }}
        onSelect={(picked) => setFiles((was) => [...was, ...Array.from(picked)])}
      >
        {files.map((one) => (
          <UploaderFileRow key={one.name} name={one.name} phase="landed" fileSize={one.size} onRemove={() => setFiles((was) => was.filter((each) => each !== one))} />
        ))}
      </UploaderDocument>
    </FormDialog>
  );
}

/**
 * One conflict, as a party to it reads it (S2-6, S2-7, S2-8): every claim side by side with its
 * source, the total against 100%, territory by territory what is still disputed, and the
 * counterclaim — the current state next to Harbor's claim, the summary both sides file, the
 * evidence, and the four-step tracker both sides see the same.
 *
 * Harbor RESPONDS: it files evidence, accepts the resolved state where it agrees, or withdraws its
 * claim. Resolving is Sureel's (Roles and permissions), so the command says so rather than vanish.
 */
export function ConflictDetail({ id, facet }: { id: string; facet: ConflictFacet }) {
  useGraph();
  const conflict = conflictById(id);
  const mine = mineIn(conflict);
  const open = conflict.state !== "Resolved";
  const upload = { label: "Upload evidence", mark: "upload" as const, dialog: <UploadEvidence conflict={conflict} /> };

  const FACETS: Record<ConflictFacet, { header?: DetailFacet; body: ReactNode }> = {
    Overview: { body: <ConflictOverview conflict={conflict} /> },
    Claims: { header: { name: "Claims" }, body: <ConflictClaims conflict={conflict} /> },
    Territories: { header: { name: "Territories" }, body: <ConflictTerritories conflict={conflict} /> },
    // Uploading evidence is the band's, which stands over every facet: drawn here too, it would be twice.
    Counterclaim: { header: { name: "Counterclaim" }, body: <Counterclaim conflict={conflict} /> },
  };
  const shown = FACETS[facet];

  return (
    <DetailPage
      record={{
        mark: <Avatar kind="work" name={assetName(conflict.assetId)} />,
        name: conflictName(conflict),
        kind: `${conflict.side} conflict`,
        status: `conflict:${conflict.state}`,
        facts: [
          ...(conflict.total !== undefined ? [{ as: "percent" as const, value: conflict.total, label: "Claimed" }] : []),
          { as: "money", value: conflict.revenueAtRisk, label: "At risk" },
          { text: `${conflict.severity} severity` },
        ],
        actions: open ? [{ ...upload, primary: true }] : [],
        more: [
          open ? { label: "Accept by territory", opens: conflictHref(conflict.id, "Territories") } : { label: "Accept by territory", unavailable: "Resolved: nothing is left to accept." },
          mine && open
            ? { label: "Withdraw my claim", destructive: true, dialog: <WithdrawClaim claim={mine} /> }
            : { label: "Withdraw my claim", destructive: true, unavailable: open ? "Harbor Music has no standing claim of its own in this conflict." : "Resolved." },
          { label: "Resolve", unavailable: OPS_ONLY },
          { label: "Open work", opens: rightsHref("works", conflict.assetId) },
        ],
      }}
      facet={shown.header}
    >
      {shown.body}
    </DetailPage>
  );
}

/** The recap: what is claimed against 100%, what it puts at risk, what is still open — and the way into each. */
function ConflictOverview({ conflict }: { conflict: Conflict }) {
  const rows = rowsOf(conflict);
  const accepted = conflict.accepted ?? [];
  const open = conflict.state === "Resolved" ? 0 : conflict.territories.length - accepted.length;
  return (
    <DetailOverview>
      <StatCardRow>
        <StatCard name="Claimed" as="percent" value={conflict.total ?? null} hint="Every standing claim on the share type, added up — 100% is whole." />
        <StatCard name="Revenue at risk" as="money" value={conflict.revenueAtRisk} />
        <StatCard name="Territories open" as="count" value={open} />
      </StatCardRow>
      <DetailOverviewGrid>
        <FacetCard
          title="Claims"
          count={rows.length}
          opens={conflictHref(conflict.id, "Claims")}
          figures={[
            { label: "Harbor Music's", as: "count", value: rows.filter((one) => one.partyId === ME).length },
            { label: "Other parties'", as: "count", value: rows.filter((one) => one.partyId !== ME).length },
          ]}
        />
        <FacetCard
          title="Territories"
          count={conflict.territories.length}
          opens={conflictHref(conflict.id, "Territories")}
          figures={[
            { label: "Open", as: "count", value: open },
            { label: "Accepted", as: "count", value: accepted.length },
          ]}
        />
        <FacetCard
          title="Counterclaim"
          opens={conflictHref(conflict.id, "Counterclaim")}
          facts={[
            { label: "Step", value: meta(`Step ${Math.min(conflict.step + 1, 4)} of 4`, COUNTERCLAIM_STEPS[conflict.step]) },
            { label: "Evidence filed", value: String(evidenceOn(conflict.id).length) },
          ]}
        />
        <FacetCard
          title="Until it is resolved"
          facts={[
            { label: "Interim", value: conflict.interim },
            { label: "Raised by", value: conflict.raisedBy },
            { label: "Opened", as: "date", value: conflict.opened },
            { label: "With Sureel", value: conflict.assignee ?? "Not assigned yet" },
          ]}
        />
      </DetailOverviewGrid>
    </DetailOverview>
  );
}

/** Every claim the conflict counts, side by side, each with its source and tier — the total against 100% above them. */
function ConflictClaims({ conflict }: { conflict: Conflict }) {
  const over = (conflict.total ?? 100) - 100;
  return (
    <RecordIndex
      rows={rowsOf(conflict)}
      rowKey={(one) => one.key}
      noun={{ one: "claim", many: "claims" }}
      identity={{ title: "Party", name: (one) => partyName(one.partyId), mark: (one) => partyMark(one.partyId) }}
      note={
        conflict.kind === "Overclaim" && conflict.total !== undefined ? (
          <Alert intent={conflict.state === "Resolved" ? "success" : "danger"} title={`Claimed ${formatPercent(conflict.total)} of 100%`}>
            {conflict.state === "Resolved"
              ? `Resolved: ${conflict.resolution?.reason ?? ""}`
              : `${formatPercent(over)} over in ${conflict.territories.map(countryName).join(", ")}. ${conflict.interim}`}
          </Alert>
        ) : undefined
      }
      columns={[
        { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`claim:${one.state}`} /> },
        { name: "Interest", value: (one) => one.interests.join(", "), cell: (one) => one.interests.join(", ") },
        { name: "Share type", value: (one) => one.shareType, cell: (one) => one.shareType },
        { name: "Share", as: "percent", value: (one) => one.share },
        { name: "Of", value: (one) => one.shareOf ?? "", cell: (one) => one.shareOf },
        { name: "Territory", value: (one) => territoryLabel(one.territory), cell: (one) => <TerritoryChip set={one.territory} /> },
        { name: "Source", value: (one) => one.source, cell: (one) => one.source },
        {
          name: "Reference",
          value: (one) => one.sourceRef,
          // What another contributor holds privately stays private: its file is named, its agreement is not.
          cell: (one) => (one.held ? one.sourceRef : meta(one.sourceRef, `agreement private to ${partyName(one.partyId)}`)),
        },
        { name: "Tier", value: () => tierOf(conflict.assetId), cell: (one) => (one.held ? <TierChip tier={tierOf(conflict.assetId)} /> : <TierChip tier={1} />) },
      ]}
      chooser={false}
      empty={{ holder: "this conflict", line: true }}
    />
  );
}

/**
 * Territory by territory (S2-7): what the graph holds there now, and whether Harbor has accepted
 * it. Accepting closes the dispute in the territories held; the others stay open.
 */
function ConflictTerritories({ conflict }: { conflict: Conflict }) {
  const version = useGraph();
  const resolved = conflict.state === "Resolved";
  // The SAME rows until the graph changes, so what is held survives a redraw.
  const rows = useMemo(
    () => conflict.territories.map((code) => ({ code, accepted: resolved || (conflict.accepted ?? []).includes(code) })),
    [conflict, version, resolved],
  );
  const totalIn = (code: string, shareType: string) => shareTotals(conflict.assetId, code === "World" ? "US" : code).find((one) => one.shareType === shareType)?.total ?? null;
  return (
    <RecordIndex
      rows={rows}
      rowKey={(one) => one.code}
      noun={{ one: "territory", many: "territories" }}
      identity={{ title: "Territory", name: (one) => countryName(one.code), mark: (one) => <Avatar kind="place" name={countryName(one.code)} /> }}
      note={
        <Alert intent="info" title="Accept where you agree, keep disputing elsewhere">
          Accepting the current state closes this conflict in the territories you hold. The rest remain disputed until they are accepted or Sureel rights ops resolves them.
        </Alert>
      }
      columns={[
        {
          name: "State",
          value: (one) => (one.accepted ? 1 : 0),
          cell: (one) => <Badge status={one.accepted ? "conflict:Resolved" : `conflict:${conflict.state}`} />,
        },
        { name: "Publisher shares now", as: "percent", value: (one) => totalIn(one.code, "Publisher") },
        { name: "Writer shares now", as: "percent", value: (one) => totalIn(one.code, "Writer") },
        { name: "Interim", value: () => conflict.interim, cell: (one) => (one.accepted ? "Closed here" : conflict.interim) },
      ]}
      holdable={(one) => !one.accepted}
      selection={(held) => [{ label: "Accept the current state", opens: () => acceptIn(conflict.id, held.map((one) => one.code)) }]}
      commands={(one) => [
        one.accepted
          ? { label: "Accept the current state", unavailable: "Accepted here already." }
          : { label: "Accept the current state", opens: () => acceptIn(conflict.id, [one.code]) },
      ]}
      chooser={false}
      empty={{ holder: "this conflict", line: true }}
    />
  );
}

/** One party's line in the counterclaim's summary: who, their IPI, their chain, their society, their share per right. */
interface SummaryRow {
  partyId: string;
  chain: string;
  shares: Partial<Record<(typeof SHARE_RIGHTS)[number], number>>;
}

function summaryOf(conflict: Conflict): SummaryRow[] {
  const country = conflict.territories.find((one) => one !== "World") ?? "US";
  const lines = shareLines(conflict.assetId, country).filter((one) => one.shareType === "Publisher");
  const hops = chainOf(conflict.assetId);
  const parties = [...new Set([...conflict.parties, ...reportedOn(conflict.id).map((one) => one.partyId)])];
  return parties.map((partyId) => {
    const name = partyName(partyId);
    const reached = hops.filter((one) => one.to === name || one.from === name);
    const chain = reached.length
      ? [reached[0]!.from, ...reached.filter((one) => one.role !== "Collector").map((one) => `${one.to}${one.territory.include === "World" ? "" : ` (${territoryLabel(one.territory)})`}`)].join(" → ")
      : "Not shared by its contributor";
    const reported = reportedOn(conflict.id).find((one) => one.partyId === partyId);
    const shares: SummaryRow["shares"] = {};
    for (const line of lines) {
      const held = line.claims.filter((one) => one.partyId === partyId).map((one) => one.share);
      const value = held.length ? Math.max(...held) : reported?.share;
      if (value !== undefined) shares[line.right] = value;
    }
    return { partyId, chain, shares };
  });
}

/** Where the counterclaim stands in its four steps — the same tracker both sides see. */
function Tracker({ conflict }: { conflict: Conflict }) {
  const resolved = conflict.state === "Resolved";
  return (
    <Stepper>
      {COUNTERCLAIM_STEPS.map((label, at) => (
        <Step key={label} index={at + 1} label={label} state={resolved || at < conflict.step ? "done" : at === conflict.step ? "current" : "todo"} />
      ))}
    </Stepper>
  );
}

/**
 * The counterclaim (S2-8): the tracker, the current state next to Harbor's claim, the summary
 * both sides file — publisher, IPI, chain of title, society, share per right — and the evidence.
 * Each step change notifies the other parties.
 */
function Counterclaim({ conflict }: { conflict: Conflict }) {
  const mine = claimsOf(conflict).filter((one) => one.partyId === ME);
  const others = rowsOf(conflict).filter((one) => one.partyId !== ME);
  const country = conflict.territories.find((one) => one !== "World") ?? "US";
  const now = shareTotals(conflict.assetId, country).find((one) => one.shareType === "Publisher");
  const notified = conflict.parties.filter((one) => one !== ME).map(partyName);
  return (
    <Sections>
      <TitledSection title={`Step ${Math.min(conflict.step + 1, 4)} of 4`}>
        <Tracker conflict={conflict} />
      </TitledSection>
      <TitledSection title="Current state and your claim">
        <SectionRun>
          <FactCard
            title="Current state"
            facts={[
              { label: "Publisher shares", as: "percent", value: now?.total ?? null },
              ...others.map((one) => ({ label: partyName(one.partyId), value: meta(formatPercent(one.share), one.source) })),
              { label: "Paying on", value: conflict.interim },
              ...(conflict.resolution ? [{ label: "Resolved", value: `${decidedBy(conflict.resolution)} — ${conflict.resolution.reason}` }] : []),
            ]}
          />
          <FactCard
            title="Your claim"
            facts={
              mine.length
                ? mine.flatMap((one) => [
                    { label: "Share", value: meta(`${formatPercent(one.share)} ${one.shareType.toLowerCase()}`, territoryLabel(one.territory)) },
                    { label: "Source", value: meta(one.source, one.sourceRef) },
                    { label: "State", value: <Badge status={`claim:${one.state}`} /> },
                  ])
                : [{ label: "Share", value: null }]
            }
          />
        </SectionRun>
      </TitledSection>
      <TitledSection title="Summary">
        <RecordIndex
          rows={summaryOf(conflict)}
          rowKey={(one) => one.partyId}
          noun={{ one: "publisher", many: "publishers" }}
          identity={{ title: "Publisher", name: (one) => partyName(one.partyId), mark: (one) => partyMark(one.partyId) }}
          columns={[
            { name: "IPI", as: "identifier", standard: "ipi", value: (one) => partyById(one.partyId).ipi },
            { name: "Chain of title", value: (one) => one.chain, cell: (one) => one.chain },
            { name: "Society", value: (one) => societyOf(one.partyId) ?? "", cell: (one) => societyOf(one.partyId) },
            ...SHARE_RIGHTS.map((right) => ({ name: right, as: "percent" as const, value: (one: SummaryRow) => one.shares[right] ?? null })),
          ]}
          chooser={false}
          empty={{ holder: "this conflict", line: true }}
        />
      </TitledSection>
      <TitledSection title="Evidence">
        <RecordIndex
          rows={evidenceOn(conflict.id)}
          rowKey={(one) => one.key}
          noun={{ one: "file", many: "files" }}
          identity={{ title: "File", name: (one) => one.name, mark: (one) => <Avatar kind="document" name={one.name} /> }}
          note={<Alert intent="info">{`Each step change notifies ${notified.join(", ")} and Sureel rights ops.`}</Alert>}
          columns={[
            { name: "Filed by", value: (one) => partyName(one.by), cell: (one) => partyName(one.by) },
            { name: "Agreement", value: (one) => one.agreement ?? "", cell: (one) => one.agreement },
            { name: "Filed", as: "date", grain: "minute", value: (one) => one.at },
          ]}
          chooser={false}
          empty={{ holder: "this conflict", line: true }}
        />
      </TitledSection>
    </Sections>
  );
}

/** The conflict's facets, and the way back to the conflicts. */
function conflictNav({ id, facet }: { id: string; facet: ConflictFacet }): RecordNavProps<ConflictFacet> {
  return {
    back: { index: "Conflicts", opens: rightsHref("conflicts") },
    facets: CONFLICT_FACETS,
    at: facet,
    addressOf: (one) => conflictHref(id, one),
  };
}

/** Where one conflict's page is: its facets, and a trail through the conflicts. */
export const conflictPlace = ({ id, facet }: { id: string; facet: ConflictFacet }): ShellPlace => {
  const name = conflictName(conflictById(id));
  return {
    at: "Rights",
    page: name,
    record: conflictNav({ id, facet }),
    trail: [
      { label: "Rights", opens: rightsHref("overview") },
      { label: "Conflicts", opens: rightsHref("conflicts") },
      { label: name },
    ],
  };
};
