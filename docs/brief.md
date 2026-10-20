# Builder's brief — every surface

You are building ONE surface of the Rights Graph prototypes in `/Users/brunoguez/Documents/GitHub/rights-graph`
(Vite + React 19 + the Revelator Pro design system package `@revelator/pro-ui`). Several builders work
in this repo at the same time, each in its own folder. The user is asleep; work autonomously, make
sensible calls, and record them.

## Read first (in this order)

1. `/Users/brunoguez/Downloads/Rights Graph Surfaces — FRD.md` — your surface's section, the five
   G-rules, the cross-surface flows F1–F6 that touch your surface, roles & permissions, the design
   brief (rights patterns 1–8, states: default, empty, loading, error, permission-denied).
2. `/Users/brunoguez/Downloads/Rights Graph — Centralized Reframe & Data Model.md` — skim: the model,
   resolution rules, Confidence Ladder, worked example (Northbound).
3. `/Users/brunoguez/Documents/GitHub/revelator-pro-design-system.git/CLAUDE.md` — the system's rules.
   They hold here: pages are DECLARED forms; no hex/px/rem/classes of your own; values through
   `formatMoney`/`formatCount`/`formatPercent`/`formatDate`; states are `Badge status="family:State"`.
4. `CLAUDE.md` and `docs/reference-prototypes.md` in this repo (prior-art patterns from Revelator's
   own prototypes — reference only; the design system wins).
5. `src/graph/model.ts`, `src/graph/fixtures.ts`, `src/graph/resolve.ts`, `src/rights/kit.tsx`,
   `src/surfaces/surface.ts`, `src/route.ts`.
6. Worked examples of how pages are written against this system — READ THESE CLOSELY and imitate their
   idiom (comment density, naming, declared forms): `/Users/brunoguez/Documents/GitHub/rcc/src/accounts/`
   — `customers.tsx` (CollectionPage), `customer.tsx` and `tenant.tsx` (DetailPage with facets,
   FacetCard, FactCard, TitledCard, RecordIndex inside a facet, place/trail/RecordNav),
   `tenant-forms.tsx`, `sign-up-tenant.tsx`, `customer-form.tsx` (Wizard), `tenant-dialogs.tsx`,
   `add-contact.tsx` (FormDialog/dialogs), `../shell.tsx`, `../main.tsx`.
7. The API: `node_modules/@revelator/pro-ui/dist/index.d.ts` (grep it for a component's props), and the
   catalogue `/Users/brunoguez/Documents/GitHub/revelator-pro-design-system.git/system/system.json`
   (entries, `invented` = names that do NOT exist and what to use instead, `states` = every status
   family, `icons` = the 134 closed marks). Component source:
   `/Users/brunoguez/Documents/GitHub/revelator-pro-design-system.git/src/components/`. Guidance per
   component: `.../src/previews/guidance/<slug>.ts`.

Status families already added for rights (use them): `clearance` (Granted, Denied, Needs review),
`claim` (Resolved, Contested, No authority, Superseded, Withdrawn), `conflict` (Open, Awaiting
evidence, Resolved), `request` (Needs decision, Auto-cleared, Approved, Declined, Countered,
Escalated), `attestation` (Signed, Requested, Disputed, Revoked), `credit` (Confirmed, To confirm,
Denied), `grant` (Live, Paused, Revoked), `batch` (Received, Validating, Row errors, Ingesting,
Matched, Rejected), `match` (Matched, New, Conflicting, Unmatched, Suggested), `registration`
(Acknowledged, Sent, Rejected, Missing), `feed` (On time, Late, Failing), plus the existing
`verification` (Verified, Pending, Failing), `account`, `approval`, `contract`, `delivery`…

## Rules of the house

- **Own only your folder(s).** Never edit `src/graph/*`, `src/rights/kit.tsx`, `src/main.tsx`,
  `src/route.ts`, `src/surfaces/surface.ts`, `src/surfaces/pro/index.tsx`, or another builder's folder.
  If you need more fixture data, add it in a `data.ts` inside your folder (reading the shared graph by
  id). If you need a write the shared setters lack, write it in your folder against the exported
  arrays' setters, or note it in your gaps file. Use `useGraph()` so pages redraw after writes.
- **The graph answers; surfaces claim.** Never compute ownership or clearance in a page — call
  `clearanceOf`, `shareTotals`, `controllers`, `tierOf`, `worksOf` from `resolve.ts`. Every rights value
  shows source and tier (G-2), master and composition apart (G-3), territory and dates (G-4), who
  decided on whose behalf (G-5, `decidedBy()` in the kit). A user never edits "the owner": they add,
  correct (supersede) or withdraw their own claim (G-1).
- **Declared forms first**: `CollectionPage`, `DetailPage` (+ `DetailOverview`, `FacetCard`,
  `FactCard`, `TitledCard`, `RecordIndex`), `AnalyticsPage`/`StatCardRow`/`TrendCard`, `SettingsPage`/
  `SettingsForm`, `Wizard`, `FormDialog`, `ConfirmationDialog`, `StepDialog`, `ActivityPanel`, `Alert`,
  `EmptyState`, `Stepper`. Commands are declared (`actions`, `more`, `commands`, `opens`, `dialog`).
  Addresses are hrefs (`href(...)` from `src/route.ts`); never set `location` yourself.
- **When nothing in the system fits**, draw the nearest declared form and LOG the gap — never invent
  markup or classes. Write gaps to `docs/gaps/<your-surface>.md` as a table, like
  `/Users/brunoguez/Documents/GitHub/rcc/gaps.md`: `| # | Asked for | FRD ref | Here, until decided |`,
  plus a short "Decided here rather than asked" list. Be specific and honest — the gaps document is a
  primary deliverable.
- Fixtures are invented; keep names consistent with `fixtures.ts`.
- Cover the FRD's states where they are natural: empty (an index with nothing), permission-denied
  (e.g. a role that can't grant — declare the command `unavailable: "<why>"`), error (an Alert).
- **No git commands that change state** (no add/commit/stash/checkout) — the lead commits.

## Verify before you report

From `/Users/brunoguez/Documents/GitHub/rights-graph`: `npx tsc -b --noEmit` must be clean.
From `/Users/brunoguez/Documents/GitHub/revelator-pro-design-system.git`:
`npx tsx scripts/check-page.ts ../rights-graph/src/<your folder>` and
`npx tsx scripts/lint-stacks.ts ../rights-graph/src/<your folder>` must pass — fix every finding
(they read the system's own contract; a finding is usually a hand-written value or a page doing what
a declared form does). The dev server is already running at http://localhost:5190 (don't start
another). If you have a browser tool (Playwright MCP), open your pages there, click through every
command and flow, and fix runtime errors; otherwise at least ensure `npx vite build` succeeds.

## Report back

≤ 25 lines: the addresses of every page you built (e.g. `#/pro/rights/clearances`), which FRD
requirement IDs and flows each covers, what's deliberately not built, and the top gaps.
