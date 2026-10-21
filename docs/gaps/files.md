# Gaps — Files: reading and download (S1, S1·T, S2, S5, S6, S8)

Files are now READ and HANDED OVER for real. `src/rights/files.ts` reads CSV (quoted fields, a
header row, comma / semicolon / tab), JSON, DDEX ERN and MWN (light, by element name, through
`DOMParser`) and CWR 2.1 fixed-width records (HDR, GRH, NWR/REV, SPU, SWR, PWR, ACK, MSG); it
refuses Parquet, PDF and zips with the reason. It checks rows against the graph's rules — ISRC
shape, ISWC check digit, IPI 11 digits, UPC/EAN check digit, ISO 3166 / CISAC TIS territories,
shares ≤ 100 per work, a start date on every rights edge — in the `ROW_ERRORS` shape (row, field,
value, problem). It writes CSV, JSON, a signed receipt (a real SHA-256 digest over canonical JSON),
a proof bundle, and a printable report. Sample files are in `public/samples/`, offered from every
upload step.

Where files move now: S5 upload wizard (file read, format answered from what it reads as, headers
drive the field mapping, corrected file re-checked, canned Q3 sample kept as "Use the sample
file"), failed-rows CSV (with the file's own columns), match-results CSV (index and batch); S6 usage
and provenance upload (rows linked by ISRC, title mismatches Suggested, unknown codes Unmatched),
receipt JSON, test catalogue CSV, CWR ACK upload (accepted, rejected with the society's message,
works not registered left alone); S8 proof bundle, batch root and public key downloads, and
"Verify a receipt file" (digest recomputed, event and event hash checked against the log); S1
rights report as CSV, or PDF through the print dialog; S1·T / S2 claim evidence keeps each file's
name, size and type.

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| F1 | **A download command** (gaps.md B6): a command that hands the reader a file under a name the product gives | S1-10, S5-3, S6-6, S8-3 | `check:page` reads every file under `src/` as a page and refuses an anchor made and pressed from code, so the two DOM touch-points (`saveBlob`, `printTable`) live in `platform/save.ts`, OUTSIDE `src/`; everything that decides the name and content stays in `src/rights/files.ts` and is checked. Proposed: `downloads: { name, type, make }` on Command and PageAction, drawn with the `download` mark, the system owning the anchor. `platform/save.ts` goes when it lands. |
| F2 | **A command inside a form row** — "Use the sample file", "Download a sample file" | S5-1, S6-5, S6-8, S8 | `Link` takes only an address, so these are `Button variant="inline"` with `onClick` beside the uploader. Proposed: `Link opens` takes a command as `follow()` does, or `UploaderDocument` gains a `sample: { name, make }` part. |
| F3 | **A file being read, then refused with its reason** in the uploader row | S5-1, S5-2 | `UploaderFileRow` phase `uploading` while it is read, `error` with `reason` when refused (Parquet, not CWR, no ISRC column, a changed receipt). Fits; shared in `src/rights/file-parts.tsx`. |
| F4 | **A machine date** in a written file (ISO 8601) | S1-10, S5-3 | `check:page` refuses `toISOString` and `toJSON`, and the formatters write for a reader. CSV dates go through `formatDate(…, "day")`; JSON dates are written by `JSON.stringify` (ISO). Proposed: a `formatDate(…, "iso")` grain, or a stated exemption for serialisation. |
| F5 | **A file field in a declared form** (gaps.md B12) | S1·T, S2, S6 | `UploaderDocument` beside the form's fields, its file held in the dialog's state, `ready` reading that state. |
| F6 | **Evidence facts on a claim**: the model keeps `Assertion.evidence` as names only | S1·T-?, S2-6 | The facts (size, type, format) are kept in `src/rights/files.ts` by file name (`keepEvidence`, `evidenceFacts`) and shown on the claim's Evidence card; lost on reload, and two files of one name share facts. Proposed for the model: `evidence: { name, size, type, hash, filedAt }[]`. |
| F7 | **Print as PDF** for the rights report | S1-10 | PDF is the browser's print dialog over a hidden frame (`printTable`); no file is generated. A real PDF wants a server render or a PDF writer. |
| F8 | **A signature the browser can check** | S6-6, S8-3 | The receipt's digest is real SHA-256 over canonical JSON, so a changed receipt is caught; the Ed25519 `signature` is still the stand-in value the log fixtures carry. |
| F9 | **Parquet** | S5-1 | Refused in the browser with its reason ("send it by SFTP or the API"); a fed Parquet batch keeps the feed's counts. |
| F10 | **CWR 3.x positions** | S5-1, S6-8 | Version read from GRH; records read with the 2.1 positions. A 3.x file whose layouts moved reads its ACK status and title, not its shares. |
| F11 | **Zipped DDEX** (`.zip` deliveries, as the feeds name them) | S5-1 | Refused ("zipped files are not opened here"). |
| F12 | **Mapping changes after a check** | S5-9 | The check reads the file through the mapping as suggested at upload (settled + suggested fields); remapping a header on Field mapping does not re-check a batch already received — resubmit the file. |

## Found in the graph's fixtures

- Every ISWC in `fixtures.ts` (`T-912.448.301-6`, …) and every UPC (`5063217409918`, …) FAILS its
  check digit. The CWR ack sample therefore carries the fixture ISWCs unchecked (the society
  upload does not run the ISWC rule; it matches by ISWC, then title); the contributor samples use
  valid codes. The fixtures want valid ones before any upload rule meets them.

## Decided here rather than asked

- A row error names the file's own line (the header is line 1), so it is the row a spreadsheet shows.
- Shares are summed per work (ISWC, else title) per kind; in CWR, writer and publisher PR shares
  are of the whole and summed together.
- A society's acknowledged share of the publisher side = the registrant's SPU PR share over every
  publisher's on the work (35.00 of 50.00 → 70%).
- Header matching: a field's own name is Completed; a known alias is Suggested at 96%; a near name
  (Dice over letter pairs × 0.9, ≥ 0.6) is Suggested; one field takes one header.
- The canned 88,412-row Q3 file stays only as "Use the sample file"; a read file's counts are its own.
- A corrected file that still fails stays at the schema check with its new errors.
