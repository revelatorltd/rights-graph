import {
  Avatar,
  Badge,
  BadgeGroup,
  CollectionPage,
  DetailPage,
  Field,
  FormDialog,
  RecordIndex,
  formatMeta,
  owed,
  unanswered,
  type HeldBy,
  type RecordNavProps,
  type ShellPlace,
} from "@revelator/pro-ui";

import { ASSETS, grantById, partyName } from "../../graph/fixtures";
import type { Request, ScopeLevel, Use } from "../../graph/model";
import { clearanceOf, describeDecision, territoryLabel, type Answer } from "../../graph/resolve";
import { ClearanceBadge, TerritoryChip, decidedBy, partyMark } from "../../rights/kit";
import { go, href } from "../../route";
import {
  TERRITORIES,
  askById,
  asksOf,
  assetsOfAsk,
  checkAgain,
  countryOf,
  requestLicence,
  reasonFor,
  trackReceipt,
  type Ask,
} from "./data";
import { cannotLookUp, worst } from "./lookups";
import { downloadReceipt } from "./receipt";
import { partnerHref, type PartnerPage, type Working } from "./working";

const IN_FLIGHT: readonly Request["state"][] = ["Needs decision", "Escalated", "Countered"];
const ANSWERS: readonly Answer[] = ["Granted", "Needs review", "Denied"];
const STATES: readonly Request["state"][] = ["Needs decision", "Escalated", "Countered", "Auto-cleared", "Approved", "Declined"];

export const FACETS = ["Tracks", "Rights holders"] as const;
export type AskFacet = (typeof FACETS)[number];

const inFlight = (ask: Ask) => ask.requests.some((one) => IN_FLIGHT.includes(one.state));

/** How many of each state an ask's requests stand at, in the order a reader acts on them. */
const statesOf = (ask: Ask) =>
  STATES.map((state) => ({ state, count: ask.requests.filter((one) => one.state === state).length })).filter((one) => one.count > 0);

/** What a partner can ask a licence over: a catalogue, a release, a track, or an artist for Voice/NIL. */
const SCOPES: readonly { value: string; title: string; code?: string; level: ScopeLevel; ref: string }[] = [
  { value: "Catalogue:p-kestrel", title: "Kestrel Point Recordings — whole catalogue", level: "Catalogue", ref: "p-kestrel" },
  ...ASSETS.filter((one) => one.kind === "Release").map((one) => ({ value: `Release:${one.id}`, title: `${one.title} — release`, code: one.upc, level: "Release" as const, ref: one.id })),
  ...ASSETS.filter((one) => one.kind === "Recording" || one.kind === "Video").map((one) => ({
    value: `Asset:${one.id}`,
    title: `${one.title} — ${one.artist}`,
    code: one.isrc,
    level: "Asset" as const,
    ref: one.id,
  })),
  ...ASSETS.filter((one) => one.kind === "Work").map((one) => ({ value: `Asset:${one.id}`, title: `${one.title} — work`, code: one.iswc, level: "Asset" as const, ref: one.id })),
  { value: "Artist:p-mira", title: "Mira Castellanos — every recording (Voice/NIL)", level: "Artist", ref: "p-mira" },
];

/**
 * A licence asked for (S6-4): a use over a scope, where and for how long, and what for. Sent, it
 * becomes one request per holder — the master's controller and each controlling publisher — in
 * that holder's own inbox (S4); where a standing grant already answers it, the request is logged
 * as auto-cleared rather than asked.
 */
export function RequestLicence({ working, ...held }: HeldBy & { working: Working }) {
  const uses = working.partner.uses;
  return (
    <FormDialog
      {...held}
      confirm="Send request"
      draft={{
        use: owed(uses[0] ?? ""),
        scope: owed.record,
        territory: owed("World"),
        start: owed.date,
        end: unanswered.date,
        model: owed("Dynamic"),
        purpose: owed.longtext,
      }}
      ready={(draft) => !draft.end || !draft.start || draft.end > draft.start}
      onCommit={(draft) => {
        const scope = SCOPES.find((one) => one.value === draft.scope)!;
        const id = requestLicence({
          partner: working.partner.id,
          use: draft.use as Use,
          scope: { level: scope.level, ref: scope.ref, name: scope.title.split(" — ")[0]! },
          territory: draft.territory,
          start: draft.start,
          end: draft.end ?? undefined,
          purpose: draft.purpose.trim(),
          licenceModel: draft.model as "Dynamic" | "Flat",
        });
        go(id ? partnerHref("requests", id) : partnerHref("requests"));
      }}
    >
      <Field as="choice" name="use" label="Use" options={uses.map((one) => ({ value: one, title: one }))} />
      <Field
        as="record"
        name="scope"
        label="Scope"
        help="A catalogue, a release, a track or a work — or an artist, for Voice/NIL."
        entity="work"
        noun={{ one: "scope", many: "scopes" }}
        options={SCOPES.map(({ value, title, code }) => ({ value, title, code }))}
      />
      <Field as="choice" name="territory" label="Territory" noun={{ one: "territory", many: "territories" }} options={TERRITORIES.map((one) => ({ value: one.code, title: one.name }))} />
      <Field as="date" name="start" label="From" />
      <Field as="date" name="end" label="Until" help="Left blank, the licence runs until it is revoked." />
      <Field
        as="choice"
        name="model"
        label="Licence model"
        options={[
          { value: "Dynamic", title: "Dynamic", description: "Paid on reported usage." },
          { value: "Flat", title: "Flat", description: "One fee for the term." },
        ]}
      />
      <Field as="longtext" name="purpose" label="What it is for" help="The holders read this before they decide — the model, the run, what the outputs are used for." />
    </FormDialog>
  );
}

/** Every licence the partner asked for, each read back from the holders' inboxes it went to. */
export function Requests({ working }: { working: Working }) {
  const refused = cannotLookUp(working);
  return (
    <CollectionPage
      title="Licence requests"
      actions={refused ? [] : [{ label: "Request a licence", primary: true, creates: true, dialog: <RequestLicence working={working} /> }]}
      more={refused ? [{ label: "Request a licence", unavailable: refused }] : undefined}
      index={{
        rows: asksOf(working.partner.id),
        rowKey: (one) => one.id,
        noun: { one: "request", many: "requests" },
        identity: {
          title: "Request",
          name: (one) => one.purpose,
          mark: (one) => <Avatar kind="document" name={one.purpose} />,
          opens: (one) => partnerHref("requests", one.id),
        },
        sort: { column: "Received", direction: "descending" },
        searchBy: ["Request", "Scope"],
        columns: [
          {
            name: "Holders",
            value: (one) => (inFlight(one) ? 0 : 1),
            cell: (one) => (
              <BadgeGroup>
                {statesOf(one).map(({ state, count }) => (
                  <Badge key={state} status={`request:${state}`} count={count > 1 ? count : undefined} />
                ))}
              </BadgeGroup>
            ),
          },
          { name: "Use", value: (one) => one.use, cell: (one) => one.use },
          { name: "Scope", value: (one) => one.scope.name, cell: (one) => one.scope.name },
          { name: "Territory", value: (one) => territoryLabel(one.territory), cell: (one) => <TerritoryChip set={one.territory} /> },
          { name: "Tracks", as: "count", value: (one) => assetsOfAsk(one).length },
          { name: "From", as: "date", value: (one) => one.start },
          { name: "Received", as: "date", value: (one) => one.received },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "In flight", holds: inFlight },
          { name: "Answered", holds: (one) => !inFlight(one) },
        ],
        filters: [{ kind: "anyOf", key: "use", label: "Use", options: working.partner.uses, of: (one) => one.use }],
        commands: (one) => [{ label: "Open", opens: partnerHref("requests", one.id) }],
        empty: refused ? { none: refused } : { none: "No licence requested yet. Ask for a use over a catalogue, a release or a track." },
      }}
    />
  );
}

/** The answer on every track of an ask now, beside the receipt it was last given. */
function trackRows(ask: Ask) {
  const country = countryOf(ask.territory);
  return assetsOfAsk(ask).map((asset) => {
    const now = clearanceOf(asset.id, ask.use, { partner: ask.partner, country });
    return { asset, now, issued: trackReceipt(ask.id, asset.id) };
  });
}

/**
 * One ask, as a record with two facets: what every TRACK comes to — cleared where both sides
 * granted, needing review elsewhere (F2 step 5), each with its receipt — and where it stands with
 * each RIGHTS HOLDER whose inbox it went to, with who decided and on whose behalf (G-5).
 */
export function AskDetail({ ask, facet }: { ask: Ask; facet: AskFacet }) {
  const rows = trackRows(ask);
  const cleared = rows.filter((one) => one.now.state === "Granted").length;
  const waiting = ask.requests.filter((one) => IN_FLIGHT.includes(one.state)).map((one) => partyName(one.to));
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="document" name={ask.purpose} />,
        name: ask.purpose,
        status: statesOf(ask).map(({ state, count }) => ({ status: `request:${state}` as const, count })),
        facts: [
          { text: ask.use },
          { text: ask.scope.name },
          { text: territoryLabel(ask.territory), mark: "flag" },
          { as: "date", value: ask.start, label: "From" },
          ...(ask.licenceModel ? [{ text: `${ask.licenceModel} licence` }] : []),
        ],
        actions: [
          {
            label: "Download receipts",
            opens: () =>
              rows.forEach(({ asset, issued }) =>
                issued ? downloadReceipt(issued.receipt, { assetId: asset.id, use: ask.use, country: countryOf(ask.territory), asked: issued.asked, answer: issued.answer, partner: ask.partner }) : undefined,
              ),
          },
        ],
      }}
      facet={facet === "Tracks" ? undefined : { name: facet }}
    >
      {facet === "Tracks" ? (
        <RecordIndex
          rows={rows}
          rowKey={(one) => one.asset.id}
          noun={{ one: "track", many: "tracks" }}
          note={`${cleared} of ${rows.length} cleared on both sides.${waiting.length ? ` Waiting on ${[...new Set(waiting)].join(", ")}.` : ""}`}
          identity={{
            title: "Track",
            name: (one) => one.asset.title,
            mark: (one) => <Avatar kind="work" name={one.asset.title} />,
          }}
          columns={[
            { name: "Answer", value: (one) => ANSWERS.indexOf(one.now.state), cell: (one) => <ClearanceBadge state={one.now.state} />, readings: ["All"] },
            // G-3: master and composition apart.
            { name: "Master", value: (one) => ANSWERS.indexOf(one.now.master.state), cell: (one) => (one.asset.kind === "Work" ? null : <ClearanceBadge state={one.now.master.state} />) },
            {
              name: "Composition",
              value: (one) => ANSWERS.indexOf(worst(one.now.composition.map((side) => side.state)) ?? "Granted"),
              cell: (one) => {
                const state = worst(one.now.composition.map((side) => side.state));
                return state ? <ClearanceBadge state={state} /> : null;
              },
            },
            {
              name: "Publishers",
              value: (one) => one.now.composition.map((side) => side.party ?? "").join(" "),
              cell: (one) =>
                formatMeta(one.now.composition.map((side) => (side.party ? `${partyName(side.party)}: ${side.state}` : "No work link"))),
            },
            { name: "Why", value: (one) => one.now.reason, cell: (one) => reasonFor(ask.partner, one.now) },
            { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => one.asset.isrc },
            { name: "Receipt", as: "identifier", standard: "id", value: (one) => one.issued?.receipt },
            { name: "Answered", as: "date", grain: "minute", value: (one) => one.issued?.asked },
          ]}
          readings={[{ name: "All", holds: () => true }, ...ANSWERS.map((state) => ({ name: state, holds: (one: (typeof rows)[number]) => one.now.state === state }))]}
          commands={(one) => [
            one.issued
              ? {
                  label: "Download receipt",
                  opens: () =>
                    downloadReceipt(one.issued!.receipt, { assetId: one.asset.id, use: ask.use, country: countryOf(ask.territory), asked: one.issued!.asked, answer: one.issued!.answer, partner: ask.partner }),
                }
              : { label: "Download receipt", unavailable: "No answer has been given on this track yet." },
            ...(one.issued ? [{ label: "Verify the receipt", mark: "verified" as const, opens: href("verify", one.issued.receipt) }] : []),
            one.issued && one.issued.answer.state === one.now.state
              ? { label: "Check again", mark: "refresh" as const, unavailable: "The graph answers as the receipt does." }
              : { label: "Check again", mark: "refresh" as const, opens: () => checkAgain(ask, one.asset.id) },
          ]}
          chooser={false}
        />
      ) : (
        <RecordIndex
          rows={ask.requests}
          rowKey={(one) => one.id}
          noun={{ one: "rights holder", many: "rights holders" }}
          identity={{ title: "Rights holder", name: (one) => partyName(one.to), mark: (one) => partyMark(one.to) }}
          columns={[
            { name: "Status", value: (one) => STATES.indexOf(one.state), cell: (one) => <Badge status={`request:${one.state}`} /> },
            { name: "Side", value: (one) => one.side ?? "", cell: (one) => one.side },
            { name: "Scope", value: (one) => one.scope.name, cell: (one) => one.scope.name },
            { name: "Assets", as: "count", value: (one) => one.scope.assets },
            {
              name: "Decided",
              value: (one) => (one.decided ? describeDecision(one.decided) : ""),
              // G-5: who decided, for whom, under what — or the standing grant that answered it.
              cell: (one) =>
                one.decided
                  ? decidedBy(one.decided)
                  : one.clearedBy
                    ? `Standing grant · ${decidedBy(grantById(one.clearedBy).decided)}`
                    : IN_FLIGHT.includes(one.state)
                      ? "Waiting on the holder"
                      : null,
            },
            { name: "Deadline", as: "date", value: (one) => one.deadline },
            { name: "Request ID", as: "identifier", standard: "id", value: (one) => one.id },
          ]}
          chooser={false}
        />
      )}
    </DetailPage>
  );
}

const askNav = (ask: Ask, facet: AskFacet): RecordNavProps<AskFacet> => ({
  back: { index: "Licence requests", opens: partnerHref("requests") },
  facets: FACETS,
  at: facet,
  addressOf: (one) => partnerHref("requests", ask.id, one === "Tracks" ? undefined : "holders"),
});

const askPlace = (ask: Ask, facet: AskFacet): ShellPlace => ({
  at: "Clearance",
  page: ask.purpose,
  record: askNav(ask, facet),
  trail: [
    { label: "Clearance", opens: partnerHref("lookups") },
    { label: "Licence requests", opens: partnerHref("requests") },
    { label: ask.purpose },
  ],
});

export const REQUEST_PAGES: Record<string, PartnerPage> = {
  requests: ([id, facet], working) => {
    const ask = id ? askById(working.partner.id, id) : undefined;
    if (!ask) return { place: { at: "Clearance", page: "Licence requests" }, page: <Requests working={working} /> };
    const at: AskFacet = facet === "holders" ? "Rights holders" : "Tracks";
    return { place: askPlace(ask, at), page: <AskDetail key={`${ask.id}/${at}`} ask={ask} facet={at} /> };
  },
};
