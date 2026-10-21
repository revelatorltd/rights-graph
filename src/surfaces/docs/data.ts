import { href } from "../../route";
import { as } from "../home/data";

/**
 * The docs library: what the Rights Graph is specified to do, how it is built, and the playbooks for
 * the work its surfaces hold. Written for a public reader — product specification and architecture
 * only, in the prototype's own invented names. Every requirement says whether the prototype builds
 * it and opens the page where it does; every playbook's steps are the pages' own commands.
 */

export type DocKind = "Specification" | "Architecture" | "Playbook";

/** The kinds, as the library files them: the nav's page name and its address segment. */
export const KINDS: readonly { kind: DocKind; page: string; segment: string; mark: string }[] = [
  { kind: "Specification", page: "Specifications", segment: "specifications", mark: "note" },
  { kind: "Architecture", page: "Architecture", segment: "architecture", mark: "metadata" },
  { kind: "Playbook", page: "Playbooks", segment: "playbooks", mark: "list-ordered" },
];

export type Priority = "Must" | "Should" | "Could";
export type Built = "Built" | "Partly built" | "Not built";

/** One requirement, and where the prototype answers it. */
export interface Requirement {
  id: string;
  requirement: string;
  priority: Priority;
  acceptance: string;
  built: Built;
  /** The page that answers it — none where nothing does. */
  where?: string;
  /** What is a stand-in, where it is partly built. */
  note?: string;
}

/** A table of the doc's own: its first column names each row. */
export interface Table {
  title: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}

/** A choice the doc records — taken, or still open. */
export interface Question {
  question: string;
  answer: string;
  state: "Decided" | "Open";
}

export interface Step {
  does: string;
  opens?: string;
}

export interface Invariant {
  id: string;
  rule: string;
  damage: string;
}

interface DocBase {
  /** SPEC-01, ARCH-02, PB-03 — and its address, lowercased. */
  id: string;
  title: string;
  /** The surface, persona or item type it is about. */
  appliesTo: string;
  owner: string;
  updated: Date;
  summary: string;
  /** The page it describes, in the prototype. */
  prototype: string;
  related: readonly string[];
}

export interface Specification extends DocBase {
  kind: "Specification";
  requirements: readonly Requirement[];
  tables?: readonly Table[];
  questions: readonly Question[];
}

export interface Architecture extends DocBase {
  kind: "Architecture";
  tables: readonly Table[];
  questions: readonly Question[];
}

export interface Playbook extends DocBase {
  kind: "Playbook";
  when: string;
  steps: readonly Step[];
  rules: readonly string[];
  checklist: { title: string; items: readonly string[] };
  table?: Table;
  invariants: readonly Invariant[];
  open: readonly string[];
}

export type Doc = Specification | Architecture | Playbook;

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

// Addresses the docs open, said once.
const LABEL = (...path: string[]) => as("Label", href("pro", ...path));
const PUBLISHER = (...path: string[]) => as("Publisher", href("pro", ...path));
const ARTIST = (...path: string[]) => as("Artist", href("artist", ...path));
const CADENCE = (...path: string[]) => as("Cadence AI", href("partner", ...path));
const RECEIPT = href("verify", "rcpt_7Q2M-9F4K-CD7A");

const SPECIFICATIONS: readonly Specification[] = [
  {
    kind: "Specification",
    id: "SPEC-01",
    title: "Rights Graph surfaces overview",
    appliesTo: "All surfaces",
    owner: "Rights Graph product",
    updated: day(2026, 10, 20),
    summary:
      "The Rights Graph is one record with nine surfaces around it. Rights holders manage rights in the product they already use, artists in a phone app, peer contributors in a walled tenant, licensees through a portal and an API, and anyone can check a receipt without an account. Sureel runs the graph from its console. One rule holds everywhere: every surface writes claims, and only the graph resolves them.",
    prototype: href("home", "surfaces"),
    related: ["SPEC-02", "SPEC-11", "SPEC-12", "ARCH-09"],
    requirements: [
      { id: "S1", requirement: "Rights workspace in Revelator Pro, for labels and distributors", priority: "Must", acceptance: "A label sees coverage, clearances, AI consent, requests and conflicts for its own catalogue, and a Rights tab on every asset", built: "Built", where: LABEL("rights", "overview") },
      { id: "S2", requirement: "Publisher workspace — the same shell in publishing mode", priority: "Must", acceptance: "A publisher sees works, writer shares, recordings to link, registrations and composition-side conflicts", built: "Built", where: PUBLISHER("rights", "overview") },
      { id: "S3", requirement: "Artist app for artists, writers and their delegates", priority: "Must", acceptance: "An artist confirms credits, signs Voice/NIL and AI consent, and sees where their music is cleared", built: "Built", where: ARTIST("home") },
      { id: "S4", requirement: "Approval inbox — one request shape in S1, S2 and S3", priority: "Must", acceptance: "Anything that needs a person lands in that person's inbox, whatever surface it started on", built: "Built", where: LABEL("rights", "requests") },
      { id: "S5", requirement: "Contributor portal for bulk contributors", priority: "Must", acceptance: "A contributor uploads into its own tenant and sees what it gave, what it got back and who read it", built: "Built", where: href("contributor", "overview") },
      { id: "S6", requirement: "Partner portal for AI platforms, DSPs and societies", priority: "Must", acceptance: "A partner holds keys, looks up clearance, requests licences, reports usage and keeps receipts", built: "Built", where: CADENCE("overview") },
      { id: "S7", requirement: "Graph Console, where Sureel runs the graph", priority: "Must", acceptance: "Ops sees ingestion health, resolves conflicts, reviews matches and inspects any asset's resolution", built: "Built", where: href("console", "health") },
      { id: "S8", requirement: "Verification portal — public, no account", priority: "Should", acceptance: "Anyone pastes a receipt or event ID and sees whether it is intact, never an amount", built: "Built", where: href("verify") },
      { id: "S9", requirement: "Graph APIs and feeds", priority: "Must", acceptance: "Every system writes claims and reads splits, clearance and proof through one contract", built: "Partly built", where: CADENCE("api"), note: "The JSON API answers over HTTP; bulk DDEX, CWR and SFTP feeds are represented by the contributor portal's batches." },
    ],
    tables: [
      {
        title: "Who is in the graph",
        columns: ["Party", "Writes", "Reads", "Works in"],
        rows: [
          ["Label", "Catalogue, splits, AI consent, Voice/NIL on an artist's behalf", "Clearance, conflicts, coverage", "S1"],
          ["Distributor", "Catalogue, delivery events", "Clearance for delivery", "S1 or the API"],
          ["Publisher or administrator", "Works, writer shares, territories, sub-publishing", "Chain of title, conflicts, unlinked recordings", "S2"],
          ["Artist", "Role confirmations, Voice/NIL consent, AI opt-out", "Where they are cleared, who is using them", "S3"],
          ["Songwriter", "Role confirmations, declared writer shares", "Works, registrations", "S3, writer mode"],
          ["Manager or lawyer", "Approvals on an artist's behalf", "What the artist sees, scoped", "S3, delegate access"],
          ["Bulk contributor", "Catalogue data into its own tenant", "Its own match results and coverage", "S5"],
          ["Collecting society", "Registrations, acknowledgements", "Claims by society work number", "S6, CWR"],
          ["AI platform", "Usage, provenance, licence requests", "Effective clearance, receipts", "S6, Clearance API"],
          ["DSP or UGC platform", "Platform ownership claims, as evidence only", "Splits, ownership", "S6, Partner API"],
          ["Verifier", "Nothing", "Proof events, receipts", "S8"],
          ["Sureel operations", "Resolutions, merges, rule versions", "Everything", "S7"],
        ],
      },
    ],
    questions: [
      { question: "Are the label and publisher workspaces two products?", answer: "No: one shell, switched by the organisation the reader works as. Roles attach to an organisation and a context, not to a login.", state: "Decided" },
      { question: "How do Sureel's surfaces look like Sureel's?", answer: "They use the same components; the design system has no white-label layer yet, so a stand-in mark is worn.", state: "Open" },
      { question: "Whose brand does the artist app wear?", answer: "Built as Revelator's; the brand is not decided.", state: "Open" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-02",
    title: "The five global rules",
    appliesTo: "All surfaces",
    owner: "Rights Graph product",
    updated: day(2026, 10, 20),
    summary:
      "Five rules hold on every surface. They are what keeps nine screens from becoming nine copies of who owns what: nobody edits the answer, every value says where it came from, the two copyrights never merge, nothing is shown without where and when, and every decision names who made it for whom.",
    prototype: LABEL("catalog", "tracks", "r-northbound", "rights"),
    related: ["ARCH-02", "ARCH-04", "ARCH-07"],
    requirements: [
      { id: "G-1", requirement: "Claims, not edits — add, correct or withdraw your own", priority: "Must", acceptance: "Given a correction, then a new claim supersedes the old one, which stays on the record; the resolved answer stands beside it with the reason they differ", built: "Built", where: LABEL("catalog", "tracks", "r-northbound", "rights") },
      { id: "G-2", requirement: "Source and tier on every rights value", priority: "Must", acceptance: "Given any value, then its source and its Confidence Ladder tier are shown with it", built: "Built", where: href("console", "assets", "r-northbound") },
      { id: "G-3", requirement: "Composition and recording stay apart", priority: "Must", acceptance: "Given any rights screen, then master and composition are shown separately, and no combined percentage appears", built: "Built", where: LABEL("catalog", "tracks", "r-northbound", "rights") },
      { id: "G-4", requirement: "Territory and time on every edge", priority: "Must", acceptance: "Given any right, then its territory set and its dates are shown", built: "Built", where: PUBLISHER("rights", "works", "w-northbound") },
      { id: "G-5", requirement: "Who decided, on whose behalf", priority: "Must", acceptance: "Given a consent, attestation or resolution, then the actor, the party acted for, the authority and the time are shown", built: "Built", where: LABEL("rights", "consent") },
    ],
    tables: [
      {
        title: "Where each rule is held",
        columns: ["Rule", "On the screen", "In the graph and the API"],
        rows: [
          ["G-1", "Commands say Add, Correct or Withdraw my claim; no field edits the owner", "A key writes only its holder's claims; a party supersedes only its own"],
          ["G-2", "A source and a tier beside every share", "Tiers are computed per asset and use at read time"],
          ["G-3", "Master and composition in two cards, never one total", "Grants carry a copyright side; a master grant never implies a composition grant"],
          ["G-4", "A territory chip and dates on every claim and grant", "A rights edge without a territory set and a start date is refused"],
          ["G-5", "A decided-by line: actor, for whom, under what, when", "Every grant and attestation stores its actor, principal and authority"],
        ],
      },
    ],
    questions: [
      { question: "Can a party close its own overclaim?", answer: "Yes, by withdrawing or correcting its claim. Only Sureel ops resolves one between parties.", state: "Decided" },
      { question: "Is the tier shown per claim or per asset?", answer: "The claim row asks for a tier on each claim; the graph computes one per asset and use, and that is what is shown.", state: "Open" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-03",
    title: "S1 Rights workspace",
    appliesTo: "S1 · Label",
    owner: "Revelator Pro",
    updated: day(2026, 10, 19),
    summary:
      "A Rights section in Revelator Pro — Overview, Catalogue rights, Clearances, AI consent, Requests, Conflicts — and a Rights tab on every release, track and video. Catalogue-wide work lives in the section; one asset's rights live in its tab.",
    prototype: LABEL("rights", "overview"),
    related: ["SPEC-06", "ARCH-03", "PB-02", "PB-03"],
    requirements: [
      { id: "S1-1", requirement: "Rights overview: coverage, conflicts, requests, risk", priority: "Must", acceptance: "Given a label, when it opens Rights, then it sees the counts and each opens its list", built: "Built", where: LABEL("rights", "overview") },
      { id: "S1-2", requirement: "Rights tab per asset: both sides, by territory and date", priority: "Must", acceptance: "Given a track, then the two sides show separately, each value with source and tier", built: "Built", where: LABEL("catalog", "tracks", "r-northbound", "rights") },
      { id: "S1-3", requirement: "Add or correct a claim, with its evidence", priority: "Must", acceptance: "Given a saved claim, then the old one is superseded, not deleted, and the answer updates or a conflict opens", built: "Built", where: LABEL("catalog", "tracks", "r-northbound", "rights") },
      { id: "S1-4", requirement: "Clearances by use, with the scope that decided", priority: "Must", acceptance: "Given a track, then each use reads Granted, Denied or Needs review, with the scope that decided it", built: "Built", where: LABEL("rights", "clearances") },
      { id: "S1-5", requirement: "Bulk AI consent at catalogue, label or release scope", priority: "Must", acceptance: "Given a catalogue grant, then one grant is stored and every track inherits it; a track-level deny overrides it", built: "Built", where: LABEL("rights", "consent") },
      { id: "S1-6", requirement: "AI training before derivative, Voice/NIL and AI streaming", priority: "Must", acceptance: "Given training is off, then the dependents are unavailable with a one-line reason", built: "Built", where: LABEL("rights", "consent") },
      { id: "S1-7", requirement: "Voice/NIL needs the artist's or the label's attestation", priority: "Must", acceptance: "Given attest-on-behalf, then an agreement reference is required and the artist is told in S3", built: "Built", where: LABEL("rights", "requests", "rq-2203") },
      { id: "S1-8", requirement: "Licence requests: auto-cleared, or for a decision", priority: "Must", acceptance: "Given a standing grant covers a request, then it auto-clears and is logged; otherwise it waits for approve, decline or counter", built: "Built", where: LABEL("rights", "requests") },
      { id: "S1-9", requirement: "Conflicts on own catalogue, each with revenue at risk", priority: "Must", acceptance: "Given an overclaim, then every party's claim shows with its source, and the label responds with evidence or withdraws", built: "Built", where: LABEL("rights", "conflicts") },
      { id: "S1-10", requirement: "Rights and clearance report per catalogue, CSV and PDF", priority: "Should", acceptance: "Given a filter, then the file matches the screen and carries the graph version", built: "Partly built", where: LABEL("rights", "catalogue"), note: "CSV is saved; the browser's print dialog stands in for a PDF." },
      { id: "S1-11", requirement: "Default AI consent for new releases", priority: "Should", acceptance: "Given defaults, when a release is created, then its consents start from them", built: "Built", where: LABEL("rights", "consent", "defaults") },
      { id: "S1-12", requirement: "As-of and as-known-on dates on the Rights tab", priority: "Could", acceptance: "Given two dates, then the tab shows that past state, read-only", built: "Built", where: LABEL("catalog", "tracks", "r-northbound", "rights") },
      { id: "S1-13", requirement: "Counterclaim with a four-step tracker", priority: "Must", acceptance: "Given a dispute, then the label sees which step it is on and what is needed next", built: "Built", where: LABEL("rights", "conflicts") },
    ],
    questions: [
      { question: "A Rights section, or a Rights tab on each asset?", answer: "Both: grants made at a scope belong to the section; one asset's claims and answers belong to its tab.", state: "Decided" },
      { question: "Does declining a request store a deny?", answer: "No: the request is Declined and the use stays unanswered. Whether it should store a deny is open.", state: "Open" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-04",
    title: "S2 Publisher workspace",
    appliesTo: "S2 · Publisher",
    owner: "Revelator Pro",
    updated: day(2026, 10, 19),
    summary:
      "The same Revelator Pro shell, worked as a publisher: Overview, Works, Recordings to link, Registrations, Clearances, Requests, Conflicts. A publisher sees and answers for its own share only.",
    prototype: PUBLISHER("rights", "overview"),
    related: ["PB-01", "PB-05", "ARCH-02"],
    requirements: [
      { id: "S2-1", requirement: "Work page: writers, publisher chain, shares by territory", priority: "Must", acceptance: "Given a work, then the chain reads writer → publisher → sub-publisher → collector, each hop with its agreement", built: "Built", where: PUBLISHER("rights", "works", "w-northbound") },
      { id: "S2-2", requirement: "Writer and publisher shares apart, with the society's convention", priority: "Must", acceptance: "Given performance rights in DE, then writer and publisher shares are two lines with the convention named", built: "Built", where: PUBLISHER("rights", "works", "w-northbound"), note: "Conventions are illustrative until each society confirms them." },
      { id: "S2-3", requirement: "Recordings to link, ranked by revenue, with suggested matches", priority: "Must", acceptance: "Given a suggestion, when accepted, then a link claim is written with the method publisher confirmed", built: "Built", where: PUBLISHER("rights", "recordings-to-link") },
      { id: "S2-4", requirement: "Registration status per society; generate CWR", priority: "Should", acceptance: "Given a work missing a registration, then it is flagged and can go in the next CWR file", built: "Built", where: PUBLISHER("rights", "registrations") },
      { id: "S2-5", requirement: "Composition-side clearances with the same grant model as S1", priority: "Must", acceptance: "Given a sync request on a video, then the publisher sees only its own share and grants or declines it", built: "Built", where: PUBLISHER("rights", "clearances") },
      { id: "S2-6", requirement: "Share overclaims across publishers, each claim with its source", priority: "Must", acceptance: "As S1-9, on the composition side", built: "Built", where: PUBLISHER("rights", "conflicts") },
      { id: "S2-7", requirement: "Accept the resolved state territory by territory", priority: "Must", acceptance: "Given a conflict in eight territories, when two are accepted, then those close and six stay open", built: "Built", where: PUBLISHER("rights", "conflicts", "cf-8") },
      { id: "S2-8", requirement: "Counterclaim with evidence and a four-step tracker", priority: "Must", acceptance: "Given a counterclaim, then both sides see the same tracker and each step change notifies the other", built: "Built", where: PUBLISHER("rights", "conflicts", "cf-1") },
    ],
    questions: [
      { question: "Must a label's recording-to-work link wait for the publisher?", answer: "No: it is written straight through with its method named, and the publisher can correct it.", state: "Decided" },
      { question: "Which society conventions apply to writer and publisher shares?", answer: "Shown as labelled examples until each society's rules are stored.", state: "Open" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-05",
    title: "S3 Artist app",
    appliesTo: "S3 · Artist, writer, delegate",
    owner: "Revelator mobile",
    updated: day(2026, 10, 18),
    summary:
      "Where personal rights live: identity, credits, voice and likeness. It is not a catalogue manager. Tabs: Home, Credits, Consent, Activity, Profile; writer mode adds Works. Consent is the front door; identity sits under Profile. Someone new signs up, checks their ID and claims their entries in the graph.",
    prototype: ARTIST("home"),
    related: ["PB-03", "PB-04", "SPEC-06"],
    requirements: [
      { id: "S3-1", requirement: "Sign up and verify identity with an ID check", priority: "Must", acceptance: "Given the check passes, then the assurance level is stored and shown", built: "Partly built", where: as("New artist", href("artist", "sign-up")), note: "No code is really sent and no camera is used; the check's outcome is chosen." },
      { id: "S3-2", requirement: "Claim existing artist and writer entries, with IPI or ISNI", priority: "Must", acceptance: "Given a claim, when the label or Sureel confirms it, then the profile shows as verified", built: "Built", where: ARTIST("profiles") },
      { id: "S3-3", requirement: "Credits: confirm or deny each recording and work", priority: "Must", acceptance: "Given a confirmed credit, then a signed role attestation is recorded and the tier can rise to T4", built: "Built", where: ARTIST("credits") },
      { id: "S3-4", requirement: "Voice/NIL consent by partner and use", priority: "Must", acceptance: "Given an attestation on their behalf, then the artist is told and can dispute it; a dispute opens a conflict and never silently revokes", built: "Built", where: ARTIST("consent") },
      { id: "S3-5", requirement: "One switch: no AI use of my voice or likeness", priority: "Must", acceptance: "Given the opt-out, then every Voice/NIL read for the artist is Denied, and blocked requests are listed", built: "Built", where: ARTIST("consent") },
      { id: "S3-6", requirement: "Where I'm cleared, in plain language", priority: "Should", acceptance: "Given a track, then uses read allowed or not allowed, with no commercial terms", built: "Built", where: ARTIST("cleared") },
      { id: "S3-7", requirement: "Activity: requests, attestations, blocked uses", priority: "Must", acceptance: "Given an event about the artist, then it appears, newest first", built: "Built", where: ARTIST("activity") },
      { id: "S3-8", requirement: "Delegates with scoped approval rights", priority: "Should", acceptance: "Given a delegate approves, then the record reads approved by the delegate for the artist", built: "Built", where: ARTIST("delegates") },
      { id: "S3-9", requirement: "Writer mode: works, registrations, missing memberships", priority: "Should", acceptance: "Given no society in a territory, then the app flags it", built: "Built", where: as("Writer", href("artist", "works")) },
      { id: "S3-10", requirement: "Earnings", priority: "Could", acceptance: "Out of the graph's scope; a link to statements where the artist is a payee", built: "Not built" },
    ],
    tables: [
      {
        title: "Sign-up, in order",
        columns: ["Step", "What the person does", "What it writes"],
        rows: [
          ["1 · Contact", "Gives an email or a phone number, or opens an invitation", "Nothing yet"],
          ["2 · Code", "Types the code sent to it", "An ArtistID at Basic assurance"],
          ["3 · ID check", "Photographs a document and a selfie", "Verified + ID, when it passes"],
          ["4 · Claim", "Picks their artist and writer entries, with IPI or ISNI", "Profile claims, waiting for the label or Sureel"],
        ],
      },
    ],
    questions: [
      { question: "What is the artist's front door?", answer: "Consent, in plain sentences with one switch each; credits are tasks on Home.", state: "Decided" },
      { question: "Which assurance level signs Voice/NIL?", answer: "Not decided; the app records the level each signature was made at.", state: "Open" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-06",
    title: "S4 Approval inbox, notifications and escalation",
    appliesTo: "S4 · Anyone who approves",
    owner: "Revelator Pro",
    updated: day(2026, 10, 19),
    summary:
      "One request shape with three homes — S1, S2 and S3. Everything that needs a person lands in that person's inbox, is announced by email, push or in-app with a digest option, and goes up a role when it is left unanswered past its deadline.",
    prototype: LABEL("rights", "requests"),
    related: ["PB-07", "SPEC-03", "SPEC-04"],
    requirements: [
      { id: "S4-1", requirement: "Five item types, each with its own actions", priority: "Must", acceptance: "Given each type, then it shows with its own actions", built: "Built", where: LABEL("rights", "requests") },
      { id: "S4-2", requirement: "Everything the decision needs, on every item", priority: "Must", acceptance: "Given an item, then nothing the decision needs is more than one step away", built: "Built", where: LABEL("rights", "requests", "rq-2201") },
      { id: "S4-3", requirement: "Approve, decline, counter, dispute, delegate", priority: "Must", acceptance: "Given an action, then it writes a claim or grant and the requester is told", built: "Built", where: LABEL("rights", "requests", "rq-2201") },
      { id: "S4-4", requirement: "Notifications by email and push, with a digest", priority: "Must", acceptance: "Given a new item, then its owner is told", built: "Partly built", where: LABEL("notifications"), note: "Nothing is sent; each product's outbox shows what would have been." },
      { id: "S4-5", requirement: "Unanswered items escalate to the next role", priority: "Should", acceptance: "Given seven days with no action, then the item escalates and its owner still sees it", built: "Built", where: href("console", "notifications", "escalation"), note: "A demo clock moves time forward." },
    ],
    tables: [
      {
        title: "Each item type and what can be done to it",
        columns: ["Item type", "Who sends it", "Actions"],
        rows: [
          ["Licence request", "A partner, through S6 or the API", "Approve, decline, counter, delegate"],
          ["Attestation request", "A label asking an artist to sign", "Sign, dispute"],
          ["Conflict response", "Sureel ops", "Respond with evidence, withdraw"],
          ["Credit confirmation", "A label or a publisher", "Confirm, deny"],
          ["Delegate approval", "A delegate acting for an artist", "Read, with who approved for whom"],
        ],
      },
    ],
    questions: [
      { question: "Do urgent notices wait for a digest?", answer: "No: escalations, paused or revoked licences and on-behalf notices are sent at once.", state: "Decided" },
      { question: "Does the escalation clock change clearances?", answer: "No: it runs ahead of the graph's date, so no term or grant expires when it moves.", state: "Decided" },
      { question: "Can a person mute one kind of notice?", answer: "Not yet: channels and digest apply to every kind.", state: "Open" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-07",
    title: "S5 Contributor portal",
    appliesTo: "S5 · Bulk contributor",
    owner: "Sureel",
    updated: day(2026, 10, 17),
    summary:
      "A bulk contributor's own tenant. It has to show, plainly, what the contributor gave, what it got back, and who read it — and that no other tenant can see what it keeps private.",
    prototype: href("contributor", "overview"),
    related: ["PB-06", "ARCH-07"],
    requirements: [
      { id: "S5-1", requirement: "Upload bulk files; a schema check before accept", priority: "Must", acceptance: "Given bad ISRCs, then row-level errors show before anything is ingested", built: "Partly built", where: href("contributor", "upload"), note: "CSV, JSON, DDEX and CWR are parsed in the browser; Parquet is refused with a reason; SFTP and API stand in for a fed file." },
      { id: "S5-2", requirement: "Status per batch: received, validated, ingested, matched", priority: "Must", acceptance: "Given a batch, then each stage has a count and failed rows can be saved", built: "Built", where: href("contributor", "batches", "b-3108") },
      { id: "S5-3", requirement: "Match results: matched, new, conflicting, unmatched", priority: "Must", acceptance: "Given a catalogue, then the four counts show and each opens its records", built: "Built", where: href("contributor", "matches") },
      { id: "S5-4", requirement: "Coverage, revenue-weighted, and its change since the last upload", priority: "Must", acceptance: "Given a contributor, then it sees its own coverage only", built: "Built", where: href("contributor", "coverage") },
      { id: "S5-5", requirement: "Sharing per field: shared, private or encrypted", priority: "Must", acceptance: "Given a private field, then no other tenant can read it, and the portal says so", built: "Built", where: href("contributor", "sharing") },
      { id: "S5-6", requirement: "Access log: who read, when, through what", priority: "Must", acceptance: "Given any read, then it appears in the log", built: "Built", where: href("contributor", "access") },
      { id: "S5-7", requirement: "Conflicts on its claims, as far as sharing allows", priority: "Should", acceptance: "Given a conflict, then the contributor sees share totals, never another party's private terms", built: "Built", where: href("contributor", "conflicts") },
      { id: "S5-8", requirement: "Governance: charter, audit reports, signing keys", priority: "Should", acceptance: "Given a new audit, then it is published here", built: "Built", where: href("contributor", "charter") },
      { id: "S5-9", requirement: "Field mapping, with saved mappings reused", priority: "Must", acceptance: "Given custom headers, then suggestions can be confirmed in bulk and apply to the next file", built: "Built", where: href("contributor", "mapping") },
    ],
    questions: [
      { question: "How does a contributor trust a graph it does not run?", answer: "By being shown: sharing per field, every read of its data logged, audit-window reads marked.", state: "Decided" },
      { question: "Who may read private terms?", answer: "Sureel ops, only inside a logged, time-boxed audit window the contributor sees in its access log.", state: "Decided" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-08",
    title: "S6 Partner portal",
    appliesTo: "S6 · AI platform, DSP, society",
    owner: "Sureel",
    updated: day(2026, 10, 18),
    summary:
      "A developer portal with a thin operations layer: keys and docs, clearance look-ups with signed receipts, licence requests, usage and provenance reports, webhooks — and, for a society, registrations and acknowledgements.",
    prototype: CADENCE("overview"),
    related: ["PB-02", "PB-07", "PB-08", "ARCH-07"],
    requirements: [
      { id: "S6-1", requirement: "Onboarding: organisation, contacts, uses, territories, terms", priority: "Must", acceptance: "Given approval, then the partner gets sandbox and production keys", built: "Built", where: CADENCE("organisation") },
      { id: "S6-2", requirement: "Keys, scopes and rotation; docs and a sandbox", priority: "Must", acceptance: "Given a sandbox key, then every Clearance API call works against test data", built: "Built", where: CADENCE("keys") },
      { id: "S6-3", requirement: "Clearance look-up by ISRC, ISWC or title", priority: "Must", acceptance: "Given an ISRC and a use, then the answer is Granted, Denied or Needs review with a receipt ID", built: "Built", where: CADENCE("lookups") },
      { id: "S6-4", requirement: "Licence requests over a scope, tracked", priority: "Must", acceptance: "Given a request, then it reaches each side's holders and its status updates here", built: "Built", where: CADENCE("requests") },
      { id: "S6-5", requirement: "Usage and provenance upload", priority: "Must", acceptance: "Given a usage file, then rows link to assets and unmatched rows are flagged", built: "Built", where: CADENCE("usage") },
      { id: "S6-6", requirement: "Every answer downloadable as a signed receipt", priority: "Must", acceptance: "Given a receipt, then it verifies in S8", built: "Partly built", where: CADENCE("lookups"), note: "The digest is real SHA-256 over canonical JSON; the signature is a stand-in value." },
      { id: "S6-7", requirement: "Webhooks: clearance changed, licence paused or revoked", priority: "Must", acceptance: "Given a revoke, then subscribed partners are told", built: "Partly built", where: CADENCE("webhooks"), note: "Each write returns the payload it would post; nothing is posted." },
      { id: "S6-8", requirement: "Society view: registrations and acknowledgements", priority: "Should", acceptance: "Given an acknowledgement file, then registrations update and mismatches open conflicts", built: "Built", where: as("GEMA", href("partner", "registrations")) },
    ],
    questions: [
      { question: "Does a partner browse catalogues, or ask?", answer: "It asks — one asset, one use, one place, one time — and keeps the signed answer.", state: "Decided" },
      { question: "What does an answer tell a partner about others?", answer: "Nothing: a reason names only the asking partner, never the others on an allowlist.", state: "Decided" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-09",
    title: "S7 Graph Console",
    appliesTo: "S7 · Sureel ops",
    owner: "Sureel",
    updated: day(2026, 10, 20),
    summary:
      "Where the graph is run: ingestion health, the conflict queue, match review and merges, the asset inspector, coverage, rule versions, tenants and false-claim tracking. The surface that matters most for correctness.",
    prototype: href("console", "health"),
    related: ["PB-01", "PB-04", "ARCH-04"],
    requirements: [
      { id: "S7-1", requirement: "Ingestion health: sources, batches, error rates, lag", priority: "Must", acceptance: "Given a late feed, then it is flagged on the home view", built: "Built", where: href("console", "health") },
      { id: "S7-2", requirement: "Conflict queue: assign, comment, resolve with a reason", priority: "Must", acceptance: "Given a HIGH conflict, then it is on top; resolving it records the rule or evidence used", built: "Built", where: href("console", "conflicts") },
      { id: "S7-3", requirement: "Match review below auto-accept, side by side", priority: "Must", acceptance: "Given a suggested merge, then both records, shared identifiers and co-writers show", built: "Built", where: href("console", "matches") },
      { id: "S7-4", requirement: "Every merge reversible", priority: "Must", acceptance: "Given a wrong merge undone, then splits recompute and affected parties are listed", built: "Built", where: href("console", "merges") },
      { id: "S7-5", requirement: "Asset inspector: every claim, the resolved view, and why", priority: "Must", acceptance: "Given an asset, then each resolved value links to its winning claim and the rule version", built: "Built", where: href("console", "assets", "r-northbound") },
      { id: "S7-6", requirement: "Coverage: the four measures, per lane, over time", priority: "Must", acceptance: "Given a new lane, then its added coverage shows", built: "Built", where: href("console", "coverage") },
      { id: "S7-7", requirement: "Rule versions: view, diff, replay a draft before publishing", priority: "Should", acceptance: "Given a draft, then the console shows how many values would change and the revenue affected", built: "Partly built", where: href("console", "rules"), note: "Publishing a version does not yet change what the resolver reads." },
      { id: "S7-8", requirement: "Tenants, sharing policies, access audits", priority: "Must", acceptance: "Given a policy change, then it is logged and the contributor is told", built: "Built", where: href("console", "tenants") },
      { id: "S7-9", requirement: "False-claim tracking and restricted auto-acceptance", priority: "Should", acceptance: "Given a party past the threshold, then its new claims need review and ops sees why", built: "Partly built", where: href("console", "claimants"), note: "Suspension is shown unavailable until the policy is set." },
    ],
    questions: [
      { question: "What does ops open first?", answer: "Ingestion health: a late feed changes every number below it. The queue is one step away.", state: "Decided" },
      { question: "What restricts a repeat offender?", answer: "A policy decision; built as restricted auto-acceptance only.", state: "Open" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-10",
    title: "S8 Verification portal",
    appliesTo: "S8 · Verifier",
    owner: "Sureel",
    updated: day(2026, 10, 16),
    summary:
      "A public page that checks a receipt or event ID against the Proof Log with no account, and never shows an amount, a percentage or a private term. It also reads the old on-chain registry as an archive.",
    prototype: RECEIPT,
    related: ["PB-08", "ARCH-08"],
    requirements: [
      { id: "S8-1", requirement: "Paste a receipt or event ID and see if it is intact", priority: "Must", acceptance: "Given a valid receipt, then the page shows Verified with the time and the signing key", built: "Built", where: RECEIPT },
      { id: "S8-2", requirement: "No amounts, percentages or private terms, ever", priority: "Must", acceptance: "Given any event, then only its type, opaque IDs, scope, use, time and hash show", built: "Built", where: RECEIPT },
      { id: "S8-3", requirement: "A proof bundle for offline checks", priority: "Should", acceptance: "Given a bundle, then it verifies with the published key and no network", built: "Partly built", where: RECEIPT, note: "The payload digest is checked for real; the signature and timestamp token are stand-ins." },
      { id: "S8-4", requirement: "The on-chain registry, read-only", priority: "Should", acceptance: "Given an old asset URI, then its imported record and original transaction show", built: "Built", where: href("verify", "archive") },
    ],
    questions: [
      { question: "Does verifying need an account?", answer: "The page needs none and the bundle verifies offline; the verification API stays keyed.", state: "Decided" },
      { question: "Are batch roots also published to a public chain?", answer: "Not decided; timestamping and a public transparency page are the baseline.", state: "Open" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-11",
    title: "Roles and permissions",
    appliesTo: "All surfaces",
    owner: "Rights Graph product",
    updated: day(2026, 10, 20),
    summary:
      "A permission attaches to a role within an organisation, scoped to the assets that organisation has a claim on. One person can hold roles in several organisations and switches between them. A command a role cannot use stays on screen with the reason.",
    prototype: href("home", "personas"),
    related: ["SPEC-01", "SPEC-02", "ARCH-07"],
    requirements: [
      { id: "R-1", requirement: "A command a role cannot use is shown unavailable, with why", priority: "Must", acceptance: "Given a delegate without the scope, then the command is there and says what it needs", built: "Built", where: as("Delegate", href("artist", "delegates")) },
      { id: "R-2", requirement: "Only Sureel ops resolves a conflict between parties", priority: "Must", acceptance: "Given anyone else, then Resolve is unavailable and the parties can only respond", built: "Built", where: as("Data engineer", href("console", "conflicts", "cf-1")) },
      { id: "R-3", requirement: "Private terms are read only under audit", priority: "Must", acceptance: "Given an audit read, then it shows in the contributor's access log, marked", built: "Built", where: href("contributor", "access") },
      { id: "R-4", requirement: "Roles follow the organisation the reader works as", priority: "Must", acceptance: "Given a switch from label to publisher, then the Rights section is re-filed for the publisher", built: "Built", where: PUBLISHER("rights", "overview") },
    ],
    tables: [
      {
        title: "Who may do what",
        columns: ["Action", "Label admin", "Label member", "Publisher admin", "Artist or writer", "Delegate", "Contributor", "Partner", "Sureel ops", "Verifier"],
        rows: [
          ["See resolved rights", "Own assets", "Own assets", "Own works", "Own credits", "The artist's", "Own tenant", "Cleared uses", "All", "No"],
          ["Add or correct a claim", "Yes", "Draft only", "Yes", "Credits only", "No", "By upload", "No", "With a reason", "No"],
          ["Grant or deny AI consent", "Yes", "No", "Composition side", "Voice/NIL, opt-out", "If delegated", "No", "No", "No", "No"],
          ["Attest Voice/NIL for someone", "With authority", "No", "No", "No", "No", "No", "No", "No", "No"],
          ["Answer a licence request", "Yes", "No", "Yes", "Voice/NIL only", "If delegated", "No", "Asks", "No", "No"],
          ["See another party's private terms", "No", "No", "No", "No", "No", "No", "No", "Under audit", "No"],
          ["Resolve a conflict", "Respond", "No", "Respond", "Dispute", "No", "Respond", "No", "Yes", "No"],
          ["Merge or unmerge", "No", "No", "No", "No", "No", "No", "No", "Yes", "No"],
          ["Verify a receipt", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes"],
        ],
      },
    ],
    questions: [
      { question: "Is a person's role on their login?", answer: "No: on the organisation and context they work in.", state: "Decided" },
      { question: "Where does a label's right to attest come from?", answer: "The prototype requires a cited clause; each case needs review, not a default.", state: "Open" },
    ],
  },
  {
    kind: "Specification",
    id: "SPEC-12",
    title: "Cross-surface flows F1–F6",
    appliesTo: "All surfaces",
    owner: "Rights Graph product",
    updated: day(2026, 10, 20),
    summary:
      "Six flows prove the surfaces fit. Each starts on one surface and ends on another, and is walked end to end rather than screen by screen. Writes are kept for the browser session, so a flow walked across surfaces carries what each step wrote.",
    prototype: href("home", "flows"),
    related: ["SPEC-01", "PB-01", "PB-03", "PB-08"],
    requirements: [
      { id: "F1", requirement: "A label releases a track and sets AI consent", priority: "Must", acceptance: "A new release starts from the label's defaults and climbs the ladder as delivery, the publisher and the artist confirm it", built: "Built", where: href("home", "flows", "F1"), note: "Starts at step 2: the track exists in the data." },
      { id: "F2", requirement: "An AI platform asks for a licence", priority: "Must", acceptance: "The request splits by copyright side, each holder answers only for its share, and the partner sees per-track results with receipts", built: "Built", where: href("home", "flows", "F2") },
      { id: "F3", requirement: "A label attests Voice/NIL for an artist", priority: "Must", acceptance: "The artist is told, can dispute, and the dispute pauses the grant pending review", built: "Built", where: href("home", "flows", "F3"), note: "Starts part-way: the dispute is already in the data." },
      { id: "F4", requirement: "A peer contributes its catalogue", priority: "Must", acceptance: "Row errors are caught before ingest, matching reports four counts, and the contributor sees its coverage and access log", built: "Built", where: href("home", "flows", "F4") },
      { id: "F5", requirement: "A publisher overclaim", priority: "Must", acceptance: "An acknowledgement that disagrees is kept, the overclaim is routed, and payment holds to the stronger claim until ops resolves", built: "Built", where: href("home", "flows", "F5") },
      { id: "F6", requirement: "An auditor verifies a clearance", priority: "Should", acceptance: "Someone with no account proves a clearance existed, unaltered, without seeing any amount", built: "Built", where: href("home", "flows", "F6") },
    ],
    questions: [
      { question: "Does a dispute pause the grant or leave it live?", answer: "Built as paused: a paused grant can be reinstated with no harm; a use made under a disputed consent cannot be undone. The policy is not decided.", state: "Open" },
      { question: "May Voice/NIL be granted during a dispute?", answer: "Built as blocked.", state: "Open" },
    ],
  },
];

const ARCHITECTURE: readonly Architecture[] = [
  {
    kind: "Architecture",
    id: "ARCH-01",
    title: "Data model",
    appliesTo: "The graph",
    owner: "Graph engineering",
    updated: day(2026, 10, 20),
    summary:
      "Two copyrights stay two entities, a video is a third asset type, and a release packages assets without holding rights. Four kinds of fact sit on the asset layer and never share a table: rights assertions, clearance grants, attestations and provenance records. Every one names a party and traces to an agreement or a declared source.",
    prototype: href("console", "assets"),
    related: ["ARCH-02", "ARCH-03", "ARCH-05"],
    tables: [
      {
        title: "Assets",
        columns: ["Asset", "What it is", "Holds rights", "Identified by"],
        rows: [
          ["Work", "A composition: melody and lyrics", "Composition side", "ISWC"],
          ["Recording", "A master, which embodies one or more works", "Master side", "ISRC"],
          ["Video", "Contains recordings and may use works directly", "Master side; inherits from what it contains", "ISRC or platform ID"],
          ["Release", "Packages recordings and videos for delivery", "Never — it is as cleared as its least cleared track", "UPC"],
        ],
      },
      {
        title: "The four kinds of fact",
        columns: ["Fact", "Answers", "Key fields"],
        rows: [
          ["Rights assertion", "Who owns, controls, administers or collects — four edges, never one owner field", "Party, interest, right type, share type, share, territory, valid dates, known since, source, agreement, supersedes"],
          ["Clearance grant", "May this be used for X, by whom, where and when", "Scope level and reference, copyright side, use, grant or deny, partners, territory, dates, granted by, authority"],
          ["Attestation", "A signed statement: a role, Voice/NIL consent, an AI disclosure, an opt-out", "Attestor, on behalf of, subject, claim type, identity assurance, signature, key, issued, revoked"],
          ["Provenance record", "How an asset was made: human, AI-assisted or AI-generated", "Creation class, model, operator, training-data fingerprint, reported by"],
        ],
      },
      {
        title: "Links",
        columns: ["Link", "From → to", "Key fields", "Why it matters"],
        rows: [
          ["Recording to work", "Recording → Work", "Portion, source, confidence", "Routes publishing income; a missing link is unmatched money"],
          ["Video to recording", "Video → Recording", "Timecodes, usage", "A video inherits master rights from what it contains"],
          ["Video to work", "Video → Work", "Timecodes, usage", "A composition used with no master — a cover, a live take"],
          ["Release item", "Release → Recording or Video", "Disc, track number", "Packaging and delivery only"],
          ["Derivation", "Asset → Asset", "Kind, portion", "Lineage: sample, remix, cover, AI-derived"],
          ["Contribution", "Party → Asset", "Role, credited name, source", "Credits, and the subject of role attestations"],
          ["Same as", "Asset or party → same kind", "Method, confidence, reviewer", "Reversible dedupe; never a destructive merge"],
        ],
      },
    ],
    questions: [
      { question: "Is a video its own asset or a kind of recording?", answer: "Its own: it has different identifiers, platform claims and sync rules.", state: "Decided" },
      { question: "Are the works a video touches stored on it?", answer: "No: they are read at query time from its direct links and its recordings' links, so a corrected link reaches every video.", state: "Decided" },
      { question: "Where do registrations and merge history live?", answer: "Registrations, conflict evidence, counter-offers, suggested links and merge history are held beside the graph in each surface's data; the model has no home for them yet.", state: "Open" },
    ],
  },
  {
    kind: "Architecture",
    id: "ARCH-02",
    title: "Ownership precedence and resolution",
    appliesTo: "The resolver",
    owner: "Graph engineering",
    updated: day(2026, 10, 20),
    summary:
      "Every source's claim is stored as its own row and never overwritten. The resolved view is derived, by versioned code: the same claims and the same rule version always give the same answer. When sources disagree within a tier, the resolver opens a conflict instead of picking one, and keeps paying on the standing claims until it is decided.",
    prototype: href("console", "assets", "w-northbound"),
    related: ["ARCH-01", "ARCH-04", "PB-01"],
    tables: [
      {
        title: "Source precedence, v1",
        columns: ["Rank", "Source", "Note"],
        rows: [
          ["1", "Signed agreement on file", "The strongest evidence of a right"],
          ["2", "Society registration, acknowledged", "A work number issued"],
          ["3", "Registration submitted by the controlling publisher", "Sent, not yet acknowledged"],
          ["4", "Label or distributor declaration", "DDEX messages, splits entered in Revelator Pro"],
          ["5", "Self-declared", "A split sheet, the artist app"],
          ["6", "Platform claim", "Evidence only — it never resolves ownership on its own"],
        ],
      },
      {
        title: "Where a claim stands",
        columns: ["State", "When"],
        rows: [
          ["Resolved", "The claim won: the resolved value is this claim's"],
          ["Contested", "It would take its share type past 100% somewhere it reaches; a conflict is open"],
          ["No authority", "It claims control under an agreement that does not reach every territory asked"],
          ["Superseded", "A later claim by the same party corrected it; it stays on the record"],
          ["Withdrawn", "Its party took it back"],
        ],
      },
      {
        title: "Worked example: Northbound",
        columns: ["#", "Party", "Interest", "Share", "Territory", "Source"],
        rows: [
          ["1", "Harbor Music", "Owns, controls", "50% publisher", "World", "Signed agreement AGR-101"],
          ["2", "Ben Songs", "Owns, controls", "50% publisher", "World", "Society acknowledgement"],
          ["3", "Rhein Edition", "Administers, collects", "Harbor's 50%, mechanical and performance", "DE, AT, CH", "Sub-publishing AGR-205"],
          ["4", "Harbor Music", "Collects", "50%, mechanical and performance", "World excl. DE, AT, CH", "AGR-101"],
          ["5", "Harbor Music", "Owns", "60% publisher", "DE", "Society acknowledgement"],
        ],
      },
      {
        title: "What the graph answers",
        columns: ["Question", "Answer"],
        rows: [
          ["Performance in DE, today", "Rhein Edition collects Harbor's 50%; Ben Songs' 50% flows through its society"],
          ["Performance in the US, today", "Harbor Music and Ben Songs each collect 50% of the publisher side"],
          ["Shares in DE", "Rows 5 and 2 claim 110%: an overclaim opens HIGH, and rows 1–3 keep paying until it is resolved"],
          ["After AGR-101 ends", "Without a reversion claim, the graph reports a 50% gap rather than keep Harbor"],
        ],
      },
    ],
    questions: [
      { question: "Do one party's claims add up?", answer: "No: a party's largest standing claim per share type is what it claims.", state: "Decided" },
      { question: "Does the order match how sources are ranked today?", answer: "Adopted as drafted; to be confirmed by the people who rank sources today.", state: "Open" },
    ],
  },
  {
    kind: "Architecture",
    id: "ARCH-03",
    title: "Clearance resolution",
    appliesTo: "The resolver",
    owner: "Graph engineering",
    updated: day(2026, 10, 20),
    summary:
      "A grant is stored at the scope it was made and resolved at read time — never fanned out to every track. The first match wins, most specific first, deny before grant at the same level. Three rules sit on top: dependency, composition and authority. A use that touches both copyrights needs both sides cleared.",
    prototype: LABEL("rights", "clearances"),
    related: ["ARCH-01", "PB-02", "PB-07"],
    tables: [
      {
        title: "Order, most specific first",
        columns: ["Level", "Applies", "Note"],
        rows: [
          ["1 · Artist", "Voice/NIL only", "Overrides every other level for that artist; an opt-out answers first"],
          ["2 · Asset", "Every use", "Deny, then grant"],
          ["3 · Release", "Every use", "A release holds no rights; its grants reach its tracks"],
          ["4 · Label or catalogue", "Every use", "One grant covers the catalogue"],
          ["5 · Default", "Every use", "Deny for every AI use; existing territory clearance for distribution"],
        ],
      },
      {
        title: "The rules on top",
        columns: ["Rule", "What it says"],
        rows: [
          ["Dependency", "AI training comes before AI derivative, Voice/NIL and AI streaming; revoking training revokes them"],
          ["Composition", "A use touching both copyrights needs both cleared; a video's sync needs its master and every embodied work's controlling publishers, per territory"],
          ["Missing link", "A recording with no work link answers Needs review, never Granted"],
          ["Authority", "A grant counts only if its grantor holds a controlling edge for that right, territory and date; otherwise it is stored and flagged"],
          ["Voice/NIL", "A voice is a person's, not a song's: it never asks the publishers"],
          ["Dispute", "A paused grant reads Needs review until its dispute is resolved"],
        ],
      },
      {
        title: "What the prototype answers",
        columns: ["Asked", "Answer", "Why"],
        rows: [
          ["Northbound video, sync, US", "Needs review", "Master and Harbor's half are granted; Ben Songs granted nothing"],
          ["Northbound, AI training, Cadence AI", "Needs review", "The catalogue grant clears the master; no composition grant exists"],
          ["Lowlight, AI training", "Denied", "An asset-level deny overrides the catalogue grant"],
          ["Lowlight, sync, US", "Needs review", "The grantor holds no controlling edge in the US: stored and flagged"],
          ["Mira Castellanos, Voice/NIL, Voxa Voice", "Needs review", "Granted on her behalf, then paused by her dispute"],
          ["Juno Hale, Voice/NIL", "Denied", "Her AI opt-out is an artist-level deny"],
          ["Switchback, AI training", "Needs review", "No recording-to-work link"],
        ],
      },
    ],
    questions: [
      { question: "Does AI training on a recording need composition-side consent?", answer: "A legal question, not a modelling one. The model supports both; the default requires both sides.", state: "Open" },
      { question: "Is a release cleared?", answer: "As cleared as its least cleared track, with how many of its tracks are.", state: "Decided" },
    ],
  },
  {
    kind: "Architecture",
    id: "ARCH-04",
    title: "Invariants and conflicts",
    appliesTo: "The resolver",
    owner: "Graph engineering",
    updated: day(2026, 10, 20),
    summary:
      "Some things may never be true of the graph. Each is checked on write or by a nightly scan, and a break either refuses the write or opens a conflict with revenue at risk. A conflict is first-class: it names every claim, keeps paying on the standing ones, and closes only with a reason.",
    prototype: href("console", "conflicts"),
    related: ["ARCH-02", "PB-01", "PB-04"],
    tables: [
      {
        title: "Invariants",
        columns: ["Invariant", "Checked by", "When broken"],
        rows: [
          ["Shares per asset, right, share type, territory and period total at most 100%", "The resolver, on every write", "Overclaim, HIGH where the asset earns"],
          ["Shares below 100%", "Nightly scan", "Gap, with revenue at risk"],
          ["Every rights edge has a territory set and a start date", "The write path", "Write refused"],
          ["Every owning or controlling edge traces to an agreement or a declared source", "The write path", "Write refused"],
          ["Every earning recording has at least one work link", "Nightly scan", "HIGH: publishing income unmatched"],
          ["ISRC, ISWC, IPI and UPC check digits are valid", "Ingestion and the API", "Stored as invalid, never linked"],
          ["No destructive merge", "Same-as links only", "Cannot happen: no row is ever deleted"],
        ],
      },
      {
        title: "Conflict kinds",
        columns: ["Kind", "Raised when", "Meanwhile"],
        rows: [
          ["Overclaim", "Claims pass 100%", "Paying on the stronger claims"],
          ["Gap", "Claims fall short of 100%", "The missing share held in suspense"],
          ["Missing work link", "An earning recording embodies no work", "Publishing income held unmatched"],
          ["Territory overlap", "Two claims cover the same place", "Platform claims are evidence only"],
          ["Expired but paying", "A term ended and income still flows", "Paid on until confirmed"],
          ["Attestation dispute", "The party an attestation speaks for says it is wrong", "The grant paused"],
          ["Unauthorized grant", "A grantor holds no controlling edge", "Stored and flagged; never clears"],
        ],
      },
      {
        title: "A counterclaim, step by step",
        columns: ["Step", "What it means"],
        rows: [
          ["1 · Claim submitted", "The dispute is raised and both sides are told"],
          ["2 · Evidence approved", "The disputing party's evidence is accepted"],
          ["3 · Evidence from counterparty", "The other side answers with its own"],
          ["4 · Claim resolved", "Ops decides with a reason and the rule or evidence used"],
        ],
      },
    ],
    questions: [
      { question: "Who resolves a conflict?", answer: "Sureel ops, with a reason. A party may close its own by withdrawing or correcting its claim.", state: "Decided" },
      { question: "Can a conflict be accepted in part?", answer: "Yes: territory by territory, the rest staying open.", state: "Decided" },
    ],
  },
  {
    kind: "Architecture",
    id: "ARCH-05",
    title: "Confidence Ladder T1–T5",
    appliesTo: "Every rights value",
    owner: "Graph engineering",
    updated: day(2026, 10, 18),
    summary:
      "How much the graph trusts an answer, in five tiers. A tier is computed per asset and use at read time, never stored as a label on the asset, so it rises as delivery, agreements, signatures and clearance arrive.",
    prototype: LABEL("catalog", "tracks", "r-harbour-lights", "rights"),
    related: ["SPEC-02", "PB-05", "PB-06"],
    tables: [
      {
        title: "The tiers",
        columns: ["Tier", "Name", "Requires", "How the prototype computes it"],
        rows: [
          ["T1", "Self-declared", "Uploaded metadata only", "Every asset starts here"],
          ["T2", "Distribution-verified", "A successful DSP delivery and consistent identifiers", "The asset was delivered; a work starts at T2"],
          ["T3", "Platform-attested", "An agreement linked, royalty history, identifiers verified", "A standing claim names an agreement, and the asset earns"],
          ["T4", "Contributor-confirmed", "A signed attestation from a verified ArtistID for the credited role", "Every main-artist or composer credit is confirmed"],
          ["T5", "Fully cleared", "T4, chain of title, clearance resolved for the use, provenance recorded, proof timestamped", "Asked for a use: creation is declared and the use is Granted"],
        ],
      },
    ],
    questions: [
      { question: "Is a tier stored?", answer: "No: computed per asset and use, so it can never go stale.", state: "Decided" },
      { question: "Should each claim carry its own tier?", answer: "The claim row asks for one; the graph computes tiers per asset.", state: "Open" },
    ],
  },
  {
    kind: "Architecture",
    id: "ARCH-06",
    title: "Bitemporal reads",
    appliesTo: "Every read",
    owner: "Graph engineering",
    updated: day(2026, 10, 17),
    summary:
      "Every read can take two times: as of — who owned it on that date — and known at — what the graph believed then. A royalty restatement uses both: rerun a period with today's knowledge, compare it to the original run's pinned snapshot, and explain the difference by the claims that changed.",
    prototype: LABEL("catalog", "tracks", "r-northbound", "rights"),
    related: ["ARCH-02", "ARCH-07"],
    tables: [
      {
        title: "The two times",
        columns: ["Time", "Asks", "Stored as"],
        rows: [
          ["As of (valid time)", "Who held the right on that date", "A claim's valid from and valid to"],
          ["Known at (system time)", "What the graph believed on that date", "When a claim became known; when it was superseded or withdrawn"],
        ],
      },
      {
        title: "How a correction reads",
        columns: ["Read", "What counts"],
        rows: [
          ["Known before a claim arrived", "The claim is not there"],
          ["Known before it was superseded", "It still stands, dated by the claim that replaced it"],
          ["Known before it was withdrawn", "It still stands, dated by its withdrawal"],
          ["Northbound in DE, as known on 15 Feb 2026", "100%: the acknowledgement claiming 60% had not arrived"],
          ["Northbound in DE, as known today", "110%: the overclaim is open"],
        ],
      },
    ],
    questions: [
      { question: "Where can a past state be read?", answer: "On an asset's Rights tab, read-only. The console's inspector shows dates but has no as-of control yet.", state: "Open" },
    ],
  },
  {
    kind: "Architecture",
    id: "ARCH-07",
    title: "Write path and the S9 API",
    appliesTo: "S9 · Every system",
    owner: "Graph engineering",
    updated: day(2026, 10, 20),
    summary:
      "Every write is a typed command — AssertRights, GrantClearance, RecordAttestation, RecordProvenance, LinkRecordingWork — validated, written with its event in one transaction, and queued for the Proof Log. Writes are idempotent and batched, answered 202 at once and confirmed later. Reads resolve splits, effective clearance with a signed receipt, chain of title and lineage. The API carries; only the resolver answers.",
    prototype: CADENCE("api"),
    related: ["ARCH-08", "SPEC-08", "SPEC-11"],
    tables: [
      {
        title: "Endpoints",
        columns: ["Endpoint", "Does", "Scope"],
        rows: [
          ["POST /v1/assertions", "Assert rights: own, control, administer, collect", "claims:write or registrations:write"],
          ["POST /v1/clearances", "Grant or deny a use at a scope", "clearances:write"],
          ["POST /v1/attestations", "Record a signed attestation", "attestations:write"],
          ["POST /v1/provenance", "Record what an AI output was made from", "provenance:write"],
          ["POST /v1/links", "Link a recording to a work", "links:write"],
          ["GET /v1/commands/{id}", "A write's confirmation — to the key that wrote it", "Any key"],
          ["GET /v1/assets", "Find an asset by ISRC, ISWC or UPC", "Any read scope"],
          ["GET /v1/assets/{id}/splits", "Resolved splits, as of and known at", "splits:read"],
          ["GET /v1/assets/{id}/clearance/effective", "Effective clearance, with a signed receipt", "clearance:read"],
          ["GET /v1/assets/{id}/chain-of-title", "Writer to collector, each hop with its agreement", "claims:read"],
          ["GET /v1/assets/{id}/lineage", "What the asset derives from", "claims:read"],
          ["GET /v1/proof/events/{id}", "A proof event — never amounts or terms", "Any key"],
          ["GET /v1/proof/events/{id}/inclusion", "Its Merkle path and timestamp token", "Any key"],
          ["GET /v1/proof/keys", "The published signing keys", "None"],
        ],
      },
      {
        title: "What the API refuses",
        columns: ["Rule", "Answer"],
        rows: [
          ["Every write names an Idempotency-Key", "400; the same key and body replays the first answer; a different body is 409"],
          ["At most 500 commands in a batch", "413"],
          ["A key writes only its holder's claims, and supersedes only its own", "The item is rejected; a society's acknowledgement for a registrant is the one exception"],
          ["An attestation on someone's behalf needs a say over its subject", "The item is rejected"],
          ["A partner reads clearance for itself only", "403"],
          ["A write's confirmation is the writing key's", "404 to any other key; event ids are unguessable"],
          ["A grant from a party with no controlling edge", "Stored and flagged; it never clears on its own"],
          ["Codes that fail their check digits", "422, with each field's problem"],
        ],
      },
      {
        title: "Webhooks",
        columns: ["Event", "To", "Means"],
        rows: [
          ["clearance.changed", "Partners that looked the asset up or that a grant names", "An answer they were given changed"],
          ["licence.paused", "The licensee", "Stop new uses until it resumes"],
          ["licence.revoked", "The licensee", "Stop using it; uses already reported stand"],
          ["consent.ack", "The party that recorded the consent", "A consent attestation was signed into the Proof Log"],
          ["conflict.opened", "Every party it names, and ops", "A write overclaimed, left a gap or lacked authority"],
          ["conflict.resolved", "Every party it names", "Closed by ops, or by a party's own correction"],
          ["command.confirmed", "The caller of a write", "The write was applied: each item's outcome and its proof event"],
        ],
      },
    ],
    questions: [
      { question: "Do existing callers rebuild their integration?", answer: "No: the ingestion contract — typed POST, idempotency, batching, asynchronous confirmation, webhooks — stays; only the backend changes.", state: "Decided" },
      { question: "Are webhooks signed?", answer: "Each carries an HMAC signature with the receiver's secret, and only opaque IDs, the use, the scope and the time.", state: "Decided" },
    ],
  },
  {
    kind: "Architecture",
    id: "ARCH-08",
    title: "Proof Log and verification",
    appliesTo: "S8 · The Proof Log",
    owner: "Graph engineering",
    updated: day(2026, 10, 16),
    summary:
      "Tamper evidence without a chain. Each proof event is hashed over canonical JSON, chained to the one before, signed, rolled into a Merkle batch every five minutes, and the batch root is timestamped by an outside authority. A receipt, the public key and the timestamp token are enough to check an event offline, without trusting the graph's database.",
    prototype: href("verify"),
    related: ["SPEC-10", "PB-08", "ARCH-07"],
    tables: [
      {
        title: "How an event is sealed",
        columns: ["Part", "What it gives"],
        rows: [
          ["Payload hash", "SHA-256 of the event's canonical JSON"],
          ["Previous hash and event hash", "A chain: any edit or deletion breaks it"],
          ["Signature", "An Ed25519 key held in a hardware module; keys rotate and old public keys stay published"],
          ["Merkle batch", "Every five minutes; its root timestamped by an outside authority"],
          ["Root publication", "An append-only public page, and optionally a public chain later"],
          ["Write-once storage", "Payloads and roots kept where they cannot be changed"],
        ],
      },
      {
        title: "Event types",
        columns: ["Type", "Written when"],
        rows: [
          ["GENESIS", "An asset's origin is recorded"],
          ["OWNERSHIP_SNAPSHOT", "A resolved ownership state is sealed"],
          ["CLEARANCE_GRANTED", "A grant is made"],
          ["CLEARANCE_RECEIPT", "A partner is given an answer"],
          ["ATTESTATION_SIGNED", "A party signs a statement"],
          ["CONFLICT_OPENED, CONFLICT_RESOLVED", "A disagreement opens or closes"],
          ["SETTLEMENT", "A payment is made — its hash only"],
          ["SUPERSEDE", "A correction; nothing is rewritten"],
          ["IMPORTED", "A record from the on-chain registry, with its original transaction"],
        ],
      },
      {
        title: "What goes in, and what never does",
        columns: ["In the log", "Never in the log"],
        rows: [
          ["Event type", "Amounts"],
          ["Opaque asset and party IDs", "Attribution percentages"],
          ["Scope and use", "Private terms or methodology"],
          ["Time and payload hash", "Personal data"],
        ],
      },
    ],
    questions: [
      { question: "Can anyone rewrite a proof event?", answer: "No one: the log runs as its own service with its own keys, and a correction is a new SUPERSEDE event.", state: "Decided" },
      { question: "Which parts are real in the prototype?", answer: "Receipt digests are real SHA-256 and a changed receipt is caught; event hashes, signatures and timestamp tokens are stand-ins.", state: "Decided" },
    ],
  },
  {
    kind: "Architecture",
    id: "ARCH-09",
    title: "How this prototype is built",
    appliesTo: "The prototype",
    owner: "Design system",
    updated: day(2026, 10, 21),
    summary:
      "One graph, one resolver, nine surfaces drawn from one design system. Every page is a declared form of the Revelator Pro design system; where nothing fit, the page drew the nearest one and the gap was logged. Writes are kept for the browser session, so a flow walked across surfaces carries what each step wrote.",
    prototype: href("home", "gaps"),
    related: ["SPEC-01", "ARCH-07", "ARCH-01"],
    tables: [
      {
        title: "The parts",
        columns: ["Part", "Where", "What it does"],
        rows: [
          ["The model", "src/graph/model.ts", "Assets, parties, the four kinds of fact, conflicts, requests, proof events"],
          ["The data", "src/graph/fixtures.ts", "Invented catalogue around the worked example, and the setters every surface writes through"],
          ["The resolver", "src/graph/resolve.ts", "Precedence, clearance, tiers and bitemporal reads — the only code that answers"],
          ["Notifications", "src/graph/notify.ts", "Hears every write and tells each party by email, push and in-app; nothing is sent"],
          ["The network", "src/graph/network.ts", "Normal, Slow or Offline — a first read waits as a fetch would, or fails"],
          ["The API", "src/api", "The same handlers over HTTP on the dev server and in the browser; an OpenAPI document generated from the route table"],
          ["The rights kit", "src/rights", "Shared rights parts, and real file reading for CSV, JSON, DDEX and CWR"],
          ["The surfaces", "src/surfaces", "One folder per surface; every page drawn through one loading and error wrapper"],
          ["The design system", "@revelator/pro-ui", "Declared pages, components, tokens and eleven rights status families"],
        ],
      },
      {
        title: "What is a stand-in",
        columns: ["Stand-in", "In place of"],
        rows: [
          ["An outbox per product", "Email, push and sign-in codes really sent"],
          ["A chosen ID-check outcome", "A camera and a document check"],
          ["The browser's print dialog", "A PDF export"],
          ["The payload a write returns", "Webhooks posted to partners"],
          ["Invented hashes, signatures and tokens", "A running Proof Log; receipt digests are real"],
          ["Another organisation's mark", "Sureel's own mark and accent"],
          ["The contributor portal's batches", "Bulk DDEX, CWR and SFTP feeds"],
          ["A demo clock", "Time passing, for escalation"],
        ],
      },
    ],
    questions: [
      { question: "How is it checked?", answer: "Types, the design system's page check and stack lint over every page, and an API check of the worked example's answers.", state: "Decided" },
      { question: "Where are the design system's gaps?", answer: "Logged per surface and read as one index on the map.", state: "Decided" },
    ],
  },
];

const PLAYBOOKS: readonly Playbook[] = [
  {
    kind: "Playbook",
    id: "PB-01",
    title: "Resolving a publisher overclaim",
    appliesTo: "Conflict · Overclaim",
    owner: "Sureel rights ops",
    updated: day(2026, 10, 20),
    summary: "Shares on a work pass 100% in a territory. Keep every claim, pay on the stronger ones, gather evidence, decide with a reason.",
    when: "An overclaim opens on a work — most often when a society acknowledgement claims a larger share than the graph holds. Northbound reads 110% in DE.",
    prototype: href("console", "conflicts", "cf-1"),
    related: ["ARCH-02", "ARCH-04", "SPEC-04"],
    steps: [
      { does: "Open the conflict from the queue — HIGH on top", opens: href("console", "conflicts") },
      { does: "Read every claim side by side, with its source", opens: href("console", "conflicts", "cf-1") },
      { does: "Check what pays meanwhile: the stronger claims", opens: href("console", "assets", "w-northbound") },
      { does: "Assign it, and ask the claiming publisher for evidence", opens: href("console", "conflicts", "cf-1") },
      { does: "The publisher uploads its agreement as evidence", opens: PUBLISHER("rights", "conflicts", "cf-1") },
      { does: "Resolve with a reason; both parties are told", opens: href("console", "conflicts", "cf-1") },
    ],
    rules: [
      "A signed agreement outranks a society acknowledgement",
      "A same-tier disagreement is decided by a person",
      "A party's own withdrawal or correction closes it",
      "Accept in some territories, keep disputing the rest",
    ],
    checklist: {
      title: "Before resolving",
      items: [
        "Every claim's source is read, not assumed",
        "The interim payment rests on the stronger claims",
        "The evidence names the work, the territory and the dates",
        "The reason says which rule or document decided",
      ],
    },
    table: {
      title: "The counterclaim's steps",
      columns: ["Step", "Who moves it"],
      rows: [
        ["Claim submitted", "Raised by the graph or a party"],
        ["Evidence approved", "Ops accepts the disputing party's evidence"],
        ["Evidence from counterparty", "The other side answers"],
        ["Claim resolved", "Ops, with a reason"],
      ],
    },
    invariants: [
      { id: "I1", rule: "Never delete or overwrite a claim", damage: "The history that explains the answer is lost" },
      { id: "I2", rule: "Never resolve without a reason", damage: "Neither party can see why, and the decision cannot be replayed" },
      { id: "I3", rule: "Never let a platform claim decide ownership", damage: "Evidence is mistaken for a right" },
    ],
    open: [
      "Which society conventions apply to writer and publisher shares is shown as examples until each society confirms them.",
      "Whether the resolved split is pushed to royalty engines at once or on their next run.",
    ],
  },
  {
    kind: "Playbook",
    id: "PB-02",
    title: "Clearing a catalogue for AI training",
    appliesTo: "Grant · AI training",
    owner: "Label rights team",
    updated: day(2026, 10, 19),
    summary: "One grant at catalogue scope, partners named, the tracks that must not be used denied one by one.",
    when: "A label decides which AI partners may train on its catalogue, or a partner's request shows no standing grant covers it.",
    prototype: LABEL("rights", "consent"),
    related: ["ARCH-03", "SPEC-03", "PB-07"],
    steps: [
      { does: "Open AI consent: what is granted at each scope", opens: LABEL("rights", "consent") },
      { does: "Grant AI training to an allowlist, at catalogue scope" },
      { does: "Add dependent AI uses only once training is granted" },
      { does: "Deny sensitive tracks at asset scope" },
      { does: "Check Clearances: the master side reads Granted", opens: LABEL("rights", "clearances") },
      { does: "Publishers answer for the composition side", opens: PUBLISHER("rights", "requests") },
    ],
    rules: [
      "Store one grant at the scope it was made; never one per track",
      "A master grant never implies a composition grant",
      "Every AI use defaults to deny: nothing granted means Denied",
      "Revoking training revokes every use that depends on it",
    ],
    checklist: {
      title: "Before granting",
      items: [
        "The grantor holds a controlling edge for every territory granted",
        "The partner list is an allowlist, not everyone approved",
        "Sensitive tracks are denied at asset scope",
        "New releases start from the defaults you meant",
      ],
    },
    table: {
      title: "How one catalogue reads",
      columns: ["Track", "AI training", "Why"],
      rows: [
        ["Northbound", "Needs review", "Master granted; no composition grant"],
        ["Lowlight", "Denied", "Asset-level deny"],
        ["Switchback", "Needs review", "No work linked"],
      ],
    },
    invariants: [
      { id: "I1", rule: "Never grant a dependent use before training", damage: "The grant reads Denied and partners act on a contradiction" },
      { id: "I2", rule: "Never grant without authority for the territory", damage: "The grant is stored and flagged, and never clears" },
    ],
    open: ["Whether AI training on a recording needs composition-side consent is a legal question; the default asks both sides."],
  },
  {
    kind: "Playbook",
    id: "PB-03",
    title: "Attesting Voice/NIL on an artist's behalf",
    appliesTo: "Request · Voice/NIL licence",
    owner: "Label rights team",
    updated: day(2026, 10, 18),
    summary: "A Voice/NIL request needs the artist's signature, or the label's on their behalf under a cited clause. The artist is always told.",
    when: "A partner asks for a Voice/NIL licence on an artist's recordings and the label must choose: ask the artist, or attest for them.",
    prototype: LABEL("rights", "requests", "rq-2203"),
    related: ["PB-04", "SPEC-05", "ARCH-03"],
    steps: [
      { does: "Open the request and read its scope", opens: LABEL("rights", "requests") },
      { does: "Check the artist's own consent: an opt-out wins", opens: ARTIST("consent") },
      { does: "Ask the artist to confirm, or attest on their behalf" },
      { does: "To attest, cite the clause that gives the authority" },
      { does: "The grant is stored and the artist is notified", opens: ARTIST("notifications") },
    ],
    rules: [
      "For Voice/NIL, the artist's level overrides all others",
      "Attest only under a clause that gives that authority",
      "Voice/NIL needs AI training cleared first",
      "A voice is the performer's: Voice/NIL never asks the publishers",
    ],
    checklist: {
      title: "Before attesting",
      items: [
        "The artist has not opted out",
        "The cited clause covers Voice/NIL for this partner and use",
        "The partner, territory and dates match the request",
        "No earlier Voice/NIL grant for the artist is under dispute",
      ],
    },
    invariants: [
      { id: "I1", rule: "Never attest without telling the artist", damage: "The artist learns of a use of their voice from the market" },
      { id: "I2", rule: "Never grant while an earlier grant is disputed", damage: "A second use is made under a consent in question" },
    ],
    open: ["Which identity assurance level an artist needs to sign Voice/NIL is not decided."],
  },
  {
    kind: "Playbook",
    id: "PB-04",
    title: "Handling a disputed attestation",
    appliesTo: "Conflict · Attestation dispute",
    owner: "Sureel rights ops",
    updated: day(2026, 10, 18),
    summary: "The artist disputes what the label signed for them. Pause the grant, read both sides and the cited clause, decide with a reason.",
    when: "An artist taps Dispute on an attestation made on their behalf. Mira Castellanos disputes the Voice/NIL consent signed for Voxa Voice.",
    prototype: href("console", "conflicts", "cf-6"),
    related: ["PB-03", "ARCH-04", "SPEC-05"],
    steps: [
      { does: "The artist disputes; a conflict opens", opens: ARTIST("consent") },
      { does: "The grant pauses, not revokes; the partner is told", opens: LABEL("rights", "consent") },
      { does: "Read both claims, the principal and the cited clause", opens: href("console", "conflicts", "cf-6") },
      { does: "Ask the label for the agreement if it is not on file" },
      { does: "Resolve with a reason: resume the grant, or revoke it", opens: href("console", "conflicts", "cf-6") },
      { does: "Artist, label and partner are told the outcome", opens: ARTIST("notifications") },
    ],
    rules: [
      "A dispute pauses the grant; it never silently revokes it",
      "A paused grant reads Needs review to every partner",
      "Revoking is a new event; the attestation stays",
    ],
    checklist: {
      title: "Before resolving",
      items: [
        "The cited clause is read, not summarised",
        "The artist's identity assurance at signing is checked",
        "Uses already reported under the grant are listed",
      ],
    },
    invariants: [
      { id: "I1", rule: "Never revoke on a dispute alone", damage: "One party's word ends a right without review" },
      { id: "I2", rule: "Never leave a disputed grant live", damage: "Uses continue under a consent in question" },
    ],
    open: ["Whether a dispute should pause the grant or leave it live until resolved is a policy decision; built as paused."],
  },
  {
    kind: "Playbook",
    id: "PB-05",
    title: "Linking recordings to works",
    appliesTo: "Conflict · Missing work link",
    owner: "Publisher operations",
    updated: day(2026, 10, 19),
    summary: "An earning recording with no work link is unmatched publishing money. Link it, by suggestion or by hand, and every video that contains it follows.",
    when: "A recording earns and embodies no work — the nightly scan opens a HIGH conflict — or a new release appears under Recordings to link.",
    prototype: PUBLISHER("rights", "recordings-to-link"),
    related: ["ARCH-01", "SPEC-04", "ARCH-05"],
    steps: [
      { does: "Open Recordings to link, earning ones first", opens: PUBLISHER("rights", "recordings-to-link") },
      { does: "Accept a suggested match where the writers agree" },
      { does: "Reject a wrong suggestion, or link one by hand" },
      { does: "Check the Rights tab: the work's publishers now show", opens: LABEL("catalog", "tracks", "r-switchback", "rights") },
      { does: "The missing-link conflict closes when the link is supplied", opens: href("console", "conflicts", "cf-2") },
    ],
    rules: [
      "A missing link never defaults to cleared",
      "Only direct links are stored; videos read through them",
      "A label's link is written straight through, method named",
    ],
    checklist: {
      title: "Before linking",
      items: ["The work's writers match the credits", "The portion is right — full, partial or a medley segment", "The ISRC and ISWC pass their check digits"],
    },
    invariants: [
      { id: "I1", rule: "Never merge two works to make a link fit", damage: "Two copyrights become one and shares are paid to the wrong people" },
      { id: "I2", rule: "Never link on title alone", damage: "Income is routed to a different song's publishers" },
    ],
    open: ["Whether a label's link should wait for the publisher's confirmation; built as written straight through."],
  },
  {
    kind: "Playbook",
    id: "PB-06",
    title: "Onboarding a contributor's catalogue",
    appliesTo: "Batch · Contributor upload",
    owner: "Sureel rights ops",
    updated: day(2026, 10, 17),
    summary: "A contributor's file is checked before anything is ingested, mapped once, matched, and every read of it logged.",
    when: "A bulk contributor sends its first catalogue, or a batch stops at the schema check with row errors.",
    prototype: href("contributor", "upload"),
    related: ["SPEC-07", "ARCH-05"],
    steps: [
      { does: "Upload into the contributor's own tenant", opens: href("contributor", "upload") },
      { does: "Read the schema check: failing rows stop ingest" },
      { does: "Map custom headers once; the mapping is saved", opens: href("contributor", "mapping") },
      { does: "Fix and resubmit, or drop the failed rows", opens: href("contributor", "batches", "b-3108") },
      { does: "Read matched, new, conflicting and unmatched", opens: href("contributor", "matches") },
      { does: "Set sharing per field, then read the access log", opens: href("contributor", "sharing") },
    ],
    rules: [
      "Row errors stop ingestion; nothing invalid is written",
      "A contributor sees only its own data and match results",
      "Other tenants' conflicts show share totals only",
    ],
    checklist: {
      title: "Before ingesting",
      items: ["Every identifier passes its check digit", "Territories are ISO 3166 codes", "Shares are at most 100%", "Every claim has a start date"],
    },
    table: {
      title: "Formats",
      columns: ["Format", "Read here"],
      rows: [
        ["CSV, JSON", "Parsed and checked in the browser"],
        ["DDEX ERN, MWN", "Parsed and checked in the browser"],
        ["CWR 2.1", "Parsed and checked in the browser"],
        ["Parquet", "Refused, with the reason"],
      ],
    },
    invariants: [
      { id: "I1", rule: "Never show one tenant another's private fields", damage: "The contributor's trust in the graph ends" },
      { id: "I2", rule: "Never ingest past a failed schema check", damage: "Bad codes link to the wrong assets" },
    ],
    open: ["Whether bulk feeds by SFTP are polled or pushed; the portal stands in for both."],
  },
  {
    kind: "Playbook",
    id: "PB-07",
    title: "Answering a licence request",
    appliesTo: "Request · Licence",
    owner: "Label and publisher rights teams",
    updated: day(2026, 10, 19),
    summary: "A partner asks for a use over a scope. A standing grant answers it at once; otherwise each side's holder decides for its own share.",
    when: "A licence request lands in Requests with Needs decision, or an item has escalated past its deadline.",
    prototype: LABEL("rights", "requests"),
    related: ["SPEC-06", "PB-02", "ARCH-03"],
    steps: [
      { does: "A partner requests a use over a scope", opens: CADENCE("requests") },
      { does: "Read the item: scope, use, side, territory, deadline", opens: LABEL("rights", "requests", "rq-2201") },
      { does: "Approve, decline, counter or delegate" },
      { does: "A publisher answers only for its own share", opens: PUBLISHER("rights", "requests") },
      { does: "The partner sees each track's answer and receipt", opens: CADENCE("requests") },
    ],
    rules: [
      "A standing grant auto-clears a request, and logs it",
      "A decline writes no deny: the use stays unanswered",
      "Unanswered past its deadline, an item goes up a role",
    ],
    checklist: {
      title: "Before answering",
      items: ["The scope is the one you control", "The territory and dates are within your authority", "The purpose matches the use asked"],
    },
    table: {
      title: "Answers",
      columns: ["Answer", "Writes"],
      rows: [
        ["Approve", "A grant at the request's scope"],
        ["Decline", "The request closed; no deny"],
        ["Counter", "Other terms back to the partner"],
        ["Delegate", "The item handed to a colleague"],
      ],
    },
    invariants: [
      { id: "I1", rule: "Never answer for another party's share", damage: "A grant is made without authority and never clears" },
      { id: "I2", rule: "Never let an item lapse unseen", damage: "The partner waits on an answer nobody owns" },
    ],
    open: ["Whether a decline should store a deny is not decided."],
  },
  {
    kind: "Playbook",
    id: "PB-08",
    title: "Verifying a receipt for an auditor",
    appliesTo: "Receipt · Clearance answer",
    owner: "Partner support",
    updated: day(2026, 10, 16),
    summary: "An auditor proves a clearance answer existed then, unaltered, with no account and no amounts.",
    when: "A partner hands its auditor a receipt for a training run, or anyone needs to check a receipt or event ID.",
    prototype: RECEIPT,
    related: ["ARCH-08", "SPEC-10"],
    steps: [
      { does: "The partner looks up clearance and downloads the receipt", opens: CADENCE("lookups") },
      { does: "The auditor pastes the receipt ID into Verify", opens: href("verify") },
      { does: "Read Verified, the event time and the signing key", opens: RECEIPT },
      { does: "Download the bundle and key; check it offline" },
      { does: "An altered receipt fails: its digest no longer matches" },
    ],
    rules: [
      "Verification needs no account",
      "Only type, opaque IDs, scope, use, time and hashes show",
      "Old keys still verify what they signed",
    ],
    checklist: {
      title: "What the auditor confirms",
      items: ["The receipt's digest matches", "The signing key was valid at the event time", "The event is in its batch's Merkle root", "The root's timestamp predates the use"],
    },
    invariants: [
      { id: "I1", rule: "Never show an amount or a percentage", damage: "Verification becomes a leak of private terms" },
      { id: "I2", rule: "Never ask a verifier to sign in", damage: "Proof depends on trusting the party being checked" },
    ],
    open: ["Whether batch roots are also published to a public chain."],
  },
];

/** The library, in the order it is read. */
export const DOCS: readonly Doc[] = [...SPECIFICATIONS, ...ARCHITECTURE, ...PLAYBOOKS];

export const docById = (id: string | undefined) => DOCS.find((one) => one.id.toLowerCase() === id?.toLowerCase());

/** Where an address in the prototype lands, said as the product it opens. */
export function productAt(address: string): string {
  const surface = /#\/([a-z]+)/.exec(address)?.[1];
  const named: Record<string, string> = {
    pro: "Revelator Pro",
    artist: "Artist app",
    contributor: "Contributor portal",
    partner: "Partner portal",
    console: "Graph Console",
    verify: "Verification portal",
    home: "The map",
  };
  return named[surface ?? ""] ?? "The prototype";
}

/** How many cards the doc's page holds. */
export function sectionsOf(doc: Doc): number {
  // When to use, steps, checklist, never break, related — and what the playbook adds.
  if (doc.kind === "Playbook") return 5 + (doc.rules.length ? 1 : 0) + (doc.table ? 1 : 0) + (doc.open.length ? 1 : 0);
  // Summary, decisions, related — then the requirement table and the doc's own tables.
  const tables = doc.tables?.length ?? 0;
  return 3 + tables + (doc.kind === "Specification" ? 1 : 0);
}
