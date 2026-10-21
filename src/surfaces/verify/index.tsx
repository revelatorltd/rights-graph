import { AppShell, type ShellPlace, type ShellProduct } from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";
import type { ReactNode } from "react";

import { href } from "../../route";
import { archivedBy, verify } from "./data";
import { Archive, ArchivedDetail, Batches, EventDetail, Keys, NotFound, verifyHref } from "./pages";
import { Arriving } from "../arriving";
import { MAP, elsewhereFrom } from "../family";

/**
 * The Verification portal (S8) — Sureel's, public, no account: paste a receipt or an event ID and
 * see that it is intact, when it was recorded and who signed it; download the bundle and check it
 * offline; read the old on-chain registry as an archive. It replaces registry.original.works.
 *
 * The shell has no signed-out state, so the account is a visitor's and offers the one way into an
 * account this product has — the Partner portal (docs/gaps/s8-verify.md). The system ships no
 * Sureel mark: Fieldhouse's stands in for it.
 */
const PRODUCT: ShellProduct = {
  workspace: { name: "Sureel Verify", mark: ORGANIZATIONS.fieldhouse.art },
  utilities: [MAP],
  elsewhere: elsewhereFrom("verify"),
  destinations: [
    {
      name: "Verify",
      mark: "verified",
      opens: verifyHref(),
      pages: [
        {
          pages: [
            { name: "Proof batches", opens: verifyHref() },
            { name: "Signing keys", opens: verifyHref("keys") },
            { name: "Registry archive", opens: verifyHref("archive") },
          ],
        },
      ],
    },
  ],
  user: {
    name: "Visitor",
    email: "No account needed to verify",
    commands: [[{ label: "Open the Partner portal", opens: href("partner") }]],
  },
};

const read = (segment: string | undefined) => {
  try {
    return decodeURIComponent(segment ?? "");
  } catch {
    return segment ?? "";
  }
};

function shown(path: readonly string[]): { place: ShellPlace; page: ReactNode } {
  const [first, second] = path;
  if (!first || first === "batches") return { place: { at: "Verify", page: "Proof batches" }, page: <Batches /> };
  if (first === "keys") return { place: { at: "Verify", page: "Signing keys" }, page: <Keys /> };
  if (first === "archive") {
    if (!second) return { place: { at: "Verify", page: "Registry archive" }, page: <Archive /> };
    const asked = read(second);
    const record = archivedBy(asked);
    return {
      place: {
        at: "Verify",
        page: "Registry archive",
        trail: [
          { label: "Verify", opens: verifyHref() },
          { label: "Registry archive", opens: verifyHref("archive") },
          { label: record?.owUri ?? asked },
        ],
      },
      page: record ? <ArchivedDetail key={record.owUri} record={record} /> : <NotFound key={asked} asked={asked} archiveOnly />,
    };
  }
  const asked = read(first);
  const event = verify(asked);
  return {
    place: { at: "Verify", trail: [{ label: "Verify", opens: verifyHref() }, { label: event?.receipt ?? (event ? `Event ${event.seq}` : asked) }] },
    page: event ? <EventDetail key={event.seq} event={event} /> : <NotFound key={asked} asked={asked} />,
  };
}

/** `#/verify/<receiptOrEvent>`, `#/verify/keys`, `#/verify/archive/<owAssetUri>` */
export function VerificationPortal({ path }: { path: readonly string[] }) {
  const { place, page } = shown(path);
  return (
    <AppShell product={PRODUCT} place={place}>
      <Arriving>{page}</Arriving>
    </AppShell>
  );
}
