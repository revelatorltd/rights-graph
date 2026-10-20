import {
  Alert,
  Badge,
  CollectionPage,
  ConfirmationDialog,
  DetailPage,
  Explained,
  FactCard,
  Field,
  Link,
  Metadata,
  Slot,
  SlotItem,
  Text,
  TitledCard,
  Wizard,
  WizardRow,
  WizardRowBody,
  WizardRowTip,
  WizardRowTips,
  WizardSection,
  WizardSectionBody,
  WizardSectionHeader,
  owed,
  unanswered,
  useAnswer,
  type Command,
  type HeldBy,
  type ShellPlace,
} from "@revelator/pro-ui";

import { CONFLICTS, PARTNERS, TODAY, assetById, grantById, partyName, setGrantState } from "../../../graph/fixtures";
import { AI_USES, type Grant, type ScopeLevel, type Use } from "../../../graph/model";
import { clearanceOf, territoryLabel } from "../../../graph/resolve";
import { ClearanceBadge, TerritoryChip, decidedBy, partyMark } from "../../../rights/kit";
import { go } from "../../../route";
import { assetMark } from "./catalogue";
import {
  COUNTRIES,
  DEPENDENCY_REASON,
  LABEL,
  SCOPE_WORD,
  assetsIn,
  attestationsOn,
  authorities,
  catalogue,
  dependsOnTraining,
  grantName,
  labelArtists,
  labelGrants,
  labelReleases,
  reachOf,
  rightsHref,
  scopeLine,
  scopeName,
  trainingAcross,
  writeGrant,
  useText,
} from "./data";
import { exportCommand } from "./shared";

const choices = (values: readonly string[]) => values.map((value) => ({ value, title: value }));

/** The dispute that paused a grant, where one did — the conflict its attestation opened (F3). */
function disputeOf(grant: Grant) {
  const disputed = attestationsOn(grant).find((one) => one.state === "Disputed");
  if (!disputed) return undefined;
  const artist = disputed.onBehalfOf ?? disputed.attestor;
  return {
    attestation: disputed,
    artist,
    conflict: CONFLICTS.find((one) => one.kind === "Attestation dispute" && one.parties.includes(artist) && one.state !== "Resolved"),
  };
}

/** What the label may do to a grant — said why where it may not. */
function grantCommands(grant: Grant): Command[] {
  if (grant.grantedBy !== LABEL)
    return [{ label: "Pause", unavailable: `${partyName(grant.grantedBy)}'s own consent — only they can change it.` }];
  if (grant.state === "Revoked") return [{ label: "Resume", unavailable: "A revoked grant stays revoked: grant consent again." }];
  const dispute = disputeOf(grant);
  return [
    grant.state === "Paused"
      ? dispute
        ? { label: "Resume", unavailable: `Paused by ${partyName(dispute.artist)}'s dispute — only its resolution resumes it.` }
        : { label: "Resume", mark: "play", opens: () => setGrantState(grant.id, "Live") }
      : { label: "Pause", mark: "pause", opens: () => setGrantState(grant.id, "Paused") },
    { label: "Revoke", destructive: true, dialog: <RevokeGrant grant={grant} /> },
  ];
}

/** Revoking — asked first: every partner relying on it loses the clearance at once. */
function RevokeGrant({ grant, ...held }: HeldBy & { grant: Grant }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`${useText(grant.use)} at ${scopeName(grant.level, grant.ref)} stops clearing for every partner it names. Revoked consent cannot be resumed; it has to be granted again.`}
      confirm="Revoke"
      destructive
      onCommit={() => setGrantState(grant.id, "Revoked")}
    />
  );
}

const partnersLine = (grant: Grant) =>
  grant.partners.mode === "All approved"
    ? ["All approved partners"]
    : grant.partners.mode === "Allowlist"
      ? grant.partners.ids.map(partyName)
      : grant.partners.ids.map((one) => `All except ${partyName(one)}`);

/**
 * AI consent (S1-5): the standing grants the label made, at every scope it made them — catalogue,
 * release, track, artist — and the opt-outs its artists made on themselves, which it reads but
 * cannot change. One grant is stored where it was made and every asset under it inherits it; a
 * narrower deny overrides it, which each grant's own page shows track by track.
 */
export function Grants() {
  const rows = labelGrants();
  return (
    <CollectionPage
      title="AI consent"
      actions={[{ label: "Grant consent", primary: true, creates: true, opens: rightsHref("consent", "new") }]}
      more={[{ label: "Defaults for new releases", opens: rightsHref("consent", "defaults") }, exportCommand("AI consent")]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "grant", many: "grants" },
        note: <Text>{`AI training comes first: ${DEPENDENCY_REASON.replace("AI training is not granted here, and every", "every")}`}</Text>,
        identity: {
          title: "Consent",
          name: grantName,
          mark: (one) => scopeMark(one),
          opens: (one) => rightsHref("consent", one.id),
        },
        sort: { column: "Decided", direction: "descending" },
        columns: [
          {
            name: "Effect",
            value: (one) => one.effect,
            cell: (one) => <ClearanceBadge state={one.effect === "Deny" ? "Denied" : "Granted"} />,
          },
          { name: "Scope", value: (one) => one.level, cell: (one) => SCOPE_WORD[one.level] },
          {
            name: "Partners",
            as: "entities",
            entity: "organization",
            noun: { one: "partner", many: "partners" },
            value: (one) => partnersLine(one),
          },
          { name: "Territory", value: (one) => territoryLabel(one.territory), cell: (one) => <TerritoryChip set={one.territory} /> },
          { name: "From", as: "date", value: (one) => one.from },
          { name: "To", as: "date", value: (one) => one.to },
          { name: "Decided by", value: (one) => one.decided.actor, cell: (one) => decidedBy(one.decided) },
          { name: "Decided", as: "date", grain: "minute", value: (one) => one.decided.at, hidden: true },
          { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`grant:${one.state}`} /> },
        ],
        readings: [
          { name: "AI uses", holds: (one) => AI_USES.includes(one.use) },
          { name: "Every use", holds: () => true },
        ],
        filters: [
          { kind: "anyOf", key: "use", label: "Use", options: [...new Set(rows.map((one) => one.use))], of: (one) => one.use },
          {
            kind: "anyOf",
            key: "scope",
            label: "Scope",
            options: ["Catalogue", "Release", "Asset", "Artist"],
            of: (one) => one.level,
            chipOf: (value) => `Scope: ${SCOPE_WORD[value as ScopeLevel]}`,
          },
          { kind: "anyOf", key: "state", label: "State", options: ["Live", "Paused", "Revoked"], of: (one) => one.state },
        ],
        commands: (one) => [{ label: "Open", opens: rightsHref("consent", one.id) }, ...grantCommands(one)],
        empty: { none: "No consent granted yet: every AI use defaults to deny." },
      }}
    />
  );
}

/** A grant's mark: what its scope names — the label, an artist, a release or a track. */
function scopeMark(grant: Grant) {
  if (grant.level === "Catalogue" || grant.level === "Label" || grant.level === "Artist") return partyMark(grant.ref);
  return assetMark(assetById(grant.ref));
}

/**
 * One standing grant, as the graph keeps it: what it permits, where and when, who decided it on
 * whose behalf (G-5), the attestation it carries, and every track that inherits it — with the
 * narrower answer where one overrides it (S1-5).
 */
export function GrantDetail({ id }: { id: string }) {
  const grant = grantById(id);
  const dispute = disputeOf(grant);
  const reached = assetsIn(grant.level, grant.ref).filter((one) => one.kind !== "Release");
  const asked = grant.partners.mode === "Allowlist" ? grant.partners.ids[0] : undefined;
  return (
    <DetailPage
      record={{
        mark: scopeMark(grant),
        name: grantName(grant),
        kind: `${grant.effect === "Deny" ? "Deny" : "Grant"} at ${SCOPE_WORD[grant.level].toLowerCase()} level`,
        status: `grant:${grant.state}`,
        facts: [
          { text: territoryLabel(grant.territory) },
          { as: "date", label: "From", value: grant.from },
          { text: grant.side === "Both" ? "Both sides" : `${grant.side} side` },
        ],
        more: grantCommands(grant),
      }}
    >
      <Metadata>
        {dispute ? (
          <Alert intent="warn" title="Paused by a dispute">
            {`${partyName(dispute.artist)} disputed the attestation made on their behalf. The grant is paused pending Sureel's review — stored, not revoked — and partners are told it does not clear. `}
            {dispute.conflict ? <Link opens={rightsHref("conflicts", dispute.conflict.id)}>Open the dispute</Link> : null}
          </Alert>
        ) : null}
        {grant.unauthorized ? (
          <Alert intent="danger" title="Stored and flagged">
            {`${partyName(grant.grantedBy)} holds no controlling edge for this right in ${territoryLabel(grant.territory)}: the grant is kept, and never auto-clears.`}
          </Alert>
        ) : null}
        <FactCard
          title="Consent"
          facts={[
            { label: "Use", value: grant.use },
            { label: "Effect", value: <ClearanceBadge state={grant.effect === "Deny" ? "Denied" : "Granted"} /> },
            { label: "Side", value: grant.side },
            { label: "Scope", value: scopeLine(grant.level, scopeName(grant.level, grant.ref)) },
            { label: "Partners", as: "list", value: partnersLine(grant) },
            { label: "Territory", value: <TerritoryChip set={grant.territory} /> },
            { label: "From", as: "date", value: grant.from },
            { label: "To", as: "date", value: grant.to },
            { label: "Conditions", as: "list", value: grant.conditions ?? [] },
          ]}
        />
        <FactCard
          title="Decided"
          facts={[
            { label: "Actor", value: grant.decided.actor },
            { label: "On behalf of", value: grant.decided.onBehalfOf },
            { label: "Authority", value: grant.decided.authority },
            { label: "At", as: "date", grain: "minute", value: grant.decided.at },
          ]}
        />
        {attestationsOn(grant).map((one) => (
          <FactCard
            key={one.id}
            title="Attestation"
            facts={[
              { label: "State", value: <Badge status={`attestation:${one.state}`} /> },
              { label: "Claim", value: one.claim },
              { label: "Attested by", value: partyName(one.attestor) },
              { label: "On behalf of", value: one.onBehalfOf ? partyName(one.onBehalfOf) : undefined },
              { label: "Authority", value: one.authority },
              { label: "Assurance", value: one.assurance },
              { label: "Issued", as: "date", grain: "minute", value: one.issued },
              { label: "Signing key", value: one.keyId, standard: "id" },
            ]}
          />
        ))}
        <TitledCard title="Inherited by" count={reached.length}>
          <Slot layout="list">
            {reached.map((asset) => {
              const answer = clearanceOf(asset.id, grant.use, { partner: asked });
              return (
                <SlotItem
                  key={asset.id}
                  opens={rightsHref("clearances", asset.id)}
                  trail={
                    <Explained why={`Decided at ${answer.decidedAt.toLowerCase()} level. ${answer.reason}`}>
                      <ClearanceBadge state={answer.state} />
                    </Explained>
                  }
                >
                  {assetMark(asset)}
                  <Text kind="title">{asset.title}</Text>
                </SlotItem>
              );
            })}
          </Slot>
        </TitledCard>
      </Metadata>
    </DetailPage>
  );
}

/** Where one grant's page is: under AI consent, reached past the index. */
export const grantPlace = (id: string): ShellPlace => {
  const grant = grantById(id);
  return {
    at: "Rights",
    page: "AI consent",
    trail: [
      { label: "Rights", opens: rightsHref("overview") },
      { label: "AI consent", opens: rightsHref("consent") },
      { label: grant ? grantName(grant) : id },
    ],
  };
};

// ---------------------------------------------------------------------------------------------
// Granting consent — one grant, at the scope chosen (S1-5, S1-6, S1-7)

const LEVELS = [
  { value: "Catalogue", title: "Catalogue", description: "Every recording and video of the label, now and to come." },
  { value: "Release", title: "Release", description: "Every track of one release." },
  { value: "Asset", title: "Track", description: "One recording or video — overrides anything broader." },
  { value: "Artist", title: "Artist", description: "Every recording an artist performs on. Where Voice/NIL is granted." },
];
const MODES = [
  { value: "Allowlist", title: "Only these partners" },
  { value: "All approved", title: "Every approved partner" },
  { value: "Denylist", title: "All but these partners" },
];
const REACH = [
  { value: "World", title: "Worldwide" },
  { value: "Only", title: "Only in" },
  { value: "Except", title: "All except" },
];
const PATHS = [
  {
    value: "ask",
    title: "Ask the artist to confirm",
    description: "The artist signs in the artist app. Nothing clears until they do.",
  },
  {
    value: "attest",
    title: "Attest on the artist's behalf",
    description: "Live at once, under an agreement that lets the label attest. The artist is told.",
  },
];

/** The scope's own record, as the level chosen asks for it. */
function ScopeRow() {
  const level = useAnswer("level");
  const use = useAnswer("use");
  return (
    <WizardRow title="Where">
      <WizardRowBody>
        <Field as="choice" name="level" label="Scope" options={LEVELS} />
        {level === "Release" ? (
          <Field
            as="record"
            name="release"
            label="Release"
            entity="work"
            noun={{ one: "release", many: "releases" }}
            standard="upc"
            options={labelReleases().map((one) => ({ value: one.id, title: one.title, code: one.upc }))}
          />
        ) : null}
        {level === "Asset" ? (
          <Field
            as="record"
            name="track"
            label="Track"
            entity="work"
            noun={{ one: "track", many: "tracks" }}
            standard="isrc"
            options={catalogue().map((one) => ({ value: one.id, title: one.title, code: one.isrc }))}
          />
        ) : null}
        {level === "Artist" ? (
          <Field
            as="record"
            name="artist"
            label="Artist"
            entity="person"
            noun={{ one: "artist", many: "artists" }}
            options={labelArtists().map((one) => ({ value: one, title: partyName(one) }))}
          />
        ) : null}
      </WizardRowBody>
      <WizardRowTips>
        <WizardRowTip>
          One grant is stored at the scope chosen; every asset under it inherits it, and a narrower deny overrides it.
        </WizardRowTip>
        {use === "Voice/NIL" ? <WizardRowTip>Voice/NIL is the artist&apos;s own: it is granted at artist scope.</WizardRowTip> : null}
      </WizardRowTips>
    </WizardRow>
  );
}

/** The scope the draft names, once it names one. */
const scopeFrom = (answers: { level?: string; release?: string; track?: string; artist?: string }) => {
  const level = answers.level as ScopeLevel | undefined;
  const ref =
    level === "Catalogue"
      ? LABEL
      : level === "Release"
        ? answers.release
        : level === "Asset"
          ? answers.track
          : level === "Artist"
            ? answers.artist
            : undefined;
  return level && ref ? { level, ref } : undefined;
};

/**
 * The dependency rule, said where it bites (S1-6): a dependent AI use granted where training is not
 * cleared is not offered, and the line says why; where training is cleared on part of the scope,
 * the tracks it is not are named.
 */
function DependencyRow() {
  const use = useAnswer("use") as Use | undefined;
  const effect = useAnswer("effect");
  const partners = (useAnswer("partners") as readonly string[] | undefined) ?? [];
  const mode = useAnswer("mode");
  const scope = scopeFrom({
    level: useAnswer("level") as string | undefined,
    release: useAnswer("release") as string | undefined,
    track: useAnswer("track") as string | undefined,
    artist: useAnswer("artist") as string | undefined,
  });
  if (!dependsOnTraining(use) || effect !== "Grant" || !scope) return null;
  const asked = mode === "Allowlist" ? partners : [undefined];
  const reads = asked.map((partner) => ({ partner, ...trainingAcross(scope.level, scope.ref, partner) }));
  const none = reads.filter((one) => one.cleared === 0);
  const some = reads.filter((one) => one.cleared > 0 && one.cleared < one.of);
  if (!none.length && !some.length) return null;
  return (
    <WizardRow>
      <WizardRowBody>
        {none.length ? (
          <Alert intent="danger" title={`${use} cannot be granted here`}>
            {`${DEPENDENCY_REASON} ${none.map((one) => (one.partner ? partyName(one.partner) : "No approved partner")).join(", ")}: training is cleared on none of these tracks.`}
          </Alert>
        ) : (
          <Alert intent="warn" title="Part of the scope stays denied">
            {some
              .map(
                (one) =>
                  `${one.partner ? partyName(one.partner) : "Approved partners"}: training is not cleared on ${one.blocked.map((asset) => asset.title).join(", ")}, so ${useText(use!)} reads Denied there.`,
              )
              .join(" ")}
          </Alert>
        )}
      </WizardRowBody>
    </WizardRow>
  );
}

/** The open dispute over an artist's Voice/NIL, where there is one — no new grant goes past it (F3). */
const disputeOver = (artist: string | undefined) =>
  artist
    ? CONFLICTS.find((one) => one.kind === "Attestation dispute" && one.state !== "Resolved" && one.parties.includes(artist))
    : undefined;

/** The Voice/NIL path (S1-7), asked only where Voice/NIL is being granted. */
function VoicePathRow() {
  const use = useAnswer("use");
  const effect = useAnswer("effect");
  const path = useAnswer("path");
  const artist = useAnswer("artist") as string | undefined;
  if (use !== "Voice/NIL" || effect !== "Grant") return null;
  const dispute = disputeOver(artist);
  return (
    <WizardRow title="Who signs">
      <WizardRowBody>
        {dispute ? (
          <Alert intent="danger" title="Disputed by the artist">
            {`${partyName(artist!)} disputes a Voice/NIL attestation the label made: no new Voice/NIL grant can be made for them until Sureel resolves it.`}
          </Alert>
        ) : null}
        <Field as="choice" name="path" label="Voice/NIL path" options={PATHS} />
        {path === "attest" ? (
          <Field
            as="choice"
            name="agreement"
            label="Agreement reference"
            noun={{ one: "clause", many: "clauses" }}
            options={authorities().filter((one) => /attest/i.test(one.description))}
            help="The clause that lets the label attest for the artist. It is cited on the grant and in the artist's notice."
          />
        ) : null}
      </WizardRowBody>
      <WizardRowTips>
        <WizardRowTip term="Ask the artist to confirm">
          The grant is stored paused and the artist gets the request in the artist app.
        </WizardRowTip>
        <WizardRowTip term="Attest on the artist's behalf">
          Live at once. The artist is told who approved it under which clause, and can dispute it — which pauses it pending review.
        </WizardRowTip>
      </WizardRowTips>
    </WizardRow>
  );
}

/** Partners, revealed when the grant names some. */
function PartnersRow() {
  const mode = useAnswer("mode");
  return (
    <WizardRow title="Which partners">
      <WizardRowBody>
        <Field as="choice" name="mode" label="Partners" options={MODES} />
        {mode === "All approved" ? null : (
          <Field
            as="record"
            name="partners"
            label={mode === "Denylist" ? "Except" : "Partners"}
            entity="organization"
            noun={{ one: "partner", many: "partners" }}
            several
            options={PARTNERS.filter((one) => one.kind === "AI platform").map((one) => ({ value: one.id, title: one.name }))}
          />
        )}
      </WizardRowBody>
    </WizardRow>
  );
}

/** Territory, the codes revealed when it is not the whole world. */
function TerritoryRow() {
  const reach = useAnswer("reach");
  return (
    <WizardRow title="Where and when">
      <WizardRowBody>
        <Field as="choice" name="reach" label="Territory" options={REACH} />
        {reach === "World" ? null : (
          <Field as="choices" name="codes" label={reach === "Only" ? "Only in" : "All except"} options={choices(COUNTRIES)} />
        )}
        <Field as="date" name="from" label="From" />
        <Field as="date" name="to" label="To" help="Left blank, it runs until it is revoked." />
      </WizardRowBody>
    </WizardRow>
  );
}

/**
 * Granting AI consent in bulk: ONE grant, written at the scope chosen and inherited by everything
 * under it (S1-5). A WIZARD, because the choices hang together — the use decides the scope Voice/NIL
 * needs, the scope decides whether training is there for a dependent use (S1-6), and Voice/NIL asks
 * who signs (S1-7) — and each needs its tip beside it.
 */
export function GrantWizard() {
  const leave = () => go(rightsHref("consent"));
  return (
    <Wizard
      verb="Grant"
      noun={{ one: "consent", many: "consents" }}
      note="One grant, stored at the scope you choose. Every recording under it inherits it; a narrower deny still wins."
      onExit={leave}
      subject={(answers) => ({
        kind: "organization",
        name: answers.use ? `${answers.use}` : "AI consent",
        meta: [answers.level ? SCOPE_WORD[answers.level as ScopeLevel] : "Scope to choose"],
      })}
      draft={{
        use: owed.choice,
        effect: owed<string>("Grant"),
        level: owed<string>("Catalogue"),
        release: unanswered.record,
        track: unanswered.record,
        artist: unanswered.record,
        mode: owed<string>("Allowlist"),
        partners: [] as readonly string[],
        reach: owed<string>("World"),
        codes: [] as readonly string[],
        from: owed(TODAY),
        to: unanswered.date,
        authority: owed.choice,
        path: unanswered.choice,
        agreement: unanswered.choice,
      }}
      ready={(answers) => {
        const scope = scopeFrom(answers as Parameters<typeof scopeFrom>[0]);
        if (!scope) return false;
        if (answers.mode !== "All approved" && !(answers.partners ?? []).length) return false;
        if (answers.reach !== "World" && !(answers.codes ?? []).length) return false;
        const use = answers.use as Use | undefined;
        if (use === "Voice/NIL" && answers.effect === "Grant") {
          if (scope.level !== "Artist" || !answers.path || disputeOver(scope.ref)) return false;
          if (answers.path === "attest" && !answers.agreement) return false;
        }
        if (dependsOnTraining(use) && answers.effect === "Grant") {
          const asked = answers.mode === "Allowlist" ? (answers.partners ?? []) : [undefined];
          if (asked.some((partner) => trainingAcross(scope.level, scope.ref, partner).cleared === 0)) return false;
        }
        return true;
      }}
      onCommit={(answers) => {
        const scope = scopeFrom(answers)!;
        const use = answers.use as Use;
        const voice =
          use === "Voice/NIL" && answers.effect === "Grant"
            ? {
                path: answers.path as "attest" | "ask",
                artist: scope.ref,
                authority: answers.path === "attest" ? answers.agreement : undefined,
              }
            : undefined;
        const id = writeGrant(
          {
            level: scope.level,
            ref: scope.ref,
            side: "Master",
            use,
            effect: answers.effect as Grant["effect"],
            partners: { mode: answers.mode as Grant["partners"]["mode"], ids: answers.mode === "All approved" ? [] : answers.partners },
            territory: reachOf(answers.reach, answers.codes),
            from: answers.from,
            to: answers.to || undefined,
            conditions: [`Authority ${answers.authority}`],
          },
          voice,
        );
        go(rightsHref("consent", id));
      }}
    >
      <WizardSection>
        <WizardSectionHeader title="What" />
        <WizardSectionBody>
          <WizardRow title="Use">
            <WizardRowBody>
              <Field as="choice" name="use" label="Use" options={AI_USES.map((one) => ({ value: one, title: one }))} />
              <Field as="choice" name="effect" label="Effect" options={choices(["Grant", "Deny"])} />
            </WizardRowBody>
            <WizardRowTips>
              <WizardRowTip>
                Every AI use defaults to deny. AI training comes first: derivative, Voice/NIL and AI streaming are granted only where
                training is.
              </WizardRowTip>
            </WizardRowTips>
          </WizardRow>
          <ScopeRow />
          <DependencyRow />
        </WizardSectionBody>
      </WizardSection>
      <WizardSection>
        <WizardSectionHeader title="For whom" />
        <WizardSectionBody>
          <PartnersRow />
          <TerritoryRow />
        </WizardSectionBody>
      </WizardSection>
      <WizardSection>
        <WizardSectionHeader title="On what authority" />
        <WizardSectionBody>
          <WizardRow title="Authority">
            <WizardRowBody>
              <Field
                as="choice"
                name="authority"
                label="Agreement clause"
                noun={{ one: "clause", many: "clauses" }}
                options={authorities()}
              />
            </WizardRowBody>
            <WizardRowTips>
              <WizardRowTip>
                The grant counts only where the label controls the master there and then. Where it does not, it is stored and flagged, and
                never auto-clears.
              </WizardRowTip>
            </WizardRowTips>
          </WizardRow>
          <VoicePathRow />
        </WizardSectionBody>
      </WizardSection>
    </Wizard>
  );
}
