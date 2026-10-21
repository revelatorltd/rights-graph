import { formatCount, formatDate, formatMeta } from "@revelator/pro-ui";

import {
  ASSETS,
  ATTESTATIONS,
  CLOCK_DAYS,
  CREDITS,
  ESCALATIONS,
  GRANTS,
  NOTICES,
  PARTIES,
  PREFS,
  REQUESTS,
  TODAY,
  addEscalation,
  assetById,
  hear,
  noted,
  now,
  partyName,
  setClockDays,
  setRequestState,
  wrote,
  type GraphEvent,
} from "./fixtures";
import { COUNTERCLAIM_STEPS, type Conflict, type PartyKind, type Request, type RequestType } from "./model";
import { territoryLabel } from "./resolve";

/**
 * Notifications (FRD S4-4, S4-5) and the notices the flows need — "the artist is notified" (F3
 * step 2), "both sides see the outcome" (F3 step 5), "each step change notifies the other party"
 * (S2-8), "the contributor is notified" of a policy change (S7-8).
 *
 * The graph records what changed (`GraphEvent`, from every setter in `fixtures.ts`); this module
 * hears it and decides WHO is told WHAT, by which channel and when. A notice is always in-app; it
 * goes by push where the person has the artist app (push is S3's) and by email unless they turned
 * it off — at once, inside the FRD's five minutes, or batched into a digest. Nothing is really
 * sent: what would have gone out is the OUTBOX, read by a reviewer.
 *
 * Escalation: every request has a deadline. One unanswered past it goes up to the next role in its
 * organisation's policy, then again after the policy's wait, to the chain's end; the original owner
 * keeps it and is told where it went. The run reads the demo clock (`TODAY` run ahead by
 * `CLOCK_DAYS`), on load and whenever the clock moves.
 */

// ---------------------------------------------------------------------------------------------
// The model

export type Channel = "In-app" | "Push" | "Email";
export const CHANNELS: readonly Channel[] = ["In-app", "Push", "Email"];
export type Digest = "Off" | "Daily" | "Weekly";
export const QUIET = ["Off", "22:00–07:00", "21:00–08:00"] as const;
export type Quiet = (typeof QUIET)[number];

/** What one person chose: the channels beyond in-app, a digest for email, hours push keeps quiet. */
export interface Prefs {
  email: boolean;
  push: boolean;
  digest: Digest;
  quiet: Quiet;
}

/** Every kind of notice the graph sends — a closed set, so a page can read them by kind. */
export const NOTICE_KINDS = [
  "Request received",
  "Credit to confirm",
  "Signature requested",
  "Response requested",
  "Request decided",
  "Request auto-cleared",
  "Approved on your behalf",
  "Attested on your behalf",
  "Attestation disputed",
  "Attestation signed",
  "Dispute opened",
  "Conflict opened",
  "Conflict moved",
  "Conflict resolved",
  "Assigned to you",
  "Licence paused",
  "Licence revoked",
  "Licence resumed",
  "Policy changed",
  "Batch result",
  "Escalated to you",
  "Escalated",
  "Answered after escalation",
] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

/** What a notice is about — the record a product opens it on. */
export interface About {
  kind: "Request" | "Conflict" | "Grant" | "Attestation" | "Credit" | "Tenant" | "Batch";
  id: string;
}

export interface Notice {
  id: string;
  /** The person told — a `Person` id. */
  to: string;
  kind: NoticeKind;
  about: About;
  title: string;
  body: string;
  /** When it happened, on the demo clock. */
  at: Date;
  read: boolean;
  /** When it went, or goes, by each channel it is sent by — a time still to come is queued. */
  sent: Partial<Record<Channel, Date>>;
  /** The email went in a digest, not on its own. */
  digest?: "Daily" | "Weekly";
}

/** One step up: the request, which step, who held it and who it went to, and when. */
export interface Escalation {
  id: string;
  request: string;
  level: number;
  from: string;
  to: string;
  at: Date;
}

/** A role in an organisation, as the FRD's roles table names them, and the two that sit above. */
export type Role =
  | "Label member"
  | "Label admin"
  | "Publisher member"
  | "Publisher admin"
  | "Artist"
  | "Writer"
  | "Delegate"
  | "Contributor admin"
  | "Partner"
  | "Sureel ops"
  | "Data engineer"
  | "Revelator support";

export interface Person {
  id: string;
  name: string;
  email: string;
  /** The party they act in — an organisation, or themself. */
  party: string;
  role: Role;
  /** Where a push reaches them: the artist app on their phone (S3). None, no push. */
  device?: string;
  /** For a delegate: whose. */
  for?: string;
}

/** The people the graph notifies, named as the products name them. */
export const PEOPLE: readonly Person[] = [
  { id: "u-priya", name: "Priya Raman", email: "priya.raman@kestrelpoint.example", party: "p-kestrel", role: "Label admin" },
  { id: "u-sam", name: "Sam Adeyemi", email: "sam.adeyemi@kestrelpoint.example", party: "p-kestrel", role: "Label member" },
  { id: "u-elena", name: "Elena Marsh", email: "elena.marsh@harbormusic.example", party: "p-harbor", role: "Publisher admin" },
  { id: "u-jonah", name: "Jonah Pike", email: "jonah.pike@harbormusic.example", party: "p-harbor", role: "Publisher member" },
  { id: "u-owen", name: "Owen Brightwater", email: "owen.brightwater@silverbirch.example", party: "p-silverbirch", role: "Publisher admin" },
  { id: "u-mira", name: "Mira Castellanos", email: "mira@castellanos.example", party: "p-mira", role: "Artist", device: "Revelator app · iPhone" },
  { id: "u-ana", name: "Ana Lindgren", email: "ana.lindgren@songmail.example", party: "p-ana", role: "Writer", device: "Revelator app · Android" },
  { id: "u-tobi", name: "Tobi Renn", email: "tobi@renn.example", party: "p-tobi", role: "Artist", device: "Revelator app · Android" },
  { id: "u-juno", name: "Juno Hale", email: "juno@hale.example", party: "p-juno", role: "Artist", device: "Revelator app · iPhone" },
  { id: "u-ben", name: "Ben Okafor", email: "ben@okafor.example", party: "p-ben", role: "Writer" },
  { id: "u-dara", name: "Dara Whitlock", email: "dara@whitlockmgmt.example", party: "p-dara", role: "Delegate", device: "Revelator app · iPhone", for: "p-mira" },
  { id: "u-dana", name: "Dana Whitfield", email: "dana.whitfield@meridianmusic.example", party: "p-meridian", role: "Contributor admin" },
  { id: "u-maya", name: "Maya Chen", email: "maya.chen@cadence-ai.example", party: "p-cadence", role: "Partner" },
  { id: "u-lars", name: "Lars Ekdahl", email: "lars.ekdahl@openwave.example", party: "p-openwave-sync", role: "Partner" },
  { id: "u-katrin", name: "Katrin Vogel", email: "k.vogel@gema.example", party: "p-gema", role: "Partner" },
  { id: "u-andre", name: "André Silva", email: "andre.silva@voxa.example", party: "p-voxa", role: "Partner" },
  { id: "u-jonas", name: "Jonas Weber", email: "jonas.weber@tessellate.example", party: "p-tessellate", role: "Partner" },
  { id: "u-lior", name: "Lior Ben-Ami", email: "lior.benami@sureel.example", party: "p-sureel", role: "Sureel ops" },
  { id: "u-noor", name: "Noor Haddad", email: "noor.haddad@sureel.example", party: "p-sureel", role: "Sureel ops" },
  { id: "u-tomas", name: "Tomás Reyes", email: "tomas.reyes@sureel.example", party: "p-sureel", role: "Data engineer" },
  { id: "u-support", name: "Revelator support", email: "rights-support@revelator.example", party: "revelator", role: "Revelator support" },
];

/** The role a party's own team answers as, for a party with nobody named. */
const TEAM_ROLE: Partial<Record<PartyKind, Role>> = {
  Label: "Label admin",
  Distributor: "Label admin",
  Publisher: "Publisher admin",
  Contributor: "Contributor admin",
  "AI platform": "Partner",
  DSP: "Partner",
  Society: "Partner",
};

/** A party with nobody named in the prototypes is told as its rights team. */
const team = (partyId: string): Person | undefined => {
  const party = PARTIES.find((one) => one.id === partyId);
  if (!party) return undefined;
  const domain = party.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return { id: `team:${party.id}`, name: `${party.name} rights team`, email: `rights@${domain}.example`, party: party.id, role: TEAM_ROLE[party.kind] ?? "Partner" };
};

export const personById = (id: string): Person | undefined =>
  PEOPLE.find((one) => one.id === id) ?? (id.startsWith("team:") ? team(id.slice(5)) : undefined);
export const personName = (id: string) => personById(id)?.name ?? id;

/** Who hears for a party when no role is asked for: its admin, its contact, or the person themself. */
const FIRST: readonly Role[] = ["Label admin", "Publisher admin", "Contributor admin", "Partner", "Artist", "Writer", "Delegate", "Sureel ops"];
export function contactOf(partyId: string): Person | undefined {
  const rank = (role: Role) => (FIRST.includes(role) ? FIRST.indexOf(role) : FIRST.length);
  const named = PEOPLE.filter((one) => one.party === partyId && rank(one.role) < FIRST.length).sort((a, b) => rank(a.role) - rank(b.role));
  return named[0] ?? team(partyId);
}

/** A person's choices, over the defaults: email on, push where they have the app, no digest. */
export function prefsOf(personId: string): Prefs {
  const person = personById(personId);
  return { email: true, push: Boolean(person?.device), digest: "Off", quiet: "Off", ...PREFS[personId] };
}

// ---------------------------------------------------------------------------------------------
// The clock

const DAY = 24 * 60 * 60 * 1000;
const plusDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes());
const dayOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** The demo clock's day — `TODAY`, run ahead by the days a reviewer advanced it. */
export const clockDay = () => plusDays(TODAY, CLOCK_DAYS);
/** The demo clock's moment: when a notice written now is stamped. */
export const clockNow = () => plusDays(now(), CLOCK_DAYS);

// ---------------------------------------------------------------------------------------------
// Escalation policies

export interface Policy {
  /** What it applies to, as the console lists it. */
  name: string;
  /** The parties it applies to — by kind, or by name where an organisation set its own. */
  kinds?: readonly PartyKind[];
  parties?: readonly string[];
  /** Days an escalated item waits at each next role before it goes up again. */
  after: number;
  /** The roles an item climbs, bottom first. */
  chain: readonly Role[];
  /** The role an item enters at: the first allowed to answer it (FRD roles table). */
  enters: Role;
}

/** One per kind of organisation, and Harbor Music's own — the first that matches is the policy. */
export const POLICIES: readonly Policy[] = [
  { name: "Harbor Music", parties: ["p-harbor"], after: 5, chain: ["Publisher member", "Publisher admin", "Revelator support"], enters: "Publisher admin" },
  { name: "Labels and distributors", kinds: ["Label", "Distributor"], after: 7, chain: ["Label member", "Label admin", "Revelator support"], enters: "Label admin" },
  { name: "Publishers", kinds: ["Publisher"], after: 7, chain: ["Publisher member", "Publisher admin", "Revelator support"], enters: "Publisher admin" },
  { name: "Artists", kinds: ["Artist"], after: 7, chain: ["Artist", "Delegate", "Label admin"], enters: "Artist" },
  { name: "Writers", kinds: ["Writer"], after: 7, chain: ["Writer", "Delegate", "Publisher admin"], enters: "Writer" },
  { name: "Contributors", kinds: ["Contributor"], after: 7, chain: ["Contributor admin", "Sureel ops"], enters: "Contributor admin" },
  { name: "Partners", kinds: ["AI platform", "DSP", "Society"], after: 7, chain: ["Partner", "Sureel ops"], enters: "Partner" },
];

export function policyOf(partyId: string): Policy | undefined {
  const kind = PARTIES.find((one) => one.id === partyId)?.kind;
  return POLICIES.find((one) => one.parties?.includes(partyId)) ?? POLICIES.find((one) => kind && one.kinds?.includes(kind));
}

/** The label an artist records for, read off their credits; the publisher a writer is signed to. */
const labelOf = (partyId: string) =>
  ASSETS.find((one) => one.kind === "Recording" && one.labelId && CREDITS.some((each) => each.assetId === one.id && each.partyId === partyId))?.labelId;
const SIGNED_TO: Record<string, string> = { "p-ana": "p-harbor", "p-ben": "p-bensongs" };

/** Who holds a role, for an item in this party's inbox. */
function holder(role: Role, partyId: string): Person | undefined {
  const kind = PARTIES.find((one) => one.id === partyId)?.kind;
  const named = (party: string | undefined) => PEOPLE.find((one) => one.party === party && one.role === role);
  switch (role) {
    case "Revelator support":
      return personById("u-support");
    case "Sureel ops":
      return personById("u-lior");
    case "Delegate":
      return PEOPLE.find((one) => one.role === "Delegate" && one.for === partyId);
    case "Label admin":
    case "Label member": {
      const label = kind === "Label" || kind === "Distributor" ? partyId : labelOf(partyId);
      return named(label) ?? (role === "Label admin" && label ? team(label) : undefined);
    }
    case "Publisher admin":
    case "Publisher member": {
      const publisher = kind === "Publisher" ? partyId : SIGNED_TO[partyId];
      return named(publisher) ?? (role === "Publisher admin" && publisher ? team(publisher) : undefined);
    }
    default:
      return contactOf(partyId);
  }
}

/** The people an item in a party's inbox climbs through, its owner first — none twice, none missing. */
export function chainFor(request: Request): readonly Person[] {
  const policy = policyOf(request.to);
  if (!policy) return [];
  const roles = policy.chain.slice(Math.max(0, policy.chain.indexOf(policy.enters)));
  const people: Person[] = [];
  for (const role of roles) {
    const one = holder(role, request.to);
    if (one && !people.some((each) => each.id === one.id)) people.push(one);
  }
  return people;
}

/** Who a request is with: its owner, or the last role it went up to. */
export const ownerOf = (request: Request) => chainFor(request)[0];
export const escalationsOf = (requestId: string) =>
  ESCALATIONS.filter((one) => one.request === requestId).sort((a, b) => a.level - b.level);
/** Where an unanswered item goes next, and on what day — none past the chain's end. */
export function nextStepOf(request: Request): { to: Person; on: Date } | undefined {
  if (request.state !== "Needs decision" && request.state !== "Escalated") return undefined;
  const policy = policyOf(request.to);
  const chain = chainFor(request);
  const steps = escalationsOf(request.id);
  const to = chain[steps.length + 1];
  if (!policy || !to) return undefined;
  const last = steps.at(-1);
  return { to, on: last ? plusDays(dayOf(last.at), policy.after) : plusDays(dayOf(request.deadline), 1) };
}

// ---------------------------------------------------------------------------------------------
// Delivery

/** Push waits out quiet hours; it goes when they end. */
function pushAt(at: Date, quiet: Quiet): Date {
  const soon = new Date(at.getTime() + 60_000);
  if (quiet === "Off") return soon;
  const [from, to] = quiet === "22:00–07:00" ? [22, 7] : [21, 8];
  const hour = soon.getHours();
  if (hour >= from) return new Date(soon.getFullYear(), soon.getMonth(), soon.getDate() + 1, to);
  if (hour < to) return new Date(soon.getFullYear(), soon.getMonth(), soon.getDate(), to);
  return soon;
}

/** Email goes at once, or in the next digest — daily at 08:00, weekly on Monday at 08:00. */
function emailAt(at: Date, digest: Digest): Date {
  if (digest === "Off") return new Date(at.getTime() + 120_000);
  const next = new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, 8);
  if (digest === "Daily") return next;
  return new Date(next.getFullYear(), next.getMonth(), next.getDate() + ((8 - next.getDay()) % 7), 8);
}

/** Kinds that never wait for a digest: something now needs the reader's answer, or went over them. */
const URGENT: readonly NoticeKind[] = ["Escalated to you", "Escalated", "Attested on your behalf", "Licence paused", "Licence revoked"];

let pending: Notice[] = [];
const numbered = () =>
  [...NOTICES, ...pending].reduce((most, one) => Math.max(most, Number(one.id.replace("n-", "")) || 0), 0) + 1;

/** One notice to one person, by every channel their choices allow. A repeat of one just sent is dropped. */
function tell(to: Person | undefined, kind: NoticeKind, about: About, title: string, body: string, at: Date = clockNow()) {
  if (!to) return;
  const same = (one: Notice) => one.to === to.id && one.title === title && Math.abs(one.at.getTime() - at.getTime()) < 5 * 60_000;
  if (pending.some(same) || NOTICES.some(same)) return;
  const prefs = prefsOf(to.id);
  const digest = prefs.email && prefs.digest !== "Off" && !URGENT.includes(kind) ? prefs.digest : undefined;
  pending.push({
    id: `n-${numbered()}`,
    to: to.id,
    kind,
    about,
    title,
    body,
    at,
    read: false,
    sent: {
      "In-app": at,
      ...(prefs.push && to.device ? { Push: pushAt(at, prefs.quiet) } : {}),
      ...(prefs.email ? { Email: emailAt(at, digest ?? "Off") } : {}),
    },
    ...(digest ? { digest } : {}),
  });
}

/** The notices told while one write was heard, handed to the graph to keep with it. */
function flush() {
  if (!pending.length) return;
  noted(pending);
  pending = [];
}

// ---------------------------------------------------------------------------------------------
// What each write tells whom

/** A request, named by what it asks. */
export function askOf(request: Request): string {
  if (request.type === "Licence") return `${request.use} for ${partyName(request.from)}`;
  if (request.type === "Credit confirmation") return `Credit on ${request.scope.name}`;
  if (request.type === "Conflict response") return `Conflict response on ${request.scope.name}`;
  if (request.type === "Attestation") {
    const claim = ATTESTATIONS.find((one) => one.id === request.about)?.claim;
    return `${claim ?? "Attestation"} signature from ${partyName(request.to)}`;
  }
  return `${request.use ?? "Approval"} on ${request.scope.name}`;
}

const RECEIVED: Record<RequestType, NoticeKind> = {
  Licence: "Request received",
  "Credit confirmation": "Credit to confirm",
  Attestation: "Signature requested",
  "Conflict response": "Response requested",
  "Delegate approval": "Approved on your behalf",
};

const VERB: Partial<Record<Request["state"], string>> = { Approved: "approved", Declined: "declined", Countered: "countered" };
/** "Priya Raman · for Mira Castellanos · under AGR-310 §7.4" — the decided-by line, in words (G-5). */
const decidedLine = (decided: Request["decided"]) =>
  (decided && formatMeta([decided.actor, decided.onBehalfOf ? `for ${decided.onBehalfOf}` : "", decided.authority ? `under ${decided.authority}` : ""].filter(Boolean))) ?? "";
/** A person-party named on a decision as the one it was taken for. */
const personNamed = (name: string | undefined) =>
  PARTIES.find((one) => one.name === name && ["Artist", "Writer"].includes(one.kind));

function requestAdded(request: Request) {
  const owner = ownerOf(request);
  const where = `${formatMeta([request.scope.name, territoryLabel(request.territory), `answer by ${formatDate(request.deadline, "day")}`])}.`;
  const about: About = { kind: "Request", id: request.id };
  if (request.type === "Delegate approval") {
    tell(contactOf(request.to), "Approved on your behalf", about, `${partyName(request.from)} approved ${askOf(request)} for you`, `${formatMeta([decidedLine(request.decided), territoryLabel(request.territory)].filter(Boolean))}.`);
    return;
  }
  if (request.state === "Auto-cleared") {
    tell(contactOf(request.from), "Request auto-cleared", about, `Auto-cleared: ${request.use} on ${request.scope.name}`, "A standing grant cleared it. Nothing to wait for.");
    return;
  }
  if (request.type === "Attestation") {
    // Signed on their behalf already, the request is the record of it — told as the attestation.
    const signed = ATTESTATIONS.find((one) => one.id === request.about && one.onBehalfOf && one.state === "Signed");
    if (!signed) tell(owner, "Signature requested", about, `Signature requested: ${askOf(request)}`, `${request.purpose} Answer by ${formatDate(request.deadline, "day")}.`);
    return;
  }
  const title =
    request.type === "Licence"
      ? `New request: ${askOf(request)}`
      : request.type === "Credit confirmation"
        ? `Confirm your credit on ${request.scope.name}`
        : `${partyName(request.from)} asks for your response on ${request.scope.name}`;
  tell(owner, RECEIVED[request.type], about, title, where);
}

function requestDecided(before: Request, after: Request) {
  const about: About = { kind: "Request", id: after.id };
  const verb = VERB[after.state];
  if (!verb || before.state === after.state) return;
  const line = decidedLine(after.decided);
  tell(contactOf(after.from), "Request decided", about, `${partyName(after.to)} ${verb} your ${after.type === "Licence" ? `${after.use} request` : after.type.toLowerCase()}`, line ? `${line}.` : "");
  // Taken by a delegate for the artist: the artist is told (S3-8). A label attesting for its artist
  // is told from the attestation it signs, which says under what (S1-7).
  const behalf = personNamed(after.decided?.onBehalfOf);
  const delegate = PEOPLE.find((one) => one.name === after.decided?.actor && one.role === "Delegate");
  if (behalf && delegate) tell(contactOf(behalf.id), "Approved on your behalf", about, `${delegate.name} ${verb} ${askOf(after)} for you`, `${line}.`);
  // Whoever it had gone up to stands down.
  for (const step of escalationsOf(after.id))
    tell(personById(step.to), "Answered after escalation", about, `Answered: ${askOf(after)}`, `${partyName(after.to)} ${verb} it${line ? ` — ${line}` : ""}. Nothing more is owed from you.`);
}

function conflictTitle(conflict: Conflict) {
  return `${conflict.kind} on ${assetById(conflict.assetId)?.title ?? conflict.assetId}`;
}
const opsOf = (conflict: Conflict) => PEOPLE.find((one) => one.name === conflict.assignee && one.party === "p-sureel") ?? personById("u-lior");

function conflictAdded(conflict: Conflict) {
  const about: About = { kind: "Conflict", id: conflict.id };
  const title = conflictTitle(conflict);
  if (conflict.kind === "Attestation dispute") {
    // The artist raised it: they hear it is open and what it paused; ops hears it is queued. The
    // label hears of it from the attestation it signed (below).
    const artist = conflict.parties.find((one) => ["Artist", "Writer"].includes(PARTIES.find((each) => each.id === one)?.kind ?? "Label"));
    if (artist) tell(contactOf(artist), "Dispute opened", about, "Your dispute is open", `${conflict.interim} Not revoked — Sureel reviews it, and you'll hear the outcome here.`);
    tell(opsOf(conflict), "Dispute opened", about, `Dispute opened: ${title}`, `${formatMeta([conflict.parties.map(partyName).join(" and "), conflict.severity, "in your queue"])}.`);
    return;
  }
  for (const party of conflict.parties)
    tell(contactOf(party), "Conflict opened", about, `Conflict opened: ${title}`, `${conflict.interim} Raised by ${conflict.raisedBy}.`);
  tell(opsOf(conflict), "Conflict opened", about, `Conflict opened: ${title}`, `${formatMeta([conflict.severity, conflict.parties.map(partyName).join(", "), "in the queue"])}.`);
}

function conflictUpdated(before: Conflict, after: Conflict, by?: string) {
  const about: About = { kind: "Conflict", id: after.id };
  const title = conflictTitle(after);
  const others = after.parties.filter((one) => one !== by);
  if (after.state === "Resolved" && before.state !== "Resolved") {
    // Both sides see the outcome (F3 step 5), with its reason and who decided it.
    const reason = after.resolution ? `${after.resolution.reason} ${decidedLine(after.resolution)}.` : "Resolved.";
    for (const party of after.parties) tell(contactOf(party), "Conflict resolved", about, `Resolved: ${title}`, reason);
    return;
  }
  if (after.step > before.step) {
    // Each step change notifies the other party (S2-8) — every party where the mover is not named.
    const step = COUNTERCLAIM_STEPS[after.step] ?? "";
    for (const party of others) tell(contactOf(party), "Conflict moved", about, `${title}: ${step}`, `${by ? `${partyName(by)} moved it on` : "It moved on"} — step ${after.step + 1} of ${COUNTERCLAIM_STEPS.length}. ${after.interim}`);
  } else if (after.state !== before.state) {
    for (const party of others) tell(contactOf(party), "Conflict moved", about, `${title}: ${after.state}`, after.interim);
  }
  if (after.assignee && after.assignee !== before.assignee) {
    const ops = PEOPLE.find((one) => one.name === after.assignee);
    tell(ops, "Assigned to you", about, `Assigned to you: ${title}`, `${formatMeta([after.severity, after.parties.map(partyName).join(", ")])}.`);
  }
}

function onEvent(event: GraphEvent) {
  switch (event.kind) {
    case "request.added":
      return requestAdded(event.after);
    case "request.state":
      return requestDecided(event.before, event.after);
    case "credit.state": {
      const { before, after } = event;
      if (before.state === after.state || after.state === "To confirm") return;
      // A confirmation asked for through the inbox is answered there, and told as the request.
      if (REQUESTS.some((one) => one.about === after.id && one.type === "Credit confirmation")) return;
      const asset = assetById(after.assetId);
      const label = asset?.labelId;
      if (label) tell(contactOf(label), "Request decided", { kind: "Credit", id: after.id }, `${after.credited} ${after.state === "Confirmed" ? "confirmed" : "denied"} the ${after.role.toLowerCase()} credit on ${asset.title}`, "Signed with their ArtistID.");
      return;
    }
    case "attestation.added": {
      const one = event.after;
      if (!one.onBehalfOf || one.state !== "Signed") return;
      const grant = one.subject.kind === "Grant" ? GRANTS.find((each) => each.id === one.subject.id) : undefined;
      const partners = grant?.partners.ids.map(partyName).join(", ") || "approved partners";
      tell(
        contactOf(one.onBehalfOf),
        "Attested on your behalf",
        { kind: "Attestation", id: one.id },
        grant ? `${partyName(one.attestor)} approved ${grant.use} for ${partners} on your behalf` : `${partyName(one.attestor)} attested ${one.claim} on your behalf`,
        `${one.authority ? `Under ${one.authority}. ` : ""}You can view it, and dispute it: a dispute opens a conflict, it doesn't silently revoke.`,
      );
      return;
    }
    case "attestation.state": {
      const { before, after } = event;
      if (before.state === after.state) return;
      const about: About = { kind: "Attestation", id: after.id };
      if (after.state === "Disputed" && after.onBehalfOf) {
        const grant = after.subject.kind === "Grant" ? GRANTS.find((each) => each.id === after.subject.id) : undefined;
        tell(
          contactOf(after.attestor),
          "Attestation disputed",
          about,
          `${partyName(after.onBehalfOf)} disputed your ${after.claim} attestation`,
          `You attested${after.authority ? ` under ${after.authority}` : ""} on their behalf.${grant ? ` The grant to ${grant.partners.ids.map(partyName).join(", ") || "approved partners"} is paused` : ""}; Sureel ops reviews both claims.`,
        );
      }
      if (after.state === "Signed" && before.state === "Requested" && after.onBehalfOf)
        tell(contactOf(after.attestor), "Attestation signed", about, `${partyName(after.onBehalfOf)} signed the ${after.claim} you recorded`, "Signed with their ArtistID.");
      return;
    }
    case "grant.state": {
      const { before, after } = event;
      if (before.state === after.state) return;
      const kind: NoticeKind | undefined =
        after.state === "Paused" ? "Licence paused" : after.state === "Revoked" ? "Licence revoked" : before.state === "Paused" ? "Licence resumed" : undefined;
      if (!kind || after.partners.mode !== "Allowlist") return;
      const on = after.level === "Catalogue" ? `${partyName(after.ref)} catalogue` : partyName(after.ref) === after.ref ? (assetById(after.ref)?.title ?? after.ref) : partyName(after.ref);
      const body =
        after.state === "Paused"
          ? "Paused pending review, not revoked — don't use it until it resumes."
          : after.state === "Revoked"
            ? "Revoked. Stop using it; what you made before stays covered by its receipts."
            : "Live again — you may use it on its terms.";
      for (const partner of after.partners.ids) tell(contactOf(partner), kind, { kind: "Grant", id: after.id }, `${kind}: ${after.use} on ${on}`, body);
      return;
    }
    case "conflict.added":
      return conflictAdded(event.after);
    case "conflict.updated":
      return conflictUpdated(event.before, event.after, event.by);
    case "sharing": {
      const about: About = { kind: "Tenant", id: event.tenant };
      if (event.by)
        tell(contactOf(event.tenant), "Policy changed", about, `Sureel changed your sharing: ${event.field} is now ${event.after}`, `It was ${event.after === event.before ? "the same" : event.before}. Changed by ${event.by}, and logged in your access log.`);
      else
        tell(personById("u-lior"), "Policy changed", about, `${partyName(event.tenant)} made ${event.field} ${event.after}`, `It was ${event.before}. Their own change, in their tenant.`);
      return;
    }
    case "batch.state": {
      const { before, after } = event;
      if (before.state === after.state || (after.state !== "Matched" && after.state !== "Row errors" && after.state !== "Rejected")) return;
      tell(
        contactOf(after.contributor),
        "Batch result",
        { kind: "Batch", id: after.id },
        `${after.file}: ${after.state}`,
        after.state === "Row errors" ? "Validation stopped it before ingest. Fix the rows and resubmit." : after.state === "Matched" ? "Matching finished — your match results are ready." : "Rejected before ingest.",
      );
    }
  }
}

// Heard after the write and before the pages draw: the write's own `wrote()` keeps what it told.
hear((event) => {
  onEvent(event);
  flush();
});

// ---------------------------------------------------------------------------------------------
// The escalation run

/**
 * Every unanswered request whose deadline — or whose last step's wait — has passed on the demo
 * clock goes up one role, and up again while the clock is past the next wait. The role it reaches
 * is told it is theirs now; the original owner is told where it went, and keeps it. Returns how
 * many steps were taken.
 */
export function escalate(): number {
  const today = clockDay();
  let taken = 0;
  for (const request of REQUESTS) {
    const chain = chainFor(request);
    let moved = false;
    for (let next = nextStepOf(request); next && next.on <= today; next = nextStepOf(request)) {
      const steps = escalationsOf(request.id);
      const from = chain[steps.length]!;
      const when = new Date(next.on.getTime() + 5 * 60_000);
      const id = `es-${ESCALATIONS.reduce((most, one) => Math.max(most, Number(one.id.replace("es-", "")) || 0), 0) + 1}`;
      addEscalation({ id, request: request.id, level: steps.length + 1, from: from.id, to: next.to.id, at: when });
      const about: About = { kind: "Request", id: request.id };
      const waited = steps.length ? `${who(from)} had it ${formatDate(steps.at(-1)!.at, "day")} and didn't answer` : `${who(from)} hasn't answered since ${formatDate(request.received, "day")}; the deadline was ${formatDate(request.deadline, "day")}`;
      tell(next.to, "Escalated to you", about, `Escalated to you: ${askOf(request)}${next.to.party === request.to ? "" : `, for ${partyName(request.to)}`}`, `${waited}.`, when);
      const owner = chain[0];
      if (owner && owner.id !== next.to.id)
        tell(owner, "Escalated", about, `${askOf(request)} went to ${next.to.name}`, `Unanswered past ${steps.length ? "its next wait" : `its deadline of ${formatDate(request.deadline, "day")}`}, it moved up to ${who(next.to)}. It is still yours: answer it and they stand down.`, when);
      flush();
      taken += 1;
      moved = true;
    }
    if (moved && request.state !== "Escalated") setRequestState(request.id, "Escalated", request.decided);
  }
  if (taken) wrote();
  return taken;
}

/** "Priya Raman (Label admin)", or a desk's name alone where the name is the role. */
const who = (person: Person) => (person.name === person.role ? person.name : `${person.name} (${person.role})`);

/** The demo's control: run the clock ahead by so many days, and escalate what that leaves unanswered. */
export function advanceClock(days: number) {
  setClockDays(CLOCK_DAYS + days);
  return escalate();
}
/** Back to `TODAY`. What escalated stays escalated — the clock does not take a step back. */
export const clockToToday = () => setClockDays(0);

// ---------------------------------------------------------------------------------------------
// What was sent — the outbox a reviewer reads in place of real email and push

export interface Sent {
  id: string;
  channel: "Email" | "Push";
  to: Person;
  /** The email address, or the device a push reaches. */
  address: string;
  subject: string;
  body: string;
  /** When it went — or, still to come on the demo clock, when it goes. */
  at: Date;
  state: "Sent" | "Queued";
  /** Why it waits, where it does. */
  waits?: string;
  digest?: "Daily" | "Weekly";
  /** The notices it carries — one, or a digest's several. */
  notices: readonly Notice[];
}

export function outbox(): Sent[] {
  const moment = clockNow();
  const rows: Sent[] = [];
  const digests = new Map<string, Notice[]>();
  for (const notice of NOTICES) {
    const person = personById(notice.to);
    if (!person) continue;
    const push = notice.sent.Push;
    if (push && person.device)
      rows.push({
        id: `${notice.id}-push`,
        channel: "Push",
        to: person,
        address: person.device,
        subject: notice.title,
        body: notice.body,
        at: push,
        state: push <= moment ? "Sent" : "Queued",
        waits: push <= moment ? undefined : push.getTime() - notice.at.getTime() > 5 * 60_000 ? `Quiet hours until ${formatDate(push, "minute")}` : "Sending, within five minutes",
        notices: [notice],
      });
    const email = notice.sent.Email;
    if (!email) continue;
    if (notice.digest) {
      const key = `${person.id}|${email.getTime()}|${notice.digest}`;
      digests.set(key, [...(digests.get(key) ?? []), notice]);
      continue;
    }
    rows.push({
      id: `${notice.id}-email`,
      channel: "Email",
      to: person,
      address: person.email,
      subject: notice.title,
      body: notice.body,
      at: email,
      state: email <= moment ? "Sent" : "Queued",
      waits: email > moment ? "Sending, within five minutes" : undefined,
      notices: [notice],
    });
  }
  for (const [key, notices] of digests) {
    const [personId, time, digest] = key.split("|") as [string, string, "Daily" | "Weekly"];
    const person = personById(personId)!;
    const at = new Date(Number(time));
    rows.push({
      id: `digest-${personId}-${time}`,
      channel: "Email",
      to: person,
      address: person.email,
      subject: `Your ${digest.toLowerCase()} digest: ${formatCount(notices.length, { one: "notification", many: "notifications" })}`,
      body: notices.map((one) => `${one.title}. ${one.body}`).join("\n\n"),
      at,
      state: at <= moment ? "Sent" : "Queued",
      waits: at > moment ? `${digest} digest at ${formatDate(at, "minute")}` : undefined,
      digest,
      notices,
    });
  }
  return rows.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export const noticesFor = (personId: string) => NOTICES.filter((one) => one.to === personId).sort((a, b) => b.at.getTime() - a.at.getTime());
export const unreadFor = (personId: string) => NOTICES.filter((one) => one.to === personId && !one.read).length;

// On load, and so on every reload: whatever the clock already passed is escalated.
escalate();

/** For the escalation page: how long until it goes, in whole days on the demo clock. */
export const daysUntil = (date: Date) => Math.round((dayOf(date).getTime() - clockDay().getTime()) / DAY);
