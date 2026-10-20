import {
  Alert,
  Badge,
  CollectionPage,
  DetailPage,
  Explained,
  Field,
  FormDialog,
  RecordIndex,
  Text,
  formatCount,
  formatMeta,
  formatPercent,
  owed,
  type HeldBy,
  type ShellPlace,
} from "@revelator/pro-ui";

import { FEEDS, GRANTS, PARTNERS, assetById, partyName } from "../../../graph/fixtures";
import type { Asset, Grant, ScopeLevel, Use } from "../../../graph/model";
import { clearanceOf, performersOf, recordingsOf, type Answer, type Clearance } from "../../../graph/resolve";
import { ClearanceBadge } from "../../../rights/kit";
import { go } from "../../../route";
import { assetMark } from "./catalogue";
import { ALL_USES, COUNTRIES, SCOPE_WORD, assetRightsHref, catalogue, labelReleases, rightsHref } from "./data";
import { exportCommand } from "./shared";

/** An answer, in the order the matrix sorts it — what is blocked first. */
const ORDER: Record<Answer, number> = { Denied: 0, "Needs review": 1, Granted: 2 };

/** Where the answer came from, as a reader says it: the scope, or the default when nothing granted. */
const decidedWord = (clearance: Clearance) => (clearance.decidedAt === "Default" ? "Default" : SCOPE_WORD[clearance.decidedAt]);

/**
 * One cell of the matrix: the answer, as its state family draws it, with the scope that decided it
 * and the resolver's reason a hover away.
 */
function Cell({ clearance }: { clearance: Clearance }) {
  return (
    <Explained why={`Decided at ${decidedWord(clearance).toLowerCase()} level. ${clearance.reason}`}>
      <ClearanceBadge state={clearance.state} />
    </Explained>
  );
}

/** The question every cell answers: for whom, and where. */
interface Ask {
  country: string;
  partner?: string;
}
const askLine = ({ country, partner }: Ask) =>
  formatMeta([partner ? `Asked for ${partyName(partner)}` : "Asked for any approved partner", `in ${country}`, "today"]) ?? "";

/**
 * The feed whose lateness makes an answer here suspect — the composition side in a society's
 * territory reads that society's acknowledgements. The ERROR state the FRD asks for, shown where
 * it bears.
 */
function staleFeed(country: string) {
  if (country !== "DE") return null;
  const feed = FEEDS.find((one) => one.state === "Failing" && one.name.startsWith("GEMA"));
  return feed ? (
    <Alert intent="danger" title="Composition answers may be stale">
      {`${feed.name} is failing — ${formatPercent(feed.errorRate)} of rows in error, ${formatCount(feed.lagHours, { one: "hour", many: "hours" })} behind. Composition-side answers in ${country} are read from it.`}
    </Alert>
  ) : null;
}

/** Changing who asks and where — every cell is answered again for them. */
function AskAs({ ask, to, ...held }: HeldBy & { ask: Ask; to: (ask: Ask) => string }) {
  return (
    <FormDialog
      {...held}
      confirm="Read"
      draft={{ country: owed(ask.country), partner: ask.partner ?? "" }}
      onCommit={(draft) => go(to({ country: draft.country, partner: draft.partner || undefined }))}
    >
      <Field
        as="choice"
        name="country"
        label="Territory"
        noun={{ one: "territory", many: "territories" }}
        options={COUNTRIES.map((code) => ({ value: code, title: code }))}
      />
      <Field
        as="record"
        name="partner"
        label="Partner"
        entity="organization"
        noun={{ one: "partner", many: "partners" }}
        options={PARTNERS.map((one) => ({ value: one.id, title: one.name }))}
        help="Left blank, a cell is granted where any approved partner is."
      />
    </FormDialog>
  );
}

/**
 * Clearances (S1-4): every recording, video and release of the label, each use across — what a
 * partner would be told now, the scope that decided it and why, read from the resolver.
 *
 * A COLLECTION PAGE over the catalogue. Who asks and where is not a slice of the rows but the
 * question every cell answers, so it is held in the ADDRESS and changed from the header (gaps); a
 * row opens that asset's own matrix, use by use and scope by scope.
 */
export function Clearances({ country, partner }: Ask) {
  const ask = { country, partner };
  const to = (next: Ask) => rightsHref("clearances", "in", next.country, next.partner);
  const rows: Asset[] = [...catalogue(), ...labelReleases()];
  const answers = new Map(rows.map((one) => [one.id, new Map(ALL_USES.map((use) => [use, clearanceOf(one.id, use, ask)]))]));
  const of = (one: Asset, use: Use) => answers.get(one.id)!.get(use)!;
  return (
    <CollectionPage
      title="Clearances"
      actions={[{ label: "Ask as", dialog: <AskAs ask={ask} to={to} /> }]}
      more={[exportCommand(`Clearances · ${askLine(ask)}`)]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "asset", many: "assets" },
        note: staleFeed(country) ?? <Text>{askLine(ask)}</Text>,
        identity: {
          title: "Asset",
          name: (one) => one.title,
          mark: assetMark,
          sortable: true,
          opens: (one) => rightsHref("clearances", one.id, country, partner),
        },
        columns: [
          { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
          ...ALL_USES.map((use) => ({
            name: use,
            value: (one: Asset) => ORDER[of(one, use).state],
            cell: (one: Asset) => <Cell clearance={of(one, use)} />,
          })),
        ],
        filters: [
          { kind: "anyOf", key: "kind", label: "Kind", options: ["Recording", "Video", "Release"], of: (one) => one.kind },
          {
            kind: "switches",
            key: "blocked",
            label: "Answer",
            switches: [
              {
                key: "ai-denied",
                label: "An AI use denied",
                holds: (one) =>
                  ["AI training", "AI derivative", "Voice/NIL", "AI streaming"].some((use) => of(one, use as Use).state === "Denied"),
              },
              {
                key: "review",
                label: "Something needs review",
                holds: (one) => ALL_USES.some((use) => of(one, use).state === "Needs review"),
              },
            ],
          },
        ],
        commands: (one) => [
          { label: "Open clearances", opens: rightsHref("clearances", one.id, country, partner) },
          { label: "Open rights", opens: assetRightsHref(one) },
        ],
        empty: { holder: "this catalogue" },
      }}
    />
  );
}

/** The scopes a master grant on this asset can be stored at, most specific first. */
function scopesOf(asset: Asset): { level: ScopeLevel; refs: string[] }[] {
  const release = asset.releaseId ?? (asset.kind === "Video" ? recordingsOf(asset)[0]?.releaseId : undefined);
  return [
    { level: "Asset", refs: [asset.id, ...(asset.kind === "Video" ? recordingsOf(asset).map((one) => one.id) : [])] },
    { level: "Release", refs: asset.kind === "Release" ? [asset.id] : release ? [release] : [] },
    { level: "Catalogue", refs: asset.labelId ? [asset.labelId] : [] },
    { level: "Artist", refs: performersOf(asset) },
  ];
}

/**
 * What one scope HOLDS for a use — the grant stored there, as its effect reads. A stored fact, not
 * an answer: the answer is the Effective column, which the resolver gives.
 */
function storedAt(level: ScopeLevel, refs: readonly string[], use: Use, ask: Ask): Grant | undefined {
  const here = GRANTS.filter(
    (one) =>
      (one.level === level || (level === "Catalogue" && one.level === "Label")) &&
      refs.includes(one.ref) &&
      one.use === use &&
      one.side !== "Composition" &&
      one.state !== "Revoked" &&
      (!ask.partner ||
        one.partners.mode === "All approved" ||
        (one.partners.mode === "Allowlist") === one.partners.ids.includes(ask.partner)),
  );
  return here.find((one) => one.effect === "Deny") ?? here[0];
}
const heldAs = (grant: Grant): Answer =>
  grant.state === "Paused" || grant.unauthorized ? "Needs review" : grant.effect === "Deny" ? "Denied" : "Granted";

/** What one asset is cleared for, by use — the rows the asset matrix reads down. */
interface UseRow {
  use: Use;
  clearance: Clearance;
}

/**
 * One asset's clearance matrix (FRD pattern 3): use types down, scope across — track, release,
 * catalogue, artist — each cell what that scope holds, then what the graph answers and the scope
 * that decided it. Master and composition are read apart (G-3): the master's answer, then each
 * publisher's for each work.
 */
export function AssetClearances({ id, country, partner }: { id: string } & Ask) {
  const asset = assetById(id);
  const ask = { country, partner };
  const rows: UseRow[] = ALL_USES.map((use) => ({ use, clearance: clearanceOf(id, use, ask) }));
  const scopes = scopesOf(asset);
  return (
    <DetailPage
      record={{
        mark: assetMark(asset),
        name: asset.title,
        kind: asset.kind,
        facts: [
          ...(asset.isrc ? [{ identifier: asset.isrc, standard: "isrc" as const }] : []),
          ...(asset.upc ? [{ identifier: asset.upc, standard: "upc" as const }] : []),
          { text: asset.artist ?? "" },
          { text: askLine(ask) },
        ],
        actions: [
          { label: "Ask as", dialog: <AskAs ask={ask} to={(next) => rightsHref("clearances", id, next.country, next.partner)} /> },
          { label: "Open rights", primary: true, opens: assetRightsHref(asset) },
        ],
        more: [exportCommand(`Clearances · ${asset.title}`)],
      }}
    >
      <RecordIndex
        rows={rows}
        rowKey={(one) => one.use}
        noun={{ one: "use", many: "uses" }}
        note={staleFeed(country) ?? undefined}
        identity={{ title: "Use", name: (one) => one.use }}
        columns={[
          { name: "Effective", value: (one) => ORDER[one.clearance.state], cell: (one) => <ClearanceBadge state={one.clearance.state} /> },
          { name: "Decided at", value: (one) => decidedWord(one.clearance), cell: (one) => decidedWord(one.clearance) },
          ...scopes.map(({ level, refs }) => ({
            name: SCOPE_WORD[level],
            value: (one: UseRow) => {
              const grant = storedAt(level, refs, one.use, ask);
              return grant ? ORDER[heldAs(grant)] : 3;
            },
            cell: (one: UseRow) => {
              const grant = storedAt(level, refs, one.use, ask);
              return grant ? (
                <Explained
                  why={
                    formatMeta([
                      `${grant.effect} by ${partyName(grant.grantedBy)}`,
                      grant.state,
                      grant.partners.mode === "Allowlist" ? `for ${grant.partners.ids.map(partyName).join(", ")}` : grant.partners.mode,
                    ]) ?? ""
                  }
                >
                  <ClearanceBadge state={heldAs(grant)} />
                </Explained>
              ) : undefined;
            },
          })),
          {
            name: "Master",
            value: (one) => ORDER[one.clearance.master.state],
            cell: (one) => <Badge status={`clearance:${one.clearance.master.state}`} />,
          },
          {
            name: "Composition",
            value: (one) => one.clearance.composition.length,
            cell: (one) =>
              one.clearance.composition.length
                ? formatMeta(
                    one.clearance.composition.map(
                      (side) => `${side.party ? partyName(side.party) : (side.work?.title ?? "No work")}: ${side.state}`,
                    ),
                  )
                : "Not read for this use",
          },
          { name: "Why", value: (one) => one.clearance.reason, cell: (one) => one.clearance.reason },
        ]}
        chooser={false}
        empty={{ holder: "this asset", line: true }}
      />
    </DetailPage>
  );
}

/** Where one asset's matrix is: under Clearances, reached past the index. */
export const assetClearancesPlace = (id: string): ShellPlace => ({
  at: "Rights",
  page: "Clearances",
  trail: [
    { label: "Rights", opens: rightsHref("overview") },
    { label: "Clearances", opens: rightsHref("clearances") },
    { label: assetById(id)?.title ?? id },
  ],
});
