import type { OrganizationSlug } from "@revelator/pro-ui/assets";

/**
 * The Rights Graph's model, as the surfaces read it — the ERD in "Rights Graph — Centralized
 * Reframe & Data Model", cut to what a screen draws. Four kinds of fact sit on the asset layer and
 * never share a table: rights ASSERTIONS, clearance GRANTS, ATTESTATIONS and provenance. Every
 * surface writes claims; only the resolver (`resolve.ts`) answers.
 */

export type AssetKind = "Work" | "Recording" | "Video" | "Release";

/** A copyright side. A master grant never implies a composition grant. */
export type Side = "Master" | "Composition";

/** Four separate edges, never one owner field. */
export type Interest = "Owns" | "Controls" | "Administers" | "Collects";

export type ShareType = "Writer" | "Publisher" | "Master" | "Performer" | "Producer";

/** RAD taxonomy v1, as the surfaces name it. */
export type RightType =
  | "Mechanical"
  | "Performance"
  | "Sync"
  | "Print"
  | "Lyrics"
  | "Master use"
  | "Neighbouring"
  | "Making available"
  | "UGC";

/** The uses a grant can permit or deny. */
export const USES = [
  "Stream",
  "Download",
  "UGC",
  "Sync",
  "AI training",
  "AI derivative",
  "Voice/NIL",
  "AI streaming",
] as const;
export type Use = (typeof USES)[number];
export const AI_USES: readonly Use[] = ["AI training", "AI derivative", "Voice/NIL", "AI streaming"];
/** AI training is a prerequisite for every other AI use. */
export const DEPENDS_ON_TRAINING: readonly Use[] = ["AI derivative", "Voice/NIL", "AI streaming"];

/** Where a grant was made — stored there, resolved at read time, never fanned out. */
export type ScopeLevel = "Artist" | "Asset" | "Release" | "Label" | "Catalogue";

/** The Confidence Ladder, computed per asset and use. */
export type Tier = 1 | 2 | 3 | 4 | 5;
export const TIERS: Record<Tier, { name: string; requires: string }> = {
  1: { name: "Self-declared", requires: "Uploaded metadata only" },
  2: { name: "Distribution-verified", requires: "Successful DSP delivery and identifier consistency" },
  3: { name: "Platform-attested", requires: "Agreement linked, royalty history, identifiers verified" },
  4: { name: "Contributor-confirmed", requires: "Signed attestation from a verified ArtistID for the credited role" },
  5: { name: "Fully cleared", requires: "T4, chain of title, clearance resolved, provenance recorded, proof timestamped" },
};

/** Ownership precedence v1 — the tier a source holds when claims disagree. */
export type SourceKind =
  | "Signed agreement"
  | "Society acknowledgement"
  | "CWR submitted"
  | "Label declaration"
  | "Self-declared"
  | "Platform claim";
export const PRECEDENCE: Record<SourceKind, number> = {
  "Signed agreement": 1,
  "Society acknowledgement": 2,
  "CWR submitted": 3,
  "Label declaration": 4,
  "Self-declared": 5,
  "Platform claim": 6,
};

export type PartyKind =
  | "Label"
  | "Distributor"
  | "Publisher"
  | "Artist"
  | "Writer"
  | "Delegate"
  | "Contributor"
  | "Society"
  | "AI platform"
  | "DSP"
  | "Verifier"
  | "Sureel";

export interface Party {
  id: string;
  name: string;
  kind: PartyKind;
  ipi?: string;
  isni?: string;
  /** The organization mark the system ships, where the party wears one. */
  organization?: OrganizationSlug;
  /** ArtistID assurance at verification, for a person. */
  assurance?: "Basic" | "Verified" | "Verified + ID";
  /** The society a writer or publisher is affiliated with. */
  society?: string;
  country?: string;
}

export interface Asset {
  id: string;
  kind: AssetKind;
  title: string;
  /** The display artist, for a recording, video or release. */
  artist?: string;
  isrc?: string;
  iswc?: string;
  upc?: string;
  /** Recording revenue over the last 12 months, in USD — what weights coverage and risk. */
  revenue: number;
  /** The label whose catalogue it is (master side). */
  labelId?: string;
  releaseId?: string;
  /** The works a recording embodies — a missing one is unmatched publishing money. */
  embodies?: readonly { workId: string; portion: "Full" | "Partial" | "Medley segment"; source: string }[];
  /** The recordings a video contains, and works it uses directly. */
  contains?: readonly { recordingId: string; from: string; to: string; usage: string }[];
  usesWorks?: readonly string[];
  /** The tracks of a release. */
  items?: readonly string[];
  released?: Date;
  cover?: number;
  /** How it was made, as the label declared it. */
  creation?: "Human" | "AI-assisted" | "AI-generated";
  /** DSP delivery succeeded — the claim rises to T2. */
  delivered?: boolean;
}

/** Include and exclude, normalized. `World` is every country. */
export interface TerritorySet {
  include: "World" | readonly string[];
  exclude?: readonly string[];
}

/** One source's claim. Never overwritten: a correction supersedes it. */
export interface Assertion {
  id: string;
  assetId: string;
  partyId: string;
  interests: readonly Interest[];
  side: Side;
  rights: "All composition" | "All master" | readonly RightType[];
  shareType: ShareType;
  share: number;
  /** "of Harbor's 50%" — a share held of another party's share. */
  shareOf?: string;
  territory: TerritorySet;
  from: Date;
  to?: Date;
  basis?: "At source" | "Receipts";
  source: SourceKind;
  /** What the source is — an agreement code, a CWR file, a DDEX message. */
  sourceRef: string;
  agreementId?: string;
  /** When we came to believe it (system time). */
  known: Date;
  supersedes?: string;
  state: "Resolved" | "Contested" | "No authority" | "Superseded" | "Withdrawn";
  /** Evidence uploaded with the claim. */
  evidence?: readonly string[];
  /** When, and by whom, a withdrawn claim was taken back (system time). */
  withdrawn?: { at: Date; by: string };
}

export interface Agreement {
  id: string;
  code: string;
  title: string;
  kind: "Recording" | "Publishing" | "Sub-publishing" | "Administration" | "Distribution" | "Licence";
  parties: readonly string[];
  from: Date;
  to?: Date;
  basis?: "At source" | "Receipts";
  territory: TerritorySet;
  /** Clauses that give authority — attest on behalf, AI consent. */
  clauses?: readonly string[];
}

export interface Decision {
  /** Who acted. */
  actor: string;
  /** On whose behalf, where not their own. */
  onBehalfOf?: string;
  /** The edge or agreement that lets them. */
  authority?: string;
  at: Date;
}

/** A consent fact: can this be used for X, by whom, where, when. */
export interface Grant {
  id: string;
  level: ScopeLevel;
  /** The asset, release, label or artist id the scope names; the catalogue is the label's whole. */
  ref: string;
  side: Side | "Both";
  use: Use;
  effect: "Grant" | "Deny";
  partners: { mode: "All approved" | "Allowlist" | "Denylist"; ids: readonly string[] };
  territory: TerritorySet;
  from: Date;
  to?: Date;
  grantedBy: string;
  decided: Decision;
  conditions?: readonly string[];
  state: "Live" | "Paused" | "Revoked";
  /** Stored and flagged: no controlling edge for that right, territory and date. */
  unauthorized?: boolean;
}

export type ClaimType =
  | "Role confirmed"
  | "Role denied"
  | "Human performed"
  | "Voice/NIL consent"
  | "AI disclosure"
  | "AI opt-out";

export interface Attestation {
  id: string;
  attestor: string;
  onBehalfOf?: string;
  subject: { kind: "Asset" | "Credit" | "Grant" | "Artist"; id: string };
  claim: ClaimType;
  assurance: "Basic" | "Verified" | "Verified + ID";
  authority?: string;
  issued: Date;
  state: "Signed" | "Requested" | "Disputed" | "Revoked";
  keyId: string;
}

export interface Credit {
  id: string;
  assetId: string;
  partyId: string;
  role: string;
  credited: string;
  state: "Confirmed" | "To confirm" | "Denied";
}

export type ConflictKind =
  | "Overclaim"
  | "Gap"
  | "Missing work link"
  | "Territory overlap"
  | "Expired but paying"
  | "Attestation dispute"
  | "Unauthorized grant";

export type Severity = "High" | "Medium" | "Low";

/** The four steps of a counterclaim, the same for both sides. */
export const COUNTERCLAIM_STEPS = [
  "Claim submitted",
  "Evidence approved",
  "Evidence from counterparty",
  "Claim resolved",
] as const;

export interface Conflict {
  id: string;
  kind: ConflictKind;
  assetId: string;
  side: Side;
  severity: Severity;
  revenueAtRisk: number;
  /** The share total across the claims, where shares are what disagree. */
  total?: number;
  territories: readonly string[];
  /** Territories already accepted territory by territory, and closed there. */
  accepted?: readonly string[];
  claims: readonly string[];
  parties: readonly string[];
  opened: Date;
  state: "Open" | "Awaiting evidence" | "Resolved";
  /** How far the counterclaim has come: an index into COUNTERCLAIM_STEPS. */
  step: number;
  assignee?: string;
  /** How the resolver keeps paying until it is decided. */
  interim: string;
  resolution?: Decision & { reason: string; rule?: string };
  /** Where it was raised from — the lane or file. */
  raisedBy: string;
}

export type RequestType = "Licence" | "Attestation" | "Conflict response" | "Credit confirmation" | "Delegate approval";

export interface Request {
  id: string;
  type: RequestType;
  /** Who asks. */
  from: string;
  /** Whose inbox it is in. */
  to: string;
  use?: Use;
  side?: Side;
  scope: { level: ScopeLevel; ref: string; name: string; assets: number };
  territory: TerritorySet;
  start: Date;
  end?: Date;
  deadline: Date;
  received: Date;
  state: "Needs decision" | "Auto-cleared" | "Approved" | "Declined" | "Countered" | "Escalated";
  /** What the requester said they want it for. */
  purpose: string;
  /** The standing grant that cleared it, where one did. */
  clearedBy?: string;
  /** The conflict or credit it is about, for the other types. */
  about?: string;
  decided?: Decision;
  licenceModel?: "Dynamic" | "Flat";
}

export interface Batch {
  id: string;
  contributor: string;
  file: string;
  format: "DDEX ERN" | "DDEX MWN" | "CWR" | "CSV" | "Parquet";
  channel: "SFTP" | "API" | "Upload";
  received: Date;
  rows: number;
  validated: number;
  ingested: number;
  matched: number;
  errors: number;
  state: "Received" | "Validating" | "Row errors" | "Ingesting" | "Matched" | "Rejected";
  results?: { matched: number; new: number; conflicting: number; unmatched: number };
}

export interface Feed {
  id: string;
  name: string;
  lane: Lane;
  channel: "DDEX" | "CWR" | "API" | "SFTP" | "Webhook";
  last: Date;
  due: Date;
  errorRate: number;
  lagHours: number;
  rows: number;
  state: "On time" | "Late" | "Failing";
}

export type Lane = "Owned" | "Free" | "Borrowed" | "Bought" | "Revelator";

export interface ProofEvent {
  seq: number;
  type:
    | "GENESIS"
    | "OWNERSHIP_SNAPSHOT"
    | "CLEARANCE_GRANTED"
    | "CLEARANCE_RECEIPT"
    | "ATTESTATION_SIGNED"
    | "CONFLICT_OPENED"
    | "CONFLICT_RESOLVED"
    | "SETTLEMENT"
    | "SUPERSEDE"
    | "IMPORTED";
  subject: string;
  scope?: string;
  use?: Use;
  at: Date;
  payloadHash: string;
  prevHash: string;
  eventHash: string;
  keyId: string;
  batch: string;
  receipt?: string;
  /** For an event imported from the on-chain registry. */
  chain?: { tx: string; block: number; owUri: string };
}

export interface Partner {
  id: string;
  name: string;
  kind: "AI platform" | "DSP" | "UGC platform" | "Society";
  uses: readonly Use[];
  territories: TerritorySet;
  joined: Date;
  state: "Active" | "Invited" | "Suspended";
  keys: readonly { id: string; env: "Sandbox" | "Production"; created: Date; scopes: readonly string[]; lastUsed?: Date }[];
  webhooks: readonly { url: string; events: readonly string[]; state: "Enabled" | "Disabled" }[];
}

export interface Tenant {
  id: string;
  name: string;
  /** The fields and who reads them. */
  sharing: readonly { field: string; level: "Shared" | "Private" | "Encrypted" }[];
  access: readonly { at: Date; who: string; via: string; what: string; audit?: boolean }[];
}
