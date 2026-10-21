import { PARTIES, REQUESTS, TODAY, WORLD, addRequest, now, partyById, setRequestState, subscribe, wrote } from "./fixtures";
import type { Decision, Party, Request } from "./model";

/**
 * ArtistID (S3-1, S3-2) — the writes the graph lacks for a person signing up: their account, the
 * checks of their identity, and the entries in the graph they claim are them. Kept for the browser
 * session under a key of its own, the way `fixtures.ts` keeps the graph.
 *
 * A CLAIM IS A REQUEST. Each one is an Attestation request in the confirmer's inbox — the label's
 * (Revelator Pro › Requests) or Sureel's (Console › ArtistID claims) — and its state is read off
 * that request, never kept twice: Approved is a verified profile, Declined a refused one.
 *
 * ASSURANCE (FRD S3-1 leaves the levels' meaning open; this is the assumption, logged in
 * docs/gaps/s3-signup.md): Basic — an email or phone proved by a one-time code; Verified — a label
 * or Sureel confirmed one of the person's profile claims; Verified + ID — that, and a government
 * ID matched to a live selfie.
 */

export type Assurance = NonNullable<Party["assurance"]>;
export const ASSURANCES: readonly Assurance[] = ["Basic", "Verified", "Verified + ID"];

/** Who signs up: an artist, a writer, or both — a delegate never signs up for anyone. */
export type Role = "Artist" | "Writer" | "Both";
export const DOCUMENTS = ["Passport", "National ID card", "Driving licence"] as const;
export type IdDocument = (typeof DOCUMENTS)[number];
export const OUTCOMES = ["Passed", "Needs another photo", "Failed"] as const;
export type IdOutcome = (typeof OUTCOMES)[number];

export interface IdCheck {
  document: IdDocument;
  outcome: IdOutcome;
  at: Date;
}

export interface Account {
  /** The person's party id — an ArtistID is a party of its own until a claim joins it to an entry. */
  id: string;
  name: string;
  /** Delegate for an account made by accepting an invitation — never a sign-up of its own. */
  role: Role | "Delegate";
  signIn: "Email" | "Phone";
  contact: string;
  created: Date;
  keyId: string;
  /** A delegate's account: whom they act for, under which invitation, with what scope. */
  delegateFor?: { artist: string; invitation: string; scope: readonly string[] };
}

export interface ProfileClaim {
  id: string;
  /** The person claiming — an ArtistID. */
  by: string;
  /** The entry in the graph they say is them. */
  entry: string;
  /** The Attestation request in the confirmer's inbox. */
  request: string;
  /** The label, or Sureel. */
  confirmer: string;
  claimed: Date;
  evidence?: string;
}

export type ClaimState = "Pending" | "Verified" | "Declined";

// ---------------------------------------------------------------------------------------------
// Entries the graph holds that nobody has claimed yet — ingested from labels' deliveries and
// society data, named the way the source named them. A new artist finds themself among these.

const UNCLAIMED: readonly Party[] = [
  { id: "p-noa", name: "Noa Brightwater", kind: "Artist", isni: "0000000521337804", country: "Ireland" },
  { id: "p-noa-w", name: "N. Brightwater", kind: "Writer", ipi: "00745120036", society: "IMRO", country: "Ireland" },
  { id: "p-kai", name: "Kai Moreno", kind: "Artist", isni: "0000000533901276", country: "Chile" },
  { id: "p-sol", name: "Sol Varga", kind: "Writer", ipi: "00751934410", society: "Artisjus", country: "Hungary" },
];

/** The labels that confirm a claim from their own workspace; anyone else's goes to Sureel. */
export const CONFIRMERS = ["p-kestrel", "p-sureel"] as const;

let ACCOUNTS: Account[] = [];
let CLAIMS: ProfileClaim[] = [];
/** Every ID check, by the person checked — new accounts and re-verifications of existing ones. */
let CHECKS: Record<string, IdCheck[]> = {};
/** The new artist signed in, as the "New artist" persona reads the app. */
let SIGNED_IN: string | undefined;

const KEPT = "rights-graph:identity";
const revive = (_: string, value: unknown) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? new Date(value) : value;

function save() {
  try {
    sessionStorage.setItem(KEPT, JSON.stringify({ ACCOUNTS, CLAIMS, CHECKS, SIGNED_IN }));
  } catch {
    // No session storage: the sign-ups last until the page reloads.
  }
}

/** The graph's set of parties, which this file grows by the entries and accounts it adds. */
const parties = PARTIES as Party[];
const place = (party: Party) => {
  if (!parties.some((one) => one.id === party.id)) parties.push(party);
};

function load() {
  UNCLAIMED.forEach((one) => place({ ...one }));
  try {
    const kept = sessionStorage.getItem(KEPT);
    if (kept) {
      const read = JSON.parse(kept, revive) as { ACCOUNTS: Account[]; CLAIMS: ProfileClaim[]; CHECKS: Record<string, IdCheck[]>; SIGNED_IN?: string };
      ACCOUNTS = read.ACCOUNTS;
      CLAIMS = read.CLAIMS;
      CHECKS = read.CHECKS;
      SIGNED_IN = read.SIGNED_IN;
    }
  } catch {
    // A session written by an older build: nobody has signed up yet.
  }
  ACCOUNTS.forEach((one) => place(accountParty(one)));
  settle();
}

const accountParty = (account: Account): Party => ({
  id: account.id,
  name: account.name,
  kind: account.delegateFor ? "Delegate" : account.role === "Writer" ? "Writer" : "Artist",
  assurance: "Basic",
});

// ---------------------------------------------------------------------------------------------
// Reads

export const accounts = () => ACCOUNTS;
export const accountById = (id: string) => ACCOUNTS.find((one) => one.id === id);
export const signedIn = () => (SIGNED_IN ? accountById(SIGNED_IN) : undefined);
export const checksOf = (person: string) => CHECKS[person] ?? [];
export const lastCheck = (person: string) => checksOf(person)[0];

const requestOf = (claim: ProfileClaim): Request | undefined => REQUESTS.find((one) => one.id === claim.request);

export function claimState(claim: ProfileClaim): ClaimState {
  const state = requestOf(claim)?.state;
  if (state === "Approved") return "Verified";
  if (state === "Declined") return "Declined";
  return "Pending";
}
export const claimById = (id: string) => CLAIMS.find((one) => one.id === id);
export const claimOfRequest = (request: Request) => (request.type === "Attestation" ? CLAIMS.find((one) => one.request === request.id) : undefined);
export const claimsBy = (person: string) => CLAIMS.filter((one) => one.by === person);
export const claimsTo = (confirmer: string) => CLAIMS.filter((one) => one.confirmer === confirmer);
/** Who decided a claim, once someone has. */
export const claimDecision = (claim: ProfileClaim) => requestOf(claim)?.decided;

/** The entries a person's confirmed claims join them to — the artist entry first. */
export const confirmedEntries = (person: string) =>
  claimsBy(person)
    .filter((one) => claimState(one) === "Verified")
    .map((one) => partyById(one.entry))
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "Artist" ? -1 : 1));

/**
 * The entries a person may claim: artists and writers no ArtistID holds yet. An entry someone
 * else already holds, or has a claim waiting on, is not offered — a second person claiming it is a
 * dispute for Sureel, which this flow does not open (gaps).
 */
export function claimable(person?: string) {
  const waiting = new Set(CLAIMS.filter((one) => claimState(one) !== "Declined").map((one) => one.entry));
  return PARTIES.filter(
    (one) => (one.kind === "Artist" || one.kind === "Writer") && !one.assurance && !accountById(one.id) && !waiting.has(one.id) && one.id !== person,
  );
}

/**
 * The assurance a person holds, read off what has happened to them. A seeded person (Mira, Ana)
 * keeps the level the graph gives them; a passed re-verification lifts Verified to Verified + ID.
 * A failed re-check never takes a level away — it is recorded, and the next one can pass.
 */
export function assuranceOf(person: string): Assurance {
  const passed = checksOf(person).some((one) => one.outcome === "Passed");
  if (!accountById(person)) {
    const given = PARTIES.find((one) => one.id === person)?.assurance ?? "Basic";
    return given === "Verified" && passed ? "Verified + ID" : given;
  }
  const vouched = claimsBy(person).some((one) => claimState(one) === "Verified");
  if (!vouched) return "Basic";
  return passed ? "Verified + ID" : "Verified";
}

/** Each account's level written onto its party and every entry its confirmed claims join. */
function settle() {
  for (const account of ACCOUNTS) {
    const level = assuranceOf(account.id);
    const own = parties.find((one) => one.id === account.id);
    if (own) own.assurance = level;
    confirmedEntries(account.id).forEach((one) => (one.assurance = level));
  }
}

// ---------------------------------------------------------------------------------------------
// Writes

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** An ArtistID made: the contact is proved, so it starts at Basic. Signed in as the new artist. */
export function createAccount(given: Omit<Account, "id" | "created" | "keyId">) {
  const id = `p-aid-${ACCOUNTS.length + 1}`;
  const account: Account = { ...given, id, created: now(), keyId: `artistid-${slugOf(given.name)}-${TODAY.getFullYear()}` };
  ACCOUNTS = [account, ...ACCOUNTS];
  place(accountParty(account));
  SIGNED_IN = id;
  save();
  wrote();
  return id;
}

/** One ID check recorded, newest first — what it returns decides whether it can lift the level. */
export function recordCheck(person: string, check: Omit<IdCheck, "at">) {
  CHECKS = { ...CHECKS, [person]: [{ ...check, at: now() }, ...checksOf(person)] };
  save();
  wrote();
}

/**
 * Entries claimed, each sent as an Attestation request to the one who confirms it: the label, in
 * its Pro inbox, or Sureel. The request says what the confirmer is asked to sign.
 */
export function claimEntries(person: string, entries: readonly string[], confirmer: string, evidence?: string) {
  const who = partyById(person);
  const check = lastCheck(person);
  for (const entry of entries) {
    const party = partyById(entry);
    const code = party.isni ? `ISNI ${party.isni}` : party.ipi ? `IPI ${party.ipi}` : "no ISNI or IPI";
    const request = addRequest({
      type: "Attestation",
      from: person,
      to: confirmer,
      scope: { level: "Artist", ref: entry, name: party.name, assets: 0 },
      territory: WORLD,
      start: TODAY,
      deadline: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 7),
      received: now(),
      state: "Needs decision",
      purpose: `Confirm that ${who.name}'s ArtistID is the ${party.kind.toLowerCase()} entry ${party.name} (${code}). ID check: ${check ? check.outcome.toLowerCase() : "not done"}.${evidence ? ` Evidence: ${evidence}.` : ""}`,
    });
    CLAIMS = [{ id: `pc-${CLAIMS.length + 1}`, by: person, entry, request, confirmer, claimed: now(), evidence }, ...CLAIMS];
  }
  save();
  wrote();
}

/** The label or Sureel confirms a claim: its request is approved, and the profile reads verified. */
export const confirmClaim = (claim: ProfileClaim, decided: Decision) => setRequestState(claim.request, "Approved", decided);
/** …or refuses it: the entry is offered again, and the person can claim with evidence. */
export const declineClaim = (claim: ProfileClaim, decided: Decision) => setRequestState(claim.request, "Declined", decided);

/** Out of the new artist's ArtistID — the map's "Start as a new artist" begins again. */
export function signOut() {
  SIGNED_IN = undefined;
  save();
  wrote();
}

/** Every sign-up forgotten: the accounts' parties leave the graph, the entries are unclaimed again. */
function forget() {
  const ids = new Set(ACCOUNTS.map((one) => one.id));
  for (let at = parties.length - 1; at >= 0; at -= 1) if (ids.has(parties[at]!.id)) parties.splice(at, 1);
  UNCLAIMED.forEach((one) => {
    const kept = parties.find((each) => each.id === one.id);
    if (kept) kept.assurance = undefined;
  });
  ACCOUNTS = [];
  CLAIMS = [];
  CHECKS = {};
  SIGNED_IN = undefined;
  save();
}

load();
// Every write to the graph may confirm or refuse a claim: the levels are read again. A claim whose
// request the graph no longer holds means the demo was reset — the sign-ups go with it.
subscribe(() => {
  if (CLAIMS.some((one) => !requestOf(one))) forget();
  settle();
});
