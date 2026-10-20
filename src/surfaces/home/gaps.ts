/** GENERATED from docs/gaps/*.md by scripts/gaps.mjs — every gap a surface logged. */
export interface Gap {
  surface: string;
  id: string;
  asked: string;
  frd: string;
  here: string;
}

export const GAPS: readonly Gap[] = [
  {
    "surface": "the map (home)",
    "id": "1",
    "asked": "A long record name in the record header (a flow's or a question's full sentence)",
    "frd": "—",
    "here": "a short title on the band; the sentence in a soft Alert under it (same as RCC gap 9)"
  },
  {
    "surface": "the map (home)",
    "id": "2",
    "asked": "Prose in a facts card — a question and its answer, a decision and its reason",
    "frd": "—",
    "here": "a soft Alert for the question; FactCards for the options, which wrap tightly"
  },
  {
    "surface": "the map (home)",
    "id": "3",
    "asked": "Opening another product in a context — a link that lands in Revelator Pro as the Publisher",
    "frd": "—",
    "here": "the persona rides the query (?persona=publisher), so the link reloads the page into that context"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "1",
    "asked": "A two-sided rights panel: master left, composition right, always, each side a resolved reading over its claims",
    "frd": "Pattern 2, S1-2, G-3",
    "here": "a CardGrid columns={2} of four cards in two rows — \"Master, as resolved\" / \"Composition, as resolved\" (FactCards), then \"Master claims\" / \"Composition claims\" (TitledCards). Row-aligned by construction, not by a declared form; on a phone the grid's own collapse stacks master above composition"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "2",
    "asked": "A claim row: party, interest, share, territory chip, dates, source, tier badge, expanding to evidence and history",
    "frd": "Pattern 1",
    "here": "a SlotItem (party mark + name + one meta line: interest · share · territory · dates · source) with the claim:* badge in the trail; pressed, it opens a Drawer (the row's reveal) holding the claim in full, the resolved answer, the evidence and the supersede chain. The territory chip and tier chip are drawn in the drawer only — a row's trail holds one thing, and the meta line reads the territory as words"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "3",
    "asked": "Tier per claim",
    "frd": "G-2",
    "here": "the model computes tier per asset (and use), not per claim: the claims card carries the asset's TierChip in its trail, the drawer repeats it, and each claim shows its source and its precedence (1–6) instead"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "4",
    "asked": "A resolved reading by territory — \"World excl. DE: Publisher 100%, Writer 100%; DE: Publisher 110%, overclaim\"",
    "frd": "S1-2, G-4",
    "here": "FactCard facts, one per run of countries the resolver answered alike — the page asks controllers/shareTotals in every country any claim names plus one no claim names (\"everywhere else\") and gathers equal answers. No component draws a territory-keyed reading; the overclaim/gap is a word in the value, not a state (no status family holds Whole / Overclaim / Gap)"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "5",
    "asked": "The resolved answer next to the reader's own claim, with the reason where they differ",
    "frd": "G-1",
    "here": "the row's meta says \"Yours\" or \"Yours — the graph differs\"; the drawer holds a second FactCard \"Your claim, as the graph resolves it\" with the graph's answer and why. No paired \"Current state / Your claim\" component exists (the same one S2-8's counterclaim needs)"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "6",
    "asked": "A per-party resolved share (\"the graph pays Harbor 50% in DE\")",
    "frd": "G-1",
    "here": "resolve.ts answers share TOTALS and CONTROLLERS, not what each party is paid while a conflict stands. The page reads the party's own Resolved claims covering the country — the state the resolver left — and says that. A resolvedShare(asset, party, country, at) belongs in the resolver"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "7",
    "asked": "\"As of\" and \"as we knew it on\" pickers on the rights tab",
    "frd": "S1-12",
    "here": "two DatePickers, each in a composed Field with its label, in the Rights facet header's trail. No declared \"reading-time\" control; the trail has no rung for two labelled fields, so they may sit tall beside the header actions"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "8",
    "asked": "Bitemporal resolution — the totals as the graph knew them on a past date",
    "frd": "S1-12",
    "here": "resolve.ts takes valid time (at) only. The claims are filtered by both times (known ≤ knownAt, live on asOf), but the resolved readings use asOf with today's knowledge. Needs known_at on controllers/shareTotals/clearanceOf"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "9",
    "asked": "A claim's state as it stood on a past \"known\" date",
    "frd": "S1-12",
    "here": "the model stores one state per claim, no history. A claim superseded by one learned after the \"known\" date is read as Resolved (standing then) — an approximation, said in a comment"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "10",
    "asked": "Read-only past state",
    "frd": "S1-12",
    "here": "an info Alert over the panel; add/correct/withdraw become unavailable. A page action cannot be unavailable (only a Command can), so in a past state the header's add moves into the overflow, unavailable, with why"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "11",
    "asked": "Permission-denied: the side a persona cannot claim",
    "frd": "Roles table",
    "here": "the other side's \"Add … claim\" is a more command, unavailable with the reason (Label: composition is the publishers'; Publisher: the master is the label's). Same gap as 10: a header action cannot carry the reason itself"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "12",
    "asked": "A missing work link, shown as unmatched money with a way to it",
    "frd": "S1-2, S1-9",
    "here": "the composition-resolved card is an EmptyState (\"No work linked\") holding Link a work (a FormDialog, prefilled with the match MERGES suggests) and a link to the conflict. The link is written straight through linkRecording — see Decided, 4"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "13a",
    "asked": "A claim row's meta line at half width",
    "frd": "Pattern 1",
    "here": "at a 1024 px window the two-column grid leaves the meta line a few words wide and the row cuts it; the drawer holds it whole. The two-sided panel needs a measure rule (or a row that wraps its meta)"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "13",
    "asked": "The work page a composition claim belongs to",
    "frd": "S2-1",
    "here": "linked in the Publisher persona only (#/pro/rights/works/<id>, the publisher builder's); the Label persona's Rights section has no work page, so a label reads the work here"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "14",
    "asked": "A territory set field — World / World except / Only in, over ISO codes",
    "frd": "Pattern 4, S1-3",
    "here": "two fields: a choice (World / World, except / Only in) and a choices of 13 codes the fixtures use, titled by name. as: \"country\" gives country NAMES and the graph stores codes; no field takes a territory set"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "15",
    "asked": "Evidence upload inside the claim form",
    "frd": "S1-3",
    "here": "UploaderDocument + UploaderFileRows in a composed Field, the file list held by the dialog (the form's draft holds no files). Nothing is uploaded: the names are stored on the claim's evidence"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "16",
    "asked": "The state a new claim is written in — overclaim → Contested, no authority → No authority",
    "frd": "S1-3, invariants",
    "here": "a stand-in for the resolver's write-time check, in data.ts: Contested where shareTotals now passes 100% in any country the claim reaches (then addConflict opens an Overclaim, severity High if the asset earns); No authority where a controlling claim cites an agreement whose territory does not reach. Belongs in the resolver"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "17",
    "asked": "Withdraw a claim",
    "frd": "S1-3, S1-9",
    "here": "the shared setters have none: written in data.ts against the claims array in place (the row stays, Withdrawn). The model holds no withdrawal time, so this session's are kept in a map for History. An overclaim the claim alone made is resolved with \"withdrew its claim\""
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "18",
    "asked": "Revenue at risk on an overclaim the page opened",
    "frd": "S1-9",
    "here": "revenue × (total − 100) / 100 — the page's estimate, not the graph's"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "19",
    "asked": "A correction that brings the shares back to 100% closes its overclaim",
    "frd": "F5",
    "here": "done here (resolution \"Corrected by …\"). Whether a party's own correction closes a conflict or only proposes its close to ops is a policy call (FRD F5 says ops resolves)"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "20",
    "asked": "A clearance matrix: uses down, scope across (track, release, label, artist), each cell the answer and the scope that decided it",
    "frd": "Pattern 3, S1-4",
    "here": "a RecordIndex of the eight uses with columns Answer, Master, Master decided at, Composition, Composition decided at, Needs first, Reason. The resolver returns the DECIDING scope only; what each other scope would say is not asked of it, so no scope-across grid. A row opens a Drawer with each side in full (grant, decided-by, conditions)"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "21",
    "asked": "Partner and territory as choices",
    "frd": "S1-4",
    "here": "two Selects in composed Fields in the facet trail; 13 countries, the six partners. Same trail-rung question as 7"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "22",
    "asked": "Composition answered per publisher in one cell",
    "frd": "G-3",
    "here": "the worst of the publishers' answers as one badge; each publisher's answer in the drawer"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "23",
    "asked": "Dependency shown — AI training before the others",
    "frd": "S1-6",
    "here": "a \"Needs first\" column (\"AI training — denied\"); the resolver's own reason says the rest"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "24",
    "asked": "Request confirmation of a To-confirm credit",
    "frd": "S3-3, F1",
    "here": "a row command, drawn inert — no shared setter adds a request to the artist's inbox"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "25",
    "asked": "The record's claim history and decisions as a timeline",
    "frd": "S1 History",
    "here": "a RecordIndex of events (claims added/corrected/withdrawn with the replaced claim beside, grants decided, conflicts opened/resolved, attestations), readings All / Claims / Decisions. Not the RecordHeader's activity: those entries are field changes, and a claim is not a field"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "26",
    "asked": "A clearance-at-a-glance reading on a catalogue row",
    "frd": "brief",
    "here": "\"Cleared uses: n of 8\" (default ask: any partner, US) and an \"AI training\" badge; videos read \"Sync in US\", releases Stream and AI training. Asked in one country, Lowlight and Glass Coast (licensed outside US, CA) read 0 of 8 — true in the US, misleading as a catalogue reading. Needs a territory-weighted or \"where cleared\" reading from the resolver"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "27",
    "asked": "Work link on a track row",
    "frd": "S1-2",
    "here": "match:Matched / match:Unmatched — the closest state family; \"Unmatched\" is the FRD's own word for the money"
  },
  {
    "surface": "S1 Catalog, per-asset rights",
    "id": "28",
    "asked": "Master held everywhere? on a row",
    "frd": "S1-2",
    "here": "\"Controlled\" or \"Gap in US, CA\" as words — no status family holds it"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "1",
    "asked": "An organisation's dashboard: the four counts, each opening a filtered list, recent activity, what is owed next",
    "frd": "S1-1, screen 1",
    "here": "A DetailPage of the label as a record, landing on a DetailOverview. No declared form is \"the workspace's home\"; AnalyticsPage reads a period, which none of these figures has"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "2",
    "asked": "Four headline counts — coverage, open conflicts, pending requests, revenue at risk",
    "frd": "S1-1",
    "here": "StatCardRow takes at most three (check:page). Coverage, conflicts and requests are the row; revenue at risk is its own FacetCard with Total / Master / Composition"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "3",
    "asked": "A headline figure that links to its filtered list",
    "frd": "S1-1 acceptance",
    "here": "A stat card never acts; every count is repeated in a FacetCard whose way out opens the list, pre-narrowed by the address (catalogue/below-t3, conflicts/at-risk)"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "4",
    "asked": "What needs the label next — a ranked to-do across requests, conflicts and releases",
    "frd": "S1-1",
    "here": "A TitledCard holding a Slot list of SlotItems, each opening its record, with the state badge as trail. A release missing its defaults has no state family to wear: no badge"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "5",
    "asked": "Recent activity on the page itself",
    "frd": "S1-1",
    "here": "Behind the record header's timeline control (ActivityPanel with records). Not on the face of the page"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "6",
    "asked": "An index opened pre-filtered from a link",
    "frd": "S1-1 \"each links to a filtered list\"",
    "here": "RecordIndex has no initial reading or filter prop; the address segment turns a switches filter on with initially, and the page is keyed by it"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "7",
    "asked": "Master owner and where it controls in one cell",
    "frd": "S1-2, G-4",
    "here": "Two columns: Master owner (party name), Controlled in (TerritoryChip from the kit)"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "8",
    "asked": "Coverage as a figure over the set (a percent)",
    "frd": "S1-1",
    "here": "totals takes money and count only; the percent is a note sentence written with formatPercent"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "9",
    "asked": "The clearance matrix — uses down, scope across, every cell an answer and the scope that decided it",
    "frd": "pattern 3",
    "here": "Index: rows are assets, a column per use. Asset record: rows are uses, a column per scope (Track, Release, Catalogue, Artist), then Effective, Decided at, Master, Composition, Why. A RecordIndex is the nearest form; there is no matrix"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "10",
    "asked": "A cell that reads answer + deciding scope + reason",
    "frd": "pattern 3",
    "here": "ClearanceBadge wrapped in Explained (the reason and scope on hover). Explained is meant for a reached figure, not a badge; the scope word is not on the cell's face"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "11",
    "asked": "Who asks and where as the question every cell answers",
    "frd": "S1-4 \"Partner and territory as readings/filters\"",
    "here": "Neither a reading nor a filter: both slice rows, these change every answer. Held in the address (clearances/in/<country>/<partner>), changed with an \"Ask as\" FormDialog, said in the index note"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "12",
    "asked": "The per-scope cell (what a scope holds for a use)",
    "frd": "pattern 3",
    "here": "Drawn from the stored grant, mapped to the clearance family (Grant → Granted, Deny → Denied, paused/unauthorised → Needs review). A stored fact, not a resolution; only the Effective column is the resolver's"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "13",
    "asked": "Composition side per work and publisher in one cell",
    "frd": "G-3",
    "here": "A formatMeta line \"Publisher: state\" — no badges for several parties in a cell"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "14",
    "asked": "Error state: a failing feed the answers depend on",
    "frd": "design brief states",
    "here": "Alert intent=\"danger\" as the index note when reading in DE (GEMA acknowledgements are failing in fixtures)"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "15",
    "asked": "Bulk grant — one grant at the chosen scope",
    "frd": "S1-5",
    "here": "A covering Wizard (three sections) writing ONE grant through addGrant. It lands on the grant's record"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "16",
    "asked": "Dependency rule in the UI — dependents disabled with a one-line reason",
    "frd": "S1-6",
    "here": "In the wizard: an Alert row revealed by useAnswer, and ready refuses the commit where training is cleared on none of the scope; partly cleared → a warn alert naming the tracks. In the request inbox: Approve is unavailable with the reason. A choice field cannot disable one option with a reason"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "17",
    "asked": "Voice/NIL path — confirm as artist, or attest on behalf with an agreement reference, notifying the artist",
    "frd": "S1-7",
    "here": "Choice field \"Voice/NIL path\"; \"attest\" reveals an Agreement reference (clauses that mention attesting). Attest → grant Live + attestation Signed on behalf + an Attestation request pushed into the artist's inbox (S3 reads it). Ask → grant Paused + attestation Requested. A label cannot \"confirm as the artist\": the label's version of that path is asking the artist"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "18",
    "asked": "A new Voice/NIL grant while the artist disputes an earlier one",
    "frd": "F3",
    "here": "Refused (alert + ready) — decided here; the FRD leaves dispute policy to WMG legal"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "19",
    "asked": "Inheritance shown — every track inherits; a narrower deny overrides",
    "frd": "S1-5 acceptance",
    "here": "\"Inherited by\" TitledCard on the grant record, each track with the resolver's answer (Lowlight shows the asset-level deny)"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "20",
    "asked": "A grant's mark",
    "frd": "—",
    "here": "No mark kind for a consent; it wears its scope's (label/artist party mark, or the asset's cover)"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "21",
    "asked": "Pause / Resume / Revoke a grant; paused-by-dispute cannot resume",
    "frd": "F3 step 4",
    "here": "Row and header commands; Resume unavailable with the dispute as reason; Revoke a destructive ConfirmationDialog"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "22",
    "asked": "A switch bound to a settings draft",
    "frd": "S1-11",
    "here": "No declared boolean field kind: each use is a two-answer Field as=\"choice\" (Allowed / Off) in its SettingsRow"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "23",
    "asked": "Dependent rows disabled with a reason when training is off",
    "frd": "S1-6",
    "here": "The row's description becomes the reason and its control a clearance:Denied badge"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "24",
    "asked": "Defaults applied at release creation",
    "frd": "S1-11, F1 step 2",
    "here": "Release creation is the catalogue's. Here a page action \"Apply to Harbour Lights\" writes the release-level grants (one per AI use) the defaults stand for; the \"New releases\" group says which releases started from them"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "25",
    "asked": "Defaults are the label's setting, not a graph fact",
    "frd": "—",
    "here": "Kept in label/data.ts (DEFAULTS); the graph model has no place for them"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "26",
    "asked": "Approval card — one shape for every inbox item, type-specific actions",
    "frd": "pattern 8, S4-1",
    "here": "A DetailPage per request (header: counterpart mark, the ask, type, state, deadline) over Metadata (Request, Decision, Delegated, Conflict/Credit/Attestation fact cards, and what the graph answers on the start date). The inbox is a CollectionPage; the card is a record, not a card in a list"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "27",
    "asked": "Approve / decline / counter / delegate / respond",
    "frd": "S4-3",
    "here": "FormDialogs held by row commands and the header. Approve writes one grant (addGrant) + setRequestState. Decline keeps a reason, Counter keeps the counter terms, Delegate the colleague — in label/data.ts, as the shared setters carry none of them"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "28",
    "asked": "A state for a conflict response answered",
    "frd": "S4-1",
    "here": "The request family has none (\"Responded\"); an answered conflict response reads Approved, and the conflict moves to step 2"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "29",
    "asked": "Auto-cleared shown as activity",
    "frd": "S1-8",
    "here": "A reading \"Auto-cleared\", and lines from the \"Clearance engine\" in the CollectionPage activity panel"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "30",
    "asked": "Escalation visible to the original owner",
    "frd": "S4-5",
    "here": "request:Escalated badge and a warn Alert on the card. Who it escalated to is not modelled"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "31",
    "asked": "Notification by email/push and digest",
    "frd": "S4-4",
    "here": "Not built — no notification surface in the system"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "32",
    "asked": "Delegate approval items",
    "frd": "S4-1",
    "here": "Not in the label's inbox in fixtures (they are the artist's). The type is drawn by the same card if one arrives"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "33",
    "asked": "A requests reading ordered by deadline",
    "frd": "S4-2",
    "here": "Index sorted by Received, newest first (the index rule); Deadline is a sortable column"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "34",
    "asked": "Conflict card — every claim side by side, total vs 100%",
    "frd": "pattern 6",
    "here": "A DetailPage: one FactCard per claim (party, state, interest, share, territory, dates, source, reference, tier), stacked in Metadata — no side-by-side layout exists. Totals: a \"Shares against 100%\" FactCard with as: \"rate\""
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "35",
    "asked": "Counterclaim tracker",
    "frd": "S1-13",
    "here": "The system's Stepper in a TitledCard, plus a \"Where it stands\" fact card with what the next step needs"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "36",
    "asked": "Severity as a state",
    "frd": "S1-9",
    "here": "No family; plain text (High / Medium / Low)"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "37",
    "asked": "Conflicts the label reads but cannot answer (on works its recordings embody)",
    "frd": "roles table",
    "here": "Listed with an info Alert \"Read only\"; Respond unavailable with why (permission-denied state)"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "38",
    "asked": "Withdraw a claim",
    "frd": "S1-9, G-1",
    "here": "Destructive ConfirmationDialog. Only the label's unresolved claims, flagged grants and disputed attestations are offered; claims are marked Withdrawn in place (no shared setter); the resolver closes the conflict with the withdrawal as reason"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "39",
    "asked": "Evidence upload on a response",
    "frd": "S1-3, S1-9",
    "here": "No declared file field: evidence is a text reference. UploaderDocument is not bound to a form draft"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "40",
    "asked": "A party's private terms (borrowed lane)",
    "frd": "FRD \"Under audit only\"",
    "here": "A fact card saying the claim is held in the contributor's own tenant"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "41",
    "asked": "The Contracts page",
    "frd": "replica #/rights/contracts/list",
    "here": "A simple index of AGREEMENTS involving the label, and a record with terms, clauses, the claims resting on it and the consent decided under it. The real contract record lives in the product (Revelator Pro's Contracts, with documents, economics, grant-of-rights matrix); this is only the graph's view"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "42",
    "asked": "Export that matches the screen (the filter applied)",
    "frd": "S1-10",
    "here": "\"Export rights report\" in every list's overflow: a FormDialog (CSV / PDF) whose notice carries GRAPH_VERSION and RULE_VERSION. The command cannot read the index's live filter state, and no file is produced — the export is logged in the activity"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "43",
    "asked": "Loading state",
    "frd": "design brief states",
    "here": "Not drawn: every read is synchronous over fixtures"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "44",
    "asked": "A record the address names that the graph no longer holds (writes are lost on reload)",
    "frd": "—",
    "here": "An EmptyState page under the section"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "45",
    "asked": "Bitemporal \"as of / as known\" pickers",
    "frd": "S1-12",
    "here": "Not built — belongs to the asset's Rights facet (catalogue builder)"
  },
  {
    "surface": "S1 Rights workspace (label) and the label's S4 inbox",
    "id": "46",
    "asked": "A dispute-pauses-grant policy",
    "frd": "F3, open question",
    "here": "Followed the fixtures: paused, not revoked; said on the grant and the request"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "1",
    "asked": "A workspace home — the organisation's counts, each the way into its tab",
    "frd": "S2 Overview (S1-1's shape)",
    "here": "a DetailPage of Harbor Music on its landing facet: the band names the organisation (IPI, society, works), a DetailOverviewGrid of six FacetCards, one per tab. No declared \"home\" form exists; an organisation is the record the counts are true of"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "2",
    "asked": "Each count opens its list already filtered (\"3 missing\" → Registrations on Missing)",
    "frd": "S1-1 acceptance",
    "here": "the tile opens the tab on its default reading. A RecordIndex reading is not addressable, so no link can land on one"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "3",
    "asked": "A chain of title read as a chain — writer → publisher → sub-publisher → collector, branching by territory",
    "frd": "S2-1",
    "here": "a RecordIndex of hops (To, Hop, From, Agreement, Interest, Rights, Territory, dates, Basis, Source, Tier), one reading per writer so each chain reads end to end. No sequence or tree component; a branch (Harbor → PRS outside DACH, Harbor → Rhein → GEMA in DACH) is two rows, not a fork"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "4",
    "asked": "The chain is derived (agreements + claims), not stored",
    "frd": "S2-1, data model",
    "here": "chainOf() in data.ts walks writer credits → publishing agreements → owning claims → sub-publishing claims → the collecting party's society. Belongs in resolve.ts beside controllers. A publisher with no writer on file starts its chain at \"No writer on file\" (Last Ferry Out's Silverbirch half; Ember Season after Ana denied the credit)"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "5",
    "asked": "Shares by right type and territory, writer and publisher as two lines",
    "frd": "S2-2",
    "here": "the Shares facet: a reading per territory; in it one row per right × share type (\"Writer share\", \"Publisher share\"), holders as an entities cell (each with share and source), the total from shareTotals, who collects there, the society convention. No component draws a share bar or a writer/publisher split; the two lines are two table rows"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "6",
    "asked": "A share state — Whole / Overclaim / Gap",
    "frd": "S2-2, invariants",
    "here": "no status family holds it. Whole → claim:Resolved; Overclaim or Gap → conflict:Open, the figure beside it saying which"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "7",
    "asked": "The society convention as data",
    "frd": "S2-2, data model (\"stored as a society rule, not hardcoded\")",
    "here": "conventionOf() in data.ts: society by territory and right, its writer/publisher split as words. Illustrative — GEMA 8/12–4/12 performance, 60/40 mechanical; PRS ≥50/≤50; MCPS and The MLC pay through the publisher; SACEM thirds; sync \"negotiated directly\". Rights ops must confirm each; the graph has no society-rule table"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "8",
    "asked": "A territory picker on the shares (Blokur's)",
    "frd": "S2-2, pattern 4",
    "here": "readings, one per country the work's claims or conflicts name, plus GB and US. Not a picker: a country nobody claims in is not offered"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "9",
    "asked": "The territory reading — \"In sync in all territories\"",
    "frd": "S2-1 (Blokur 43–50)",
    "here": "an Alert as the shares index's note: success when shareTotals is Whole in every territory read, danger naming each that is not (\"Germany (Publisher share · 110%)\"). The same sentence is a fact on the Overview tile. Only the territories read are checked"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "10",
    "asked": "Tier per claim",
    "frd": "G-2",
    "here": "tierOf answers per asset (and use): every claim row, hop and share line carries the work's tier; the claim's own weight is its source, sortable by precedence (1–6) — same as S1 catalog gap 3"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "11",
    "asked": "A combined publisher share column on the works index",
    "frd": "G-3",
    "here": "\"Harbor's share\" — Harbor's own largest standing ownership claim (world where it has one). Never a rights total across sides"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "12",
    "asked": "Work revenue",
    "frd": "—",
    "here": "Asset.revenue on a work is read as composition revenue; the model does not say which side a work's revenue is"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "13",
    "asked": "A territory set field",
    "frd": "pattern 4, S1-3",
    "here": "a choice of seven sets the fixtures use (World; World excl. DE, AT, CH; DE, AT, CH; DE; GB; US; FR). as: \"country\" holds names, the graph holds codes (S1 catalog gap 14)"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "14",
    "asked": "Evidence upload in the claim form",
    "frd": "S1-3",
    "here": "UploaderDocument + UploaderFileRow inside the FormDialog, files held by the dialog; only names reach the claim's evidence"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "15",
    "asked": "The state a claim is written in and the conflict it opens",
    "frd": "S1-3, invariants",
    "here": "writeClaim() asks shareTotals ahead of the write (the resolver's own count, one party's largest claim) and stores the claim Contested with an Overclaim opened where it passes 100%. The resolver should do this on write"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "16",
    "asked": "Withdraw a claim",
    "frd": "G-1",
    "here": "a withdrawal row (state: Withdrawn) that supersedes the claim through addAssertion — the old row stays Superseded. A conflict the claim alone kept open closes, its reason the withdrawal. Whether a party's withdrawal closes a conflict or only proposes it to ops is a policy call (F5 says ops resolve)"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "17",
    "asked": "Another party's claim cannot be edited — and says so",
    "frd": "G-1, roles",
    "here": "its row's Correct is unavailable: \"Only Ben Songs corrects its own claim. Answer it from Conflicts.\""
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "18",
    "asked": "Suggested matches with confidence and why",
    "frd": "S2-3 (Songtrust monitor)",
    "here": "the graph holds one recording-link suggestion (MERGES m-2, Switchback); read by ISRC/ISWC, plus one of the workspace's own in data.ts (Ember Season → Ember Season, 91%). Suggestions belong in the graph's matching output, per publisher"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "19",
    "asked": "A suggestion to a work another publisher holds",
    "frd": "S2-3, roles",
    "here": "shown, its Accept unavailable: \"Switchback is Silverbirch Publishing House's work: only a publisher holding it confirms the link.\" A real case: should Harbor be shown Silverbirch's suggested links at all?"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "20",
    "asked": "Reject a suggestion",
    "frd": "S2-3",
    "here": "held for the session in data.ts; the graph has nowhere to store a rejected match"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "21",
    "asked": "Bulk confirm (Gmail-style)",
    "frd": "S2-3, BMAT",
    "here": "the index's selection: \"Accept matches\" over the held rows Harbor may confirm"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "22",
    "asked": "F1's new recording (Harbour Lights) has no work to suggest",
    "frd": "F1 step 4",
    "here": "it is listed (not earning, T1) with no suggestion; Link manually is the way, offering Harbor's works only. The fixtures hold no \"Harbour Lights\" work"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "23",
    "asked": "A link written as a claim with its method",
    "frd": "S2-3",
    "here": "linkRecording(…, \"Publisher confirmed\") stores the method on embodies[].source; a link is not an assertion in the model, so it has no tier, time or supersede chain of its own"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "24",
    "asked": "Registrations in the model",
    "frd": "S2-4",
    "here": "none in model.ts/fixtures.ts: 11 rows (4 works × PRS, GEMA, SACEM, ASCAP) held in data.ts, with file, sent, acknowledged, society work number, reason and the next-CWR flag"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "25",
    "asked": "Generate CWR that includes the flagged works",
    "frd": "S2-4",
    "here": "the page action holds a ConfirmationDialog naming the file and the societies; commit marks every flagged row Sent in CWR 3.1 HBM-2610-0N, today. No file is written; nothing reaches the graph"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "26",
    "asked": "The action when nothing is flagged",
    "frd": "S2-4",
    "here": "a page action cannot be unavailable (only a Command can — same as S1 catalog gap 10), so the action is not offered until something is flagged"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "27",
    "asked": "Error state: a failing acknowledgement feed",
    "frd": "design brief, states",
    "here": "a danger Alert as the index's note when the GEMA CWR feed (FEEDS f-5) is Failing: a registration still Sent there may already be acknowledged"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "28",
    "asked": "A clearance matrix (uses down, scope across) on the composition side",
    "frd": "pattern 3, S2-5",
    "here": "a RecordIndex of Harbor's answers — asset × use × territory (US, GB, DE) — readings by use, filters by territory, answer and kind; each row the clearance:* badge, the scope that decided it and the decided-by line. No matrix component"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "29",
    "asked": "Only the publisher's own share on a video sync",
    "frd": "S2-5",
    "here": "clearanceOf(video, \"Sync\")'s composition answers filtered to party === p-harbor. The master side and Ben Songs' answer are not drawn. The resolver has no \"answer for one party\" read; the page filters"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "30",
    "asked": "Territory of a grant",
    "frd": "G-4",
    "here": "the same seven-set choice as claims (gap 13)"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "31",
    "asked": "AI training before other AI uses",
    "frd": "S1-6 on this side",
    "here": "Grant on AI derivative is unavailable until Harbor's AI training answer is Granted there"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "32",
    "asked": "AGR-101 §11.3 — AI uses need the writer's written consent",
    "frd": "data",
    "here": "every AI grant Harbor writes carries the condition \"Writer's written consent — AGR-101 §11.3\"; nothing checks the consent exists. The grant model's conditions are words, not a check"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "33",
    "asked": "One approval card per inbox item",
    "frd": "pattern 8, S4-1",
    "here": "a CollectionPage row per item and a DetailPage per item (Metadata of FactCards: the request, Harbor's answer now on each work, the conflict, the counter, the decision). No card shape that adapts its actions by type; the commands are chosen by type in requestCommands()"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "34",
    "asked": "Approve writes a grant",
    "frd": "S4-3, F2",
    "here": "addGrant at the request's scope (catalogue → Harbor's catalogue; asset → the work), composition side, allowlist of the requester, its territory and window, decided by Elena Marsh for Harbor Music under AGR-101 §4.2 + the inbox id, then setRequestState(Approved)"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "35",
    "asked": "Decline — denied or merely unanswered?",
    "frd": "F2 step 5 (\"needs review elsewhere\")",
    "here": "decline writes a Deny grant for that partner, so Harbor's works read Denied for Cadence AI rather than Needs review. If F2 means a decline to leave \"needs review\", the denial should not be written — a policy call"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "36",
    "asked": "Counter",
    "frd": "S4-3",
    "here": "a FormDialog (territory, until, licence model, note); the terms are held in decisions.tsx and shown on the request page; nothing is granted. The model has no counter-offer"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "37",
    "asked": "A conflict response answered",
    "frd": "S4-1",
    "here": "\"Respond with evidence\" opens the conflict's Counterclaim; \"Withdraw claim\" withdraws Harbor's claim and sets the request Approved — the request family has no Responded/Answered state"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "38",
    "asked": "Delegate",
    "frd": "S4-3",
    "here": "unavailable: \"No delegate is set up for Harbor Music.\" No delegate model for organisations"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "39",
    "asked": "Notifications, digest, escalation",
    "frd": "S4-4, S4-5",
    "here": "not drawn: no notification surface. Escalated items are read as owed (Needs decision reading)"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "40",
    "asked": "A conflict card — every claim side by side, total vs 100%",
    "frd": "pattern 6, S2-6",
    "here": "the Claims facet: a RecordIndex of the claims with source and tier, its note an Alert \"Claimed 125% of 100%\". Side-by-side columns per party are not a component"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "41",
    "asked": "A counterparty's claim that is not in the graph (cf-8: Meridian's 25%, from its own tenant)",
    "frd": "S2-6, S5 sharing",
    "here": "cf-8.claims names only Harbor's row; Meridian's reported claim is held in data.ts (reportedOn), its share shown (shared), its agreement \"private to Meridian Music Group\" (private). The conflict model should reference contributor-lane claims"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "42",
    "asked": "Accept the resolved state territory by territory",
    "frd": "S2-7",
    "here": "the Territories facet: one row per territory, held rows → \"Accept the current state\" writes updateConflict(id, { accepted }); accepting FR and DE on cf-8 closes those two, six stay open. Accepted everywhere, the conflict resolves. Blokur's checkbox list is the index's selection"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "43",
    "asked": "Current state next to your claim",
    "frd": "S2-8",
    "here": "two FactCards in a SectionRun under one TitledSection. No paired comparison component (same as S1 catalog gap 5)"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "44",
    "asked": "The summary table — publisher, IPI, chain of title, society, share per right",
    "frd": "S2-8",
    "here": "a RecordIndex in the Counterclaim facet; the chain as a sentence (\"Ana Lindgren → Harbor Music → Rhein Edition (DE, AT, CH)\"); shares per right read in the conflict's first territory. A contributor's chain is \"Not shared by its contributor\""
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "45",
    "asked": "The four-step tracker, the same for both sides",
    "frd": "S2-8, S1-13",
    "here": "Stepper + Step over COUNTERCLAIM_STEPS under a TitledSection; conflict.step drives it, so both sides read one tracker. The stepper is \"in review\" in the system"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "46",
    "asked": "Evidence on a conflict",
    "frd": "S2-8, F5 step 4",
    "here": "no home in the model (only Assertion.evidence, and superseding Harbor's claim to attach a file would break the conflict's claim ids). Held in data.ts; filing it moves the tracker to \"Evidence from counterparty\" (step 3 of 4) and the conflict to Open — with Sureel to resolve"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "47",
    "asked": "Each step notifies the other party",
    "frd": "S2-8",
    "here": "an info line over the evidence (\"Each step change notifies Ben Songs and Sureel rights ops\"). Nothing is sent"
  },
  {
    "surface": "S2 Publisher workspace",
    "id": "48",
    "asked": "Resolve is not the publisher's",
    "frd": "roles (\"Resolve a conflict: respond only\")",
    "here": "the command is in place, unavailable with the reason — never hidden"
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "1",
    "asked": "A home page form: \"what needs me\" plus summary tiles, for a person and not a record",
    "frd": "S3 Home",
    "here": "Drawn as DetailPage of the artist themself, landing on DetailOverview (Alert, StatCardRow, DetailOverviewGrid with a TitledCard list and three FacetCards). The record band repeats the artist's name and mark at the top of their own home."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "2",
    "asked": "On a phone, a person's record mark is drawn as a full-width disc (it fills ~330px of a 375px screen) on Home, Identity and Request pages",
    "frd": "Mobile brief",
    "here": "Left as the system draws it. The hand shape of RecordHeader should cap a person's or organisation's mark. A cover makes sense big; initials do not."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "3",
    "asked": "Five tabs: Home, Credits, Consent, Activity, Profile (six with Works)",
    "frd": "Mobile brief",
    "here": "The phone tab bar holds four and puts the rest behind More, so Profile (and Works in writer mode) sit behind More. The FRD wants Profile as a tab."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "4",
    "asked": "The record's primary action visible on a phone (Approve, Confirm credit)",
    "frd": "S4-2, S3-3",
    "here": "On a phone the declared actions fold into the ⋮ menu with more, so the decision is two taps away and has no visible button."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "5",
    "asked": "Row commands on a phone (Confirm / Deny a credit, Approve / Decline a request, Dispute)",
    "frd": "S3-3, S4-3",
    "here": "RecordIndex as a hand list does not show the row's commands. Each row opens its record, where the commands are, so it costs one extra tap."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "6",
    "asked": "A page action that is unavailable, with a reason (a delegate cannot invite delegates or claim profiles; \"Allow with limits\" is pointless while opted out)",
    "frd": "Roles: Delegate",
    "here": "PageAction has no unavailable, only Command has one. The action is left out and the reason goes in the index note (Delegates, Claimed profiles), or the action is just hidden (Consent)."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "7",
    "asked": "Consent switches as the hero: big switches, each with a plain sentence",
    "frd": "S3-4, S3-5",
    "here": "SwitchField display=\"card\" inside TitledSection/SectionRun in a SettingsPage. This passes check:page, but no body in SettingsPage's catalogue is \"switches that each commit on their own\". Worth deciding as a body of its own."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "8",
    "asked": "A consent mark and a credit mark for the tabs",
    "frd": "S3 tabs",
    "here": "The set has neither. Consent uses rights, Credits uses audio, Works uses note. Reported, not replaced with a look-alike."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "9",
    "asked": "Voice/NIL resolves on the composition side too",
    "frd": "S3-4",
    "here": "clearanceOf(…, \"Voice/NIL\") asks the publishers as well (\"Harbor Music has granted nothing for voice/nil\"), so an artist who grants their own voice still reads \"Waiting on someone else\". Voice/NIL is a personal right. The resolver should probably answer it on the artist and master side only. (This is in resolve.ts, which I did not edit.)"
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "10",
    "asked": "The opt-out named as the reason when a request is refused",
    "frd": "S3-5",
    "here": "The resolver checks the AI-training dependency first, so a request blocked by the opt-out reads \"AI training is not cleared…\". The app writes \"Refused by your AI opt-out\" itself whenever the artist's opt-out grant stands."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "11",
    "asked": "useWord lowercases \"UGC\" and \"Voice/NIL\" mid-sentence (\"ugc\", \"voice/nil\")",
    "frd": "—",
    "here": "Where I write uses, I write them as they are. The resolver's own reasons still lowercase them."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "12",
    "asked": "Territory of a personal answer. A Voice/NIL grant limited to DE/AT/CH reads \"Not cleared\" because the app reads clearance for the US",
    "frd": "S3-4, G-4",
    "here": "Every artist-app read is done in the US, today, and the page notes this. A \"read in…\" control (country) is owed. Nothing in the system draws a per-territory answer for a personal right yet."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "13",
    "asked": "Fixtures start after the F3 dispute. at-4 is already Disputed, g-14 already Paused and cf-6 already open",
    "frd": "F3",
    "here": "The Dispute command is real (addConflict \"Attestation dispute\" + setGrantState(…,\"Paused\") + setAttestationState(…,\"Disputed\")), but no seeded attestation is left to dispute, so it shows \"Disputed already — Sureel is reviewing it.\" I did not add a second on-behalf attestation, because seeding the shared graph from my folder would change every surface."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "14",
    "asked": "Co-branding of the artist app: Revelator, Sureel, or both",
    "frd": "FRD open question",
    "here": "The app wears ORGANIZATIONS.revelator.art as workspace \"Revelator\"."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "15",
    "asked": "Assurance level (Basic / Verified / Verified + ID) as a badge",
    "frd": "S3-1",
    "here": "No status family fits it. The verification:Verified badge is the state and the level is written as text beside it. check:page refuses a Chip as a fact value."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "16",
    "asked": "Notifications (push, email, digest), and events \"within 1 minute\"",
    "frd": "S3-7, S4-4",
    "here": "Not drawn: there is no notification surface in the system. Activity is the record of events, and Home's Alert carries the F3 notice."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "17",
    "asked": "Sign-up and ID check flow (email or phone, ID check, link to profiles)",
    "frd": "S3-1",
    "here": "Only the result is drawn (Profile › Identity & verification). The sign-up Wizard is not built."
  },
  {
    "surface": "S3 Artist app — gaps",
    "id": "18",
    "asked": "An index row that reads as a sentence (\"Approved by Dara Whitlock for Mira Castellanos: Sync — …\")",
    "frd": "S3-8",
    "here": "The Activity title carries the sentence. Decided by is also a column, but a phone shows only the first columns, so the title is where the \"for [artist]\" line is guaranteed to show."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "1",
    "asked": "Sureel's logo on Sureel's surfaces",
    "frd": "Design brief: \"Sureel's logo and accent through white-label tokens\"",
    "here": "ORGANIZATIONS has no Sureel mark. The workspace wears ORGANIZATIONS.fieldhouse.art as a stand-in, and so does the tenant's band on the Overview."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "2",
    "asked": "Sureel's accent through a white-label token layer",
    "frd": "Design brief",
    "here": "I checked src/styles/ in the design system: tokens.css, theme.css, decided.css, ramps.css and night.css have no brand, tenant or white-label layer. The one blue ramp is \"the action and brand hue\" for every product. The portal draws in Revelator's blue. A white-label layer (a scope that re-resolves the action/brand role and the workspace mark) is a token decision for the system."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "3",
    "asked": "Coverage measures as a metric: Master resolved, Join rate, Composition resolved, Conflict rate, revenue-weighted, over months",
    "frd": "S5-4",
    "here": "METRICS is closed and has no coverage or share-of-catalogue metric, so TrendCard can't plot them. The Overview shows them as FacetCard figures. Coverage (#/contributor/coverage) is a CollectionPage of the four measures with Now, Before last upload and Change columns. There is no trend over time."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "4",
    "asked": "The tenant's own coverage figures",
    "frd": "S5-4",
    "here": "The graph's COVERAGE is per lane, and the Borrowed lane is every peer contributor at once. Meridian's own figures are invented in data.ts. They rise the way that lane rises, and a matched upload moves them, so F4 step 5 is visible."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "5",
    "asked": "A change in a share (\"+7.20 points since last upload\")",
    "frd": "S5-4",
    "here": "No written value for a movement in a percentage. ChangeMark carries a direction but no figure, CellVersus takes count or money only, and as: \"percent\" writes 7.20% with no sign. On the Overview card the change is written as a signed fact (+7.20%). The Coverage index's Change column is unsigned. Conflict rate is the one measure where a rise is bad news, and the note says so in words."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "6",
    "asked": "Four headline counts (matched / new / conflicting / unmatched)",
    "frd": "S5-3",
    "here": "StatCardRow holds at most three, and FacetCard is a tile, not a page summary. On Match results and a batch's Match results facet the four counts go into the index note as one meta line. Each count can be drilled into through the index's readings. The FRD's four-way split needs a four-figure summary, or the system's ruling on why it can't have one."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "7",
    "asked": "Match records at scale: the counts are in the millions, the drill-down shows a sample",
    "frd": "S5-3",
    "here": "The readings count the sampled rows (10 here), not the batch totals. The note says the rows are a sample. An index whose readings carry a figure the rows don't add up to would need a reading count that the page states."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "8",
    "asked": "Row-level errors inside a wizard stage",
    "frd": "S5-1, F4-2",
    "here": "The schema-check stage puts a RecordIndex of failed rows inside a WizardRowBody. It passes check:page, but the row is narrow and the Problem column is cut off. A \"validation result\" body for a wizard (or a BatchReview-style review of failed rows) is not decided."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "9",
    "asked": "Download failed rows — a command that hands the reader a file",
    "frd": "S5-2",
    "here": "The system has no download command or file hand-off. check:page refuses a page-made <a download>, so the CSV is built as a File and opened with follow(blobUrl), which the browser saves or shows. The Charter's and audit reports' Download commands lead nowhere."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "10",
    "asked": "Saved mappings as a set (name, headers, files applied to)",
    "frd": "S5-9",
    "here": "The Field mapping page is a CollectionPage of headers, so it can't also list saved mappings. They are named in the index note, and Save as mapping (a FormDialog) writes one. A CSV upload shows the mapping applied automatically, as an Alert in the schema-check stage. A second page, or the mapping as a record with the saved set as its index, is owed."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "11",
    "asked": "A mapping-state family (Unmatched / Suggested / Completed)",
    "frd": "S5-9",
    "here": "No mapping status family. match has Suggested and Unmatched but no Completed. The three states are the index's readings (BMAT's three tabs) and no badge is drawn."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "12",
    "asked": "Sharing level as a state (Shared / Private / Encrypted)",
    "frd": "S5-5",
    "here": "No status family. Each field is a SettingsRow with three ChoiceCards (three answers, so cards, per the row's rule), bound to the SettingsForm draft through useAnswer/useChangeAnswers. The plain statement (\"no other tenant, WMG included, reads a private field\") is an Alert above the form. A settings body that is \"a closed level per field\" may be worth a decision."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "13",
    "asked": "\"Under audit only\" called out on an access-log row",
    "frd": "S5-6, Roles (\"Under audit only\")",
    "here": "No status for it. It is a Chip riding on the reader's name (identity after), plus its own reading (\"Under audit only\") and the Channel column. A status family for a read's basis (shared field, audit window) would fit."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "14",
    "asked": "The other party's claim, to the extent its sharing allows",
    "frd": "S5-7",
    "here": "Drawn as a FactCard holding what is Shared (party, interest, side, resolved writer total, territory, dates, source kind, tier). \"Agreement and terms\" reads *Private to Harbor Music*, and Read Harbor Music's agreement is an unavailable command with the reason. Nothing in the system knows a field's sharing level. A \"withheld\" value that is neither empty nor a value is decided page by page."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "15",
    "asked": "Two claims side by side (the conflict card, rights pattern 6)",
    "frd": "S5-7, pattern 6",
    "here": "Metadata stacks *Your claim* above *Harbor Music's claim*. There is no side-by-side claim pair, and the kit has no conflict card yet. Totals against 100% per territory are the Share totals facet (RecordIndex)."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "16",
    "asked": "Contributor's own claim on a conflict",
    "frd": "S5-7",
    "here": "The graph's cf-8 names only Harbor's assertion (as-30). Meridian's 75% + 50% writer claim lives in its tenant (data.ts, OWN_CLAIMS), as the merge suggestion m-3 describes it. Correct your claim writes the correction there. updateConflict then resolves the shared conflict when the total is 100% or less. Withdraw resolves it as withdrawn. Both write to the shared graph, so S7 sees them."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "17",
    "asked": "A page action unavailable with a reason (\"Resolve\" — only ops resolves)",
    "frd": "Roles: Contributor admin \"Respond only\"",
    "here": "PageAction has no unavailable (as S3 found). Resolve and Read their agreement are more commands with unavailable reasons. A stage that can't commit yet (Validating) offers nothing."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "18",
    "asked": "A file batch's mark",
    "frd": "S5-2",
    "here": "No mark for a file or format. A batch wears Avatar kind=\"document\" with the format's initials, and a match record wears kind=\"work\"."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "19",
    "asked": "Multi-format channels: SFTP and API files arrive by themselves",
    "frd": "S5-1",
    "here": "The wizard's Channel row offers SFTP and API and gives each endpoint as a tip. Choosing either stands in a fed file name, so the flow can go on without a picker. The system has no \"waiting for a feed to deliver\" state in a wizard."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "20",
    "asked": "The upload's last commit reads \"Upload\", where the act at that stage is *ingest*",
    "frd": "F4-3",
    "here": "A stepped Wizard takes one verb for the bar and the commit. The Ingest stage says in words what the commit writes."
  },
  {
    "surface": "S5 Contributor portal — gaps",
    "id": "21",
    "asked": "Change since last upload on the Overview, and batches in flight",
    "frd": "S5-4",
    "here": "The Overview is a DetailPage on the tenant itself, landing on DetailOverview with seven FacetCards and an Alert for a batch held at the schema check. It is the same idiom S3 used for a home. A \"home\" form for a workspace, as opposed to a record, is not decided."
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "1",
    "asked": "Sureel's mark and accent through white-label tokens — the same components wearing another company's brand",
    "frd": "Design brief, \"Sureel's surfaces (S5–S8)\"",
    "here": "ORGANIZATIONS.fieldhouse.art stands in as the workspace mark; the accent is Revelator's. The shell has one mark slot, the workspace's, so there is nowhere for the PRODUCT's mark (Sureel) beside the ORGANISATION's (Cadence AI): the workspace is the partner's name over Sureel's stand-in mark"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "2",
    "asked": "The persona switch updating the product around the page",
    "frd": "—",
    "here": "usePersona() outside the shell reads the address once; the shell's own switch only updates what is inside it. A null Follow child inside AppShell hands the chosen persona back out so the workspace and nav redraw. (Pro's index has the same issue.)"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "3",
    "asked": "Marks for an API key and a webhook",
    "frd": "S6-2, S6-7",
    "here": "the \"Developers\" destination wears settings; keys and endpoints are rows with no mark (as: \"reference\"). Reported, not replaced by a look-alike"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "4",
    "asked": "A home/dashboard page form for a workspace that is not a record",
    "frd": "Overview",
    "here": "the partner's own organisation as a DetailPage landing on DetailOverview + FacetCards (keys, requests in flight, look-ups this month, webhooks health, usage)"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "5",
    "asked": "A metric for API volume (look-ups per month) to draw as a trend",
    "frd": "Overview",
    "here": "METRICS is a closed set of streams/revenue; no TrendCard is drawn. \"This month\" is a FacetCard figure (API calls + portal look-ups)"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "6",
    "asked": "Terms acceptance — a consent tick with the version accepted",
    "frd": "S6-1",
    "here": "a choices field with one option (\"I accept the Sureel Partner Terms v2.1\"), owed, with a notice; shown afterwards as terms:Agreed"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "7",
    "asked": "An application's state — submitted, under review, approved",
    "frd": "S6-1",
    "here": "approval:Not Approved / approval:Approved on the Organisation record; account:Invited before anything is submitted. No application family"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "8",
    "asked": "A conditional field — territories only when \"Selected territories\" is chosen",
    "frd": "S6-1",
    "here": "both fields always shown; the territories field's help says when it applies, and ready refuses a submit with \"Selected\" and no territory"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "9",
    "asked": "Sureel's approval (which issues the keys)",
    "frd": "S6-1 acceptance",
    "here": "approveApplication(partner, actor) is exported from partner/data.ts for the Graph Console (S7) to call; the portal shows the command as unavailable: \"Only Sureel rights ops approves…\". Approving mints a sandbox and a production key with the scopes the partner kind needs"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "10",
    "asked": "A key's state — live, rotated (works until…), revoked",
    "frd": "S6-2",
    "here": "no family; \"Stops working\" (date) and \"Replaced by\" (identifier) columns. Rotate is a ConfirmationDialog"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "11",
    "asked": "Showing a secret once after it is issued, with a copy",
    "frd": "S6-2",
    "here": "not drawn — the index never shows a secret; the key id is a reference"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "12",
    "asked": "Docs that link out",
    "frd": "S6-2",
    "here": "header actions Open the API reference whose opens is an external URL — the shell has no external-link affordance distinct from an address"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "13",
    "asked": "A file the reader saves — a receipt, a test catalogue, a proof bundle — named by the product",
    "frd": "S6-6, S8-3",
    "here": "the system has no download command: download() in working.ts follow()s a blob: URL of octet-stream bytes, so the browser saves the file under a name of its own choosing"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "14",
    "asked": "A look-up form whose answer appears in place (search → answer → receipt)",
    "frd": "S6-3, design screen 9",
    "here": "the look-ups are a CollectionPage (history); \"Look up clearance\" opens a FormDialog (record field searchable by title, ISRC or ISWC; use; territory) and lands on the look-up's DetailPage"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "15",
    "asked": "A record field holding two code standards (recordings by ISRC, works by ISWC)",
    "frd": "S6-3",
    "here": "one as: \"record\" field with no standard; each option's code is its ISRC or ISWC. The search does match codes"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "16",
    "asked": "The clearance matrix / two-sided panel for one answer",
    "frd": "Patterns 2–3, G-3",
    "here": "a FactCard for the master and one per controlling publisher, each with answer, why, decided at, decided by (G-5), grant territory and dates (G-4), controlled by + source (G-2) and the tier"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "17",
    "asked": "\"The answer changed since the receipt\" — a receipt against the live answer",
    "frd": "S6-6",
    "here": "a warn Alert on the look-up; on a licence request each track offers Check again, which mints a new receipt"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "18",
    "asked": "Resolver reasons safe for a partner — resolve.ts names every partner on an allowlist (\"for Cadence AI, Lyra Labs, Voxa Voice\")",
    "frd": "S6-3, roles (\"cleared uses only\")",
    "here": "seenBy() / reasonFor() in partner/data.ts rewrite the list to the reading partner before it is shown or frozen into a receipt. The resolver should say this itself"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "19",
    "asked": "Permission-denied for a partner with no clearance:read scope or not approved",
    "frd": "States",
    "here": "the create action is withheld and the same command stands in more with unavailable: <why>; the index's empty says why. A PageAction has no unavailable of its own"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "20",
    "asked": "One ask fanning out to several holders' inboxes",
    "frd": "S6-4",
    "here": "asks are read back from REQUESTS grouped by partner, use, start and purpose; the ask page is a DetailPage with two facets — Tracks (per-track answer + receipt, F2 step 5) and Rights holders (each request's request:* badge and decided-by line)"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "21",
    "asked": "A setter that adds a request",
    "frd": "S6-4",
    "here": "fixtures.ts has none: requestLicence() pushes onto the exported REQUESTS array in place and calls wrote() (so S4 inboxes reading REQUESTS see it). fixtures.ts should export addRequest"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "22",
    "asked": "An aggregate state of several requests on one row",
    "frd": "S6-4",
    "here": "a BadgeGroup of request:* badges with counts in the index; the record header takes the same as RecordState[]"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "23",
    "asked": "A summary sentence over an index (\"1 of 10 cleared on both sides. Waiting on Harbor Music.\")",
    "frd": "F2 step 5",
    "here": "the RecordIndex note"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "24",
    "asked": "An upload in a dialog — a file plus what it reports",
    "frd": "S6-5",
    "here": "FormDialog holding a choice field and an UploaderDocument; the file is held in the dialog's own state (the draft cannot hold a File) and ready waits on it"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "25",
    "asked": "Reading the file",
    "frd": "S6-5",
    "here": "not done: any file validates the CD-7 sample (10 rows: 7 matched, 2 unmatched, 1 suggested). Rows carry match:*; provenance rows carry the GENESIS proof event (verifiable in S8)"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "26",
    "asked": "A delivery's outcome — delivered, retried, failed",
    "frd": "S6-7",
    "here": "no family; the response is text (\"200 OK\", \"503 — retried, 200 OK\") beside \"Arrived after\" (duration). The endpoint's own state is feature:Enabled/Disabled"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "27",
    "asked": "The 60-second limit as a judged value",
    "frd": "S6-7 acceptance",
    "here": "an \"Over 60 seconds\" count on the index and the overview; per delivery only the duration"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "28",
    "asked": "Deliveries derived from the graph",
    "frd": "S6-7, F3",
    "here": "licence.paused / licence.revoked are read off GRANTS as they are now — Voxa's Voice/NIL grant paused by cf-6 shows as delivered on 14 Oct; if the console revokes it, licence.revoked appears"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "29",
    "asked": "A society's own work number as an identifier standard",
    "frd": "S6-8",
    "here": "standard: \"id\" — no society-work-number standard"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "30",
    "asked": "Acknowledged share against the graph's for one party in one territory",
    "frd": "S6-8",
    "here": "two percent columns (\"Acknowledged share\", \"Graph holds in DE\" — the registrant's resolved claims only) and the conflict's badge; the detail repeats them with the total claimed"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "31",
    "asked": "An ack file's state",
    "frd": "S6-8",
    "here": "batch:Matched; mismatches and the conflicts they opened (or found open — Northbound's cf-1) as columns. Sending one writes each acknowledged share as a Society acknowledgement claim (G-1) and opens an Overclaim/Gap via addConflict where it disagrees (Last Ferry Out, 60% vs 50% in DE)"
  },
  {
    "surface": "S6 Partner portal (Sureel)",
    "id": "32",
    "asked": "An index inside a fact page (claims in DE under the registration's facts)",
    "frd": "S6-8",
    "here": "a RecordIndex inside a TitledCard inside Metadata"
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "1",
    "asked": "Sureel's logo on its own console",
    "frd": "Design brief: \"Sureel's logo and accent through white-label tokens\"",
    "here": "ORGANIZATIONS has no Sureel mark. The workspace wears ORGANIZATIONS.fieldhouse.art as a stand-in."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "2",
    "asked": "Sureel's accent through white-label tokens",
    "frd": "Design brief",
    "here": "The system has no brand or white-label token layer (S5 gap 2 says the same). The console draws in Revelator's blue."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "3",
    "asked": "A severity scale (High / Medium / Low) on conflicts",
    "frd": "S7-2",
    "here": "No status family or level for it. Severity is a word in a column and a fact on the band (High severity), and it can be filtered. The queue's order carries it: rows arrive HIGH first, then by revenue at risk (byPriority in data.ts), and the table opens on that order with no sort. A level like TierChip, or a severity family, is owed."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "4",
    "asked": "A queue sorted by two keys (severity, then revenue at risk)",
    "frd": "S7-2: \"Given a HIGH conflict, then it's at the top\"",
    "here": "RecordIndex.sort takes one column. The rows are pre-sorted and the index opens in arrival order. Once a reader sorts by a column, there is no way back to \"queue order\" apart from reloading."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "5",
    "asked": "Comments on a record",
    "frd": "S7-2: \"assign, comment\"",
    "here": "No comment-thread component. Notes are a RecordIndex in the conflict's Discussion facet, added through Add comment (FormDialog, long text). They also appear as \"commented\" entries in the record's ActivityPanel. Notes are kept in data.ts, since the graph has no notes."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "6",
    "asked": "Assign / ask for evidence / resolve as one record's workflow",
    "frd": "S7-2, COUNTERCLAIM_STEPS",
    "here": "Each is a command: Resolve is the band's primary action, and Assign and Ask for evidence sit in the overflow. The counterclaim step is a fact (\"Step: Evidence approved\") because there's no stepper in a facet tile. Stepper exists, but nothing in the Detail family holds it."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "7",
    "asked": "A resolution's outcome tied to its kind — e.g. an attestation dispute that reinstates or revokes its grant",
    "frd": "S7-2, F3 steps 4–5",
    "here": "Resolve is one FormDialog (Outcome, Rule or evidence, Reason — all owed). The outcomes come from the conflict's kind (outcomesOf). For cf-6, \"Attestation upheld\" calls setGrantState(g-14, Live) and setAttestationState(at-4, Signed). \"Dispute upheld\" revokes both. A missing work link is resolved by linking it through linkRecording, which resolves the conflict itself."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "8",
    "asked": "Both sides see the outcome",
    "frd": "F3 step 5, F5 step 5",
    "here": "The outcome is written to the shared graph (updateConflict resolution, grant and attestation states), so S1 and S3 read it. Neither has a notification write. The parties told are recorded in console NOTICES and listed as \"Told\" on the resolution. A shared notices/inbox write (addRequest or notify) is owed by fixtures.ts."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "9",
    "asked": "The resolution's \"rule\" as structured data",
    "frd": "S7-2: \"records the rule (RULE_VERSION) or evidence used\"",
    "here": "{ evidence } shape is owed by the model."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "10",
    "asked": "The claims a resolved total is made of",
    "frd": "S7-5: \"every resolved value links to the winning claim\"",
    "here": "shareTotals returns totals without the claims behind them. countedIn in data.ts reads the same filter (standing, Owns, covers the territory, live today) so the inspector can link each total to its claims. The resolver should return them: shareTotals(...)[n].claims. Control rows link to controllers(), which is the resolver's own answer."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "11",
    "asked": "A resolved view across territories",
    "frd": "S7-5, G-4",
    "here": "No territory × value matrix. The Resolved facet is a RecordIndex of values, one row per value per run of territories answered alike (read in US, GB, FR, JP and every code a claim names). The two sides are its readings, with no reading of both (G-3). A work has only Composition."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "12",
    "asked": "Several links in one cell (the winning claims)",
    "frd": "S7-5",
    "here": "One Link per claim, written side by side in the cell. They stay readable but wrap with no separator. A cell that holds a set of links (like entities, but each one leading somewhere) is owed."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "13",
    "asked": "Clearance per use with each side's answer",
    "frd": "S7-5, rights pattern 3",
    "here": "The Clearance facet is a RecordIndex of the eight uses: the answer, the master's, one badge per composition answer, decided-at level, grant decided-by, reason and rule. It is read in the US, today. There is no use × scope matrix and no territory picker (the FRD's clearance matrix is S1's pattern)."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "14",
    "asked": "The bitemporal reading (valid time vs system time)",
    "frd": "S7-5 (data-model doc)",
    "here": "No \"as of\" control. Every claim shows Valid from/to and Known since, and an info Alert says the view is read today under v1.3 on gv-2026.10.20-0958. Reading the graph *as it stood* on another date is not built. clearanceOf/shareTotals take an at, but nothing on the page sets it."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "15",
    "asked": "Side-by-side claim cards (conflict card, pattern 6)",
    "frd": "S7-2, F3 step 4",
    "here": "CardGrid columns={2} of FactCards inside Metadata: each claim, or for cf-6 the label's attestation (at-4, AGR-310 §7.4) beside Mira's dispute, with the cited agreement and clause under them. The system has no conflict card. \"Total against 100%\" is a figure on the Overview's Claims tile, not on the cards."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "16",
    "asked": "A private counterparty claim (borrowed lane)",
    "frd": "S7-2, Roles: \"Under audit only\"",
    "here": "cf-8 names only Harbor's assertion, and Meridian's claim is private to its tenant. Claims says so in an Alert and sends ops to Tenants to open an audit window. Nothing in the system marks a value as *withheld*, as distinct from absent."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "17",
    "asked": "Long values in a facet tile (a resolution's reason)",
    "frd": "—",
    "here": "A tile scrolls inside itself. The resolution is a full-width FactCard under the overview grid instead. RCC gap 15 is the same problem."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "18",
    "asked": "A page action unavailable with its reason",
    "frd": "Permission-denied state",
    "here": "PageAction has no unavailable (S3 and S5 found this too). For a data engineer, the band's Resolve, Unmerge, Publish and Request audit access move to the overflow as greyed Commands with the reason."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "19",
    "asked": "Coverage measures as metrics",
    "frd": "S7-6",
    "here": "METRICS is closed and has no coverage measures, so no declared TrendCard/AnalyticsOverview can plot them. The page is a composed SeriesComparison: a TrendCard whose metric line is a select of the four measures, one line per lane, format = formatPercent. The lane table (selectable, the only key) has October, Added since May (\"what each lane adds\") and Last load. METRICS needs a share-of-catalogue kind."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "20",
    "asked": "The 30 November gate numbers",
    "frd": "S7-6",
    "here": "The FRD names the gate but not its thresholds. MEASURE in data.ts sets placeholders (Master resolved ≥ 70%, Join rate ≥ 50%, Composition resolved ≥ 40%, Conflict rate ≤ 3%). The trend's readings are the Owned lane and the gate. These are the deal team's numbers to set."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "21",
    "asked": "A fixed run of months in the analytics header",
    "frd": "S7-6, Analytics guidance (\"Period select: Always\")",
    "here": "PeriodSelect reads rolling windows. Coverage is fixed months (COVERAGE_MONTHS, May–Oct), so the header has no period control. A monthly-snapshot period is owed."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "22",
    "asked": "\"Incremental coverage within a day of a new lane loading\"",
    "frd": "S7-6 acceptance",
    "here": "The fixtures have no per-load coverage. The lane table's Last load column (each lane's latest feed) is the nearest proof."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "23",
    "asked": "A rule version's state (Draft / Published / Retired)",
    "frd": "S7-7",
    "here": "No status family. It's written as words."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "24",
    "asked": "A diff of two versions",
    "frd": "S7-7",
    "here": "No diff component. Diff is a RecordIndex of the precedence ladder rung by rung (before, after, Same/Added/Changed), with readings Changed and All rungs. The ladders per version are LADDERS in data.ts."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "25",
    "asked": "Replay as a run",
    "frd": "S7-7: \"how many resolved values would change and the revenue affected\"",
    "here": "Replay is instant: the totals come from RULES (1,842 values, $212,400), with a sample of five changed values (REPLAY_SAMPLE). A ProgressDialog over a real run would fit. Publish is greyed until the draft has been replayed."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "26",
    "asked": "Publishing a rule changes what the resolver reads",
    "frd": "S7-7",
    "here": "RULE_VERSION in resolve.ts is a constant. Publishing in the console marks v1.4-draft Published and v1.3 Retired (rules() in data.ts), but every page still resolves under v1.3. A versioned resolver is owed by resolve.ts."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "27",
    "asked": "Sharing level as a state (Shared / Private / Encrypted)",
    "frd": "S7-8",
    "here": "No status family (S5 gap 12). It's written as words, with a \"What it means\" column."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "28",
    "asked": "A policy change and an audit window visible to the contributor",
    "frd": "S7-8: \"logged and the contributor notified\"; Roles: \"Under audit only\"",
    "here": "TENANTS is readonly and has no setter. changeSharing and requestAudit write the tenant's own sharing and access arrays in place, so S5's access log shows the entry: \"Graph Console · audit request AR-113\", audit: true. The policy log and the notice live in data.ts. setSharing / addAccess setters are owed by fixtures.ts."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "29",
    "asked": "A time-boxed window that closes itself",
    "frd": "Roles: \"Under audit only … time-boxed\"",
    "here": "Each audit has Opens/Closes and a reading \"Open now\" (by the console's clock). Nothing closes it in real time, and no countdown is drawn. Only Private fields can be opened. An encrypted field is held under the contributor's key."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "30",
    "asked": "A second contributor tenant",
    "frd": "S7-8",
    "here": "The graph holds only Meridian. Mistral Arcade Records (p-arcade, which already has a feed) is a console-local tenant in data.ts, so the tenants form a set."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "31",
    "asked": "Trust / auto-acceptance standing for a claimant",
    "frd": "S7-9",
    "here": "The console reuses the trust family: Allow means claims resolve on their own, Challenge means held for review. Check that the family's meaning (\"asked to prove itself first\") is meant to stretch this far. The rejection threshold (15%) is a placeholder, and the page says so. Suspend is a greyed command: \"a policy call for Sureel and WMG legal\". Claimants aren't graph parties, so they wear initials."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "32",
    "asked": "Unmerging a recording link",
    "frd": "S7-4: \"every merge reversible from the record\"",
    "here": "The graph has linkRecording and no unlink. Accepting the m-2 suggestion links Switchback to its work (resolving cf-2). Unmerge on such a merge is greyed with that reason. Party and work merges unmerge in the console and notify every party holding a claim or credit on what they touch. Splits \"recompute on the next snapshot\" is said in words, because no snapshot write exists."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "33",
    "asked": "Merge history the graph keeps",
    "frd": "S7-4",
    "here": "The graph has no merge records. The three past merges, and every accepted one, live in data.ts. A Party model with an alias/merged-from edge is owed."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "34",
    "asked": "A match review's verdict buttons, unavailable with a reason",
    "frd": "S7-3",
    "here": "The review's dock takes Buttons. Once a suggestion has been decided, they're only disabled, with no hint."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "35",
    "asked": "Loading state",
    "frd": "Design brief: \"default, empty, loading, error, permission-denied\"",
    "here": "The fixtures are synchronous, so nothing loads. The error state is an Alert for an address naming no record (conflict, asset, claim, merge, rule, tenant). Empty is each index's own empty line (Discussion on cf-2, Unmerged merges)."
  },
  {
    "surface": "S7 Sureel Graph Console — gaps",
    "id": "36",
    "asked": "A feed's own record (its batches, its error trend)",
    "frd": "S7-1",
    "here": "Feeds are rows only. Retry (ConfirmationDialog) records a retry time. Open batches goes to the Batches page unfiltered, because an index can't be opened pre-filtered from an address."
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "1",
    "asked": "A public, account-less page — no rail of destinations, no account",
    "frd": "S8 (\"Web, no account\")",
    "here": "the system has no signed-out or public shell: AppShell requires a user. The account is \"Visitor — No account needed to verify\", whose one command opens the Partner portal; one destination (\"Verify\") with three pages"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "2",
    "asked": "Sureel's mark",
    "frd": "Design brief, white label",
    "here": "ORGANIZATIONS.fieldhouse.art as the workspace mark, workspace \"Sureel Verify\" (same as S6 gap 1)"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "3",
    "asked": "One input on the page — paste a receipt or event ID, press Verify",
    "frd": "S8-1, F6 step 2",
    "here": "no declared page holds a lone form: \"Verify a receipt\" is the primary action of the batches page (and \"Verify another\" on every event) opening a FormDialog with one text field; it navigates to #/verify/<id>"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "4",
    "asked": "A not-found state for an address",
    "frd": "States, S8-1",
    "here": "a DetailPage named by what was pasted, status verification:Failing (\"missing or wrong\"), holding an EmptyState with what an ID looks like and the dialog to try again. An empty paste cannot be submitted (the field is owed)"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "5",
    "asked": "A verdict panel — \"Verified\" with event time and signing key, read first",
    "frd": "S8-1 acceptance",
    "here": "the record header: verification:Verified, the event type, its number and its recorded time as facts; the signing key is the first fact of the Signature card"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "6",
    "asked": "The privacy line said on the page — only type, opaque IDs, scope, use, time and hash",
    "frd": "S8-2",
    "here": "an info Alert on every event: \"Only the event's type, its opaque IDs, its scope and use, its time and its hashes. Amounts, attribution percentages and private terms never leave the private side.\" The page has no field that could carry anything else"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "7",
    "asked": "A hash shown whole (a verifier compares characters)",
    "frd": "S8-1",
    "here": "facts with standard: \"id\" — the identifier chip truncates the middle and carries its own copy"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "8",
    "asked": "A mark for a proof event, a batch, a key",
    "frd": "S8",
    "here": "events and imported records wear an Avatar kind=\"document\" named by their type; batches and keys are references with no mark. Reported, not replaced"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "9",
    "asked": "The proof bundle as a named download",
    "frd": "S8-3",
    "here": "Download proof bundle builds the JSON (public fields, signature + public key, Merkle path to the root, RFC 3161 token, the four offline steps) and hands it over through download() — the browser names the file (S6 gap 13)"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "10",
    "asked": "Merkle batch, root and TSA token in the model",
    "frd": "S8-1",
    "here": "ProofEvent carries only batch; verify/data.ts derives the root, the inclusion path, the batch's sealing time (five minutes after its latest event) and a stand-in TSA token. The batches page doubles as the public transparency log the data-model doc proposes"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "11",
    "asked": "The on-chain archive, read-only",
    "frd": "S8-4",
    "here": "a CollectionPage of imported records (the shared log's 612 plus three added here) and a DetailPage per owAssetUri: original transaction hash, block, mined time, payload CID; \"In the Proof Log\" with the IMPORTED event and the replay check. A read-only state is an info Alert — no archived/read-only family"
  },
  {
    "surface": "S8 Verification portal (Sureel, public)",
    "id": "12",
    "asked": "An address segment holding ow://…",
    "frd": "S8-4",
    "here": "the owAssetUri is encodeURIComponented into one segment and decoded on read; a bare id (9b2f-44c1-a7e0) or the transaction hash also finds it"
  }
];
