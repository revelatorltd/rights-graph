import { Avatar, CollectionPage, ConfirmationDialog, Field, FormDialog, owed, unanswered, type Command, type HeldBy } from "@revelator/pro-ui";

import { PARTNERS, TODAY, addGrant, setGrantState, videos } from "../../../graph/fixtures";
import { AI_USES, DEPENDS_ON_TRAINING, type Asset, type Grant, type Use } from "../../../graph/model";
import { clearanceOf, tierOf, useGraph, useWord, worksOf, type SideAnswer } from "../../../graph/resolve";
import { ClearanceBadge, TierChip, decidedBy } from "../../../rights/kit";
import { ME, TERRITORY_SETS, countryName, dayOf, decidedNow, myShare, myWorks, rightsHref } from "./data";

/** The uses a publisher answers for its composition share, the ones partners ask for first. */
const USES_HERE: readonly Use[] = ["Sync", "AI training", "AI derivative", "Stream"];
/** The territories the answers are read in. */
const COUNTRIES = ["US", "GB", "DE"];
/** AGR-101 §11.3: an AI use of Ana Lindgren's songs needs her written consent — a condition the grant carries. */
const AI_CONDITION = "Writer's written consent — AGR-101 §11.3";

interface Answered {
  key: string;
  asset: Asset;
  use: Use;
  country: string;
  answer: SideAnswer;
}

/**
 * Harbor's own answer, per asset, use and territory — the composition side only, and only the share
 * Harbor controls: another publisher's answer on the same work is not Harbor's to read (S2-5). A
 * video is answered through the works it embodies.
 */
function answers(): Answered[] {
  const assets = [...myWorks(), ...videos().filter((video) => worksOf(video).some((work) => myWorks().includes(work)))];
  return assets.flatMap((asset) =>
    USES_HERE.flatMap((use) =>
      COUNTRIES.flatMap((country) =>
        clearanceOf(asset.id, use, { country })
          .composition.filter((one) => one.party === ME)
          .map((answer) => ({ key: `${asset.id}/${answer.work?.id}/${use}/${country}`, asset, use, country, answer })),
      ),
    ),
  );
}

const PARTNER_OPTIONS = PARTNERS.map((one) => ({ value: one.id, title: one.name }));
const territoryOf = (country: string) => Object.keys(TERRITORY_SETS).find((key) => key === country) ?? "World";

/**
 * A composition-side grant or denial — the S1 grant model, made by Harbor for its own share:
 * where it is made (the work, or Harbor's whole catalogue), for whom, where and when. Who decided
 * and under what authority is stamped on it (G-5).
 */
export function GrantDialog({
  effect,
  use,
  workId,
  country,
  ...held
}: HeldBy & { effect: Grant["effect"]; use?: Use; workId?: string; country?: string }) {
  return (
    <FormDialog
      {...held}
      confirm={effect === "Grant" ? "Grant" : "Deny"}
      draft={{
        use: owed<string>(use ?? "AI training"),
        scope: owed(workId ? "work" : "catalogue"),
        partners: unanswered.several,
        territory: owed(country ? territoryOf(country) : "World"),
        from: owed(TODAY),
        to: unanswered.date,
      }}
      onCommit={(draft) => {
        const chosen = draft.use as Use;
        const catalogue = draft.scope === "catalogue" || !workId;
        addGrant({
          level: catalogue ? "Catalogue" : "Asset",
          ref: catalogue ? ME : workId,
          side: "Composition",
          use: chosen,
          effect,
          partners: draft.partners.length ? { mode: "Allowlist", ids: draft.partners } : { mode: "All approved", ids: [] },
          territory: TERRITORY_SETS[draft.territory] ?? TERRITORY_SETS.World!,
          from: dayOf(draft.from),
          to: dayOf(draft.to ?? undefined),
          grantedBy: ME,
          decided: decidedNow(),
          conditions: effect === "Grant" && AI_USES.includes(chosen) ? [AI_CONDITION] : undefined,
          state: "Live",
        });
      }}
    >
      {use ? null : <Field as="choice" name="use" label="Use" options={USES_HERE.map((one) => ({ value: one, title: one }))} />}
      <Field
        as="choice"
        name="scope"
        label="Scope"
        options={[
          ...(workId ? [{ value: "work", title: "This work", description: "Stored on the work; it overrides the catalogue." }] : []),
          { value: "catalogue", title: "Harbor Music's catalogue", description: "Stored once; every work Harbor controls inherits it." },
        ]}
      />
      <Field
        as="record"
        name="partners"
        label="Partners"
        entity="organization"
        noun={{ one: "partner", many: "partners" }}
        several
        help="Left empty, it holds for every approved partner."
        options={PARTNER_OPTIONS}
      />
      <Field as="choice" name="territory" label="Territory" options={Object.keys(TERRITORY_SETS).map((one) => ({ value: one, title: one }))} />
      <Field as="date" name="from" label="From" />
      <Field as="date" name="to" label="Until" help="Left blank, it holds until it is revoked." />
    </FormDialog>
  );
}

/** A grant of Harbor's revoked — asked first, because partners relying on it lose it at once. */
function RevokeGrant({ grant, ...held }: HeldBy & { grant: Grant }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`Harbor Music's ${useWord(grant.use)} ${grant.effect === "Grant" ? "grant" : "denial"} is revoked. It stays on record, and the graph answers without it.`}
      confirm="Revoke"
      destructive
      onCommit={() => setGrantState(grant.id, "Revoked")}
    />
  );
}

/**
 * Composition-side clearances (S2-5): Harbor's answer for its own share, by use and territory,
 * with the scope that decided it and who decided — the same grant model as the label's. A sync
 * check on a video reads only Harbor's share of the works in it, never the master side or another
 * publisher's. AI training comes before every other AI use (S1-6 on this side).
 */
export function Clearances() {
  useGraph();
  const rows = answers();
  const trainingFor = (row: Answered) =>
    clearanceOf(row.asset.id, "AI training", { country: row.country }).composition.find((one) => one.party === ME && one.work?.id === row.answer.work?.id);

  const commandsOf = (row: Answered): Command[] => {
    const work = row.answer.work;
    const blocked =
      DEPENDS_ON_TRAINING.includes(row.use) && trainingFor(row)?.state !== "Granted" ? "Grant AI training first: every other AI use depends on it." : undefined;
    const own = row.answer.grant && row.answer.grant.grantedBy === ME && row.answer.grant.state !== "Revoked" ? row.answer.grant : undefined;
    return [
      blocked
        ? { label: "Grant", unavailable: blocked }
        : { label: "Grant", dialog: <GrantDialog effect="Grant" use={row.use} workId={work?.id} country={row.country} /> },
      { label: "Deny", dialog: <GrantDialog effect="Deny" use={row.use} workId={work?.id} country={row.country} /> },
      own ? { label: "Revoke", destructive: true, dialog: <RevokeGrant grant={own} /> } : { label: "Revoke", unavailable: "Nothing of Harbor Music's decides this: the default rule does." },
      ...(work ? [{ label: "Open work", opens: rightsHref("works", work.id) }] : []),
    ];
  };

  return (
    <CollectionPage
      title="Clearances"
      actions={[
        { label: "Deny consent", dialog: <GrantDialog effect="Deny" /> },
        { label: "Grant consent", primary: true, creates: true, dialog: <GrantDialog effect="Grant" /> },
      ]}
      index={{
        rows,
        rowKey: (one) => one.key,
        noun: { one: "answer", many: "answers" },
        identity: {
          title: "Asset",
          name: (one) => one.asset.title,
          mark: (one) => <Avatar kind="work" name={one.asset.title} />,
          opens: (one) => (one.answer.work ? rightsHref("works", one.answer.work.id) : rightsHref("works")),
        },
        searchBy: ["Asset"],
        columns: [
          { name: "Kind", value: (one) => one.asset.kind, cell: (one) => one.asset.kind },
          { name: "Work", value: (one) => one.answer.work?.title ?? "", cell: (one) => (one.asset.kind === "Work" ? null : one.answer.work?.title) },
          { name: "Use", value: (one) => one.use, cell: (one) => one.use },
          { name: "Territory", value: (one) => one.country, cell: (one) => countryName(one.country) },
          { name: "Harbor's answer", value: (one) => one.answer.state, cell: (one) => <ClearanceBadge state={one.answer.state} /> },
          { name: "Harbor's share", as: "percent", value: (one) => (one.answer.work ? myShare(one.answer.work.id) : null) },
          { name: "Decided at", value: (one) => one.answer.level, cell: (one) => one.answer.level },
          { name: "Why", value: (one) => one.answer.reason, cell: (one) => one.answer.reason },
          { name: "Decided by", value: (one) => one.answer.grant?.decided.actor ?? "", cell: (one) => (one.answer.grant ? decidedBy(one.answer.grant.decided) : "Default rule") },
          { name: "Tier", value: (one) => tierOf(one.asset.id, one.use), cell: (one) => <TierChip tier={tierOf(one.asset.id, one.use)} /> },
        ],
        readings: [{ name: "All", holds: () => true }, ...USES_HERE.map((use) => ({ name: use, holds: (one: Answered) => one.use === use }))],
        filters: [
          { kind: "anyOf", key: "territory", label: "Territory", options: COUNTRIES.map(countryName), entity: "place", of: (one) => countryName(one.country) },
          { kind: "anyOf", key: "answer", label: "Harbor's answer", options: ["Granted", "Denied", "Needs review"], of: (one) => one.answer.state },
          { kind: "anyOf", key: "kind", label: "Kind", options: ["Work", "Video"], of: (one) => one.asset.kind },
        ],
        totals: [{ count: true }, { name: "Needs review", count: (one) => one.answer.state === "Needs review" }],
        commands: commandsOf,
        empty: { holder: "Harbor Music" },
      }}
    />
  );
}
