import {
  Button,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  EmptyState,
  FacetCard,
  Slot,
  TitledCard,
} from "@revelator/pro-ui";

import { CONFLICTS, TODAY } from "../../graph/fixtures";
import { partyMark } from "../../rights/kit";
import {
  API_LOOKUPS_THIS_MONTH,
  ackFiles,
  applicationOf,
  asksOf,
  deliveriesOf,
  endpointsOf,
  keysOf,
  lookupsOf,
  registrations,
  standingOf,
  uploadsOf,
} from "./data";
import { partnerHref, type PartnerPage, type Working } from "./working";

const IN_FLIGHT = ["Needs decision", "Escalated", "Countered"];
const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

/**
 * Home — the partner's own organisation, as a record, landing on its recap: one tile per thing it
 * keeps here, each saying what it comes to and the way in (keys, requests in flight, this month's
 * look-ups, webhooks health). A partner Sureel has not approved yet has none of them: each tile is
 * the empty card that says why, and the band offers the application.
 */
export function Overview({ working }: { working: Working }) {
  const partner = working.partner;
  const standing = standingOf(partner.id);
  const applied = applicationOf(partner.id);
  const society = partner.kind === "Society";
  const invited = standing === "Invited";

  return (
    <DetailPage
      record={{
        mark: partyMark(partner.id),
        name: partner.name,
        status: `account:${standing}`,
        facts: [
          { text: partner.kind },
          { as: "date", value: partner.joined, label: invited ? "Invited" : "Joined" },
        ],
        actions: invited
          ? [{ label: applied?.submitted ? "Open application" : "Start onboarding", primary: true, opens: partnerHref("organisation", applied?.submitted ? undefined : "apply") }]
          : society
            ? [{ label: "Open registrations", opens: partnerHref("registrations") }]
            : [{ label: "Look up clearance", primary: true, opens: partnerHref("lookups") }],
      }}
    >
      <DetailOverview>
        <DetailOverviewGrid>
          {invited ? <Owed applied={Boolean(applied?.submitted)} /> : society ? <SocietyTiles working={working} /> : <LicenseeTiles working={working} />}
          <WebhookTile working={working} />
        </DetailOverviewGrid>
      </DetailOverview>
    </DetailPage>
  );
}

/** Before approval: what is owed, and the one way out of it. */
function Owed({ applied }: { applied: boolean }) {
  return (
    <>
      <TitledCard title="API keys">
        <Slot layout="empty">
          <EmptyState
            title={applied ? "Waiting on Sureel" : "No keys yet"}
            detail={
              applied
                ? "Your application is with Sureel. Sandbox and production keys are issued the moment it is approved."
                : "Sandbox and production keys are issued once Sureel approves your application."
            }
          >
            {applied ? null : (
              <Button asChild>
                <a href={partnerHref("organisation", "apply")}>Start onboarding</a>
              </Button>
            )}
          </EmptyState>
        </Slot>
      </TitledCard>
      <TitledCard title="Clearance look-ups">
        <Slot layout="empty">
          <EmptyState title="Nothing to look up yet" detail="Look-ups and licence requests open with your keys." />
        </Slot>
      </TitledCard>
    </>
  );
}

function LicenseeTiles({ working }: { working: Working }) {
  const id = working.partner.id;
  const keys = keysOf(id).filter((one) => !one.expires);
  const asks = asksOf(id);
  const inFlight = asks.filter((one) => one.requests.some((each) => IN_FLIGHT.includes(each.state)));
  const looked = lookupsOf(id);
  const used = keys.map((one) => one.lastUsed).filter((one): one is Date => Boolean(one));
  const uploads = uploadsOf(id);
  return (
    <>
      <FacetCard
        title="API keys"
        count={keys.length}
        opens={partnerHref("keys")}
        figures={[
          { label: "Sandbox", as: "count", value: keys.filter((one) => one.env === "Sandbox").length },
          { label: "Production", as: "count", value: keys.filter((one) => one.env === "Production").length },
          { label: "Last used", as: "date", value: used.length ? new Date(Math.max(...used.map((one) => one.getTime()))) : null },
        ]}
      />
      <FacetCard
        title="Licence requests"
        count={asks.length}
        opens={partnerHref("requests")}
        figures={[
          { label: "In flight", as: "count", value: inFlight.length },
          {
            label: "Waiting on a holder",
            as: "count",
            value: asks.flatMap((one) => one.requests).filter((one) => IN_FLIGHT.includes(one.state)).length,
          },
          {
            label: "Cleared by a holder",
            as: "count",
            value: asks.flatMap((one) => one.requests).filter((one) => one.state === "Approved" || one.state === "Auto-cleared").length,
          },
        ]}
      />
      <FacetCard
        title="Clearance look-ups"
        opens={partnerHref("lookups")}
        figures={[
          // Through the API as well as from here — the portal's own are what the index lists.
          { label: "This month", as: "count", value: (API_LOOKUPS_THIS_MONTH[id] ?? 0) + looked.filter((one) => one.asked.getMonth() === TODAY.getMonth()).length },
          { label: "Granted here", as: "count", value: looked.filter((one) => one.answer.state === "Granted").length },
          { label: "Needs review here", as: "count", value: looked.filter((one) => one.answer.state === "Needs review").length },
        ]}
      />
      <FacetCard
        title="Usage and provenance"
        count={uploads.length}
        opens={partnerHref("usage")}
        figures={[
          { label: "Rows matched", as: "count", value: uploads.flatMap((one) => one.rows).filter((one) => one.state === "Matched").length },
          { label: "Rows unmatched", as: "count", value: uploads.flatMap((one) => one.rows).filter((one) => one.state !== "Matched").length },
        ]}
      />
    </>
  );
}

function SocietyTiles({ working }: { working: Working }) {
  const keys = keysOf(working.partner.id).filter((one) => !one.expires);
  const all = registrations();
  const files = ackFiles();
  const works = new Set(all.map((one) => one.workId));
  const open = CONFLICTS.filter((one) => works.has(one.assetId) && one.state !== "Resolved" && one.territories.includes("DE"));
  return (
    <>
      <FacetCard
        title="Registrations"
        count={all.length}
        opens={partnerHref("registrations")}
        figures={[
          { label: "Acknowledged", as: "count", value: all.filter((one) => one.state === "Acknowledged").length },
          { label: "Sent", as: "count", value: all.filter((one) => one.state === "Sent").length },
          { label: "Rejected or missing", as: "count", value: all.filter((one) => one.state === "Rejected" || one.state === "Missing").length },
        ]}
      />
      <FacetCard
        title="Acknowledgements"
        count={files.length}
        opens={partnerHref("acknowledgements")}
        figures={[
          { label: "Last sent", as: "date", value: files[0]?.sent ?? null },
          { label: "Mismatches", as: "count", value: files.flatMap((one) => one.mismatches).length },
          { label: "Conflicts open in DE", as: "count", value: open.length },
        ]}
      />
      <FacetCard
        title="API keys"
        count={keys.length}
        opens={partnerHref("keys")}
        figures={[
          { label: "Production", as: "count", value: keys.filter((one) => one.env === "Production").length },
          { label: "Sandbox", as: "count", value: keys.filter((one) => one.env === "Sandbox").length },
        ]}
      />
    </>
  );
}

/** Webhooks health: what is subscribed, what was sent, and what took longer than the minute allowed. */
function WebhookTile({ working }: { working: Working }) {
  const endpoints = endpointsOf(working.partner.id);
  if (!endpoints.length)
    return (
      <TitledCard title="Webhooks">
        <Slot layout="empty">
          <EmptyState title="No endpoint yet" detail="Subscribe to clearance changes and paused or revoked licences.">
            <Button asChild>
              <a href={partnerHref("webhooks")}>Open webhooks</a>
            </Button>
          </EmptyState>
        </Slot>
      </TitledCard>
    );
  const recent = endpoints.flatMap((one) => deliveriesOf(one)).filter((one) => TODAY.getTime() - one.sent.getTime() <= DAYS_30);
  return (
    <FacetCard
      title="Webhooks"
      count={endpoints.length}
      opens={partnerHref("webhooks")}
      figures={[
        { label: "Enabled", as: "count", value: endpoints.filter((one) => one.state === "Enabled").length },
        { label: "Sent, last 30 days", as: "count", value: recent.length },
        { label: "Over 60 seconds", as: "count", value: recent.filter((one) => one.seconds > 60).length },
      ]}
    />
  );
}

export const OVERVIEW_PAGES: Record<string, PartnerPage> = {
  overview: (_rest, working) => ({ place: { at: "Home" }, page: <Overview working={working} /> }),
};
