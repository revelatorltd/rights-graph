import { Avatar, CollectionPage, ConfirmationDialog, formatList, type HeldBy } from "@revelator/pro-ui";

import { ClearanceBadge } from "../../rights/kit";
import { TEST_CATALOGUE, keysOf, rotateKey, standingOf, type Key } from "./data";
import { downloadCsv } from "../../rights/files";
import { type PartnerPage, type Working } from "./working";

const DOCS = "https://docs.sureel.example";

/**
 * A key rotated — asked first, because whatever still calls with the old key stops a day later.
 * A new key takes its place at once with the same scopes, so a deploy can move over without a gap.
 */
export function RotateKey({ apiKey, ...held }: HeldBy & { apiKey: Key }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`A new ${apiKey.env.toLowerCase()} key replaces ${apiKey.id} with the same scopes. ${apiKey.id} keeps working for 24 hours, then stops.`}
      confirm="Rotate"
      onCommit={() => rotateKey(apiKey.id)}
    />
  );
}

/**
 * The partner's keys (S6-2): one per environment, each with the scopes it carries and when it was
 * last used. The secret itself is shown once, when the key is issued — never here.
 */
export function Keys({ working }: { working: Working }) {
  const approved = standingOf(working.partner.id) === "Active";
  return (
    <CollectionPage
      title="API keys"
      actions={[{ label: "Open the API reference", opens: DOCS }]}
      more={[{ label: "Create key", unavailable: approved ? "Each environment holds one key: rotate it to replace it." : "Keys are issued once Sureel approves your application." }]}
      index={{
        rows: keysOf(working.partner.id),
        rowKey: (one) => one.id,
        noun: { one: "key", many: "keys" },
        identity: { title: "Key", name: (one) => one.id, as: "reference" },
        sort: { column: "Created", direction: "descending" },
        columns: [
          { name: "Environment", value: (one) => one.env, cell: (one) => one.env },
          { name: "Scopes", value: (one) => one.scopes.join(" "), cell: (one) => formatList(one.scopes) },
          { name: "Created", as: "date", value: (one) => one.created },
          { name: "Last used", as: "date", value: (one) => one.lastUsed },
          { name: "Stops working", as: "date", value: (one) => one.expires },
          { name: "Replaced by", as: "identifier", standard: "id", value: (one) => one.replacedBy },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "Sandbox", holds: (one) => one.env === "Sandbox" },
          { name: "Production", holds: (one) => one.env === "Production" },
        ],
        commands: (one) => [
          one.expires
            ? { label: "Rotate key", mark: "refresh", unavailable: `Already rotated: ${one.replacedBy} replaces it.` }
            : { label: "Rotate key", mark: "refresh", dialog: <RotateKey apiKey={one} /> },
        ],
        empty: { none: approved ? "No key issued." : "Sandbox and production keys are issued once Sureel approves your application." },
        chooser: false,
      }}
    />
  );
}

/**
 * The sandbox's test catalogue (S6-2): fixed codes, each returning one outcome every time, so an
 * integration can be tested against every answer before it calls production. Sandbox answers are
 * the sandbox's, never the graph's.
 */
export function Sandbox({ working }: { working: Working }) {
  const sandbox = keysOf(working.partner.id).find((one) => one.env === "Sandbox" && !one.expires);
  return (
    <CollectionPage
      title="Sandbox"
      actions={[
        { label: "Open the API reference", opens: `${DOCS}/sandbox` },
        {
          label: "Download test catalogue",
          opens: () =>
            downloadCsv(
              "sureel-sandbox-catalogue.csv",
              (["isrc", "iswc", "title", "use", "master", "composition", "answer"] as const).map((key) => ({ name: key, value: (one: (typeof TEST_CATALOGUE)[number]) => one[key] })),
              TEST_CATALOGUE,
            ),
        },
      ]}
      index={{
        rows: TEST_CATALOGUE,
        rowKey: (one) => one.isrc,
        noun: { one: "test asset", many: "test assets" },
        note: sandbox
          ? `Call the Clearance API with ${sandbox.id}: every code below answers the same way every time, with a test receipt.`
          : "A sandbox key is issued once Sureel approves your application.",
        identity: { title: "Test asset", name: (one) => one.title, mark: (one) => <Avatar kind="work" name={one.title} /> },
        columns: [
          { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => one.isrc },
          { name: "ISWC", as: "identifier", standard: "iswc", value: (one) => one.iswc },
          { name: "Use", value: (one) => one.use, cell: (one) => one.use },
          { name: "Master", value: (one) => one.master, cell: (one) => <ClearanceBadge state={one.master} /> },
          { name: "Composition", value: (one) => one.composition, cell: (one) => <ClearanceBadge state={one.composition} /> },
          { name: "Answer", value: (one) => one.answer, cell: (one) => <ClearanceBadge state={one.answer} /> },
          { name: "What it tests", value: (one) => one.proves, cell: (one) => one.proves },
        ],
        chooser: false,
      }}
    />
  );
}

export const KEYS_PAGES: Record<string, PartnerPage> = {
  keys: (_rest, working) => ({ place: { at: "Developers", page: "API keys" }, page: <Keys working={working} /> }),
  sandbox: (_rest, working) => ({ place: { at: "Developers", page: "Sandbox" }, page: <Sandbox working={working} /> }),
};
