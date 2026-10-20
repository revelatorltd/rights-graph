import { useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  CollectionPage,
  DetailPage,
  FactCard,
  FormDialog,
  Metadata,
  RecordIndex,
  TitledCard,
  UploaderDocument,
  UploaderFileRow,
  formatList,
  formatMeta,
  formatPercent,
  type HeldBy,
} from "@revelator/pro-ui";

import { ASSERTIONS, CONFLICTS, assetById, partyName } from "../../graph/fixtures";
import type { Assertion } from "../../graph/model";
import { covers, shareTotals, standing, tierOf } from "../../graph/resolve";
import { TerritoryChip, TierChip, partyMark } from "../../rights/kit";
import { ackFiles, ackPending, registrationOf, registrations, sendAcknowledgements, type AckFile, type Registration } from "./data";
import { partnerHref, type PartnerPage, type Working } from "./working";

const SOCIETY_TERRITORY = "DE";
const REGISTRATION: readonly Registration["state"][] = ["Missing", "Rejected", "Sent", "Acknowledged"];
const CLAIM: readonly Assertion["state"][] = ["Contested", "No authority", "Resolved", "Superseded", "Withdrawn"];

/** The share the graph resolves for the registrant in the society's territory — its resolved claims only. */
const heldFor = (registration: Registration) =>
  ASSERTIONS.filter(
    (one) =>
      one.assetId === registration.workId &&
      one.partyId === registration.registrant &&
      one.interests.includes("Owns") &&
      one.state === "Resolved" &&
      covers(one.territory, SOCIETY_TERRITORY),
  ).reduce<number | undefined>((most, one) => Math.max(most ?? 0, one.share), undefined);
/** Every publisher share claimed on the work in the territory, contested ones included. */
const claimedIn = (workId: string) => shareTotals(workId, SOCIETY_TERRITORY).find((one) => one.shareType === "Publisher")?.total;
const conflictOn = (workId: string) => CONFLICTS.find((one) => one.assetId === workId && one.state !== "Resolved" && one.territories.includes(SOCIETY_TERRITORY));

/**
 * An acknowledgement file sent (S6-8): the registrations it answers update, each share it
 * acknowledges is written to the graph as a claim, and where one disagrees with the graph a
 * conflict opens for Sureel ops. The prototype applies GEMA's next file in place of reading it.
 */
export function SendAcknowledgements(held: HeldBy) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <FormDialog
      {...held}
      confirm="Send"
      ready={() => file !== null}
      onCommit={() => sendAcknowledgements(file!.name)}
    >
      <UploaderDocument multiple={false} noun={{ one: "acknowledgement file", many: "acknowledgement files" }} formats="CWR 2.1 to 3.1 ACK" accept=".cwr,.v21,.v22,.v30,.v31,.txt" onSelect={(files) => setFile(files[0] ?? null)}>
        {file ? <UploaderFileRow name={file.name} fileSize={file.size} phase="landed" onRemove={() => setFile(null)} /> : null}
      </UploaderDocument>
    </FormDialog>
  );
}

const send = () => ({ label: "Send acknowledgements", primary: true, dialog: <SendAcknowledgements /> });

/** The works registered with the society, found by its own work number (S6-8). */
export function Registrations({ working }: { working: Working }) {
  const pending = ackPending();
  return (
    <CollectionPage
      title="Works"
      actions={pending ? [send()] : []}
      more={pending ? undefined : [{ label: "Send acknowledgements", unavailable: "Every registration sent to you is acknowledged." }]}
      index={{
        rows: registrations(),
        rowKey: (one) => one.workId,
        noun: { one: "work", many: "works" },
        identity: {
          title: "Work",
          name: (one) => assetById(one.workId).title,
          mark: (one) => <Avatar kind="work" name={assetById(one.workId).title} />,
          opens: (one) => partnerHref("registrations", one.workId),
        },
        searchBy: ["Work", `${working.partner.name} work number`, "ISWC"],
        columns: [
          { name: "Registration", value: (one) => REGISTRATION.indexOf(one.state), cell: (one) => <Badge status={`registration:${one.state}`} />, readings: ["All"] },
          { name: `${working.partner.name} work number`, as: "identifier", standard: "id", value: (one) => one.number },
          { name: "ISWC", as: "identifier", standard: "iswc", value: (one) => assetById(one.workId).iswc },
          { name: "Registrant", value: (one) => partyName(one.registrant), cell: (one) => partyName(one.registrant) },
          { name: "Acknowledged share", as: "percent", value: (one) => one.share },
          // G-3: the composition's publisher share in the territory, as the graph resolves it.
          { name: "Graph holds in DE", as: "percent", value: heldFor },
          { name: "Conflict", value: (one) => conflictOn(one.workId)?.id ?? "", cell: (one) => (conflictOn(one.workId) ? <Badge status={`conflict:${conflictOn(one.workId)!.state}`} /> : null) },
          { name: "Acknowledged", as: "date", value: (one) => one.acknowledged },
        ],
        readings: [{ name: "All", holds: () => true }, ...REGISTRATION.map((state) => ({ name: state, holds: (one: Registration) => one.state === state }))],
        commands: (one) => [{ label: "Open", opens: partnerHref("registrations", one.workId) }],
      }}
    />
  );
}

/**
 * One work, as the society sees it: its registration, and every claim the graph holds on it in
 * the society's territory — each with its source and state (G-1, G-2), the composition alone
 * (G-3), with territory and dates (G-4). The society never edits them: what it sends is an
 * acknowledgement, which becomes a claim of its own.
 */
export function RegistrationDetail({ registration, working }: { registration: Registration; working: Working }) {
  const work = assetById(registration.workId);
  const claims = ASSERTIONS.filter((one) => one.assetId === work.id && covers(one.territory, SOCIETY_TERRITORY) && (standing(one) || one.state === "Superseded"));
  const conflict = conflictOn(work.id);
  const held = heldFor(registration);
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="work" name={work.title} />,
        name: work.title,
        status: `registration:${registration.state}`,
        facts: [
          ...(registration.number ? [{ identifier: registration.number, standard: "id" as const }] : []),
          ...(work.iswc ? [{ identifier: work.iswc, standard: "iswc" as const }] : []),
          { text: partyName(registration.registrant), mark: "rights" },
        ],
      }}
    >
      <Metadata>
        {conflict ? (
          <Alert intent="danger" title={`${conflict.kind} in ${SOCIETY_TERRITORY} — ${conflict.state}`}>
            {`${working.partner.name} acknowledged ${formatPercent(registration.share ?? 0)} for ${partyName(registration.registrant)}; the graph holds ${formatPercent(held ?? 0)} for them in ${SOCIETY_TERRITORY}, and ${formatPercent(conflict.total ?? claimedIn(work.id) ?? 0)} is claimed in all. Sureel ops resolves it. ${conflict.interim}`}
          </Alert>
        ) : registration.reason ? (
          <Alert intent="warn" title={registration.state === "Missing" ? "Not registered" : "Rejected"}>
            {registration.reason}
          </Alert>
        ) : null}
        <FactCard
          title="Registration"
          facts={[
            { label: "Status", value: <Badge status={`registration:${registration.state}`} /> },
            { label: `${working.partner.name} work number`, value: registration.number, standard: "id" },
            { label: "Registrant", value: partyName(registration.registrant) },
            { label: "Sent", as: "date", value: registration.sent ?? null },
            { label: "Acknowledged", as: "date", value: registration.acknowledged ?? null },
            { label: "Acknowledged share", as: "percent", value: registration.share ?? null },
            { label: "CWR file", value: registration.file },
          ]}
        />
        <FactCard
          title={`What the graph holds in ${SOCIETY_TERRITORY}`}
          facts={[
            { label: `Resolved for ${partyName(registration.registrant)}`, as: "percent", value: held ?? null },
            { label: "Publisher shares claimed", as: "percent", value: claimedIn(work.id) ?? null },
            { label: "Writer shares claimed", as: "percent", value: shareTotals(work.id, SOCIETY_TERRITORY).find((one) => one.shareType === "Writer")?.total ?? null },
            { label: "Tier", value: <TierChip tier={tierOf(work.id)} /> },
            { label: "Revenue, last 12 months", as: "money", value: work.revenue },
          ]}
        />
        <TitledCard title={`Claims in ${SOCIETY_TERRITORY}`} count={claims.length}>
          <RecordIndex
            rows={claims}
            rowKey={(one) => one.id}
            noun={{ one: "claim", many: "claims" }}
            identity={{ title: "Party", name: (one) => partyName(one.partyId), mark: (one) => partyMark(one.partyId) }}
            columns={[
              { name: "Claim", value: (one) => CLAIM.indexOf(one.state), cell: (one) => <Badge status={`claim:${one.state}`} /> },
              { name: "Interest", value: (one) => one.interests.join(" "), cell: (one) => formatList(one.interests) },
              { name: "Share type", value: (one) => one.shareType, cell: (one) => one.shareType },
              { name: "Share", as: "percent", value: (one) => one.share },
              { name: "Of", value: (one) => one.shareOf ?? "", cell: (one) => one.shareOf },
              { name: "Territory", value: (one) => one.territory.include.toString(), cell: (one) => <TerritoryChip set={one.territory} /> },
              { name: "From", as: "date", value: (one) => one.from },
              { name: "To", as: "date", value: (one) => one.to },
              { name: "Source", value: (one) => one.source, cell: (one) => formatMeta([one.source, one.sourceRef]) },
            ]}
            chooser={false}
          />
        </TitledCard>
      </Metadata>
    </DetailPage>
  );
}

/** Every acknowledgement file the society sent, with what it matched and what it opened. */
export function Acknowledgements() {
  const pending = ackPending();
  return (
    <CollectionPage
      title="Acknowledgements"
      actions={pending ? [send()] : []}
      more={pending ? undefined : [{ label: "Send acknowledgements", unavailable: "Every registration sent to you is acknowledged." }]}
      index={{
        rows: ackFiles(),
        rowKey: (one) => one.id,
        noun: { one: "file", many: "files" },
        identity: { title: "File", name: (one) => one.file, mark: (one) => <Avatar kind="document" name={one.file} /> },
        sort: { column: "Sent", direction: "descending" },
        columns: [
          { name: "Status", value: () => "Matched", cell: () => <Badge status="batch:Matched" /> },
          { name: "Works", value: (one) => one.works.length, cell: (one) => formatList(one.works.map((id) => assetById(id).title)) },
          { name: "Mismatches", as: "count", value: (one) => one.mismatches.length },
          {
            name: "Conflicts",
            value: (one) => one.conflicts.join(" "),
            cell: (one: AckFile) => formatList(one.conflicts.map((id) => formatMeta([id, CONFLICTS.find((each) => each.id === id)?.state ?? "Open"]) ?? id)),
          },
          { name: "Sent", as: "date", grain: "minute", value: (one) => one.sent },
        ],
        chooser: false,
      }}
    />
  );
}

export const SOCIETY_PAGES: Record<string, PartnerPage> = {
  registrations: ([id], working) => {
    const registration = id ? registrationOf(id) : undefined;
    if (!registration) return { place: { at: "Registrations", page: "Works" }, page: <Registrations working={working} /> };
    return {
      place: {
        at: "Registrations",
        page: "Works",
        trail: [
          { label: "Registrations", opens: partnerHref("registrations") },
          { label: "Works", opens: partnerHref("registrations") },
          { label: assetById(registration.workId).title },
        ],
      },
      page: <RegistrationDetail key={registration.workId} registration={registration} working={working} />,
    };
  },
  acknowledgements: () => ({ place: { at: "Registrations", page: "Acknowledgements" }, page: <Acknowledgements /> }),
};
