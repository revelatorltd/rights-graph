import { Alert, Avatar, Chip, CollectionPage } from "@revelator/pro-ui";

import { access, channelOf, type Read } from "./data";

const CHANNELS = ["Graph API", "Sureel internal", "Audit request", "Contributor portal"] as const;

/**
 * Every read of the tenant's data (S5-6): who, when, through which API, and what. A read under an
 * audit request is called out by name — it is the one way Sureel reaches a private field, and the
 * line the contributor pitch rests on.
 */
export function AccessLog() {
  return (
    <CollectionPage
      title="Access log"
      more={[{ label: "Export" }]}
      index={{
        rows: access(),
        rowKey: (one) => `${one.at.getTime()}-${one.who}`,
        noun: { one: "read", many: "reads" },
        identity: {
          title: "Who",
          name: (one) => one.who,
          mark: (one) => <Avatar kind={/,|admin|auditor/.test(one.who) ? "person" : "organization"} name={one.who} />,
          // UNDER AUDIT ONLY rides on the name, so it is never a column a reader scrolls past.
          after: (one) => (one.audit ? <Chip>Under audit only</Chip> : null),
        },
        note: (
          <Alert intent="info" title="Every read appears here within an hour">
            Reads by partners and by the resolver touch your Shared fields only. A read marked under audit only is Sureel reaching a Private field inside a logged, time-boxed audit request — nothing else can.
          </Alert>
        ),
        sort: { column: "When", direction: "descending" },
        searchBy: ["Who", "Through", "What"],
        columns: [
          { name: "When", as: "date", grain: "minute", value: (one) => one.at },
          { name: "Through", value: (one) => one.via, cell: (one) => one.via },
          { name: "What", value: (one) => one.what, cell: (one) => one.what },
          { name: "Channel", value: (one) => channelOf(one), cell: (one) => channelOf(one), readings: ["All"] },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "Under audit only", holds: (one: Read) => Boolean(one.audit) },
          { name: "Graph API", holds: (one: Read) => channelOf(one) === "Graph API" },
          { name: "Sureel internal", holds: (one: Read) => channelOf(one) === "Sureel internal" },
        ],
        filters: [{ kind: "anyOf", key: "channel", label: "Channel", options: CHANNELS, of: (one) => channelOf(one) }],
        period: { reading: "records", at: (one) => one.at },
        empty: { none: "Nobody has read your data in this period." },
      }}
    />
  );
}
