# Gaps — S9 Graph APIs and feeds

S9 as a working API (`src/api/`): one handler table (`handlers.ts`) carried by two transports —
in the browser, `api.request(method, path, body, key)` on the SESSION's graph (`client.ts`), and
real HTTP on the dev server, `/api/*` mounted by the `graph-api` plugin in `vite.config.ts` and
loaded with `ssrLoadModule` (`server.ts`). The dev server's graph is its OWN copy of the fixtures
plus whatever curl wrote since: the browser session and curl never see each other's writes. A build
carries no server. The OpenAPI 3.1 document is generated from the table (`openapi.ts`, served at
`/api/openapi.json`), webhooks included (`webhooks.ts`). `scripts/api-check.ts` asserts the doc's
worked example through the API.

Surfaces: `#/partner/api` (S6 — API explorer: every endpoint, `…/api/<endpoint>` to send one with
the partner's key, `…/api/<endpoint>/<call>` for the answer) and `#/console/traffic` (S7 — S9
traffic across partners). The map's S9 row opens the explorer.

## The design system

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 1 | **A code block** — a multi-line literal: a JSON response, a request body, a curl command that wraps | S9 (developer portal, S6-2) | `Code` is an inline literal (`inline-flex`, `leading-none`), so it cannot hold a JSON document. The response is drawn as a `RecordIndex` of its fields — path, then the value in `Code` — and curl as one `Code` that wraps in a `FactCard`. A request body is edited in a `longtext` field. Proposed: `Code` gains a `block` axis (pre-wrapped, scrolls inside, copy in its trail), or a `CodeBlock` entry |
| 2 | **An HTTP status as a state** — 2xx / 4xx / 5xx at a glance, in a call log | S7 traffic, S6 explorer | the status is text (`200 OK`) or `Code`; the log's readings split Answered / Refused. No family fits (`feature`, `verification`, `trust` mean other things). Proposed: a `response` family — Answered (success), Accepted (info), Refused (warn), Failed (danger) |
| 3 | **A latency** — milliseconds, and a percentile | S7 traffic; read-model targets (P95 < 400 ms) | `formatDuration` writes seconds; latency is a `count` column named "Latency, ms" and P95 is a count with "ms" as its noun in an Alert's title. Proposed: `as: "latency"` (ms, two decimals) and a percentile figure for `StatCardRow` |
| 4 | **A method chip** — GET / POST beside a path | S6 explorer | `Code` with the method; the path in `Code`, or as an `identifier` fact in the record's facts line, where it truncates mid-path (`/v1/as…tive`) — the long-value gap (gaps.md B16) |
| 5 | **A request builder** — parameters by where they go (path, query, header), a key picker, a body, sent from a dialog and answered on the page | S6-2 "API reference, sandbox" | a `FormDialog` with one `text` field per parameter, the key as a `choice` (with "No key", to see the 401), the body as `longtext`; commit sends and opens the call's own address. Nothing marks a field as path / query / header but its help text |
| 6 | **The API's wire values are read as a page's** — ISO 8601 dates, a Merkle path, a `$1` in a route pattern, an `as` narrowing an untrusted JSON body | — | `check-page` reads `src/api/` as page code. Met without evasion: days go on the wire as `Date`s (UTC midnight of the graph's day, `dayOnWire`) and JSON writes them; untrusted bodies are read through `fieldsOf` rather than cast. A wire layer may want its own exemption, or the system its own `formatWire` |

## The graph, and what the API had to decide

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 7 | **Keys for the parties that WRITE** — a label through Revelator Pro, a publisher, a contributor | S9-1 | `PARTNERS[].keys` holds partner keys only, so `HOLDER_KEYS` lives in `handlers.ts`: `hk_live_kestrel`, `hk_live_harbor`, `hk_live_meridian`, with `claims:write`, `clearances:write`, `attestations:write`, `links:write`. No partner key carries any of these but `provenance:write` (Cadence) and `registrations:write` (GEMA, which may write society acknowledgements as assertions) |
| 8 | **Key rotation reaching the API** | S6-2 | the Partner portal rotates keys in its own state (`partner/data.ts`); the API reads `PARTNERS[].keys`, so a rotated-in key is answered 401 and the explorer offers the graph's keys, not the portal's |
| 9 | **Sandbox keys answering the sandbox's test catalogue** | S6-2 | a sandbox key (`ck_sbx_…`) reads the real graph here; the QZTST test codes are not served. The explorer offers the production key first |
| 10 | **A home for provenance records** | S9-1, data model "Provenance records" | the model has no Provenance entity: `RecordProvenance` keeps them in `PROVENANCE` in `handlers.ts` and seals a GENESIS proof event; no surface reads them yet |
| 11 | **Setters that return what they stored** | — | `addGrant` and `addAttestation` return nothing; the API reads the new id back as `GRANTS[0]` / `ATTESTATIONS[0]` |
| 12 | **A link's portion** | S9-1 LinkRecordingWork | `linkRecording` writes `Full` only; a Partial or medley-segment link is stored as Full and the item says so |
| 13 | **An attestation flagged for want of authority** | data model "Authority" | `Attestation` has no flag: one made on someone's behalf without an agreement between the two naming the clause is stored `Requested` (asked of the person), not `Signed` |
| 14 | **Held writes — an identifier that fails its format, an asset not found** | Invariants: "stored as invalid, not linked" | kept in `HELD` in `handlers.ts` (the graph has no unlinked-claim store), answered `invalid` / `unmatched` per item |
| 15 | **Check digits** | Invariants: identifier formats | the fixtures' own ISWCs and UPCs FAIL their check digits (e.g. T-912.448.301-6 computes 8). So check digits are enforced on WRITES of codes the graph does not hold yet; a code it holds is read as held; look-ups check format only |
| 16 | **Receipts the Verification portal knows** | S8-1, S6-6 | the API mints its own CLEARANCE_RECEIPT events (from seq 890001, apart from the portal's); `GET /v1/proof/events/{id}` verifies them, but S8's page reads the shared log and the portal's receipts only, so an API receipt is not found at `#/verify/<receipt>` |
| 17 | **Real hashes** | Proof Log | event hashes in the fixtures are invented, so a chain cannot be recomputed; `/inclusion` builds a real Merkle path over the batch with a stand-in hash (said in the payload), and the TSA token is illustrative |
| 18 | **Webhook delivery** | S9-7 | payloads are built and returned in the 202 (`webhooks`, `confirmation`) and kept for polling (`GET /v1/commands/{id}`); nothing is POSTed to the endpoints the Partner portal registers |
| 19 | **Splits by right type when none is asked** | S9-3 | collection depends on the right type (Rhein collects mechanical and performance only), so without `right_type` the answer gives owners and leaves `collected_by` null, saying why |
| 20 | **Bulk feeds** — DDEX ERN / MWN, CWR in and acks out, SFTP | S9-6 | not built: the API takes JSON commands only. The contributor portal's batches stand for the feeds |

## Decided here rather than asked

- **Effective clearance defaults to World**, not the resolver's US: a caller that names no territory
  is asked everywhere, the stricter read. Answers are `granted` / `denied` / `needs_review` with a
  `reason_code` (`composition_not_cleared`, `missing_work_link`, `paused_by_dispute`,
  `grantor_without_authority`, `artist_opt_out`, `training_not_cleared`, `ai_default_deny`, …).
- **A partner key reads its own clearance only**: `partner=` naming another partner is 403, and
  reasons are asked with `audience: "partner"` so no other partner on an allowlist is named. A
  holder key may ask for any partner.
- **A key writes for its own party**: `granted_by` and `attestor` must be the key's holder.
  An assertion may name another party (a society acknowledges a publisher's share).
- **Splits read two totals**: every standing claim (where DE shows 110%, `overclaim`) and what is
  paid while the conflict is open (uncontested claims only — rows 1–3, as the doc says). A party's
  claims never add to each other. Collection: a Collects edge held "of" an owner's share, else the
  owner's own Collects edge, else the owner through its society.
- **An overclaim on write opens a conflict** (`conflict.opened`) with revenue at risk = the asset's
  12-month revenue × the share claimed — a placeholder until the resolver says how risk is weighed.
- **Writes are answered 202 even when every item is rejected**; the request is refused outright
  only for no Idempotency-Key (400), not a command (400), over 500 items (413), a reused key with
  another body (409). Validation is per item: `applied`, `flagged`, `invalid`, `unmatched`, `rejected`.
- **Verify needs a key, any key; `/v1/proof/keys` and `/openapi.json` need none** — the doc says
  "partner-authenticated", and the public keys must be readable by S8 without an account.
- **The morning's traffic is real**: the console's log opens with fourteen calls run through the
  handlers when the session starts (stamped 07:02–10:04), so every status and latency is theirs.
- **The opaque-id and receipt-id functions are copied** from `partner/data.ts` (so an asset has the
  same `ast_…` id in both) rather than imported: the API must load on the dev server without the
  design system's React package.
