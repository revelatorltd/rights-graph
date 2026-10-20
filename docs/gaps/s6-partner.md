# Gaps — S6 Partner portal (Sureel)

What the Partner portal (`src/surfaces/partner/`) asked of the design system and did not find.
Nothing here is drawn with markup of its own: each gap is drawn with the nearest declared form,
named in the last column, until the system decides it.

Readers, switched by the shell's persona control (`?persona=`): **Cadence AI** (AI platform, the
default), **Openwave Studios** (DSP), **GEMA** (society), **Voxa Voice** (AI platform, F3's
paused licence), **Tessellate** (AI platform, invited — the portal's empty and refused states).

Pages: `#/partner/overview` · `organisation` (`/apply` covers the shell with the onboarding
wizard) · `lookups/<id>` · `requests/<id>/<holders>` · `usage/<id>` · `keys` · `sandbox` ·
`webhooks/<id>` · for a society `registrations/<workId>` · `acknowledgements`.

## The product

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 1 | **Sureel's mark and accent through white-label tokens** — the same components wearing another company's brand | Design brief, "Sureel's surfaces (S5–S8)" | `ORGANIZATIONS.fieldhouse.art` stands in as the workspace mark; the accent is Revelator's. The shell has one mark slot, the workspace's, so there is nowhere for the PRODUCT's mark (Sureel) beside the ORGANISATION's (Cadence AI): the workspace is the partner's name over Sureel's stand-in mark |
| 2 | **The persona switch updating the product** around the page | — | `usePersona()` outside the shell reads the address once; the shell's own switch only updates what is inside it. A null `Follow` child inside `AppShell` hands the chosen persona back out so the workspace and nav redraw. (Pro's index has the same issue.) |
| 3 | Marks for **an API key** and **a webhook** | S6-2, S6-7 | the "Developers" destination wears `settings`; keys and endpoints are rows with no mark (`as: "reference"`). Reported, not replaced by a look-alike |
| 4 | **A home/dashboard page form** for a workspace that is not a record | Overview | the partner's own organisation as a `DetailPage` landing on `DetailOverview` + `FacetCard`s (keys, requests in flight, look-ups this month, webhooks health, usage) |
| 5 | **A metric for API volume** (look-ups per month) to draw as a trend | Overview | `METRICS` is a closed set of streams/revenue; no TrendCard is drawn. "This month" is a FacetCard figure (API calls + portal look-ups) |

## Onboarding — S6-1

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 6 | **Terms acceptance** — a consent tick with the version accepted | S6-1 | a `choices` field with one option ("I accept the Sureel Partner Terms v2.1"), owed, with a `notice`; shown afterwards as `terms:Agreed` |
| 7 | **An application's state** — submitted, under review, approved | S6-1 | `approval:Not Approved` / `approval:Approved` on the Organisation record; `account:Invited` before anything is submitted. No `application` family |
| 8 | **A conditional field** — territories only when "Selected territories" is chosen | S6-1 | both fields always shown; the territories field's help says when it applies, and `ready` refuses a submit with "Selected" and no territory |
| 9 | **Sureel's approval** (which issues the keys) | S6-1 acceptance | `approveApplication(partner, actor)` is exported from `partner/data.ts` for the Graph Console (S7) to call; the portal shows the command as `unavailable: "Only Sureel rights ops approves…"`. Approving mints a sandbox and a production key with the scopes the partner kind needs |

## API keys and sandbox — S6-2

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 10 | **A key's state** — live, rotated (works until…), revoked | S6-2 | no family; "Stops working" (date) and "Replaced by" (identifier) columns. Rotate is a `ConfirmationDialog` |
| 11 | **Showing a secret once** after it is issued, with a copy | S6-2 | not drawn — the index never shows a secret; the key id is a reference |
| 12 | **Docs that link out** | S6-2 | header actions `Open the API reference` whose `opens` is an external URL — the shell has no external-link affordance distinct from an address |
| 13 | **A file the reader saves** — a receipt, a test catalogue, a proof bundle — named by the product | S6-6, S8-3 | the system has no download command: `download()` in `working.ts` `follow()`s a `blob:` URL of octet-stream bytes, so the browser saves the file under a name of its own choosing |

## Clearance look-up and receipts — S6-3, S6-6

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 14 | **A look-up form whose answer appears in place** (search → answer → receipt) | S6-3, design screen 9 | the look-ups are a `CollectionPage` (history); "Look up clearance" opens a `FormDialog` (record field searchable by title, ISRC or ISWC; use; territory) and lands on the look-up's `DetailPage` |
| 15 | **A record field holding two code standards** (recordings by ISRC, works by ISWC) | S6-3 | one `as: "record"` field with no `standard`; each option's `code` is its ISRC or ISWC. The search does match codes |
| 16 | **The clearance matrix / two-sided panel** for one answer | Patterns 2–3, G-3 | a `FactCard` for the master and one per controlling publisher, each with answer, why, decided at, decided by (G-5), grant territory and dates (G-4), controlled by + source (G-2) and the tier |
| 17 | **"The answer changed since the receipt"** — a receipt against the live answer | S6-6 | a warn `Alert` on the look-up; on a licence request each track offers `Check again`, which mints a new receipt |
| 18 | **Resolver reasons safe for a partner** — `resolve.ts` names every partner on an allowlist ("for Cadence AI, Lyra Labs, Voxa Voice") | S6-3, roles ("cleared uses only") | `seenBy()` / `reasonFor()` in `partner/data.ts` rewrite the list to the reading partner before it is shown or frozen into a receipt. The resolver should say this itself |
| 19 | **Permission-denied** for a partner with no `clearance:read` scope or not approved | States | the create action is withheld and the same command stands in `more` with `unavailable: <why>`; the index's `empty` says why. A `PageAction` has no `unavailable` of its own |

## Licence requests — S6-4, F2

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 20 | **One ask fanning out to several holders' inboxes** | S6-4 | asks are read back from `REQUESTS` grouped by partner, use, start and purpose; the ask page is a `DetailPage` with two facets — Tracks (per-track answer + receipt, F2 step 5) and Rights holders (each request's `request:*` badge and decided-by line) |
| 21 | **A setter that adds a request** | S6-4 | `fixtures.ts` has none: `requestLicence()` pushes onto the exported `REQUESTS` array in place and calls `wrote()` (so S4 inboxes reading `REQUESTS` see it). `fixtures.ts` should export `addRequest` |
| 22 | **An aggregate state of several requests** on one row | S6-4 | a `BadgeGroup` of `request:*` badges with counts in the index; the record header takes the same as `RecordState[]` |
| 23 | **A summary sentence over an index** ("1 of 10 cleared on both sides. Waiting on Harbor Music.") | F2 step 5 | the `RecordIndex` `note` |

## Usage and provenance — S6-5

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 24 | **An upload in a dialog** — a file plus what it reports | S6-5 | `FormDialog` holding a `choice` field and an `UploaderDocument`; the file is held in the dialog's own state (the draft cannot hold a `File`) and `ready` waits on it |
| 25 | **Reading the file** | S6-5 | not done: any file validates the CD-7 sample (10 rows: 7 matched, 2 unmatched, 1 suggested). Rows carry `match:*`; provenance rows carry the GENESIS proof event (verifiable in S8) |

## Webhooks — S6-7

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 26 | **A delivery's outcome** — delivered, retried, failed | S6-7 | no family; the response is text ("200 OK", "503 — retried, 200 OK") beside "Arrived after" (duration). The endpoint's own state is `feature:Enabled/Disabled` |
| 27 | **The 60-second limit** as a judged value | S6-7 acceptance | an "Over 60 seconds" count on the index and the overview; per delivery only the duration |
| 28 | Deliveries **derived from the graph** | S6-7, F3 | `licence.paused` / `licence.revoked` are read off `GRANTS` as they are now — Voxa's Voice/NIL grant paused by cf-6 shows as delivered on 14 Oct; if the console revokes it, `licence.revoked` appears |

## Society view — S6-8 (GEMA)

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 29 | **A society's own work number** as an identifier standard | S6-8 | `standard: "id"` — no society-work-number standard |
| 30 | **Acknowledged share against the graph's** for one party in one territory | S6-8 | two percent columns ("Acknowledged share", "Graph holds in DE" — the registrant's resolved claims only) and the conflict's badge; the detail repeats them with the total claimed |
| 31 | **An ack file's state** | S6-8 | `batch:Matched`; mismatches and the conflicts they opened (or found open — Northbound's cf-1) as columns. Sending one writes each acknowledged share as a `Society acknowledgement` claim (G-1) and opens an Overclaim/Gap via `addConflict` where it disagrees (Last Ferry Out, 60% vs 50% in DE) |
| 32 | **An index inside a fact page** (claims in DE under the registration's facts) | S6-8 | a `RecordIndex` inside a `TitledCard` inside `Metadata` |

## Decided here rather than asked

- **Five personas, not three.** Voxa Voice is the only partner F3's `licence.paused` reaches, and
  Tessellate is the only one that can show the invited portal (every empty and refused state).
  Cadence AI stays the default.
- **The society and the licensee see different nav**: a society has Registrations instead of
  Clearance and Usage; an address to the other kind's page lands on Home.
- **Every answer is a receipt**, Granted or not (S6-3 says "with a receipt ID" for all three).
  Receipts are minted as `CLEARANCE_RECEIPT` proof events in `partner/data.ts` (`ISSUED`); S8
  verifies them alongside the shared `PROOF`. CD-7's Paper Moons and Northbound receipts are the
  shared log's `rcpt_7Q2M-9F4K-CD7A` / `-CD7B` (F6). Minted events take numbers that follow their
  time, so the log stays append-only.
- **A request resolves at one country**: "World" where the territory is the world, else its first
  code — `clearanceOf` answers one country at a time.
- **Receipts name the holders; the public portal never does.** The downloaded receipt is the
  partner's own evidence (answer, reasons, proof fields); S8 shows only the event.
