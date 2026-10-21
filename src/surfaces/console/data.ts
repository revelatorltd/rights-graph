import { formatMeta } from "@revelator/pro-ui";

import {
  ASSERTIONS,
  ATTESTATIONS,
  CLAIMANTS,
  CONFLICTS,
  CREDITS,
  FEEDS,
  MERGES,
  NOTICES as TOLD,
  RULES,
  TENANTS,
  TODAY,
  addAccess,
  assetById,
  partyName,
  linkRecording,
  setAttestationState,
  setGrantState,
  setSharing,
  updateConflict,
  wrote,
} from "../../graph/fixtures";
import type { Assertion, Conflict, Feed, Lane, Severity, Tenant } from "../../graph/model";
import { PRECEDENCE } from "../../graph/model";
import { RULE_VERSION, worksOf } from "../../graph/resolve";
import { personName } from "../../graph/notify";

/**
 * What the console keeps that the shared graph does not — notes on a conflict, merge decisions, a
 * draft rule's replay, audit windows — read by id against the graph and written here until the
 * graph gains a setter for each (docs/gaps/s7-console.md). Every write ends in `wrote()`, so every
 * surface draws again.
 */

const at = (month: number, date: number, hour: number, minute = 0) => new Date(2026, month - 1, date, hour, minute);

/** The console's clock: the fixtures' day, moving a minute per write so two writes never tie. */
let tick = 0;
export function stamp() {
  tick += 1;
  return clock();
}
/** The console's clock as it stands, without moving it. */
export const clock = () => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 10, tick);

/** Sureel rights ops and data engineering — whom a conflict can be assigned to. */
export const OPS_TEAM: readonly { name: string; role: string }[] = [
  { name: "Lior Ben-Ami", role: "Rights ops" },
  { name: "Noor Haddad", role: "Rights ops" },
  { name: "Sam Achterberg", role: "Rights ops" },
  { name: "Tomás Reyes", role: "Data engineer" },
];

// ---------------------------------------------------------------------------------------------
// The queue — severity first, then the money it holds.

export const SEVERITIES: readonly Severity[] = ["High", "Medium", "Low"];

/** HIGH first, then by revenue at risk — the order the queue arrives in (S7-2). */
export const byPriority = (one: Conflict, other: Conflict) =>
  SEVERITIES.indexOf(one.severity) - SEVERITIES.indexOf(other.severity) || other.revenueAtRisk - one.revenueAtRisk;

export const queue = () => [...CONFLICTS].sort(byPriority);

/** The lane a conflict was raised from, read off the words it was raised with. */
export const laneOf = (one: Conflict): Lane | "Internal" =>
  (["Owned", "Free", "Borrowed", "Bought", "Revelator"] as const).find((lane) => one.raisedBy.includes(`${lane} lane`)) ??
  "Internal";

// ---------------------------------------------------------------------------------------------
// Notes and the trail of what was done to a conflict

export interface Note {
  at: Date;
  who: string;
  text: string;
}

let NOTES: Record<string, Note[]> = {
  "cf-6": [
    { at: at(10, 14, 9, 20), who: "Noor Haddad", text: "Grant g-14 paused on the dispute; Voxa Voice's webhook received licence.paused." },
    { at: at(10, 15, 11, 5), who: "Noor Haddad", text: "Asked Kestrel for the signed AGR-310 schedule naming Voxa Voice as an approved partner under §7.4." },
  ],
  "cf-1": [
    { at: at(3, 4, 10, 0), who: "Lior Ben-Ami", text: "Rhein Edition's sub-publishing agreement covers DE at 50% of Harbor's share — the 60% GEMA ack reads Harbor's own share, not the sub-publisher's." },
    { at: at(9, 30, 16, 12), who: "Lior Ben-Ami", text: "Harbor Music says it will upload the 2026 GEMA registration; awaiting evidence." },
  ],
};

export const notesOn = (id: string) => NOTES[id] ?? [];

export interface Step {
  at: Date;
  who: string;
  action: string;
  property?: string;
  before?: string;
  after?: string;
}

let TRAIL: Record<string, Step[]> = {
  "cf-6": [{ at: at(10, 14, 9, 2), who: "Noor Haddad", action: "assigned", property: "Assignee", after: "Noor Haddad" }],
  "cf-1": [
    { at: at(3, 2, 9, 0), who: "Lior Ben-Ami", action: "assigned", property: "Assignee", after: "Lior Ben-Ami" },
    { at: at(9, 30, 16, 12), who: "Lior Ben-Ami", action: "asked for evidence", property: "State", before: "Open", after: "Awaiting evidence" },
  ],
};

export const trailOf = (id: string) => TRAIL[id] ?? [];

function record(id: string, step: Step) {
  TRAIL = { ...TRAIL, [id]: [...trailOf(id), step] };
}

export function addNote(id: string, who: string, text: string) {
  NOTES = { ...NOTES, [id]: [...notesOn(id), { at: stamp(), who, text }] };
  wrote();
}

export function assign(conflict: Conflict, who: string, by: string) {
  record(conflict.id, { at: stamp(), who: by, action: "assigned", property: "Assignee", before: conflict.assignee, after: who });
  updateConflict(conflict.id, { assignee: who });
}

export function askForEvidence(conflict: Conflict, by: string) {
  record(conflict.id, { at: stamp(), who: by, action: "asked for evidence", property: "State", before: conflict.state, after: "Awaiting evidence" });
  updateConflict(conflict.id, { state: "Awaiting evidence", step: Math.max(conflict.step, 1) });
}

/**
 * Who has been told of an outcome, and what: the graph's own notices (`graph/notify.ts` — a
 * resolution, a policy change), and the console's for what the graph has no write for (an unmerge,
 * an audit window).
 */
export interface Notice {
  at: Date;
  to: string;
  about: string;
  says: string;
}
let NOTICES: Notice[] = [];
export const noticesAbout = (about: string): Notice[] => [
  ...TOLD.filter((one) => one.about.id === about).map((one) => ({ at: one.at, to: personName(one.to), about, says: one.title })),
  ...NOTICES.filter((one) => one.about === about),
].sort((a, b) => b.at.getTime() - a.at.getTime());
const notify = (to: string, about: string, says: string) => {
  NOTICES = [{ at: stamp(), to, about, says }, ...NOTICES];
};

/**
 * A conflict resolved: the outcome, the rule or evidence it rests on, and the reason — recorded on
 * the conflict, and every party on it told. The attestation dispute (F3) also reinstates or revokes
 * the grant it paused, and the attestation with it.
 */
export function resolve(conflict: Conflict, by: string, outcome: string, basis: string, reason: string) {
  const dispute = disputeOf(conflict);
  if (dispute) {
    const upheld = outcome === UPHOLD;
    setGrantState(dispute.grant, upheld ? "Live" : "Revoked");
    setAttestationState(dispute.attestation, upheld ? "Signed" : "Revoked");
  }
  record(conflict.id, { at: stamp(), who: by, action: "resolved", property: "State", before: conflict.state, after: "Resolved" });
  // Every party is told by the graph as it hears the conflict resolve (F3 step 5).
  updateConflict(conflict.id, {
    state: "Resolved",
    step: 3,
    resolution: { actor: by, onBehalfOf: "Sureel Rights Ops", at: stamp(), reason: `${outcome}. ${reason}`, rule: basis },
  });
}

// ---------------------------------------------------------------------------------------------
// The attestation dispute (F3): the label attested on the artist's behalf, the artist disputed.

export const UPHOLD = "Attestation upheld — the grant is reinstated";
export const REVOKE = "Dispute upheld — the grant is revoked";

/** The artist's side of the dispute, as the artist app sent it (S3). */
export const DISPUTES: Partial<Record<string, { attestation: string; grant: string; by: string; at: Date; via: string; says: string; assurance: string }>> = {
  "cf-6": {
    attestation: "at-4",
    grant: "g-14",
    by: "p-mira",
    at: at(10, 14, 8, 3),
    via: "Artist app · ArtistID artistid-mira-2026a",
    says: "I never agreed to a voice model with Voxa Voice. §7.4 covers approved partners, and Voxa was never approved with me.",
    assurance: "Verified + ID",
  },
};

export const disputeOf = (conflict: Conflict) => DISPUTES[conflict.id];
export const attestationById = (id: string) => ATTESTATIONS.find((one) => one.id === id)!;

// ---------------------------------------------------------------------------------------------
// What a resolution can rest on

/** The rules and the evidence a resolver can name: the precedence each claim's source holds, and what was uploaded. */
export function basesOf(conflict: Conflict, claims: readonly Assertion[]): string[] {
  const rule = (what: string) => formatMeta([`Resolver ${RULE_VERSION}`, what]) ?? what;
  const rules = claims.map((one) => rule(`precedence ${PRECEDENCE[one.source]} (${one.source.toLowerCase()})`));
  const evidence = claims.flatMap((one) => [one.sourceRef, ...(one.evidence ?? [])]);
  const dispute = disputeOf(conflict);
  const cited = dispute ? [`${attestationById(dispute.attestation).authority} — cited agreement clause`] : [];
  return [...new Set([...cited, ...rules, ...evidence, rule("authority rule")])];
}

/** The outcomes a conflict of each kind can end in. */
export function outcomesOf(conflict: Conflict): string[] {
  switch (conflict.kind) {
    case "Attestation dispute":
      return [UPHOLD, REVOKE];
    case "Overclaim":
      return ["The share the graph holds stands — the higher claim is rejected", "The higher claim stands — the graph's share is superseded"];
    case "Gap":
      return ["The unclaimed share stays in suspense", "The share is held on evidence"];
    case "Territory overlap":
      return ["The signed agreement stands — the platform claim stays evidence only", "The platform claim is upheld on evidence"];
    case "Unauthorized grant":
      return ["The grant stays flagged — it never clears", "A controlling edge was shown — the grant clears"];
    case "Expired but paying":
      return ["The term was renewed — paying continues", "The term ended — paying stops"];
    case "Missing work link":
      return ["Linked to a work", "No work exists — the income stays unmatched"];
  }
}

// ---------------------------------------------------------------------------------------------
// Merges (S7-3, S7-4)

export type Merge = (typeof MERGES)[number];

/** Each suggestion's decision, once a reviewer has made one. */
let DECIDED: Partial<Record<string, { state: "Matched" | "Unmatched"; at: Date; by: string }>> = {};

export const mergeState = (one: Merge) => DECIDED[one.id]?.state ?? one.state;
export const mergeDecision = (id: string) => DECIDED[id];

export function decideMerge(id: string, state: "Matched" | "Unmatched", by: string) {
  DECIDED = { ...DECIDED, [id]: { state, at: stamp(), by } };
  const one = MERGES.find((each) => each.id === id)!;
  // A recording link accepted IS the Recording↔Work join: the graph's own write links it, and the
  // missing-link conflict on the recording resolves with it.
  const link = LINKS[id];
  if (state === "Matched" && link) linkRecording(link.recording, link.work, `Match review · ${by}`);
  if (state === "Matched") {
    MERGED = [
      { id: `mg-${id}`, kind: one.kind, kept: one.left.name, folded: one.right.name, ids: [...one.left.ids, ...one.right.ids], from: one.id, assets: MERGE_ASSETS[id] ?? [], at: stamp(), by },
      ...MERGED,
    ];
  }
  wrote();
}

/** The join a recording-link suggestion makes, where it is one. */
export const LINKS: Partial<Record<string, { recording: string; work: string }>> = {
  "m-2": { recording: "r-switchback", work: "w-switchback" },
};

/** The assets each suggestion touches in the graph — what recomputes when it is merged or undone. */
export const MERGE_ASSETS: Record<string, readonly string[]> = {
  "m-1": ["w-northbound", "w-tidewater", "r-northbound"],
  "m-2": ["r-switchback", "w-switchback", "v-switchback-live"],
  "m-3": ["w-tidewater", "r-tidewater", "r-tidewater-remix"],
  "m-4": ["r-lowlight", "r-glass-coast", "r-ferry"],
};

export interface Merged {
  id: string;
  kind: Merge["kind"];
  /** The record kept. */
  kept: string;
  /** The record folded into it. */
  folded: string;
  ids: readonly string[];
  /** The suggestion it came from, where a reviewer accepted one. */
  from?: string;
  assets: readonly string[];
  at: Date;
  by: string;
  undone?: { at: Date; by: string; reason: string };
}

let MERGED: Merged[] = [
  { id: "mg-0412", kind: "Party", kept: "Mira Castellanos", folded: "M. Castellanos", ids: ["ISNI 0000000502916647", "MMG-ART-22871"], assets: ["r-northbound", "r-tidewater", "r-paper-moons", "r-ferry"], at: at(10, 8, 15, 30), by: "Noor Haddad" },
  { id: "mg-0398", kind: "Work", kept: "Paper Moons", folded: "Paper Moon", ids: ["ISWC T-912.448.377-8", "MLC P83301K"], assets: ["w-paper-moons", "r-paper-moons"], at: at(9, 21, 11, 2), by: "Lior Ben-Ami" },
  { id: "mg-0377", kind: "Party", kept: "Silverbirch Publishing House", folded: "Silverbirch Publishing", ids: ["IPI 00377190442", "IPI 00377190443"], assets: ["w-paper-moons", "w-lowlight", "w-glass-coast", "w-switchback", "w-ferry"], at: at(9, 2, 9, 45), by: "Noor Haddad" },
];

export const merged = () => MERGED;
export const mergedById = (id: string) => MERGED.find((one) => one.id === id);

/** Everyone holding a claim or a credit on what a merge touches — who is told when it is undone. */
export function affectedBy(one: Merged) {
  const on = new Set(one.assets.flatMap((id) => [id, ...worksOf(assetById(id)).map((work) => work.id)]));
  const parties = new Map<string, { party: string; claims: number; credits: number; assets: Set<string> }>();
  const touch = (party: string, asset: string, kind: "claims" | "credits") => {
    const held = parties.get(party) ?? { party, claims: 0, credits: 0, assets: new Set<string>() };
    held[kind] += 1;
    held.assets.add(asset);
    parties.set(party, held);
  };
  for (const claim of ASSERTIONS) if (on.has(claim.assetId) && claim.state !== "Superseded") touch(claim.partyId, claim.assetId, "claims");
  for (const credit of CREDITS) if (on.has(credit.assetId)) touch(credit.partyId, credit.assetId, "credits");
  return [...parties.values()].map((held) => ({ ...held, assets: [...held.assets] }));
}

export function unmerge(id: string, by: string, reason: string) {
  const one = mergedById(id)!;
  MERGED = MERGED.map((each) => (each.id === id ? { ...each, undone: { at: stamp(), by, reason } } : each));
  for (const party of affectedBy(one)) notify(partyName(party.party), id, `Unmerged ${one.folded} from ${one.kept}: splits on ${one.assets.length} assets recompute on the next snapshot.`);
  if (one.from) DECIDED = { ...DECIDED, [one.from]: { state: "Unmatched", at: stamp(), by } };
  wrote();
}

/** Auto-accept stands at this confidence: below it, a person decides. */
export const AUTO_ACCEPT = 0.9;

// ---------------------------------------------------------------------------------------------
// Rule versions (S7-7)

export type Rule = (typeof RULES)[number];

let PUBLISHED: { version: string; at: Date; by: string } | null = null;
let REPLAYED: Partial<Record<string, { at: Date; by: string }>> = {};

/** The versions as they stand now — a draft published moves the one before it to retired. */
export function rules(): Rule[] {
  if (!PUBLISHED) return [...RULES];
  return RULES.map((one) =>
    one.version === PUBLISHED!.version
      ? { ...one, state: "Published" as const, published: PUBLISHED!.at }
      : one.state === "Published"
        ? { ...one, state: "Retired" as const }
        : one,
  );
}
export const ruleById = (version: string) => rules().find((one) => one.version === version);
export const replayOf = (version: string) => REPLAYED[version];

export function replay(version: string, by: string) {
  REPLAYED = { ...REPLAYED, [version]: { at: stamp(), by } };
  wrote();
}
export function publish(version: string, by: string) {
  PUBLISHED = { version, at: stamp(), by };
  wrote();
}

/** The ownership precedence ladder each version resolves by — what the diff reads. */
export const LADDERS: Record<string, readonly string[]> = {
  "v1.4-draft": [
    "Signed agreement",
    "Society acknowledgement — GEMA or SACEM, inside its own territory",
    "Society acknowledgement — other societies, or outside its territory",
    "CWR submitted",
    "Label declaration",
    "Self-declared",
    "Platform claim — evidence only, never resolves",
  ],
  "v1.3": [
    "Signed agreement",
    "Society acknowledgement",
    "CWR submitted",
    "Label declaration",
    "Self-declared",
    "Platform claim — evidence only, never resolves",
  ],
  "v1.2": ["Signed agreement", "Society acknowledgement", "CWR submitted", "Label declaration", "Self-declared", "Platform claim"],
  "v1.1": ["Signed agreement", "Society acknowledgement", "CWR submitted", "Self-declared", "Label declaration", "Platform claim"],
};

/** The version a rule is read against — the one it would replace. */
export const baseOf = (version: string) => {
  const all = RULES.map((one) => one.version);
  return all[all.indexOf(version) + 1];
};

/** A sample of the resolved values a draft would change, from the replay of the whole graph. */
export const REPLAY_SAMPLE: readonly { id: string; assetId: string; value: string; territory: string; now: string; would: string; revenue: number }[] = [
  { id: "rp-1", assetId: "w-northbound", value: "Publisher share, Harbor Music", territory: "DE", now: "50% · signed agreement AGR-101", would: "60% · GEMA ack 2026-03-0412", revenue: 14460 },
  { id: "rp-2", assetId: "w-lowlight", value: "Publisher share, Silverbirch Publishing House", territory: "DE, AT", now: "100% · CWR 3.1 SPH-2410-07", would: "80% · GEMA ack 2025-11-2210", revenue: 3824 },
  { id: "rp-3", assetId: "w-glass-coast", value: "Publisher share, Silverbirch Publishing House", territory: "FR", now: "100% · CWR 3.1 SPH-2410-07", would: "75% · SACEM ack 2026-02-0091", revenue: 1932 },
  { id: "rp-4", assetId: "w-ember", value: "Publisher share, Harbor Music", territory: "DE", now: "100% · CWR 3.1 HBM-2505-02", would: "50% · GEMA ack 2026-06-1187", revenue: 1081 },
  { id: "rp-5", assetId: "w-tidewater", value: "Publisher share, Meridian Music Group", territory: "FR", now: "Not resolved · borrowed lane", would: "25% · SACEM ack 2026-09-0310", revenue: 2825 },
];

// ---------------------------------------------------------------------------------------------
// Tenants (S7-8) — policy changes and audit windows

export type SharingLevel = Tenant["sharing"][number]["level"];
export const SHARING_LEVELS: readonly SharingLevel[] = ["Shared", "Private", "Encrypted"];

export const tenants = (): readonly Tenant[] => TENANTS;
export const tenantById = (id: string) => tenants().find((one) => one.id === id)!;

export interface PolicyChange {
  at: Date;
  tenant: string;
  field: string;
  before: SharingLevel;
  after: SharingLevel;
  by: string;
  reason: string;
  notified: string;
}

let POLICY_LOG: PolicyChange[] = [
  { at: at(10, 1, 12, 0), tenant: "p-meridian", field: "Agreement references", before: "Shared", after: "Private", by: "Noor Haddad", reason: "Meridian asked for agreement codes to be private before the backfill.", notified: "Meridian Music Group admin" },
];
export const policyLogOf = (tenant: string) => POLICY_LOG.filter((one) => one.tenant === tenant);

export function changeSharing(tenantId: string, field: string, after: SharingLevel, by: string, reason: string) {
  const tenant = tenantById(tenantId);
  const before = tenant.sharing.find((one) => one.field === field)!.level;
  setSharing(tenantId, field, after, by);
  const admin = `${tenant.name} admin`;
  POLICY_LOG = [{ at: stamp(), tenant: tenantId, field, before, after, by, reason, notified: admin }, ...POLICY_LOG];
  addAccess(tenantId, { at: stamp(), who: `${by}, Sureel ops`, via: "Graph Console · sharing policy", what: `${field}: ${before} → ${after}. You were notified.` });
  wrote();
}

export interface Audit {
  id: string;
  tenant: string;
  who: string;
  field: string;
  reason: string;
  /** Minutes the window stays open. */
  window: number;
  opens: Date;
  closes: Date;
  about?: string;
}

let AUDITS: Audit[] = [
  { id: "AR-112", tenant: "p-meridian", who: "Lior Ben-Ami", field: "Agreement references", reason: "Overclaim cf-8 on Tidewater: check Meridian's sub-publishing agreement against Harbor's.", window: 30, opens: at(10, 19, 14, 40), closes: at(10, 19, 15, 10), about: "cf-8" },
];
export const auditsOf = (tenant: string) => AUDITS.filter((one) => one.tenant === tenant);

/**
 * "Under audit only": a logged, time-boxed window on one private field, which the contributor
 * reads in its own access log as it opens.
 */
export function requestAudit(tenantId: string, who: string, field: string, window: number, reason: string, about?: string) {
  const tenant = tenantById(tenantId);
  const opens = stamp();
  const closes = new Date(opens.getTime() + window * 60_000);
  const id = `AR-${113 + AUDITS.length - 1}`;
  AUDITS = [{ id, tenant: tenantId, who, field, reason, window, opens, closes, about }, ...AUDITS];
  addAccess(tenantId, { at: opens, who: `${who}, Sureel ops`, via: `Graph Console · audit request ${id}`, what: `${field}, ${window}-minute window`, audit: true });
  notify(`${tenant.name} admin`, tenantId, `Audit request ${id} opened on ${field} for ${window} minutes.`);
  wrote();
  return id;
}

/** Whether a window is still open, as of the console's clock. */
export const isOpen = (one: Audit) => one.closes > clock();

// ---------------------------------------------------------------------------------------------
// False-claim tracking (S7-9)

export type Claimant = (typeof CLAIMANTS)[number];

/** The rejection rate past which a party's new claims wait for review — a policy call, not ours. */
export const THRESHOLD = 15;

export const rejectionRate = (one: Claimant) => (one.rejected / one.submitted) * 100;

let RESTRICTED: Partial<Record<string, { on: boolean; at: Date; by: string }>> = {};
export const isRestricted = (one: Claimant) => RESTRICTED[one.party]?.on ?? one.review;
export const restrictionOf = (one: Claimant) => RESTRICTED[one.party];
export function restrict(party: string, on: boolean, by: string) {
  RESTRICTED = { ...RESTRICTED, [party]: { on, at: stamp(), by } };
  wrote();
}

// ---------------------------------------------------------------------------------------------
// Ingestion (S7-1)

let RETRIED: Partial<Record<string, { at: Date; by: string }>> = {};
export const retryOf = (feed: Feed) => RETRIED[feed.id];
export function retry(feed: Feed, by: string) {
  RETRIED = { ...RETRIED, [feed.id]: { at: stamp(), by } };
  wrote();
}
export const flagged = () => FEEDS.filter((one) => one.state !== "On time");

// ---------------------------------------------------------------------------------------------
// Coverage (S7-6)

export const MEASURES = ["Master resolved", "Join rate", "Composition resolved", "Conflict rate"] as const;
export type Measure = (typeof MEASURES)[number];

/**
 * What each measure means, and the 30 November gate it is read against. The FRD names the gate and
 * not its numbers: these are placeholders until the deal team sets them (logged).
 */
export const MEASURE: Record<Measure, { means: string; gate: number; best: "high" | "low" }> = {
  "Master resolved": { means: "Revenue-weighted share of recordings whose master side resolves at T3 or above.", gate: 70, best: "high" },
  "Join rate": { means: "Revenue-weighted share of recordings linked to at least one work.", gate: 50, best: "high" },
  "Composition resolved": { means: "Revenue-weighted share of works whose shares resolve to 100% at T3 or above.", gate: 40, best: "high" },
  "Conflict rate": { means: "Revenue-weighted share of assets with an open conflict.", gate: 3, best: "low" },
};

/** The feeds each lane loads from — its last load is how a new lane's coverage is known to be in. */
export const feedsOf = (lane: Lane) => FEEDS.filter((one) => one.lane === lane);

// ---------------------------------------------------------------------------------------------
// The asset inspector (S7-5) — the resolved view, grouped where the answer is the same.

/** The territories a resolved view is read in: every code a claim on it names, and the big markets. */
export function territoriesOn(claims: readonly Assertion[]): string[] {
  const named = claims.flatMap((one) => [...(one.territory.include === "World" ? [] : one.territory.include), ...(one.territory.exclude ?? [])]);
  return [...new Set(["US", "GB", ...named, "FR", "JP"])];
}

