import { formatDate, formatList, formatMeta, formatPercent, formatRange, type StatusKey } from "@revelator/pro-ui";

import {
  addAssertion,
  addConflict,
  AGREEMENTS,
  partyName,
  ASSERTIONS,
  assetById,
  ASSETS,
  ATTESTATIONS,
  CONFLICTS,
  CREDITS,
  GRANTS,
  MERGES,
  now,
  TODAY,
  updateConflict,
  withdrawAssertion,
} from "../../../graph/fixtures";
import type { Assertion, Asset, AssetKind, Interest, Side, SourceKind, TerritorySet, Use } from "../../../graph/model";
import { PRECEDENCE, USES } from "../../../graph/model";
import {
  clearanceOf,
  controllers,
  covers,
  recordingsOf,
  shareTotals,
  standing,
  stateForNewClaim,
  territoryLabel,
  worksOf,
  type NewClaim,
} from "../../../graph/resolve";

/**
 * What the catalogue's pages read off the shared graph, by id, and the writes they make through
 * its setters. Nothing here decides ownership or clearance: every answer is
 * `resolve.ts`'s, and what this file adds is which of its answers a page asks for, and in what words.
 */

/** The catalogue the Catalog section lists: the label S1 opens on. Publishers read the same one. */
export const CATALOGUE = "p-kestrel";

export const KIND_OF: Record<"tracks" | "releases" | "videos", AssetKind> = {
  tracks: "Recording",
  releases: "Release",
  videos: "Video",
};

export const catalogueOf = (kind: AssetKind) => ASSETS.filter((one) => one.kind === kind && one.labelId === CATALOGUE);

/** The word a page uses for an asset — a recording is a track in Revelator Pro. */
export const KIND_WORD: Record<AssetKind, string> = { Recording: "Track", Release: "Release", Video: "Video", Work: "Work" };

export const sameDay = (one: Date, other: Date) =>
  one.getFullYear() === other.getFullYear() && one.getMonth() === other.getMonth() && one.getDate() === other.getDate();
const endOf = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);

// ---------------------------------------------------------------------------------------------
// Countries — the codes the graph stores, and the names a reader picks them by.

export const COUNTRIES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  DE: "Germany",
  AT: "Austria",
  CH: "Switzerland",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  BE: "Belgium",
  SE: "Sweden",
  JP: "Japan",
};

/** The country a reading is answered in where nothing narrower is asked — any country no claim names. */
export const ELSEWHERE = "ZZ";

/**
 * The countries that tell an asset's claims apart: every code any claim on it names, and one no
 * claim names — standing for everywhere else. Asked in each, the resolver's answers differ exactly
 * where the claims do.
 */
export function countriesOf(assetIds: readonly string[]): string[] {
  const named = new Set<string>();
  for (const one of ASSERTIONS)
    if (assetIds.includes(one.assetId)) {
      if (one.territory.include !== "World") one.territory.include.forEach((code) => named.add(code));
      one.territory.exclude?.forEach((code) => named.add(code));
    }
  return [...[...named].sort(), ELSEWHERE];
}

/** A run of countries as a territory reads: "DE", "US, CA", "World excl. DE" for everywhere else. */
export function placesLabel(codes: readonly string[], all: readonly string[]): string {
  const named = codes.filter((one) => one !== ELSEWHERE);
  if (!codes.includes(ELSEWHERE)) return named.join(", ");
  const others = all.filter((one) => one !== ELSEWHERE && !codes.includes(one));
  return territoryLabel({ include: "World", exclude: others });
}

/** One answer per run of countries that share it — the resolver asked in each, gathered by what it said. */
export function byPlace<T>(codes: readonly string[], answer: (country: string) => T, key: (value: T) => string) {
  const runs = new Map<string, { codes: string[]; value: T }>();
  for (const code of codes) {
    const value = answer(code);
    const k = key(value);
    const run = runs.get(k) ?? { codes: [], value };
    run.codes.push(code);
    runs.set(k, run);
  }
  return [...runs.values()].map((run) => ({ place: placesLabel(run.codes, codes), value: run.value, codes: run.codes }));
}

// ---------------------------------------------------------------------------------------------
// Bitemporal reading (S1-12)

/** The two times a rights read takes: valid time (who held it then) and system time (what we knew). */
export interface Reading {
  asOf: Date;
  knownAt: Date;
}
export const NOW: Reading = { asOf: TODAY, knownAt: TODAY };
export const isPast = (reading: Reading) => !sameDay(reading.asOf, TODAY) || !sameDay(reading.knownAt, TODAY);
/** The system time the resolver is asked at: the end of the day picked, in a past state — none today. */
export const knownBy = (reading: Reading) => (isPast(reading) ? endOf(reading.knownAt) : undefined);

const live = (claim: Assertion, at: Date) => claim.from <= endOf(at) && (!claim.to || at <= claim.to);

/** The claim that replaced this one, where one did. */
export const supersederOf = (claim: Assertion) => ASSERTIONS.find((one) => one.supersedes === claim.id);

/**
 * The claims on an asset as a reading sees them. Today, every claim the record holds, the replaced
 * and the withdrawn too (G-1: the old row stays). In the past, only what we knew by then, live on
 * the day asked.
 */
export function claimsOn(assetId: string, reading: Reading): Assertion[] {
  const all = ASSERTIONS.filter((one) => one.assetId === assetId);
  if (!isPast(reading)) return all;
  return all.filter((one) => one.known <= endOf(reading.knownAt) && live(one, reading.asOf));
}

/**
 * A claim's state as it stood when we knew it then. The model keeps no history of a claim's state
 * (gap), so a claim replaced by one we had not yet learned of is read as standing, and its
 * replacement is said beside it.
 */
export function stateThen(claim: Assertion, reading: Reading): Assertion["state"] {
  if (!isPast(reading)) return claim.state;
  if (claim.state === "Withdrawn") return claim.withdrawn && claim.withdrawn.at > endOf(reading.knownAt) ? "Resolved" : claim.state;
  if (claim.state !== "Superseded") return claim.state;
  const by = supersederOf(claim);
  return by && by.known > endOf(reading.knownAt) ? "Resolved" : claim.state;
}

// ---------------------------------------------------------------------------------------------
// Words for a claim

/** A party's name as its own: Harbor Music's, Kestrel Point Recordings'. */
export const whose = (party: string) => {
  const name = partyName(party);
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
};

export const INTERESTS: readonly Interest[] = ["Owns", "Controls", "Administers", "Collects"];

export const interestWords = (claim: Pick<Assertion, "interests">) =>
  formatList(claim.interests.map((one, at) => (at === 0 ? one : one.toLowerCase()))) ?? "";

export const rightsWords = (claim: Assertion) => (typeof claim.rights === "string" ? claim.rights : formatList(claim.rights) ?? "");

export const shareWords = (claim: Assertion) =>
  claim.shareOf ? `${formatPercent(claim.share, { whole: true })} of ${claim.shareOf}` : formatPercent(claim.share, { whole: true });

export const datesWords = (claim: Pick<Assertion, "from" | "to">) => formatRange(claim.from, claim.to, "day");

export const sourceWords = (claim: Assertion) => formatMeta([claim.source, claim.sourceRef]) ?? claim.source;

/** The meta line a claim row reads under its party: interest, share, where, when, from what. */
export const claimMeta = (claim: Assertion) =>
  [interestWords(claim), shareWords(claim), territoryLabel(claim.territory), datesWords(claim), claim.source];

// ---------------------------------------------------------------------------------------------
// The resolved answer beside a claim (G-1)

/** Which country a claim is answered in: the first it names, or everywhere else. */
const countryOfClaim = (claim: Assertion) => (claim.territory.include === "World" ? ELSEWHERE : claim.territory.include[0]!);
const countryWords = (code: string, claim: Assertion) =>
  code === ELSEWHERE ? territoryLabel(claim.territory) : COUNTRIES[code] ?? code;

export const openConflictsOn = (assetIds: readonly string[]) =>
  CONFLICTS.filter((one) => assetIds.includes(one.assetId) && one.state !== "Resolved");

export const conflictOf = (claim: Assertion) =>
  CONFLICTS.find((one) => one.state !== "Resolved" && one.claims.includes(claim.id)) ??
  CONFLICTS.find((one) => one.state !== "Resolved" && one.assetId === claim.assetId && one.side === claim.side && one.parties.includes(claim.partyId));

export interface Against {
  /** What the graph answers where this claim reaches. */
  says: string;
  /** The graph and the claim disagree. */
  differs: boolean;
  /** Why they differ, where they do. */
  why?: string;
}

/**
 * The graph's answer next to one claim, in the claim's own territory and on the day read — what
 * the resolver pays and why that is not what the claim says, where it is not.
 */
export function against(claim: Assertion, at: Date = TODAY, knownAt?: Date): Against {
  const country = countryOfClaim(claim);
  const where = countryWords(country, claim);
  const party = partyName(claim.partyId);
  if (claim.state === "Superseded") {
    const by = supersederOf(claim);
    return {
      says: by ? `Replaced on ${formatDate(by.known, "day")} by ${whose(claim.partyId)} ${shareWords(by)} claim.` : "Replaced by a later claim.",
      differs: false,
    };
  }
  if (claim.state === "Withdrawn") return { says: `${party} took this claim back. It no longer counts.`, differs: false };
  const holders = controllers(claim.assetId, claim.side, country, at, knownAt).map((one) => partyName(one.partyId));
  if (claim.state === "No authority")
    return {
      says: holders.length ? `${formatList(holders)} controls the ${claim.side.toLowerCase()} in ${where}.` : `No one controls the ${claim.side.toLowerCase()} in ${where}.`,
      differs: true,
      why: `${party} holds no controlling edge there and then: the claim is stored and flagged, and never counts.`,
    };
  if (claim.interests.includes("Owns")) {
    const total = shareTotals(claim.assetId, country, at, knownAt).find((one) => one.shareType === claim.shareType);
    const paid = ASSERTIONS.filter(
      (one) =>
        one.assetId === claim.assetId &&
        one.partyId === claim.partyId &&
        one.shareType === claim.shareType &&
        one.interests.includes("Owns") &&
        one.state === "Resolved" &&
        covers(one.territory, country) &&
        live(one, at),
    ).reduce((most, one) => Math.max(most, one.share), 0);
    const totalWords = total ? `The ${claim.shareType.toLowerCase()} side adds to ${formatPercent(total.total, { whole: true })} in ${where}` : `Nothing stands for the ${claim.shareType.toLowerCase()} share in ${where}`;
    if (claim.state === "Contested") {
      const conflict = conflictOf(claim);
      return {
        says: `The graph pays ${party} ${formatPercent(paid, { whole: true })} in ${where}. ${totalWords}.`,
        differs: true,
        why: conflict ? `${conflict.kind}, open since ${formatDate(conflict.opened, "day")}. ${conflict.interim}` : "Another claim in the same tier disagrees.",
      };
    }
    if (!live(claim, at)) return { says: `Not in force on ${formatDate(at, "day")}: ${datesWords(claim)}.`, differs: false };
    const whole = total?.state === "Whole";
    return {
      says: `Resolved on this claim. ${totalWords}.`,
      differs: !whole,
      why: whole ? undefined : total?.state === "Overclaim" ? "The shares add to more than 100%: a conflict holds the difference." : "The shares add to less than 100%: the rest is held in suspense.",
    };
  }
  if (claim.interests.includes("Controls"))
    return { says: holders.length ? `${formatList(holders)} controls the ${claim.side.toLowerCase()} in ${where}.` : `No one controls it in ${where}.`, differs: !holders.includes(party) };
  return { says: `Stands as claimed in ${where}: ${interestWords(claim).toLowerCase()} is not ownership, and adds to no share.`, differs: false };
}

// ---------------------------------------------------------------------------------------------
// Writing a claim (S1-3)

export interface ClaimDraft {
  assetId: string;
  side: Side;
  partyId: string;
  interests: readonly Interest[];
  shareType: Assertion["shareType"];
  share: number;
  territory: TerritorySet;
  from: Date;
  to?: Date;
  source: SourceKind;
  sourceRef: string;
  agreementId?: string;
  evidence: readonly string[];
  supersedes?: string;
}

/**
 * Writes the claim as a new row — never over the old one — and, where it now claims more than
 * the whole, opens the overclaim the resolver's invariant asks for. Returns the claim and the
 * conflict it opened, if any.
 *
 * The state a new claim is written in is the resolver's write-time check (`stateForNewClaim`),
 * asked in every country that tells the asset's claims apart.
 */
export function writeClaim(draft: ClaimDraft, actor: string): { id: string; conflict?: string; replaced?: string } {
  const claim: NewClaim = {
    assetId: draft.assetId,
    partyId: draft.partyId,
    interests: draft.interests,
    side: draft.side,
    rights: draft.side === "Master" ? "All master" : "All composition",
    shareType: draft.shareType,
    share: draft.share,
    territory: draft.territory,
    from: draft.from,
    to: draft.to,
    source: draft.source,
    sourceRef: draft.sourceRef,
    agreementId: draft.agreementId,
    supersedes: draft.supersedes,
    evidence: draft.evidence,
  };
  const { state, over } = stateForNewClaim(claim, countriesOf([draft.assetId]));
  const id = addAssertion({ ...claim, state });
  const at = draft.from > TODAY ? draft.from : TODAY;

  // A correction that brings the shares back to the whole closes the overclaim it was part of.
  let replaced: string | undefined;
  if (draft.supersedes && !over.length) {
    const open = CONFLICTS.find((one) => one.state !== "Resolved" && one.kind === "Overclaim" && one.claims.includes(draft.supersedes!));
    if (open) {
      updateConflict(open.id, {
        state: "Resolved",
        step: 3,
        resolution: { actor, at: now(), reason: `Corrected by ${partyName(draft.partyId)} to ${formatPercent(draft.share, { whole: true })}; the shares are whole again.` },
      }, draft.partyId);
      replaced = open.id;
    }
  }
  if (!over.length) return { id, replaced };

  const asset = assetById(draft.assetId);
  const totals = over.map((one) => shareTotals(draft.assetId, one, at).find((total) => total.shareType === draft.shareType)!.total);
  const total = Math.max(...totals);
  const others = ASSERTIONS.filter(
    (one) =>
      one.id !== id &&
      one.assetId === draft.assetId &&
      one.shareType === draft.shareType &&
      one.interests.includes("Owns") &&
      standing(one) &&
      over.some((code) => covers(one.territory, code)),
  );
  const conflict = addConflict({
    kind: "Overclaim",
    assetId: draft.assetId,
    side: draft.side,
    severity: asset.revenue > 0 ? "High" : "Low",
    // What the share past the whole would carry of the asset's revenue.
    revenueAtRisk: Math.round((asset.revenue * (total - 100)) / 100),
    total,
    territories: over.includes(ELSEWHERE) ? [placesLabel(over, countriesOf([draft.assetId]))] : over,
    claims: [id, ...others.map((one) => one.id)],
    parties: [...new Set([draft.partyId, ...others.map((one) => one.partyId)])],
    opened: TODAY,
    state: "Open",
    step: 0,
    assignee: undefined,
    interim: "Paying on the claims that stood before this one until it is resolved.",
    raisedBy: `${actor} · Revelator Pro rights tab`,
  });
  return { id, conflict };
}

/** When a claim was taken back, and by whom — the graph keeps it on the claim. */
export const withdrawnAt = (id: string) => ASSERTIONS.find((one) => one.id === id)?.withdrawn;

/** Takes a claim back: the row stays, Withdrawn. An overclaim it alone was making closes. */
export function withdrawClaim(claim: Assertion, actor: string) {
  withdrawAssertion(claim.id, actor);
  // Only an overclaim can close by a claim leaving it: a gap or an overlap is still there without it.
  for (const open of CONFLICTS.filter((one) => one.state !== "Resolved" && one.kind === "Overclaim" && one.claims.includes(claim.id))) {
    const still = open.territories.some((code) =>
      shareTotals(open.assetId, COUNTRIES[code] ? code : ELSEWHERE).some((total) => total.state === "Overclaim"),
    );
    if (!still)
      updateConflict(open.id, {
        state: "Resolved",
        step: 3,
        resolution: { actor, at: now(), reason: `${partyName(claim.partyId)} withdrew its claim.` },
      }, claim.partyId);
  }
}

/** The agreements a party can cite: those it is a party to. */
export const agreementsOf = (party: string) => AGREEMENTS.filter((one) => one.parties.includes(party));

export const SOURCES: readonly SourceKind[] = (Object.keys(PRECEDENCE) as SourceKind[]).filter((one) => one !== "Platform claim");

// ---------------------------------------------------------------------------------------------
// What an asset holds, across what it packages

/** The assets whose MASTER claims an asset's master side reads: itself, and what a video contains. */
export const masterAssets = (asset: Asset): Asset[] =>
  asset.kind === "Video" ? [asset, ...recordingsOf(asset)] : asset.kind === "Release" ? recordingsOf(asset) : [asset];

/** Every asset whose claims, credits and decisions the record's history reads. */
export const assetsUnder = (asset: Asset): Asset[] => {
  const all = [...masterAssets(asset), ...worksOf(asset)];
  return [...new Map(all.map((one) => [one.id, one])).values()];
};

/**
 * The country an at-a-glance clearance asks in: the United States where the master is controlled
 * there, else the first country the asset's claims name where it is (else everywhere else). Asked
 * only in the US, a master licensed outside it — Lowlight, Glass Coast, World excl. US, CA — would
 * read 0 of 8 for want of a holder, not for want of consent; the glance says where it asked.
 */
export function glanceCountry(asset: Asset): string {
  const masters = masterAssets(asset);
  const held = (country: string) => masters.some((one) => controllers(one.id, "Master", country).length > 0);
  if (held("US")) return "US";
  return countriesOf(masters.map((one) => one.id)).find(held) ?? "US";
}

/** Where a glance asked, as a territory reads: the code, or "World excl. …" for everywhere else. */
export const glancePlace = (asset: Asset, code: string) => placesLabel([code], countriesOf(masterAssets(asset).map((one) => one.id)));

/** How many uses come back granted, denied or to review, for the default ask — and where it asked. */
export function clearanceCounts(assetId: string, ask: { partner?: string; country?: string } = {}) {
  const country = ask.country ?? glanceCountry(assetById(assetId));
  const answers = USES.map((use) => clearanceOf(assetId, use, { ...ask, country }).state);
  return {
    country,
    granted: answers.filter((one) => one === "Granted").length,
    denied: answers.filter((one) => one === "Denied").length,
    review: answers.filter((one) => one === "Needs review").length,
  };
}

export const creditsOn = (assetIds: readonly string[]) => CREDITS.filter((one) => assetIds.includes(one.assetId));

export const attestationsOn = (assetIds: readonly string[]) => {
  const credits = creditsOn(assetIds).map((one) => one.id);
  const grants = GRANTS.filter((one) => assetIds.includes(one.ref)).map((one) => one.id);
  return ATTESTATIONS.filter(
    (one) =>
      (one.subject.kind === "Asset" && assetIds.includes(one.subject.id)) ||
      (one.subject.kind === "Credit" && credits.includes(one.subject.id)) ||
      (one.subject.kind === "Grant" && grants.includes(one.subject.id)),
  );
};

/** The work a recording should be linked to, where matching has suggested one (S2-3, S7-3). */
export function suggestedWork(recording: Asset) {
  const merge = MERGES.find((one) => one.kind === "Recording link" && Boolean(recording.isrc) && one.left.ids.some((id) => id.endsWith(recording.isrc!)));
  if (!merge) return undefined;
  const iswc = merge.right.ids.find((id) => id.startsWith("ISWC"))?.replace("ISWC ", "");
  const work = ASSETS.find((one) => one.kind === "Work" && one.iswc === iswc);
  return work ? { work, confidence: merge.confidence, method: merge.method, shared: merge.shared } : undefined;
}

// ---------------------------------------------------------------------------------------------
// History: every claim, decision and dispute on what the record holds, newest first

export interface Event {
  id: string;
  name: string;
  what: string;
  who: string;
  at: Date;
  status?: StatusKey;
  /** The claim it replaced, for a correction. */
  replaces?: string;
}

/** What an attestation is about, in words: a credit's role on its asset, an asset, a grant's use. */
export function subjectWords(subject: { kind: "Asset" | "Credit" | "Grant" | "Artist"; id: string }): string {
  if (subject.kind === "Asset") return assetById(subject.id).title;
  if (subject.kind === "Credit") {
    const credit = CREDITS.find((one) => one.id === subject.id);
    return credit ? `${credit.role} on ${assetById(credit.assetId).title}` : "A credit";
  }
  if (subject.kind === "Grant") {
    const grant = GRANTS.find((one) => one.id === subject.id);
    return grant ? `${grant.use} grant, ${grant.level.toLowerCase()} level` : "A grant";
  }
  return partyName(subject.id);
}

export function historyOf(asset: Asset): Event[] {
  const ids = assetsUnder(asset).map((one) => one.id);
  const title = (id: string) => assetById(id).title;
  const claims = ASSERTIONS.filter((one) => ids.includes(one.assetId));
  const events: Event[] = claims.map((one) => {
    const replaced = one.supersedes ? ASSERTIONS.find((each) => each.id === one.supersedes) : undefined;
    return {
      id: `claim-${one.id}`,
      name: replaced ? "Claim corrected" : "Claim added",
      what:
        formatMeta([title(one.assetId), one.side, interestWords(one), shareWords(one), territoryLabel(one.territory)]) ?? "",
      who: formatMeta([partyName(one.partyId), sourceWords(one)]) ?? "",
      at: one.known,
      status: `claim:${one.state}`,
      replaces: replaced ? formatMeta([shareWords(replaced), territoryLabel(replaced.territory), formatDate(replaced.known, "day")]) ?? undefined : undefined,
    };
  });
  for (const one of claims) {
    const withdrawn = one.withdrawn;
    if (withdrawn)
      events.push({ id: `withdrawn-${one.id}`, name: "Claim withdrawn", what: formatMeta([title(one.assetId), shareWords(one), territoryLabel(one.territory)]) ?? "", who: withdrawn.by, at: withdrawn.at, status: "claim:Withdrawn" });
  }
  const chain = [...ids, ...(asset.releaseId ? [asset.releaseId] : [])];
  for (const grant of GRANTS.filter((one) => chain.includes(one.ref)))
    events.push({
      id: `grant-${grant.id}`,
      name: grant.effect === "Grant" ? "Clearance granted" : "Clearance denied",
      what: formatMeta([grant.use, grant.side, `${grant.level} level`, territoryLabel(grant.territory)]) ?? "",
      who: formatMeta([grant.decided.actor, grant.decided.onBehalfOf ? `for ${grant.decided.onBehalfOf}` : "", grant.decided.authority ? `under ${grant.decided.authority}` : ""].filter(Boolean)) ?? "",
      at: grant.decided.at,
      status: `grant:${grant.state}`,
    });
  for (const conflict of CONFLICTS.filter((one) => ids.includes(one.assetId))) {
    events.push({
      id: `opened-${conflict.id}`,
      name: `${conflict.kind} opened`,
      what: formatMeta([title(conflict.assetId), conflict.side.toLowerCase(), conflict.territories.join(", ")]) ?? "",
      who: conflict.raisedBy,
      at: conflict.opened,
      status: `conflict:${conflict.state}`,
    });
    if (conflict.resolution)
      events.push({
        id: `resolved-${conflict.id}`,
        name: `${conflict.kind} resolved`,
        what: conflict.resolution.reason,
        who: formatMeta([conflict.resolution.actor, conflict.resolution.rule ?? ""].filter(Boolean)) ?? "",
        at: conflict.resolution.at,
        status: "conflict:Resolved",
      });
  }
  for (const one of attestationsOn(ids))
    events.push({
      id: `attest-${one.id}`,
      name: `${one.claim} attested`,
      what: formatMeta([subjectWords(one.subject), `${one.assurance} assurance`]) ?? "",
      who: formatMeta([partyName(one.attestor), one.onBehalfOf ? `for ${partyName(one.onBehalfOf)}` : "", one.authority ? `under ${one.authority}` : ""].filter(Boolean)) ?? "",
      at: one.issued,
      status: `attestation:${one.state}`,
    });
  return events.sort((one, other) => other.at.getTime() - one.at.getTime());
}

export const USE_LIST: readonly Use[] = USES;
