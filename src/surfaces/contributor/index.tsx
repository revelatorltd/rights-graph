import { AppShell, type ShellProduct } from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";

import { noticeCommand, noticePage, noticeSection } from "../notify/pages";
import { contributorSeat } from "../notify/seats";
import type { PageOf } from "../surface";
import { AccessLog } from "./access";
import { contributorHref } from "./address";
import { BatchPage } from "./batches";
import { ConflictPage } from "./conflicts";
import { AuditReports, Charter, SigningKeys } from "./governance";
import { FieldMapping } from "./mapping";
import { MatchResults } from "./matches";
import { CoveragePage, Overview } from "./overview";
import { Sharing } from "./sharing";
import { UploadFlow } from "./upload";
import { Arriving } from "../arriving";
import { UTILITIES, elsewhereFrom } from "../family";

/**
 * Sureel's contributor portal (S5) — one peer contributor's walled-off tenant: what it gave the
 * graph, what came back, and who read it. The tenant is Meridian Music Group, an invented stand-in
 * for a peer major. Said once: its destinations and the pages each holds.
 *
 * The workspace wears Fieldhouse's mark as a STAND-IN: the system ships no Sureel mark and no
 * white-label layer to carry Sureel's logo and accent (docs/gaps/s5-contributor.md, 1–2).
 */
const product = (): ShellProduct => ({
  workspace: { name: "Meridian Music Group", mark: ORGANIZATIONS.fieldhouse.art },
  utilities: UTILITIES,
  elsewhere: elsewhereFrom("contributor"),
  destinations: [
    {
      name: "Overview",
      mark: "home",
      opens: contributorHref("overview"),
      pages: [
        {
          pages: [
            { name: "Overview", opens: contributorHref("overview") },
            { name: "Coverage", opens: contributorHref("coverage") },
          ],
        },
      ],
    },
    {
      name: "Uploads",
      mark: "upload",
      opens: contributorHref("batches"),
      pages: [
        {
          pages: [
            { name: "Batches", opens: contributorHref("batches") },
            { name: "Field mapping", opens: contributorHref("mapping") },
          ],
        },
      ],
    },
    {
      name: "Matching",
      mark: "crosslink",
      opens: contributorHref("matches"),
      pages: [
        {
          pages: [
            { name: "Match results", opens: contributorHref("matches") },
            { name: "Conflicts", opens: contributorHref("conflicts") },
          ],
        },
      ],
    },
    {
      name: "Privacy",
      mark: "locker",
      opens: contributorHref("sharing"),
      pages: [
        {
          pages: [
            { name: "Sharing", opens: contributorHref("sharing") },
            { name: "Access log", opens: contributorHref("access") },
          ],
        },
      ],
    },
    {
      name: "Governance",
      mark: "trust",
      opens: contributorHref("charter"),
      pages: [
        {
          pages: [
            { name: "Charter", opens: contributorHref("charter") },
            { name: "Audit reports", opens: contributorHref("audits") },
            { name: "Signing keys", opens: contributorHref("keys") },
          ],
        },
      ],
    },
  ],
  user: {
    name: "Dana Whitfield",
    email: "dana.whitfield@meridianmusic.example",
    // Signing out leaves the portal, which this prototype does not model.
    commands: [[noticeCommand(contributorSeat)], [{ label: "Sign out", opens: () => {} }]],
  },
  // Notifications (S4-4, S7-8): a policy change, a conflict, a batch result — from the account menu.
  offRail: [noticeSection(contributorSeat)],
});

/** Every page of the portal, by its address segment. */
const PAGES: Record<string, PageOf> = {
  overview: () => ({ place: { at: "Overview", page: "Overview" }, page: <Overview /> }),
  coverage: () => ({ place: { at: "Overview", page: "Coverage" }, page: <CoveragePage /> }),
  batches: BatchPage,
  // The upload COVERS the shell; keyed by the batch it resubmits, so each opening begins afresh.
  upload: ([id]) => ({ cover: <UploadFlow key={id ?? "new"} resubmitting={id} /> }),
  mapping: () => ({ place: { at: "Uploads", page: "Field mapping" }, page: <FieldMapping /> }),
  matches: () => ({ place: { at: "Matching", page: "Match results" }, page: <MatchResults /> }),
  conflicts: ConflictPage,
  sharing: () => ({ place: { at: "Privacy", page: "Sharing" }, page: <Sharing /> }),
  access: () => ({ place: { at: "Privacy", page: "Access log" }, page: <AccessLog /> }),
  charter: () => ({ place: { at: "Governance", page: "Charter" }, page: <Charter /> }),
  audits: () => ({ place: { at: "Governance", page: "Audit reports" }, page: <AuditReports /> }),
  keys: () => ({ place: { at: "Governance", page: "Signing keys" }, page: <SigningKeys /> }),
  notifications: (rest) => noticePage(contributorSeat, rest),
};

/** `#/contributor/<page>/<id>/<facet>` */
export function ContributorPortal({ path }: { path: readonly string[] }) {
  const [page = "overview", ...rest] = path;
  const shown = (PAGES[page] ?? PAGES.overview!)(rest);
  if ("cover" in shown) return shown.cover;
  return (
    <AppShell product={product()} place={shown.place}>
      <Arriving>{shown.page}</Arriving>
    </AppShell>
  );
}
