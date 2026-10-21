# Gaps — the docs library

The docs (`#/docs`, `#/docs/<kind>`, `#/docs/<id>`) are a library of specifications, architecture
and playbooks, modelled on the Ops prototypes' Playbooks (`docs/reference-playbooks.md`) and drawn
with the system's declared forms only: a `CollectionPage` index, a `DetailPage` per doc, sections as
`TitledCard`s holding `RecordIndex`es, prose as `Text multiline`, open items as a warn `Alert`.

| # | Asked for | FRD ref | Here, until decided |
| - | --------- | ------- | ------------------- |
| 1 | **A card grid of records with no picture** — the reference's playbook tile: number in the corner, an icon mark, title, the "when to use" line, "Applies to · Owner", chips (6 steps, 3 never-break) | Reference §1 | `RecordIndex.grid` with `picture: () => null`: the tile is the frame's image placeholder, and id, applies to, owner, count and updated ride one meta line. No mark, helper line, chips or corner number. The grid is meant for records "recognised by their picture"; a doc is not one |
| 2 | **An index that opens on its grid** with the list beside it | Reference §1 (grid is the default) | `RecordIndex` passes no `defaultView` to `RecordSet`, so the index opens on the table and the reader switches to the grid. `only: true` would drop the list |
| 3 | **A helper line under a row's name** — "SPEC-03 · Surfaces" under the doc's title, "Damage: …" under an invariant | Reference §1, §2 | the id is its own `identifier` column; the damage is a column |
| 4 | **Prose in a table cell** — acceptance criteria, an answer, a damage, a model table's description | Reference §2 ("cells wrap") | a cell is capped and truncated (no wrap, no title). A sentence longer than a short value is wrapped in `Explained`, so its whole text is behind the hint; `Explained` is meant for "how a figure was reached" |
| 5 | **A long record name** in the record header | — | the band truncates the title beside its actions (same as home #1); previous / next are drawn `iconOnly` to give it room |
| 6 | **A side column** on a detail page — the reference's "Never break", templates and open items beside the main column | Reference §2 | every section is stacked in `DetailOverview` in the reference's order; no main + aside form exists |
| 7 | **A table of contents and anchors** inside a long doc | Reference §2 (none there either) | none on screen; the Markdown export carries a generated contents with heading anchors |
| 8 | **An invariant's state** — a danger badge that reads "never break" | Reference §2 ("danger badge I1") | `Badge status="verification:Failing"` in an "If broken" column, the id as an identifier chip. Proposed: an `invariant` family (Holds / Broken), or a danger tone for an identifier chip |
| 9 | **A build state** for a requirement — Built / Partly built / Not built | — | text, with the product it is built in (`formatMeta`), and readings to filter by it. Proposed: a `build` family (settled / attention / waiting) |
| 10 | **A list inside an Alert** — several open items | Reference §2 | the items are joined as sentences in one soft warn `Alert`; the Markdown export lists them |
| 11 | **A question and its answer** as a pair | — | one soft `Alert` per question — info when decided, warn when open — titled with the state and the question, the answer as its body |
| 12 | **A checklist that is read, not answered** | Reference §2 ("real checkboxes, nothing saved") | a `CheckboxGroup` of `CheckboxField`s in a `TitledCard`, uncontrolled; nothing is kept |
| 13 | **A search bar on a small index** — three decision rules carry the full search, chooser and paginator | — | as the system draws it; an index of a handful of rows inside a card has no lighter form |
| 14 | **A download command** (Markdown files) | — | `more` on the index ("Download all specifications" …, "Download everything") and a page action on each doc ("Download as Markdown"), each `opens` a function that calls `download()` in `src/rights/files.ts` (same as gaps.md B6) |
| 15 | **A doc mark** — a kind of document drawn as a mark in an avatar | — | `Avatar kind="document" tone="muted"` holding the kind's `Icon` (`note`, `metadata`, `list-ordered`); at hand width the band draws it as a full-width square (gaps.md B15) |
| 16 | **A rail utility with pages but no rail destinations** — the docs product is its utility | — | the docs product has `destinations: []` and gives the `DOCS` utility from `family.ts` its library pages, so its section nav shows; on a phone the tab bar holds only More |

## Decided here rather than asked

- **Public content only.** Product specification and architecture, in the prototype's invented names;
  no commercial, deal or negotiation content, and no internal people. Owners are teams or roles.
- **Every requirement says whether it is built and opens the page that answers it**; one not built
  opens the page the doc describes. "Partly built" names its stand-in.
- **Steps open the pages where they happen**, in the product they are on; a step with no page of its
  own opens the playbook's prototype page.
- **One serializer** (`src/surfaces/docs/markdown.ts`) writes every Markdown file from the same records
  the pages draw: front matter (title, id, kind, the graph version, the date), headings, GFM tables,
  numbered steps, `- [ ]` checklists and `> [!WARNING]` for open items. A collection adds a contents.
- **The generated date is the graph's today** (`TODAY`), so the same export is the same file twice.
- **Previous / next stay within a kind**, as the reference's PB-00 / PB-02.
