import {
  ATTESTATIONS,
  CONFLICTS,
  CREDITS,
  GRANTS,
  PARTNERS,
  REQUESTS,
  TODAY,
  WORLD,
  addAttestation,
  addConflict,
  addGrant,
  assetById,
  grantById,
  partyById,
  partyName,
  setAttestationState,
  setCreditState,
  setGrantState,
  setRequestState,
  wrote,
} from "../../graph/fixtures";
import type { Asset, Attestation, Credit, Decision, Grant, Party, Request, TerritorySet } from "../../graph/model";
import { attestationsFor, clearanceOf, performersOf, requestsFor } from "../../graph/resolve";

/**
 * What the artist app knows that the graph does not hold — who the reader is in each persona,
 * their identity check, the profiles they claimed, their delegates, their society memberships —
 * and the writes the app makes, each one a claim through the graph's own setters. Nothing here
 * answers who owns or what is cleared: that is `resolve.ts`, asked by the pages.
 */

// ---------------------------------------------------------------------------------------------
// Who is reading

export const PERSONAS = ["Artist", "Writer", "Delegate"] as const;
export type Persona = (typeof PERSONAS)[number];

export interface Reader {
  persona: Persona;
  /** Whose rights the app is about — the delegate reads the artist's. */
  subject: Party;
  /** Who is acting, signed in. */
  actor: Party;
  /** What a delegate may approve; everything for the subject themself. */
  scope?: { uses: readonly string[]; words: string };
}

/** The moment a write is made: today, at the clock's time — the graph's "today" is a date. */
export const now = () => {
  const clock = new Date();
  return new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), clock.getHours(), clock.getMinutes());
};

export function readerOf(persona: Persona): Reader {
  if (persona === "Writer") return { persona, subject: partyById("p-ana"), actor: partyById("p-ana") };
  if (persona === "Delegate")
    return {
      persona,
      subject: partyById("p-mira"),
      actor: partyById("p-dara"),
      scope: { uses: ["Sync"], words: "sync approvals" },
    };
  return { persona, subject: partyById("p-mira"), actor: partyById("p-mira") };
}

/** How the subject is named to the reader: "you" for themself, their first name to a delegate. */
export const named = (reader: Reader) =>
  reader.persona === "Delegate"
    ? { you: reader.subject.name.split(" ")[0]!, your: `${reader.subject.name.split(" ")[0]}'s` }
    : { you: "you", your: "your" };

/** Who decided, and for whom — the "decided by" every write carries (G-5). */
export function decisionOf(reader: Reader, authority?: string): Decision {
  if (reader.persona === "Delegate")
    return {
      actor: reader.actor.name,
      onBehalfOf: reader.subject.name,
      authority: authority ? `Delegate scope: ${reader.scope!.words}, ${authority}` : `Delegate scope: ${reader.scope!.words}`,
      at: now(),
    };
  return { actor: reader.actor.name, authority, at: now() };
}

/**
 * Why the reader cannot take a decision that is the subject's own — undefined where they can.
 * A delegate approves only inside the scope the artist gave them (FRD roles: "If delegated").
 */
export function outOfScope(reader: Reader, what: { use?: string; kind: "credit" | "consent" | "request" }): string | undefined {
  if (reader.persona !== "Delegate") return undefined;
  const first = reader.subject.name.split(" ")[0];
  if (what.kind === "credit") return `A credit is confirmed with ${first}'s own ArtistID, never a delegate's.`;
  if (what.kind === "consent") return `Voice/NIL and the AI opt-out are ${first}'s to set — your delegation covers ${reader.scope!.words}.`;
  if (what.use && reader.scope!.uses.includes(what.use)) return undefined;
  return `Your delegation covers ${reader.scope!.words} only — ${what.use ?? "this"} is ${first}'s to answer.`;
}

// ---------------------------------------------------------------------------------------------
// Identity, profiles, delegates, societies — the app's own records

export interface Identity {
  email: string;
  phone: string;
  check: { method: string; at: Date; by: string };
  keyId: string;
  payee: string;
}

export const IDENTITY: Record<string, Identity> = {
  "p-mira": {
    email: "mira@castellanos.example",
    phone: "+34 612 448 019",
    check: { method: "Passport, with a live selfie", at: new Date(2026, 1, 2, 9, 58), by: "ArtistID" },
    keyId: "artistid-mira-2026a",
    payee: "Mira Castellanos (payee of Kestrel Point Recordings)",
  },
  "p-ana": {
    email: "ana.lindgren@songmail.example",
    phone: "+46 70 551 2290",
    check: { method: "National ID card, with a live selfie", at: new Date(2026, 4, 18, 10, 40), by: "ArtistID" },
    keyId: "artistid-ana-2026",
    payee: "Ana Lindgren (payee of Harbor Music)",
  },
};

export interface ClaimedProfile {
  id: string;
  party: string;
  name: string;
  kind: "Artist entry" | "Writer entry";
  standard: "isni" | "ipi";
  code?: string;
  /** Who confirmed the claim — the label or Sureel (S3-2). None while it waits. */
  confirmedBy?: string;
  claimed: Date;
  state: "Verified" | "Pending";
}

export let PROFILES: ClaimedProfile[] = [
  { id: "pf-1", party: "p-mira", name: "Mira Castellanos", kind: "Artist entry", standard: "isni", code: "0000000502916647", confirmedBy: "Kestrel Point Recordings", claimed: new Date(2026, 1, 2), state: "Verified" },
  { id: "pf-2", party: "p-mira", name: "M. Castellanos", kind: "Writer entry", standard: "ipi", claimed: new Date(2026, 9, 16), state: "Pending" },
  { id: "pf-3", party: "p-ana", name: "Ana Lindgren", kind: "Writer entry", standard: "ipi", code: "00734410925", confirmedBy: "Harbor Music", claimed: new Date(2026, 4, 18), state: "Verified" },
  { id: "pf-4", party: "p-ana", name: "A. Lindgren", kind: "Artist entry", standard: "isni", code: "0000000468213309", confirmedBy: "Sureel Rights Ops", claimed: new Date(2026, 4, 18), state: "Verified" },
];

export function claimProfile(profile: Omit<ClaimedProfile, "id" | "claimed" | "state">) {
  PROFILES = [{ ...profile, id: `pf-${PROFILES.length + 10}`, claimed: TODAY, state: "Pending" }, ...PROFILES];
  wrote();
}

export interface Delegate {
  id: string;
  for: string;
  name: string;
  email: string;
  role: "Manager" | "Lawyer";
  /** What they may approve on the artist's behalf. */
  scope: readonly string[];
  since: Date;
  state: "Active" | "Invited";
}

export const DELEGATE_SCOPES = ["Sync approvals", "Licence requests", "Credit reminders"] as const;

export let DELEGATES: Delegate[] = [
  { id: "dl-1", for: "p-mira", name: "Dara Whitlock", email: "dara@whitlockmgmt.example", role: "Manager", scope: ["Sync approvals"], since: new Date(2026, 2, 1), state: "Active" },
];

export function inviteDelegate(delegate: Omit<Delegate, "id" | "since" | "state">) {
  DELEGATES = [{ ...delegate, id: `dl-${DELEGATES.length + 10}`, since: TODAY, state: "Invited" }, ...DELEGATES];
  wrote();
}

/**
 * Where a writer's works earn, and whether they hold a society membership there (S3-9). Ana is
 * a PRS member; Germany and the United States collect for her works with nobody affiliated.
 */
export interface Membership {
  id: string;
  party: string;
  territory: string;
  country: string;
  society: string;
  state: "Acknowledged" | "Missing";
  /** How it is collected where she is not a member herself. */
  note: string;
}

export const MEMBERSHIPS: readonly Membership[] = [
  { id: "m-1", party: "p-ana", territory: "GB", country: "United Kingdom", society: "PRS for Music", state: "Acknowledged", note: "Member since 2019 — IPI 00734410925." },
  { id: "m-2", party: "p-ana", territory: "SE", country: "Sweden", society: "STIM", state: "Acknowledged", note: "Collected through PRS's reciprocal agreement." },
  { id: "m-3", party: "p-ana", territory: "DE", country: "Germany", society: "GEMA", state: "Missing", note: "No affiliation — Northbound's German income has no writer claim of yours." },
  { id: "m-4", party: "p-ana", territory: "US", country: "United States of America", society: "ASCAP, BMI or SESAC", state: "Missing", note: "No affiliation — US performance income for your works is unclaimed." },
];

/** A work's registrations, society by society. */
export interface Registration {
  workId: string;
  society: string;
  territory: string;
  state: "Acknowledged" | "Sent" | "Rejected" | "Missing";
}

export const REGISTRATIONS: readonly Registration[] = [
  { workId: "w-northbound", society: "PRS for Music", territory: "GB", state: "Acknowledged" },
  { workId: "w-northbound", society: "GEMA", territory: "DE", state: "Acknowledged" },
  { workId: "w-northbound", society: "ASCAP", territory: "US", state: "Missing" },
  { workId: "w-tidewater", society: "PRS for Music", territory: "GB", state: "Acknowledged" },
  { workId: "w-tidewater", society: "GEMA", territory: "DE", state: "Sent" },
  { workId: "w-tidewater", society: "ASCAP", territory: "US", state: "Missing" },
  { workId: "w-ferry", society: "PRS for Music", territory: "GB", state: "Sent" },
  { workId: "w-ember", society: "PRS for Music", territory: "GB", state: "Rejected" },
];

// ---------------------------------------------------------------------------------------------
// The subject's credits and requests

export const creditsOf = (party: string) => CREDITS.filter((one) => one.partyId === party);

/** The recordings the subject performs on — where an artist-level Voice/NIL answer attaches. */
export const performedOn = (party: string) =>
  [...new Set(creditsOf(party).map((one) => one.assetId))]
    .map(assetById)
    .filter((one) => one.kind === "Recording" && performersOf(one).includes(party));

/** Every recording and work the subject is credited on, once each. */
export const creditedAssets = (party: string): Asset[] =>
  [...new Set(creditsOf(party).map((one) => one.assetId))].map(assetById);

/** The requests that are the subject's to answer — their inbox. */
export const inboxOf = (party: string) => requestsFor(party);

export const isOpen = (request: Request) => request.state === "Needs decision" || request.state === "Escalated";

/** The request a credit confirmation was sent with, where one was. */
export const requestAbout = (creditId: string) => REQUESTS.find((one) => one.type === "Credit confirmation" && one.about === creditId);

// ---------------------------------------------------------------------------------------------
// Voice/NIL — the subject's own answers, partner by partner

/** The partners that ask for Voice/NIL. */
export const voicePartners = () => PARTNERS.filter((one) => one.uses.includes("Voice/NIL"));

/** The artist-level Voice/NIL grants standing for the subject, newest first. */
export const voiceGrantsOf = (party: string) =>
  GRANTS.filter((one) => one.level === "Artist" && one.ref === party && one.use === "Voice/NIL" && one.state !== "Revoked");

/** The standing AI opt-out — an artist-level deny for every partner (S3-5). */
export const optOutOf = (party: string): Grant | undefined =>
  voiceGrantsOf(party).find((one) => one.effect === "Deny" && one.conditions?.includes("AI opt-out"));

/** The grants a partner's answer stands on: the subject's own, and any made on their behalf. */
export const grantsFor = (party: string, partner: string) =>
  voiceGrantsOf(party).filter((one) =>
    one.partners.mode === "All approved" ? true : one.partners.mode === "Allowlist" ? one.partners.ids.includes(partner) : !one.partners.ids.includes(partner),
  );

/**
 * What the graph answers for a partner's Voice/NIL use of the subject — asked of the first
 * recording they perform on, where artist-level answers are read first. None where they perform on
 * nothing, and Voice/NIL attaches to no recording of theirs.
 */
export function voiceAnswer(party: string, partner: string) {
  const lead = performedOn(party)[0];
  return lead ? clearanceOf(lead.id, "Voice/NIL", { partner }) : undefined;
}

/** The attestations a label or another party made on the subject's behalf (S3-4). */
export const onBehalfOf = (party: string) => attestationsFor(party).filter((one) => one.onBehalfOf === party);

/** The conflict a dispute of an on-behalf attestation opened, where it did. */
export const disputeOf = (attestation: Attestation) =>
  CONFLICTS.find((one) => one.kind === "Attestation dispute" && one.parties.includes(attestation.attestor) && one.parties.includes(attestation.onBehalfOf ?? ""));

/** The Voice/NIL requests the opt-out refuses — every one about the subject that now resolves to deny. */
export function blockedBy(party: string) {
  const optOut = optOutOf(party);
  if (!optOut) return [];
  return REQUESTS.filter((one) => one.use === "Voice/NIL" && one.scope.level === "Artist" && one.scope.ref === party).filter(
    (one) => voiceAnswer(party, one.from)?.state === "Denied",
  );
}

// ---------------------------------------------------------------------------------------------
// Writes — each a claim, never an edit of the answer

const assuranceOf = (party: Party) => party.assurance ?? "Basic";
const keyOf = (party: Party) => IDENTITY[party.id]?.keyId ?? `artistid-${party.id}`;

/** S3-3: confirming signs a role attestation with the subject's ArtistID; the tier is the graph's to raise. */
export function confirmCredit(reader: Reader, credit: Credit) {
  setCreditState(credit.id, "Confirmed");
  addAttestation({
    attestor: reader.subject.id,
    subject: { kind: "Credit", id: credit.id },
    claim: "Role confirmed",
    assurance: assuranceOf(reader.subject),
    issued: now(),
    state: "Signed",
    keyId: keyOf(reader.subject),
  });
  const request = requestAbout(credit.id);
  if (request && isOpen(request)) setRequestState(request.id, "Approved", decisionOf(reader, "ArtistID role attestation"));
}

export function denyCredit(reader: Reader, credit: Credit) {
  setCreditState(credit.id, "Denied");
  addAttestation({
    attestor: reader.subject.id,
    subject: { kind: "Credit", id: credit.id },
    claim: "Role denied",
    assurance: assuranceOf(reader.subject),
    issued: now(),
    state: "Signed",
    keyId: keyOf(reader.subject),
  });
  const request = requestAbout(credit.id);
  if (request && isOpen(request)) setRequestState(request.id, "Declined", decisionOf(reader, "ArtistID role attestation"));
}

/** A partner let use the subject's voice and likeness — an artist-level grant, signed. */
export function grantVoice(reader: Reader, partner: string, limits: { territory?: TerritorySet; to?: Date; from?: Date } = {}) {
  for (const one of grantsFor(reader.subject.id, partner))
    if (one.grantedBy === reader.subject.id && one.effect === "Deny" && !one.conditions?.includes("AI opt-out")) setGrantState(one.id, "Revoked");
  addGrant({
    level: "Artist",
    ref: reader.subject.id,
    side: "Master",
    use: "Voice/NIL",
    effect: "Grant",
    partners: { mode: "Allowlist", ids: [partner] },
    territory: limits.territory ?? WORLD,
    from: limits.from ?? TODAY,
    to: limits.to,
    grantedBy: reader.subject.id,
    decided: decisionOf(reader),
    conditions: limits.territory || limits.to ? ["Limited by the artist"] : undefined,
    state: "Live",
  });
  addAttestation({
    attestor: reader.subject.id,
    subject: { kind: "Artist", id: reader.subject.id },
    claim: "Voice/NIL consent",
    assurance: assuranceOf(reader.subject),
    issued: now(),
    state: "Signed",
    keyId: keyOf(reader.subject),
  });
}

/** A partner refused — the subject's own deny, which reads before any grant at the same level. */
export function denyVoice(reader: Reader, partner: string) {
  for (const one of grantsFor(reader.subject.id, partner))
    if (one.grantedBy === reader.subject.id && one.effect === "Grant") setGrantState(one.id, "Revoked");
  addGrant({
    level: "Artist",
    ref: reader.subject.id,
    side: "Master",
    use: "Voice/NIL",
    effect: "Deny",
    partners: { mode: "Allowlist", ids: [partner] },
    territory: WORLD,
    from: TODAY,
    grantedBy: reader.subject.id,
    decided: decisionOf(reader),
    state: "Live",
  });
}

/**
 * S3-5: one switch. On, an artist-level deny for every partner and a signed opt-out; every open
 * Voice/NIL request in the subject's inbox is declined with the opt-out as its authority. Off, both
 * are revoked — a request already declined stays declined.
 */
export function setOptOut(reader: Reader, on: boolean) {
  const party = reader.subject.id;
  if (on) {
    addGrant({
      level: "Artist",
      ref: party,
      side: "Master",
      use: "Voice/NIL",
      effect: "Deny",
      partners: { mode: "All approved", ids: [] },
      territory: WORLD,
      from: TODAY,
      grantedBy: party,
      decided: decisionOf(reader),
      conditions: ["AI opt-out"],
      state: "Live",
    });
    addAttestation({
      attestor: party,
      subject: { kind: "Artist", id: party },
      claim: "AI opt-out",
      assurance: assuranceOf(reader.subject),
      issued: now(),
      state: "Signed",
      keyId: keyOf(reader.subject),
    });
    for (const one of inboxOf(party).filter((each) => each.use === "Voice/NIL" && isOpen(each)))
      setRequestState(one.id, "Declined", decisionOf(reader, "AI opt-out"));
    return;
  }
  const grant = optOutOf(party);
  if (grant) setGrantState(grant.id, "Revoked");
  const signed = ATTESTATIONS.find((one) => one.attestor === party && one.claim === "AI opt-out" && one.state === "Signed");
  if (signed) setAttestationState(signed.id, "Revoked");
}

/**
 * F3 step 3: disputing an attestation made on the subject's behalf opens a conflict with Sureel
 * and PAUSES the grant it signed — it never revokes it. Whether a dispute should pause or leave it
 * live is WMG legal's open question (FRD); this prototype pauses.
 */
export function disputeAttestation(reader: Reader, attestation: Attestation) {
  setAttestationState(attestation.id, "Disputed");
  const grant = attestation.subject.kind === "Grant" ? GRANTS.find((one) => one.id === attestation.subject.id) : undefined;
  if (grant) setGrantState(grant.id, "Paused");
  const partners = grant?.partners.ids.map(partyName).join(", ") ?? "the partner";
  addConflict({
    kind: "Attestation dispute",
    assetId: performedOn(reader.subject.id)[0]?.id ?? creditedAssets(reader.subject.id)[0]!.id,
    side: "Master",
    severity: "High",
    revenueAtRisk: 0,
    territories: ["World"],
    claims: [],
    parties: [attestation.attestor, reader.subject.id],
    opened: TODAY,
    state: "Open",
    step: 0,
    interim: `${grant?.use ?? "The"} grant to ${partners} paused pending review.`,
    raisedBy: "Artist app dispute",
  });
}

/** S4-3 in S3: a licence request answered. Approving a Voice/NIL licence is the subject's grant. */
export function approveRequest(reader: Reader, request: Request) {
  if (request.type === "Credit confirmation" && request.about) {
    const credit = CREDITS.find((one) => one.id === request.about);
    if (credit) return confirmCredit(reader, credit);
  }
  if (request.type === "Licence" && request.use === "Voice/NIL")
    grantVoice(reader, request.from, { territory: request.territory, from: request.start, to: request.end });
  setRequestState(request.id, "Approved", decisionOf(reader));
}

export function declineRequest(reader: Reader, request: Request) {
  if (request.type === "Credit confirmation" && request.about) {
    const credit = CREDITS.find((one) => one.id === request.about);
    if (credit) return denyCredit(reader, credit);
  }
  setRequestState(request.id, "Declined", decisionOf(reader));
}

// ---------------------------------------------------------------------------------------------
// Activity — every event involving the subject, newest first (S3-7)

export interface Event {
  id: string;
  at: Date;
  kind: "Request" | "Attestation" | "Blocked use" | "Consent" | "Conflict";
  title: string;
  /** Who acted, for whom, under what. */
  decided: Decision;
  status: `request:${Request["state"]}` | `attestation:${Attestation["state"]}` | `grant:${Grant["state"]}` | "conflict:Open" | "conflict:Awaiting evidence" | "conflict:Resolved" | "clearance:Denied";
  opens?: string;
}

/** What an attestation is about, in words: the credit's asset, the grant's use, the artist. */
function subjectName(one: Attestation) {
  if (one.subject.kind === "Credit") {
    const credit = CREDITS.find((each) => each.id === one.subject.id);
    return credit ? assetById(credit.assetId).title : "a credit";
  }
  if (one.subject.kind === "Asset") return assetById(one.subject.id).title;
  if (one.subject.kind === "Grant") {
    const grant = GRANTS.find((each) => each.id === one.subject.id);
    return grant ? `${grant.use} for ${grant.partners.ids.map(partyName).join(", ") || "every partner"}` : "a grant";
  }
  return partyName(one.subject.id);
}

export function eventsOf(party: string, open: { request: (id: string) => string; track: (id: string) => string; consent: string }): Event[] {
  const events: Event[] = [];
  for (const one of REQUESTS.filter((each) => each.to === party || (each.scope.level === "Artist" && each.scope.ref === party))) {
    events.push({
      id: `${one.id}-in`,
      at: one.received,
      kind: "Request",
      title: `${partyName(one.from)} asked: ${one.type === "Licence" ? `${one.use} licence` : one.type.toLowerCase()} — ${one.scope.name}`,
      decided: { actor: partyName(one.from), at: one.received },
      status: `request:${one.state}`,
      opens: one.to === party ? open.request(one.id) : undefined,
    });
    if (one.decided)
      events.push({
        id: `${one.id}-out`,
        at: one.decided.at,
        kind: one.decided.authority === "AI opt-out" ? "Blocked use" : "Request",
        title: `${one.state} by ${one.decided.actor}${one.decided.onBehalfOf ? ` for ${one.decided.onBehalfOf}` : ""}: ${one.use ?? one.type} — ${one.scope.name}`,
        decided: one.decided,
        status: `request:${one.state}`,
        opens: one.to === party ? open.request(one.id) : undefined,
      });
  }
  for (const one of attestationsFor(party))
    events.push({
      id: one.id,
      at: one.issued,
      kind: "Attestation",
      title: `${one.claim} — ${subjectName(one)}${one.onBehalfOf ? `, signed by ${partyName(one.attestor)} on your behalf` : ""}`,
      decided: { actor: partyName(one.attestor), onBehalfOf: one.onBehalfOf ? partyName(one.onBehalfOf) : undefined, authority: one.authority, at: one.issued },
      status: `attestation:${one.state}`,
      opens: one.subject.kind === "Credit" ? open.track(CREDITS.find((each) => each.id === one.subject.id)?.assetId ?? "") : open.consent,
    });
  for (const one of GRANTS.filter((each) => each.level === "Artist" && each.ref === party))
    events.push({
      id: one.id,
      at: one.decided.at,
      kind: one.effect === "Deny" ? "Blocked use" : "Consent",
      title: `${one.effect === "Deny" ? "Refused" : "Granted"} ${one.use}${one.partners.mode === "Allowlist" ? ` for ${one.partners.ids.map(partyName).join(", ")}` : " for every partner"}${one.conditions?.includes("AI opt-out") ? " — AI opt-out" : ""}`,
      decided: one.decided,
      status: `grant:${one.state}`,
      opens: open.consent,
    });
  for (const one of CONFLICTS.filter((each) => each.parties.includes(party)))
    events.push({
      id: one.id,
      at: one.opened,
      kind: "Conflict",
      title: `${one.kind} opened — ${one.interim}`,
      decided: { actor: one.raisedBy, at: one.opened },
      status: `conflict:${one.state}`,
      opens: open.consent,
    });
  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export { assetById, grantById, partyById, partyName };
