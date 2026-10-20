# Gaps — S2 Publisher workspace

What the Publisher workspace (FRD S2-1 to S2-8, the S4 inbox inside it, flows F1 step 4, F2 step 4
and F5 step 4) asked of the design system — and of the shared graph — and did not find. A page
never draws a gap: it is logged here, decided in `../revelator-pro-design-system.git` (or in
`src/graph/`), and the page adopts the decision.

Persona: **Publisher** (`?persona=publisher`), working as Harbor Music (`p-harbor`), user Elena
Marsh, a publisher admin. Folder: `src/surfaces/pro/publisher/`.

Pages: `#/pro/rights/overview`, `…/works`, `…/works/<id>/<shares|writers|chain-of-title|recordings|claims|registrations>`,
`…/recordings-to-link`, `…/registrations`, `…/clearances`, `…/requests`, `…/requests/<id>`,
`…/conflicts`, `…/conflicts/<id>/<claims|territories|counterclaim>`.
Proving cases: `w-northbound` (the doc's worked example), `w-tidewater` / `cf-8` (8 territories),
`cf-1` (F5, DE 110%), `rq-2206` (F2), `rq-2208` (sync UK), `rq-2210` (conflict response),
`r-ember` / `r-switchback` / `r-harbour-lights` (S2-3, F1).

## Overview

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 1 | A **workspace home** — the organisation's counts, each the way into its tab | S2 Overview (S1-1's shape) | a `DetailPage` of Harbor Music on its landing facet: the band names the organisation (IPI, society, works), a `DetailOverviewGrid` of six `FacetCard`s, one per tab. No declared "home" form exists; an organisation is the record the counts are true of |
| 2 | Each count **opens its list already filtered** ("3 missing" → Registrations on Missing) | S1-1 acceptance | the tile opens the tab on its default reading. A `RecordIndex` reading is not addressable, so no link can land on one |

## Works and the work page (S2-1, S2-2)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 3 | A **chain of title** read as a chain — writer → publisher → sub-publisher → collector, branching by territory | S2-1 | a `RecordIndex` of hops (To, Hop, From, Agreement, Interest, Rights, Territory, dates, Basis, Source, Tier), one **reading per writer** so each chain reads end to end. No sequence or tree component; a branch (Harbor → PRS outside DACH, Harbor → Rhein → GEMA in DACH) is two rows, not a fork |
| 4 | The chain is **derived** (agreements + claims), not stored | S2-1, data model | `chainOf()` in `data.ts` walks writer credits → publishing agreements → owning claims → sub-publishing claims → the collecting party's society. Belongs in `resolve.ts` beside `controllers`. A publisher with no writer on file starts its chain at "No writer on file" (Last Ferry Out's Silverbirch half; Ember Season after Ana denied the credit) |
| 5 | **Shares by right type and territory, writer and publisher as two lines** | S2-2 | the Shares facet: a reading per territory; in it one row per right × share type ("Writer share", "Publisher share"), holders as an `entities` cell (each with share and source), the total from `shareTotals`, who collects there, the society convention. No component draws a share bar or a writer/publisher split; the two lines are two table rows |
| 6 | A **share state** — Whole / Overclaim / Gap | S2-2, invariants | no status family holds it. Whole → `claim:Resolved`; Overclaim or Gap → `conflict:Open`, the figure beside it saying which |
| 7 | The **society convention** as data | S2-2, data model ("stored as a society rule, not hardcoded") | `conventionOf()` in `data.ts`: society by territory and right, its writer/publisher split as words. **Illustrative** — GEMA 8/12–4/12 performance, 60/40 mechanical; PRS ≥50/≤50; MCPS and The MLC pay through the publisher; SACEM thirds; sync "negotiated directly". Rights ops must confirm each; the graph has no society-rule table |
| 8 | A **territory picker** on the shares (Blokur's) | S2-2, pattern 4 | readings, one per country the work's claims or conflicts name, plus GB and US. Not a picker: a country nobody claims in is not offered |
| 9 | The **territory reading** — "In sync in all territories" | S2-1 (Blokur 43–50) | an `Alert` as the shares index's `note`: success when `shareTotals` is Whole in every territory read, danger naming each that is not ("Germany (Publisher share · 110%)"). The same sentence is a fact on the Overview tile. Only the territories read are checked |
| 10 | **Tier per claim** | G-2 | `tierOf` answers per asset (and use): every claim row, hop and share line carries the work's tier; the claim's own weight is its **source**, sortable by precedence (1–6) — same as S1 catalog gap 3 |
| 11 | A **combined publisher share** column on the works index | G-3 | "Harbor's share" — Harbor's own largest standing ownership claim (world where it has one). Never a rights total across sides |
| 12 | Work **revenue** | — | `Asset.revenue` on a work is read as composition revenue; the model does not say which side a work's revenue is |

## Claims — add, correct, withdraw (G-1, S1-3 on the composition side)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 13 | A **territory set** field | pattern 4, S1-3 | a `choice` of seven sets the fixtures use (World; World excl. DE, AT, CH; DE, AT, CH; DE; GB; US; FR). `as: "country"` holds names, the graph holds codes (S1 catalog gap 14) |
| 14 | **Evidence upload** in the claim form | S1-3 | `UploaderDocument` + `UploaderFileRow` inside the `FormDialog`, files held by the dialog; only names reach the claim's `evidence` |
| 15 | The **state a claim is written in** and the conflict it opens | S1-3, invariants | `writeClaim()` asks `shareTotals` ahead of the write (the resolver's own count, one party's largest claim) and stores the claim **Contested** with an Overclaim opened where it passes 100%. The resolver should do this on write |
| 16 | **Withdraw** a claim | G-1 | a withdrawal row (`state: Withdrawn`) that supersedes the claim through `addAssertion` — the old row stays Superseded. A conflict the claim alone kept open closes, its reason the withdrawal. Whether a party's withdrawal closes a conflict or only proposes it to ops is a policy call (F5 says ops resolve) |
| 17 | Another party's claim **cannot be edited** — and says so | G-1, roles | its row's Correct is `unavailable`: "Only Ben Songs corrects its own claim. Answer it from Conflicts." |

## Recordings to link (S2-3, F1 step 4)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 18 | **Suggested matches** with confidence and why | S2-3 (Songtrust monitor) | the graph holds one recording-link suggestion (`MERGES` m-2, Switchback); read by ISRC/ISWC, plus one of the workspace's own in `data.ts` (Ember Season → Ember Season, 91%). Suggestions belong in the graph's matching output, per publisher |
| 19 | A suggestion to a work **another publisher holds** | S2-3, roles | shown, its Accept `unavailable`: "Switchback is Silverbirch Publishing House's work: only a publisher holding it confirms the link." A real case: should Harbor be shown Silverbirch's suggested links at all? |
| 20 | **Reject** a suggestion | S2-3 | held for the session in `data.ts`; the graph has nowhere to store a rejected match |
| 21 | **Bulk confirm** (Gmail-style) | S2-3, BMAT | the index's selection: "Accept matches" over the held rows Harbor may confirm |
| 22 | F1's new recording (Harbour Lights) has **no work to suggest** | F1 step 4 | it is listed (not earning, T1) with no suggestion; Link manually is the way, offering Harbor's works only. The fixtures hold no "Harbour Lights" work |
| 23 | A link written **as a claim** with its method | S2-3 | `linkRecording(…, "Publisher confirmed")` stores the method on `embodies[].source`; a link is not an assertion in the model, so it has no tier, time or supersede chain of its own |

## Registrations (S2-4)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 24 | **Registrations** in the model | S2-4 | none in `model.ts`/`fixtures.ts`: 11 rows (4 works × PRS, GEMA, SACEM, ASCAP) held in `data.ts`, with file, sent, acknowledged, society work number, reason and the next-CWR flag |
| 25 | **Generate CWR** that includes the flagged works | S2-4 | the page action holds a `ConfirmationDialog` naming the file and the societies; commit marks every flagged row Sent in `CWR 3.1 HBM-2610-0N`, today. No file is written; nothing reaches the graph |
| 26 | The action when **nothing is flagged** | S2-4 | a page **action** cannot be `unavailable` (only a `Command` can — same as S1 catalog gap 10), so the action is not offered until something is flagged |
| 27 | **Error state**: a failing acknowledgement feed | design brief, states | a danger `Alert` as the index's note when the GEMA CWR feed (`FEEDS` f-5) is Failing: a registration still Sent there may already be acknowledged |

## Clearances (S2-5)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 28 | A **clearance matrix** (uses down, scope across) on the composition side | pattern 3, S2-5 | a `RecordIndex` of Harbor's answers — asset × use × territory (US, GB, DE) — readings by use, filters by territory, answer and kind; each row the `clearance:*` badge, the scope that decided it and the decided-by line. No matrix component |
| 29 | **Only the publisher's own share** on a video sync | S2-5 | `clearanceOf(video, "Sync")`'s composition answers filtered to `party === p-harbor`. The master side and Ben Songs' answer are not drawn. The resolver has no "answer for one party" read; the page filters |
| 30 | Territory of a grant | G-4 | the same seven-set `choice` as claims (gap 13) |
| 31 | AI training **before** other AI uses | S1-6 on this side | Grant on AI derivative is `unavailable` until Harbor's AI training answer is Granted there |
| 32 | **AGR-101 §11.3** — AI uses need the writer's written consent | data | every AI grant Harbor writes carries the condition "Writer's written consent — AGR-101 §11.3"; nothing checks the consent exists. The grant model's `conditions` are words, not a check |

## Requests (S4 inside S2; F2 step 4)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 33 | One **approval card** per inbox item | pattern 8, S4-1 | a `CollectionPage` row per item and a `DetailPage` per item (Metadata of FactCards: the request, Harbor's answer now on each work, the conflict, the counter, the decision). No card shape that adapts its actions by type; the commands are chosen by type in `requestCommands()` |
| 34 | **Approve** writes a grant | S4-3, F2 | `addGrant` at the request's scope (catalogue → Harbor's catalogue; asset → the work), composition side, allowlist of the requester, its territory and window, decided by Elena Marsh for Harbor Music under AGR-101 §4.2 + the inbox id, then `setRequestState(Approved)` |
| 35 | **Decline** — denied or merely unanswered? | F2 step 5 ("needs review elsewhere") | decline writes a **Deny** grant for that partner, so Harbor's works read Denied for Cadence AI rather than Needs review. If F2 means a decline to leave "needs review", the denial should not be written — a policy call |
| 36 | **Counter** | S4-3 | a `FormDialog` (territory, until, licence model, note); the terms are held in `decisions.tsx` and shown on the request page; nothing is granted. The model has no counter-offer |
| 37 | A **conflict response** answered | S4-1 | "Respond with evidence" opens the conflict's Counterclaim; "Withdraw claim" withdraws Harbor's claim and sets the request **Approved** — the `request` family has no Responded/Answered state |
| 38 | **Delegate** | S4-3 | `unavailable`: "No delegate is set up for Harbor Music." No delegate model for organisations |
| 39 | **Notifications**, digest, escalation | S4-4, S4-5 | not drawn: no notification surface. Escalated items are read as owed (Needs decision reading) |

## Conflicts (S2-6, S2-7, S2-8; F5)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 40 | A **conflict card** — every claim side by side, total vs 100% | pattern 6, S2-6 | the Claims facet: a `RecordIndex` of the claims with source and tier, its note an `Alert` "Claimed 125% of 100%". Side-by-side columns per party are not a component |
| 41 | A counterparty's claim that is **not in the graph** (cf-8: Meridian's 25%, from its own tenant) | S2-6, S5 sharing | `cf-8.claims` names only Harbor's row; Meridian's reported claim is held in `data.ts` (`reportedOn`), its share shown (shared), its agreement "private to Meridian Music Group" (private). The conflict model should reference contributor-lane claims |
| 42 | **Accept the resolved state territory by territory** | S2-7 | the Territories facet: one row per territory, held rows → "Accept the current state" writes `updateConflict(id, { accepted })`; accepting FR and DE on cf-8 closes those two, six stay open. Accepted everywhere, the conflict resolves. Blokur's checkbox list is the index's selection |
| 43 | **Current state next to your claim** | S2-8 | two `FactCard`s in a `SectionRun` under one `TitledSection`. No paired comparison component (same as S1 catalog gap 5) |
| 44 | The **summary table** — publisher, IPI, chain of title, society, share per right | S2-8 | a `RecordIndex` in the Counterclaim facet; the chain as a sentence ("Ana Lindgren → Harbor Music → Rhein Edition (DE, AT, CH)"); shares per right read in the conflict's first territory. A contributor's chain is "Not shared by its contributor" |
| 45 | The **four-step tracker**, the same for both sides | S2-8, S1-13 | `Stepper` + `Step` over `COUNTERCLAIM_STEPS` under a `TitledSection`; `conflict.step` drives it, so both sides read one tracker. The stepper is "in review" in the system |
| 46 | **Evidence** on a conflict | S2-8, F5 step 4 | no home in the model (only `Assertion.evidence`, and superseding Harbor's claim to attach a file would break the conflict's claim ids). Held in `data.ts`; filing it moves the tracker to "Evidence from counterparty" (step 3 of 4) and the conflict to Open — with Sureel to resolve |
| 47 | **Each step notifies the other party** | S2-8 | an info line over the evidence ("Each step change notifies Ben Songs and Sureel rights ops"). Nothing is sent |
| 48 | **Resolve** is not the publisher's | roles ("Resolve a conflict: respond only") | the command is in place, `unavailable` with the reason — never hidden |

## Decided here rather than asked

1. The S2 address is `#/pro/rights/<page>/<id>/<facet>`; a work's facet segments are slugs
   (`chain-of-title`). The recording link out is the catalogue's `#/pro/catalog/tracks/<id>/rights`.
2. "My works" are the works Harbor Music holds any standing claim on (4: Northbound, Tidewater,
   Last Ferry Out, Ember Season). Silverbirch's works are not listed, but reached where they meet
   Harbor's (Switchback's suggested link).
3. A conflict response withdrawn or evidenced is the only conflict write Harbor makes; ops resolve.
   Accepting the current state everywhere resolves it — a party agreeing with the graph needs no ops.
4. Decisions are stamped with the clock's hour on the fixtures' today (20 Oct 2026).
5. F5 as written: on `cf-1`, Harbor (the party whose GEMA acknowledgement claims 60%) uploads
   AGR-205 — Rhein Edition's sub-publishing agreement, to which Harbor is a party — as its evidence.
6. A date given in a form is held as its day (`dayOf`): the date field hands back a moment later
   than the fixtures' today, and the resolver's `live()` would read a claim or grant dated today
   as not yet live.
7. A new claim is stored Contested and opens an Overclaim only where IT is the claim counted
   (Harbor's largest there) and no open conflict already holds the territory — correcting the
   world 50% on Northbound does not open a second DE conflict beside cf-1.
