import { useState, type ReactNode } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  CardGrid,
  CollectionPage,
  DetailPage,
  FactCard,
  Field,
  FloatingActionBar,
  FormDialog,
  Metadata,
  RecordHeader,
  RecordIndex,
  Review,
  ReviewFacet,
  Tab,
  Tabs,
  TabsList,
  TabsPanel,
  Text,
  WizardActions,
  formatList,
  formatMeta,
  formatPercent,
  owed,
  type DetailFacet,
  type HeldBy,
  type ShellPlace,
} from "@revelator/pro-ui";

import { MERGES, assetById, partyName } from "../../graph/fixtures";
import { go } from "../../route";
import type { Shown } from "../surface";
import {
  AUTO_ACCEPT,
  MERGE_ASSETS,
  affectedBy,
  clock,
  decideMerge,
  mergeDecision,
  mergeState,
  merged,
  mergedById,
  unmerge,
  type Merge,
  type Merged,
} from "./data";
import { assetMark, partyOrName, personMark } from "./marks";
import { OPS_ONLY, SIGNED_IN, consoleHref, facetOf, type Persona } from "./where";

const MATCH_STATES = ["Suggested", "Matched", "Unmatched"] as const;

/** What a reviewer is asked to decide, by kind. */
const QUESTION: Record<Merge["kind"], string> = {
  Party: "Are these one party?",
  Work: "Are these one work?",
  "Recording link": "Does this recording embody this work?",
};

/** A suggestion read as the merge it would be — for what it would change before it is accepted. */
const asMerged = (one: Merge): Merged => ({
  id: one.id,
  kind: one.kind,
  kept: one.left.name,
  folded: one.right.name,
  ids: [...one.left.ids, ...one.right.ids],
  assets: MERGE_ASSETS[one.id] ?? [],
  at: clock(),
  by: "",
});

/**
 * Match review (S7-3) — every merge and link matching suggested BELOW the auto-accept confidence,
 * weighted by the revenue it touches. Each opens a review, the two records side by side.
 */
export function MatchesPage(): Shown {
  return {
    place: { at: "Matching", page: "Suggested matches" },
    page: (
      <CollectionPage
        title="Suggested matches"
        index={{
          rows: MERGES,
          rowKey: (one) => one.id,
          noun: { one: "suggestion", many: "suggestions" },
          identity: {
            title: "Suggestion",
            name: (one) => formatMeta([one.left.name, one.right.name]) ?? one.id,
            opens: (one) => consoleHref("matches", one.id),
          },
          note: (
            <Alert intent="info" title="Below auto-accept">
              {`Matching accepts on its own at ${formatPercent(AUTO_ACCEPT * 100, { whole: true })} confidence or more. Everything here waits for a reviewer, and every merge stays reversible from its record.`}
            </Alert>
          ),
          sort: { column: "Revenue touched", direction: "descending" },
          columns: [
            { name: "State", value: (one) => MATCH_STATES.indexOf(mergeState(one)), cell: (one) => <Badge status={`match:${mergeState(one)}`} />, readings: ["All"] },
            { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
            { name: "Confidence", as: "percent", value: (one) => one.confidence * 100 },
            { name: "Method", value: (one) => one.method, cell: (one) => one.method },
            { name: "Shared", as: "count", value: (one) => one.shared.length },
            { name: "Revenue touched", as: "money", value: (one) => one.revenue },
          ],
          readings: [
            { name: "To review", holds: (one: Merge) => mergeState(one) === "Suggested" },
            { name: "Accepted", holds: (one: Merge) => mergeState(one) === "Matched" },
            { name: "Rejected", holds: (one: Merge) => mergeState(one) === "Unmatched" },
            { name: "All", holds: () => true },
          ],
          commands: (one) => [
            mergeState(one) === "Suggested"
              ? { label: "Review", opens: consoleHref("matches", one.id) }
              : { label: "Review", unavailable: "Decided — undo it from the merge's record." },
          ],
          empty: { holder: "the review queue" },
        }}
      />
    ),
  };
}

/** One suggestion under review — a cover over the shell, the queue moved through from its bar. */
export function MatchReviewPage(id: string, persona: Persona): Shown {
  return { cover: <MatchReview key={id} id={id} persona={persona} /> };
}

function MatchReview({ id, persona }: { id: string; persona: Persona }) {
  const [facet, setFacet] = useState("sides");
  const by = SIGNED_IN[persona].name;
  const one = MERGES.find((each) => each.id === id) ?? MERGES[0]!;
  const waiting = MERGES.filter((each) => mergeState(each) === "Suggested" || each.id === one.id);
  const at = waiting.findIndex((each) => each.id === one.id);
  const next = waiting[at + 1] ?? waiting[at - 1];
  const decided = mergeState(one) !== "Suggested";
  const decide = (state: "Matched" | "Unmatched") => {
    decideMerge(one.id, state, by);
    go(next && next.id !== one.id ? consoleHref("matches", next.id) : consoleHref("matches"));
  };
  const affected = affectedBy(asMerged(one));
  return (
    <Review
      title="Match review"
      queue={{ at: at + 1, of: waiting.length, onStep: (to) => go(consoleHref("matches", waiting[to - 1]!.id)) }}
      onExit={() => go(consoleHref("matches"))}
    >
      <RecordHeader
        mark={<Avatar kind={one.kind === "Party" ? "person" : "work"} name={one.left.name} />}
        name={QUESTION[one.kind]}
        kind={`Suggested ${one.kind.toLowerCase()} merge`}
        status={`match:${mergeState(one)}`}
        facts={[{ text: one.method }, { as: "money", value: one.revenue, label: "Touches" }]}
      />
      <Tabs value={facet} onValueChange={setFacet}>
        <TabsList>
          <Tab value="sides">Side by side</Tab>
          <Tab value="changes" count={affected.length}>
            What it changes
          </Tab>
        </TabsList>
        <TabsPanel value="sides">
          <ReviewFacet>
            <CardGrid columns={2}>
              <SideCard side={one.left} />
              <SideCard side={one.right} />
            </CardGrid>
            <FactCard
              title="Why matching thinks so"
              facts={[
                { label: "Confidence", as: "percent", value: one.confidence * 100 },
                { label: "Method", value: one.method },
                { label: "Shared", as: "list", value: one.shared },
                { label: "Auto-accept at", as: "percent", value: AUTO_ACCEPT * 100 },
              ]}
            />
          </ReviewFacet>
        </TabsPanel>
        <TabsPanel value="changes">
          <ReviewFacet>
            <Affected rows={affected} />
          </ReviewFacet>
        </TabsPanel>
      </Tabs>
      <WizardActions>
        <FloatingActionBar
          lead={
            <>
              <Avatar kind={one.kind === "Party" ? "person" : "work"} name={one.left.name} />
              <Text kind="title">{one.left.name}</Text>
              <Text meta={[one.right.name, `${one.shared.length} shared`]} />
            </>
          }
        >
          <Button variant="secondary" disabled={decided} onClick={() => decide("Unmatched")}>
            Reject
          </Button>
          <Button disabled={decided} onClick={() => decide("Matched")}>
            Accept merge
          </Button>
        </FloatingActionBar>
      </WizardActions>
    </Review>
  );
}

/** One of the two records, as its source holds it. */
function SideCard({ side }: { side: Merge["left"] }) {
  return (
    <FactCard
      title={side.name}
      facts={[
        { label: "Identifiers", as: "list", value: side.ids },
        { label: "Source", value: side.source },
        { label: "Held as", value: side.detail },
      ]}
    />
  );
}

/** Who holds a claim or a credit on what the merge touches — whose splits recompute, and who is told. */
function Affected({ rows }: { rows: ReturnType<typeof affectedBy> }) {
  return (
    <RecordIndex
      rows={rows}
      rowKey={(one) => one.party}
      noun={{ one: "party", many: "parties" }}
      identity={{ title: "Party", name: (one) => partyName(one.party), mark: (one) => partyOrName(one.party) }}
      columns={[
        { name: "Claims", as: "count", value: (one) => one.claims },
        { name: "Credits", as: "count", value: (one) => one.credits },
        { name: "Assets", value: (one) => one.assets.length, cell: (one) => formatList(one.assets.map((each) => assetById(each).title)) },
      ]}
      chooser={false}
      empty={{ holder: "what it touches", line: true }}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Merges (S7-4)

export const MERGE_FACETS = ["Details", "Affected parties"] as const;
type MergeFacet = (typeof MERGE_FACETS)[number];

/**
 * Every merge the graph holds — accepted by a reviewer or by matching above its confidence — and
 * the ones undone, which stay on the record. Each is reversible from its own page.
 */
export function MergesPage(): Shown {
  return {
    place: { at: "Matching", page: "Merges" },
    page: (
      <CollectionPage
        title="Merges"
        index={{
          rows: merged(),
          rowKey: (one) => one.id,
          noun: { one: "merge", many: "merges" },
          identity: { title: "Kept", name: (one) => one.kept, opens: (one) => consoleHref("merges", one.id) },
          sort: { column: "Merged", direction: "descending" },
          columns: [
            { name: "Folded in", value: (one) => one.folded, cell: (one) => one.folded },
            { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
            { name: "Identifiers", value: (one) => one.ids.join(" "), cell: (one) => formatList(one.ids) },
            { name: "Assets", as: "count", value: (one) => one.assets.length },
            { name: "Merged", as: "date", grain: "minute", value: (one) => one.at },
            { name: "By", value: (one) => one.by, cell: (one) => one.by },
            { name: "Unmerged", as: "date", grain: "minute", value: (one) => one.undone?.at },
          ],
          readings: [
            { name: "In force", holds: (one: Merged) => !one.undone },
            { name: "Unmerged", holds: (one: Merged) => Boolean(one.undone) },
          ],
          commands: (one) => [{ label: "Open", opens: consoleHref("merges", one.id) }],
          empty: { holder: "the graph" },
        }}
      />
    ),
  };
}

/** A merge undone, with its reason — every party on what it touched is told, and their splits recompute. */
function Unmerge({ merge, by, ...held }: HeldBy & { merge: Merged; by: string }) {
  const parties = affectedBy(merge);
  return (
    <FormDialog {...held} confirm="Unmerge" draft={{ reason: owed.longtext }} onCommit={(draft) => unmerge(merge.id, by, draft.reason.trim())}>
      <Field
        as="longtext"
        name="reason"
        label="Reason"
        help={`Splits on ${merge.assets.length} assets recompute on the next snapshot. Told: ${formatList(parties.map((one) => partyName(one.party))) ?? "nobody"}.`}
      />
    </FormDialog>
  );
}

export function MergePage(id: string, written: string | undefined, persona: Persona): Shown {
  const merge = mergedById(id);
  if (!merge)
    return {
      place: { at: "Matching", page: "Merges" },
      page: (
        <Alert intent="danger" title="No such merge">
          {`The graph holds no merge ${id}.`}
        </Alert>
      ),
    };
  const facet = facetOf(MERGE_FACETS, written);
  return { place: mergePlace(merge, facet), page: <MergeDetail key={id} merge={merge} facet={facet} persona={persona} /> };
}

function MergeDetail({ merge, facet, persona }: { merge: Merged; facet: MergeFacet; persona: Persona }) {
  const by = SIGNED_IN[persona].name;
  const ops = persona === "Rights ops";
  const from = merge.from ? mergeDecision(merge.from) : undefined;
  const FACETS: Record<MergeFacet, { header?: DetailFacet; body: ReactNode }> = {
    Details: {
      body: (
        <Metadata>
          {merge.undone ? (
            <Alert intent="info" title="Unmerged">
              {`${merge.undone.by} undid it: ${merge.undone.reason}`}
            </Alert>
          ) : null}
          <FactCard
            title="Merge"
            facts={[
              { label: "Kept", value: merge.kept },
              { label: "Folded in", value: merge.folded },
              { label: "Kind", value: merge.kind },
              { label: "Identifiers", as: "list", value: merge.ids },
              { label: "Merged", as: "date", grain: "minute", value: merge.at },
              { label: "By", value: merge.by },
              { label: "From the review", value: from ? "Accepted by a reviewer" : "Accepted by matching" },
            ]}
          />
          <FactCard title="Assets it touches" facts={[{ label: "Assets", as: "list", value: merge.assets.map((one) => assetById(one).title) }]} />
        </Metadata>
      ),
    },
    "Affected parties": { header: { name: "Affected parties" }, body: <Affected rows={affectedBy(merge)} /> },
  };
  const shown = FACETS[facet];
  // Why it cannot be undone NOW, where it cannot — the command stays, greyed, with the reason.
  const why = merge.undone
    ? "Already unmerged."
    : !ops
      ? OPS_ONLY
      : merge.kind === "Recording link"
        ? "The graph has no write that unlinks a recording from a work yet."
        : undefined;
  return (
    <DetailPage
      record={{
        mark: merge.kind === "Party" ? personMark(merge.kept) : assetMark(merge.assets[0] ?? "w-northbound"),
        name: merge.kept,
        kind: `${merge.kind} merge`,
        facts: [{ identifier: merge.id, standard: "id" }, { text: merge.folded }],
        actions: why ? [] : [{ label: "Unmerge", primary: true, dialog: <Unmerge merge={merge} by={by} /> }],
        more: why ? [{ label: "Unmerge", unavailable: why }] : [],
      }}
      facet={shown.header}
    >
      {shown.body}
    </DetailPage>
  );
}

function mergePlace(merge: Merged, facet: MergeFacet): ShellPlace {
  return {
    at: "Matching",
    page: merge.kept,
    record: {
      back: { index: "Merges", opens: consoleHref("merges") },
      facets: MERGE_FACETS,
      at: facet,
      addressOf: (one) => consoleHref("merges", merge.id, one === "Details" ? undefined : one),
    },
    trail: [
      { label: "Matching", opens: consoleHref("matches") },
      { label: "Merges", opens: consoleHref("merges") },
      { label: merge.kept },
    ],
  };
}
