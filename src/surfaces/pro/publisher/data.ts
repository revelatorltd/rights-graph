import { formatMeta, formatPercent } from "@revelator/pro-ui";

import {
  AGREEMENTS,
  ASSERTIONS,
  CONFLICTS,
  CREDITS,
  MERGES,
  TODAY,
  addAssertion,
  addConflict,
  assetById,
  partyById,
  partyName,
  recordings,
  updateConflict,
  withdrawAssertion,
  works,
  wrote,
} from "../../../graph/fixtures";
import type { Agreement, Assertion, Asset, Conflict, Interest, RightType, ShareType, TerritorySet } from "../../../graph/model";
import { covers, shareTotals, standing, stateForNewClaim, worksOf, type NewClaim } from "../../../graph/resolve";
import { href } from "../../../route";

/**
 * What the publisher workspace reads that the shared graph does not hold yet — and the way it
 * reads the graph as ONE publisher. The reader works as Harbor Music; everything here is read off
 * the graph by id, never copied. What the model has no home for (registrations, evidence on a
 * conflict, suggested links) is held here and logged in `docs/gaps/s2-publisher.md`.
 */

/** Who the reader is working as, and who acts for it. */
export const ME = "p-harbor";
export const ACTOR = "Elena Marsh";
export const MY_NAME = "Harbor Music";
/** The agreement Harbor's authority to grant comes from — its songwriter agreement's administration clause. */
export const MY_AUTHORITY = "AGR-101 §4.2";

/** The moment a decision taken now is stamped with — today, at the clock's hour. */
export function now() {
  const at = new Date(TODAY);
  const clock = new Date();
  at.setHours(clock.getHours(), clock.getMinutes());
  return at;
}

/** A day as the graph holds it — its first moment, so a claim or grant dated today is live today. */
export function dayOf(value: Date): Date;
export function dayOf(value: Date | undefined): Date | undefined;
export function dayOf(value: Date | undefined) {
  if (!value) return undefined;
  const at = new Date(value);
  at.setHours(0, 0, 0, 0);
  return at;
}

/** A Decision taken here, by the reader, for Harbor Music. */
export const decidedNow = (authority: string = MY_AUTHORITY) => ({ actor: ACTOR, onBehalfOf: MY_NAME, authority, at: now() });

// ---------------------------------------------------------------------------------------------
// Addresses — `#/pro/rights/<page>/<id>/<facet>`

export const rightsHref = (...path: (string | undefined)[]) => href("pro", "rights", ...path);
/** A recording's rights tab — the catalogue's page, another builder's. */
export const trackRightsHref = (id: string) => href("pro", "catalog", "tracks", id, "rights");

// ---------------------------------------------------------------------------------------------
// Territory — the codes the graph holds, named as the system's closed set names a country.

export const COUNTRY: Record<string, string> = {
  GB: "United Kingdom",
  US: "United States of America",
  CA: "Canada",
  FR: "France",
  DE: "Germany",
  AT: "Austria",
  CH: "Switzerland",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  BE: "Belgium",
  JP: "Japan",
};
export const countryName = (code: string) => COUNTRY[code] ?? code;

/** The territory sets a claim or a grant written here can take — until the system has a territory picker. */
export const TERRITORY_SETS: Record<string, TerritorySet> = {
  World: { include: "World" },
  "World excl. DE, AT, CH": { include: "World", exclude: ["DE", "AT", "CH"] },
  "DE, AT, CH": { include: ["DE", "AT", "CH"] },
  DE: { include: ["DE"] },
  GB: { include: ["GB"] },
  US: { include: ["US"] },
  FR: { include: ["FR"] },
};

/** The countries a work is read in: the two it always earns in, then every one its claims or conflicts name. */
export function territoriesOf(work: Asset): string[] {
  const named = new Set<string>(["GB", "US"]);
  for (const one of ASSERTIONS.filter((each) => each.assetId === work.id && standing(each))) {
    if (one.territory.include !== "World") for (const code of one.territory.include) named.add(code);
    for (const code of one.territory.exclude ?? []) named.add(code);
  }
  for (const one of CONFLICTS.filter((each) => each.assetId === work.id)) for (const code of one.territories) if (code !== "World") named.add(code);
  return [...named];
}

// ---------------------------------------------------------------------------------------------
// The publisher's works

/** The works Harbor Music holds a standing claim on — its catalogue, as the graph has it. */
export const myWorks = () =>
  works().filter((work) => ASSERTIONS.some((one) => one.assetId === work.id && one.partyId === ME && standing(one)));

/** Harbor's own claims on a work. */
export const myClaims = (workId: string) => ASSERTIONS.filter((one) => one.assetId === workId && one.partyId === ME);

/** The open conflicts that name Harbor Music. */
export const myConflicts = () => CONFLICTS.filter((one) => one.parties.includes(ME));

/** Harbor's own publisher share on a work, world — its largest standing ownership claim there. */
export function myShare(workId: string): number | null {
  const owning = myClaims(workId).filter((one) => standing(one) && one.interests.includes("Owns") && one.shareType === "Publisher");
  const world = owning.filter((one) => one.territory.include === "World" && !one.territory.exclude?.length);
  const read = world.length ? world : owning;
  return read.length ? Math.max(...read.map((one) => one.share)) : null;
}

/** The society a party is affiliated with, as the society is named. */
export const SOCIETY_NAMES: Record<string, string> = { PRS: "PRS for Music", GEMA: "GEMA", ASCAP: "ASCAP" };
export const societyOf = (partyId: string) => {
  const society = partyById(partyId)?.society;
  return society ? (SOCIETY_NAMES[society] ?? society) : undefined;
};

// ---------------------------------------------------------------------------------------------
// Writers

export interface Writer {
  partyId: string;
  name: string;
  role: string;
  ipi?: string;
  society?: string;
  credit: "Confirmed" | "To confirm" | "Denied";
  /** The writer's own share claim, where one is on file. */
  claim?: Assertion;
  /** Who publishes them on this work, by the agreement that says so. */
  publisher?: { partyId: string; agreement?: Agreement };
}

const PUBLISHING: readonly Agreement["kind"][] = ["Publishing", "Administration"];

/** The publishing agreement a writer is signed under, with the publisher holding a claim on the work. */
function publisherOf(workId: string, writerId: string): Writer["publisher"] {
  for (const agreement of AGREEMENTS.filter((one) => PUBLISHING.includes(one.kind) && one.parties.includes(writerId))) {
    const publisher = agreement.parties.find((one) => one !== writerId)!;
    if (ASSERTIONS.some((one) => one.assetId === workId && one.partyId === publisher && standing(one))) return { partyId: publisher, agreement };
  }
  return undefined;
}

/** The writers credited on a work — a credit the writer denied is kept, and says so. */
export function writersOf(workId: string): Writer[] {
  return CREDITS.filter((one) => one.assetId === workId).map((credit) => {
    const party = partyById(credit.partyId);
    return {
      partyId: party.id,
      name: party.name,
      role: credit.role,
      ipi: party.ipi,
      society: societyOf(party.id),
      credit: credit.state,
      claim: ASSERTIONS.find((one) => one.assetId === workId && one.partyId === party.id && one.shareType === "Writer" && standing(one)),
      publisher: credit.state === "Denied" ? undefined : publisherOf(workId, party.id),
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Chain of title — writer → publisher → sub-publisher → collector, each hop with its agreement.

export type HopRole = "Original publisher" | "Sub-publisher" | "Collector";

export interface Hop {
  key: string;
  /** Whose share the chain carries — the writer it starts from, or none on file. */
  writer: string;
  role: HopRole;
  from: string;
  to: string;
  /** The party the hop reaches, where it is one the graph holds. */
  toParty?: string;
  claim?: Assertion;
  agreement?: Agreement;
  interests: readonly Interest[];
  rights: string;
  territory: TerritorySet;
  start?: Date;
  end?: Date;
  basis?: string;
}

const rightsWord = (claim: Assertion) => (typeof claim.rights === "string" ? claim.rights : claim.rights.join(", "));
const societyParty: Record<string, string> = { GEMA: "p-gema", "PRS for Music": "p-prs" };

/**
 * The chain of title a work's claims spell out — read off the claims and the agreements behind
 * them, never stored. Every publisher with a claim is reached, from its writer where one is on
 * file and from "no writer on file" where none is, so a missing link is shown rather than skipped.
 */
export function chainOf(workId: string): Hop[] {
  const claims = ASSERTIONS.filter((one) => one.assetId === workId && standing(one) && one.state !== "No authority");
  const hops: Hop[] = [];
  const reached = new Set<string>();

  const collect = (writer: string, holder: string, claim: Assertion) => {
    const society = societyOf(holder);
    if (!society) return;
    hops.push({
      key: `${writer}/${holder}/collector/${claim.id}`,
      writer,
      role: "Collector",
      from: partyName(holder),
      to: society,
      toParty: societyParty[society],
      claim,
      interests: ["Collects"],
      rights: rightsWord(claim),
      territory: claim.territory,
      start: claim.from,
      end: claim.to,
      basis: claim.basis,
    });
  };

  const fromPublisher = (writer: string, publisher: string, writerName: string, agreement?: Agreement) => {
    const owning = claims.find((one) => one.partyId === publisher && one.interests.includes("Owns") && (!agreement || one.agreementId === agreement.id)) ??
      claims.find((one) => one.partyId === publisher && one.interests.includes("Owns"));
    if (!owning) return;
    reached.add(publisher);
    hops.push({
      key: `${writer}/${publisher}/publisher`,
      writer,
      role: "Original publisher",
      from: writerName,
      to: partyName(publisher),
      toParty: publisher,
      claim: owning,
      agreement: agreement ?? AGREEMENTS.find((one) => one.id === owning.agreementId),
      interests: owning.interests,
      rights: rightsWord(owning),
      territory: owning.territory,
      start: owning.from,
      end: owning.to,
      basis: owning.basis,
    });
    // Sub-publishers: an administering claim under a sub-publishing agreement the publisher signed.
    const subs = claims.filter((one) => {
      const signed = AGREEMENTS.find((each) => each.id === one.agreementId);
      return one.interests.includes("Administers") && signed?.kind === "Sub-publishing" && signed.parties.includes(publisher) && one.partyId !== publisher;
    });
    for (const sub of subs) {
      reached.add(sub.partyId);
      hops.push({
        key: `${writer}/${sub.partyId}/sub`,
        writer,
        role: "Sub-publisher",
        from: partyName(publisher),
        to: partyName(sub.partyId),
        toParty: sub.partyId,
        claim: sub,
        agreement: AGREEMENTS.find((one) => one.id === sub.agreementId),
        interests: sub.interests,
        rights: rightsWord(sub),
        territory: sub.territory,
        start: sub.from,
        end: sub.to,
        basis: sub.basis,
      });
      collect(writer, sub.partyId, sub);
    }
    // The publisher's own collection — a COLLECTS claim of its own, or its ownership where it has none.
    const own = claims.filter((one) => one.partyId === publisher && one.interests.includes("Collects") && !one.interests.includes("Owns"));
    if (own.length) for (const one of own) collect(writer, publisher, one);
    else collect(writer, publisher, owning);
  };

  for (const writer of writersOf(workId).filter((one) => one.credit !== "Denied")) {
    if (writer.publisher) fromPublisher(writer.name, writer.publisher.partyId, writer.name, writer.publisher.agreement);
  }
  // Every publisher the writers did not lead to: its chain starts with no writer on file.
  const orphans = [...new Set(claims.filter((one) => one.shareType === "Publisher" && one.interests.includes("Owns") && !reached.has(one.partyId)).map((one) => one.partyId))];
  for (const publisher of orphans) fromPublisher("No writer on file", publisher, "No writer on file");
  return hops;
}

// ---------------------------------------------------------------------------------------------
// Shares — by right type and territory, writer and publisher as two lines.

export const SHARE_RIGHTS: readonly RightType[] = ["Performance", "Mechanical", "Sync"];

/** The society that distributes a right in a territory. */
const SOCIETY_IN: Record<string, Partial<Record<RightType, string>>> = {
  GB: { Performance: "PRS for Music", Mechanical: "MCPS" },
  US: { Performance: "ASCAP and BMI", Mechanical: "The MLC" },
  DE: { Performance: "GEMA", Mechanical: "GEMA" },
  AT: { Performance: "AKM", Mechanical: "Austro-Mechana" },
  CH: { Performance: "SUISA", Mechanical: "SUISA" },
  FR: { Performance: "SACEM", Mechanical: "SDRM" },
  IT: { Performance: "SIAE", Mechanical: "SIAE" },
  ES: { Performance: "SGAE", Mechanical: "SGAE" },
  NL: { Performance: "Buma", Mechanical: "Stemra" },
  BE: { Performance: "SABAM", Mechanical: "SABAM" },
};

/**
 * How the society splits a right between writers and publishers — a society RULE the graph would
 * store, written here as words until it does. Illustrative: rights ops confirm each.
 */
const RULES: Record<string, string> = {
  "PRS for Music": "Writers at least 50%, publisher at most 50%",
  MCPS: "Publisher collects 100% and pays writers by contract",
  "ASCAP and BMI": "Writers 50%, publishers 50%",
  "The MLC": "Publisher collects 100% and pays writers by contract",
  "GEMA/Performance": "Composer and lyricist 8/12, publisher 4/12",
  "GEMA/Mechanical": "Writers 60%, publisher 40%",
  "SUISA/Mechanical": "Writers 2/3, publisher 1/3",
  "SIAE/Mechanical": "Writers 50%, publisher 50%",
  "SGAE/Mechanical": "Writers 50%, publisher 50%",
  "SABAM/Mechanical": "Writers 50%, publisher 50%",
  AKM: "Writers 8/12, publisher 4/12",
  "Austro-Mechana": "Writers 60%, publisher 40%",
  SUISA: "Writers at least 2/3, publisher at most 1/3",
  SACEM: "Author, composer and publisher a third each",
  SDRM: "Writers 50%, publisher 50%",
  SIAE: "Writers 50%, publisher 50%",
  SGAE: "Writers at least 50%, publisher at most 50%",
  Buma: "Writers at least 50%, publisher at most 50%",
  Stemra: "Writers 50%, publisher 50%",
  SABAM: "Writers 2/3, publisher 1/3",
};

/** The convention a line follows: the society and its rule, or that the right is not split by one. */
export function conventionOf(country: string, right: RightType): { society: string; rule: string } {
  if (right === "Sync") return { society: "None", rule: "Negotiated directly; no society split" };
  const society = SOCIETY_IN[country]?.[right];
  return society
    ? { society, rule: RULES[`${society}/${right}`] ?? RULES[society] ?? "Society rule not on file" }
    : { society: "Not on file", rule: "Society rule not on file" };
}

export interface ShareLine {
  key: string;
  country: string;
  right: RightType;
  shareType: Extract<ShareType, "Writer" | "Publisher">;
  /** Every standing ownership claim the line is made of, each with its own source. */
  claims: Assertion[];
  /** What the graph resolves the line to — none where no claim is on file. */
  total: number | null;
  state: "Whole" | "Overclaim" | "Gap";
  /** Who collects each holder's share there. */
  collectors: string[];
}

const holdsRight = (claim: Assertion, right: RightType) =>
  claim.rights === "All composition" || (Array.isArray(claim.rights) && claim.rights.includes(right));

/** The writer line and the publisher line of a work, for one right in one territory — totals from the resolver. */
export function shareLines(workId: string, country: string): ShareLine[] {
  const totals = shareTotals(workId, country);
  const live = (one: Assertion) => one.from <= TODAY && (!one.to || TODAY <= one.to);
  return SHARE_RIGHTS.flatMap((right) =>
    (["Writer", "Publisher"] as const).map((shareType) => {
      const claims = ASSERTIONS.filter(
        (one) =>
          one.assetId === workId &&
          one.shareType === shareType &&
          one.interests.includes("Owns") &&
          standing(one) &&
          one.state !== "No authority" &&
          covers(one.territory, country) &&
          live(one) &&
          holdsRight(one, right),
      );
      const found = totals.find((one) => one.shareType === shareType);
      const collectors = claims.map((claim) => {
        const by = ASSERTIONS.find(
          (one) =>
            one.assetId === workId &&
            one.interests.includes("Collects") &&
            standing(one) &&
            covers(one.territory, country) &&
            live(one) &&
            holdsRight(one, right) &&
            (one.partyId === claim.partyId || one.shareOf?.startsWith(partyName(claim.partyId))),
        );
        // A writer's share is collected through the writer's own society; a publisher's by whoever
        // holds a COLLECTS edge on it there — a sub-publisher's before the owner's own.
        if (shareType === "Writer") return societyOf(claim.partyId) ?? partyName(claim.partyId);
        return partyName(by?.partyId ?? claim.partyId);
      });
      return {
        key: `${country}/${right}/${shareType}`,
        country,
        right,
        shareType,
        claims,
        total: found?.total ?? null,
        state: (found?.state ?? "Gap") as ShareLine["state"],
        collectors: [...new Set(collectors)],
      };
    }),
  );
}

/** Where the claims agree and where they do not, territory by territory — "In sync in all territories". */
export function territoryReading(work: Asset) {
  // A conflict still open in a territory counts too: a contributor's claim the graph only holds
  // as a report (cf-8) never reaches the totals, and the shares are not in sync while it stands.
  const disputed = (country: string) =>
    CONFLICTS.find(
      (one) => one.assetId === work.id && one.state !== "Resolved" && one.territories.includes(country) && !(one.accepted ?? []).includes(country),
    );
  const out = territoriesOf(work)
    .map((country) => ({ country, totals: shareTotals(work.id, country), conflict: disputed(country) }))
    .filter((one) => one.conflict || one.totals.some((each) => each.state !== "Whole"));
  return { inSync: out.length === 0, out };
}

// ---------------------------------------------------------------------------------------------
// Recordings to link (S2-3) — suggested matches first, a manual link as the fallback.

export interface Suggestion {
  recordingId: string;
  workId: string;
  confidence: number;
  method: string;
  shared: readonly string[];
}

/** The matches the graph suggests: Sureel's recording-link merges, read by ISRC and ISWC, and one of the workspace's own. */
const SUGGESTED: Suggestion[] = [
  ...MERGES.filter((one) => one.kind === "Recording link").flatMap((merge) => {
    const isrc = merge.left.ids.find((one) => one.startsWith("ISRC "))?.slice(5);
    const iswc = merge.right.ids.find((one) => one.startsWith("ISWC "))?.slice(5);
    const recording = recordings().find((one) => one.isrc === isrc);
    const work = works().find((one) => one.iswc === iswc);
    return recording && work ? [{ recordingId: recording.id, workId: work.id, confidence: merge.confidence, method: merge.method, shared: merge.shared }] : [];
  }),
  {
    recordingId: "r-ember",
    workId: "w-ember",
    confidence: 0.91,
    method: "Title + registrant",
    shared: ["Title exact", "Harbor Music's CWR HBM-2505-02 names the Kestrel Point release"],
  },
];

let rejected: readonly string[] = [];
export const suggestionFor = (recordingId: string) =>
  SUGGESTED.find((one) => one.recordingId === recordingId && !rejected.includes(`${one.recordingId}/${one.workId}`));
export function rejectSuggestion(one: Suggestion) {
  rejected = [...rejected, `${one.recordingId}/${one.workId}`];
  wrote();
}

/** The recordings with no work link — what the queue holds — and the ones Harbor linked itself. */
export const unlinked = () => recordings().filter((one) => worksOf(one).length === 0);
export const linkedByMe = () =>
  recordings().filter((one) =>
    (one.embodies ?? []).some((link) => link.source === "Publisher confirmed" && myClaims(link.workId).some(standing)),
  );

// ---------------------------------------------------------------------------------------------
// Registrations (S2-4) — per work per society. The model has none yet: held here.

export interface Registration {
  id: string;
  workId: string;
  society: string;
  state: "Acknowledged" | "Sent" | "Rejected" | "Missing";
  /** The CWR file it went in. */
  file?: string;
  sent?: Date;
  acknowledged?: Date;
  /** The society's own number for the work, once acknowledged. */
  workNumber?: string;
  reason?: string;
  /** Marked for the next CWR file. */
  flagged: boolean;
}

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

let REGISTRATIONS: Registration[] = [
  { id: "rg-1", workId: "w-northbound", society: "PRS for Music", state: "Acknowledged", file: "CWR 3.1 HBM-2401-01", sent: day(2024, 1, 12), acknowledged: day(2024, 1, 30), workNumber: "PRS 318840221K", flagged: false },
  { id: "rg-2", workId: "w-northbound", society: "GEMA", state: "Acknowledged", file: "CWR 3.1 RHE-2602-11", sent: day(2026, 2, 20), acknowledged: day(2026, 3, 2), workNumber: "GEMA 2026-03-0412", reason: "Acknowledged at 60% for Harbor Music — contested in DE.", flagged: false },
  { id: "rg-3", workId: "w-northbound", society: "SACEM", state: "Sent", file: "CWR 3.1 HBM-2609-04", sent: day(2026, 9, 22), flagged: false },
  { id: "rg-4", workId: "w-northbound", society: "ASCAP", state: "Acknowledged", file: "CWR 3.1 HBM-2403-02", sent: day(2024, 3, 4), acknowledged: day(2024, 3, 14), workNumber: "ASCAP 893310442", flagged: false },
  { id: "rg-5", workId: "w-tidewater", society: "PRS for Music", state: "Acknowledged", file: "CWR 3.1 HBM-2401-01", sent: day(2024, 1, 12), acknowledged: day(2024, 1, 30), workNumber: "PRS 318840239M", flagged: false },
  // FRD S2-4: a work missing its GEMA registration is flagged for the next CWR file.
  { id: "rg-6", workId: "w-tidewater", society: "GEMA", state: "Missing", reason: "Earns in DE; never registered there.", flagged: true },
  { id: "rg-7", workId: "w-tidewater", society: "SACEM", state: "Rejected", file: "CWR 3.1 HBM-2609-04", sent: day(2026, 9, 22), reason: "Conflicting claim: publisher shares total 125% (Meridian Music Group).", flagged: false },
  { id: "rg-8", workId: "w-ferry", society: "PRS for Music", state: "Sent", file: "CWR 3.1 HBM-2510-03", sent: day(2025, 11, 4), flagged: false },
  { id: "rg-9", workId: "w-ferry", society: "GEMA", state: "Missing", reason: "Earns in DE; never registered there.", flagged: true },
  { id: "rg-10", workId: "w-ember", society: "PRS for Music", state: "Sent", file: "CWR 3.1 HBM-2505-02", sent: day(2025, 5, 9), flagged: false },
  { id: "rg-11", workId: "w-ember", society: "ASCAP", state: "Missing", reason: "Earns in the US; never registered there.", flagged: false },
];

export const registrations = () => REGISTRATIONS.filter((one) => myClaims(one.workId).some(standing));
export const registrationsOf = (workId: string) => REGISTRATIONS.filter((one) => one.workId === workId);

/** Marks registrations for the next CWR file, or takes them out of it. */
export function flagRegistrations(ids: readonly string[], flagged: boolean) {
  REGISTRATIONS = REGISTRATIONS.map((one) => (ids.includes(one.id) ? { ...one, flagged } : one));
  wrote();
}

let cwrRun = 4;
/** The next CWR file's name — Harbor's sender code, the month, the run. */
export const nextCwrFile = () => `CWR 3.1 HBM-2610-${String(cwrRun + 1).padStart(2, "0")}`;

/** Writes every flagged registration into one CWR file: each is Sent, in that file, today. */
export function generateCwr() {
  const file = nextCwrFile();
  cwrRun += 1;
  REGISTRATIONS = REGISTRATIONS.map((one) =>
    one.flagged ? { ...one, state: "Sent" as const, file, sent: TODAY, acknowledged: undefined, reason: undefined, flagged: false } : one,
  );
  wrote();
  return file;
}

// ---------------------------------------------------------------------------------------------
// Conflicts — what the other side reported, and the evidence each side has filed.

/**
 * A claim a conflict counts that is no assertion the graph holds — a contributor's upload in its
 * own tenant. Its share total is shared; its agreement reference is private to the contributor.
 */
export interface Reported {
  key: string;
  partyId: string;
  interests: readonly Interest[];
  shareType: ShareType;
  share: number;
  territory: TerritorySet;
  source: string;
  sourceRef: string;
}

const REPORTED: Record<string, readonly Reported[]> = {
  "cf-8": [
    {
      key: "cf-8/meridian",
      partyId: "p-meridian",
      interests: ["Owns"],
      shareType: "Publisher",
      share: 25,
      territory: { include: ["FR", "DE", "IT", "ES", "NL", "BE", "AT", "CH"] },
      source: "Contributor upload",
      sourceRef: "MMG_publishing_splits_Q3.csv · Borrowed lane",
    },
  ],
};
export const reportedOn = (conflictId: string) => REPORTED[conflictId] ?? [];

export interface Evidence {
  key: string;
  conflictId: string;
  /** Which side filed it. */
  by: string;
  name: string;
  agreement?: string;
  size?: number;
  at: Date;
}

let EVIDENCE: Evidence[] = [
  { key: "ev-1", conflictId: "cf-1", by: "p-bensongs", name: "CWR ack ASCAP 2024-03-118", at: new Date(2026, 3, 9, 10, 4) },
  { key: "ev-2", conflictId: "cf-8", by: "p-meridian", name: "MMG_publishing_splits_Q3.csv", at: new Date(2026, 9, 6, 8, 5) },
];
export const evidenceOn = (conflictId: string) => EVIDENCE.filter((one) => one.conflictId === conflictId);

/**
 * Files Harbor's evidence on a conflict, and the tracker moves on: the side asked for evidence has
 * given it, so the counterclaim stands at "Evidence from counterparty" — the step after which only
 * Sureel ops can resolve it. Both sides read the same tracker.
 */
export function fileEvidence(conflict: Conflict, item: Omit<Evidence, "key" | "conflictId" | "by" | "at">) {
  EVIDENCE = [...EVIDENCE, { ...item, key: `ev-${EVIDENCE.length + 1}`, conflictId: conflict.id, by: ME, at: now() }];
  updateConflict(conflict.id, { step: Math.max(conflict.step, 2), state: "Open" });
}

/** The claims a conflict counts, the graph's own first — superseded ones are kept, and say so. */
export const claimsOf = (conflict: Conflict) => conflict.claims.map((id) => ASSERTIONS.find((one) => one.id === id)).filter(Boolean) as Assertion[];

export const assetName = (id: string) => assetById(id)?.title ?? id;

// ---------------------------------------------------------------------------------------------
// Claims — added, corrected (superseding) or withdrawn; never an edit of "the owner" (G-1).

export interface ClaimDraft {
  workId: string;
  interests: readonly Interest[];
  rights: Assertion["rights"];
  share: number;
  territory: TerritorySet;
  from: Date;
  to?: Date;
  agreementId?: string;
  evidence?: readonly string[];
  supersedes?: string;
}

/**
 * Where a claim opens a conflict: the territories the resolver's write-time check finds it
 * overclaiming in — only where THIS claim is the one counted (a larger claim of Harbor's already
 * decides elsewhere) and where no open conflict already holds the territory.
 */
function overclaimsWith(draft: ClaimDraft, over: readonly string[]): string[] {
  return over.filter((country) => {
    const mine = myClaims(draft.workId).filter(
      (one) => standing(one) && one.id !== draft.supersedes && one.interests.includes("Owns") && one.shareType === "Publisher" && covers(one.territory, country),
    );
    const held = Math.max(0, ...mine.map((one) => one.share));
    const already = CONFLICTS.some((one) => one.assetId === draft.workId && one.state !== "Resolved" && one.territories.includes(country));
    return draft.share > held && !already;
  });
}

/** Writes Harbor's claim — new, or a correction that supersedes the old row, which stays. */
export function writeClaim(draft: ClaimDraft) {
  const agreement = AGREEMENTS.find((one) => one.id === draft.agreementId);
  const claim: NewClaim = {
    assetId: draft.workId,
    partyId: ME,
    interests: draft.interests,
    side: "Composition",
    rights: draft.rights,
    shareType: "Publisher",
    share: draft.share,
    territory: draft.territory,
    from: dayOf(draft.from),
    to: dayOf(draft.to),
    basis: agreement?.basis,
    source: agreement ? "Signed agreement" : "Self-declared",
    sourceRef: agreement?.code ?? "Harbor Music · Revelator Pro claim",
    agreementId: agreement?.id,
    supersedes: draft.supersedes,
    evidence: draft.evidence,
  };
  const checked = stateForNewClaim(claim, territoriesOf(assetById(draft.workId)));
  const over = checked.state === "No authority" ? [] : overclaimsWith(draft, checked.over);
  const id = addAssertion({ ...claim, state: checked.state === "No authority" ? "No authority" : over.length ? "Contested" : "Resolved" });
  if (over.length) {
    const work = assetById(draft.workId);
    const others = [...new Set(ASSERTIONS.filter((one) => one.assetId === work.id && standing(one) && one.shareType === "Publisher" && one.partyId !== ME).map((one) => one.partyId))];
    addConflict({
      kind: "Overclaim",
      assetId: work.id,
      side: "Composition",
      severity: work.revenue > 0 ? "High" : "Medium",
      revenueAtRisk: Math.round(work.revenue * (over.length / Math.max(1, territoriesOf(work).length))),
      total: Math.max(...over.map((country) => shareTotals(work.id, country).find((one) => one.shareType === "Publisher")?.total ?? 0)),
      territories: over,
      accepted: [],
      claims: [id, ...ASSERTIONS.filter((one) => one.assetId === work.id && standing(one) && one.partyId !== ME && one.shareType === "Publisher").map((one) => one.id)],
      parties: [ME, ...others],
      opened: TODAY,
      state: "Open",
      step: 0,
      interim: "Paying on the claims that stood before this one until it is resolved.",
      raisedBy: "Resolver check on write · Revelator Pro claim",
    });
  }
  return id;
}

/**
 * Withdraws Harbor's claim: a withdrawal row supersedes it and the old one stays. A conflict the
 * claim alone kept open closes with it, its reason the withdrawal; Sureel ops resolve the rest.
 */
export function withdrawClaim(claim: Assertion) {
  withdrawAssertion(claim.id, `${ACTOR}, ${MY_NAME}`, now());
  for (const conflict of CONFLICTS.filter((one) => one.state !== "Resolved" && one.claims.includes(claim.id))) {
    const still = conflict.territories.some((country) => shareTotals(conflict.assetId, country).some((one) => one.state === "Overclaim"));
    if (!still)
      updateConflict(conflict.id, {
        state: "Resolved",
        step: 3,
        resolution: { ...decidedNow(), reason: `${MY_NAME} withdrew its ${formatPercent(claim.share)} claim (${claim.sourceRef}).` },
      });
  }
}

/**
 * Accepts the resolved state territory by territory (S2-7): the conflict closes in the territories
 * accepted and stays open in the rest. Accepted everywhere, it is resolved, the reason said.
 */
export function acceptIn(conflictId: string, codes: readonly string[]) {
  const conflict = CONFLICTS.find((one) => one.id === conflictId)!;
  const accepted = [...new Set([...(conflict.accepted ?? []), ...codes])];
  const everywhere = conflict.territories.every((code) => accepted.includes(code));
  updateConflict(conflict.id, {
    accepted,
    ...(everywhere
      ? { state: "Resolved" as const, step: 3, resolution: { ...decidedNow(), reason: `${MY_NAME} accepted the current state in every territory.` } }
      : {}),
  });
}

/** Words read as one value, joined the way every meta line is — never by hand. */
export const meta = (...parts: (string | undefined | null | false)[]) => formatMeta(parts.filter((one): one is string => Boolean(one))) ?? "";
