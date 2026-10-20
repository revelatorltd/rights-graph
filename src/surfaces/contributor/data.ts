import {
  addAccess,
  addBatch,
  BATCHES,
  CONFLICTS,
  MAPPING,
  now,
  ROW_ERRORS,
  setBatchState,
  setSharing as setTenantSharing,
  TENANTS,
  TODAY,
  wrote,
} from "../../graph/fixtures";
import { follow, formatCount } from "@revelator/pro-ui";
import type { Batch, Tenant, TerritorySet, Tier } from "../../graph/model";

/**
 * What the contributor portal knows that the shared graph does not hold — read by id against the
 * graph wherever the graph has it. Invented, like the fixtures, and kept to Meridian Music Group: the
 * portal is one tenant's, and nothing here reads another tenant's terms.
 */
export const TENANT_ID = "p-meridian";

export const tenant = (): Tenant => TENANTS.find((one) => one.id === TENANT_ID)!;

/** The tenant's own batches, newest first, as the graph now holds them. */
export const ownBatches = (): Batch[] =>
  BATCHES.filter((one) => one.contributor === TENANT_ID).sort((a, b) => b.received.getTime() - a.received.getTime());

export const batchById = (id: string) => BATCHES.find((one) => one.id === id && one.contributor === TENANT_ID);

/** Still on its way through the stages: nothing a batch in flight holds is in the graph yet. */
export const IN_FLIGHT: readonly Batch["state"][] = ["Received", "Validating", "Row errors", "Ingesting"];
export const inFlight = (one: Batch) => IN_FLIGHT.includes(one.state);

/** The conflicts that touch one of the tenant's claims — the graph's own, never a copy. */
export const ownConflicts = () => CONFLICTS.filter((one) => one.parties.includes(TENANT_ID));

// ---------------------------------------------------------------------------------------------
// Coverage of the tenant's OWN catalogue (S5-4). The graph's COVERAGE is per lane — the Borrowed
// lane is every peer contributor at once — so the tenant's own figures are written here, invented,
// rising the way that lane rises.

export type Measure = "Master resolved" | "Join rate" | "Composition resolved" | "Conflict rate";

export interface Coverage {
  measure: Measure;
  /** What it counts, in a sentence. */
  means: string;
  /** Revenue-weighted, in percent, now — after the last matched upload. */
  now: number;
  /** As it stood before the last matched upload. */
  before: number;
  /** A fall is the good news. */
  lowerIsBetter?: boolean;
}

let COVERAGE: Coverage[] = [
  {
    measure: "Master resolved",
    means: "Your recordings whose master side resolves at T3 or above, weighted by their revenue.",
    now: 58.4,
    before: 51.2,
  },
  {
    measure: "Join rate",
    means: "Your recordings linked to the work they embody — a missing link is unmatched publishing money.",
    now: 41.7,
    before: 36.9,
  },
  {
    measure: "Composition resolved",
    means: "Your works whose shares resolve to 100% in every territory they earn in.",
    now: 23.6,
    before: 21.1,
  },
  {
    measure: "Conflict rate",
    means: "Your revenue sitting on an asset with an open conflict.",
    now: 1.53,
    before: 1.38,
    lowerIsBetter: true,
  },
];
export const coverage = (): readonly Coverage[] => COVERAGE;

/** The upload the "before" figures were read against. */
export let LAST_UPLOAD = "b-3107";

/** A matched upload moves coverage: what stood before it is what the change is read against. */
function upliftFrom(batch: Batch) {
  const weight = Math.min(batch.rows / 1_000_000, 1);
  COVERAGE = COVERAGE.map((one) => ({
    ...one,
    before: one.now,
    now: Math.round((one.lowerIsBetter ? one.now + 0.06 * weight : Math.min(one.now + 2.4 * weight + 0.3, 100)) * 100) / 100,
  }));
  LAST_UPLOAD = batch.id;
}

// ---------------------------------------------------------------------------------------------
// Batches, as the upload flow moves them. Every write goes through the graph's own setters.

export type Format = Batch["format"];
export type Channel = Batch["channel"];
export const FORMATS: readonly Format[] = ["DDEX ERN", "DDEX MWN", "CWR", "CSV", "Parquet"];
export const CHANNELS: readonly Channel[] = ["Upload", "SFTP", "API"];

/** Where each channel delivers, so a feed can be pointed at it. */
export const CHANNEL_ENDPOINT: Record<Channel, string> = {
  Upload: "This page — one file at a time, up to 5 GB.",
  SFTP: "sftp://ingest.sureel.example/meridian/inbound — key-based, picked up every 15 minutes.",
  API: "POST https://api.sureel.example/v1/tenants/p-meridian/batches — the batch id comes back at once.",
};

/** The row errors a batch holds: the graph's sample for the Q3 splits file, and what a check finds. */
const ERRORS: Record<string, { row: number; field: string; value: string; problem: string }[]> = {
  "b-3108": [...ROW_ERRORS],
};
export const rowErrorsOf = (batchId: string) => ERRORS[batchId] ?? [];

let next = 3200;
/** A file received into the tenant: checked against the schema before anything is accepted. */
export function receive(file: string, format: Format, channel: Channel, rows: number): string {
  const id = `b-${next++}`;
  const failing = format === "CSV" ? Math.round(rows * 0.0168) : 0;
  if (failing) ERRORS[id] = ROW_ERRORS.slice(0, 5).map((one) => ({ ...one }));
  addBatch({
    id,
    contributor: TENANT_ID,
    file,
    format,
    channel,
    received: now(),
    rows,
    validated: rows - failing,
    ingested: 0,
    matched: 0,
    errors: failing,
    state: failing ? "Row errors" : "Validating",
  });
  return id;
}

/** The corrected file resubmitted over the same batch: its rows checked again, nothing ingested yet. */
export function resubmit(batchId: string, file: string) {
  const batch = batchById(batchId)!;
  ERRORS[batchId] = [];
  setBatchState(batchId, { file, validated: batch.rows, errors: 0, state: "Validating" });
}

/** The failed rows taken out: the batch goes on with the rows that passed. */
export function dropFailed(batchId: string) {
  const batch = batchById(batchId)!;
  ERRORS[batchId] = [];
  setBatchState(batchId, { rows: batch.validated, errors: 0, state: "Validating" });
}

/** The validated rows written to the graph as claims, then matched — the four counts come back. */
export function ingest(batchId: string) {
  const batch = batchById(batchId)!;
  const rows = batch.validated;
  const conflicting = Math.round(rows * 0.016);
  const unmatched = Math.round(rows * 0.024);
  const fresh = Math.round(rows * 0.19);
  const results = { matched: rows - conflicting - unmatched - fresh, new: fresh, conflicting, unmatched };
  upliftFrom(batch);
  MATCH_RECORDS = [...sampleOf(batch), ...MATCH_RECORDS];
  addAccess(TENANT_ID, { at: now(), who: "Resolver v1.3", via: `Internal · match job for ${batch.id}`, what: `Shared fields, ${formatCount(rows, { one: "row", many: "rows" })}` });
  setBatchState(batchId, { ingested: rows, matched: rows, state: "Matched", results });
}

/**
 * Failed rows, handed over as the CSV they would be fixed in. The system has no command that gives
 * the reader a file (gaps, 9): the file is opened as an address, which a browser saves.
 */
export function downloadFailedRows(batch: Batch) {
  const quote = (cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`;
  const lines = ["row,field,value,problem", ...rowErrorsOf(batch.id).map((one) => [one.row, one.field, one.value, one.problem].map(quote).join(","))];
  follow(URL.createObjectURL(new File([lines.join("\n")], `${batch.id}_failed_rows.csv`, { type: "text/csv" })));
}

// ---------------------------------------------------------------------------------------------
// Field mapping (S5-9) — the BMAT prototype's three tabs, held here so a confirm redraws.

export type MappingRow = (typeof MAPPING)[number];
let MAPPINGS: MappingRow[] = MAPPING.map((one) => ({ ...one }));
export const mappings = (): readonly MappingRow[] => MAPPINGS;

export function confirmMappings(headers: readonly string[]) {
  MAPPINGS = MAPPINGS.map((one) => (headers.includes(one.header) && one.target ? { ...one, state: "Completed" as const } : one));
  wrote();
}
export function mapHeader(header: string, target: string) {
  MAPPINGS = MAPPINGS.map((one) => (one.header === header ? { ...one, target, confidence: undefined, state: "Completed" as const } : one));
  wrote();
}
export function unmapHeader(header: string) {
  MAPPINGS = MAPPINGS.map((one) => (one.header === header ? { header: one.header, sample: one.sample, state: "Unmatched" as const } : one));
  wrote();
}

export interface SavedMapping {
  name: string;
  headers: number;
  saved: Date;
  /** The files it was applied to, automatically, by their headers. */
  appliedTo: readonly string[];
}
let SAVED: SavedMapping[] = [
  { name: "MMG publishing splits", headers: 12, saved: new Date(2026, 6, 14, 10, 20), appliedTo: ["b-3108"] },
  { name: "MMG catalogue extract (legacy)", headers: 31, saved: new Date(2026, 3, 2, 16, 5), appliedTo: [] },
];
export const savedMappings = (): readonly SavedMapping[] => SAVED;
export function saveMapping(name: string) {
  SAVED = [{ name, headers: MAPPINGS.length, saved: TODAY, appliedTo: [] }, ...SAVED.filter((one) => one.name !== name)];
  wrote();
}
/** The saved mapping a CSV's headers fit, applied without being asked. */
export const mappingFor = (format: Format) => (format === "CSV" ? SAVED[0] : undefined);

// ---------------------------------------------------------------------------------------------
// Match results (S5-3) — the four counts come off the batches; these are the records a reader
// drills into, a sample of each.

export type MatchState = "Matched" | "New" | "Conflicting" | "Unmatched";
export const MATCH_STATES: readonly MatchState[] = ["Matched", "New", "Conflicting", "Unmatched"];

export interface MatchRecord {
  id: string;
  batch: string;
  kind: "Recording" | "Work";
  title: string;
  by: string;
  code: string;
  standard: "isrc" | "iswc";
  state: MatchState;
  /** What it matched in the graph, by the graph's own id. */
  matchedTo?: string;
  method?: string;
  confidence?: number;
  /** Why it stands where it does. */
  reason: string;
  conflict?: string;
}

let MATCH_RECORDS: MatchRecord[] = [
  { id: "mr-1", batch: "b-3107", kind: "Recording", title: "Coastline Static", by: "Juno Vale", code: "USMM12400331", standard: "isrc", state: "Matched", matchedTo: "GR-00418822", method: "ISRC exact", confidence: 1, reason: "Same ISRC and duration as the graph's recording; the master claim agrees." },
  { id: "mr-2", batch: "b-3107", kind: "Recording", title: "Paper Lanterns", by: "The Oberlin Set", code: "USMM12300912", standard: "isrc", state: "Matched", matchedTo: "GR-00977104", method: "ISRC exact", confidence: 1, reason: "Same ISRC; your claim raised the recording from T1 to T2." },
  { id: "mr-3", batch: "b-3101", kind: "Recording", title: "Night Ferry", by: "Ilse Marchetti", code: "USMM11900045", standard: "isrc", state: "Matched", matchedTo: "GR-00120511", method: "Title, artist and duration", confidence: 0.96, reason: "Matched above auto-accept: title, artist and duration agree within two seconds." },
  { id: "mr-4", batch: "b-3107", kind: "Recording", title: "Velvet Hours", by: "Juno Vale", code: "USMM12600118", standard: "isrc", state: "New", reason: "The graph held nothing like it; added as a new recording at T1." },
  { id: "mr-5", batch: "b-3107", kind: "Recording", title: "Afterglow District", by: "Rae Okonkwo", code: "USMM12600207", standard: "isrc", state: "New", reason: "Unreleased elsewhere; added with your claim as its only source." },
  { id: "mr-6", batch: "b-3101", kind: "Work", title: "Low Season", by: "K. Moreau", code: "T-918.240.771-2", standard: "iswc", state: "New", reason: "No work with this ISWC or title and writer; added at T1." },
  { id: "mr-7", batch: "b-3101", kind: "Work", title: "Tide Water", by: "A. Lindgren, K. Moreau", code: "T-912.448.301-6", standard: "iswc", state: "Conflicting", matchedTo: "w-tidewater", method: "Lyric fingerprint", confidence: 0.79, reason: "Same work; your writer shares sum to 125% in eight European territories.", conflict: "cf-8" },
  { id: "mr-8", batch: "b-3107", kind: "Recording", title: "Harbour Lights", by: "Mira Castellanos", code: "USMM12400702", standard: "isrc", state: "Conflicting", matchedTo: "GR-00611390", method: "Audio fingerprint", confidence: 0.93, reason: "Same audio as a recording another tenant controls; both claim the master in GB. Queued for Sureel ops." },
  { id: "mr-9", batch: "b-3107", kind: "Recording", title: "Untitled 14", by: "Unknown", code: "USMM12699914", standard: "isrc", state: "Unmatched", reason: "No title, artist or audio to place it on, and too thin to add: fix the row and resubmit." },
  { id: "mr-10", batch: "b-3101", kind: "Work", title: "Medley (Live)", by: "Various", code: "T-000.000.000-0", standard: "iswc", state: "Unmatched", reason: "The ISWC is a placeholder and no writer is named." },
];

export const matchRecords = (): readonly MatchRecord[] => MATCH_RECORDS;

/** A newly matched batch's sample — one record of each outcome, drawn from its own rows. */
function sampleOf(batch: Batch): MatchRecord[] {
  const kind = batch.format === "CWR" || batch.format === "DDEX MWN" ? "Work" : "Recording";
  const standard = kind === "Work" ? "iswc" : "isrc";
  const code = (n: number) => (kind === "Work" ? `T-918.300.${String(400 + n).padStart(3, "0")}-${n}` : `USMM126${String(10400 + n).padStart(5, "0")}`);
  return [
    { id: `${batch.id}-1`, batch: batch.id, kind, title: "Salt and Signal", by: "Juno Vale", code: code(1), standard, state: "Matched", matchedTo: "GR-01204417", method: kind === "Work" ? "ISWC exact" : "ISRC exact", confidence: 1, reason: "Same identifier as the graph's record; your claim agrees with it." },
    { id: `${batch.id}-2`, batch: batch.id, kind, title: "Glasshouse", by: "Rae Okonkwo", code: code(2), standard, state: "New", reason: "The graph held nothing like it; added at T1 with your claim as its source." },
    { id: `${batch.id}-3`, batch: batch.id, kind, title: "Northern Wire", by: "The Oberlin Set", code: code(3), standard, state: "Conflicting", matchedTo: "GR-00733120", method: "Title and credit", confidence: 0.91, reason: "Matched, and your shares disagree with another party's. Queued for Sureel ops." },
    { id: `${batch.id}-4`, batch: batch.id, kind, title: "Track 07", by: "Unknown", code: code(4), standard, state: "Unmatched", reason: "Nothing to place it on and too thin to add: fix the source row and send it again." },
  ];
}

/** What every matched batch came to, summed over the tenant. */
export function matchTotals() {
  const totals = { matched: 0, new: 0, conflicting: 0, unmatched: 0 };
  for (const one of ownBatches()) {
    if (!one.results) continue;
    totals.matched += one.results.matched;
    totals.new += one.results.new;
    totals.conflicting += one.results.conflicting;
    totals.unmatched += one.results.unmatched;
  }
  return totals;
}

// ---------------------------------------------------------------------------------------------
// The tenant's own claim on a conflict — held in its tenant, never in the other party's view.

export interface OwnClaim {
  conflict: string;
  assetTitle: string;
  shares: readonly { writer: string; share: number }[];
  territory: TerritorySet;
  from: Date;
  source: string;
  tier: Tier;
  agreement: string;
}
let OWN_CLAIMS: Record<string, OwnClaim> = {
  "cf-8": {
    conflict: "cf-8",
    assetTitle: "Tide Water",
    shares: [
      { writer: "A. Lindgren", share: 75 },
      { writer: "K. Moreau", share: 50 },
    ],
    territory: { include: ["FR", "DE", "IT", "ES", "NL", "BE", "AT", "CH"] },
    from: new Date(2019, 3, 1),
    source: "Meridian Music Group upload b-3101 · row 88,204",
    tier: 1,
    agreement: "MMG-PUB-118204",
  },
};

export const ownClaimOn = (conflictId: string): OwnClaim | undefined => OWN_CLAIMS[conflictId];

/** The tenant corrects its own claim — a new claim superseding the one it uploaded (G-1). */
export function correctClaim(conflictId: string, shares: OwnClaim["shares"], evidence: string) {
  const claim = OWN_CLAIMS[conflictId]!;
  OWN_CLAIMS = { ...OWN_CLAIMS, [conflictId]: { ...claim, shares, source: evidence } };
  wrote();
}

// ---------------------------------------------------------------------------------------------
// Sharing (S5-5) and the access log (S5-6) — the tenant's own, as the graph holds them, so a
// change made here or in the Graph Console (S7-8) reads the same on both.

export type Level = "Shared" | "Private" | "Encrypted";
export const LEVELS: readonly Level[] = ["Shared", "Private", "Encrypted"];
export const sharing = () => tenant().sharing;
export const levelOf = (field: string) => sharing().find((one) => one.field === field)?.level ?? "Private";
export function setSharing(levels: Readonly<Record<string, Level>>) {
  for (const one of sharing()) if (levels[one.field] && levels[one.field] !== one.level) setTenantSharing(TENANT_ID, one.field, levels[one.field]!);
}

export type Read = Tenant["access"][number];
/** The reads before the graph's own log begins, which this tenant's log still holds. */
const EARLIER: readonly Read[] = [
  { at: new Date(2026, 9, 16, 3, 0), who: "WMG Recorded Music", via: "Splits API · ck_live_44ae", what: "Resolved splits on 1,880 shared assets — shared fields only" },
  { at: new Date(2026, 9, 15, 17, 32), who: "Sureel external auditor (Ardent Assurance)", via: "Graph Console · audit request AR-109", what: "Agreement references on 12 works, 60-minute window", audit: true },
  { at: new Date(2026, 9, 14, 8, 10), who: "PRS for Music", via: "Partner API · ck_live_7c21", what: "Work registrations, 4,410 ISWCs" },
  { at: new Date(2026, 9, 12, 2, 41), who: "Resolver v1.3", via: "Internal · match job MJ-8790", what: "Shared fields, 2,410,020 rows" },
];
/** The graph's reads, newest first, then the ones before them. */
export const access = (): readonly Read[] => [...tenant().access, ...EARLIER];
export const channelOf = (read: Read) =>
  read.audit ? "Audit request" : /^Internal/.test(read.via) ? "Sureel internal" : /portal/i.test(read.via) ? "Contributor portal" : "Graph API";

// ---------------------------------------------------------------------------------------------
// Governance (S5-8)

export const CHARTER = {
  title: "Rights Graph contributor charter",
  version: "v2.1",
  adopted: new Date(2026, 5, 2),
  signatories: 4,
  steward: "Sureel Inc., as operator",
  promises: [
    "Every contributor's data sits in its own tenant; nothing is pooled without the field being Shared.",
    "No tenant — WMG included — reads another's Private or Encrypted field.",
    "Sureel reads a private field only under a logged, time-boxed audit request the contributor sees.",
    "Every resolution names the rule version and evidence that decided it.",
    "A contributor can withdraw its data; withdrawn claims stay on the Proof Log as withdrawn.",
  ],
};

export interface AuditReport {
  id: string;
  title: string;
  auditor: string;
  period: string;
  published: Date;
  findings: number;
  outcome: "No exceptions" | "Exceptions noted";
}
export const AUDITS: readonly AuditReport[] = [
  { id: "au-7", title: "Tenant isolation and access logging — Q3 2026", auditor: "Ardent Assurance LLP", period: "Jul–Sep 2026", published: new Date(2026, 9, 9), findings: 0, outcome: "No exceptions" },
  { id: "au-6", title: "Resolver determinism, rule v1.3", auditor: "Ardent Assurance LLP", period: "Jun 2026", published: new Date(2026, 6, 21), findings: 2, outcome: "Exceptions noted" },
  { id: "au-5", title: "Proof Log signing and key rotation", auditor: "Halvorsen Security", period: "H1 2026", published: new Date(2026, 6, 3), findings: 0, outcome: "No exceptions" },
];
