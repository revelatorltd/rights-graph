# Gaps — what the Rights Graph surfaces asked of the design system

Every surface was built from the Revelator Pro design system (`../revelator-pro-design-system.git`)
with declared forms only. Where nothing in the system fit, the page drew the nearest declared form
and the gap was logged — 245 rows across nine files in `docs/gaps/`, readable as one index at
`#/home/gaps`. This page is the synthesis: the same need, met again and again by different
surfaces, filed as ONE decision for the system to take. Ranked by how many surfaces hit it and
whether the FRD's first 90 days need it.

How to read a row: **Hit by** names the surfaces that logged it (S1 label · S1·T catalog/track
rights · S2 publisher · S3 artist · S5 contributor · S6 partner · S7 console · S8 verify). **Here,
until decided** is what the screens do today. **Proposed** is a decision for the system, written as
the gate in the system's CLAUDE.md asks: a name, a place, an anatomy, the rules.

Decided in the system since: **`ShellProduct.elsewhere`** — the other products a prototype family
is seen beside, listed under the product's own personas in the shell's View As control, each view
an address it leaves for (`src/components/layouts/shell.tsx`). Every surface here passes the other
eight, and the map as a rail utility. Also the `batch` family's Validating and Ingesting, which
were drawn alike, now carry marks of their own.

Also decided since, for the rail and the docs: a rail destination with pages and no address of
its own is a **menu** of them (the map's pages, on every surface); the **`book`** mark (136 marks
now, its meaning recorded); and `RecordIndex`'s `grid.first`, a set that **opens as tiles** with the
table a press away. Still asked: a tile for a record that has a MARK rather than a picture — a doc,
a playbook — which draws the frame's image placeholder today (docs/gaps/docs.md).

Already decided in the system tonight: **eleven rights status families** in `src/lib/statuses.ts`
— `clearance`, `claim`, `conflict`, `request`, `attestation`, `credit`, `grant`, `batch`, `match`,
`registration`, `feed`. Tests and typecheck pass; not committed (the system's `src/` has no commit
yet).

---

## A. Rights patterns — the eight the FRD asks to "design once" (all Must)

| # | Pattern (FRD) | Hit by | Here, until decided | Proposed |
| - | ------------- | ------ | ------------------- | -------- |
| A1 | **Claim row** — party, interest, share, territory chip, dates, source, tier, expands to evidence and history | S1·T, S2, S7, S5 | a `RecordIndex` row per claim with a `claim:*` badge; the row opens a side panel with evidence and the supersedes chain; at 1024 px the meta line is cut | `ClaimRow` pattern (level: pattern, group: records). Anatomy: lead = party mark; title = party + interest; facts = share · territory chip · dates · source; trail = tier chip + claim badge; expands to evidence + history. Rule: share and territory never omitted (G-2, G-4). |
| A2 | **Two-sided rights panel** — master left, composition right, never merged | S1·T, S2, S6, S7 | a two-column `CardGrid` of `TitledCard`s, each a resolved reading over its claim rows | `RightsSides` pattern: exactly two regions, `master` and `composition`, each `{ resolved, claims }`; on a phone stacked, master first. Constraint: forbids a combined percentage (G-3). |
| A3 | **Clearance matrix** — uses down, scope across, each cell the answer and the scope that decided it | S1, S1·T, S2, S6 | a `RecordIndex` with one column per use (assets down) or per scope (uses down); the cell is a `clearance:*` badge, its reason on hover; partner and territory set in the address | `ClearanceMatrix` pattern: rows = uses (closed set), columns = scopes (closed set), cell = `{ answer, decidedAt, reason }`. The QUESTION (partner, territory, date) is the matrix's own header, not a filter — every cell answers it. |
| A4 | **Territory chip** — "World excl. US, CA", ISO codes a hover away | S1·T, S2, S6 | a `Chip` holding an `Explained` (hover lists the codes) | Chip `content="territory"` that owns its hint, as `content="identifier"` owns its copy; plus a **territory-set field** (World / World except / Only in, over ISO 3166 + CISAC TIS) — asked by S1·T, S2, S6 (no field takes a set; the country field returns names, the graph stores codes). |
| A5 | **Tier badge** — T1–T5 with a one-line tooltip | S1, S1·T, S2, S7 | a `Chip` with `Explained` — a level, not a state, so not a badge | A `tier` qualifier (Chip) with the ladder's five meanings as a closed vocabulary; computed per (asset, use) so the chip takes the use it was computed for. |
| A6 | **Conflict card** — every claim side by side, total vs 100%, revenue at risk, actions | S1, S2, S5, S7 | stacked `FactCard`s per claim, the total as a fact, actions in the header | `ConflictCard` pattern: N claim columns (2–4, then a list), a total line against 100%, revenue at risk, the counterclaim `Stepper` beside. Rule: a side the reader may not see shows its share total and "private to them", never blank (S5-7). |
| A7 | **"Decided by" line** — actor, on behalf of, authority, time | S1, S2, S3, S7 | a meta line (`formatMeta`) written by `decidedBy()` in `src/rights/kit.tsx` | A `DecidedBy` part with four named slots, so "on behalf of" and "under" can never be dropped or reordered (G-5). |
| A8 | **Approval card** — one shape for every inbox item, type-specific actions | S1, S2, S3, S6 | each request is a `DetailPage` with facts (requester, scope, use, territory, dates, deadline) and declared actions; the inbox is a `RecordIndex` | `ApprovalItem` pattern: anatomy = requester · subject · use · scope · territory · dates · deadline, actions by type (approve/decline/counter · confirm/deny · dispute · respond · delegate). Rule: nothing needed for the decision more than one tap away (S4-2). |

## B. System capabilities several surfaces needed

| # | Asked for | Hit by | Here, until decided | Proposed |
| - | --------- | ------ | ------------------- | -------- |
| B1 | **A page action unavailable, with its reason** (a delegate can't invite; only ops resolves; training first) | S1, S1·T, S2, S3, S5, S7 | the reason sits in the overflow (`more` takes `unavailable`, `actions` does not) | `PageAction.unavailable: string`, drawn disabled with its hint at a desk and as a disabled line on a phone. The single most-hit gap. |
| B2 | **White-label: Sureel's mark and accent** on S5–S8 | S5, S6, S7, S8 | `ORGANIZATIONS.fieldhouse.art` stands in; Revelator's blue throughout (no brand or tenant scope in `tokens.css`/`theme.css`/`decided.css`) | A `[data-brand]` scope in `decided.css` that re-resolves the accent roles, as `[data-theme="dark"]` re-resolves the scheme; `ShellProduct.workspace` gains `poweredBy` for "Sureel · for Meridian". |
| B3 | **An organisation home / dashboard** — counts that each open a filtered list, what's owed next, recent activity | S1, S2, S3, S6, S5 | drawn as the organisation's own `DetailPage` (its band) with `FacetCard`s | A `WorkspaceHome` page form (level: page): headline figures (up to 4), a ranked "needs you" list, activity. |
| B4 | **Four headline figures** | S1, S5, S7 | `StatCardRow` holds three; the fourth goes to a note line | Let `StatCardRow` take four (the FRD's coverage metric is four numbers by definition). |
| B5 | **An index opened pre-filtered** from a link ("3 missing" → Registrations on Missing) | S1, S2 | address segments mapped to an `initially` filter per page | `RecordIndex` reads a `?reading=&filter=` from its address; `opens` can name a reading. |
| B6 | **A download command** — a receipt, failed rows, a proof bundle, a report — named by the product | S5, S6, S8, S1 | a blob URL the browser names | A `downloads: { name, make }` command kind (Command and PageAction). |
| B7 | **Coverage measures as metrics** (Master resolved, Join rate, Composition resolved, Conflict rate; revenue-weighted, over months, per lane) | S5, S7 | `METRICS` is closed; `SeriesComparison` composed by hand; a change written as words ("+7.20 points") | Add the four to `METRICS` with `as: "percent"`; a written **change in points** (`formatChange`). |
| B8 | **Severity** (High / Medium / Low) as a scale, and a queue sorted by severity then revenue | S1, S7 | text column; sorted by one key | A `severity` family (three stances) and `RecordIndex.sort` taking a tie-breaker. |
| B9 | **A public, signed-out shell** | S8 | AppShell with a "Visitor" account | `ShellProduct.user` optional: no account, no rail when one destination. |
| B10 | **Comments on a record**, assign, ask for evidence | S7, S2 | an activity timeline the page writes into | `ActivityPanel` takes a composer (comment) and typed entries (assigned, asked, resolved). |
| B11 | **A diff of two versions** (rule versions; a claim corrected) | S7, S1·T | two FactCards side by side | A `Diff` pattern (before / after, changed fields marked with `ChangeMark`). |
| B12 | **A field taking a file as evidence** inside a form | S1, S1·T, S2 | `UploaderDocument` beside the form, not in its draft | `Field as="file"` bound to the form's draft. |
| B13 | **A boolean field in a declared form / settings switch bound to a draft** | S1, S3 | a choice of Yes / No (as RCC gap 17) | `Field as="switch"` in `SettingsForm` drafts. |
| B14 | **Persona switch reaching the surface** (worked around once for all surfaces: `useShellPersona` in `src/surfaces/surface.ts`) — a top-level component reading `usePersona()` outside the shell doesn't follow the switch | S6, (S1/S2 shell) | a small `Follow` re-render wrapper | `usePersona` subscribes to the shell's switch wherever it is called (or the shell passes it down). |
| B15 | **The phone**: four tabs only (Profile, Works behind More); the record's primary action folds into ⋮; row commands hidden; a person's mark drawn as a full-width disc | S3 | as the system draws it | A five-tab bar for a person's app; the primary action kept on the band at hand width; a cap on the record mark's size at hand width. |
| B16 | **Long values**: a record name in the header, prose in a fact card, a reason in a facet tile, a hash shown whole | home, S7, S8 | short titles + a soft Alert; hashes truncated | `Truncate` with full value on focus for codes; a `prose` fact kind. |
| B17 | **Marks the closed set lacks**: consent, credit, API key, webhook, proof event / batch / key, grant, file batch | S1, S3, S5, S6, S8 | nearest marks (`rights`, `verified`, `code`, `vault`…) — never a look-alike drawn | REPORTED, as the system's rule says: seven marks for the icon set's owner. |
| B18 | **More status families**: share state (Whole / Overclaim / Gap), sharing level (Shared / Private / Encrypted), mapping state, application, key, webhook delivery, rule version (Draft / Published / Retired), assurance level, `request:Responded` | S1, S2, S5, S6, S7, S3 | text, or the nearest family | Add as families with stances — each a one-line decision like the eleven already added. |
| B19 | **Loading state** on the declared forms — a `CollectionPage`, a `DetailPage`, a `RecordIndex` that can say it is loading, drawing its own placeholder rows and band | S1, S1·T, S7, every surface | one `Arriving` wrapper per surface draws the system's Spinner in the page's place on a first read, and an EmptyState with *Try again* on a failed one (`src/surfaces/arriving.tsx`); the Skeleton guidance forbids drawing a page-shaped grey box outside the component it stands in for | `loading?: boolean` on `CollectionPage`, `DetailPage` and `RecordIndex`, each drawing its own Skeleton rows / band; `error?: { title, retry }` beside it. |

## C. The graph (model and resolver) — not the design system's, but found by the screens

Fixed in the integration pass where marked ✓; the rest are open.

| # | Found | By | Status |
| - | ----- | -- | ------ |
| C1 | Voice/NIL asked the publishers; an artist's opt-out was not the reason given | S3 | ✓ resolver: Voice/NIL is a person's right; an artist-level deny answers first |
| C2 | Writes the shared graph had no setter for (withdraw a claim, add a request, sharing, access log) were done in place by surfaces | S1, S1·T, S2, S6, S7 | ✓ `withdrawAssertion`, `addRequest`, `setSharing`, `addAccess` — the contributor now reads its tenant live, so a console policy change reaches its access log |
| C3 | The state a new claim takes, the overclaim check at write time, chain of title — decided in surface folders | S1·T, S2 | ✓ `stateForNewClaim` and `claimsBehind` in `resolve.ts`; `chainOf` stays the publisher's (it reads the publisher's own society data) |
| C4 | Bitemporal: the resolver read valid time only, so "as we knew it on" showed today's totals | S1·T, S7 | ✓ `controllers`/`shareTotals` take `knownAt`: Northbound as known on 15 Feb 2026 reads DE 100%, not 110% |
| C5 | Clearance reasons named every partner on an allowlist — a leak to partners | S6 | ✓ `audience: "partner"` names only the asking partner |
| C6 | At-a-glance clearance asked in the US only, so tracks licensed excl. US/CA read 0 of 8 | S1·T, S3 | ✓ asks where the master is controlled and says where (Lowlight: 3 of 8 · in World excl. CA, US) |
| C7 | No home in the model for registrations, conflict evidence, counter-offers, suggested links, merge history, Merkle batches/TSA tokens, a claim reported only in a contributor's tenant | S2, S6, S7, S8 | open — held in surface `data.ts` |
| C8 | Tier is per asset; the FRD's claim row wants it per claim | S1·T, S2 | open |
| C9 | `RULE_VERSION` is a constant: publishing a rule in S7 doesn't change what the resolver reads | S7 | open |
| C10 | No notification write — "both sides see the outcome" works only through shared state | S1, S2, S3, S7 | ✓ `graph/notify.ts` hears every setter (`GraphEvent`) and tells each party; kept with the graph (docs/gaps/s4-notifications.md) |
| C11 | Every ISWC and UPC in the fixtures failed its own check digit | Files, S9 | ✓ recomputed; the API now checks check digits on every read and write |

## D. Policy calls the screens had to make (each built one way, flagged on the page)

| # | Question | Built as | Owner (FRD) |
| - | -------- | -------- | ----------- |
| D1 | Does a disputed attest-on-behalf pause the Voice/NIL grant or leave it live? | Paused | WMG legal |
| D2 | May a party's own correction or withdrawal close an overclaim, or only Sureel ops? | The party's own withdrawal/correction closes it; Resolve is ops' | Sureel / RAD |
| D3 | Does a decline write a Deny grant, or leave the use "needs review"? | No deny is written — the request is Declined, the use stays unanswered | WMG legal |
| D4 | Must a label's Recording↔Work link wait for the publisher's confirmation? | Written straight through, method named | RAD |
| D5 | May a new Voice/NIL grant be made while the artist disputes an earlier one? | Blocked | WMG legal |
| D6 | The 30 Nov gate thresholds for the four coverage measures | Placeholders 70 / 50 / 40 / ≤3% | Claire + Leho |
| D7 | Repeat-offender threshold and suspension (S7-9) | Restrict auto-acceptance; Suspend unavailable | Sureel |
| D8 | Society writer/publisher conventions shown on shares | Illustrative, labelled | Natalie / societies |
| D9 | The artist app's brand: Revelator, Sureel, co-branded | Revelator | Lihi, Reid, Bruno |
