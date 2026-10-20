import {
  Alert,
  Avatar,
  CollectionPage,
  DetailPage,
  FactCard,
  Field,
  FormDialog,
  Metadata,
  formatDate,
  formatMeta,
  owed,
  type HeldBy,
} from "@revelator/pro-ui";

import { assetById, grantById, partyName } from "../../graph/fixtures";
import type { Use } from "../../graph/model";
import { GRAPH_VERSION, RULE_VERSION, clearanceOf, controllers, tierOf, type Answer } from "../../graph/resolve";
import { ClearanceBadge, TerritoryChip, TierChip, decidedBy } from "../../rights/kit";
import { go, href } from "../../route";
import { LOOKABLE, TERRITORIES, hasScope, lookUp, lookupById, lookupsOf, reasonFor, standingOf, territoryName, type Lookup, type Snapshot } from "./data";
import { downloadReceipt } from "./receipt";
import { partnerHref, type PartnerPage, type Working } from "./working";

const ANSWERS: readonly Answer[] = ["Granted", "Needs review", "Denied"];

/** The worst of a set of answers — the one a combined read would report. */
export const worst = (states: readonly Answer[]): Answer | undefined =>
  states.includes("Denied") ? "Denied" : states.includes("Needs review") ? "Needs review" : states[0];

/** Why the reader cannot look anything up, where they cannot — the permission-denied state. */
export function cannotLookUp(working: Working): string | undefined {
  if (standingOf(working.partner.id) !== "Active") return "Look-ups open once Sureel approves your application.";
  if (!hasScope(working.partner.id, "clearance:read")) return "None of your keys carries the clearance:read scope.";
  return undefined;
}

/**
 * A clearance look-up (S6-3): a recording or a work, found by its title, ISRC or ISWC; one of the
 * uses the partner was approved for; a territory. The graph answers and a receipt is minted for
 * the answer, whatever it is (S6-6). A DIALOG: three answers, and the look-ups it adds to stay in
 * view behind it.
 */
export function LookUp({ working, ...held }: HeldBy & { working: Working }) {
  const uses = working.partner.uses;
  return (
    <FormDialog
      {...held}
      confirm="Look up"
      draft={{ asset: owed.record, use: owed(uses[0] ?? ""), territory: owed("World") }}
      onCommit={(draft) => go(partnerHref("lookups", lookUp(working.partner.id, draft.asset, draft.use as Use, draft.territory)))}
    >
      <Field
        as="record"
        name="asset"
        label="Recording or work"
        help="Search by title, ISRC or ISWC."
        entity="work"
        noun={{ one: "asset", many: "assets" }}
        options={LOOKABLE.map((one) => ({
          value: one.id,
          title: one.artist ? `${one.title} — ${one.artist}` : `${one.title} (work)`,
          code: one.isrc ?? one.iswc,
        }))}
      />
      <Field as="choice" name="use" label="Use" options={uses.map((one) => ({ value: one, title: one }))} help="The uses your organisation was approved for." />
      <Field
        as="choice"
        name="territory"
        label="Territory"
        noun={{ one: "territory", many: "territories" }}
        options={TERRITORIES.map((one) => ({ value: one.code, title: one.name }))}
      />
    </FormDialog>
  );
}

/** The partner's look-ups from the portal — each an answer and the receipt that proves it. */
export function Lookups({ working }: { working: Working }) {
  const refused = cannotLookUp(working);
  const rows = lookupsOf(working.partner.id);
  return (
    <CollectionPage
      title="Clearance look-ups"
      actions={refused ? [] : [{ label: "Look up clearance", primary: true, creates: true, dialog: <LookUp working={working} /> }]}
      more={[
        ...(refused ? [{ label: "Look up clearance", unavailable: refused }] : []),
        { label: "Open the Clearance API reference", opens: "https://docs.sureel.example/clearance" },
      ]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "look-up", many: "look-ups" },
        identity: {
          title: "Asset",
          name: (one) => assetById(one.assetId).title,
          mark: (one) => <Avatar kind="work" name={assetById(one.assetId).title} />,
          opens: (one) => partnerHref("lookups", one.id),
        },
        sort: { column: "Asked", direction: "descending" },
        searchBy: ["Asset", "Receipt", "ISRC", "ISWC"],
        columns: [
          { name: "Answer", value: (one) => ANSWERS.indexOf(one.answer.state), cell: (one) => <ClearanceBadge state={one.answer.state} />, readings: ["All"] },
          // G-3: the two sides apart, never one combined figure.
          { name: "Master", value: (one) => ANSWERS.indexOf(one.answer.master.state), cell: (one) => (assetById(one.assetId).kind === "Work" ? null : <ClearanceBadge state={one.answer.master.state} />) },
          {
            name: "Composition",
            value: (one) => ANSWERS.indexOf(worst(one.answer.composition.map((side) => side.state)) ?? "Granted"),
            cell: (one) => {
              const state = worst(one.answer.composition.map((side) => side.state));
              return state ? <ClearanceBadge state={state} /> : null;
            },
          },
          { name: "Use", value: (one) => one.use, cell: (one) => one.use },
          { name: "Territory", value: (one) => one.country, cell: (one) => territoryName(one.country) },
          { name: "Receipt", as: "identifier", standard: "id", value: (one) => one.receipt },
          { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => assetById(one.assetId).isrc },
          { name: "ISWC", as: "identifier", standard: "iswc", value: (one) => assetById(one.assetId).iswc, hidden: true },
          { name: "Asked", as: "date", grain: "minute", value: (one) => one.asked },
        ],
        readings: [{ name: "All", holds: () => true }, ...ANSWERS.map((state) => ({ name: state, holds: (one: Lookup) => one.answer.state === state }))],
        filters: [{ kind: "anyOf", key: "use", label: "Use", options: working.partner.uses, of: (one) => one.use }],
        commands: (one) => [
          { label: "Open", opens: partnerHref("lookups", one.id) },
          { label: "Download receipt", opens: () => downloadReceipt(one.receipt, one) },
          { label: "Verify the receipt", mark: "verified", opens: href("verify", one.receipt) },
        ],
        empty: refused ? { none: refused } : { none: "No look-up from the portal yet. Look one up, or call the Clearance API with your key." },
      }}
    />
  );
}

/**
 * The cards that read one answer side by side — the master's, then each controlling publisher's
 * (G-3) — each with who decided and on whose behalf (G-5), the territory and dates of the grant
 * (G-4), and the source and tier of the claim that makes the holder the holder (G-2).
 */
export function SideCards({ assetId, use, country, answer }: { assetId: string; use: Use; country: string; answer: Snapshot }) {
  const asset = assetById(assetId);
  const tier = tierOf(assetId, use);
  const grantFacts = (grantId: string | undefined) => {
    if (!grantId) return [{ label: "Decided by", value: "No grant — the resolver's default" }];
    const grant = grantById(grantId);
    return [
      { label: "Decided by", value: decidedBy(grant.decided) },
      { label: "Grant territory", value: <TerritoryChip set={grant.territory} /> },
      { label: "Grant from", as: "date" as const, value: grant.from },
      grant.to ? { label: "Grant until", as: "date" as const, value: grant.to } : { label: "Grant until", value: "Open-ended" },
      { label: "Grant state", value: grant.state },
    ];
  };
  const holder = (id: string, side: "Master" | "Composition") =>
    controllers(id, side, country)
      .map((one) => formatMeta([partyName(one.partyId), one.source, one.sourceRef]))
      .join("; ") || `No one controls it in ${territoryName(country)}`;

  return (
    <>
      {asset.kind === "Work" ? null : (
        <FactCard
          title="Master"
          facts={[
            { label: "Answer", value: <ClearanceBadge state={answer.master.state} /> },
            { label: "Why", value: answer.master.reason },
            { label: "Decided at", value: answer.master.level },
            ...grantFacts(answer.master.grant),
            { label: "Controlled by", value: holder(asset.kind === "Video" ? (asset.contains?.[0]?.recordingId ?? asset.id) : asset.id, "Master") },
            { label: "Tier", value: <TierChip tier={tier} /> },
          ]}
        />
      )}
      {answer.composition.map((side, index) => (
        <FactCard
          key={`${index}/${side.work}/${side.party}`}
          title={side.work ? `Composition — ${assetById(side.work).title}` : "Composition"}
          facts={[
            { label: "Answer", value: <ClearanceBadge state={side.state} /> },
            { label: "Why", value: side.reason },
            { label: "Publisher", value: side.party ? partyName(side.party) : "No controlling publisher" },
            { label: "Decided at", value: side.level },
            ...grantFacts(side.grant),
            ...(side.work
              ? [
                  { label: "Controlled by", value: holder(side.work, "Composition") },
                  { label: "ISWC", value: assetById(side.work).iswc, standard: "iswc" as const },
                  { label: "Tier", value: <TierChip tier={tierOf(side.work, use)} /> },
                ]
              : []),
          ]}
        />
      ))}
    </>
  );
}

/** One look-up: the answer as the receipt froze it, side by side, and whether the graph has moved since. */
export function LookupDetail({ lookup }: { lookup: Lookup }) {
  const asset = assetById(lookup.assetId);
  const now = clearanceOf(lookup.assetId, lookup.use, { partner: lookup.partner, country: lookup.country });
  const moved = now.state !== lookup.answer.state;
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="work" name={asset.title} />,
        name: asset.title,
        status: `clearance:${lookup.answer.state}`,
        facts: [
          asset.isrc ? { identifier: asset.isrc, standard: "isrc" } : { identifier: asset.iswc ?? asset.id, standard: asset.iswc ? "iswc" : "id" },
          { text: lookup.use },
          { text: territoryName(lookup.country), mark: "flag" },
          { as: "date", value: lookup.asked, grain: "minute", label: "Asked" },
        ],
        actions: [{ label: "Download receipt", primary: true, opens: () => downloadReceipt(lookup.receipt, lookup) }],
        more: [{ label: "Verify the receipt", mark: "verified", opens: href("verify", lookup.receipt) }],
      }}
    >
      <Metadata>
        {moved ? (
          <Alert intent="warn" title={`The graph now answers ${now.state}`}>
            {`${reasonFor(lookup.partner, now)} This receipt still proves what you were told on ${formatDate(lookup.asked, "minute")}.`}
          </Alert>
        ) : null}
        <FactCard
          title="Receipt"
          facts={[
            { label: "Receipt ID", value: lookup.receipt, standard: "id" },
            { label: "Answer", value: <ClearanceBadge state={lookup.answer.state} /> },
            { label: "Why", value: lookup.answer.reason },
            { label: "Proof event", value: String(lookup.seq), standard: "id" },
            { label: "Asked with", value: lookup.via, standard: "id" },
            { label: "Rule version", value: RULE_VERSION },
            { label: "Graph version", value: GRAPH_VERSION },
          ]}
        />
        <SideCards assetId={lookup.assetId} use={lookup.use} country={lookup.country} answer={lookup.answer} />
      </Metadata>
    </DetailPage>
  );
}

export const LOOKUP_PAGES: Record<string, PartnerPage> = {
  lookups: ([id], working) => {
    const lookup = id ? lookupById(id) : undefined;
    if (!lookup || lookup.partner !== working.partner.id) return { place: { at: "Clearance", page: "Look-ups" }, page: <Lookups working={working} /> };
    return {
      place: {
        at: "Clearance",
        page: "Look-ups",
        trail: [
          { label: "Clearance", opens: partnerHref("lookups") },
          { label: "Look-ups", opens: partnerHref("lookups") },
          { label: lookup.receipt },
        ],
      },
      page: <LookupDetail key={lookup.id} lookup={lookup} />,
    };
  },
};
