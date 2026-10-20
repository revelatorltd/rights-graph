# Gaps — S1 Catalog, per-asset rights

What the Revelator Pro catalogue's rights facets (FRD S1-2, S1-3, S1-4, S1-12; design screen 2,
"Track rights tab — two-sided panel, claim rows") asked of the design system and did not find. A
page never draws a gap: it is logged here, decided in `../revelator-pro-design-system.git`, and
the page adopts the decision.

Pages: `#/pro/catalog/tracks`, `…/releases`, `…/videos`; a record at
`#/pro/catalog/<tracks|releases|videos>/<id>/<overview|rights|clearances|credits|history>`.
Proving cases: `r-northbound`, `r-switchback`, `r-lowlight`, `v-northbound`, `rel-northbound`.

## Rights facet — the two-sided panel (FRD pattern 2)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 1 | A **two-sided rights panel**: master left, composition right, always, each side a resolved reading over its claims | Pattern 2, S1-2, G-3 | a `CardGrid columns={2}` of four cards in two rows — "Master, as resolved" / "Composition, as resolved" (FactCards), then "Master claims" / "Composition claims" (TitledCards). Row-aligned by construction, not by a declared form; on a phone the grid's own collapse stacks master above composition |
| 2 | A **claim row**: party, interest, share, territory chip, dates, source, tier badge, expanding to evidence and history | Pattern 1 | a `SlotItem` (party mark + name + one meta line: interest · share · territory · dates · source) with the `claim:*` badge in the trail; pressed, it opens a **Drawer** (the row's reveal) holding the claim in full, the resolved answer, the evidence and the supersede chain. The territory chip and tier chip are drawn in the drawer only — a row's trail holds one thing, and the meta line reads the territory as words |
| 3 | **Tier per claim** | G-2 | the model computes tier per asset (and use), not per claim: the claims card carries the asset's `TierChip` in its trail, the drawer repeats it, and each claim shows its **source and its precedence** (1–6) instead |
| 4 | A **resolved reading by territory** — "World excl. DE: Publisher 100%, Writer 100%; DE: Publisher 110%, overclaim" | S1-2, G-4 | FactCard facts, one per run of countries the resolver answered alike — the page asks `controllers`/`shareTotals` in every country any claim names plus one no claim names ("everywhere else") and gathers equal answers. No component draws a territory-keyed reading; the overclaim/gap is a word in the value, not a state (no status family holds Whole / Overclaim / Gap) |
| 5 | **The resolved answer next to the reader's own claim, with the reason where they differ** | G-1 | the row's meta says "Yours" or "Yours — the graph differs"; the drawer holds a second FactCard "Your claim, as the graph resolves it" with the graph's answer and why. No paired "Current state / Your claim" component exists (the same one S2-8's counterclaim needs) |
| 6 | A **per-party resolved share** ("the graph pays Harbor 50% in DE") | G-1 | `resolve.ts` answers share TOTALS and CONTROLLERS, not what each party is paid while a conflict stands. The page reads the party's own `Resolved` claims covering the country — the state the resolver left — and says that. A `resolvedShare(asset, party, country, at)` belongs in the resolver |
| 7 | **"As of" and "as we knew it on" pickers** on the rights tab | S1-12 | two `DatePicker`s, each in a composed `Field` with its label, in the Rights facet header's `trail`. No declared "reading-time" control; the trail has no rung for two labelled fields, so they may sit tall beside the header actions |
| 8 | **Bitemporal resolution** — the totals as the graph knew them on a past date | S1-12 | `resolve.ts` takes valid time (`at`) only. The claims are filtered by both times (`known ≤ knownAt`, live on `asOf`), but the resolved readings use `asOf` with **today's** knowledge. Needs `known_at` on `controllers`/`shareTotals`/`clearanceOf` |
| 9 | A claim's **state as it stood** on a past "known" date | S1-12 | the model stores one state per claim, no history. A claim superseded by one learned after the "known" date is read as Resolved (standing then) — an approximation, said in a comment |
| 10 | **Read-only** past state | S1-12 | an info Alert over the panel; add/correct/withdraw become unavailable. A page **action** cannot be `unavailable` (only a `Command` can), so in a past state the header's add moves into the overflow, unavailable, with why |
| 11 | **Permission-denied**: the side a persona cannot claim | Roles table | the other side's "Add … claim" is a `more` command, `unavailable` with the reason (Label: composition is the publishers'; Publisher: the master is the label's). Same gap as 10: a header action cannot carry the reason itself |
| 12 | A **missing work link**, shown as unmatched money with a way to it | S1-2, S1-9 | the composition-resolved card is an EmptyState ("No work linked") holding **Link a work** (a FormDialog, prefilled with the match `MERGES` suggests) and a link to the conflict. The link is written straight through `linkRecording` — see Decided, 4 |
| 13a | A claim row's **meta line at half width** | Pattern 1 | at a 1024 px window the two-column grid leaves the meta line a few words wide and the row cuts it; the drawer holds it whole. The two-sided panel needs a measure rule (or a row that wraps its meta) |
| 13 | The **work page** a composition claim belongs to | S2-1 | linked in the Publisher persona only (`#/pro/rights/works/<id>`, the publisher builder's); the Label persona's Rights section has no work page, so a label reads the work here |

## Add, correct, withdraw (S1-3)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 14 | A **territory set** field — World / World except / Only in, over ISO codes | Pattern 4, S1-3 | two fields: a `choice` (World / World, except / Only in) and a `choices` of 13 codes the fixtures use, titled by name. `as: "country"` gives country NAMES and the graph stores codes; no field takes a territory set |
| 15 | **Evidence upload** inside the claim form | S1-3 | `UploaderDocument` + `UploaderFileRow`s in a composed `Field`, the file list held by the dialog (the form's draft holds no files). Nothing is uploaded: the names are stored on the claim's `evidence` |
| 16 | The **state a new claim is written in** — overclaim → Contested, no authority → No authority | S1-3, invariants | a stand-in for the resolver's write-time check, in `data.ts`: Contested where `shareTotals` now passes 100% in any country the claim reaches (then `addConflict` opens an Overclaim, severity High if the asset earns); No authority where a controlling claim cites an agreement whose territory does not reach. Belongs in the resolver |
| 17 | **Withdraw a claim** | S1-3, S1-9 | the shared setters have none: written in `data.ts` against the claims array in place (the row stays, Withdrawn). The model holds no withdrawal time, so this session's are kept in a map for History. An overclaim the claim alone made is resolved with "withdrew its claim" |
| 18 | Revenue at risk on an overclaim the page opened | S1-9 | `revenue × (total − 100) / 100` — the page's estimate, not the graph's |
| 19 | A correction that brings the shares back to 100% **closes** its overclaim | F5 | done here (resolution "Corrected by …"). Whether a party's own correction closes a conflict or only proposes its close to ops is a policy call (FRD F5 says ops resolves) |

## Clearances facet (S1-4)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 20 | A **clearance matrix**: uses down, scope across (track, release, label, artist), each cell the answer and the scope that decided it | Pattern 3, S1-4 | a `RecordIndex` of the eight uses with columns Answer, Master, Master decided at, Composition, Composition decided at, Needs first, Reason. The resolver returns the DECIDING scope only; what each other scope would say is not asked of it, so no scope-across grid. A row opens a Drawer with each side in full (grant, decided-by, conditions) |
| 21 | **Partner and territory as choices** | S1-4 | two `Select`s in composed Fields in the facet trail; 13 countries, the six partners. Same trail-rung question as 7 |
| 22 | **Composition answered per publisher** in one cell | G-3 | the worst of the publishers' answers as one badge; each publisher's answer in the drawer |
| 23 | **Dependency shown** — AI training before the others | S1-6 | a "Needs first" column ("AI training — denied"); the resolver's own reason says the rest |

## Credits and History

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 24 | **Request confirmation** of a To-confirm credit | S3-3, F1 | a row command, drawn inert — no shared setter adds a request to the artist's inbox |
| 25 | The record's **claim history and decisions** as a timeline | S1 History | a `RecordIndex` of events (claims added/corrected/withdrawn with the replaced claim beside, grants decided, conflicts opened/resolved, attestations), readings All / Claims / Decisions. Not the RecordHeader's `activity`: those entries are field changes, and a claim is not a field |

## Indexes

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 26 | A **clearance-at-a-glance** reading on a catalogue row | brief | "Cleared uses: n of 8" (default ask: any partner, US) and an "AI training" badge; videos read "Sync in US", releases Stream and AI training. Asked in one country, Lowlight and Glass Coast (licensed outside US, CA) read 0 of 8 — true in the US, misleading as a catalogue reading. Needs a territory-weighted or "where cleared" reading from the resolver |
| 27 | **Work link** on a track row | S1-2 | `match:Matched` / `match:Unmatched` — the closest state family; "Unmatched" is the FRD's own word for the money |
| 28 | **Master held everywhere?** on a row | S1-2 | "Controlled" or "Gap in US, CA" as words — no status family holds it |

## Decided here rather than asked

1. **A release holds no rights.** Its Rights facet is an info Alert and a ranked index of its tracks
   (master as held, work link, tier, conflicts), each opening on the track's own Rights; no claim
   is ever added on a release, and the header offers "Open rights" instead of "Add claim".
2. **A video's master side reads its own claims and its contained recordings'** (each row names
   its asset), with "Contains: Northbound, from 00:00 to 03:41, audio track" on the resolved card;
   its composition side is `worksOf(video)` — every work the contained recordings embody.
3. **Today's view shows every claim the record holds** — the replaced and withdrawn too, standing
   ones first — because G-1 says the old row stays. A past view shows only what was known by then
   and live on the day asked.
4. **Linking a work writes the link at once** (`linkRecording`, which also resolves the missing-link
   conflict), from either persona, with the source named ("Label declaration — Kestrel Point" or
   "Publisher confirmed — Harbor Music"). Strictly a label's link is a claim the publisher confirms
   (S2-3); the shared setter has no pending state.
5. **The publisher reads the label's catalogue** in the Catalog section (the brief: "the catalog is
   shown in both"); its master side is read-only and its composition claims are its own to add,
   on any work the asset embodies.
6. **A claim form, not a wizard**: a handful of answers, and the rights stay in view behind it. The
   share type is the side's (Master; Publisher for a publisher) and the rights are all of the side's
   — the FRD's S1-3 list asks neither.
7. **Header action for the reader's side only**: one add (`Add master claim` for the label, `Add
   composition claim` for the publisher), the other in the overflow, unavailable with why.
8. **Correct and Withdraw live in the claim's drawer footer**, offered only on the reader's own
   standing claim in today's view.
