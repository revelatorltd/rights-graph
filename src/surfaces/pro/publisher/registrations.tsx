import { Alert, Avatar, Badge, CollectionPage, ConfirmationDialog, formatList, type HeldBy } from "@revelator/pro-ui";

import { FEEDS, assetById } from "../../../graph/fixtures";
import { useGraph } from "../../../graph/resolve";
import { flagRegistrations, generateCwr, nextCwrFile, registrations, rightsHref, type Registration } from "./data";

const STATES: readonly Registration["state"][] = ["Missing", "Rejected", "Sent", "Acknowledged"];
const SOCIETIES = ["PRS for Music", "GEMA", "SACEM", "ASCAP"];

/** The next CWR file, written from every registration flagged for it — asked first, because it goes to the societies. */
function GenerateCwr({ flagged, ...held }: HeldBy & { flagged: readonly Registration[] }) {
  const societies = formatList([...new Set(flagged.map((one) => one.society))]);
  return (
    <ConfirmationDialog
      {...held}
      of={{ count: flagged.length, noun: { one: "registration", many: "registrations" } }}
      asks={`${nextCwrFile()} is written for ${societies} and sent. Each registration in it stands as Sent until the society acknowledges it.`}
      confirm="Generate"
      onCommit={() => generateCwr()}
    />
  );
}

/**
 * Where Harbor's works are registered, work by work and society by society (S2-4) — sent,
 * acknowledged, rejected, or missing where the work earns in a society's territory and was never
 * registered there. A missing registration is flagged for the next CWR file; the file is generated
 * from every flagged one at once.
 *
 * A COLLECTION PAGE whose readings are the states, and whose one action writes the file.
 */
export function Registrations() {
  useGraph();
  const rows = registrations();
  const flagged = rows.filter((one) => one.flagged);
  const gema = FEEDS.find((one) => one.name.startsWith("GEMA"));
  return (
    <CollectionPage
      title="Registrations"
      // Only while something is flagged: a page action cannot say why it is unavailable (gaps), so
      // with nothing to send the command is not offered rather than offered inert.
      actions={flagged.length ? [{ label: "Generate CWR", primary: true, mark: "export", count: flagged.length, dialog: <GenerateCwr flagged={flagged} /> }] : []}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "registration", many: "registrations" },
        identity: {
          title: "Work",
          name: (one) => assetById(one.workId).title,
          mark: (one) => <Avatar kind="work" name={assetById(one.workId).title} />,
          opens: (one) => rightsHref("works", one.workId, "registrations"),
        },
        searchBy: ["Work", "File"],
        // The ERROR the page would otherwise hide: a society's acknowledgements feed is failing, so
        // a registration still Sent there may already have been acknowledged.
        note:
          gema?.state === "Failing" ? (
            <Alert intent="danger" title="GEMA acknowledgements are not arriving">
              The GEMA CWR acknowledgement feed is failing. A registration still Sent to GEMA may already be acknowledged; nothing here changes until the feed recovers.
            </Alert>
          ) : undefined,
        columns: [
          {
            name: "Society",
            value: (one) => one.society,
            cell: (one) => one.society,
          },
          {
            name: "State",
            value: (one) => STATES.indexOf(one.state),
            cell: (one) => <Badge status={`registration:${one.state}`} />,
            readings: ["All"],
          },
          { name: "Next CWR", value: (one) => (one.flagged ? 1 : 0), cell: (one) => (one.flagged ? "Included" : null) },
          { name: "File", value: (one) => one.file ?? "", cell: (one) => one.file },
          { name: "Sent", as: "date", value: (one) => one.sent },
          { name: "Acknowledged", as: "date", value: (one) => one.acknowledged },
          { name: "Work number", value: (one) => one.workNumber ?? "", cell: (one) => one.workNumber },
          { name: "Note", value: (one) => one.reason ?? "", cell: (one) => one.reason },
        ],
        readings: [
          { name: "All", holds: () => true },
          ...STATES.map((state) => ({ name: state, holds: (one: Registration) => one.state === state })),
        ],
        filters: [
          { kind: "anyOf", key: "society", label: "Society", options: SOCIETIES, entity: "organization", of: (one) => one.society },
          { kind: "switches", key: "next", label: "Next CWR", switches: [{ key: "flagged", label: "In the next CWR", holds: (one) => one.flagged }] },
        ],
        totals: [{ count: true }, { name: "In the next CWR", count: (one) => one.flagged }],
        holdable: (one) => one.state === "Missing" || one.state === "Rejected",
        selection: (held) => [
          { label: "Include in next CWR", opens: () => flagRegistrations(held.map((one) => one.id), true) },
          { label: "Leave out of next CWR", opens: () => flagRegistrations(held.map((one) => one.id), false) },
        ],
        commands: (one) => [
          { label: "Open work", opens: rightsHref("works", one.workId, "registrations") },
          one.state === "Acknowledged" || one.state === "Sent"
            ? { label: "Include in next CWR", unavailable: one.state === "Sent" ? "Sent already; waiting on the society's acknowledgement." : "Acknowledged: nothing to send." }
            : one.flagged
              ? { label: "Leave out of next CWR", opens: () => flagRegistrations([one.id], false) }
              : { label: "Include in next CWR", opens: () => flagRegistrations([one.id], true) },
        ],
        empty: { holder: "Harbor Music" },
      }}
    />
  );
}
