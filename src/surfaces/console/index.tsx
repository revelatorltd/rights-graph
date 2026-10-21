import { Fragment } from "react";
import { AppShell, type ShellProduct } from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";

import { useShellPersona, type Shown } from "../surface";
import { AssetsPage, AssetPage, ClaimPage } from "./assets";
import { ClaimantsPage } from "./claimants";
import { ConflictPage } from "./conflict";
import { ConflictsPage } from "./conflicts";
import { CoveragePage } from "./coverage";
import { BatchesPage, HealthPage } from "./health";
import { MatchesPage, MatchReviewPage, MergePage, MergesPage } from "./matching";
import { ProofPage } from "./proof";
import { RulePage, RulesPage } from "./rules";
import { TenantPage, TenantsPage } from "./tenants";
import { TrafficPage } from "./traffic";
import { noticeCommand, noticePage, noticeSection } from "../notify/pages";
import { consoleSeat } from "../notify/seats";
import { IdentityClaimsPage } from "../artist/claim-review";
import { OPS_ONLY, PERSONAS, SIGNED_IN, consoleHref, type ConsolePage, type Persona } from "./where";

/**
 * The Sureel Graph Console (S7) — where the graph is run. Imitates RCC, Revelator's own ops console:
 * one product said once, destinations by the work done there, each record reached from its index.
 *
 * The workspace wears Fieldhouse's mark as a STAND-IN: the system ships no Sureel mark and no
 * white-label tokens yet (docs/gaps/s7-console.md).
 */
function productFor(persona: Persona): ShellProduct {
  const user = SIGNED_IN[persona];
  return {
    workspace: { name: "Sureel Graph Console", mark: ORGANIZATIONS.fieldhouse.art },
    personas: PERSONAS,
    destinations: [
      {
        name: "Ingestion",
        mark: "import",
        opens: consoleHref("health"),
        pages: [
          {
            pages: [
              { name: "Health", opens: consoleHref("health") },
              { name: "Batches", opens: consoleHref("batches") },
            ],
          },
        ],
      },
      {
        name: "Resolution",
        mark: "rights",
        opens: consoleHref("conflicts"),
        pages: [
          {
            pages: [
              { name: "Conflicts", opens: consoleHref("conflicts") },
              { name: "Assets", opens: consoleHref("assets") },
              { name: "False claims", opens: consoleHref("claimants") },
            ],
          },
        ],
      },
      {
        name: "Matching",
        mark: "crosslink",
        opens: consoleHref("matches"),
        pages: [
          {
            pages: [
              { name: "Suggested matches", opens: consoleHref("matches") },
              { name: "ArtistID claims", opens: consoleHref("identity") },
              { name: "Merges", opens: consoleHref("merges") },
            ],
          },
        ],
      },
      { name: "Coverage", mark: "chart", opens: consoleHref("coverage") },
      { name: "Rules", mark: "settings", opens: consoleHref("rules") },
      { name: "Tenants", mark: "vault", opens: consoleHref("tenants") },
      { name: "Proof log", mark: "verified", opens: consoleHref("proof") },
      { name: "S9 traffic", mark: "code", opens: consoleHref("traffic") },
    ],
    // Notifications (S4-4, S4-5): ops' own, every message sent, and the escalation clock.
    offRail: [noticeSection(consoleSeat(persona))],
    user: { name: user.name, email: user.email, commands: [[noticeCommand(consoleSeat(persona))], [{ label: "Sign out", opens: () => {} }]] },
  };
}

/**
 * Each page by its address, given the segments after it — `[id, facet]` — and who is reading.
 * A page says where it is and what it holds; none of them calls a hook here, so the frame's own
 * stay in one order whichever page is open.
 */
const PAGES: Record<ConsolePage, (rest: readonly string[], persona: Persona) => Shown> = {
  health: (_, persona) => HealthPage(persona),
  batches: () => BatchesPage(),
  conflicts: ([id, facet], persona) => (id ? ConflictPage(id, facet, persona) : ConflictsPage()),
  assets: ([id, facet]) => (id ? AssetPage(id, facet) : AssetsPage()),
  claims: ([id]) => ClaimPage(id ?? ""),
  claimants: (_, persona) => ClaimantsPage(persona),
  matches: ([id], persona) => (id ? MatchReviewPage(id, persona) : MatchesPage()),
  // S3-2's Sureel path: profile claims a person sent to Sureel from the artist app.
  identity: (_, persona) =>
    IdentityClaimsPage({ actor: SIGNED_IN[persona].name, for: "Sureel Rights Ops", unavailable: persona === "Rights ops" ? undefined : OPS_ONLY }),
  merges: ([id, facet], persona) => (id ? MergePage(id, facet, persona) : MergesPage()),
  coverage: () => CoveragePage(),
  rules: ([id, facet], persona) => (id ? RulePage(id, facet, persona) : RulesPage()),
  tenants: ([id, facet], persona) => (id ? TenantPage(id, facet, persona) : TenantsPage()),
  proof: () => ProofPage(),
  traffic: () => TrafficPage(),
  notifications: (rest, persona) => noticePage(consoleSeat(persona), rest),
};

/** `#/console/<page>/<id>/<facet>` — the home view is ingestion health (S7-1). */
export function GraphConsole({ path }: { path: readonly string[] }) {
  const [persona, follow] = useShellPersona(PERSONAS, "Rights ops");
  const [page = "health", ...rest] = path;
  const found = PAGES[page as ConsolePage] ?? PAGES.health;
  const shown = found(rest, persona);
  if ("cover" in shown) return shown.cover;
  return (
    <AppShell product={productFor(persona)} place={shown.place}>
      {follow}
      {/* KEYED by the whole address, so a second index opens fresh rather than inheriting the
          first one's filters, reading and sort. */}
      <Fragment key={[page, ...rest].join("/")}>{shown.page}</Fragment>
    </AppShell>
  );
}
