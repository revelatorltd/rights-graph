import { useState } from "react";
import {
  Alert,
  AlertGroup,
  Badge,
  Button,
  CardGrid,
  DatePicker,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerHeading,
  DrawerTitle,
  EmptyState,
  FactCard,
  Field,
  FieldLabel,
  Link,
  Metadata,
  RecordIndex,
  Sections,
  Slot,
  SlotItem,
  Text,
  TitledCard,
  formatDate,
  formatList,
  formatMeta,
  formatPercent,
} from "@revelator/pro-ui";

import { ASSERTIONS, TODAY, agreementById, assetById, partyName } from "../../../graph/fixtures";
import type { Assertion, Asset } from "../../../graph/model";
import { PRECEDENCE } from "../../../graph/model";
import { GRAPH_VERSION, RULE_VERSION, controllers, recordingsOf, shareTotals, tierOf, worksOf } from "../../../graph/resolve";
import { TerritoryChip, TierChip, partyMark } from "../../../rights/kit";
import { proHref, type Persona } from "../index";
import {
  byPlace,
  claimMeta,
  claimsOn,
  countriesOf,
  datesWords,
  interestWords,
  isPast,
  knownBy,
  masterAssets,
  openConflictsOn,
  rightsWords,
  shareWords,
  stateThen,
  supersederOf,
  against,
  type Reading,
} from "./data";
import { ACTOR, ClaimDialog, LinkWork, WithdrawClaim } from "./dialogs";
import { assetHref } from "./indexes";

/** Who the reader is working as, in each context — the party their claims are made by. */
export const READER: Record<Persona, string> = { Label: "p-kestrel", Publisher: "p-harbor" };

/**
 * The two dates a rights read takes (S1-12) — the day the rights are read AS OF, and the day the
 * graph is read as it KNEW them. They say what the facet is about
 * rather than acting on it — the first thing the facet holds, over what it reads. A past state is read-only.
 */
export function ReadingPickers({ reading, onChange }: { reading: Reading; onChange: (next: Reading) => void }) {
  return (
    <TitledCard title="Read the rights">
      <Slot layout="grid">
        <SlotItem>
          <Field>
            <FieldLabel>As of</FieldLabel>
            <DatePicker selected={reading.asOf} onSelectedChange={(day) => onChange({ ...reading, asOf: day ?? TODAY })} clearLabel="Back to today" />
          </Field>
        </SlotItem>
        <SlotItem>
          <Field>
            <FieldLabel>As we knew it on</FieldLabel>
            <DatePicker
              selected={reading.knownAt}
              latest={TODAY}
              onSelectedChange={(day) => onChange({ ...reading, knownAt: day ?? TODAY })}
              clearLabel="Back to today"
            />
          </Field>
        </SlotItem>
      </Slot>
    </TitledCard>
  );
}

/**
 * An asset's rights, as the FRD's pattern 2 draws them: master on the left, composition on the
 * right, always, and never one percentage for both (G-3). Each side first as the graph RESOLVED it
 * — who controls it and what the shares come to, territory by territory (G-4) — then the CLAIMS it
 * resolved them from, each with its source and state (G-2), pressed open for its evidence and the
 * claims it replaced (pattern 1).
 *
 * A release holds no rights: its facet is its tracks', each opening on its own.
 */
export function RightsFacet({
  asset,
  reading,
  persona,
  onReading,
}: {
  asset: Asset;
  reading: Reading;
  persona: Persona;
  onReading: (next: Reading) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (asset.kind === "Release") return <ReleaseRights release={asset} />;

  const reader = READER[persona];
  const past = isPast(reading);
  const masters = masterAssets(asset);
  const linked = worksOf(asset);
  // In a past state, only the conflicts already open by the day the graph is read as knowing.
  const conflicts = openConflictsOn([...masters, ...linked].map((one) => one.id)).filter((one) => !past || one.opened <= reading.knownAt);
  const claim = open ? ASSERTIONS.find((one) => one.id === open) : undefined;

  return (
    <Sections>
      <ReadingPickers reading={reading} onChange={onReading} />
      {past || conflicts.length ? (
        <AlertGroup>
          {past ? (
            <Alert intent="info" title="A past state, read-only">
              {`The rights as they stood on ${formatDate(reading.asOf, "day")}, as the graph knew them on ${formatDate(reading.knownAt, "day")}. Clear both dates to claim or correct.`}
            </Alert>
          ) : null}
          {conflicts.map((one) => (
            <Alert key={one.id} emphasis="soft" intent={one.severity === "High" ? "danger" : "warn"} title={`${one.kind} on the ${one.side.toLowerCase()} side`}>
              {`${assetById(one.assetId).title}, ${one.territories.join(", ")}. ${one.interim} `}
              <Link opens={proHref("rights", "conflicts", one.id)}>Open the conflict</Link>
            </Alert>
          ))}
        </AlertGroup>
      ) : null}
      <CardGrid columns={2}>
        <MasterResolved asset={asset} at={reading.asOf} knownAt={knownBy(reading)} />
        <CompositionResolved asset={asset} at={reading.asOf} knownAt={knownBy(reading)} persona={persona} past={past} />
        <TitledCard
          title={asset.kind === "Video" ? "Master claims, with what it contains" : "Master claims"}
          count={masters.flatMap((one) => claimsOn(one.id, reading)).length}
          trail={<TierChip tier={tierOf(asset.id)} />}
        >
          <ClaimRows
            claims={masters.flatMap((one) => claimsOn(one.id, reading))}
            reading={reading}
            reader={reader}
            named={asset.kind === "Video"}
            onOpen={setOpen}
            none="No master claim on this asset yet."
          />
        </TitledCard>
        <TitledCard title="Composition claims" count={linked.flatMap((one) => claimsOn(one.id, reading)).length}>
          {linked.length ? (
            <ClaimRows
              claims={linked.flatMap((one) => claimsOn(one.id, reading))}
              reading={reading}
              reader={reader}
              named={linked.length > 1}
              onOpen={setOpen}
              none="No publisher or writer has claimed the linked work yet."
            />
          ) : (
            <Slot layout="empty">
              <EmptyState title="No work, no composition claims" detail="Composition claims sit on the work this recording embodies." />
            </Slot>
          )}
        </TitledCard>
      </CardGrid>
      <ClaimDrawer claim={claim} reading={reading} reader={reader} persona={persona} onClose={() => setOpen(null)} />
    </Sections>
  );
}

/** The master, as the graph resolved it: who controls it and its share, run by run of territory. */
function MasterResolved({ asset, at, knownAt }: { asset: Asset; at: Date; knownAt?: Date }) {
  const places = countriesOf(masterAssets(asset).map((one) => one.id));
  const runs = byPlace(
    places,
    (country) => ({
      holders: controllers(asset.id, "Master", country, at, knownAt),
      total: shareTotals(asset.id, country, at, knownAt).find((one) => one.shareType === "Master"),
    }),
    (value) => `${value.holders.map((one) => one.id).join()}/${value.total?.total ?? 0}`,
  );
  const contained = asset.kind === "Video" ? asset.contains ?? [] : [];
  return (
    <FactCard
      title="Master, as resolved"
      facts={[
        ...contained.map((one) => ({
          label: "Contains",
          as: "list" as const,
          value: [assetById(one.recordingId).title, `from ${one.from} to ${one.to}`, one.usage],
        })),
        ...runs.map((run) =>
          run.value.holders.length
            ? {
                label: run.place,
                as: "list" as const,
                value: [
                  `${formatList([...new Set(run.value.holders.map((one) => partyName(one.partyId)))])} controls`,
                  ...(run.value.total ? [`Master ${formatPercent(run.value.total.total, { whole: true })}`] : []),
                  run.value.holders[0]!.sourceRef,
                ],
              }
            : { label: run.place, value: "No one controls the master here — a gap" },
        ),
        { label: "Tier", value: <TierChip tier={tierOf(asset.id)} /> },
        { label: "Resolved under", as: "list" as const, value: [`Rules ${RULE_VERSION}`, GRAPH_VERSION, formatDate(at, "day")] },
      ]}
    />
  );
}

const workLine = (work: Asset, link: NonNullable<Asset["embodies"]>[number] | undefined) =>
  formatMeta([work.iswc ?? "ISWC pending", link ? `${link.portion} — ${link.source}` : "Through a contained recording", `Tier T${tierOf(work.id)}`]);

/**
 * The composition, as the graph resolved it: each linked work's shares — publisher and writer, two
 * lines and never one — and who controls it, run by run of territory. A missing link is said for
 * what it is, unmatched publishing money, with the way to the link.
 */
function CompositionResolved({ asset, at, knownAt, persona, past }: { asset: Asset; at: Date; knownAt?: Date; persona: Persona; past: boolean }) {
  const linked = worksOf(asset);
  if (!linked.length) {
    const unlinked = asset.kind === "Video" ? recordingsOf(asset).find((one) => worksOf(one).length === 0) : asset;
    const conflict = openConflictsOn([unlinked?.id ?? asset.id]).find((one) => one.kind === "Missing work link");
    return (
      <TitledCard title="Composition, as resolved">
        <Slot layout="empty">
          <EmptyState
            mark="crosslink"
            title="No work linked"
            detail="Publishing income on this recording is unmatched: no publisher or writer can be paid until it is linked, and every composition use comes back Needs review."
          >
            {past || !unlinked || unlinked.kind !== "Recording" ? null : (
              <LinkWork action="Link a work" recording={unlinked} by={persona === "Label" ? "Label declaration — Kestrel Point" : "Publisher confirmed — Harbor Music"} />
            )}
            {conflict ? <Link opens={proHref("rights", "conflicts", conflict.id)}>Open the conflict</Link> : null}
          </EmptyState>
        </Slot>
      </TitledCard>
    );
  }
  const facts = linked.flatMap((work) => {
    const link = asset.embodies?.find((one) => one.workId === work.id);
    const runs = byPlace(
      countriesOf([work.id]),
      (country) => ({
        totals: shareTotals(work.id, country, at, knownAt),
        holders: [...new Set(controllers(work.id, "Composition", country, at, knownAt).map((one) => partyName(one.partyId)))],
      }),
      (value) => JSON.stringify(value),
    );
    return [
      {
        label: work.title,
        // The work's own page is the publisher's (S2-1); a label reads it here.
        value:
          persona === "Publisher" ? (
            <Link opens={proHref("rights", "works", work.id)}>{workLine(work, link)}</Link>
          ) : (
            workLine(work, link)
          ),
      },
      ...runs.map((run) => ({
        label: run.place,
        as: "list" as const,
        value: [
          ...run.value.totals.map(
            (one) => `${one.shareType} ${formatPercent(one.total, { whole: true })}${one.state === "Whole" ? "" : one.state === "Overclaim" ? " — overclaim" : " — gap"}`,
          ),
          run.value.holders.length ? `controlled by ${formatList(run.value.holders)}` : "no one controls it",
        ],
      })),
    ];
  });
  return <FactCard title="Composition, as resolved" facts={facts} />;
}

/**
 * Claim rows (pattern 1): the party, what it holds and where and when, from what, and the state the
 * resolver left it in. Pressed, a row opens where the reader is — its evidence and its history.
 */
function ClaimRows({
  claims,
  reading,
  reader,
  named,
  onOpen,
  none,
}: {
  claims: readonly Assertion[];
  reading: Reading;
  reader: string;
  /** More than one asset's claims stand in the list: each says whose it is. */
  named: boolean;
  onOpen: (id: string) => void;
  none: string;
}) {
  if (!claims.length)
    return (
      <Slot layout="empty">
        <EmptyState title="No claims" detail={none} />
      </Slot>
    );
  // The standing first, then the replaced and the withdrawn, each newest first.
  const order = [...claims].sort(
    (one, other) => Number(other.state !== "Superseded" && other.state !== "Withdrawn") - Number(one.state !== "Superseded" && one.state !== "Withdrawn") || other.known.getTime() - one.known.getTime(),
  );
  return (
    <Slot layout="list">
      {order.map((one) => {
        const own = one.partyId === reader;
        const differs = own && against(one, reading.asOf, knownBy(reading)).differs;
        return (
          <SlotItem key={one.id} opens={() => onOpen(one.id)} trail={<Badge status={`claim:${stateThen(one, reading)}`} />}>
            {partyMark(one.partyId)}
            <Text kind="title">{partyName(one.partyId)}</Text>
            <Text
              meta={[
                ...(named ? [assetById(one.assetId).title] : []),
                ...claimMeta(one),
                ...(own ? [differs ? "Yours — the graph differs" : "Yours"] : []),
              ]}
            />
          </SlotItem>
        );
      })}
    </Slot>
  );
}

/** The claims a claim replaced, oldest first, and the one that replaced it, where one did. */
function chainOf(claim: Assertion): Assertion[] {
  const back: Assertion[] = [];
  let at: Assertion | undefined = claim;
  while (at?.supersedes) {
    at = ASSERTIONS.find((one) => one.id === at!.supersedes);
    if (at) back.unshift(at);
  }
  const forward: Assertion[] = [];
  let next = supersederOf(claim);
  while (next) {
    forward.push(next);
    next = supersederOf(next);
  }
  return [...back, claim, ...forward];
}

/**
 * One claim, opened beside the rights: the claim in full, the graph's answer next to it and why
 * they differ (G-1), its evidence, and the chain of claims it replaced or was replaced by. The
 * reader's own standing claim can be corrected or withdrawn — never edited.
 */
function ClaimDrawer({
  claim,
  reading,
  reader,
  persona,
  onClose,
}: {
  claim: Assertion | undefined;
  reading: Reading;
  reader: string;
  persona: Persona;
  onClose: () => void;
}) {
  const asset = claim ? assetById(claim.assetId) : undefined;
  const answer = claim ? against(claim, reading.asOf, knownBy(reading)) : undefined;
  const agreement = claim?.agreementId ? agreementById(claim.agreementId) : undefined;
  const own = claim?.partyId === reader;
  const standingNow = claim && claim.state !== "Superseded" && claim.state !== "Withdrawn";
  return (
    <Drawer open={Boolean(claim)} onOpenChange={(next) => (next ? null : onClose())}>
      {claim && asset && answer ? (
        <DrawerContent>
          <DrawerHeader>
            <DrawerHeading>
              {partyMark(claim.partyId)}
              <DrawerTitle>{`${partyName(claim.partyId)}, ${claim.side.toLowerCase()} claim`}</DrawerTitle>
            </DrawerHeading>
          </DrawerHeader>
          <DrawerBody>
            <Metadata>
              <FactCard
                title="Claim"
                facts={[
                  { label: "On", value: `${asset.title} (${asset.kind.toLowerCase()})` },
                  { label: "Interest", value: interestWords(claim) },
                  { label: "Rights", value: rightsWords(claim) },
                  { label: "Share", value: `${claim.shareType} ${shareWords(claim)}` },
                  { label: "Territory", value: <TerritoryChip set={claim.territory} /> },
                  { label: "In force", value: datesWords(claim) },
                  { label: "Basis", value: claim.basis },
                  { label: "Source", value: `${claim.source} — precedence ${PRECEDENCE[claim.source]} of 6` },
                  { label: "Reference", value: claim.sourceRef },
                  { label: "Agreement", value: agreement ? `${agreement.code} — ${agreement.title}` : undefined },
                  { label: "Known since", as: "date", value: claim.known },
                  { label: "State", value: <Badge status={`claim:${stateThen(claim, reading)}`} /> },
                  { label: "Tier", value: <TierChip tier={tierOf(claim.assetId)} /> },
                ]}
              />
              <FactCard
                title={own ? "Your claim, as the graph resolves it" : "As the graph resolves it"}
                facts={[
                  { label: "The graph", value: answer.says },
                  ...(answer.differs && answer.why ? [{ label: "Why it differs", value: answer.why }] : []),
                  { label: "Rules", value: `Resolver ${RULE_VERSION}` },
                ]}
              />
              <TitledCard title="Evidence" count={claim.evidence?.length ?? 0}>
                {claim.evidence?.length ? (
                  <Slot layout="list">
                    {claim.evidence.map((one) => (
                      <SlotItem key={one}>
                        <Text kind="title">{one}</Text>
                      </SlotItem>
                    ))}
                  </Slot>
                ) : (
                  <Slot layout="empty">
                    <EmptyState title="No evidence uploaded" detail={`The claim rests on its source: ${claim.sourceRef}.`} />
                  </Slot>
                )}
              </TitledCard>
              <TitledCard title="History" count={chainOf(claim).length}>
                <Slot layout="list">
                  {chainOf(claim).map((one) => (
                    <SlotItem key={one.id} trail={<Badge status={`claim:${one.state}`} />}>
                      <Text kind="title">{one.id === claim.id ? `${shareWords(one)} — this claim` : shareWords(one)}</Text>
                      <Text meta={[formatDate(one.known, "day"), one.source, one.sourceRef]} />
                    </SlotItem>
                  ))}
                </Slot>
              </TitledCard>
            </Metadata>
          </DrawerBody>
          {own && standingNow && !isPast(reading) ? (
            <DrawerFooter>
              <WithdrawClaim action="Withdraw claim" trigger={<Button variant="secondary">Withdraw claim</Button>} claim={claim} actor={ACTOR[persona]} />
              <ClaimDialog action="Correct claim" on={[asset]} side={claim.side} party={reader} actor={ACTOR[persona]} correcting={claim} />
            </DrawerFooter>
          ) : null}
        </DrawerContent>
      ) : null}
    </Drawer>
  );
}

/**
 * A release's rights are its tracks': it packages them and holds none of its own. Each track is a
 * row — its master as held, its work link, its tier and what it is in conflict over — and opens on
 * its own Rights.
 */
function ReleaseRights({ release }: { release: Asset }) {
  const tracks = recordingsOf(release);
  const held = (one: Asset) => {
    const all = countriesOf([one.id]);
    const missing = all.filter((country) => controllers(one.id, "Master", country).length === 0);
    return missing.length ? `Gap in ${missing.join(", ")}` : "Controlled";
  };
  return (
    <Sections>
      <Alert intent="info" title="A release holds no rights">
        It packages its tracks, and each track's master and composition are its own. Open a track to claim or correct.
      </Alert>
      <RecordIndex
        rows={tracks}
        rowKey={(one) => one.id}
        noun={{ one: "track", many: "tracks" }}
        identity={{ title: "Track", name: (one) => one.title, rank: (_, at) => at + 1, opens: (one) => assetHref(one, "rights") }}
        columns={[
          { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => one.isrc },
          { name: "Master", value: held, cell: held },
          {
            name: "Composition",
            value: (one) => worksOf(one).length,
            cell: (one) => (worksOf(one).length ? worksOf(one).map((work) => work.title).join(", ") : <Badge status="match:Unmatched" />),
          },
          { name: "Tier", value: (one) => tierOf(one.id), cell: (one) => <TierChip tier={tierOf(one.id)} /> },
          { name: "Open conflicts", as: "count", value: (one) => openConflictsOn([one.id, ...worksOf(one).map((work) => work.id)]).length },
        ]}
        chooser={false}
        empty={{ holder: "this release", line: true }}
      />
    </Sections>
  );
}
