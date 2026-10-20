# Gaps — S1 Rights workspace (label) and the label's S4 inbox

What the label's Rights section (`src/surfaces/pro/label/`) asked of the design system and did not
find. Nothing here is drawn with markup of its own: each gap is drawn with the nearest declared form,
named in the last column, until the system decides it.

Reader: Priya Raman, label admin at Kestrel Point Recordings (`p-kestrel`).

## Overview (S1-1) — `#/pro/rights/overview`

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 1 | An **organisation's dashboard**: the four counts, each opening a filtered list, recent activity, what is owed next | S1-1, screen 1 | A `DetailPage` of the label as a record, landing on a `DetailOverview`. No declared form is "the workspace's home"; AnalyticsPage reads a period, which none of these figures has |
| 2 | **Four headline counts** — coverage, open conflicts, pending requests, revenue at risk | S1-1 | `StatCardRow` takes at most three (`check:page`). Coverage, conflicts and requests are the row; revenue at risk is its own `FacetCard` with Total / Master / Composition |
| 3 | A **headline figure that links** to its filtered list | S1-1 acceptance | A stat card never acts; every count is repeated in a `FacetCard` whose way out opens the list, pre-narrowed by the address (`catalogue/below-t3`, `conflicts/at-risk`) |
| 4 | **What needs the label next** — a ranked to-do across requests, conflicts and releases | S1-1 | A `TitledCard` holding a `Slot` list of `SlotItem`s, each opening its record, with the state badge as trail. A release missing its defaults has no state family to wear: no badge |
| 5 | **Recent activity** on the page itself | S1-1 | Behind the record header's timeline control (`ActivityPanel` with `records`). Not on the face of the page |

## Catalogue rights — `#/pro/rights/catalogue`

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 6 | An index **opened pre-filtered** from a link | S1-1 "each links to a filtered list" | `RecordIndex` has no initial reading or filter prop; the address segment turns a `switches` filter on with `initially`, and the page is keyed by it |
| 7 | **Master owner and where it controls** in one cell | S1-2, G-4 | Two columns: Master owner (party name), Controlled in (`TerritoryChip` from the kit) |
| 8 | **Coverage as a figure over the set** (a percent) | S1-1 | `totals` takes money and count only; the percent is a `note` sentence written with `formatPercent` |

## Clearances (S1-4, FRD pattern 3) — `#/pro/rights/clearances`, `#/pro/rights/clearances/<asset>`

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 9 | **The clearance matrix** — uses down, scope across, every cell an answer and the scope that decided it | pattern 3 | Index: rows are assets, a column per use. Asset record: rows are uses, a column per scope (Track, Release, Catalogue, Artist), then Effective, Decided at, Master, Composition, Why. A `RecordIndex` is the nearest form; there is no matrix |
| 10 | A cell that reads **answer + deciding scope + reason** | pattern 3 | `ClearanceBadge` wrapped in `Explained` (the reason and scope on hover). Explained is meant for a reached figure, not a badge; the scope word is not on the cell's face |
| 11 | **Who asks and where** as the question every cell answers | S1-4 "Partner and territory as readings/filters" | Neither a reading nor a filter: both slice rows, these change every answer. Held in the address (`clearances/in/<country>/<partner>`), changed with an "Ask as" `FormDialog`, said in the index `note` |
| 12 | The **per-scope cell** (what a scope holds for a use) | pattern 3 | Drawn from the stored grant, mapped to the clearance family (Grant → Granted, Deny → Denied, paused/unauthorised → Needs review). A stored fact, not a resolution; only the Effective column is the resolver's |
| 13 | Composition side **per work and publisher** in one cell | G-3 | A `formatMeta` line "Publisher: state" — no badges for several parties in a cell |
| 14 | **Error state**: a failing feed the answers depend on | design brief states | `Alert intent="danger"` as the index note when reading in DE (GEMA acknowledgements are failing in fixtures) |

## AI consent (S1-5, S1-6, S1-7) — `#/pro/rights/consent`, `/consent/<grant>`, `/consent/new`

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 15 | **Bulk grant** — one grant at the chosen scope | S1-5 | A covering `Wizard` (three sections) writing ONE grant through `addGrant`. It lands on the grant's record |
| 16 | **Dependency rule in the UI** — dependents disabled with a one-line reason | S1-6 | In the wizard: an `Alert` row revealed by `useAnswer`, and `ready` refuses the commit where training is cleared on none of the scope; partly cleared → a warn alert naming the tracks. In the request inbox: Approve is `unavailable` with the reason. A choice field cannot disable one option with a reason |
| 17 | **Voice/NIL path** — confirm as artist, or attest on behalf with an agreement reference, notifying the artist | S1-7 | Choice field "Voice/NIL path"; "attest" reveals an Agreement reference (clauses that mention attesting). Attest → grant Live + attestation Signed on behalf + an Attestation request pushed into the artist's inbox (S3 reads it). Ask → grant Paused + attestation Requested. A label cannot "confirm as the artist": the label's version of that path is asking the artist |
| 18 | A new Voice/NIL grant while the artist **disputes** an earlier one | F3 | Refused (alert + `ready`) — decided here; the FRD leaves dispute policy to WMG legal |
| 19 | **Inheritance shown** — every track inherits; a narrower deny overrides | S1-5 acceptance | "Inherited by" `TitledCard` on the grant record, each track with the resolver's answer (Lowlight shows the asset-level deny) |
| 20 | A **grant's mark** | — | No mark kind for a consent; it wears its scope's (label/artist party mark, or the asset's cover) |
| 21 | Pause / Resume / Revoke a grant; paused-by-dispute cannot resume | F3 step 4 | Row and header commands; Resume `unavailable` with the dispute as reason; Revoke a destructive `ConfirmationDialog` |

## Release defaults (S1-11) — `#/pro/rights/consent/defaults`

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 22 | A **switch** bound to a settings draft | S1-11 | No declared boolean field kind: each use is a two-answer `Field as="choice"` (Allowed / Off) in its `SettingsRow` |
| 23 | Dependent rows **disabled with a reason** when training is off | S1-6 | The row's description becomes the reason and its control a `clearance:Denied` badge |
| 24 | **Defaults applied at release creation** | S1-11, F1 step 2 | Release creation is the catalogue's. Here a page action "Apply to Harbour Lights" writes the release-level grants (one per AI use) the defaults stand for; the "New releases" group says which releases started from them |
| 25 | Defaults are the label's **setting**, not a graph fact | — | Kept in `label/data.ts` (`DEFAULTS`); the graph model has no place for them |

## Requests — the label's approval inbox (S1-8, S4-1..S4-5) — `#/pro/rights/requests`, `/requests/<id>`

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 26 | **Approval card** — one shape for every inbox item, type-specific actions | pattern 8, S4-1 | A `DetailPage` per request (header: counterpart mark, the ask, type, state, deadline) over `Metadata` (Request, Decision, Delegated, Conflict/Credit/Attestation fact cards, and what the graph answers on the start date). The inbox is a `CollectionPage`; the card is a record, not a card in a list |
| 27 | **Approve / decline / counter / delegate / respond** | S4-3 | `FormDialog`s held by row commands and the header. Approve writes one grant (`addGrant`) + `setRequestState`. Decline keeps a reason, Counter keeps the counter terms, Delegate the colleague — in `label/data.ts`, as the shared setters carry none of them |
| 28 | A state for a **conflict response answered** | S4-1 | The request family has none ("Responded"); an answered conflict response reads **Approved**, and the conflict moves to step 2 |
| 29 | **Auto-cleared shown as activity** | S1-8 | A reading "Auto-cleared", and lines from the "Clearance engine" in the `CollectionPage` activity panel |
| 30 | **Escalation** visible to the original owner | S4-5 | `request:Escalated` badge and a warn `Alert` on the card. Who it escalated to is not modelled |
| 31 | **Notification** by email/push and digest | S4-4 | Not built — no notification surface in the system |
| 32 | **Delegate approval** items | S4-1 | Not in the label's inbox in fixtures (they are the artist's). The type is drawn by the same card if one arrives |
| 33 | A requests **reading ordered by deadline** | S4-2 | Index sorted by Received, newest first (the index rule); Deadline is a sortable column |

## Conflicts (S1-9, S1-13, pattern 6) — `#/pro/rights/conflicts`, `/conflicts/<id>`

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 34 | **Conflict card** — every claim side by side, total vs 100% | pattern 6 | A `DetailPage`: one `FactCard` per claim (party, state, interest, share, territory, dates, source, reference, tier), stacked in `Metadata` — no side-by-side layout exists. Totals: a "Shares against 100%" `FactCard` with `as: "rate"` |
| 35 | **Counterclaim tracker** | S1-13 | The system's `Stepper` in a `TitledCard`, plus a "Where it stands" fact card with what the next step needs |
| 36 | **Severity** as a state | S1-9 | No family; plain text (High / Medium / Low) |
| 37 | Conflicts the label **reads but cannot answer** (on works its recordings embody) | roles table | Listed with an info `Alert` "Read only"; Respond `unavailable` with why (permission-denied state) |
| 38 | **Withdraw** a claim | S1-9, G-1 | Destructive `ConfirmationDialog`. Only the label's unresolved claims, flagged grants and disputed attestations are offered; claims are marked Withdrawn in place (no shared setter); the resolver closes the conflict with the withdrawal as reason |
| 39 | **Evidence upload** on a response | S1-3, S1-9 | No declared file field: evidence is a text reference. `UploaderDocument` is not bound to a form draft |
| 40 | A party's **private terms** (borrowed lane) | FRD "Under audit only" | A fact card saying the claim is held in the contributor's own tenant |

## Contracts — `#/pro/rights/contracts`, `/contracts/<id>`

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 41 | The **Contracts** page | replica `#/rights/contracts/list` | A simple index of `AGREEMENTS` involving the label, and a record with terms, clauses, the claims resting on it and the consent decided under it. **The real contract record lives in the product** (Revelator Pro's Contracts, with documents, economics, grant-of-rights matrix); this is only the graph's view |

## Export (S1-10)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 42 | **Export that matches the screen** (the filter applied) | S1-10 | "Export rights report" in every list's overflow: a `FormDialog` (CSV / PDF) whose notice carries `GRAPH_VERSION` and `RULE_VERSION`. The command cannot read the index's live filter state, and no file is produced — the export is logged in the activity |

## Cross-cutting

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 43 | **Loading** state | design brief states | Not drawn: every read is synchronous over fixtures |
| 44 | A **record the address names that the graph no longer holds** (writes are lost on reload) | — | An `EmptyState` page under the section |
| 45 | **Bitemporal** "as of / as known" pickers | S1-12 | Not built — belongs to the asset's Rights facet (catalogue builder) |
| 46 | A **dispute-pauses-grant** policy | F3, open question | Followed the fixtures: paused, not revoked; said on the grant and the request |

## Decided here rather than asked

- The overview is the **label as a record** (DetailPage + DetailOverview); its header carries the
  primary "Grant consent", the export and the history.
- Narrowings are **address segments** (`catalogue/below-t3|unlinked|conflicts`,
  `conflicts/at-risk|respond`, `clearances/in/<country>/<partner>`); a record id is told apart by
  its prefix (`rq-`, `cf-`).
- Requests readings: **Needs decision** (Needs decision + Escalated, in the label's inbox) first,
  then Sent, Auto-cleared, Decided, All.
- A Voice/NIL request approved by the label writes an **Artist-scope** grant for the requesting
  partner only, over the requested territory and term.
- Decline writes **no deny grant** — the request is answered; a standing deny is granted from AI consent.
- "Release defaults" has its own nav entry beside AI consent rather than living inside it.
- Writes the shared setters lack (withdrawn claims, notifications to the artist, delegations,
  counter terms, responses, exports, defaults) are kept in `label/data.ts` and
  `label/conflict-dialogs.tsx`, redrawn through `wrote()`.
