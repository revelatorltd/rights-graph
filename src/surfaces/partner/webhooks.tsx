import {
  Avatar,
  Badge,
  CollectionPage,
  ConfirmationDialog,
  DetailPage,
  Field,
  FormDialog,
  RecordIndex,
  formatList,
  owed,
  type HeldBy,
} from "@revelator/pro-ui";

import { go } from "../../route";
import { EVENTS, addEndpoint, deliveriesOf, endpointById, endpointsOf, sendTest, setEndpointState, standingOf, type Endpoint } from "./data";
import { partnerHref, type PartnerPage, type Working } from "./working";

const WHAT: Record<string, string> = {
  "clearance.changed": "An answer you were given changed — a grant was made, paused or revoked on an asset you looked up.",
  "licence.paused": "A licence you hold is paused by an open dispute. Stop new uses until it resumes.",
  "licence.revoked": "A licence you hold was revoked. Stop using it.",
};

/** An endpoint subscribed: an address, and the events it is sent. */
export function AddEndpoint({ working, ...held }: HeldBy & { working: Working }) {
  return (
    <FormDialog
      {...held}
      confirm="Add"
      draft={{ url: owed.url, events: owed(EVENTS as readonly string[]) }}
      onCommit={(draft) => go(partnerHref("webhooks", addEndpoint(working.partner.id, draft.url.trim(), draft.events)))}
    >
      <Field as="url" name="url" label="Endpoint" help="An HTTPS address that answers 2xx within 10 seconds. Every payload is signed with your webhook secret." />
      <Field as="choices" name="events" label="Events" options={EVENTS.map((one) => ({ value: one, title: one }))} />
    </FormDialog>
  );
}

/** Switched off — asked first: a paused or revoked licence would no longer reach the partner. */
export function DisableEndpoint({ endpoint, ...held }: HeldBy & { endpoint: Endpoint }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`${endpoint.url} stops receiving ${formatList(endpoint.events)}. A paused or revoked licence will only show here and in your inbox.`}
      confirm="Disable"
      destructive
      onCommit={() => setEndpointState(endpoint.id, "Disabled")}
    />
  );
}

const endpointCommands = (one: Endpoint) => [
  { label: "Open", opens: partnerHref("webhooks", one.id) },
  { label: "Send test event", opens: () => sendTest(one) },
  one.state === "Enabled"
    ? { label: "Disable endpoint", destructive: true, dialog: <DisableEndpoint endpoint={one} /> }
    : { label: "Enable endpoint", mark: "check" as const, opens: () => setEndpointState(one.id, "Enabled") },
];

/** The partner's endpoints (S6-7): what each is sent, and whether the last deliveries arrived inside the minute. */
export function Webhooks({ working }: { working: Working }) {
  const approved = standingOf(working.partner.id) === "Active";
  return (
    <CollectionPage
      title="Webhooks"
      actions={approved ? [{ label: "Add endpoint", primary: true, creates: true, dialog: <AddEndpoint working={working} /> }] : []}
      more={approved ? undefined : [{ label: "Add endpoint", unavailable: "Webhooks open once Sureel approves your application." }]}
      index={{
        rows: endpointsOf(working.partner.id),
        rowKey: (one) => one.id,
        noun: { one: "endpoint", many: "endpoints" },
        identity: { title: "Endpoint", name: (one) => one.url, as: "reference", opens: (one) => partnerHref("webhooks", one.id) },
        columns: [
          { name: "Status", value: (one) => one.state, cell: (one) => <Badge status={`feature:${one.state}`} /> },
          { name: "Events", value: (one) => one.events.join(" "), cell: (one) => formatList(one.events) },
          { name: "Sent", as: "count", value: (one) => deliveriesOf(one).length },
          { name: "Last sent", as: "date", grain: "minute", value: (one) => deliveriesOf(one)[0]?.sent },
          { name: "Over 60 seconds", as: "count", value: (one) => deliveriesOf(one).filter((each) => each.seconds > 60).length },
        ],
        commands: endpointCommands,
        empty: { none: approved ? "No endpoint yet. Add one to hear of clearance changes and paused or revoked licences within a minute." : "Webhooks open once Sureel approves your application." },
        chooser: false,
      }}
    />
  );
}

/** One endpoint and everything it was sent, newest first — each with how long it took to arrive. */
export function EndpointDetail({ endpoint }: { endpoint: Endpoint }) {
  const deliveries = deliveriesOf(endpoint);
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="document" name={endpoint.url} />,
        name: endpoint.url,
        status: `feature:${endpoint.state}`,
        facts: [{ as: "count", value: endpoint.events.length, noun: { one: "event", many: "events" } }, { as: "date", value: endpoint.created, label: "Added" }],
        actions: [{ label: "Send test event", opens: () => sendTest(endpoint) }],
        more: endpointCommands(endpoint).slice(2),
      }}
    >
      <RecordIndex
        rows={deliveries}
        rowKey={(one) => one.id}
        noun={{ one: "delivery", many: "deliveries" }}
        identity={{ title: "Event", name: (one) => one.event, as: "reference" }}
        sort={{ column: "Sent", direction: "descending" }}
        columns={[
          { name: "About", value: (one) => one.about, cell: (one) => one.about },
          { name: "Subject", as: "identifier", standard: "id", value: (one) => one.subject },
          { name: "Sent", as: "date", grain: "minute", value: (one) => one.sent },
          // The FRD's limit is a minute from the graph event to the partner (S6-7).
          { name: "Arrived after", as: "duration", value: (one) => one.seconds },
          { name: "Response", value: (one) => one.response, cell: (one) => one.response },
          { name: "Means", value: (one) => one.event, cell: (one) => WHAT[one.event] ?? "", hidden: true },
        ]}
        readings={[{ name: "All", holds: () => true }, ...endpoint.events.map((event) => ({ name: event, holds: (one: { event: string }) => one.event === event }))]}
        empty={{ none: "Nothing sent yet. Send a test event to check the endpoint answers." }}
        chooser={false}
      />
    </DetailPage>
  );
}

export const WEBHOOK_PAGES: Record<string, PartnerPage> = {
  webhooks: ([id], working) => {
    const endpoint = id ? endpointById(id) : undefined;
    if (!endpoint || endpoint.partner !== working.partner.id) return { place: { at: "Developers", page: "Webhooks" }, page: <Webhooks working={working} /> };
    return {
      place: {
        at: "Developers",
        page: "Webhooks",
        trail: [
          { label: "Developers", opens: partnerHref("keys") },
          { label: "Webhooks", opens: partnerHref("webhooks") },
          { label: endpoint.url },
        ],
      },
      page: <EndpointDetail key={endpoint.id} endpoint={endpoint} />,
    };
  },
};
