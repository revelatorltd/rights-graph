# Gaps — S8 Verification portal (Sureel, public)

What the Verification portal (`src/surfaces/verify/`) asked of the design system and did not
find. Nothing here is drawn with markup of its own: each gap is drawn with the nearest declared
form, named in the last column, until the system decides it.

Reader: anyone — an auditor, a court, a lender, a regulator — with no account (F6).

Pages: `#/verify` (proof batches, where a visitor lands) · `#/verify/<receipt or event id>` ·
`#/verify/keys` · `#/verify/archive` · `#/verify/archive/<owAssetUri, encoded>`. Try
`rcpt_7Q2M-9F4K-CD7A`, `612`, any receipt from the Partner portal, or a genesis event from a
provenance upload (e.g. `882067`).

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 1 | **A public, account-less page** — no rail of destinations, no account | S8 ("Web, no account") | the system has no signed-out or public shell: `AppShell` requires a `user`. The account is "Visitor — No account needed to verify", whose one command opens the Partner portal; one destination ("Verify") with three pages |
| 2 | **Sureel's mark** | Design brief, white label | `ORGANIZATIONS.fieldhouse.art` as the workspace mark, workspace "Sureel Verify" (same as S6 gap 1) |
| 3 | **One input on the page** — paste a receipt or event ID, press Verify | S8-1, F6 step 2 | no declared page holds a lone form: "Verify a receipt" is the primary action of the batches page (and "Verify another" on every event) opening a `FormDialog` with one text field; it navigates to `#/verify/<id>` |
| 4 | **A not-found state for an address** | States, S8-1 | a `DetailPage` named by what was pasted, status `verification:Failing` ("missing or wrong"), holding an `EmptyState` with what an ID looks like and the dialog to try again. An empty paste cannot be submitted (the field is owed) |
| 5 | **A verdict panel** — "Verified" with event time and signing key, read first | S8-1 acceptance | the record header: `verification:Verified`, the event type, its number and its recorded time as facts; the signing key is the first fact of the Signature card |
| 6 | **The privacy line said on the page** — only type, opaque IDs, scope, use, time and hash | S8-2 | an info `Alert` on every event: "Only the event's type, its opaque IDs, its scope and use, its time and its hashes. Amounts, attribution percentages and private terms never leave the private side." The page has no field that could carry anything else |
| 7 | **A hash shown whole** (a verifier compares characters) | S8-1 | facts with `standard: "id"` — the identifier chip truncates the middle and carries its own copy |
| 8 | **A mark for a proof event, a batch, a key** | S8 | events and imported records wear an `Avatar kind="document"` named by their type; batches and keys are references with no mark. Reported, not replaced |
| 9 | **The proof bundle as a named download** | S8-3 | `Download proof bundle` builds the JSON (public fields, signature + public key, Merkle path to the root, RFC 3161 token, the four offline steps) and hands it over through `download()` — the browser names the file (S6 gap 13) |
| 10 | **Merkle batch, root and TSA token** in the model | S8-1 | `ProofEvent` carries only `batch`; `verify/data.ts` derives the root, the inclusion path, the batch's sealing time (five minutes after its latest event) and a stand-in TSA token. The batches page doubles as the public transparency log the data-model doc proposes |
| 11 | **The on-chain archive, read-only** | S8-4 | a `CollectionPage` of imported records (the shared log's 612 plus three added here) and a `DetailPage` per owAssetUri: original transaction hash, block, mined time, payload CID; "In the Proof Log" with the IMPORTED event and the replay check. A read-only state is an info `Alert` — no `archived`/`read-only` family |
| 12 | **An address segment holding `ow://…`** | S8-4 | the owAssetUri is `encodeURIComponent`ed into one segment and decoded on read; a bare id (`9b2f-44c1-a7e0`) or the transaction hash also finds it |

## Decided here rather than asked

- **The landing page is the transparency log** (proof batches), not an empty search: everything on
  it is public by design, and its primary action is the paste.
- **Verified means intact**, not "cleared": the page never shows the clearance answer a receipt
  carries — the auditor holds the receipt, and the bundle's first offline step hashes it against
  the payload hash shown here.
- **One portal reads both logs**: the shared `PROOF` and the receipts and genesis events the
  Partner portal minted (`ISSUED`), so a receipt downloaded in S6 verifies here (S6-6 acceptance).
