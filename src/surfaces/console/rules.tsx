import type { ReactNode } from "react";
import {
  Alert,
  CollectionPage,
  ConfirmationDialog,
  DetailPage,
  FactCard,
  Metadata,
  RecordIndex,
  formatCount,
  formatMoney,
  type Command,
  type DetailFacet,
  type HeldBy,
  type ShellPlace,
} from "@revelator/pro-ui";

import { assetById } from "../../graph/fixtures";
import { RULE_VERSION } from "../../graph/resolve";
import type { Shown } from "../surface";
import { LADDERS, REPLAY_SAMPLE, baseOf, publish, replay, replayOf, ruleById, rules, type Rule } from "./data";
import { assetMark, personMark } from "./marks";
import { OPS_ONLY, SIGNED_IN, consoleHref, facetOf, type Persona } from "./where";

const STATES: readonly Rule["state"][] = ["Draft", "Published", "Retired"];

export const RULE_FACETS = ["Overview", "Diff", "Replay"] as const;
type RuleFacet = (typeof RULE_FACETS)[number];

/**
 * The resolver's rule versions (S7-7) — the one in force, the drafts, the retired. A version is
 * the precedence ladder and the rules on top of it; the same claims under the same version always
 * resolve the same way, which is why a draft is replayed before anyone publishes it.
 *
 * Its state is words until the system has a family for a version (gaps).
 */
export function RulesPage(): Shown {
  return {
    place: { at: "Rules" },
    page: (
      <CollectionPage
        title="Rule versions"
        index={{
          rows: rules(),
          rowKey: (one) => one.version,
          noun: { one: "rule version", many: "rule versions" },
          identity: { title: "Version", name: (one) => one.version, opens: (one) => consoleHref("rules", one.version) },
          columns: [
            { name: "State", value: (one) => STATES.indexOf(one.state), cell: (one) => one.state },
            { name: "Change", value: (one) => one.change, cell: (one) => one.change },
            { name: "Author", value: (one) => one.author, cell: (one) => one.author },
            { name: "Published", as: "date", value: (one) => one.published },
            { name: "Values it would change", as: "count", value: (one) => (one.state === "Draft" ? one.wouldChange : undefined) },
            { name: "Revenue affected", as: "money", value: (one) => (one.state === "Draft" ? one.revenueAffected : undefined) },
          ],
          commands: (one) => [
            { label: "Open", opens: consoleHref("rules", one.version) },
            one.state === "Draft"
              ? { label: "Replay", opens: consoleHref("rules", one.version, "Replay") }
              : { label: "Replay", unavailable: "Only a draft is replayed — a published version is what the graph already reads." },
          ],
        }}
      />
    ),
  };
}

/** Publishing a draft — asked first, because every resolved value is read under it from then on. */
function Publish({ rule, by, ...held }: HeldBy & { rule: Rule; by: string }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`${rule.version} becomes the rule in force and ${RULE_VERSION} is retired. ${formatCount(rule.wouldChange ?? 0, { one: "resolved value changes", many: "resolved values change" })}, ${formatMoney(rule.revenueAffected ?? 0)} of revenue, on the next snapshot; each change is a SUPERSEDE event on the Proof Log.`}
      confirm="Publish"
      onCommit={() => publish(rule.version, by)}
    />
  );
}

export function RulePage(version: string, written: string | undefined, persona: Persona): Shown {
  const rule = ruleById(version);
  if (!rule)
    return {
      place: { at: "Rules" },
      page: (
        <Alert intent="danger" title="No such rule version">
          {`The resolver has no version ${version}.`}
        </Alert>
      ),
    };
  const facet = facetOf(RULE_FACETS, written);
  return { place: rulePlace(rule, facet), page: <RuleDetail key={version} rule={rule} facet={facet} persona={persona} /> };
}

function RuleDetail({ rule, facet, persona }: { rule: Rule; facet: RuleFacet; persona: Persona }) {
  const by = SIGNED_IN[persona].name;
  const draft = rule.state === "Draft";
  const replayed = replayOf(rule.version);
  const base = baseOf(rule.version);

  const replayCommand: Command = draft
    ? { label: "Replay", opens: () => replay(rule.version, by) }
    : { label: "Replay", unavailable: "Only a draft is replayed." };
  const publishCommand: Command = !draft
    ? { label: "Publish", unavailable: rule.state === "Published" ? "In force." : "Retired versions are not republished." }
    : persona !== "Rights ops"
      ? { label: "Publish", unavailable: OPS_ONLY }
      : !replayed
        ? { label: "Publish", unavailable: "Replay it first: nobody publishes a rule without seeing what it changes." }
        : { label: "Publish", dialog: <Publish rule={rule} by={by} /> };

  const FACETS: Record<RuleFacet, { header?: DetailFacet; body: ReactNode }> = {
    Overview: {
      body: (
        <Metadata>
          <FactCard
            title="Version"
            facts={[
              { label: "Version", value: rule.version },
              { label: "State", value: rule.state },
              { label: "Change", value: rule.change },
              { label: "Author", value: rule.author },
              { label: "Published", as: "date", value: rule.published },
              { label: "Replaces", value: base },
            ]}
          />
          <FactCard title="Ownership precedence" facts={[{ label: "Ladder, first wins", as: "list", value: LADDERS[rule.version] ?? [] }]} />
        </Metadata>
      ),
    },
    Diff: { header: { name: "Diff" }, body: <RuleDiff version={rule.version} base={base} /> },
    Replay: {
      header: { name: "Replay" },
      body: <RuleReplay rule={rule} />,
    },
  };
  const shown = FACETS[facet];

  return (
    <DetailPage
      record={{
        mark: personMark(rule.author),
        name: rule.version,
        kind: `${rule.state} rule version`,
        facts: [{ text: rule.author }, ...(rule.published ? [{ as: "date" as const, value: rule.published, label: "Published" }] : [])],
        actions: draft
          ? replayed && persona === "Rights ops"
            ? [{ label: "Publish", primary: true, dialog: <Publish rule={rule} by={by} /> }]
            : !replayed
              ? [{ label: "Replay", primary: true, opens: () => replay(rule.version, by) }]
              : []
          : [],
        more: [replayCommand, publishCommand],
      }}
      facet={shown.header}
    >
      {shown.body}
    </DetailPage>
  );
}

/** The precedence ladder against the version it replaces, rung by rung — what moved and what stayed. */
function RuleDiff({ version, base }: { version: string; base?: string }) {
  const now = LADDERS[version] ?? [];
  const before = base ? (LADDERS[base] ?? []) : [];
  const rows = Array.from({ length: Math.max(now.length, before.length) }, (_, index) => ({
    rank: index + 1,
    now: now[index],
    before: before[index],
  }));
  return (
    <RecordIndex
      rows={rows}
      rowKey={(one) => String(one.rank)}
      noun={{ one: "rung", many: "rungs" }}
      identity={{ title: "Rung", name: (one) => `Precedence ${one.rank}` }}
      columns={[
        { name: base ?? "Before", value: (one) => one.before ?? "", cell: (one) => one.before ?? null },
        { name: version, value: (one) => one.now ?? "", cell: (one) => one.now ?? null },
        {
          name: "Change",
          value: (one) => (one.now === one.before ? 0 : 1),
          cell: (one) => (one.now === one.before ? "Same" : !one.before ? "Added" : !one.now ? "Removed" : "Changed"),
        },
      ]}
      readings={[
        { name: "Changed", holds: (one) => one.now !== one.before },
        { name: "All rungs", holds: () => true },
      ]}
      chooser={false}
    />
  );
}

/**
 * The draft replayed over the whole graph before it is published: how many resolved values would
 * change and the revenue they carry, then a sample of them, each against what it resolves to now.
 */
function RuleReplay({ rule }: { rule: Rule }) {
  const replayed = replayOf(rule.version);
  if (rule.state !== "Draft")
    return (
      <Alert intent="info" title="Nothing to replay">
        {`${rule.version} is ${rule.state.toLowerCase()}: the graph already reads it, or has stopped reading it.`}
      </Alert>
    );
  if (!replayed)
    return (
      <Alert intent="info" title="Not replayed yet">
        {`Replaying resolves every claim in the graph under ${rule.version} and against ${RULE_VERSION}, without writing anything.`}
      </Alert>
    );
  return (
    <RecordIndex
      rows={REPLAY_SAMPLE}
      rowKey={(one) => one.id}
      // A SAMPLE, so it carries no totals: the whole replay's figures are the note's, and a sum of
      // five rows under them would read as a second, smaller answer.
      noun={{ one: "changed value", many: "changed values" }}
      identity={{ title: "Asset", name: (one) => assetById(one.assetId).title, mark: (one) => assetMark(one.assetId), opens: (one) => consoleHref("assets", one.assetId, "Resolved") }}
      note={
        <Alert intent="warn" title={`${formatCount(rule.wouldChange ?? 0, { one: "resolved value", many: "resolved values" })} would change`}>
          {`${formatMoney(rule.revenueAffected ?? 0)} of revenue resolves differently under ${rule.version}. A sample of the largest follows; the full set is in the replay export.`}
        </Alert>
      }
      columns={[
        { name: "Value", value: (one) => one.value, cell: (one) => one.value },
        { name: "Territory", value: (one) => one.territory, cell: (one) => one.territory },
        { name: `Under ${RULE_VERSION}`, value: (one) => one.now, cell: (one) => one.now },
        { name: `Under ${rule.version}`, value: (one) => one.would, cell: (one) => one.would },
        { name: "Revenue affected", as: "money", value: (one) => one.revenue },
      ]}
      sort={{ column: "Revenue affected", direction: "descending" }}
      chooser={false}
    />
  );
}

function rulePlace(rule: Rule, facet: RuleFacet): ShellPlace {
  return {
    at: "Rules",
    page: rule.version,
    record: {
      back: { index: "Rule versions", opens: consoleHref("rules") },
      facets: RULE_FACETS,
      at: facet,
      addressOf: (one) => consoleHref("rules", rule.version, one === "Overview" ? undefined : one),
    },
    trail: [{ label: "Rules", opens: consoleHref("rules") }, { label: rule.version }],
  };
}
