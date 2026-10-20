import { useSyncExternalStore } from "react";

import {
  ASSERTIONS,
  ASSETS,
  ATTESTATIONS,
  CONFLICTS,
  CREDITS,
  GRANTS,
  REQUESTS,
  TODAY,
  assetById,
  partyName,
  snapshot,
  subscribe,
} from "./fixtures";
import {
  AI_USES,
  DEPENDS_ON_TRAINING,
  type Assertion,
  type Asset,
  type Grant,
  type ScopeLevel,
  type Side,
  type TerritorySet,
  type Tier,
  type Use,
} from "./model";

/**
 * The resolver, as the surfaces call it: the same claims and the same rule version always give
 * the same answer. Rule version v1.3 — ownership precedence, then clearance most-specific-first,
 * deny before grant, with the dependency, composition and authority rules on top.
 */
export const RULE_VERSION = "v1.3";
export const GRAPH_VERSION = "gv-2026.10.20-0958";

/** Every page draws again from the graph as it now is, whatever a form wrote. */
export function useGraph() {
  return useSyncExternalStore(subscribe, snapshot);
}

// ---------------------------------------------------------------------------------------------
// Territory

export function territoryLabel(set: TerritorySet): string {
  if (set.include === "World") return set.exclude?.length ? `World excl. ${set.exclude.join(", ")}` : "World";
  return set.include.join(", ");
}

export function covers(set: TerritorySet, country: string): boolean {
  if (country === "World") return set.include === "World" && !set.exclude?.length;
  if (set.include === "World") return !set.exclude?.includes(country);
  return set.include.includes(country);
}

const live = (from: Date, to: Date | undefined, at: Date) => from <= at && (!to || at <= to);

// ---------------------------------------------------------------------------------------------
// Links

/** The works an asset touches, resolved at read time from the direct links only. */
export function worksOf(asset: Asset): Asset[] {
  if (asset.kind === "Work") return [asset];
  if (asset.kind === "Recording") return (asset.embodies ?? []).map((one) => assetById(one.workId));
  if (asset.kind === "Video") {
    const viaRecordings = (asset.contains ?? []).flatMap((one) => worksOf(assetById(one.recordingId)));
    const direct = (asset.usesWorks ?? []).map(assetById);
    return [...new Map([...viaRecordings, ...direct].map((one) => [one.id, one])).values()];
  }
  return (asset.items ?? []).flatMap((one) => worksOf(assetById(one)));
}

/** The recordings a video contains, or a release packages. */
export function recordingsOf(asset: Asset): Asset[] {
  if (asset.kind === "Video") return (asset.contains ?? []).map((one) => assetById(one.recordingId));
  if (asset.kind === "Release") return (asset.items ?? []).map(assetById);
  return asset.kind === "Recording" ? [asset] : [];
}

/** Every recording that embodies a work. */
export function recordingsEmbodying(workId: string): Asset[] {
  return ASSETS.filter((one) => one.kind === "Recording" && one.embodies?.some((link) => link.workId === workId));
}

/** The performers credited on a recording — where artist-scoped grants attach. */
export function performersOf(asset: Asset): string[] {
  const on = asset.kind === "Video" ? recordingsOf(asset).map((one) => one.id) : [asset.id];
  return [
    ...new Set(
      CREDITS.filter((one) => on.includes(one.assetId) && /artist/i.test(one.role) && one.state !== "Denied").map((one) => one.partyId),
    ),
  ];
}

// ---------------------------------------------------------------------------------------------
// Ownership

/** The claims that count — not superseded, not withdrawn. */
export const standing = (one: Assertion) => one.state !== "Superseded" && one.state !== "Withdrawn";

/** The parties holding a CONTROLS edge on an asset's side, in a territory, on a date. */
export function controllers(assetId: string, side: Side, country: string, at: Date = TODAY): Assertion[] {
  return ASSERTIONS.filter(
    (one) =>
      one.assetId === assetId &&
      one.side === side &&
      one.interests.includes("Controls") &&
      one.state !== "No authority" &&
      standing(one) &&
      covers(one.territory, country) &&
      live(one.from, one.to, at),
  );
}

/** The resolved owner share per share type in one territory — and whether it over- or under-claims. */
export function shareTotals(assetId: string, country: string, at: Date = TODAY) {
  const owning = ASSERTIONS.filter(
    (one) => one.assetId === assetId && one.interests.includes("Owns") && standing(one) && one.state !== "No authority" && covers(one.territory, country) && live(one.from, one.to, at),
  );
  // One party's claims never add to each other: its largest standing claim is what it claims.
  const byParty = new Map<string, Assertion>();
  for (const one of owning) {
    const key = `${one.shareType}/${one.partyId}`;
    if ((byParty.get(key)?.share ?? -1) < one.share) byParty.set(key, one);
  }
  const byType = new Map<string, number>();
  for (const one of byParty.values()) byType.set(one.shareType, (byType.get(one.shareType) ?? 0) + one.share);
  return [...byType.entries()].map(([shareType, total]) => ({ shareType, total, state: total > 100 ? "Overclaim" : total < 100 ? "Gap" : "Whole" }));
}

// ---------------------------------------------------------------------------------------------
// Clearance

/** A use as it reads mid-sentence — AI keeps its capitals. */
export const useWord = (use: Use) => (use.startsWith("AI") ? use : use.toLowerCase());

export type Answer = "Granted" | "Denied" | "Needs review";

export interface SideAnswer {
  state: Answer;
  /** The grant that decided it — none where the default did. */
  grant?: Grant;
  level: ScopeLevel | "Default";
  reason: string;
  /** For the composition side: the work and the controlling publisher answered for. */
  work?: Asset;
  party?: string;
}

export interface Clearance {
  state: Answer;
  master: SideAnswer;
  composition: SideAnswer[];
  reason: string;
  /** Where the answer came from, most specific first — for the matrix's "decided at" column. */
  decidedAt: ScopeLevel | "Default";
}

export interface Ask {
  partner?: string;
  country?: string;
  at?: Date;
}

const partnerFits = (grant: Grant, partner: string | undefined) => {
  if (grant.partners.mode === "All approved") return true;
  if (!partner) return grant.partners.mode === "Allowlist" ? grant.partners.ids.length > 0 : true;
  return grant.partners.mode === "Allowlist" ? grant.partners.ids.includes(partner) : !grant.partners.ids.includes(partner);
};

/** The scopes a master-side read walks, most specific first: the asset, its release, its label's catalogue. */
function masterChain(asset: Asset): { level: ScopeLevel; ref: string }[] {
  const chain: { level: ScopeLevel; ref: string }[] = [{ level: "Asset", ref: asset.id }];
  if (asset.kind === "Video") for (const one of recordingsOf(asset)) chain.push({ level: "Asset", ref: one.id });
  const release = asset.releaseId ?? (asset.kind === "Video" ? recordingsOf(asset)[0]?.releaseId : undefined);
  if (release) chain.push({ level: "Release", ref: release });
  if (asset.labelId) chain.push({ level: "Label", ref: asset.labelId }, { level: "Catalogue", ref: asset.labelId });
  return chain;
}

function pick(chain: { level: ScopeLevel; ref: string }[], side: Side, use: Use, ask: Required<Pick<Ask, "country" | "at">> & Ask, grantor?: string) {
  for (const scope of chain) {
    const here = GRANTS.filter(
      (one) =>
        one.level === scope.level &&
        one.ref === scope.ref &&
        one.use === use &&
        (one.side === side || one.side === "Both") &&
        one.state !== "Revoked" &&
        covers(one.territory, ask.country) &&
        live(one.from, one.to, ask.at) &&
        partnerFits(one, ask.partner) &&
        (!grantor || one.grantedBy === grantor),
    );
    // Deny before grant at the same level.
    const found = here.find((one) => one.effect === "Deny") ?? here[0];
    if (found) return found;
  }
  return undefined;
}

function fromGrant(grant: Grant, side: Side): SideAnswer {
  const by = partyName(grant.grantedBy);
  if (grant.unauthorized)
    return { state: "Needs review", grant, level: grant.level, reason: `${by} holds no controlling edge here — stored and flagged.` };
  if (grant.state === "Paused") return { state: "Needs review", grant, level: grant.level, reason: "Paused by an open dispute." };
  if (grant.effect === "Deny") return { state: "Denied", grant, level: grant.level, reason: `${by} denied it at ${grant.level.toLowerCase()} level.` };
  const partners = grant.partners.mode === "Allowlist" ? ` for ${grant.partners.ids.map(partyName).join(", ")}` : "";
  return { state: "Granted", grant, level: grant.level, reason: `${by} granted the ${side.toLowerCase()} side${partners}.` };
}

function masterAnswer(asset: Asset, use: Use, ask: Required<Pick<Ask, "country" | "at">> & Ask): SideAnswer {
  // Voice/NIL is the artist's first: an artist-level grant or deny overrides every other level.
  if (use === "Voice/NIL") {
    for (const artist of performersOf(asset)) {
      const grant = pick([{ level: "Artist", ref: artist }], "Master", use, ask);
      if (grant) return fromGrant(grant, "Master");
    }
  }
  const grant = pick(masterChain(asset), "Master", use, ask);
  if (grant) {
    // Authority: a grant counts only where its grantor holds a CONTROLS edge, there and then.
    const on = asset.kind === "Video" ? [asset, ...recordingsOf(asset)] : [asset];
    const holds = on.some((one) => controllers(one.id, "Master", ask.country, ask.at).some((edge) => edge.partyId === grant.grantedBy));
    if (!holds && grant.effect === "Grant")
      return { state: "Needs review", grant, level: grant.level, reason: `${partyName(grant.grantedBy)} holds no controlling edge in ${ask.country} — the grant is stored and flagged.` };
    return fromGrant(grant, "Master");
  }
  if (AI_USES.includes(use)) return { state: "Denied", level: "Default", reason: "Nothing grants it: every AI use defaults to deny." };
  const holds = controllers(asset.id, "Master", ask.country, ask.at).length > 0;
  return holds
    ? { state: "Granted", level: "Default", reason: "Existing territory clearance for distribution." }
    : { state: "Needs review", level: "Default", reason: `No one controls the master in ${ask.country}.` };
}

function compositionAnswers(asset: Asset, use: Use, ask: Required<Pick<Ask, "country" | "at">> & Ask): SideAnswer[] {
  const linked = worksOf(asset);
  if (!linked.length)
    return [{ state: "Needs review", level: "Default", reason: "No Recording↔Work link: a missing link never defaults to cleared." }];
  return linked.flatMap((work) => {
    const holders = controllers(work.id, "Composition", ask.country, ask.at);
    if (!holders.length) return [{ state: "Needs review" as const, level: "Default" as const, work, reason: `No publisher controls ${work.title} in ${ask.country}.` }];
    return [...new Set(holders.map((one) => one.partyId))].map((party): SideAnswer => {
      // Only the controlling publisher's own grant counts for its share.
      const grant = pick([{ level: "Asset", ref: work.id }, { level: "Catalogue", ref: party }], "Composition", use, ask, party);
      if (grant) return { ...fromGrant(grant, "Composition"), work, party };
      if (use === "Stream" || use === "Download" || use === "UGC")
        return { state: "Granted", level: "Default", work, party, reason: "Existing territory clearance for distribution." };
      return { state: "Needs review", level: "Default", work, party, reason: `${partyName(party)} has granted nothing for ${useWord(use)}.` };
    });
  });
}

/** Effective clearance — what a partner is told at the delivery timestamp. */
export function clearanceOf(assetId: string, use: Use, ask: Ask = {}): Clearance {
  const asset = assetById(assetId);
  const full = { country: ask.country ?? "US", at: ask.at ?? TODAY, ...ask };

  if (asset.kind === "Release") {
    // A release holds no rights: it is as cleared as its least cleared track.
    const tracks = recordingsOf(asset).map((one) => clearanceOf(one.id, use, ask));
    const worst = tracks.find((one) => one.state === "Denied") ?? tracks.find((one) => one.state === "Needs review") ?? tracks[0]!;
    return { ...worst, reason: `${tracks.filter((one) => one.state === "Granted").length} of ${tracks.length} tracks cleared. ${worst.reason}` };
  }

  // Dependency: every other AI use needs AI training first.
  if (DEPENDS_ON_TRAINING.includes(use)) {
    const training = clearanceOf(assetId, "AI training", ask);
    if (training.master.state !== "Granted" && !(use === "Voice/NIL" && masterAnswer(asset, use, full).state === "Granted")) {
      const reason = "AI training is not cleared, and every other AI use depends on it.";
      return { state: "Denied", master: { state: "Denied", level: "Default", reason }, composition: [], reason, decidedAt: "Default" };
    }
  }

  const master = asset.kind === "Work" ? undefined : masterAnswer(asset, use, full);
  const touchesComposition = asset.kind === "Work" || use === "Sync" || AI_USES.includes(use) || use === "Stream" || use === "Download" || use === "UGC";
  const composition = touchesComposition ? compositionAnswers(asset, use, full) : [];
  const sides = [...(master ? [master] : []), ...composition];
  const state: Answer = sides.some((one) => one.state === "Denied")
    ? "Denied"
    : sides.some((one) => one.state === "Needs review")
      ? "Needs review"
      : "Granted";
  const deciding = sides.find((one) => one.state === state) ?? sides[0]!;
  const reason =
    state === "Needs review" && master?.state === "Granted" && composition.some((one) => one.state !== "Granted")
      ? `Master cleared; composition not cleared — ${deciding.reason}`
      : deciding.reason;
  return {
    state,
    master: master ?? { state: "Granted", level: "Default", reason: "A work has no master side." },
    composition,
    reason,
    decidedAt: deciding.level,
  };
}

// ---------------------------------------------------------------------------------------------
// The Confidence Ladder, per asset and use

export function tierOf(assetId: string, use?: Use): Tier {
  const asset = assetById(assetId);
  const claims = ASSERTIONS.filter((one) => one.assetId === assetId && standing(one));
  let tier: Tier = 1;
  if (asset.delivered || asset.kind === "Work") tier = 2;
  if (tier === 2 && claims.some((one) => one.agreementId) && asset.revenue > 0) tier = 3;
  const credits = CREDITS.filter((one) => one.assetId === assetId && /main artist|composer/i.test(one.role));
  if (tier === 3 && credits.length && credits.every((one) => one.state === "Confirmed")) tier = 4;
  if (tier === 4 && use && asset.creation && clearanceOf(assetId, use).state === "Granted") tier = 5;
  return tier;
}

// ---------------------------------------------------------------------------------------------
// Roll-ups

export const openConflicts = (filter: (party: string[]) => boolean = () => true) =>
  CONFLICTS.filter((one) => one.state !== "Resolved" && filter([...one.parties]));

export const requestsFor = (party: string) => REQUESTS.filter((one) => one.to === party);
export const pending = (party: string) =>
  requestsFor(party).filter((one) => one.state === "Needs decision" || one.state === "Escalated");

export const attestationsFor = (party: string) =>
  ATTESTATIONS.filter((one) => one.attestor === party || one.onBehalfOf === party);

/** Revenue-weighted share of an organisation's recordings resolved at T3 or above. */
export function coverageOf(assets: readonly Asset[]) {
  const total = assets.reduce((sum, one) => sum + one.revenue, 0) || 1;
  const resolved = assets.filter((one) => tierOf(one.id) >= 3).reduce((sum, one) => sum + one.revenue, 0);
  const linked = assets.filter((one) => worksOf(one).length > 0).reduce((sum, one) => sum + one.revenue, 0);
  return { resolved: (resolved / total) * 100, linked: (linked / total) * 100 };
}

export const describeDecision = (decided: { actor: string; onBehalfOf?: string; authority?: string }) =>
  [decided.actor, decided.onBehalfOf ? `for ${decided.onBehalfOf}` : null, decided.authority ? `under ${decided.authority}` : null]
    .filter(Boolean)
    .join(" ");
