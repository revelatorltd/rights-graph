import { Badge, CollectionPage } from "@revelator/pro-ui";

import { decidedBy } from "../../rights/kit";
import type { Shown } from "../surface";
import { eventsOf, type Event, type Reader } from "./data";
import { artistHref, assetHref, requestHref } from "./place";

const KINDS: readonly Event["kind"][] = ["Request", "Attestation", "Blocked use", "Consent", "Conflict"];

/**
 * Activity (S3-7): every event involving the artist — requests in and out, attestations signed
 * by them or for them, uses blocked, consents given, conflicts opened — newest first. Each row
 * says who acted, on whose behalf, under what (G-5), and opens where the event can be acted on.
 */
function ActivityIndex({ reader }: { reader: Reader }) {
  const events = eventsOf(reader.subject.id, { request: requestHref, track: (id) => assetHref(id), consent: artistHref("consent") });
  return (
    <CollectionPage
      title="Activity"
      index={{
        rows: events,
        rowKey: (one) => one.id,
        noun: { one: "event", many: "events" },
        identity: { title: "Event", name: (one) => one.title, opens: (one) => one.opens ?? artistHref("activity") },
        sort: { column: "When", direction: "descending" },
        columns: [
          { name: "When", as: "date", grain: "minute", value: (one) => one.at },
          { name: "Kind", value: (one) => KINDS.indexOf(one.kind), cell: (one) => one.kind, readings: ["All"] },
          { name: "Status", value: (one) => one.status, cell: (one) => <Badge status={one.status} /> },
          { name: "Decided by", value: (one) => decidedBy(one.decided), cell: (one) => decidedBy(one.decided) },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "Requests", holds: (one) => one.kind === "Request" },
          { name: "Attestations", holds: (one) => one.kind === "Attestation" },
          { name: "Blocked uses", holds: (one) => one.kind === "Blocked use" },
        ],
        empty: { none: "Nothing has happened that involves you yet." },
      }}
    />
  );
}

export const activityPage = (reader: Reader): Shown => ({
  place: { at: "Activity" },
  page: <ActivityIndex key={reader.persona} reader={reader} />,
});
