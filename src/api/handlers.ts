import {
  AGREEMENTS,
  ASSERTIONS,
  ASSETS,
  ATTESTATIONS,
  CONFLICTS,
  CREDITS,
  GRANTS,
  PARTIES,
  PARTNERS,
  PROOF,
  SIGNING_KEYS,
  TODAY,
  addAssertion,
  addAttestation,
  addConflict,
  addGrant,
  agreementById,
  linkRecording,
  now,
  partyName,
} from "../graph/fixtures";
import {
  PRECEDENCE,
  type Assertion,
  type Asset,
  type Attestation,
  type ClaimType,
  type Grant,
  type Interest,
  type ProofEvent,
  type RightType,
  type ScopeLevel,
  type ShareType,
  type Side,
  type SourceKind,
  type Use,
} from "../graph/model";
import {
  GRAPH_VERSION,
  RULE_VERSION,
  claimsBehind,
  clearanceOf,
  controllers,
  covers,
  standing,
  stateForNewClaim,
  territoryLabel,
  tierOf,
  type Clearance,
  type NewClaim,
  type SideAnswer,
} from "../graph/resolve";
import {
  compact,
  countriesToCheck,
  countryOf,
  dayOf,
  identifierProblem,
  isProblem,
  rightTypeOf,
  standardOf,
  territorySet,
  useCode,
  useOf,
  dayOnWire,
  fieldsOf,
  type Problem,
} from "./validate";
import { payload } from "./webhooks";

/**
 * S9 — the Graph APIs, as handlers: pure functions over the shared graph, the SAME ones whichever
 * transport carries the call (the explorer's in-browser `api.request`, or real HTTP on the dev
 * server). Every route is a row of `ROUTES`, and the OpenAPI document is generated from that table.
 *
 * Three groups, as the data-model doc names them:
 * - **Write** — typed commands (AssertRights, GrantClearance, RecordAttestation, RecordProvenance,
 *   LinkRecordingWork), an `Idempotency-Key` header, batched arrays, and an asynchronous
 *   confirmation: 202 with an event id now, a `command.confirmed` webhook once applied.
 * - **Resolve** — splits, effective clearance (with a signed receipt), chain of title, lineage,
 *   and look-up by ISRC / ISWC / UPC.
 * - **Verify** — a proof event, its Merkle inclusion and TSA token, and the published keys.
 *
 * The graph answers; the API only carries. Nothing here decides ownership or clearance — it calls
 * `resolve.ts`, and writes through the setters in `fixtures.ts`.
 */

// ---------------------------------------------------------------------------------------------
// The wire

export interface ApiRequest {
  method: string;
  /** The path and query, with or without the `/api` the dev server mounts it under. */
  url: string;
  headers?: Record<string, string | undefined>;
  /** The body as sent — a JSON string, or a value already parsed. */
  body?: unknown;
}

export interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}): ApiResponse => ({
  status,
  headers: { "Content-Type": "application/json", ...headers },
  body,
});

export const DOCS = "https://docs.sureel.example";

/** An error, as RFC 9457 problem details. */
export function problem(status: number, code: string, title: string, detail: string, extra: Record<string, unknown> = {}): ApiResponse {
  return {
    status,
    headers: { "Content-Type": "application/problem+json", ...(status === 401 ? { "WWW-Authenticate": 'Bearer realm="rights-graph"' } : {}) },
    body: { type: `${DOCS}/problems/${code}`, title, status, detail, ...extra },
  };
}

const invalid = (errors: readonly Problem[]) =>
  problem(422, "invalid-request", "The request names values the graph cannot take", errors.map((one) => `${one.field}: ${one.problem}`).join("; "), { errors });

// ---------------------------------------------------------------------------------------------
// Keys and scopes

export interface ApiKey {
  id: string;
  /** The party the key acts as. */
  holder: string;
  env: "Sandbox" | "Production";
  scopes: readonly string[];
  /** A partner is told only of itself; a rights holder reads every partner its grants name. */
  audience: "partner" | "holder";
}

/**
 * Keys for the parties that WRITE claims — a label through Revelator Pro, a publisher, a
 * contributor. The model gives keys to partners only (`PARTNERS[].keys`), so these live here
 * until it holds them (docs/gaps/s9-api.md).
 */
const HOLDER_KEYS: readonly ApiKey[] = [
  { id: "hk_live_kestrel", holder: "p-kestrel", env: "Production", audience: "holder", scopes: ["claims:write", "clearances:write", "attestations:write", "links:write", "claims:read", "splits:read", "clearance:read"] },
  { id: "hk_live_harbor", holder: "p-harbor", env: "Production", audience: "holder", scopes: ["claims:write", "clearances:write", "claims:read", "splits:read", "clearance:read"] },
  { id: "hk_live_meridian", holder: "p-meridian", env: "Production", audience: "holder", scopes: ["claims:write", "links:write", "claims:read"] },
];

export const KEYS: readonly ApiKey[] = [
  ...PARTNERS.flatMap((partner) => partner.keys.map((one): ApiKey => ({ id: one.id, holder: partner.id, env: one.env, scopes: one.scopes, audience: "partner" }))),
  ...HOLDER_KEYS,
];

export const keyById = (id: string | undefined) => KEYS.find((one) => one.id === id);

/** Every scope a route can ask for, and what it lets a key do. */
export const SCOPES: Record<string, string> = {
  "claims:write": "Assert rights (ownership, control, administration, collection)",
  "registrations:write": "A society's registrations and acknowledgements, written as assertions",
  "clearances:write": "Grant or deny a use",
  "attestations:write": "Record a signed attestation",
  "provenance:write": "Record what an AI output was made from",
  "links:write": "Link a recording to the work it embodies",
  "claims:read": "Chain of title, lineage and look-ups",
  "splits:read": "Resolved splits",
  "clearance:read": "Effective clearance, with a signed receipt",
  "usage:write": "Report usage (S6 usage uploads)",
  "requests:write": "Ask a rights holder for a licence (S6)",
};

// ---------------------------------------------------------------------------------------------
// The route table — what the OpenAPI document is generated from

export interface Param {
  name: string;
  in: "path" | "query" | "header";
  required?: boolean;
  description: string;
  example?: string;
  enum?: readonly string[];
}

export interface Route {
  id: string;
  method: "GET" | "POST";
  path: string;
  group: "Write" | "Resolve" | "Verify";
  summary: string;
  description: string;
  /** Any one of these lets a key call it; empty — any valid key; `null` — no key at all. */
  scopes: readonly string[] | null;
  params: readonly Param[];
  /** A write's command, and an example body. */
  command?: { name: string; example: unknown; fields: Record<string, string> };
  responses: Record<number, string>;
  handle: (call: Call) => ApiResponse;
}

interface Call {
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  key?: ApiKey;
}

const ID: Param = { name: "id", in: "path", required: true, description: "The asset's graph id, or its ISRC, ISWC or UPC.", example: "r-northbound" };
const IDEMPOTENCY: Param = {
  name: "Idempotency-Key",
  in: "header",
  required: true,
  description: "Any string unique to this write. The same key with the same body answers the first response again; with a different body, 409.",
  example: "7c1e-2026-10-20-0001",
};

/** At most this many commands in one batch. */
export const BATCH_LIMIT = 500;

// ---------------------------------------------------------------------------------------------
// Opaque ids, hashes and receipts — what the Proof Log knows instead of names

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

/** The opaque id the Proof Log knows an asset by — the same as the Partner portal writes. */
const OPAQUE: Record<string, string> = { "r-paper-moons": "ast_7e1c9b2a", "r-northbound": "ast_4a08f1d3" };
export const opaqueOf = (assetId: string) => OPAQUE[assetId] ?? `ast_${hash(assetId, 8)}`;

const BASE32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const receiptId = (seed: string) => {
  const digits = hash(seed, 24);
  const word = (from: number) =>
    Array.from({ length: 4 }, (_, index) => BASE32[parseInt(digits.slice(from + index * 2, from + index * 2 + 2), 16) % 32]).join("");
  return `rcpt_${word(0)}-${word(8)}-${word(16)}`;
};

/**
 * Proof events the API minted — a receipt per clearance answer, a GENESIS per provenance record.
 * Numbered from 890001 so they never take a number the Partner portal's own receipts use.
 */
export let ISSUED: ProofEvent[] = [];
let nextSeq = 890001;

function mint(type: ProofEvent["type"], subject: string, when: Date, seed: string, extra: Partial<ProofEvent> = {}): ProofEvent {
  const seq = nextSeq++;
  const event: ProofEvent = {
    seq,
    type,
    subject,
    at: when,
    payloadHash: hash(`payload/${seed}`),
    prevHash: hash(`event/${seq - 1}`),
    eventHash: hash(`event/${seq}`),
    keyId: SIGNING_KEYS[0]!.id,
    batch: `mb-${Math.floor(seq / 40)}`,
    ...(type === "CLEARANCE_RECEIPT" ? { receipt: receiptId(seed) } : {}),
    ...extra,
  };
  ISSUED = [event, ...ISSUED];
  return event;
}

const eventOf = (id: string) => {
  const asked = id.trim().toLowerCase();
  return [...ISSUED, ...PROOF].find((one) => String(one.seq) === asked || one.receipt?.toLowerCase() === asked);
};

// ---------------------------------------------------------------------------------------------
// Reading what a call names

/** An asset by its graph id, or by its ISRC, ISWC or UPC. */
export function findAsset(reference: string): Asset | undefined {
  const byId = ASSETS.find((one) => one.id === reference);
  if (byId) return byId;
  const plain = compact(reference);
  return ASSETS.find((one) => [one.isrc, one.iswc, one.upc].some((code) => code && compact(code) === plain));
}

const assetOr404 = (reference: string): Asset | ApiResponse =>
  findAsset(reference) ?? problem(404, "not-found", "No such asset", `The graph holds no asset ${reference}. Look one up with GET /v1/assets?isrc=, ?iswc= or ?upc=.`);

const isResponse = (value: unknown): value is ApiResponse => typeof value === "object" && value !== null && "status" in value && "headers" in value;

const sideOf = (asset: Asset): Side => (asset.kind === "Work" ? "Composition" : "Master");

const assetBrief = (asset: Asset) => ({
  id: asset.id,
  kind: asset.kind,
  title: asset.title,
  artist: asset.artist ?? null,
  isrc: asset.isrc ?? null,
  iswc: asset.iswc ?? null,
  upc: asset.upc ?? null,
});

const ANSWER = { Granted: "granted", Denied: "denied", "Needs review": "needs_review" } as const;

/** A date query parameter, or the default. */
function dateParam(call: Call, name: string, fallback: Date | undefined, errors: Problem[]): Date | undefined {
  const value = call.query[name];
  if (!value) return fallback;
  const read = dayOf(value, name);
  if (isProblem(read)) {
    errors.push(read);
    return fallback;
  }
  return read;
}

const rightsCover = (rights: Assertion["rights"], right: RightType | undefined) =>
  !right || typeof rights === "string" || rights.includes(right);

const rightsWritten = (rights: Assertion["rights"]) => (typeof rights === "string" ? rights : [...rights]);

const claimOut = (one: Assertion) => ({
  id: one.id,
  party: { id: one.partyId, name: partyName(one.partyId) },
  interests: one.interests,
  side: one.side,
  rights: rightsWritten(one.rights),
  share_type: one.shareType,
  share: one.share,
  share_of: one.shareOf ?? null,
  territory: territoryLabel(one.territory),
  valid_from: dayOnWire(one.from),
  valid_to: dayOnWire(one.to),
  basis: one.basis ?? null,
  source: one.source,
  source_ref: one.sourceRef,
  precedence: PRECEDENCE[one.source],
  state: one.state,
  known_at: dayOnWire(one.known),
});

// ---------------------------------------------------------------------------------------------
// Resolve — splits

/**
 * Who is owed what, per share type, in one territory on one date, as the graph knew it then.
 *
 * Two readings side by side: the TOTAL across every standing claim (where an overclaim shows,
 * 110%), and what is PAID while it is open — the uncontested claims only, as the doc's worked
 * example says the resolver keeps paying on rows 1–3. For a right type, each paid share says who
 * COLLECTS it: a Collects edge held "of" that owner's share (Rhein Edition collects Harbor's 50%
 * in DE), the owner's own Collects edge, or the owner through its society.
 */
function splits(call: Call): ApiResponse {
  const asset = assetOr404(call.params.id!);
  if (isResponse(asset)) return asset;
  const errors: Problem[] = [];
  const rawTerritory = call.query.territory;
  if (!rawTerritory) errors.push({ field: "territory", problem: "Splits are read in one territory: name an ISO code or World" });
  const country = rawTerritory ? countryOf(rawTerritory) : "World";
  if (isProblem(country)) errors.push(country);
  const right = call.query.right_type ? rightTypeOf(call.query.right_type) : undefined;
  if (call.query.right_type && !right) errors.push({ field: "right_type", problem: `${call.query.right_type} is not a RAD right type` });
  const asOf = dateParam(call, "as_of", TODAY, errors)!;
  const knownAt = dateParam(call, "known_at", undefined, errors);
  if (errors.length || isProblem(country)) return invalid(errors);

  const owning = claimsBehind(asset.id, country, asOf, knownAt).filter((one) => rightsCover(one.rights, right));
  const collecting = ASSERTIONS.filter(
    (one) =>
      one.assetId === asset.id &&
      one.interests.includes("Collects") &&
      standing(one) &&
      (!knownAt || one.known <= knownAt) &&
      covers(one.territory, country) &&
      one.from <= asOf &&
      (!one.to || asOf <= one.to) &&
      rightsCover(one.rights, right),
  );
  const types = [...new Set(owning.map((one) => one.shareType))];
  const shares = types.map((shareType) => {
    const all = owning.filter((one) => one.shareType === shareType);
    // One party's claims never add to each other: its largest is what it claims.
    const largest = (among: readonly Assertion[]) => {
      const byParty = new Map<string, Assertion>();
      for (const one of among) if ((byParty.get(one.partyId)?.share ?? -1) < one.share) byParty.set(one.partyId, one);
      return [...byParty.values()];
    };
    const claimed = largest(all);
    const paid = largest(all.filter((one) => one.state === "Resolved"));
    const total = claimed.reduce((sum, one) => sum + one.share, 0);
    const conflicts = CONFLICTS.filter((one) => one.state !== "Resolved" && one.assetId === asset.id && one.claims.some((id) => all.some((each) => each.id === id)));
    return {
      share_type: shareType,
      total,
      state: total > 100 ? "overclaim" : total < 100 ? "gap" : "whole",
      conflicts: conflicts.map((one) => ({ id: one.id, kind: one.kind, state: one.state, interim: one.interim })),
      paid: paid.map((owner) => {
        const held = collecting.find((one) => one.shareOf?.startsWith(partyName(owner.partyId)) && one.partyId !== owner.partyId);
        const own = collecting.find((one) => one.partyId === owner.partyId && one.shareType === shareType);
        const party = PARTIES.find((one) => one.id === owner.partyId);
        const collectedBy = held
          ? { party: { id: held.partyId, name: partyName(held.partyId) }, via: held.sourceRef, basis: held.basis ?? null, claim: held.id }
          : own
            ? { party: { id: own.partyId, name: partyName(own.partyId) }, via: own.sourceRef, basis: own.basis ?? null, claim: own.id }
            : { party: { id: owner.partyId, name: partyName(owner.partyId) }, via: party?.society ? `${party.society} affiliation and its reciprocal agreements` : "Its own claim", basis: null, claim: null };
        return {
          owner: { id: owner.partyId, name: partyName(owner.partyId) },
          share: owner.share,
          claim: owner.id,
          source: owner.source,
          source_ref: owner.sourceRef,
          collected_by: right ? collectedBy : null,
        };
      }),
      claims: all.map(claimOut),
    };
  });
  return json(200, {
    asset: assetBrief(asset),
    side: sideOf(asset),
    right_type: right ?? null,
    territory: country,
    as_of: dayOnWire(asOf),
    known_at: knownAt ? dayOnWire(knownAt) : null,
    shares,
    note: right ? undefined : "Who collects depends on the right type: ask with right_type to read collected_by.",
    resolver: { rule: RULE_VERSION, graph: GRAPH_VERSION },
  });
}

// ---------------------------------------------------------------------------------------------
// Resolve — effective clearance

/** Why one side answered as it did, as a code a machine branches on. */
function codeOf(side: SideAnswer, composition: boolean): string {
  if (side.state === "Granted") return "cleared";
  if (side.grant?.state === "Paused") return "paused_by_dispute";
  if (side.grant?.effect === "Deny") return side.level === "Artist" ? "artist_opt_out" : "denied";
  if (side.grant) return "grantor_without_authority";
  if (side.state === "Denied") return /depends on it/.test(side.reason) ? "training_not_cleared" : /Voice\/NIL is a performer/.test(side.reason) ? "not_applicable" : "ai_default_deny";
  if (composition && !side.work) return "missing_work_link";
  if (!side.party && composition) return "no_controller";
  if (!composition && /No one controls/.test(side.reason)) return "no_controller";
  return "not_granted";
}

function reasonCode(answer: Clearance): string {
  if (answer.state === "Granted") return "cleared";
  if (answer.state === "Needs review" && answer.master.state === "Granted" && answer.composition.some((one) => one.state !== "Granted")) {
    const missing = answer.composition.find((one) => one.state !== "Granted")!;
    return codeOf(missing, true) === "missing_work_link" ? "missing_work_link" : "composition_not_cleared";
  }
  const deciding = [answer.master, ...answer.composition].find((one) => one.state === answer.state) ?? answer.master;
  return codeOf(deciding, deciding !== answer.master);
}

const sideOut = (side: SideAnswer, composition: boolean) => ({
  answer: ANSWER[side.state],
  reason_code: codeOf(side, composition),
  reason: side.reason,
  decided_at: side.level,
  grant: side.grant ? { id: side.grant.id, level: side.grant.level, state: side.grant.state, flagged: Boolean(side.grant.unauthorized), decided: { actor: side.grant.decided.actor, on_behalf_of: side.grant.decided.onBehalfOf ?? null, authority: side.grant.decided.authority ?? null } } : null,
  ...(composition ? { work: side.work ? { id: side.work.id, title: side.work.title, iswc: side.work.iswc ?? null } : null, publisher: side.party ? { id: side.party, name: partyName(side.party) } : null } : {}),
});

/**
 * What a partner is told at the delivery timestamp — granted, denied or needs_review, the master
 * and every controlling publisher apart (G-3), and a signed receipt for the answer, whatever it
 * is (S6-6). A partner key is told of itself only: the reasons never name another partner on an
 * allowlist (`audience: "partner"`), and it may not ask on another partner's behalf.
 */
function effectiveClearance(call: Call): ApiResponse {
  const asset = assetOr404(call.params.id!);
  if (isResponse(asset)) return asset;
  const errors: Problem[] = [];
  const use = call.query.use ? useOf(call.query.use) : undefined;
  if (!call.query.use) errors.push({ field: "use", problem: "Name the use: stream, download, ugc, sync, ai_training, ai_derivative, voice_nil or ai_streaming" });
  else if (!use) errors.push({ field: "use", problem: `${call.query.use} is not a use the graph grants` });
  const country = countryOf(call.query.territory ?? "World");
  if (isProblem(country)) errors.push(country);
  const at = dateParam(call, "at", now(), errors)!;
  const key = call.key!;
  const partner = call.query.partner ?? (key.audience === "partner" ? key.holder : undefined);
  if (partner && !PARTNERS.some((one) => one.id === partner)) errors.push({ field: "partner", problem: `${partner} is not a partner` });
  if (errors.length || isProblem(country) || !use) return invalid(errors);
  if (key.audience === "partner" && partner !== key.holder)
    return problem(403, "forbidden", "Another partner's clearance", `${key.id} is ${partyName(key.holder)}'s key: it reads clearance for ${key.holder} only.`);

  const answer = clearanceOf(asset.id, use, { partner, country, at, audience: key.audience });
  const event = mint("CLEARANCE_RECEIPT", opaqueOf(asset.id), at, `${key.id}/${asset.id}/${use}/${country}/${at.getTime()}/${nextSeq}`, { scope: "Asset", use });
  return json(200, {
    asset: assetBrief(asset),
    use,
    use_code: useCode(use),
    partner: partner ? { id: partner, name: partyName(partner) } : null,
    territory: country,
    at: at,
    answer: ANSWER[answer.state],
    reason_code: reasonCode(answer),
    reason: answer.reason,
    decided_at: answer.decidedAt,
    master: asset.kind === "Work" ? null : sideOut(answer.master, false),
    composition: answer.composition.map((one) => sideOut(one, true)),
    tier: tierOf(asset.id, use),
    receipt: {
      id: event.receipt,
      proof_event: event.seq,
      signed_with: event.keyId,
      verify: `/api/v1/proof/events/${event.receipt}`,
    },
    resolver: { rule: RULE_VERSION, graph: GRAPH_VERSION },
  });
}

// ---------------------------------------------------------------------------------------------
// Resolve — chain of title and lineage

const agreementOut = (id: string | undefined) => {
  const agreement = id ? agreementById(id) : undefined;
  return agreement
    ? {
        code: agreement.code,
        title: agreement.title,
        kind: agreement.kind,
        parties: agreement.parties.map((one) => ({ id: one, name: partyName(one) })),
        valid_from: dayOnWire(agreement.from),
        valid_to: dayOnWire(agreement.to),
        territory: territoryLabel(agreement.territory),
        clauses: agreement.clauses ?? [],
      }
    : null;
};

/** The claims a claim replaced, newest first — the correction chain, which never deletes a row. */
function historyOf(claim: Assertion): ReturnType<typeof claimOut>[] {
  const older = claim.supersedes ? ASSERTIONS.find((one) => one.id === claim.supersedes) : undefined;
  return older ? [claimOut(older), ...historyOf(older)] : [];
}

function edgesOn(asset: Asset, country: string | undefined, at: Date, right: RightType | undefined) {
  return ASSERTIONS.filter(
    (one) =>
      one.assetId === asset.id &&
      standing(one) &&
      (!country || covers(one.territory, country)) &&
      one.from <= at &&
      (!one.to || at <= one.to) &&
      rightsCover(one.rights, right),
  )
    .sort((a, b) => PRECEDENCE[a.source] - PRECEDENCE[b.source])
    .map((one) => ({
      ...claimOut(one),
      // Invariant: every OWNS / CONTROLS edge traces to an agreement or a declared source.
      traces_to: one.agreementId ? "agreement" : "declared source",
      agreement: agreementOut(one.agreementId),
      history: historyOf(one),
    }));
}

/**
 * Who holds what on an asset, and what each holding rests on: every standing edge live on the
 * date, ranked by ownership precedence, each traced to its agreement or declared source, with the
 * claims it superseded. A recording or video carries the chain of every work it embodies.
 */
function chainOfTitle(call: Call): ApiResponse {
  const asset = assetOr404(call.params.id!);
  if (isResponse(asset)) return asset;
  const errors: Problem[] = [];
  const country = call.query.territory ? countryOf(call.query.territory) : undefined;
  if (isProblem(country)) errors.push(country);
  const right = call.query.right_type ? rightTypeOf(call.query.right_type) : undefined;
  if (call.query.right_type && !right) errors.push({ field: "right_type", problem: `${call.query.right_type} is not a RAD right type` });
  const at = dateParam(call, "date", TODAY, errors)!;
  if (errors.length || isProblem(country)) return invalid(errors);
  const works = asset.kind === "Recording" ? (asset.embodies ?? []).map((one) => one.workId) : asset.kind === "Video" ? (asset.contains ?? []).flatMap((one) => ASSETS.find((each) => each.id === one.recordingId)?.embodies?.map((link) => link.workId) ?? []) : [];
  return json(200, {
    asset: assetBrief(asset),
    side: sideOf(asset),
    territory: country ?? null,
    right_type: right ?? null,
    date: dayOnWire(at),
    edges: edgesOn(asset, country, at, right),
    embodied_works: [...new Set(works)].map((id) => {
      const work = ASSETS.find((one) => one.id === id)!;
      return { work: assetBrief(work), edges: edgesOn(work, country, at, right) };
    }),
    resolver: { rule: RULE_VERSION, graph: GRAPH_VERSION },
  });
}

interface Link {
  from: string;
  to: string;
  relation: "embodies" | "contains" | "uses" | "packages";
  detail: Record<string, string> | null;
}

/** Every direct link in the graph — read at query time, never fanned out. */
function links(): Link[] {
  return ASSETS.flatMap((asset): Link[] => [
    ...(asset.embodies ?? []).map((one) => ({ from: asset.id, to: one.workId, relation: "embodies" as const, detail: { portion: one.portion, source: one.source } })),
    ...(asset.contains ?? []).map((one) => ({ from: asset.id, to: one.recordingId, relation: "contains" as const, detail: { from: one.from, to: one.to, usage: one.usage } })),
    ...(asset.usesWorks ?? []).map((one) => ({ from: asset.id, to: one, relation: "uses" as const, detail: null })),
    ...(asset.items ?? []).map((one) => ({ from: asset.id, to: one, relation: "packages" as const, detail: null })),
  ]);
}

/**
 * How an asset connects: the recordings that embody a work, the videos that contain a recording,
 * the releases that package it — walked both ways, up to `depth` hops (3 by default).
 */
function lineage(call: Call): ApiResponse {
  const asset = assetOr404(call.params.id!);
  if (isResponse(asset)) return asset;
  const depth = Math.min(Math.max(Number(call.query.depth ?? 3) || 3, 1), 6);
  const all = links();
  const seen = new Set([asset.id]);
  const edges = new Set<Link>();
  let frontier = [asset.id];
  for (let hop = 0; hop < depth && frontier.length; hop += 1) {
    const next: string[] = [];
    for (const link of all) {
      const from = frontier.includes(link.from);
      const to = frontier.includes(link.to);
      if (!from && !to) continue;
      edges.add(link);
      for (const end of [link.from, link.to])
        if (!seen.has(end)) {
          seen.add(end);
          next.push(end);
        }
    }
    frontier = next;
  }
  const missing = asset.kind === "Recording" && !(asset.embodies ?? []).length;
  return json(200, {
    asset: assetBrief(asset),
    depth,
    nodes: [...seen].map((id) => assetBrief(ASSETS.find((one) => one.id === id)!)),
    edges: [...edges],
    flags: missing ? [{ code: "missing_work_link", detail: "No Recording↔Work link: publishing income on it is unmatched, and no use touching the composition clears." }] : [],
  });
}

/** An asset found by its code — the way in for a caller that knows the ISRC, not the graph id. */
function lookup(call: Call): ApiResponse {
  const asked = (["isrc", "iswc", "upc"] as const).filter((one) => call.query[one]);
  if (!asked.length) return problem(400, "missing-parameter", "Name a code", "Look an asset up with ?isrc=, ?iswc= or ?upc=.");
  const errors = asked.flatMap((one) => {
    const found = identifierProblem(one, call.query[one]!);
    return found ? [{ field: one, problem: found }] : [];
  });
  if (errors.length) return invalid(errors);
  const data = ASSETS.filter((asset) => asked.every((one) => asset[one] && compact(asset[one]!) === compact(call.query[one]!))).map((asset) => ({
    ...assetBrief(asset),
    links: {
      splits: `/api/v1/assets/${asset.id}/splits?territory=World`,
      clearance: `/api/v1/assets/${asset.id}/clearance/effective?use=ai_training`,
      chain_of_title: `/api/v1/assets/${asset.id}/chain-of-title`,
      lineage: `/api/v1/assets/${asset.id}/lineage`,
    },
  }));
  return json(200, { data, count: data.length });
}

// ---------------------------------------------------------------------------------------------
// Verify

const keyFor = (event: ProofEvent) => SIGNING_KEYS.find((one) => one.id === event.keyId);

/** A proof event as anyone may read it (S8-2): type, opaque ids, scope, use, time, hashes — never amounts or terms. */
function eventOut(event: ProofEvent) {
  const key = keyFor(event);
  const inKeyTerm = Boolean(key && key.from <= event.at && (!key.to || event.at <= key.to));
  return {
    seq: event.seq,
    type: event.type,
    subject: event.subject,
    scope: event.scope ?? null,
    use: event.use ?? null,
    at: event.at,
    payload_hash: event.payloadHash,
    prev_hash: event.prevHash,
    event_hash: event.eventHash,
    batch: event.batch,
    receipt: event.receipt ?? null,
    signature: { algorithm: key?.algorithm ?? "Ed25519", key: event.keyId, value: `sig_${event.eventHash.slice(0, 48)}` },
    verified: inKeyTerm,
    verification: inKeyTerm ? "Signed by a published key, inside that key's term." : "The signing key is not published for this event's time.",
    imported: event.chain ? { tx: event.chain.tx, block: event.chain.block, ow_asset_uri: event.chain.owUri } : null,
    inclusion: `/api/v1/proof/events/${event.seq}/inclusion`,
  };
}

function proofEvent(call: Call): ApiResponse {
  const event = eventOf(call.params.id!);
  return event ? json(200, eventOut(event)) : problem(404, "not-found", "No such proof event", `No event or receipt ${call.params.id} in the Proof Log.`);
}

/** When a batch's root was timestamped: the five-minute window its events closed in. */
const closed = (at: Date) => new Date(Math.ceil((at.getTime() + 1) / 300000) * 300000);

/**
 * The event's Merkle path to its batch root, and the root's RFC 3161 token. A real root is SHA-256
 * over the events' hashes; the prototype's is the same tree over a stand-in hash
 * (docs/gaps/s9-api.md), so a reader can walk the path, not check it cryptographically.
 */
function inclusion(call: Call): ApiResponse {
  const event = eventOf(call.params.id!);
  if (!event) return problem(404, "not-found", "No such proof event", `No event or receipt ${call.params.id} in the Proof Log.`);
  const leaves = [...ISSUED, ...PROOF].filter((one) => one.batch === event.batch).sort((a, b) => a.seq - b.seq);
  const path: { position: "left" | "right"; hash: string }[] = [];
  let level = leaves.map((one) => one.eventHash);
  let index = leaves.findIndex((one) => one.seq === event.seq);
  while (level.length > 1) {
    const sibling = index % 2 === 0 ? (level[index + 1] ?? level[index]!) : level[index - 1]!;
    path.push({ position: index % 2 === 0 ? "right" : "left", hash: sibling });
    const up: string[] = [];
    for (let at = 0; at < level.length; at += 2) up.push(hash(`${level[at]}${level[at + 1] ?? level[at]}`));
    level = up;
    index = Math.floor(index / 2);
  }
  const at = closed(leaves.reduce((most, one) => (one.at > most ? one.at : most), event.at));
  return json(200, {
    event: event.seq,
    batch: event.batch,
    leaf: event.eventHash,
    leaves: leaves.length,
    path,
    root: level[0],
    hash: "prototype stand-in for SHA-256",
    timestamp: {
      standard: "RFC 3161",
      authority: "tsa.sureel.example",
      time: at,
      token: `MIAGCSqGSIb3DQEHAqCAMIACAQMx${hash(`tsa/${event.batch}`, 40)}`,
    },
    published: `${DOCS}/transparency/${event.batch}`,
  });
}

function proofKeys(): ApiResponse {
  return json(200, {
    keys: SIGNING_KEYS.map((one) => ({
      id: one.id,
      algorithm: one.algorithm,
      fingerprint: one.fingerprint,
      valid_from: dayOnWire(one.from),
      valid_to: dayOnWire(one.to),
      state: one.to ? "rotated" : "signing",
    })),
    note: "Keys rotate and are never withdrawn: an event signed by an old key still verifies against it.",
  });
}

// ---------------------------------------------------------------------------------------------
// Write — the five commands

type Outcome = {
  index: number;
  /** applied — stored and counted; flagged — stored, not counted until reviewed; invalid / unmatched — held, not linked; rejected — not stored. */
  status: "applied" | "flagged" | "invalid" | "unmatched" | "rejected";
  id?: string;
  state?: string;
  problems?: Problem[];
  note?: string;
  conflict?: string;
  proof_event?: number;
};

interface Effects {
  webhooks: ReturnType<typeof payload>[];
  at: Date;
  key: ApiKey;
}

/** Writes the graph cannot link — an identifier that fails its format, an asset not found. Kept, not linked (Invariant: identifier formats). */
export let HELD: { at: Date; key: string; command: string; item: unknown; status: "invalid" | "unmatched"; problems: Problem[] }[] = [];

/** Provenance records: the graph has no home for them yet, so the API keeps them (docs/gaps/s9-api.md). */
export let PROVENANCE: { id: string; partner: string; output: string; model: string; use: Use; inputs: { asset: string; answer: string }[]; at: Date; proof: number; flagged: boolean }[] = [];

const text = (item: Record<string, unknown>, field: string) => (typeof item[field] === "string" ? (item[field] as string).trim() : undefined);
const required = (item: Record<string, unknown>, fields: readonly string[]): Problem[] =>
  fields.filter((one) => item[one] === undefined || item[one] === null || item[one] === "").map((one) => ({ field: one, problem: "Required" }));

const INTERESTS: readonly Interest[] = ["Owns", "Controls", "Administers", "Collects"];
const SHARE_TYPES: readonly ShareType[] = ["Writer", "Publisher", "Master", "Performer", "Producer"];
const SOURCES = Object.keys(PRECEDENCE) as SourceKind[];
const oneOf = <T extends string>(set: readonly T[], value: unknown) => set.find((one) => typeof value === "string" && one.toLowerCase() === value.trim().toLowerCase());

/** The asset an item names, or why it cannot be linked. */
function assetFor(reference: unknown, field: string): Asset | { status: "invalid" | "unmatched"; problems: Problem[] } {
  if (typeof reference !== "string" || !reference.trim()) return { status: "invalid", problems: [{ field, problem: "Required" }] };
  // A code the graph already holds is read as the graph holds it; a new one is checked in full.
  const held = findAsset(reference);
  if (held) return held;
  const standard = standardOf(reference);
  if (standard) {
    const found = identifierProblem(standard, reference, true);
    if (found) return { status: "invalid", problems: [{ field, problem: found }] };
  }
  return { status: "unmatched", problems: [{ field, problem: `No asset ${reference} in the graph` }] };
}

/** AssertRights — one source's claim, stored in the state the resolver's write check gives it. */
function assertRights(item: Record<string, unknown>, index: number, effects: Effects): Outcome {
  const problems = required(item, ["asset", "side", "interests", "share_type", "share", "territory", "valid_from", "source", "source_ref"]);
  const asset = assetFor(item.asset, "asset");
  if (!("id" in asset)) return { index, ...asset };
  const side = oneOf(["Master", "Composition"] as const, item.side);
  if (item.side && !side) problems.push({ field: "side", problem: "Master or Composition" });
  if (side && side !== sideOf(asset)) problems.push({ field: "side", problem: `${asset.title} is a ${asset.kind.toLowerCase()}: its side is ${sideOf(asset)}` });
  const interests = Array.isArray(item.interests) ? item.interests.map((one) => oneOf(INTERESTS, one)) : [];
  if (item.interests !== undefined && (!interests.length || interests.some((one) => !one))) problems.push({ field: "interests", problem: "Any of Owns, Controls, Administers, Collects" });
  const shareType = oneOf(SHARE_TYPES, item.share_type);
  if (item.share_type && !shareType) problems.push({ field: "share_type", problem: "Writer, Publisher, Master, Performer or Producer" });
  const share = Number(item.share);
  if (item.share !== undefined && (!Number.isFinite(share) || share <= 0 || share > 100)) problems.push({ field: "share", problem: "A share is more than 0 and at most 100" });
  const territory = item.territory === undefined ? undefined : territorySet(item.territory);
  if (isProblem(territory)) problems.push(territory);
  const from = typeof item.valid_from === "string" ? dayOf(item.valid_from, "valid_from") : undefined;
  if (isProblem(from)) problems.push(from);
  const to = typeof item.valid_to === "string" ? dayOf(item.valid_to, "valid_to") : undefined;
  if (isProblem(to)) problems.push(to);
  const source = oneOf(SOURCES, item.source);
  if (item.source && !source) problems.push({ field: "source", problem: `One of ${SOURCES.join(", ")}` });
  const agreement = text(item, "agreement");
  const agreementId = agreement ? AGREEMENTS.find((one) => one.id === agreement || one.code === agreement)?.id : undefined;
  if (agreement && !agreementId) problems.push({ field: "agreement", problem: `No agreement ${agreement} on file` });
  // Invariant: every OWNS / CONTROLS edge traces to an agreement or a declared source.
  if (source === "Signed agreement" && !agreementId) problems.push({ field: "agreement", problem: "A signed-agreement claim names the agreement" });
  if (source === "Society acknowledgement" && !effects.key.scopes.some((one) => one === "registrations:write" || one === "claims:write"))
    problems.push({ field: "source", problem: "Society acknowledgements are written with registrations:write" });
  const party = text(item, "party") ?? effects.key.holder;
  if (!PARTIES.some((one) => one.id === party)) problems.push({ field: "party", problem: `No party ${party}` });
  // A key writes its holder's own claims (G-1). The one exception is a society acknowledging a
  // registrant's share — written for the registrant, and only as a society acknowledgement.
  const forRegistrant = source === "Society acknowledgement" && effects.key.scopes.includes("registrations:write");
  if (party !== effects.key.holder && !forRegistrant)
    problems.push({ field: "party", problem: `${effects.key.id} asserts for ${partyName(effects.key.holder)} only` });
  const supersedes = text(item, "supersedes");
  const replaced = supersedes ? ASSERTIONS.find((one) => one.id === supersedes) : undefined;
  if (supersedes && !replaced) problems.push({ field: "supersedes", problem: `No claim ${supersedes}` });
  if (replaced && (replaced.partyId !== party || replaced.partyId !== effects.key.holder))
    problems.push({ field: "supersedes", problem: "A party corrects only its own claim (G-1)" });
  let rights: Assertion["rights"] = side === "Master" ? "All master" : "All composition";
  if (Array.isArray(item.rights)) {
    const read = item.rights.map((one) => rightTypeOf(String(one)));
    if (read.some((one) => !one)) problems.push({ field: "rights", problem: "RAD right types, or leave it out for all" });
    else rights = read as RightType[];
  }
  if (problems.length || !side || !shareType || !source || !territory || isProblem(territory) || !from || isProblem(from) || isProblem(to)) return { index, status: "rejected", problems };

  const claim: NewClaim = {
    assetId: asset.id,
    partyId: party,
    interests: interests as Interest[],
    side,
    rights,
    shareType,
    share,
    ...(text(item, "share_of") ? { shareOf: text(item, "share_of") } : {}),
    territory,
    from,
    ...(to ? { to } : {}),
    ...(oneOf(["At source", "Receipts"] as const, item.basis) ? { basis: oneOf(["At source", "Receipts"] as const, item.basis) } : {}),
    source,
    sourceRef: text(item, "source_ref")!,
    ...(agreementId ? { agreementId } : {}),
    ...(supersedes ? { supersedes } : {}),
  };
  const beside = ASSERTIONS.filter((one) => one.assetId === asset.id).map((one) => one.territory);
  const checked = stateForNewClaim(claim, countriesToCheck(territory, beside));
  // A platform claim is evidence only: it never resolves ownership on its own.
  const state = source === "Platform claim" && checked.state === "Resolved" ? "Contested" : checked.state;
  const id = addAssertion({ ...claim, state });
  let conflict: string | undefined;
  if (checked.over.length) {
    const behind = checked.over.flatMap((country) => claimsBehind(asset.id, country).filter((one) => one.shareType === shareType && one.id !== id).map((one) => one.id));
    conflict = addConflict({
      kind: "Overclaim",
      assetId: asset.id,
      side,
      severity: asset.revenue > 0 ? "High" : "Medium",
      revenueAtRisk: Math.round((asset.revenue * share) / 100),
      territories: checked.over,
      claims: [id, ...new Set(behind)],
      parties: [...new Set([party, ...behind.map((one) => ASSERTIONS.find((each) => each.id === one)!.partyId)])],
      opened: TODAY,
      state: "Open",
      step: 0,
      interim: "Paying on the uncontested claims until resolved.",
      raisedBy: `Write check · ${effects.key.id}`,
    });
    effects.webhooks.push(payload("conflict.opened", `whk_${hash(conflict, 10)}`, effects.at, { conflict, kind: "Overclaim", asset: opaqueOf(asset.id), side, territories: checked.over, severity: asset.revenue > 0 ? "High" : "Medium" }));
  }
  const flagged = state === "No authority";
  return {
    index,
    status: flagged ? "flagged" : "applied",
    id,
    state,
    ...(conflict ? { conflict } : {}),
    ...(flagged ? { note: "Stored and flagged: the agreement it cites does not reach every territory claimed." } : {}),
    ...(state === "Contested" && !conflict ? { note: "A platform claim is evidence only: stored, never resolving ownership." } : {}),
  };
}

/** Whether a grantor holds the edge that lets it grant at this scope, there and then (the authority rule). */
function hasAuthority(grant: Omit<Grant, "id">): boolean {
  const countries = grant.territory.include === "World" ? ["World"] : [...grant.territory.include];
  const controls = (assetId: string, side: Side) =>
    countries.every((country) => controllers(assetId, side, country, grant.from).some((one) => one.partyId === grant.grantedBy));
  const side: Side = grant.side === "Both" ? "Master" : grant.side;
  if (grant.level === "Catalogue" || grant.level === "Label") return grant.ref === grant.grantedBy;
  if (grant.level === "Asset") return controls(grant.ref, side);
  if (grant.level === "Release") return (ASSETS.find((one) => one.id === grant.ref)?.items ?? []).every((one) => controls(one, "Master"));
  // An artist's voice: the artist's own, or a party whose agreement with the artist lets it consent to Voice/NIL.
  return grant.ref === grant.grantedBy || AGREEMENTS.some((one) => one.parties.includes(grant.ref) && one.parties.includes(grant.grantedBy) && (one.clauses ?? []).some((clause) => /Voice\/NIL/.test(clause)));
}

const LEVELS: readonly ScopeLevel[] = ["Artist", "Asset", "Release", "Label", "Catalogue"];

/** GrantClearance — a consent fact at the scope it was made, stored there and resolved at read time. */
function grantClearance(item: Record<string, unknown>, index: number, effects: Effects): Outcome {
  const problems = required(item, ["level", "ref", "side", "use", "effect", "territory", "valid_from", "decided"]);
  const level = oneOf(LEVELS, item.level);
  if (item.level && !level) problems.push({ field: "level", problem: LEVELS.join(", ") });
  const side = oneOf(["Master", "Composition", "Both"] as const, item.side);
  if (item.side && !side) problems.push({ field: "side", problem: "Master, Composition or Both" });
  const use = typeof item.use === "string" ? useOf(item.use) : undefined;
  if (item.use && !use) problems.push({ field: "use", problem: `${String(item.use)} is not a use` });
  if (level === "Artist" && use && use !== "Voice/NIL") problems.push({ field: "level", problem: "An artist-level grant is Voice/NIL only" });
  const effect = oneOf(["Grant", "Deny"] as const, item.effect);
  if (item.effect && !effect) problems.push({ field: "effect", problem: "Grant or Deny" });
  const ref = text(item, "ref");
  if (ref && level === "Artist" && !PARTIES.some((one) => one.id === ref)) problems.push({ field: "ref", problem: `No artist ${ref}` });
  if (ref && (level === "Asset" || level === "Release") && !findAsset(ref)) problems.push({ field: "ref", problem: `No asset ${ref}` });
  if (ref && (level === "Label" || level === "Catalogue") && !PARTIES.some((one) => one.id === ref)) problems.push({ field: "ref", problem: `No label or publisher ${ref}` });
  const territory = item.territory === undefined ? undefined : territorySet(item.territory);
  if (isProblem(territory)) problems.push(territory);
  const from = typeof item.valid_from === "string" ? dayOf(item.valid_from, "valid_from") : undefined;
  if (isProblem(from)) problems.push(from);
  const to = typeof item.valid_to === "string" ? dayOf(item.valid_to, "valid_to") : undefined;
  if (isProblem(to)) problems.push(to);
  const partners = item.partners === undefined ? { mode: "All approved", ids: [] } : fieldsOf(item.partners);
  const mode = oneOf(["All approved", "Allowlist", "Denylist"] as const, partners.mode);
  const ids = Array.isArray(partners.ids) ? partners.ids.map(String) : [];
  if (!mode) problems.push({ field: "partners.mode", problem: "All approved, Allowlist or Denylist" });
  for (const one of ids) if (!PARTNERS.some((each) => each.id === one)) problems.push({ field: "partners.ids", problem: `No partner ${one}` });
  const grantedBy = text(item, "granted_by") ?? effects.key.holder;
  if (grantedBy !== effects.key.holder) problems.push({ field: "granted_by", problem: `${effects.key.id} grants for ${partyName(effects.key.holder)} only` });
  const decided = fieldsOf(item.decided);
  if (item.decided !== undefined && typeof decided.actor !== "string") problems.push({ field: "decided.actor", problem: "Who decided (G-5)" });
  if (problems.length || !level || !side || !use || !effect || !ref || !territory || isProblem(territory) || !from || isProblem(from) || isProblem(to) || !mode) return { index, status: "rejected", problems };

  const asset = findAsset(ref);
  const grant: Omit<Grant, "id"> = {
    level,
    ref: asset && (level === "Asset" || level === "Release") ? asset.id : ref,
    side,
    use,
    effect,
    partners: { mode, ids },
    territory,
    from,
    ...(to ? { to } : {}),
    grantedBy,
    decided: {
      actor: String(decided.actor),
      ...(typeof decided.on_behalf_of === "string" ? { onBehalfOf: decided.on_behalf_of } : {}),
      ...(typeof decided.authority === "string" ? { authority: decided.authority } : {}),
      at: effects.at,
    },
    ...(Array.isArray(item.conditions) ? { conditions: item.conditions.map(String) } : {}),
    state: "Live",
  };
  // Authority: a grant counts only where its grantor holds a CONTROLS edge — otherwise stored and flagged.
  const unauthorized = effect === "Grant" && !hasAuthority(grant);
  addGrant(unauthorized ? { ...grant, unauthorized: true } : grant);
  const id = GRANTS[0]!.id;
  effects.webhooks.push(
    payload("clearance.changed", `whk_${hash(id, 10)}`, effects.at, {
      grant: id,
      scope: level,
      ref: asset ? opaqueOf(asset.id) : ref,
      use,
      effect,
      side,
      territory: territoryLabel(territory),
      partners: mode === "All approved" ? "All approved" : ids,
      flagged: unauthorized,
    }),
  );
  return unauthorized
    ? { index, status: "flagged", id, state: "Live", note: `Stored and flagged: ${partyName(grantedBy)} holds no controlling edge for this scope, territory and date. It never clears on its own.` }
    : { index, status: "applied", id, state: "Live" };
}

const CLAIMS: readonly ClaimType[] = ["Role confirmed", "Role denied", "Human performed", "Voice/NIL consent", "AI disclosure", "AI opt-out"];
const CONSENT: readonly ClaimType[] = ["Voice/NIL consent", "AI opt-out", "AI disclosure"];

/** RecordAttestation — a signed statement by a verified party; one made on someone's behalf needs the authority to. */
function recordAttestation(item: Record<string, unknown>, index: number, effects: Effects): Outcome {
  const problems = required(item, ["subject", "claim", "assurance", "key_id"]);
  const attestor = text(item, "attestor") ?? effects.key.holder;
  if (attestor !== effects.key.holder) problems.push({ field: "attestor", problem: `${effects.key.id} attests for ${partyName(effects.key.holder)} only` });
  const claim = oneOf(CLAIMS, item.claim);
  if (item.claim && !claim) problems.push({ field: "claim", problem: CLAIMS.join(", ") });
  const assurance = oneOf(["Basic", "Verified", "Verified + ID"] as const, item.assurance);
  if (item.assurance && !assurance) problems.push({ field: "assurance", problem: "Basic, Verified or Verified + ID" });
  const subject = fieldsOf(item.subject);
  const kind = oneOf(["Asset", "Credit", "Grant", "Artist"] as const, subject.kind);
  const subjectId = typeof subject.id === "string" ? subject.id : "";
  const exists =
    kind === "Asset" ? Boolean(findAsset(subjectId)) : kind === "Credit" ? CREDITS.some((one) => one.id === subjectId) : kind === "Grant" ? GRANTS.some((one) => one.id === subjectId) : kind === "Artist" ? PARTIES.some((one) => one.id === subjectId) : false;
  if (item.subject !== undefined && (!kind || !exists)) problems.push({ field: "subject", problem: "{ kind: Asset | Credit | Grant | Artist, id } naming something the graph holds" });
  const onBehalfOf = text(item, "on_behalf_of");
  if (onBehalfOf && !PARTIES.some((one) => one.id === onBehalfOf)) problems.push({ field: "on_behalf_of", problem: `No party ${onBehalfOf}` });
  if (problems.length || !claim || !assurance || !kind) return { index, status: "rejected", problems };

  // WHOSE statement it is comes from its subject, never only from the optional field: an artist's
  // own consent, the credited party's credit, the artist an artist-level grant is about.
  const credit = kind === "Credit" ? CREDITS.find((one) => one.id === subjectId) : undefined;
  const grant = kind === "Grant" ? GRANTS.find((one) => one.id === subjectId) : undefined;
  const owner = kind === "Artist" ? subjectId : credit ? credit.partyId : grant ? (grant.level === "Artist" ? grant.ref : grant.grantedBy) : undefined;
  // An asset is spoken for by those who hold it — a standing OWNS or CONTROLS edge anywhere — and those credited on it.
  const asset = kind === "Asset" ? findAsset(subjectId) : undefined;
  const entitled = asset
    ? new Set([
        ...ASSERTIONS.filter((one) => one.assetId === asset.id && (one.interests.includes("Owns") || one.interests.includes("Controls")) && one.state !== "Superseded" && one.state !== "Withdrawn" && one.state !== "No authority").map((one) => one.partyId),
        ...CREDITS.filter((one) => one.assetId === asset.id && one.state !== "Denied").map((one) => one.partyId),
      ])
    : new Set(owner ? [owner] : []);
  if (onBehalfOf && !entitled.has(onBehalfOf))
    return { index, status: "rejected", problems: [{ field: "on_behalf_of", problem: `${partyName(onBehalfOf)} holds no say over this subject; it is attested by or for one who does` }] };
  // Speaking for oneself only where the subject is one's own; anyone else speaks FOR someone — named, or the subject's owner.
  const own = entitled.has(attestor) && !onBehalfOf;
  const principal = own ? undefined : (onBehalfOf ?? owner);

  // Authority: on someone's behalf, an agreement between the two must say so. Fails closed: with no
  // principal to be backed by, a statement about what isn't the attestor's is never signed.
  const authority = text(item, "authority");
  const code = authority?.split(/\s/)[0];
  const backed = own || (principal !== undefined && AGREEMENTS.some((one) => one.code === code && one.parties.includes(principal) && one.parties.includes(attestor)));
  const attestation: Omit<Attestation, "id"> = {
    attestor,
    ...(principal ? { onBehalfOf: principal } : {}),
    subject: { kind, id: kind === "Asset" ? findAsset(subjectId)!.id : subjectId },
    claim,
    assurance,
    ...(authority ? { authority } : {}),
    issued: effects.at,
    // Without the authority it stays asked of the person it is about — never signed for them.
    state: backed ? "Signed" : "Requested",
    keyId: text(item, "key_id")!,
  };
  addAttestation(attestation);
  const id = ATTESTATIONS[0]!.id;
  if (backed && CONSENT.includes(claim))
    effects.webhooks.push(payload("consent.ack", `whk_${hash(id, 10)}`, effects.at, { attestation: id, claim, subject: attestation.subject, assurance }));
  return backed
    ? { index, status: "applied", id, state: "Signed" }
    : { index, status: "flagged", id, state: "Requested", note: `Stored and flagged: ${principal ? `no agreement between ${partyName(attestor)} and ${partyName(principal)} gives the authority named. It waits on ${partyName(principal)}'s own signature.` : `${partyName(attestor)} holds no say over this subject.`}` };
}

/** RecordProvenance — what an AI output was made from; each input's clearance read for the caller at that time. */
function recordProvenance(item: Record<string, unknown>, index: number, effects: Effects): Outcome {
  const problems = required(item, ["output_id", "model", "use", "inputs"]);
  const use = typeof item.use === "string" ? useOf(item.use) : undefined;
  if (item.use && !use) problems.push({ field: "use", problem: `${String(item.use)} is not a use` });
  const inputs = Array.isArray(item.inputs) ? item.inputs.map(String) : [];
  if (item.inputs !== undefined && !inputs.length) problems.push({ field: "inputs", problem: "At least one input asset" });
  const assets = inputs.map((one) => findAsset(one));
  assets.forEach((one, at) => {
    if (!one) problems.push({ field: `inputs[${at}]`, problem: `No asset ${inputs[at]}` });
  });
  const when = typeof item.generated_at === "string" ? dayOf(item.generated_at, "generated_at") : effects.at;
  if (isProblem(when)) problems.push(when);
  if (problems.length || !use || isProblem(when)) return { index, status: "rejected", problems };

  const partner = effects.key.holder;
  const read = (assets as Asset[]).map((asset) => ({ asset: asset.id, answer: ANSWER[clearanceOf(asset.id, use, { partner, country: "World", at: when, audience: effects.key.audience }).state] }));
  const flagged = read.some((one) => one.answer !== "granted");
  const output = `out_${hash(`${partner}/${String(item.output_id)}`, 10)}`;
  const event = mint("GENESIS", output, effects.at, `${output}/${String(item.model)}`, { scope: "Output", use });
  const id = `pv-${PROVENANCE.length + 1}`;
  PROVENANCE = [{ id, partner, output, model: String(item.model), use, inputs: read, at: when, proof: event.seq, flagged }, ...PROVENANCE];
  return {
    index,
    status: flagged ? "flagged" : "applied",
    id,
    state: flagged ? "Inputs not cleared" : "Recorded",
    proof_event: event.seq,
    ...(flagged ? { note: `Stored and flagged: ${read.filter((one) => one.answer !== "granted").map((one) => one.asset).join(", ")} were not cleared for ${use} when it was generated.` } : {}),
  };
}

/** LinkRecordingWork — the edge publishing income is matched over; a missing one is unmatched money. */
function linkRecordingWork(item: Record<string, unknown>, index: number, effects: Effects): Outcome {
  const problems = required(item, ["recording", "work"]);
  const recording = assetFor(item.recording, "recording");
  if (!("id" in recording)) return { index, ...recording };
  const work = assetFor(item.work, "work");
  if (!("id" in work)) return { index, ...work };
  if (recording.kind !== "Recording") problems.push({ field: "recording", problem: `${recording.title} is a ${recording.kind.toLowerCase()}` });
  if (work.kind !== "Work") problems.push({ field: "work", problem: `${work.title} is a ${work.kind.toLowerCase()}` });
  if (problems.length) return { index, status: "rejected", problems };
  // A link routes publishing money, so only a party holding one side of it makes one: the
  // recording's label, or a standing OWNS / CONTROLS edge on the recording or the work.
  const holder = effects.key.holder;
  const holds = (asset: Asset) =>
    ASSERTIONS.some(
      (one) =>
        one.assetId === asset.id &&
        one.partyId === holder &&
        (one.interests.includes("Owns") || one.interests.includes("Controls")) &&
        one.state !== "Superseded" &&
        one.state !== "Withdrawn" &&
        one.state !== "No authority",
    );
  if (recording.labelId !== holder && !holds(recording) && !holds(work))
    return { index, status: "rejected", problems: [{ field: "recording", problem: `${effects.key.id} links only recordings or works ${partyName(holder)} holds` }] };
  if (recording.embodies?.some((one) => one.workId === work.id)) return { index, status: "applied", id: `${recording.id}→${work.id}`, state: "Linked", note: "Already linked: nothing changed." };
  const opened = CONFLICTS.filter((one) => one.assetId === recording.id && one.kind === "Missing work link" && one.state !== "Resolved");
  // Who linked it is the key's holder, whatever the caller names as its source.
  const said = text(item, "source");
  linkRecording(recording.id, work.id, `API · ${partyName(holder)}${said ? ` (${said})` : ""}`);
  for (const one of opened)
    effects.webhooks.push(payload("conflict.resolved", `whk_${hash(one.id, 10)}`, effects.at, { conflict: one.id, kind: one.kind, resolution: `Linked to ${work.title}.` }));
  return {
    index,
    status: "applied",
    id: `${recording.id}→${work.id}`,
    state: "Linked",
    ...(item.portion && item.portion !== "Full" ? { note: "Stored as a full embodiment: the graph's link setter takes no portion yet." } : {}),
  };
}

// ---------------------------------------------------------------------------------------------
// The write path: idempotency, batching, 202 and the confirmation

/** What a write was answered, kept by key and idempotency key — the same write twice answers the same. */
const IDEMPOTENT = new Map<string, { body: string; response: ApiResponse }>();

/** Every confirmation the write path sent, by event id — with the key that wrote it, the only one that may read it. */
export const CONFIRMATIONS = new Map<string, { key: string; confirmation: ReturnType<typeof payload> }>();

type Command = (item: Record<string, unknown>, index: number, effects: Effects) => Outcome;

function writeWith(name: string, command: Command) {
  return (call: Call): ApiResponse => {
    const idempotency = call.headers["idempotency-key"];
    if (!idempotency) return problem(400, "missing-idempotency-key", "Name an Idempotency-Key", "Every write carries an Idempotency-Key header, so a retry is never applied twice.");
    const seen = JSON.stringify(call.body ?? null);
    const kept = IDEMPOTENT.get(`${call.key!.id}/${idempotency}`);
    if (kept)
      return kept.body === seen
        ? { ...kept.response, headers: { ...kept.response.headers, "Idempotent-Replayed": "true" } }
        : problem(409, "idempotency-key-reused", "Idempotency-Key already used", `${idempotency} was used with a different body. Use a new key for a new write.`);
    const items = Array.isArray(call.body) ? call.body : call.body && typeof call.body === "object" ? [call.body] : undefined;
    if (!items || !items.length) return problem(400, "bad-request", "Send a command or an array of them", `The body is one ${name} command, or an array of up to ${BATCH_LIMIT}.`);
    if (items.length > BATCH_LIMIT) return problem(413, "batch-too-large", "Too many commands", `Received ${items.length}; the limit is ${BATCH_LIMIT}.`);
    if (items.some((one) => !one || typeof one !== "object" || Array.isArray(one))) return problem(400, "bad-request", "Each item is an object", `Every item of the batch is one ${name} command.`);

    const at = now();
    const effects: Effects = { webhooks: [], at, key: call.key! };
    const outcomes = items.map((item, index) => command(fieldsOf(item), index, effects));
    for (const one of outcomes)
      if (one.status === "invalid" || one.status === "unmatched")
        HELD = [{ at, key: call.key!.id, command: name, item: items[one.index], status: one.status, problems: one.problems ?? [] }, ...HELD];
    // Unguessable: an event id is a handle on another key's write only if it can be guessed.
    const event = `evt_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const confirmation = payload("command.confirmed", `whk_${hash(event, 10)}`, at, { event, command: name, items: outcomes });
    CONFIRMATIONS.set(event, { key: call.key!.id, confirmation });
    const response = json(
      202,
      {
        event,
        command: name,
        status: "accepted",
        received: outcomes.length,
        counts: Object.fromEntries(["applied", "flagged", "invalid", "unmatched", "rejected"].map((state) => [state, outcomes.filter((one) => one.status === state).length])),
        items: outcomes,
        confirmation: { webhook: "command.confirmed", poll: `/api/v1/commands/${event}`, payload: confirmation },
        webhooks: effects.webhooks,
      },
      { Location: `/api/v1/commands/${event}` },
    );
    IDEMPOTENT.set(`${call.key!.id}/${idempotency}`, { body: seen, response });
    return response;
  };
}

function confirmationOf(call: Call): ApiResponse {
  const found = CONFIRMATIONS.get(call.params.id!);
  // Another key's write answers as no write at all — its existence is not this key's to learn.
  return found && found.key === call.key?.id ? json(200, { status: "confirmed", ...found.confirmation }) : problem(404, "not-found", "No such write", `No write was answered with event ${call.params.id}.`);
}

// ---------------------------------------------------------------------------------------------
// The table

const RESPONSES_WRITE = { 202: "Accepted — each item's outcome, the event id, and the confirmation payload", 400: "No Idempotency-Key, or not a command", 401: "No key, or one the graph does not know", 403: "The key lacks the scope", 409: "Idempotency-Key reused with a different body", 413: "More than 500 commands" };
const RESPONSES_READ = { 200: "The answer", 401: "No key, or one the graph does not know", 403: "The key lacks the scope", 404: "No such asset", 422: "A parameter the graph cannot read" };

export const ROUTES: readonly Route[] = [
  {
    id: "assert-rights",
    method: "POST",
    path: "/v1/assertions",
    group: "Write",
    summary: "Assert rights",
    description: "AssertRights: one source's claim of ownership, control, administration or collection. Never overwritten — a correction names the claim it supersedes. Stored in the state the resolver's write check gives it: Resolved, Contested (it overclaims — a conflict opens) or No authority (stored and flagged).",
    scopes: ["claims:write", "registrations:write"],
    params: [IDEMPOTENCY],
    command: {
      name: "AssertRights",
      example: [{ asset: "w-northbound", party: "p-harbor", interests: ["Owns"], side: "Composition", share_type: "Publisher", share: 60, territory: "DE", valid_from: "2026-03-01", source: "Society acknowledgement", source_ref: "GEMA ack 2026-03-0412" }],
      fields: {
        asset: "Graph id, ISRC, ISWC or UPC",
        party: "Party id; the key's holder if left out",
        interests: "Owns, Controls, Administers, Collects",
        side: "Master or Composition",
        rights: "RAD right types; all of the side if left out",
        share_type: "Writer, Publisher, Master, Performer, Producer",
        share: "0–100",
        share_of: "A share held of another party's share — \"Harbor Music's 50%\"",
        territory: "\"World\", \"World excl. DE, AT\", \"DE, AT, CH\" or { include, exclude }",
        valid_from: "YYYY-MM-DD — required",
        valid_to: "YYYY-MM-DD",
        source: Object.keys(PRECEDENCE).join(", "),
        source_ref: "The agreement code, CWR file or DDEX message",
        agreement: "Agreement id or code — required for a signed agreement",
        supersedes: "The claim this corrects (your own)",
      },
    },
    responses: RESPONSES_WRITE,
    handle: writeWith("AssertRights", assertRights),
  },
  {
    id: "grant-clearance",
    method: "POST",
    path: "/v1/clearances",
    group: "Write",
    summary: "Grant or deny a use",
    description: "GrantClearance: a consent fact stored at the scope it was made (artist, asset, release, label, catalogue) and resolved at read time. A grant from a party with no controlling edge for that scope, territory and date is stored and flagged, and never clears on its own.",
    scopes: ["clearances:write"],
    params: [IDEMPOTENCY],
    command: {
      name: "GrantClearance",
      example: { level: "Catalogue", ref: "p-harbor", side: "Composition", use: "ai_training", effect: "Grant", partners: { mode: "Allowlist", ids: ["p-cadence"] }, territory: "World", valid_from: "2026-10-20", decided: { actor: "Elena Marsh", on_behalf_of: "Harbor Music", authority: "AGR-101 §11.3" } },
      fields: {
        level: "Artist (Voice/NIL only), Asset, Release, Label, Catalogue",
        ref: "What the scope names: a party id, or an asset id or code",
        side: "Master, Composition or Both",
        use: "stream, download, ugc, sync, ai_training, ai_derivative, voice_nil, ai_streaming",
        effect: "Grant or Deny",
        partners: "{ mode: All approved | Allowlist | Denylist, ids }",
        territory: "As for assertions",
        valid_from: "YYYY-MM-DD — required",
        valid_to: "YYYY-MM-DD",
        decided: "{ actor, on_behalf_of, authority } — who decided, for whom, under what (G-5)",
        conditions: "Free-text conditions",
      },
    },
    responses: RESPONSES_WRITE,
    handle: writeWith("GrantClearance", grantClearance),
  },
  {
    id: "record-attestation",
    method: "POST",
    path: "/v1/attestations",
    group: "Write",
    summary: "Record an attestation",
    description: "RecordAttestation: a signed statement — a role confirmed or denied, human performance, Voice/NIL consent, an AI disclosure or opt-out. One made on someone's behalf must name an agreement between the two that gives the authority; without it, it is stored as Requested of the person it is about.",
    scopes: ["attestations:write"],
    params: [IDEMPOTENCY],
    command: {
      name: "RecordAttestation",
      example: { subject: { kind: "Credit", id: "c-6" }, claim: "Role confirmed", assurance: "Verified", on_behalf_of: "p-mira", authority: "AGR-310 §7.4", key_id: "kestrel-label-2026" },
      fields: {
        attestor: "Party id; the key's holder",
        on_behalf_of: "Party id, where not the attestor's own",
        subject: "{ kind: Asset | Credit | Grant | Artist, id }",
        claim: CLAIMS.join(", "),
        assurance: "Basic, Verified, Verified + ID",
        authority: "The agreement and clause — \"AGR-310 §7.4\"",
        key_id: "The signing key",
      },
    },
    responses: RESPONSES_WRITE,
    handle: writeWith("RecordAttestation", recordAttestation),
  },
  {
    id: "record-provenance",
    method: "POST",
    path: "/v1/provenance",
    group: "Write",
    summary: "Record provenance",
    description: "RecordProvenance: what an AI output was made from. Each input's clearance is read for the caller at the time it was generated; an input not granted flags the record. A GENESIS event is sealed in the Proof Log.",
    scopes: ["provenance:write"],
    params: [IDEMPOTENCY],
    command: {
      name: "RecordProvenance",
      example: { output_id: "cd7-sample-000418", model: "CD-7", use: "ai_training", inputs: ["GBKPR2400118", "r-tidewater"], generated_at: "2026-10-19" },
      fields: { output_id: "Your id for the output", model: "The model or run", use: "The use it was made under", inputs: "Asset ids or codes", generated_at: "When — now if left out" },
    },
    responses: RESPONSES_WRITE,
    handle: writeWith("RecordProvenance", recordProvenance),
  },
  {
    id: "link-recording-work",
    method: "POST",
    path: "/v1/links",
    group: "Write",
    summary: "Link a recording to a work",
    description: "LinkRecordingWork: the edge publishing income is matched over. Closes an open missing-link conflict on the recording (conflict.resolved).",
    scopes: ["links:write"],
    params: [IDEMPOTENCY],
    command: {
      name: "LinkRecordingWork",
      example: { recording: "r-switchback", work: "T-913.117.402-2", source: "DDEX MWN · KPR-2610-090" },
      fields: { recording: "Recording id or ISRC", work: "Work id or ISWC", portion: "Full (Partial and medley segments are not stored yet)", source: "Where the link comes from" },
    },
    responses: RESPONSES_WRITE,
    handle: writeWith("LinkRecordingWork", linkRecordingWork),
  },
  {
    id: "command",
    method: "GET",
    path: "/v1/commands/{id}",
    group: "Write",
    summary: "A write's confirmation",
    description: "The command.confirmed payload a write was answered with — for a caller with no webhook endpoint.",
    scopes: [],
    params: [{ name: "id", in: "path", required: true, description: "The event id a write was answered with.", example: "evt_3f9a1c07b2d4" }],
    responses: { 200: "Confirmed", 401: "No key", 404: "No such write" },
    handle: confirmationOf,
  },
  {
    id: "lookup",
    method: "GET",
    path: "/v1/assets",
    group: "Resolve",
    summary: "Find an asset by its code",
    description: "Look an asset up by ISRC, ISWC or UPC. Formats are checked; the answer lists every asset with that code, and where to read it next.",
    scopes: ["clearance:read", "splits:read", "claims:read"],
    params: [
      { name: "isrc", in: "query", description: "A recording's ISRC — 12 characters, no hyphens.", example: "GBKPR2400118" },
      { name: "iswc", in: "query", description: "A work's ISWC.", example: "T-912.448.301-8" },
      { name: "upc", in: "query", description: "A release's UPC or EAN." },
    ],
    responses: { 200: "Every asset with that code (possibly none)", 400: "No code named", 401: "No key", 403: "The key lacks a read scope", 422: "A code that fails its format" },
    handle: lookup,
  },
  {
    id: "splits",
    method: "GET",
    path: "/v1/assets/{id}/splits",
    group: "Resolve",
    summary: "Resolved splits",
    description: "Who is owed what per share type in one territory on one date, as the graph knew it at known_at: the total across every standing claim (an overclaim shows), what is paid while a conflict is open, and — for a right type — who collects each share.",
    scopes: ["splits:read"],
    params: [
      ID,
      { name: "territory", in: "query", required: true, description: "An ISO 3166 code, or World.", example: "DE" },
      { name: "right_type", in: "query", description: "A RAD right type — Performance, Mechanical…", example: "Performance", enum: ["Mechanical", "Performance", "Sync", "Print", "Lyrics", "Master use", "Neighbouring", "Making available", "UGC"] },
      { name: "as_of", in: "query", description: "Valid time: who held it on that date. Today if left out.", example: "2026-03-01" },
      { name: "known_at", in: "query", description: "System time: what the graph believed then." },
    ],
    responses: RESPONSES_READ,
    handle: splits,
  },
  {
    id: "clearance",
    method: "GET",
    path: "/v1/assets/{id}/clearance/effective",
    group: "Resolve",
    summary: "Effective clearance",
    description: "Granted, denied or needs_review for a use, partner, territory and time — the master and every controlling publisher apart, a reason code, and a signed receipt the Verification portal checks. A partner key reads its own clearance only.",
    scopes: ["clearance:read"],
    params: [
      ID,
      { name: "use", in: "query", required: true, description: "stream, download, ugc, sync, ai_training, ai_derivative, voice_nil, ai_streaming.", example: "AI training" },
      { name: "partner", in: "query", description: "The partner asking — the key's own if left out.", example: "p-cadence" },
      { name: "territory", in: "query", description: "An ISO 3166 code, or World (the default).", example: "World" },
      { name: "at", in: "query", description: "The delivery timestamp. Now if left out." },
    ],
    responses: RESPONSES_READ,
    handle: effectiveClearance,
  },
  {
    id: "chain-of-title",
    method: "GET",
    path: "/v1/assets/{id}/chain-of-title",
    group: "Resolve",
    summary: "Chain of title",
    description: "Every standing edge on the asset live on the date, ranked by ownership precedence, each traced to its agreement or declared source, with the claims it superseded. A recording carries the chain of every work it embodies.",
    scopes: ["claims:read"],
    params: [
      ID,
      { name: "right_type", in: "query", description: "A RAD right type." },
      { name: "territory", in: "query", description: "An ISO 3166 code, or World. Every territory if left out.", example: "DE" },
      { name: "date", in: "query", description: "Today if left out.", example: "2026-03-01" },
    ],
    responses: RESPONSES_READ,
    handle: chainOfTitle,
  },
  {
    id: "lineage",
    method: "GET",
    path: "/v1/assets/{id}/lineage",
    group: "Resolve",
    summary: "Lineage",
    description: "How the asset connects — works embodied, recordings contained, releases packaging it — walked both ways, read from the direct links only.",
    scopes: ["claims:read"],
    params: [ID, { name: "depth", in: "query", description: "Hops, 1–6. 3 if left out.", example: "3" }],
    responses: RESPONSES_READ,
    handle: lineage,
  },
  {
    id: "proof-event",
    method: "GET",
    path: "/v1/proof/events/{id}",
    group: "Verify",
    summary: "A proof event",
    description: "An event by its sequence number or a receipt id: type, opaque ids, scope, use, time and hashes, the key that signed it — never amounts, percentages or terms.",
    scopes: [],
    params: [{ name: "id", in: "path", required: true, description: "A sequence number or a receipt id.", example: "rcpt_7Q2M-9F4K-CD7A" }],
    responses: { 200: "The event", 401: "No key", 404: "No such event" },
    handle: proofEvent,
  },
  {
    id: "proof-inclusion",
    method: "GET",
    path: "/v1/proof/events/{id}/inclusion",
    group: "Verify",
    summary: "Merkle inclusion and TSA token",
    description: "The event's path to its five-minute batch root, and the root's RFC 3161 timestamp token — with a receipt and the public key, enough to check the event offline.",
    scopes: [],
    params: [{ name: "id", in: "path", required: true, description: "A sequence number or a receipt id.", example: "882140" }],
    responses: { 200: "The path and token", 401: "No key", 404: "No such event" },
    handle: inclusion,
  },
  {
    id: "proof-keys",
    method: "GET",
    path: "/v1/proof/keys",
    group: "Verify",
    summary: "Signing keys",
    description: "Every key that has signed the Proof Log, with its term. Public: no key needed.",
    scopes: null,
    params: [],
    responses: { 200: "The keys" },
    handle: proofKeys,
  },
];

export const routeById = (id: string) => ROUTES.find((one) => one.id === id);

// ---------------------------------------------------------------------------------------------
// Dispatch

/** A path template as a pattern: `/v1/assets/{id}/splits` matches `/v1/assets/r-northbound/splits`. */
const patternOf = (path: string) => new RegExp(`^${path.replace(/\{(\w+)\}/g, (_, name: string) => `(?<${name}>[^/]+)`)}$`);

/** The route a method and path reach, and the path parameters it read. */
export function match(method: string, path: string): { route?: Route; params: Record<string, string>; allowed: string[] } {
  const allowed: string[] = [];
  for (const route of ROUTES) {
    const found = patternOf(route.path).exec(path);
    if (!found) continue;
    if (route.method !== method) {
      allowed.push(route.method);
      continue;
    }
    const params = Object.fromEntries(Object.entries(found.groups ?? {}).map(([name, value]) => [name, decodeURIComponent(value)]));
    return { route, params, allowed };
  }
  return { params: {}, allowed };
}

/** What the request authorizes: the key, or the problem a missing or short one is answered with. */
export function authorize(route: Route, authorization: string | undefined): ApiKey | ApiResponse | undefined {
  if (route.scopes === null) return undefined;
  const bearer = /^Bearer\s+(\S+)$/i.exec(authorization ?? "")?.[1];
  if (!bearer) return problem(401, "unauthorized", "No key", "Send your key as Authorization: Bearer <key id>.");
  const key = keyById(bearer);
  if (!key) return problem(401, "unauthorized", "Unknown key", `The graph issued no key ${bearer}, or it was rotated out.`);
  if (route.scopes.length && !route.scopes.some((one) => key.scopes.includes(one)))
    return problem(403, "insufficient-scope", "The key lacks the scope", `${route.method} ${route.path} needs ${route.scopes.join(" or ")}; ${key.id} carries [${key.scopes.join(", ")}].`, { required: route.scopes, granted: key.scopes });
  return key;
}

/**
 * One call, whichever transport carried it. The path may carry the `/api` the dev server mounts
 * the API under; the OpenAPI document is served beside it by `index.ts`.
 */
export function handle(request: ApiRequest): ApiResponse {
  const method = request.method.toUpperCase();
  const [rawPath = "", search = ""] = request.url.split("?");
  const path = rawPath.replace(/^\/api(?=\/)/, "").replace(/\/+$/, "") || "/";
  const headers = Object.fromEntries(Object.entries(request.headers ?? {}).flatMap(([name, value]) => (value === undefined ? [] : [[name.toLowerCase(), value]])));
  const { route, params, allowed } = match(method, path);
  if (!route)
    return allowed.length
      ? { ...problem(405, "method-not-allowed", "Method not allowed", `${path} answers ${allowed.join(", ")}.`), headers: { "Content-Type": "application/problem+json", Allow: allowed.join(", ") } }
      : problem(404, "not-found", "No such endpoint", `Nothing answers ${method} ${path}. The endpoints are listed at /api/openapi.json.`);
  const key = authorize(route, headers.authorization);
  if (isResponse(key)) return key;
  let body = request.body;
  if (typeof body === "string" && body.trim()) {
    try {
      body = JSON.parse(body);
    } catch {
      return problem(400, "bad-json", "The body is not JSON", "Send the command as JSON, with Content-Type: application/json.");
    }
  } else if (typeof body === "string") body = undefined;
  const query = Object.fromEntries(new URLSearchParams(search));
  return route.handle({ params, query, headers, body, key });
}
