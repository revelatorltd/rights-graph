import { formatMeta } from "@revelator/pro-ui";

import {
  addAssertion,
  addConflict,
  addRequest,
  partyName,
  ASSERTIONS,
  assetById,
  ASSETS,
  CONFLICTS,
  GRANTS,
  now,
  PARTIES,
  PARTNERS,
  PROOF,
  REQUESTS,
  TODAY,
  WORLD,
  wrote,
} from "../../graph/fixtures";
import type { Asset, Decision, Partner, ProofEvent, Request, ScopeLevel, Side, TerritorySet, Use } from "../../graph/model";
import { clearanceOf, controllers, performersOf, recordingsOf, type Answer, type Clearance } from "../../graph/resolve";
import { slug } from "../../route";
import { columnFor, dateOf, isrcProblem, iswcWritten, type CwrAck, type ReadResult } from "../../rights/files";

/**
 * What the Partner portal keeps beside the graph — a partner's application, its keys, its
 * webhook endpoints, the look-ups it ran and the receipts each one was given, its usage uploads,
 * and (for a society) its registrations. Everything here is the PARTNER'S OWN record; every rights
 * answer on it still comes from `resolve.ts`, asked again or snapshotted on the receipt.
 *
 * Writes call the graph's `wrote()`, so every page drawn through `useGraph()` draws again.
 */

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
const at = (year: number, month: number, date: number, hour: number, minute = 0, second = 0) =>
  new Date(year, month - 1, date, hour, minute, second);

// ---------------------------------------------------------------------------------------------
// Who the reader is working as

/**
 * The organisations the portal can be seen as. The first three are the FRD's three kinds — an AI
 * platform, a DSP, a society; Voxa Voice is here for F3's `licence.paused`, and Tessellate for
 * the invited state of the whole portal (S6-1). Decided here — see docs/gaps/s6-partner.md.
 */
export const PERSONAS = ["Cadence AI", "Openwave Studios", "GEMA", "Voxa Voice", "Tessellate"] as const;
export type Persona = (typeof PERSONAS)[number];

export const WORKING_AS: Record<Persona, { partner: string; user: { name: string; email: string } }> = {
  "Cadence AI": { partner: "p-cadence", user: { name: "Maya Chen", email: "maya.chen@cadence-ai.example" } },
  "Openwave Studios": { partner: "p-openwave-sync", user: { name: "Lars Ekdahl", email: "lars.ekdahl@openwave.example" } },
  GEMA: { partner: "p-gema", user: { name: "Katrin Vogel", email: "k.vogel@gema.example" } },
  "Voxa Voice": { partner: "p-voxa", user: { name: "André Silva", email: "andre.silva@voxa.example" } },
  Tessellate: { partner: "p-tessellate", user: { name: "Jonas Weber", email: "jonas.weber@tessellate.example" } },
};

export const partnerOf = (id: string): Partner => PARTNERS.find((one) => one.id === id)!;

// ---------------------------------------------------------------------------------------------
// Opaque ids and hashes — what a receipt and a proof event carry instead of names.

const hash = (seed: string, length = 64) => {
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  let out = "";
  while (out.length < length) {
    value = (Math.imul(value, 1103515245) + 12345) >>> 0;
    out += (value >>> 8).toString(16).padStart(6, "0");
  }
  return out.slice(0, length);
};

/** The opaque id the Proof Log knows an asset by — two kept as the shared log already writes them. */
const OPAQUE: Record<string, string> = { "r-paper-moons": "ast_7e1c9b2a", "r-northbound": "ast_4a08f1d3" };
export const opaqueOf = (assetId: string) => OPAQUE[assetId] ?? `ast_${hash(assetId, 8)}`;

const BASE32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const receiptId = (seed: string) => {
  const digits = hash(seed, 24);
  const word = (from: number) =>
    Array.from({ length: 4 }, (_, index) => BASE32[parseInt(digits.slice(from + index * 2, from + index * 2 + 2), 16) % 32]).join("");
  return `rcpt_${word(0)}-${word(8)}-${word(16)}`;
};

// ---------------------------------------------------------------------------------------------
// Receipts — every clearance answer is one (S6-6), and each is a proof event S8 verifies.

/** Proof events this portal minted: one CLEARANCE_RECEIPT per answer given. */
export let ISSUED: ProofEvent[] = [];
let nextSeq = 882141;
const taken = new Set(PROOF.map((one) => one.seq));
const latest = PROOF.reduce((most, one) => (one.at > most ? one.at : most), new Date(0));

/**
 * The log is append-only, so an event's number follows its time: one dated before the shared
 * log's latest takes the first free number after the last shared event it follows.
 */
function seqFor(when: Date) {
  if (when >= latest) return nextSeq++;
  let seq = PROOF.filter((one) => one.at <= when).reduce((most, one) => Math.max(most, one.seq), 0) + 1;
  while (taken.has(seq)) seq += 1;
  taken.add(seq);
  return seq;
}

function mint(subject: string, use: Use, when: Date, seed: string, type: ProofEvent["type"] = "CLEARANCE_RECEIPT"): ProofEvent {
  const seq = seqFor(when);
  const event: ProofEvent = {
    seq,
    type,
    subject,
    scope: type === "GENESIS" ? "Output" : "Asset",
    use,
    at: when,
    payloadHash: hash(`payload/${seed}`),
    prevHash: hash(`event/${seq - 1}`),
    eventHash: hash(`event/${seq}`),
    keyId: "pl-ed25519-2026-07",
    batch: `mb-${Math.floor(seq / 40)}`,
    ...(type === "CLEARANCE_RECEIPT" ? { receipt: receiptId(seed) } : {}),
  };
  ISSUED = [event, ...ISSUED];
  return event;
}

/** A receipt or event id, in the shared log or among the receipts issued here. */
export function proofOf(id: string): ProofEvent | undefined {
  const asked = id.trim().toLowerCase();
  if (!asked) return undefined;
  return [...PROOF, ...ISSUED].find((one) => one.receipt?.toLowerCase() === asked || String(one.seq) === asked);
}

/** The answer as the receipt froze it: the graph may answer differently later. */
export interface Snapshot {
  state: Answer;
  reason: string;
  master: { state: Answer; reason: string; level: string; grant?: string };
  composition: readonly { state: Answer; reason: string; level: string; work?: string; party?: string; grant?: string }[];
}

const freeze = (answer: Clearance): Snapshot => ({
  state: answer.state,
  reason: answer.reason,
  master: { state: answer.master.state, reason: answer.master.reason, level: answer.master.level, grant: answer.master.grant?.id },
  composition: answer.composition.map((one) => ({
    state: one.state,
    reason: one.reason,
    level: one.level,
    work: one.work?.id,
    party: one.party,
    grant: one.grant?.id,
  })),
});

// ---------------------------------------------------------------------------------------------
// Territories a partner picks from

export const TERRITORIES: readonly { code: string; name: string }[] = [
  { code: "World", name: "Worldwide" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "SE", name: "Sweden" },
  { code: "CA", name: "Canada" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
];
export const territoryName = (code: string) => TERRITORIES.find((one) => one.code === code)?.name ?? code;
const setOf = (code: string): TerritorySet => (code === "World" ? WORLD : { include: [code] });
/** The one country a territory set is resolved at — the world where it is the world. */
export const countryOf = (set: TerritorySet) => (set.include === "World" ? (set.exclude?.length ? "US" : "World") : set.include[0]!);

/** What the FRD's countries are called in the system's country field, for the onboarding form. */
const ISO: Record<string, string> = {
  "United States of America": "US",
  "United Kingdom": "GB",
  Germany: "DE",
  France: "FR",
  Sweden: "SE",
  Canada: "CA",
  Japan: "JP",
  Brazil: "BR",
  Spain: "ES",
  Italy: "IT",
  Netherlands: "NL",
  Austria: "AT",
  Switzerland: "CH",
  Australia: "AU",
};
export const isoOf = (name: string) => ISO[name] ?? name;

// ---------------------------------------------------------------------------------------------
// Applications — S6-1

export interface Contact {
  role: "Business" | "Technical" | "Legal";
  name: string;
  email: string;
}

export interface Application {
  legalName: string;
  kind: Partner["kind"];
  country: string;
  website: string;
  contacts: readonly Contact[];
  uses: readonly Use[];
  territories: TerritorySet;
  /** The terms version accepted, by whom and when. */
  terms?: { version: string; by: string; at: Date };
  submitted?: Date;
  /** Sureel's sign-off: who, and when — what issues the keys. */
  approved?: Decision;
}

export const TERMS_VERSION = "Sureel Partner Terms v2.1";
const SUREEL_OPS = "Lior Ben-Ami";

let APPLICATIONS: Record<string, Application> = {
  "p-cadence": {
    legalName: "Cadence AI, Inc.",
    kind: "AI platform",
    country: "United States of America",
    website: "https://cadence-ai.example",
    contacts: [
      { role: "Business", name: "Maya Chen", email: "maya.chen@cadence-ai.example" },
      { role: "Technical", name: "Owen Park", email: "owen.park@cadence-ai.example" },
      { role: "Legal", name: "Rita Alvarez", email: "legal@cadence-ai.example" },
    ],
    uses: ["AI training", "AI derivative"],
    territories: WORLD,
    terms: { version: TERMS_VERSION, by: "Rita Alvarez", at: at(2026, 8, 18, 15, 20) },
    submitted: at(2026, 8, 18, 15, 22),
    approved: { actor: SUREEL_OPS, onBehalfOf: "Sureel Rights Ops", authority: "Partner review PR-0412", at: at(2026, 8, 20, 10, 5) },
  },
  "p-openwave-sync": {
    legalName: "Openwave Studios AB",
    kind: "DSP",
    country: "Sweden",
    website: "https://openwave.example",
    contacts: [
      { role: "Business", name: "Lars Ekdahl", email: "lars.ekdahl@openwave.example" },
      { role: "Technical", name: "Sofia Berg", email: "sofia.berg@openwave.example" },
    ],
    uses: ["Sync", "Stream"],
    territories: WORLD,
    terms: { version: "Sureel Partner Terms v2.0", by: "Lars Ekdahl", at: at(2026, 3, 1, 9, 40) },
    submitted: at(2026, 3, 1, 9, 42),
    approved: { actor: "Noor Haddad", onBehalfOf: "Sureel Rights Ops", authority: "Partner review PR-0207", at: at(2026, 3, 3, 14) },
  },
  "p-gema": {
    legalName: "GEMA — Gesellschaft für musikalische Aufführungs- und mechanische Vervielfältigungsrechte",
    kind: "Society",
    country: "Germany",
    website: "https://gema.example",
    contacts: [
      { role: "Business", name: "Katrin Vogel", email: "k.vogel@gema.example" },
      { role: "Technical", name: "Felix Brandt", email: "f.brandt@gema.example" },
    ],
    uses: [],
    territories: { include: ["DE"] },
    terms: { version: "Sureel Partner Terms v2.0", by: "Katrin Vogel", at: at(2026, 5, 28, 11) },
    submitted: at(2026, 5, 28, 11, 4),
    approved: { actor: SUREEL_OPS, onBehalfOf: "Sureel Rights Ops", authority: "Society agreement SA-GEMA-01", at: at(2026, 6, 1, 9) },
  },
  "p-voxa": {
    legalName: "Voxa Voice LLC",
    kind: "AI platform",
    country: "United States of America",
    website: "https://voxa.example",
    contacts: [{ role: "Business", name: "André Silva", email: "andre.silva@voxa.example" }],
    uses: ["Voice/NIL"],
    territories: WORLD,
    terms: { version: TERMS_VERSION, by: "André Silva", at: at(2026, 9, 23, 17) },
    submitted: at(2026, 9, 23, 17, 3),
    approved: { actor: "Noor Haddad", onBehalfOf: "Sureel Rights Ops", authority: "Partner review PR-0455", at: at(2026, 9, 25, 12) },
  },
};

export const applicationOf = (partner: string): Application | undefined => APPLICATIONS[partner];

/** Where the partner stands: invited until Sureel approves its application, then active. */
export function standingOf(partner: string): Partner["state"] {
  const base = partnerOf(partner).state;
  if (base !== "Invited") return base;
  return APPLICATIONS[partner]?.approved ? "Active" : "Invited";
}

export function submitApplication(partner: string, application: Application) {
  APPLICATIONS = { ...APPLICATIONS, [partner]: { ...application, approved: APPLICATIONS[partner]?.approved } };
  wrote();
}

/**
 * Sureel's approval — the console's to call (S7). It issues a sandbox and a production key with the
 * scopes the partner's use types need (S6-1 acceptance).
 */
export function approveApplication(partner: string, actor: string) {
  const application = APPLICATIONS[partner];
  if (!application) return;
  APPLICATIONS = {
    ...APPLICATIONS,
    [partner]: { ...application, approved: { actor, onBehalfOf: "Sureel Rights Ops", authority: "Partner review", at: now() } },
  };
  const scopes = application.kind === "Society" ? ["registrations:write", "claims:read"] : ["clearance:read", "usage:write", "requests:write"];
  KEYS = [
    { id: `ck_sbx_${hash(`${partner}/sbx`, 4)}`, partner, env: "Sandbox", created: TODAY, scopes },
    { id: `ck_live_${hash(`${partner}/live`, 4)}`, partner, env: "Production", created: TODAY, scopes },
    ...KEYS,
  ];
  wrote();
}

// ---------------------------------------------------------------------------------------------
// API keys — S6-2

export interface Key {
  id: string;
  partner: string;
  env: "Sandbox" | "Production";
  created: Date;
  scopes: readonly string[];
  lastUsed?: Date;
  /** A rotated key keeps working this long, then stops. */
  expires?: Date;
  replacedBy?: string;
}

let KEYS: Key[] = PARTNERS.flatMap((partner) => partner.keys.map((key) => ({ ...key, partner: partner.id })));

export const keysOf = (partner: string) => KEYS.filter((one) => one.partner === partner);
export const hasScope = (partner: string, scope: string) =>
  keysOf(partner).some((one) => !one.expires && one.scopes.includes(scope));

/** A new key in the old one's place; the old one works for another day, so nothing breaks mid-deploy. */
export function rotateKey(id: string) {
  const old = KEYS.find((one) => one.id === id);
  if (!old) return;
  const fresh: Key = { ...old, id: `${old.id.replace(/_[0-9a-z]+$/, "")}_${hash(`${id}/${KEYS.length}`, 4)}`, created: TODAY, lastUsed: undefined, expires: undefined, replacedBy: undefined };
  const tomorrow = new Date(TODAY.getTime() + 24 * 60 * 60 * 1000);
  KEYS = [fresh, ...KEYS.map((one) => (one.id === id ? { ...one, expires: tomorrow, replacedBy: fresh.id } : one))];
  wrote();
}

/** The sandbox's test catalogue: fixed answers, so a partner's integration can be tested against each outcome (S6-2). */
export const TEST_CATALOGUE: readonly {
  isrc: string;
  iswc?: string;
  title: string;
  use: Use;
  master: Answer;
  composition: Answer;
  answer: Answer;
  proves: string;
}[] = [
  { isrc: "QZTST2600001", iswc: "T-000.000.001-0", title: "Test — cleared both sides", use: "AI training", master: "Granted", composition: "Granted", answer: "Granted", proves: "A standing grant on each side; a receipt is issued." },
  { isrc: "QZTST2600002", iswc: "T-000.000.002-1", title: "Test — master denied", use: "AI training", master: "Denied", composition: "Granted", answer: "Denied", proves: "An asset-level deny overrides a catalogue grant." },
  { isrc: "QZTST2600003", title: "Test — no work link", use: "AI training", master: "Granted", composition: "Needs review", answer: "Needs review", proves: "A missing Recording↔Work link never defaults to cleared." },
  { isrc: "QZTST2600004", iswc: "T-000.000.004-3", title: "Test — paused by a dispute", use: "Voice/NIL", master: "Needs review", composition: "Granted", answer: "Needs review", proves: "A paused grant reads as not cleared; a licence.paused webhook fires." },
  { isrc: "QZTST2600005", iswc: "T-000.000.005-4", title: "Test — grantor without authority", use: "Sync", master: "Needs review", composition: "Granted", answer: "Needs review", proves: "A grant from a party with no controlling edge is stored and flagged." },
  { isrc: "QZTST2600006", iswc: "T-000.000.006-5", title: "Test — AI default", use: "AI derivative", master: "Denied", composition: "Needs review", answer: "Denied", proves: "Every AI use defaults to deny, and depends on AI training." },
];

// ---------------------------------------------------------------------------------------------
// Clearance look-ups — S6-3, each with its receipt (S6-6)

export interface Lookup {
  id: string;
  partner: string;
  assetId: string;
  use: Use;
  country: string;
  asked: Date;
  receipt: string;
  seq: number;
  answer: Snapshot;
  /** The key the call was made with — the UI's look-ups go through the partner's own key. */
  via: string;
}

let LOOKUPS: Lookup[] = [];

function ask(partner: string, assetId: string, use: Use, country: string, asked: Date, via: string, existing?: ProofEvent): Lookup {
  const answer = freeze(clearanceOf(assetId, use, { partner, country, at: asked, audience: "partner" }));
  const event = existing ?? mint(opaqueOf(assetId), use, asked, `${partner}/${assetId}/${use}/${country}/${asked.getTime()}`);
  return { id: `lk-${event.seq}`, partner, assetId, use, country, asked, receipt: event.receipt!, seq: event.seq, answer, via };
}

export const lookupsOf = (partner: string) => LOOKUPS.filter((one) => one.partner === partner);
export const lookupById = (id: string) => LOOKUPS.find((one) => one.id === id);

/** A look-up asked from the portal, answered by the graph now, and its receipt minted. */
export function lookUp(partner: string, assetId: string, use: Use, country: string) {
  const key = keysOf(partner).find((one) => one.env === "Production" && !one.expires) ?? keysOf(partner)[0];
  const made = ask(partner, assetId, use, country, new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 10, 12 + LOOKUPS.length), key?.id ?? "Portal");
  LOOKUPS = [made, ...LOOKUPS];
  wrote();
  return made.id;
}

/** What a partner may look a code up by: a recording's ISRC, a work's ISWC, a title. */
export const LOOKABLE: readonly Asset[] = ASSETS.filter((one) => one.kind !== "Release");

// ---------------------------------------------------------------------------------------------
// Licence requests — S6-4. One ask fans out to every holder's inbox; this groups it back.

export interface Ask {
  id: string;
  partner: string;
  use: Use;
  purpose: string;
  scope: Request["scope"];
  territory: TerritorySet;
  start: Date;
  end?: Date;
  received: Date;
  licenceModel?: Request["licenceModel"];
  /** The requests it became, one per holder's inbox. */
  requests: readonly Request[];
}

const purposeRoot = (purpose: string) => purpose.split(" — ")[0]!.replace(/\.$/, "");

/** The asks a partner made, read back from every holder's inbox. */
export function asksOf(partner: string): Ask[] {
  const groups = new Map<string, Request[]>();
  for (const one of REQUESTS.filter((each) => each.type === "Licence" && each.from === partner)) {
    const key = `${one.use}/${one.start.getTime()}/${purposeRoot(one.purpose)}`;
    groups.set(key, [...(groups.get(key) ?? []), one]);
  }
  return [...groups.values()].map((requests) => {
    const sorted = [...requests].sort((one, other) => (one.side === "Master" ? -1 : other.side === "Master" ? 1 : one.id.localeCompare(other.id)));
    const lead = sorted[0]!;
    return {
      id: lead.id,
      partner,
      use: lead.use!,
      purpose: purposeRoot(lead.purpose),
      scope: lead.scope,
      territory: lead.territory,
      start: lead.start,
      end: lead.end,
      received: lead.received,
      licenceModel: lead.licenceModel,
      requests: sorted,
    };
  });
}

export const askById = (partner: string, id: string) => asksOf(partner).find((one) => one.id === id);

/** The assets a scope names, resolved at read time — a catalogue, a release's tracks, an artist's recordings. */
export function assetsOfScope(scope: { level: ScopeLevel; ref: string }): Asset[] {
  if (scope.level === "Asset") return [assetById(scope.ref)];
  if (scope.level === "Release") return recordingsOf(assetById(scope.ref));
  if (scope.level === "Artist") return ASSETS.filter((one) => one.kind === "Recording" && performersOf(one).includes(scope.ref));
  const recordingsOfLabel = ASSETS.filter((one) => one.kind === "Recording" && one.labelId === scope.ref);
  if (recordingsOfLabel.length) return recordingsOfLabel;
  // A publisher's catalogue: the works it controls.
  return ASSETS.filter((one) => one.kind === "Work" && ASSERTIONS.some((claim) => claim.assetId === one.id && claim.partyId === scope.ref && claim.interests.includes("Controls")));
}

/** What an ask covers, track by track: the master request's scope where there is one. */
export const assetsOfAsk = (one: Ask) => assetsOfScope((one.requests.find((each) => each.side === "Master") ?? one.requests[0]!).scope);

/** The answer a track of an ask was given, and the receipt that proves it. */
export interface TrackReceipt {
  receipt: string;
  seq: number;
  asked: Date;
  answer: Snapshot;
}

/** The receipt each track of an ask was last answered with — minted when the ask was answered. */
const TRACK_RECEIPTS = new Map<string, TrackReceipt>();
export const trackReceipt = (askId: string, assetId: string) => TRACK_RECEIPTS.get(`${askId}/${assetId}`);

/** How many times each track of an ask was asked again — so a receipt's id never rests on the order pages minted in. */
const ASKED_AGAIN = new Map<string, number>();

function answerTrack(one: Ask, assetId: string, when: Date, shared?: ProofEvent) {
  // The same ask, track and moment mint the same receipt on every load: the one a partner hands
  // its auditor must still verify when the auditor opens it in a browser of their own (F6).
  const again = ASKED_AGAIN.get(`${one.id}/${assetId}`) ?? 0;
  const event = shared ?? mint(opaqueOf(assetId), one.use, when, `${one.id}/${assetId}/${when.getTime()}${again ? `/${again}` : ""}`);
  const answer = freeze(clearanceOf(assetId, one.use, { partner: one.partner, country: countryOf(one.territory), at: when, audience: "partner" }));
  TRACK_RECEIPTS.set(`${one.id}/${assetId}`, { receipt: event.receipt!, seq: event.seq, asked: when, answer });
}

function issueTrackReceipts(one: Ask, when: Date) {
  for (const asset of assetsOfAsk(one)) {
    if (TRACK_RECEIPTS.has(`${one.id}/${asset.id}`)) continue;
    // F6: Cadence's CD-7 receipts for Paper Moons and Northbound are the two the shared log holds.
    const shared = one.id === "rq-2202" ? PROOF.find((event) => event.subject === opaqueOf(asset.id) && event.type === "CLEARANCE_RECEIPT") : undefined;
    answerTrack(one, asset.id, shared?.at ?? when, shared);
  }
}

/** Asked again: the graph answers now, and the new answer is a new receipt (S6-6). */
export function checkAgain(one: Ask, assetId: string) {
  ASKED_AGAIN.set(`${one.id}/${assetId}`, (ASKED_AGAIN.get(`${one.id}/${assetId}`) ?? 0) + 1);
  answerTrack(one, assetId, TODAY);
  wrote();
}

/**
 * A new ask, routed to every holder of its scope: the master's controller and each controlling
 * publisher, each a request in their own inbox (S4) — logged as auto-cleared where a standing
 * grant already answers it, else waiting on a decision.
 */
export function requestLicence(input: {
  partner: string;
  use: Use;
  scope: { level: ScopeLevel; ref: string; name: string };
  territory: string;
  start: Date;
  end?: Date;
  purpose: string;
  licenceModel: "Dynamic" | "Flat";
}) {
  const assets = assetsOfScope(input.scope);
  const country = input.territory;
  const answers = assets.map((asset) => ({ asset, answer: clearanceOf(asset.id, input.use, { partner: input.partner, country, audience: "partner" }) }));
  const deadline = new Date(TODAY.getTime() + 7 * 24 * 60 * 60 * 1000);
  const made: Omit<Request, "id">[] = [];
  const add = (to: string, side: Side, scope: Request["scope"], cleared?: string) => {
    made.push({
      type: "Licence",
      from: input.partner,
      to,
      use: input.use,
      side,
      scope,
      territory: setOf(input.territory),
      start: input.start,
      end: input.end,
      deadline,
      received: now(),
      state: cleared ? "Auto-cleared" : "Needs decision",
      clearedBy: cleared,
      purpose: side === "Master" ? input.purpose : `${input.purpose} — composition side.`,
      licenceModel: input.licenceModel,
    });
  };
  // Master side: whoever controls the recordings, there.
  const masterHolders = new Set(assets.flatMap((asset) => (asset.kind === "Work" ? [] : controllers(asset.id, "Master", country).map((edge) => edge.partyId))));
  for (const holder of masterHolders) {
    const theirs = answers.filter(({ asset }) => asset.kind !== "Work" && controllers(asset.id, "Master", country).some((edge) => edge.partyId === holder));
    const grant = theirs.every(({ answer }) => answer.master.state === "Granted" && answer.master.grant) ? theirs[0]?.answer.master.grant?.id : undefined;
    add(holder, "Master", { ...input.scope, assets: theirs.length }, grant);
  }
  // Composition side: each controlling publisher, for the works on these assets.
  const publishers = new Map<string, { works: Set<string>; cleared: boolean; grant?: string }>();
  for (const { answer } of answers)
    for (const side of answer.composition) {
      if (!side.party || !side.work) continue;
      const held = publishers.get(side.party) ?? { works: new Set<string>(), cleared: true };
      held.works.add(side.work.id);
      held.cleared = held.cleared && side.state === "Granted" && Boolean(side.grant);
      held.grant = held.grant ?? side.grant?.id;
      publishers.set(side.party, held);
    }
  for (const [holder, held] of publishers)
    add(holder, "Composition", { level: "Catalogue", ref: holder, name: `Works on ${input.scope.name}`, assets: held.works.size }, held.cleared ? held.grant : undefined);

  if (!made.length) return undefined;
  const ids = made.map(addRequest);
  const created = asksOf(input.partner).find((one) => one.requests.some((each) => each.id === ids[0]))!;
  issueTrackReceipts(created, TODAY);
  wrote();
  return created.id;
}

// ---------------------------------------------------------------------------------------------
// Webhooks — S6-7

export const EVENTS = ["clearance.changed", "licence.paused", "licence.revoked"] as const;
export type WebhookEvent = (typeof EVENTS)[number];

export interface Endpoint {
  id: string;
  partner: string;
  url: string;
  events: readonly string[];
  state: "Enabled" | "Disabled";
  created: Date;
}

let ENDPOINTS: Endpoint[] = PARTNERS.flatMap((partner) =>
  partner.webhooks.map((hook, index) => ({ ...hook, id: `wh-${slug(partner.name)}-${index + 1}`, partner: partner.id, created: partner.joined })),
);

export const endpointsOf = (partner: string) => ENDPOINTS.filter((one) => one.partner === partner);
export const endpointById = (id: string) => ENDPOINTS.find((one) => one.id === id);

export function addEndpoint(partner: string, url: string, events: readonly string[]) {
  const id = `wh-${slug(partnerOf(partner).name)}-${ENDPOINTS.filter((one) => one.partner === partner).length + 1}`;
  ENDPOINTS = [...ENDPOINTS, { id, partner, url, events, state: "Enabled", created: TODAY }];
  wrote();
  return id;
}

export function setEndpointState(id: string, state: Endpoint["state"]) {
  ENDPOINTS = ENDPOINTS.map((one) => (one.id === id ? { ...one, state } : one));
  wrote();
}

export interface Delivery {
  id: string;
  endpoint: string;
  event: string;
  /** The opaque id the payload names — a grant, an asset. */
  subject: string;
  /** What it was about, in the partner's own words. */
  about: string;
  sent: Date;
  /** Seconds from the graph event to the partner's 2xx — the FRD's limit is 60. */
  seconds: number;
  response: string;
}

let TESTS: Delivery[] = [];

/**
 * What each endpoint was sent. The standing history is written here; the pause and the revoke are
 * READ off the graph as it is now — a grant to this partner that a dispute paused, or that a
 * resolution revoked, is a delivery, whichever surface wrote it.
 */
export function deliveriesOf(endpoint: Endpoint): Delivery[] {
  const out: Delivery[] = [];
  const wants = (event: string) => endpoint.events.includes(event);
  if (endpoint.partner === "p-cadence" && wants("clearance.changed")) {
    // Silverbirch granted composition-side AI training on 8 Oct: two CD-7 tracks changed.
    out.push(
      { id: `${endpoint.id}/d-1`, endpoint: endpoint.id, event: "clearance.changed", subject: opaqueOf("r-paper-moons"), about: "Paper Moons · AI training · now Granted", sent: at(2026, 10, 8, 16, 40, 9), seconds: 9, response: "200 OK" },
      { id: `${endpoint.id}/d-2`, endpoint: endpoint.id, event: "clearance.changed", subject: opaqueOf("r-glass-coast"), about: "Glass Coast · AI training · composition now Granted", sent: at(2026, 10, 8, 16, 40, 11), seconds: 11, response: "200 OK" },
      { id: `${endpoint.id}/d-3`, endpoint: endpoint.id, event: "clearance.changed", subject: opaqueOf("r-lowlight"), about: "Lowlight · AI training · now Denied", sent: at(2026, 9, 15, 10, 20, 40), seconds: 40, response: "503 — retried, 200 OK" },
    );
  }
  for (const grant of GRANTS.filter((one) => one.partners.ids.includes(endpoint.partner))) {
    const subject = `grt_${hash(grant.id, 8)}`;
    const what = formatMeta([grant.use, grant.level === "Asset" ? assetById(grant.ref).title : partyName(grant.ref)]) ?? grant.use;
    const dispute = CONFLICTS.find((one) => one.kind === "Attestation dispute" && one.interim.includes(partyName(endpoint.partner)));
    if ((grant.state === "Paused" || grant.state === "Revoked") && wants("licence.paused")) {
      const opened = dispute?.opened ?? TODAY;
      const when = new Date(opened.getFullYear(), opened.getMonth(), opened.getDate(), 8, 3, 12);
      out.push({ id: `${endpoint.id}/${grant.id}/paused`, endpoint: endpoint.id, event: "licence.paused", subject, about: formatMeta([what, "paused by an open dispute"]) ?? what, sent: when, seconds: 4, response: "200 OK" });
    }
    if (grant.state === "Revoked" && wants("licence.revoked"))
      out.push({ id: `${endpoint.id}/${grant.id}/revoked`, endpoint: endpoint.id, event: "licence.revoked", subject, about: formatMeta([what, "revoked"]) ?? what, sent: TODAY, seconds: 6, response: "200 OK" });
  }
  return [...out, ...TESTS.filter((one) => one.endpoint === endpoint.id)].sort((one, other) => other.sent.getTime() - one.sent.getTime());
}

export function sendTest(endpoint: Endpoint) {
  TESTS = [
    ...TESTS,
    { id: `${endpoint.id}/test-${TESTS.length + 1}`, endpoint: endpoint.id, event: endpoint.events[0] ?? "clearance.changed", subject: "test_00000000", about: "Test event from the portal", sent: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 10, 30 + TESTS.length), seconds: 1, response: "200 OK" },
  ];
  wrote();
}

// ---------------------------------------------------------------------------------------------
// Usage and provenance — S6-5

export interface UsageRow {
  row: number;
  isrc: string;
  title: string;
  /** What it was used for. */
  used: string;
  when: Date;
  outputs: number;
  assetId?: string;
  state: "Matched" | "Unmatched" | "Suggested";
  /** For a provenance row: the GENESIS proof event OWEN wrote for the output — its event id. */
  genesis?: string;
  note?: string;
}

export interface Upload {
  id: string;
  partner: string;
  file: string;
  kind: "Usage" | "Provenance";
  received: Date;
  state: "Received" | "Validating" | "Row errors" | "Ingesting" | "Matched" | "Rejected";
  rows: readonly UsageRow[];
}

const usageRow = (row: number, assetId: string | undefined, isrc: string, title: string, used: string, when: Date, outputs: number, extra: Partial<UsageRow> = {}): UsageRow => ({
  row,
  isrc,
  title,
  used,
  when,
  outputs,
  assetId,
  state: assetId ? "Matched" : "Unmatched",
  ...extra,
});

/** The rows a CD-7 report holds — two codes the graph does not know, one it can only suggest. */
function cd7Rows(when: Date, provenance: boolean): UsageRow[] {
  const run = provenance ? "Output batch CD-7-gen-04" : "Training run CD-7";
  const known = ["r-northbound", "r-tidewater", "r-paper-moons", "r-glass-coast", "r-switchback", "r-ember", "r-ferry"].map((id, index) =>
    usageRow(index + 1, id, assetById(id).isrc!, assetById(id).title, run, when, provenance ? 3 + index : 0, provenance ? { genesis: String(mint(`out_${hash(`${id}/${when.getTime()}`, 8)}`, "AI derivative", when, `genesis/${id}/${when.getTime()}`, "GENESIS").seq) } : {}),
  );
  return [
    ...known,
    usageRow(8, undefined, "GBKPR2400121", "Northbound (Instrumental)", run, when, provenance ? 2 : 0, { note: "No recording in the graph carries this ISRC." }),
    usageRow(9, undefined, "USX9P2511042", "Copperline", run, when, provenance ? 1 : 0, { note: "No recording in the graph carries this ISRC." }),
    usageRow(10, "r-tidewater-remix", "GBKPR2600052", "Tidewater Lowtide Remix", run, when, provenance ? 4 : 0, { state: "Suggested", note: "Title differs from the graph's — matched on ISRC, waiting on a reviewer." }),
  ];
}

let UPLOADS: Upload[] = [
  { id: "up-1042", partner: "p-cadence", file: "cadence_cd7_usage_2026-09.csv", kind: "Usage", received: at(2026, 10, 2, 7, 15), state: "Matched", rows: cd7Rows(day(2026, 9, 30), false) },
  { id: "up-1047", partner: "p-cadence", file: "cadence_cd7_provenance_owen.json", kind: "Provenance", received: at(2026, 10, 16, 18, 2), state: "Matched", rows: cd7Rows(day(2026, 10, 15), true) },
  { id: "up-1051", partner: "p-cadence", file: "cadence_cd8_usage_draft.csv", kind: "Usage", received: at(2026, 10, 19, 21, 30), state: "Rejected", rows: [] },
  {
    id: "up-0930",
    partner: "p-openwave-sync",
    file: "openwave_cue_sheets_2026-Q3.csv",
    kind: "Usage",
    received: at(2026, 10, 1, 9),
    state: "Matched",
    rows: [
      usageRow(1, "v-northbound", "GBKPV2400031", "Northbound (Official Video)", "Sync · Harbour Days, episode 2", day(2026, 8, 14), 1),
      usageRow(2, "r-northbound", "GBKPR2400118", "Northbound", "Sync · Harbour Days, episode 2", day(2026, 8, 14), 1),
      usageRow(3, undefined, "SEXYZ2600310", "Night Ferry", "Sync · Harbour Days, trailer", day(2026, 9, 2), 1, { note: "No recording in the graph carries this ISRC." }),
    ],
  },
  {
    id: "up-1033",
    partner: "p-voxa",
    file: "voxa_voice_model_usage_2026-10.csv",
    kind: "Usage",
    received: at(2026, 10, 13, 20),
    state: "Matched",
    rows: [
      usageRow(1, "r-northbound", "GBKPR2400118", "Northbound", "Voice model VX-Mira-1 · reference", day(2026, 10, 13), 12),
      usageRow(2, "r-tidewater", "GBKPR2400119", "Tidewater", "Voice model VX-Mira-1 · reference", day(2026, 10, 13), 9),
    ],
  },
];

export const uploadsOf = (partner: string) => UPLOADS.filter((one) => one.partner === partner);
export const uploadById = (id: string) => UPLOADS.find((one) => one.id === id);

/** The columns a usage or provenance report is read by, found by name; a report without an ISRC column is refused. */
export function usageColumns(read: ReadResult): { isrc: string; title?: string; used?: string; when?: string; outputs?: string; genesis?: string } | string {
  const { headers } = read;
  const isrc = read.mapped ? "Recording ISRC" : columnFor(headers, "ISRC", "Recording ISRC", "Track ISRC");
  if (!isrc || !headers.includes(isrc)) return `No column names an ISRC — the columns read are ${headers.join(", ")}. Every row is linked to an asset by its ISRC.`;
  return {
    isrc,
    title: read.mapped ? "Recording title" : columnFor(headers, "Title", "Track title", "Recording title", "Song"),
    used: columnFor(headers, "Used for", "Use", "Usage", "Purpose", "Run", "Used in"),
    when: columnFor(headers, "Used on", "Date", "When", "Used at", "Usage date"),
    outputs: columnFor(headers, "Outputs", "Output count", "Outputs reported"),
    genesis: columnFor(headers, "Genesis", "Genesis event"),
  };
}

const sameTitle = (one: string, other: string) => one.toLowerCase().replace(/[^a-z0-9]/g, "") === other.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * A report brought in, read row by row: each row linked to the graph's recording by its ISRC; a
 * row whose title differs from the graph's waits on a reviewer as Suggested; a code the graph does
 * not hold, or that is not an ISRC, is flagged Unmatched. A provenance row linked to an asset gets
 * the GENESIS event OWEN writes for its output.
 */
export function addUpload(partner: string, read: ReadResult, kind: Upload["kind"]) {
  const id = `up-${1100 + UPLOADS.length}`;
  const columns = usageColumns(read);
  const received = now();
  const rows: UsageRow[] =
    typeof columns === "string"
      ? []
      : read.rows.map((row, index) => {
          const isrc = (row[columns.isrc] ?? "").trim().toUpperCase();
          const title = (columns.title && row[columns.title]) || "";
          const problem = isrcProblem(isrc);
          const asset = problem ? undefined : ASSETS.find((one) => one.isrc === isrc);
          const when = (columns.when && dateOf(row[columns.when] ?? "")) || received;
          const outputs = Number(columns.outputs ? row[columns.outputs] : 0) || 0;
          const same = asset ? !title || sameTitle(title, asset.title) : false;
          const genesis =
            kind === "Provenance" && asset
              ? (columns.genesis && row[columns.genesis]) || String(mint(`out_${hash(`${asset.id}/${when.getTime()}/${index}`, 8)}`, "AI derivative", when, `genesis/${id}/${index}`, "GENESIS").seq)
              : undefined;
          return {
            row: read.lines[index] ?? index + 2,
            isrc,
            title: title || asset?.title || "Untitled",
            used: (columns.used && row[columns.used]) || kind,
            when,
            outputs,
            assetId: asset?.id,
            state: asset ? (same ? "Matched" : "Suggested") : "Unmatched",
            genesis,
            note: problem
              ? `Not an ISRC: ${problem}.`
              : !asset
                ? "No recording in the graph carries this ISRC."
                : same
                  ? undefined
                  : `Title differs from the graph's “${asset.title}” — matched on ISRC, waiting on a reviewer.`,
          };
        });
  UPLOADS = [{ id, partner, file: read.facts.name, kind, received, state: rows.length ? "Matched" : "Rejected", rows }, ...UPLOADS];
  wrote();
  return id;
}

// ---------------------------------------------------------------------------------------------
// The society view — S6-8, GEMA

export interface Registration {
  workId: string;
  /** The society's work number, once acknowledged. */
  number?: string;
  /** Who registered it with the society. */
  registrant: string;
  sent?: Date;
  acknowledged?: Date;
  /** The registrant's share in DE as the society acknowledged it. */
  share?: number;
  state: "Acknowledged" | "Sent" | "Rejected" | "Missing";
  file?: string;
  reason?: string;
}

let REGISTRATIONS: Registration[] = [
  { workId: "w-northbound", number: "GEMA 31884-207", registrant: "p-harbor", sent: day(2026, 2, 20), acknowledged: day(2026, 3, 2), share: 60, state: "Acknowledged", file: "GEMA_ACK_2026-03-02.cwr" },
  { workId: "w-tidewater", number: "GEMA 30177-451", registrant: "p-harbor", sent: day(2025, 11, 3), acknowledged: day(2025, 11, 14), share: 100, state: "Acknowledged", file: "GEMA_ACK_2025-11-14.cwr" },
  { workId: "w-paper-moons", registrant: "p-silverbirch", sent: day(2026, 10, 6), state: "Sent", file: "SPH_CWR31_2026-10-06.cwr" },
  { workId: "w-ferry", registrant: "p-silverbirch", sent: day(2026, 10, 6), state: "Sent", file: "SPH_CWR31_2026-10-06.cwr" },
  { workId: "w-lowlight", registrant: "p-silverbirch", sent: day(2026, 9, 12), state: "Rejected", file: "SPH_CWR31_2026-09-12.cwr", reason: "The writer's IPI name number is missing on the SWR record." },
  { workId: "w-switchback", registrant: "p-silverbirch", state: "Missing", reason: "Earns in DE and was never registered with GEMA." },
  { workId: "w-glass-coast", number: "GEMA 31002-118", registrant: "p-silverbirch", sent: day(2025, 1, 10), acknowledged: day(2025, 1, 24), share: 100, state: "Acknowledged", file: "GEMA_ACK_2025-01-24.cwr" },
];

export const registrations = () => REGISTRATIONS;
export const registrationOf = (workId: string) => REGISTRATIONS.find((one) => one.workId === workId);

export interface AckFile {
  id: string;
  file: string;
  sent: Date;
  works: readonly string[];
  mismatches: readonly string[];
  /** The conflicts the mismatches opened — or found already open. */
  conflicts: readonly string[];
  /** Works the society rejected, and works it acknowledged that the graph has no registration for. */
  rejected?: readonly string[];
  unknown?: readonly string[];
}

let ACK_FILES: AckFile[] = [
  { id: "ack-0302", file: "GEMA_ACK_2026-03-02.cwr", sent: at(2026, 3, 2, 4), works: ["w-northbound"], mismatches: ["w-northbound"], conflicts: ["cf-1"] },
  { id: "ack-1114", file: "GEMA_ACK_2025-11-14.cwr", sent: at(2025, 11, 14, 4), works: ["w-tidewater"], mismatches: [], conflicts: [] },
  { id: "ack-0124", file: "GEMA_ACK_2025-01-24.cwr", sent: at(2025, 1, 24, 4), works: ["w-glass-coast"], mismatches: [], conflicts: [] },
];

export const ackFiles = () => ACK_FILES;

/** The CWR transaction statuses a society answers with, as the registration reads them. */
const ACCEPTED = ["AS", "AC", "RA", "SR", "CR", "CO"];

/** What an acknowledgement file answers, work by work: the work it is for, if the graph has it, and what it says. */
export interface AckAnswer {
  ack: CwrAck;
  workId?: string;
  accepted: boolean;
  /** The registrant's share of the publisher side, as the society acknowledged it. */
  share?: number;
}

/**
 * The acknowledgements a CWR file holds, each placed on the work the graph has a registration for
 * — by ISWC, then by title — and the registrant's share read off it: its PR share over every
 * publisher's on the work, so a 35.00 of 50.00 reads as 70% of the publisher side.
 */
export function readAcknowledgements(read: ReadResult): AckAnswer[] {
  const bare = (value: string) => value.replace(/[^0-9A-Z]/gi, "").toUpperCase();
  return (read.cwr?.acks ?? []).map((ack) => {
    const iswc = ack.work?.iswc ? bare(iswcWritten(ack.work.iswc)) : "";
    const registration = REGISTRATIONS.find((one) => {
      const work = assetById(one.workId);
      return (iswc && work.iswc && bare(work.iswc) === iswc) || work.title.toLowerCase() === (ack.work?.title || ack.title).toLowerCase();
    });
    const accepted = ACCEPTED.includes(ack.status);
    let share: number | undefined;
    if (registration && accepted && ack.work?.publishers.length) {
      const party = PARTIES.find((one) => one.id === registration.registrant);
      const total = ack.work.publishers.reduce((sum, one) => sum + (Number.isNaN(one.share) ? 0 : one.share), 0);
      const own = ack.work.publishers
        .filter((one) => (party?.ipi && one.ipi === party.ipi) || one.name.toLowerCase() === partyName(registration.registrant).toLowerCase())
        .reduce((sum, one) => sum + one.share, 0);
      share = total > 0 ? Math.round((own / total) * 10000) / 100 : undefined;
    }
    return { ack, workId: registration?.workId, accepted, share };
  });
}

/**
 * An acknowledgement file sent (S6-8), read from the CWR file itself: each work's registration
 * updates, the society's share is written to the graph as the claim it is (G-1), and where it
 * disagrees with what the graph holds in DE a conflict opens. A rejection is kept with the
 * society's own message; a work the graph has no registration for is listed, never invented.
 */
export function sendAcknowledgements(file: string, answers: readonly AckAnswer[]) {
  const mismatches: string[] = [];
  const conflicts: string[] = [];
  const rejected: string[] = [];
  const unknown: string[] = [];
  for (const answer of answers) {
    if (!answer.workId) {
      unknown.push(answer.ack.work?.title || answer.ack.title);
      continue;
    }
    const registration = registrationOf(answer.workId)!;
    if (!answer.accepted) {
      rejected.push(answer.workId);
      REGISTRATIONS = REGISTRATIONS.map((one) =>
        one.workId === answer.workId ? { ...one, state: "Rejected" as const, file, reason: answer.ack.messages.join(" ") || `Rejected by the society (${answer.ack.status}).` } : one,
      );
      continue;
    }
    const number = answer.ack.societyNumber || registration.number || "";
    if (answer.share !== undefined) {
      const ack = { workId: answer.workId, number, share: answer.share };
      const held = ASSERTIONS.filter(
        (one) => one.assetId === ack.workId && one.partyId === registration.registrant && one.interests.includes("Owns") && one.state === "Resolved",
      ).reduce((most, one) => Math.max(most, one.share), 0);
      const claim = addAssertion({
        assetId: ack.workId,
        partyId: registration.registrant,
        interests: ["Owns"],
        side: "Composition",
        rights: "All composition",
        shareType: "Publisher",
        share: ack.share,
        territory: { include: ["DE"] },
        from: TODAY,
        source: "Society acknowledgement",
        sourceRef: formatMeta([file, ack.number].filter(Boolean)) ?? file,
        state: held === ack.share ? "Resolved" : "Contested",
      });
      if (held !== ack.share) {
        mismatches.push(ack.workId);
        const open = CONFLICTS.find((one) => one.assetId === ack.workId && one.state !== "Resolved" && one.territories.includes("DE"));
        if (open) conflicts.push(open.id);
        else {
          const others = ASSERTIONS.filter((one) => one.assetId === ack.workId && one.shareType === "Publisher" && one.partyId !== registration.registrant && one.state === "Resolved");
          const total = ack.share + others.reduce((sum, one) => sum + one.share, 0);
          conflicts.push(
            addConflict({
              kind: total > 100 ? "Overclaim" : "Gap",
              assetId: ack.workId,
              side: "Composition",
              severity: assetById(ack.workId).revenue > 10000 ? "High" : "Medium",
              revenueAtRisk: Math.round((assetById(ack.workId).revenue * Math.abs(total - 100)) / 100),
              total,
              territories: ["DE"],
              claims: [claim, ...others.map((one) => one.id)],
              parties: [registration.registrant, ...others.map((one) => one.partyId)],
              opened: TODAY,
              state: "Open",
              step: 0,
              interim: "Paying in DE on the claims the graph held until resolved.",
              raisedBy: `GEMA acknowledgement · ${file}`,
            }),
          );
        }
      }
    }
    REGISTRATIONS = REGISTRATIONS.map((one) =>
      one.workId === answer.workId
        ? { ...one, number: number || one.number, share: answer.share ?? one.share, acknowledged: answer.ack.processed ?? TODAY, state: "Acknowledged" as const, file, reason: undefined }
        : one,
    );
  }
  const works = answers.flatMap((one) => (one.workId && one.accepted ? [one.workId] : []));
  ACK_FILES = [{ id: `ack-${ACK_FILES.length + 1}`, file, sent: now(), works, mismatches, conflicts, rejected, unknown }, ...ACK_FILES];
  wrote();
}

/** Whether a registration sent to the society still waits on its answer. */
export const ackPending = () => REGISTRATIONS.some((one) => one.state === "Sent");

// ---------------------------------------------------------------------------------------------
// Seeds — written once, against the graph as it opens.

// CD-7 was answered again this morning, when the shared log sealed its receipts (F2 step 5).
for (const partner of ["p-cadence", "p-openwave-sync", "p-voxa", "p-tessellate"])
  for (const one of asksOf(partner)) issueTrackReceipts(one, one.id === "rq-2202" ? at(2026, 10, 20, 9, 58) : one.received);

LOOKUPS = [
  ask("p-cadence", "r-paper-moons", "AI training", "World", at(2026, 10, 20, 9, 58), "ck_live_91d0", PROOF.find((one) => one.receipt === "rcpt_7Q2M-9F4K-CD7A")),
  ask("p-cadence", "r-northbound", "AI training", "World", at(2026, 10, 20, 9, 58), "ck_live_91d0", PROOF.find((one) => one.receipt === "rcpt_7Q2M-9F4K-CD7B")),
  ask("p-cadence", "r-lowlight", "AI training", "GB", at(2026, 10, 19, 22, 3), "ck_live_91d0"),
  ask("p-cadence", "r-glass-coast", "AI derivative", "GB", at(2026, 10, 14, 11, 20), "ck_sbx_7f3a"),
  ask("p-openwave-sync", "v-northbound", "Sync", "US", at(2026, 10, 18, 9, 5), "ck_live_0b77"),
  ask("p-openwave-sync", "v-switchback-live", "Sync", "US", at(2026, 10, 19, 16, 2), "ck_live_0b77"),
  ask("p-voxa", "r-northbound", "Voice/NIL", "World", at(2026, 10, 14, 9, 12), "ck_live_a4e9"),
];

/** How many look-ups a partner ran this month, through the API as well as here — the overview's figure. */
export const API_LOOKUPS_THIS_MONTH: Record<string, number> = { "p-cadence": 18402, "p-openwave-sync": 2140, "p-voxa": 61, "p-gema": 0, "p-tessellate": 0 };
