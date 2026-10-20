import { Badge, DetailPage, FactCard, Metadata, RecordIndex, formatList, type ShellPlace } from "@revelator/pro-ui";

import { ATTESTATIONS, agreementById } from "../../graph/fixtures";
import { TIERS, USES, type Asset, type Use } from "../../graph/model";
import { clearanceOf, controllers, recordingsEmbodying, tierOf, worksOf, type Clearance } from "../../graph/resolve";
import { TierChip, decidedBy } from "../../rights/kit";
import type { Shown } from "../surface";
import { REGISTRATIONS, assetById, creditsOf, partyName, type Reader } from "./data";
import { creditCommands } from "./credits";
import { assetMark } from "./marks";
import { ASSET_FACETS, artistHref, assetHref, type AssetFacet } from "./place";

/** Where a clearance is read: the US, today — the default every partner look-up starts from. */
const READ_IN = "US";

/** Who decided a side, in plain words: the party behind the grant, or the rule that answered. */
const byWhom = (side: Clearance["master"]) => (side.grant ? partyName(side.grant.grantedBy) : "Nobody — the default answered");

/**
 * One recording or work the reader is credited on, at two facets: their CREDIT (what they are on
 * it, what they signed, what the tier needs), and its CLEARANCE (S3-6) — which uses are allowed,
 * by whom, master and composition apart, without a commercial term anywhere.
 */
function AssetBody({ reader, asset, facet }: { reader: Reader; asset: Asset; facet: AssetFacet }) {
  const credit = creditsOf(reader.subject.id).find((one) => one.assetId === asset.id);
  const tier = tierOf(asset.id);
  const signed = credit ? ATTESTATIONS.filter((one) => one.subject.kind === "Credit" && one.subject.id === credit.id) : [];
  const commands = credit ? creditCommands(reader, credit) : [];
  const owed = credit?.state === "To confirm" && !commands[0]!.unavailable;
  return (
    <DetailPage
      record={{
        mark: assetMark(asset),
        name: asset.title,
        kind: asset.kind === "Work" ? "Work" : "Recording",
        status: credit ? `credit:${credit.state}` : undefined,
        facts: [
          ...(asset.isrc ? [{ identifier: asset.isrc, standard: "isrc" as const }] : []),
          ...(asset.iswc ? [{ identifier: asset.iswc, standard: "iswc" as const }] : []),
          { text: asset.artist ?? formatList(controllers(asset.id, "Composition", READ_IN).map((one) => partyName(one.partyId))) ?? "No publisher yet" },
        ],
        // The step owed stands out: a credit still to confirm offers the confirmation first.
        actions: owed ? [{ label: "Confirm credit", primary: true, dialog: commands[0]!.dialog! }] : undefined,
        more: owed ? commands.slice(1) : commands,
      }}
      facet={facet === "Credit" ? undefined : { name: facet }}
    >
      {facet === "Clearance" ? (
        <ClearanceOf asset={asset} />
      ) : (
        <Metadata>
          <FactCard
            title="Your credit"
            facts={
              credit
                ? [
                    { label: "Role", value: credit.role },
                    { label: "Credited as", value: credit.credited },
                    { label: "Status", value: <Badge status={`credit:${credit.state}`} /> },
                    {
                      label: "Signed",
                      value: signed.length
                        ? signed.map((one) => `${one.claim} — ${decidedBy({ actor: partyName(one.attestor), authority: `ArtistID ${one.assurance}`, at: one.issued })}`).join("; ")
                        : null,
                    },
                  ]
                : [{ label: "Role", value: null }]
            }
          />
          <FactCard
            title="Confidence"
            facts={[
              { label: "Tier", value: <TierChip tier={tier} /> },
              { label: "What it is", value: TIERS[tier].name },
              { label: "Next tier asks for", value: tier < 5 ? TIERS[(tier + 1) as 2 | 3 | 4 | 5].requires : null },
            ]}
          />
          <FactCard
            title={asset.kind === "Work" ? "The work" : "The recording"}
            facts={
              asset.kind === "Work"
                ? [
                    { label: "ISWC", value: asset.iswc ?? null },
                    { label: "Publishers", as: "list", value: controllers(asset.id, "Composition", READ_IN).map((one) => partyName(one.partyId)) },
                    { label: "Recordings of it", as: "list", value: recordingsEmbodying(asset.id).map((one) => one.title) },
                    {
                      label: "Registrations",
                      as: "list", value: REGISTRATIONS.filter((one) => one.workId === asset.id).map((one) => `${one.society} ${one.state.toLowerCase()}`),
                    },
                  ]
                : [
                    { label: "Artist", value: asset.artist ?? null },
                    { label: "Label", value: asset.labelId ? partyName(asset.labelId) : null },
                    { label: "Released", as: "date", value: asset.released ?? null },
                    { label: "Works it embodies", as: "list", value: worksOf(asset).map((one) => one.title) },
                    {
                      label: "Agreement",
                      as: "list", value: 
                          controllers(asset.id, "Master", READ_IN)
                            .map((one) => (one.agreementId ? agreementById(one.agreementId)?.code : one.sourceRef))
                            .filter((one): one is string => Boolean(one)),
                    },
                  ]
            }
          />
        </Metadata>
      )}
    </DetailPage>
  );
}

interface UseRow {
  use: Use;
  answer: Clearance;
}

/**
 * S3-6, for one track: every use, allowed or not, and by whom — the master side and the
 * composition side each their own column (G-3), read in the US today (G-4). No price, no fee, no
 * licence model: what the artist is told is what is allowed, never what it earns.
 */
function ClearanceOf({ asset }: { asset: Asset }) {
  const rows: UseRow[] = USES.map((use) => ({ use, answer: clearanceOf(asset.id, use, { country: READ_IN }) }));
  return (
    <RecordIndex
      rows={rows}
      rowKey={(one) => one.use}
      noun={{ one: "use", many: "uses" }}
      identity={{ title: "Use", name: (one) => one.use }}
      columns={[
        { name: "Answer", value: (one) => one.answer.state, cell: (one) => <Badge status={`clearance:${one.answer.state}`} /> },
        ...(asset.kind === "Work"
          ? []
          : [
              { name: "Recording", value: (one: UseRow) => one.answer.master.state, cell: (one: UseRow) => <Badge status={`clearance:${one.answer.master.state}`} /> },
              { name: "Recording decided by", value: (one: UseRow) => byWhom(one.answer.master), cell: (one: UseRow) => byWhom(one.answer.master) },
            ]),
        {
          name: "Song",
          value: (one) => one.answer.composition.map((side) => side.state).join(", "),
          cell: (one) =>
            one.answer.composition.length ? (
              <Badge
                status={`clearance:${one.answer.composition.find((side) => side.state === "Denied")?.state ?? one.answer.composition.find((side) => side.state === "Needs review")?.state ?? "Granted"}`}
              />
            ) : (
              "Not asked"
            ),
        },
        {
          name: "Song decided by",
          value: (one) => formatList(one.answer.composition.map((side) => (side.party ? partyName(side.party) : byWhom(side)))) ?? "",
          cell: (one) => formatList(one.answer.composition.map((side) => (side.party ? partyName(side.party) : byWhom(side)))),
        },
        { name: "Why", value: (one) => one.answer.reason, cell: (one) => one.answer.reason },
        { name: "Decided at", value: (one) => one.answer.decidedAt, cell: (one) => one.answer.decidedAt },
      ]}
      readings={[
        { name: "All", holds: () => true },
        { name: "Allowed", holds: (one) => one.answer.state === "Granted" },
        { name: "Not allowed", holds: (one) => one.answer.state === "Denied" },
        { name: "Needs review", holds: (one) => one.answer.state === "Needs review" },
      ]}
      note={`Read for the United States, today. ${asset.title}'s territory and dates are on each grant.`}
      chooser={false}
      empty={{ holder: asset.title, line: true }}
    />
  );
}

const placeOf = (reader: Reader, asset: Asset, facet: AssetFacet): ShellPlace => {
  const writer = asset.kind === "Work" && reader.persona === "Writer";
  const index = writer ? { at: "Works", name: "Works", opens: artistHref("works") } : { at: "Credits", name: "Credits", opens: artistHref("credits") };
  return {
    at: index.at,
    page: asset.title,
    record: {
      back: { index: index.name, opens: index.opens },
      facets: ASSET_FACETS,
      at: facet,
      addressOf: (one) => assetHref(asset.id, one as AssetFacet),
    },
    trail: [{ label: index.name, opens: index.opens }, { label: asset.title }],
  };
};

export function assetPage(reader: Reader, id: string, facetWord?: string): Shown {
  const asset = assetById(id) ?? assetById(creditsOf(reader.subject.id)[0]!.assetId);
  const facet: AssetFacet = facetWord === "clearance" ? "Clearance" : "Credit";
  return {
    place: placeOf(reader, asset, facet),
    page: <AssetBody key={`${reader.persona}/${asset.id}/${facet}`} reader={reader} asset={asset} facet={facet} />,
  };
}
