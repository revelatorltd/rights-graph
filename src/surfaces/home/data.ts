import { href } from "../../route";

/**
 * The map of the prototypes: the nine surfaces, the fourteen parties, the six flows that prove the
 * surfaces fit, and the approaches taken — what the FRD left open and how these screens answer it.
 * Written by hand from the FRD; every address is a page in this app.
 */

/** A persona rides the query, as the system's shell holds it — the page reloads into that context. */
export const as = (persona: string, address: string) => `?persona=${persona.toLowerCase().replace(/\s+/g, "-")}${address}`;

export interface Surface {
  id: string;
  name: string;
  owner: "Revelator" | "Sureel";
  users: string;
  platform: string;
  purpose: string;
  startsFrom: string;
  /** New, or an extension of something that exists. */
  origin: "Extends" | "New";
  /** The FRD's phase for its Must requirements. */
  phase: string;
  opens: string;
  approach: string;
}

export const SURFACES: readonly Surface[] = [
  { id: "S1", name: "Rights workspace", owner: "Revelator", users: "Labels, distributors, WMG imprints", platform: "Web", purpose: "Master rights, splits, clearances and AI consent; licence requests; conflicts on own catalogue", startsFrom: "Revelator Pro catalogue and rights tabs", origin: "Extends", phase: "Resolve and contribute · Clear and serve", opens: as("Label", href("pro", "rights", "overview")), approach: "in-product" },
  { id: "S1·T", name: "Track rights tab", owner: "Revelator", users: "Labels, publishers", platform: "Web", purpose: "Every asset's two sides, claim by claim, with source, tier, territory and dates", startsFrom: "Revelator Pro track, release and video pages", origin: "Extends", phase: "Resolve and contribute", opens: as("Label", href("pro", "catalog", "tracks", "r-northbound", "rights")), approach: "in-product" },
  { id: "S2", name: "Publisher workspace", owner: "Revelator", users: "Publishers, admins, Chappell", platform: "Web", purpose: "Works, writer shares, chain of title, recordings to link, registrations, counterclaims", startsFrom: "Revelator Pro composers and publishers, RightsScale", origin: "Extends", phase: "After day 90", opens: as("Publisher", href("pro", "rights", "overview")), approach: "in-product" },
  { id: "S3", name: "Artist app", owner: "Revelator", users: "Artists, writers, managers", platform: "iOS, Android, mobile web", purpose: "Identity, credits, Voice/NIL and AI consent, where I'm cleared", startsFrom: "Revelator mobile app prototype", origin: "New", phase: "Resolve and contribute · Clear and serve", opens: href("artist", "home"), approach: "personal" },
  { id: "S4", name: "Approval inbox", owner: "Revelator", users: "Anyone with something to approve", platform: "Inside S1, S2, S3", purpose: "One queue for every request that needs a person", startsFrom: "New: the cross-app approval layer", origin: "New", phase: "Clear and serve", opens: as("Label", href("pro", "rights", "requests")), approach: "shared" },
  { id: "S5", name: "Contributor portal", owner: "Sureel", users: "Peer majors, aggregators", platform: "Web", purpose: "Upload and monitor bulk data, match results, coverage, sharing, access log", startsFrom: "New", origin: "New", phase: "Land and measure · Resolve and contribute", opens: href("contributor", "overview"), approach: "walled tenant" },
  { id: "S6", name: "Partner portal", owner: "Sureel", users: "AI platforms, DSPs, societies", platform: "Web", purpose: "Keys, clearance look-up, licence requests, usage and provenance, receipts", startsFrom: "Sureel's partner onboarding", origin: "New", phase: "Clear and serve", opens: href("partner", "overview"), approach: "API-first" },
  { id: "S7", name: "Sureel Graph Console", owner: "Sureel", users: "Sureel rights ops, data engineers", platform: "Web (internal)", purpose: "Ingestion health, conflict queue, match review, asset inspector, coverage, rules", startsFrom: "New", origin: "New", phase: "Land and measure · Resolve and contribute", opens: href("console", "health"), approach: "operator" },
  { id: "S8", name: "Verification portal", owner: "Sureel", users: "Auditors, courts, lenders, regulators, the public", platform: "Web, no account", purpose: "Check a receipt or event ID against the Proof Log", startsFrom: "Replaces registry.original.works", origin: "New", phase: "After day 90", opens: href("verify"), approach: "public proof" },
  { id: "S9", name: "Graph APIs and feeds", owner: "Sureel", users: "Every system", platform: "API, DDEX, CWR, SFTP", purpose: "Write claims, read clearance and splits, verify, webhooks", startsFrom: "OW Rights Event Ingestion contract", origin: "Extends", phase: "Land and measure", opens: href("console", "health"), approach: "API-first" },
];

export interface Persona {
  name: string;
  place: string;
  writes: string;
  reads: string;
  surface: string;
  /** Write, read or resolve — FRD "Who's in the system". */
  does: readonly ("Writes" | "Reads" | "Resolves")[];
  opens?: string;
}

export const PERSONAS: readonly Persona[] = [
  { name: "Label", place: "Master owner, controls master rights", writes: "Catalogue, splits, AI consent, Voice/NIL on behalf", reads: "Clearance status, conflicts, coverage", surface: "S1", does: ["Writes", "Reads"], opens: as("Label", href("pro", "rights", "overview")) },
  { name: "Distributor", place: "Declares delivery, often administers for small labels", writes: "Catalogue, delivery events", reads: "Clearance for delivery", surface: "S1", does: ["Writes", "Reads"], opens: as("Label", href("pro", "catalog", "releases")) },
  { name: "Publisher / admin", place: "Owns, controls or administers compositions", writes: "Works, writer shares, territories, sub-pub deals", reads: "Chain of title, conflicts, unlinked recordings", surface: "S2", does: ["Writes", "Reads"], opens: as("Publisher", href("pro", "rights", "overview")) },
  { name: "Artist / performer", place: "Credited on recordings; personal Voice/NIL rights", writes: "Role confirmations, Voice/NIL consent, AI opt-out", reads: "Where they're cleared, who's using them", surface: "S3", does: ["Writes", "Reads"], opens: as("Artist", href("artist", "home")) },
  { name: "Songwriter", place: "Credited on works", writes: "Role confirmations, writer shares (declared)", reads: "Registered works, missing registrations", surface: "S3 (writer mode)", does: ["Writes", "Reads"], opens: as("Writer", href("artist", "home")) },
  { name: "Manager / lawyer", place: "Acts for an artist with delegated authority", writes: "Approvals on the artist's behalf", reads: "Same as artist, scoped", surface: "S3 (delegate)", does: ["Writes"], opens: as("Delegate", href("artist", "home")) },
  { name: "WMG (Recorded Music, Chappell)", place: "Largest contributor; owned data lane", writes: "Bulk catalogue, agreements, the WMG↔Chappell join", reads: "Everything it owns, coverage", surface: "RAD + S9 feeds", does: ["Writes", "Reads"], opens: href("console", "health") },
  { name: "Peer major / aggregator", place: "Borrowed-data lane; co-owner of the alternative", writes: "Bulk data into their own tenant", reads: "Their match results and coverage only", surface: "S5", does: ["Writes", "Reads"], opens: href("contributor", "overview") },
  { name: "Free-source body", place: "Public or licensed reference data", writes: "Nothing directly; ingested by Sureel", reads: "Nothing", surface: "Ingestion (no UI)", does: ["Writes"], opens: href("console", "health") },
  { name: "Collecting society", place: "Registration and collection authority", writes: "Registrations, acknowledgements", reads: "Verify records, query claims", surface: "S6 + CWR / API", does: ["Writes", "Reads"], opens: as("GEMA", href("partner", "registrations")) },
  { name: "AI platform", place: "Licensee; provenance reporter", writes: "Usage, provenance records, licence requests", reads: "Effective clearance, receipts", surface: "S6 + Clearance API", does: ["Writes", "Reads"], opens: as("Cadence AI", href("partner", "overview")) },
  { name: "DSP / UGC platform", place: "Licensee; platform ownership claims", writes: "Claims (Content ID, Rights Manager) as evidence", reads: "Splits, ownership for claiming", surface: "S6 / Partner API", does: ["Writes", "Reads"], opens: as("Openwave Studios", href("partner", "overview")) },
  { name: "Verifier", place: "Checks a record without trusting any party", writes: "Nothing", reads: "Proof events, receipts", surface: "S8", does: ["Reads"], opens: href("verify") },
  { name: "Sureel operations", place: "Runs the graph", writes: "Resolutions, merges, rule versions", reads: "Everything", surface: "S7", does: ["Writes", "Reads", "Resolves"], opens: href("console", "health") },
];

export interface FlowStep {
  at: number;
  surface: string;
  who: string;
  does: string;
  opens?: string;
}

export interface Flow {
  id: string;
  /** What the record's header can hold. */
  short: string;
  name: string;
  starts: string;
  ends: string;
  question: string;
  steps: readonly FlowStep[];
  /** What the FRD leaves to policy, where it does. */
  open?: string;
}

export const FLOWS: readonly Flow[] = [
  {
    id: "F1",
    short: "Release and consent",
    name: "A label releases a track and sets AI consent",
    starts: "S1",
    ends: "S3",
    question: "Does a new release start from the label's defaults, and climb the ladder as others confirm it?",
    steps: [
      { at: 1, surface: "S1", who: "Kestrel Point Recordings", does: "Creates Harbour Lights; catalogue and splits go to the graph as claims at T1.", opens: as("Label", href("pro", "catalog", "tracks", "r-harbour-lights", "rights")) },
      { at: 2, surface: "S1", who: "Kestrel Point Recordings", does: "Default AI consent applies: training for two named partners, Voice/NIL off.", opens: as("Label", href("pro", "rights", "consent", "defaults")) },
      { at: 3, surface: "S9", who: "Bluefen Distribution", does: "DSP delivery succeeds; the claim rises to T2.", opens: href("console", "health") },
      { at: 4, surface: "S2", who: "Harbor Music", does: "Sees the new recording under Recordings to link and confirms the work link.", opens: as("Publisher", href("pro", "rights", "recordings-to-link")) },
      { at: 5, surface: "S3", who: "Mira Castellanos", does: "Gets a credit confirmation in the app and confirms; the asset rises toward T4.", opens: as("Artist", href("artist", "credits")) },
    ],
  },
  {
    id: "F2",
    short: "AI licence request",
    name: "An AI platform asks for a licence",
    starts: "S6",
    ends: "S6",
    question: "Is a request split by copyright side, and does each side's holder answer only for its own share?",
    steps: [
      { at: 1, surface: "S6", who: "Cadence AI", does: "Requests AI training over Kestrel Point's catalogue.", opens: as("Cadence AI", href("partner", "requests")) },
      { at: 2, surface: "Graph", who: "Resolver", does: "Checks standing grants: the master side matches; the composition side has no grant." },
      { at: 3, surface: "S4", who: "Kestrel, Harbor, Silverbirch", does: "Lands in the label's inbox as auto-cleared, and in two publishers' inboxes as needs decision.", opens: as("Label", href("pro", "rights", "requests")) },
      { at: 4, surface: "S2", who: "Silverbirch grants; Harbor decides", does: "One publisher grants; the other declines or holds.", opens: as("Publisher", href("pro", "rights", "requests")) },
      { at: 5, surface: "S6", who: "Cadence AI", does: "Sees the result per track — cleared where both sides granted, needs review elsewhere — with a receipt each.", opens: as("Cadence AI", href("partner", "requests")) },
    ],
  },
  {
    id: "F3",
    short: "Voice/NIL on behalf",
    name: "A label attests Voice/NIL for an artist",
    starts: "S1",
    ends: "S1, S3",
    question: "When the label speaks for the artist, does the artist see it, and can they dispute it without silently revoking it?",
    open: "Whether a dispute pauses the grant or leaves it live until resolved is a policy call for WMG legal. Built here: paused.",
    steps: [
      { at: 1, surface: "S1", who: "Kestrel Point Recordings", does: "Voxa Voice's Voice/NIL request arrives; the label attests on Mira's behalf, citing AGR-310 §7.4.", opens: as("Label", href("pro", "rights", "consent")) },
      { at: 2, surface: "S3", who: "Mira Castellanos", does: "Is notified: Kestrel Point approved Voice/NIL for Voxa Voice on your behalf.", opens: as("Artist", href("artist", "consent")) },
      { at: 3, surface: "S3", who: "Mira Castellanos", does: "Disagrees and taps Dispute.", opens: as("Artist", href("artist", "consent")) },
      { at: 4, surface: "S7", who: "Sureel ops", does: "A conflict opens; the grant is paused, not revoked. Ops sees both claims and the cited clause.", opens: href("console", "conflicts", "cf-6") },
      { at: 5, surface: "S7 → S1, S3", who: "Sureel ops", does: "Resolution is recorded with its reason; both sides see the outcome.", opens: href("console", "conflicts", "cf-6") },
    ],
  },
  {
    id: "F4",
    short: "Peer contribution",
    name: "A peer major contributes its catalogue",
    starts: "S5",
    ends: "S5",
    question: "Can a competitor contribute and see exactly what it gave, what it got back, and who read it?",
    steps: [
      { at: 1, surface: "S5", who: "Meridian Music Group", does: "Uploads a DDEX and CSV extract into its own tenant.", opens: href("contributor", "upload") },
      { at: 2, surface: "S5", who: "Meridian Music Group", does: "Validation catches row errors before ingest; Meridian fixes and resubmits.", opens: href("contributor", "batches", "b-3108") },
      { at: 3, surface: "Graph", who: "Matching", does: "Matching runs; Meridian sees matched, new, conflicting and unmatched counts.", opens: href("contributor", "matches") },
      { at: 4, surface: "S7", who: "Sureel ops", does: "Conflicts that touch WMG claims go to the queue; WMG never sees Meridian's private terms.", opens: href("console", "conflicts", "cf-8") },
      { at: 5, surface: "S5", who: "Meridian Music Group", does: "Sees coverage go up, and the access log of who read its data.", opens: href("contributor", "access") },
    ],
  },
  {
    id: "F5",
    short: "Publisher overclaim",
    name: "A publisher overclaim",
    starts: "S9",
    ends: "S7",
    question: "When an acknowledgement disagrees with the graph, is the claim kept, the conflict routed, and payment held to the stronger claim?",
    steps: [
      { at: 1, surface: "S9", who: "GEMA", does: "A CWR acknowledgement claims 60% for Harbor in DE, where the graph holds 50%.", opens: as("GEMA", href("partner", "registrations")) },
      { at: 2, surface: "Graph", who: "Resolver", does: "An overclaim opens at 110%, HIGH because the work earns." },
      { at: 3, surface: "S2, S7", who: "Harbor Music, Sureel ops", does: "Both publishers see it in Conflicts; ops sees it in the queue with revenue at risk.", opens: as("Publisher", href("pro", "rights", "conflicts", "cf-1")) },
      { at: 4, surface: "S2", who: "Harbor Music", does: "Uploads its agreement as evidence; the counterclaim moves to its next step.", opens: as("Publisher", href("pro", "rights", "conflicts", "cf-1")) },
      { at: 5, surface: "S7", who: "Sureel ops", does: "Resolves with a reason; royalty engines take the new split snapshot on the next run.", opens: href("console", "conflicts", "cf-1") },
    ],
  },
  {
    id: "F6",
    short: "Auditor verifies",
    name: "An auditor verifies a clearance",
    starts: "S6",
    ends: "S8",
    question: "Can someone with no account prove a clearance existed then, unaltered, without seeing any amount?",
    steps: [
      { at: 1, surface: "S6", who: "Cadence AI", does: "Hands its auditor a receipt for a training run.", opens: as("Cadence AI", href("partner", "lookups")) },
      { at: 2, surface: "S8", who: "Auditor", does: "Pastes the receipt ID; sees Verified, the time and the signing key.", opens: href("verify", "rcpt_7Q2M-9F4K-CD7A") },
      { at: 3, surface: "S8", who: "Auditor", does: "Downloads the bundle and checks it offline. No account, no amounts.", opens: href("verify", "rcpt_7Q2M-9F4K-CD7A") },
    ],
  },
];

/**
 * The approaches: where the FRD (or the design brief) leaves a real choice about how a person meets
 * the graph, what was tried, which these screens take, and why. Each is a decision for review.
 */
export interface Approach {
  id: string;
  short: string;
  question: string;
  persona: string;
  options: readonly { name: string; says: string }[];
  taken: string;
  because: string;
  see?: string;
}

export const APPROACHES: readonly Approach[] = [
  {
    id: "A1",
    short: "Section or facet",
    question: "Where does a label meet rights — a section of its own, or a tab on every asset?",
    persona: "Label",
    options: [
      { name: "A Rights section", says: "One place for the whole catalogue: coverage, consent, requests, conflicts." },
      { name: "A Rights facet on each asset", says: "Rights read where the asset already is, beside its metadata and delivery." },
    ],
    taken: "Both, with one owner each: the section holds what is CATALOGUE-wide (grants made at scope, the inbox, the queue); the facet holds what is ONE asset's (its claims, its two sides, its effective clearance).",
    because: "Grants are stored at the scope they were made and resolved at read time; the screen that makes one should be the scope's, and the screen that reads one the asset's.",
    see: as("Label", href("pro", "rights", "overview")),
  },
  {
    id: "A2",
    short: "One shell or two",
    question: "Label and publisher: two products, or one shell switched by context?",
    persona: "Label, Publisher",
    options: [
      { name: "Two workspaces", says: "A publisher product beside the label's, each with its own navigation." },
      { name: "One shell, organisation context", says: "The same Revelator Pro, its Rights section re-filed by who the reader is working as." },
    ],
    taken: "One shell, using the system's persona switch as the organisation context (Kestrel Point ↔ Harbor Music).",
    because: "Roles attach to an organisation and a context, not a login; Chappell is a publisher and WMG a label inside one company.",
    see: as("Publisher", href("pro", "rights", "overview")),
  },
  {
    id: "A3",
    short: "Claims, not edits",
    question: "How is a disagreement shown to the person who disagrees?",
    persona: "Label, Publisher",
    options: [
      { name: "Edit the owner", says: "The user changes the value; history keeps the old one." },
      { name: "Claims beside the answer", says: "The user's claim stands next to the resolved answer, with the reason they differ." },
    ],
    taken: "Claims beside the answer (G-1): add, correct (supersede) or withdraw your own claim; never the owner.",
    because: "Every surface writes claims and only the graph resolves them; a screen that edits the answer would hold its own copy of who owns what.",
    see: as("Label", href("pro", "catalog", "tracks", "r-northbound", "rights")),
  },
  {
    id: "A4",
    short: "Artist's front door",
    question: "What is the artist's front door — consent first, or credits first?",
    persona: "Artist",
    options: [
      { name: "Credits first", says: "Confirm what you're on; consent follows from the catalogue." },
      { name: "Consent as the hero", says: "Your voice and likeness, in plain sentences with big switches; credits as a task list." },
    ],
    taken: "Consent as the hero, credits as tasks on Home, identity under Profile.",
    because: "The design brief says so, and Voice/NIL is the one right that is the artist's own rather than the label's.",
    see: as("Artist", href("artist", "consent")),
  },
  {
    id: "A5",
    short: "Disputed consent",
    question: "When the label speaks for the artist and the artist objects, what happens to the grant?",
    persona: "Artist, Label, Sureel ops",
    options: [
      { name: "Leave it live", says: "The grant stands until ops resolves; partners keep using it." },
      { name: "Pause it", says: "The grant reads as not cleared until resolved; partners get licence.paused." },
    ],
    taken: "Paused (FRD F3 step 4); the policy is WMG legal's.",
    because: "A paused grant can be reinstated with no harm done; a use made under a disputed voice consent cannot be undone.",
    see: href("console", "conflicts", "cf-6"),
  },
  {
    id: "A6",
    short: "Contributor trust",
    question: "How does a competitor trust a graph run by a WMG company?",
    persona: "Peer major",
    options: [
      { name: "Trust by contract", says: "The charter says no WMG access; the portal shows uploads." },
      { name: "Trust by showing", says: "The portal shows sharing levels per field, every read of their data, and audit-window reads." },
    ],
    taken: "Trust by showing: sharing controls, an access log within the hour, governance with keys and audits.",
    because: "\"Co-owner of the alternative\" has to be visible on the screen they look at, not only in a term sheet.",
    see: href("contributor", "access"),
  },
  {
    id: "A7",
    short: "Ask, don't browse",
    question: "How does an AI partner learn what it may use — browse, or ask?",
    persona: "AI platform",
    options: [
      { name: "A catalogue browser", says: "The partner explores rights holders' catalogues and their terms." },
      { name: "Ask per asset, keep a receipt", says: "The partner asks for one asset, one use, one place, one time — and keeps the signed answer." },
    ],
    taken: "Ask and keep a receipt; requests over a scope route to every side's holder.",
    because: "Partners see cleared uses only; a browser would show terms they have no right to, and a receipt is what their auditor needs.",
    see: as("Cadence AI", href("partner", "lookups")),
  },
  {
    id: "A8",
    short: "Ops opens on health",
    question: "What does an operator open first — the queue, or the health of what feeds it?",
    persona: "Sureel ops",
    options: [
      { name: "Conflict queue first", says: "Ops is there to resolve; HIGH conflicts on top." },
      { name: "Ingestion health first", says: "A late feed changes every number below it." },
    ],
    taken: "Health first on Home with what is late or failing flagged, the queue one step away, ranked by severity then revenue.",
    because: "FRD S7-1: a late feed is flagged on the home view; a queue read off a stale lane is the wrong queue.",
    see: href("console", "health"),
  },
  {
    id: "A9",
    short: "Verify without account",
    question: "Does verifying a record need an account?",
    persona: "Verifier",
    options: [
      { name: "Partner-authenticated", says: "The verification API, keyed." },
      { name: "Public page", says: "Paste a receipt; see verified, time, key — never amounts." },
    ],
    taken: "Both: the API is keyed; the page needs none, and the bundle verifies offline.",
    because: "Public means verifiable, not exposed — the one property the move off-chain keeps on purpose.",
    see: href("verify"),
  },
];
