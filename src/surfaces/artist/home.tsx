import {
  Alert,
  Badge,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  EmptyState,
  FacetCard,
  Slot,
  SlotItem,
  StatCard,
  StatCardRow,
  Text,
  TitledCard,
  WayOut,
} from "@revelator/pro-ui";

import { USES } from "../../graph/model";
import { clearanceOf } from "../../graph/resolve";
import { decidedBy, partyMark } from "../../rights/kit";
import type { Shown } from "../surface";
import {
  assetById,
  blockedBy,
  creditedAssets,
  creditsOf,
  grantById,
  inboxOf,
  isOpen,
  onBehalfOf,
  optOutOf,
  partyName,
  requestAbout,
  voiceAnswer,
  voicePartners,
  named,
  type Reader,
} from "./data";
import { assetMark, personMark } from "./marks";
import { artistHref, assetHref, requestHref } from "./place";
import { requestName } from "./requests";

/**
 * Home: what needs the artist, then where they stand. Drawn as the artist's own record at its
 * landing facet — the nearest declared form to a home (gaps) — so the figures that are simply true
 * now stand as peers, and each part of the app is a tile with its way in. Identity verification is
 * NOT here: it is under Profile (FRD mobile brief).
 */
function HomeBody({ reader }: { reader: Reader }) {
  const party = reader.subject.id;
  const open = inboxOf(party).filter(isOpen);
  // A credit to confirm that arrived with no request is still the artist's to answer.
  const unasked = creditsOf(party).filter((one) => one.state === "To confirm" && !(requestAbout(one.id) && isOpen(requestAbout(one.id)!)));
  const behalf = onBehalfOf(party);
  const notices = behalf.filter((one) => one.state === "Signed" || one.state === "Requested");
  const credits = creditsOf(party);
  const tracks = creditedAssets(party);
  const answers = tracks.flatMap((asset) => USES.map((use) => clearanceOf(asset.id, use, { country: "US" }).state));
  const optOut = optOutOf(party);
  const allowed = voicePartners().filter((one) => voiceAnswer(party, one.id)?.state === "Granted");
  const waiting = open.length + unasked.length + notices.length;

  return (
    <DetailPage
      record={{
        mark: personMark(reader.subject.name),
        name: reader.subject.name,
        kind: reader.subject.kind,
        facts: [
          { text: reader.persona === "Writer" ? "Writer mode" : "Kestrel Point Recordings" },
          // The delegate reads the artist's app: the band says who is acting.
          ...(reader.persona === "Delegate" ? [{ text: `You act as ${reader.actor.name}, for sync approvals` }] : []),
        ],
      }}
    >
      <DetailOverview>
        {/* F3 step 2 — the label decided for the artist: said where they land, until they look. */}
        {behalf.map((one) => {
          const grant = one.subject.kind === "Grant" ? grantById(one.subject.id) : undefined;
          return (
            <Alert
              key={one.id}
              intent={one.state === "Disputed" ? "info" : "warn"}
              title={`${partyName(one.attestor)} approved ${grant?.use ?? one.claim} for ${grant?.partners.ids.map(partyName).join(", ") ?? "a partner"} on ${named(reader).your} behalf`}
            >
              {`${decidedBy({ actor: partyName(one.attestor), onBehalfOf: reader.subject.name, authority: one.authority, at: one.issued })}. ${
                one.state === "Disputed" ? `${named(reader).you === "you" ? "You" : named(reader).you} disputed it; the grant is paused while Sureel reviews it.` : "Open Consent to view it or dispute it."
              }`}
            </Alert>
          );
        })}
        <StatCardRow>
          <StatCard name="Needs you" as="count" value={waiting} />
          <StatCard name="Credits to confirm" as="count" value={credits.filter((one) => one.state === "To confirm").length} />
          <StatCard name="Uses blocked by you" as="count" value={blockedBy(party).length} />
        </StatCardRow>
        <DetailOverviewGrid>
          <TitledCard title="Needs you" count={waiting} trail={<WayOut opens={artistHref("requests")} />}>
            {waiting ? (
              <Slot layout="list">
                {open.map((one) => (
                  <SlotItem key={one.id} opens={requestHref(one.id)} trail={<Badge status={`request:${one.state}`} />}>
                    {partyMark(one.from)}
                    <Text kind="title">{requestName(one)}</Text>
                  </SlotItem>
                ))}
                {unasked.map((one) => (
                  <SlotItem key={one.id} opens={assetHref(one.assetId)} trail={<Badge status={`credit:${one.state}`} />}>
                    {assetMark(assetById(one.assetId))}
                    <Text kind="title">{`Confirm ${one.role.toLowerCase()} — ${assetById(one.assetId).title}`}</Text>
                  </SlotItem>
                ))}
                {notices.map((one) => (
                  <SlotItem key={one.id} opens={artistHref("consent")} trail={<Badge status={`attestation:${one.state}`} />}>
                    {partyMark(one.attestor)}
                    <Text kind="title">{`${one.claim} signed for you by ${partyName(one.attestor)}`}</Text>
                  </SlotItem>
                ))}
              </Slot>
            ) : (
              <Slot layout="empty">
                <EmptyState title="Nothing needs you" detail="Credit confirmations and requests for your voice arrive here." />
              </Slot>
            )}
          </TitledCard>
          <FacetCard
            title="Credits"
            count={credits.length}
            opens={artistHref("credits")}
            figures={[
              { label: "To confirm", as: "count", value: credits.filter((one) => one.state === "To confirm").length },
              { label: "Confirmed", as: "count", value: credits.filter((one) => one.state === "Confirmed").length },
              { label: "Denied", as: "count", value: credits.filter((one) => one.state === "Denied").length },
            ]}
          />
          <FacetCard
            title="Consent"
            opens={artistHref("consent")}
            facts={[
              { label: "AI opt-out", value: optOut ? "On — every AI use of you is refused" : "Off" },
              { label: "Your voice allowed for", as: "list", value: allowed.map((one) => one.name) },
              {
                label: "Decided on your behalf",
                value: behalf.length ? <Badge status={`attestation:${behalf[0]!.state}`} /> : null,
              },
            ]}
          />
          <FacetCard
            title="Where you're cleared"
            count={tracks.length}
            opens={artistHref("cleared")}
            figures={[
              { label: "Uses allowed", as: "count", value: answers.filter((one) => one === "Granted").length },
              { label: "Not allowed", as: "count", value: answers.filter((one) => one === "Denied").length },
              { label: "Waiting on someone", as: "count", value: answers.filter((one) => one === "Needs review").length },
            ]}
          />
        </DetailOverviewGrid>
      </DetailOverview>
    </DetailPage>
  );
}

export const homePage = (reader: Reader): Shown => ({
  place: { at: "Home", page: "Home" },
  page: <HomeBody key={reader.persona} reader={reader} />,
});
