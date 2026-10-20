# S7 Sureel Graph Console — gaps

`src/surfaces/console/`. Sureel's internal console, where the graph is run. The signed-in user is
Lior Ben-Ami, Sureel rights ops. The shell has two personas: **Rights ops**, and **Data engineer**
(Tomás Reyes, `?persona=data-engineer`). A data engineer can read everything, comment, assign,
retry feeds and replay a draft rule. Resolving, merging, publishing, policy changes and audit
windows are rights ops' calls, so for a data engineer those commands are greyed with a reason. That
is the console's permission-denied state.

Every page was opened at 1440×900. I clicked through F3 step 4–5 (resolving the attestation dispute
`cf-6`, which revokes `g-14` and `at-4`), a match review accept, an unmerge, a replay and publish of
`v1.4-draft`, and an audit window on Meridian. Pages were **not** checked at phone width.

| # | Asked for | FRD ref | Here, until decided |
| --- | --- | --- | --- |
| 1 | **Sureel's logo** on its own console | Design brief: "Sureel's logo and accent through white-label tokens" | `ORGANIZATIONS` has no Sureel mark. The workspace wears `ORGANIZATIONS.fieldhouse.art` as a stand-in. |
| 2 | **Sureel's accent** through white-label tokens | Design brief | The system has no brand or white-label token layer (S5 gap 2 says the same). The console draws in Revelator's blue. |
| 3 | **A severity scale** (High / Medium / Low) on conflicts | S7-2 | No status family or level for it. Severity is a word in a column and a fact on the band (`High severity`), and it can be filtered. The queue's order carries it: rows arrive HIGH first, then by revenue at risk (`byPriority` in `data.ts`), and the table opens on that order with no `sort`. A level like `TierChip`, or a `severity` family, is owed. |
| 4 | **A queue sorted by two keys** (severity, then revenue at risk) | S7-2: "Given a HIGH conflict, then it's at the top" | `RecordIndex.sort` takes one column. The rows are pre-sorted and the index opens in arrival order. Once a reader sorts by a column, there is no way back to "queue order" apart from reloading. |
| 5 | **Comments on a record** | S7-2: "assign, comment" | No comment-thread component. Notes are a `RecordIndex` in the conflict's **Discussion** facet, added through **Add comment** (`FormDialog`, long text). They also appear as "commented" entries in the record's `ActivityPanel`. Notes are kept in `data.ts`, since the graph has no notes. |
| 6 | **Assign / ask for evidence / resolve as one record's workflow** | S7-2, `COUNTERCLAIM_STEPS` | Each is a command: Resolve is the band's primary action, and Assign and Ask for evidence sit in the overflow. The counterclaim step is a fact ("Step: Evidence approved") because there's no stepper in a facet tile. `Stepper` exists, but nothing in the Detail family holds it. |
| 7 | **A resolution's outcome tied to its kind** — e.g. an attestation dispute that reinstates or revokes its grant | S7-2, F3 steps 4–5 | **Resolve** is one `FormDialog` (Outcome, Rule or evidence, Reason — all owed). The outcomes come from the conflict's kind (`outcomesOf`). For `cf-6`, "Attestation upheld" calls `setGrantState(g-14, Live)` and `setAttestationState(at-4, Signed)`. "Dispute upheld" revokes both. A missing work link is resolved by linking it through `linkRecording`, which resolves the conflict itself. |
| 8 | **Both sides see the outcome** | F3 step 5, F5 step 5 | The outcome is written to the shared graph (`updateConflict` resolution, grant and attestation states), so S1 and S3 read it. Neither has a notification write. The parties told are recorded in console `NOTICES` and listed as "Told" on the resolution. A shared notices/inbox write (`addRequest` or `notify`) is owed by `fixtures.ts`. |
| 9 | **The resolution's "rule" as structured data** | S7-2: "records the rule (`RULE_VERSION`) or evidence used" | `Conflict.resolution.rule` is a string. The dialog offers the rule and precedence each claim's source holds (`Resolver v1.3 · precedence 1 (signed agreement)`), every source ref and piece of evidence, the cited clause, and the authority rule. The choice is stored as words. A `{ rule, precedence } \| { evidence }` shape is owed by the model. |
| 10 | **The claims a resolved total is made of** | S7-5: "every resolved value links to the winning claim" | `shareTotals` returns totals without the claims behind them. `countedIn` in `data.ts` reads the same filter (standing, Owns, covers the territory, live today) so the inspector can link each total to its claims. The resolver should return them: `shareTotals(...)[n].claims`. Control rows link to `controllers()`, which is the resolver's own answer. |
| 11 | **A resolved view across territories** | S7-5, G-4 | No territory × value matrix. The **Resolved** facet is a `RecordIndex` of values, one row per value per run of territories answered alike (read in US, GB, FR, JP and every code a claim names). The two sides are its **readings**, with no reading of both (G-3). A work has only Composition. |
| 12 | **Several links in one cell** (the winning claims) | S7-5 | One `Link` per claim, written side by side in the cell. They stay readable but wrap with no separator. A cell that holds a set of links (like `entities`, but each one leading somewhere) is owed. |
| 13 | **Clearance per use with each side's answer** | S7-5, rights pattern 3 | The **Clearance** facet is a `RecordIndex` of the eight uses: the answer, the master's, one badge per composition answer, decided-at level, grant decided-by, reason and rule. It is read in the US, today. There is no use × scope matrix and no territory picker (the FRD's clearance matrix is S1's pattern). |
| 14 | **The bitemporal reading** (valid time vs system time) | S7-5 (data-model doc) | No "as of" control. Every claim shows Valid from/to and Known since, and an info `Alert` says the view is read today under `v1.3` on `gv-2026.10.20-0958`. Reading the graph *as it stood* on another date is not built. `clearanceOf`/`shareTotals` take an `at`, but nothing on the page sets it. |
| 15 | **Side-by-side claim cards** (conflict card, pattern 6) | S7-2, F3 step 4 | `CardGrid columns={2}` of `FactCard`s inside `Metadata`: each claim, or for `cf-6` the label's attestation (at-4, AGR-310 §7.4) beside Mira's dispute, with the cited agreement and clause under them. The system has no conflict card. "Total against 100%" is a figure on the Overview's Claims tile, not on the cards. |
| 16 | **A private counterparty claim** (borrowed lane) | S7-2, Roles: "Under audit only" | `cf-8` names only Harbor's assertion, and Meridian's claim is private to its tenant. Claims says so in an `Alert` and sends ops to Tenants to open an audit window. Nothing in the system marks a value as *withheld*, as distinct from absent. |
| 17 | **Long values in a facet tile** (a resolution's reason) | — | A tile scrolls inside itself. The resolution is a full-width `FactCard` under the overview grid instead. RCC gap 15 is the same problem. |
| 18 | **A page action unavailable with its reason** | Permission-denied state | `PageAction` has no `unavailable` (S3 and S5 found this too). For a data engineer, the band's Resolve, Unmerge, Publish and Request audit access move to the overflow as greyed `Command`s with the reason. |
| 19 | **Coverage measures as metrics** | S7-6 | `METRICS` is closed and has no coverage measures, so no declared `TrendCard`/`AnalyticsOverview` can plot them. The page is a composed `SeriesComparison`: a `TrendCard` whose metric line is a select of the four measures, one line per lane, `format` = `formatPercent`. The lane table (selectable, the only key) has October, **Added** since May ("what each lane adds") and Last load. `METRICS` needs a share-of-catalogue kind. |
| 20 | **The 30 November gate numbers** | S7-6 | The FRD names the gate but not its thresholds. `MEASURE` in `data.ts` sets placeholders (Master resolved ≥ 70%, Join rate ≥ 50%, Composition resolved ≥ 40%, Conflict rate ≤ 3%). The trend's readings are the Owned lane and the gate. These are the deal team's numbers to set. |
| 21 | **A fixed run of months** in the analytics header | S7-6, Analytics guidance ("Period select: Always") | `PeriodSelect` reads rolling windows. Coverage is fixed months (`COVERAGE_MONTHS`, May–Oct), so the header has no period control. A monthly-snapshot period is owed. |
| 22 | **"Incremental coverage within a day of a new lane loading"** | S7-6 acceptance | The fixtures have no per-load coverage. The lane table's **Last load** column (each lane's latest feed) is the nearest proof. |
| 23 | **A rule version's state** (Draft / Published / Retired) | S7-7 | No status family. It's written as words. |
| 24 | **A diff of two versions** | S7-7 | No diff component. **Diff** is a `RecordIndex` of the precedence ladder rung by rung (before, after, Same/Added/Changed), with readings Changed and All rungs. The ladders per version are `LADDERS` in `data.ts`. |
| 25 | **Replay as a run** | S7-7: "how many resolved values would change and the revenue affected" | Replay is instant: the totals come from `RULES` (1,842 values, $212,400), with a sample of five changed values (`REPLAY_SAMPLE`). A `ProgressDialog` over a real run would fit. Publish is greyed until the draft has been replayed. |
| 26 | **Publishing a rule changes what the resolver reads** | S7-7 | `RULE_VERSION` in `resolve.ts` is a constant. Publishing in the console marks `v1.4-draft` Published and `v1.3` Retired (`rules()` in `data.ts`), but every page still resolves under v1.3. A versioned resolver is owed by `resolve.ts`. |
| 27 | **Sharing level as a state** (Shared / Private / Encrypted) | S7-8 | No status family (S5 gap 12). It's written as words, with a "What it means" column. |
| 28 | **A policy change and an audit window visible to the contributor** | S7-8: "logged and the contributor notified"; Roles: "Under audit only" | `TENANTS` is `readonly` and has no setter. `changeSharing` and `requestAudit` write the tenant's own `sharing` and `access` arrays in place, so S5's access log shows the entry: "Graph Console · audit request AR-113", `audit: true`. The policy log and the notice live in `data.ts`. `setSharing` / `addAccess` setters are owed by `fixtures.ts`. |
| 29 | **A time-boxed window** that closes itself | Roles: "Under audit only … time-boxed" | Each audit has Opens/Closes and a reading "Open now" (by the console's clock). Nothing closes it in real time, and no countdown is drawn. Only **Private** fields can be opened. An encrypted field is held under the contributor's key. |
| 30 | **A second contributor tenant** | S7-8 | The graph holds only Meridian. Mistral Arcade Records (`p-arcade`, which already has a feed) is a console-local tenant in `data.ts`, so the tenants form a set. |
| 31 | **Trust / auto-acceptance standing for a claimant** | S7-9 | The console reuses the `trust` family: Allow means claims resolve on their own, Challenge means held for review. Check that the family's meaning ("asked to prove itself first") is meant to stretch this far. The rejection threshold (15%) is a placeholder, and the page says so. **Suspend** is a greyed command: "a policy call for Sureel and WMG legal". Claimants aren't graph parties, so they wear initials. |
| 32 | **Unmerging a recording link** | S7-4: "every merge reversible from the record" | The graph has `linkRecording` and no unlink. Accepting the `m-2` suggestion links Switchback to its work (resolving `cf-2`). Unmerge on such a merge is greyed with that reason. Party and work merges unmerge in the console and notify every party holding a claim or credit on what they touch. Splits "recompute on the next snapshot" is said in words, because no snapshot write exists. |
| 33 | **Merge history the graph keeps** | S7-4 | The graph has no merge records. The three past merges, and every accepted one, live in `data.ts`. A Party model with an alias/merged-from edge is owed. |
| 34 | **A match review's verdict buttons, unavailable with a reason** | S7-3 | The review's dock takes `Button`s. Once a suggestion has been decided, they're only `disabled`, with no hint. |
| 35 | **Loading state** | Design brief: "default, empty, loading, error, permission-denied" | The fixtures are synchronous, so nothing loads. The **error** state is an `Alert` for an address naming no record (conflict, asset, claim, merge, rule, tenant). **Empty** is each index's own empty line (Discussion on `cf-2`, Unmerged merges). |
| 36 | **A feed's own record** (its batches, its error trend) | S7-1 | Feeds are rows only. **Retry** (`ConfirmationDialog`) records a retry time. **Open batches** goes to the Batches page unfiltered, because an index can't be opened pre-filtered from an address. |

## Decided here rather than asked

- **The home view is Ingestion health** (`#/console`), a `CollectionPage` of feeds. The late and
  failing feeds are named in the index's `note` (an `Alert`, danger while one is failing):
  Chappell CWR late, GEMA acks failing, Mistral Arcade late. That covers S7-1's acceptance.
  Readings split the feeds by state, and the totals are feed count, late or failing, and rows.
- **Conflict queue readings**: Unresolved (where it opens), Assigned to me, Unassigned, Resolved.
- **A conflict is a `DetailPage`, not a `Review` cover.** It's addressable, it keeps its history
  behind the band's timeline, and the shell stays in view for the asset inspector. **Match review
  is a `Review`** (the queue's stepper, the two records side by side, Reject / Accept merge in the
  dock), because it judges one suggestion after another.
- **Claim shares are `rate`** (60% is 60%, as set). Totals against 100% and confidence are
  `percent` (measured).
- **Every claim is addressable** (`#/console/claims/<id>`), so a resolved value's winning claim is
  a link. The claim page shows both clocks and the correction chain both ways.
- **The asset's sides are readings with no "All"**, so master and composition are never one set
  (G-3).
- **Pages are keyed by their whole address**, so one index never inherits another's filters. An
  unkeyed `CollectionPage` reused across pages crashed on a filter key it didn't have.
- **Severity is not colour.** It's never a badge, because a badge would claim a status family
  that doesn't exist.
