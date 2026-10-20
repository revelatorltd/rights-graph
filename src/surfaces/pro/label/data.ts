import { formatMeta } from "@revelator/pro-ui";

import {
  AGREEMENTS,
  ASSETS,
  ATTESTATIONS,
  CONFLICTS,
  CREDITS,
  GRANTS,
  REQUESTS,
  TODAY,
  addAttestation,
  addRequest,
  addGrant,
  assetById,
  partyName,
  wrote,
  withdrawAssertion,
} from "../../../graph/fixtures";
import {
  AI_USES,
  DEPENDS_ON_TRAINING,
  USES,
  type Agreement,
  type Asset,
  type Conflict,
  type Decision,
  type Grant,
  type Request,
  type ScopeLevel,
  type TerritorySet,
  type Use,
} from "../../../graph/model";
import { clearanceOf, performersOf, recordingsOf, useWord, worksOf } from "../../../graph/resolve";
import { href } from "../../../route";

/**
 * The label's side of the graph — Kestrel Point Recordings, the party `WORKING_AS.Label` names.
 * Read off the shared graph by id; nothing here decides who owns or what is cleared, it only says
 * which facts are the label's to see. What the shared setters lack is written at the foot.
 *
 * Addresses are built from `href` and not from the shell's `proHref`: the shell imports this
 * surface, so a value read from it while this module loads would not exist yet.
 */
export const LABEL = "p-kestrel";
/** The admin signed in, and the label she acts for. */
export const ME = { name: "Priya Raman", label: "Kestrel Point Recordings" };
/** The graph's clock, at the minute a decision taken now is stamped with. */
export const NOW = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 10, 0);

// ---------------------------------------------------------------------------------------------
// Addresses

/** `#/pro/rights/<page>/<id>/<facet>` */
export const rightsHref = (page: string, ...rest: (string | undefined)[]) => href("pro", "rights", page, ...rest);

/** The catalogue's own record, on its Rights facet — another builder's page (S1-2). */
export const assetRightsHref = (asset: Asset) =>
  href("pro", "catalog", asset.kind === "Video" ? "videos" : asset.kind === "Release" ? "releases" : "tracks", asset.id, "rights");

// ---------------------------------------------------------------------------------------------
// What the label holds

/** The label's recordings and videos — what carries its master rights. */
export const catalogue = () => ASSETS.filter((one) => one.labelId === LABEL && (one.kind === "Recording" || one.kind === "Video"));
export const labelRecordings = () => ASSETS.filter((one) => one.labelId === LABEL && one.kind === "Recording");
export const labelReleases = () => ASSETS.filter((one) => one.labelId === LABEL && one.kind === "Release");

/** The artists credited on the label's recordings — where artist-scoped consent attaches. */
export const labelArtists = () => [...new Set(labelRecordings().flatMap((one) => performersOf(one)))];

/** Every asset a conflict can sit on and still be the label's business: its own, and the works they embody. */
function touched() {
  const own = catalogue();
  return new Set([...own.map((one) => one.id), ...own.flatMap((one) => worksOf(one).map((work) => work.id))]);
}

/**
 * The conflicts touching the label — those it is party to, and those on the works its recordings
 * embody, which it reads but cannot answer (FRD roles: a label responds only where it claims).
 */
export const labelConflicts = () => {
  const on = touched();
  return CONFLICTS.filter((one) => one.parties.includes(LABEL) || on.has(one.assetId));
};
export const isParty = (conflict: Conflict) => conflict.parties.includes(LABEL);
export const openOf = (conflicts: readonly Conflict[]) => conflicts.filter((one) => one.state !== "Resolved");

/** The open conflicts on one asset, or on the works it embodies. */
export const conflictsOn = (asset: Asset) => {
  const on = new Set([asset.id, ...worksOf(asset).map((one) => one.id)]);
  return openOf(labelConflicts()).filter((one) => on.has(one.assetId));
};

/** The requests in the label's inbox, and those it sent to its artists. */
export const inbox = () => REQUESTS.filter((one) => one.to === LABEL);
export const sent = () => REQUESTS.filter((one) => one.from === LABEL);
export const labelRequests = () => REQUESTS.filter((one) => one.to === LABEL || one.from === LABEL);
export const waiting = (one: Request) => one.to === LABEL && (one.state === "Needs decision" || one.state === "Escalated");

/** The standing grants the label made, and those its artists made on themselves. */
export const labelGrants = () => {
  const artists = labelArtists();
  return GRANTS.filter((one) => one.grantedBy === LABEL || (one.level === "Artist" && artists.includes(one.ref)));
};

/** The agreements the label is party to. */
export const labelAgreements = () => AGREEMENTS.filter((one) => one.parties.includes(LABEL));
/** Every clause that gives the label authority, as an authority reference reads: AGR-310 §7.4. */
export const authorities = (agreements: readonly Agreement[] = labelAgreements()) =>
  agreements.flatMap((one) =>
    (one.clauses ?? []).map((clause) => {
      const section = clause.split(" ")[0]!;
      return { value: `${one.code} ${section}`, title: `${one.code} ${section}`, description: clause.slice(section.length + 1) };
    }),
  );

/** The attestations on a grant. */
export const attestationsOn = (grant: Grant) => ATTESTATIONS.filter((one) => one.subject.kind === "Grant" && one.subject.id === grant.id);

// ---------------------------------------------------------------------------------------------
// Scope — what a scope names, and which assets it reaches

export const SCOPE_WORD: Record<ScopeLevel, string> = {
  Asset: "Track",
  Release: "Release",
  Label: "Label",
  Catalogue: "Catalogue",
  Artist: "Artist",
};

/** A scope said in words: Catalogue · Kestrel Point Recordings. */
export function scopeName(level: ScopeLevel, ref: string) {
  if (level === "Catalogue" || level === "Label" || level === "Artist") return partyName(ref);
  return assetById(ref)?.title ?? ref;
}

/** A use as it reads mid-sentence — the resolver's word, with Voice/NIL kept as it is written. */
export const useText = (use: Use) => (use === "Voice/NIL" ? use : useWord(use));

/** A grant, named as a row or a trail names it: its use, and the scope it was made at. */
export const grantName = (grant: Grant) => formatMeta([grant.use, scopeName(grant.level, grant.ref)]) ?? grant.use;
/** A scope, as a fact reads it: Release · Lowlight. */
export const scopeLine = (level: ScopeLevel, name: string) => formatMeta([SCOPE_WORD[level], name]) ?? name;

/** The label's assets a scope reaches — what a grant there is inherited by. */
export function assetsIn(level: ScopeLevel, ref: string): Asset[] {
  if (level === "Catalogue" || level === "Label") return catalogue().filter((one) => one.labelId === ref);
  if (level === "Release") return recordingsOf(assetById(ref));
  if (level === "Artist") return labelRecordings().filter((one) => performersOf(one).includes(ref));
  const one = assetById(ref);
  return one ? [one] : [];
}

/**
 * Whether AI training is cleared for a partner across a scope — read from the resolver, track by
 * track, for the dependency rule (S1-6). Every other AI use waits on it.
 */
export function trainingAcross(level: ScopeLevel, ref: string, partner?: string) {
  const assets = assetsIn(level, ref).filter((one) => one.kind === "Recording");
  const cleared = assets.filter((one) => clearanceOf(one.id, "AI training", { partner }).master.state === "Granted");
  return { cleared: cleared.length, of: assets.length, blocked: assets.filter((one) => !cleared.includes(one)) };
}

export const dependsOnTraining = (use: Use | undefined) => Boolean(use && DEPENDS_ON_TRAINING.includes(use));

/** The one-line reason a dependent AI use cannot be granted where training is not (S1-6). */
export const DEPENDENCY_REASON = "AI training is not granted here, and every other AI use depends on it.";

/** Every use, AI ones last — the order the matrix reads down. */
export const ALL_USES: readonly Use[] = USES;

// ---------------------------------------------------------------------------------------------
// Territory, as a form asks for it

/** The countries a form offers — the ones the label's deals and requests name. */
export const COUNTRIES = ["US", "CA", "GB", "IE", "DE", "AT", "CH", "FR", "NL", "BE", "ES", "IT", "SE", "JP", "AU", "BR"] as const;

export type Reach = "World" | "Only" | "Except";
export const reachOf = (reach: string, codes: readonly string[]): TerritorySet =>
  reach === "Only" && codes.length
    ? { include: codes }
    : reach === "Except" && codes.length
      ? { include: "World", exclude: codes }
      : { include: "World" };

// ---------------------------------------------------------------------------------------------
// Writes the shared setters lack — kept here, read back by the pages, and redrawn through `wrote`.

/** A request handed to a colleague, with who handed it and when. */
export const DELEGATIONS = new Map<string, { to: string; note?: string; at: Date }>();
/** The terms a counter offered, and why a decline was given. */
export const ANSWERS = new Map<string, { counter?: { territory: TerritorySet; end?: Date; model?: string }; note: string }>();
/** The exports taken, newest first — each carries the graph version it was read at (S1-10). */
export const EXPORTS: { at: Date; format: string; of: string; graph: string }[] = [];

export function delegate(id: string, to: string, note?: string) {
  DELEGATIONS.set(id, { to, note, at: NOW });
  wrote();
}
export function answer(id: string, given: { counter?: { territory: TerritorySet; end?: Date; model?: string }; note: string }) {
  ANSWERS.set(id, given);
}
export function exported(format: string, of: string, graph: string) {
  EXPORTS.unshift({ at: NOW, format, of, graph });
  wrote();
}

/** A claim the label withdraws — never deleted (G-1): the row stays, standing no longer. */
export function withdrawClaims(ids: readonly string[]) {
  for (const id of ids) withdrawAssertion(id, ME.name, NOW);
}

/** A request the graph sends a party — the artist's notice that the label attested on their behalf. */
export const notify = (request: Omit<Request, "id">) => addRequest(request);

export const decision = (onBehalfOf: string, authority?: string): Decision => ({ actor: ME.name, onBehalfOf, authority, at: NOW });

/**
 * ONE grant written at its scope, with the Voice/NIL path where it is one (S1-7): attested on the
 * artist's behalf, it is live at once and the artist is told; sent to the artist, it waits paused
 * until they sign. Returns the grant's id.
 */
export function writeGrant(
  grant: Omit<Grant, "id" | "decided" | "grantedBy" | "state">,
  voice?: { path: "attest" | "ask"; artist: string; authority?: string },
) {
  const onBehalfOf = voice ? partyName(voice.artist) : ME.label;
  addGrant({
    ...grant,
    grantedBy: LABEL,
    decided: decision(onBehalfOf, voice?.authority ?? undefined),
    state: voice?.path === "ask" ? "Paused" : "Live",
  });
  const id = GRANTS[0]!.id;
  if (voice) {
    addAttestation(
      voice.path === "attest"
        ? {
            attestor: LABEL,
            onBehalfOf: voice.artist,
            subject: { kind: "Grant", id },
            claim: "Voice/NIL consent",
            assurance: "Verified",
            authority: voice.authority,
            issued: NOW,
            state: "Signed",
            keyId: "kestrel-label-2026",
          }
        : {
            attestor: voice.artist,
            subject: { kind: "Grant", id },
            claim: "Voice/NIL consent",
            assurance: "Verified",
            issued: NOW,
            state: "Requested",
            keyId: "pending",
          },
    );
    const partners = grant.partners.ids.map(partyName).join(", ") || "approved partners";
    notify({
      type: "Attestation",
      from: LABEL,
      to: voice.artist,
      use: "Voice/NIL",
      side: "Master",
      scope: { level: "Artist", ref: voice.artist, name: partyName(voice.artist), assets: assetsIn("Artist", voice.artist).length },
      territory: grant.territory,
      start: grant.from,
      end: grant.to,
      deadline: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 10),
      received: NOW,
      state: "Needs decision",
      about: ATTESTATIONS[0]!.id,
      purpose:
        voice.path === "attest"
          ? `${ME.label} approved Voice/NIL for ${partners} on your behalf, under ${voice.authority}. Dispute it if you disagree.`
          : `${ME.label} asks you to confirm Voice/NIL for ${partners}. Nothing is live until you sign.`,
    });
  }
  wrote();
  return id;
}

/** The credits on a recording still waiting on the artist — what keeps it below T4. */
export const unconfirmed = (asset: Asset) => CREDITS.filter((one) => one.assetId === asset.id && one.state === "To confirm");

// ---------------------------------------------------------------------------------------------
// Defaults for new releases (S1-11) — the label's own setting, kept here.

export interface ReleaseDefaults {
  training: "Allowed" | "Off";
  trainingPartners: readonly string[];
  derivative: "Allowed" | "Off";
  voice: "Allowed" | "Off";
  streaming: "Allowed" | "Off";
  territory: TerritorySet;
}

/** F1 step 2: training allowed for two named partners, Voice/NIL off. */
export let DEFAULTS: ReleaseDefaults = {
  training: "Allowed",
  trainingPartners: ["p-cadence", "p-lyra"],
  derivative: "Off",
  voice: "Off",
  streaming: "Off",
  territory: { include: "World" },
};
export function setDefaults(next: ReleaseDefaults) {
  DEFAULTS = next;
  wrote();
}

/** The AI uses the defaults write, each as the effect it starts a new release on. */
export const DEFAULT_USES = [
  { use: "AI training", key: "training" },
  { use: "AI derivative", key: "derivative" },
  { use: "Voice/NIL", key: "voice" },
  { use: "AI streaming", key: "streaming" },
] as const satisfies readonly { use: Use; key: keyof ReleaseDefaults }[];

/** The release-level grants the defaults stand for — what applying them to a release writes. */
export function defaultGrants(releaseId: string): Omit<Grant, "id" | "decided" | "grantedBy" | "state">[] {
  const release = assetById(releaseId);
  return DEFAULT_USES.map(({ use, key }) => {
    // A dependent use is never granted where training is off (S1-6): it starts denied.
    const allowed = DEFAULTS[key] === "Allowed" && (use === "AI training" || DEFAULTS.training === "Allowed");
    return {
      level: "Release" as const,
      ref: releaseId,
      side: "Master" as const,
      use,
      effect: allowed ? ("Grant" as const) : ("Deny" as const),
      partners:
        allowed && DEFAULTS.trainingPartners.length
          ? { mode: "Allowlist" as const, ids: DEFAULTS.trainingPartners }
          : { mode: "All approved" as const, ids: [] },
      territory: DEFAULTS.territory,
      from: release.released ?? TODAY,
      conditions: ["From the label's defaults for new releases"],
    };
  });
}

/** Whether a release already carries grants of its own — its defaults applied, or set by hand. */
export const hasReleaseGrants = (releaseId: string) =>
  GRANTS.some((one) => one.level === "Release" && one.ref === releaseId && AI_USES.includes(one.use));

export function applyDefaults(releaseId: string) {
  for (const grant of defaultGrants(releaseId))
    addGrant({ ...grant, grantedBy: LABEL, decided: decision(ME.label, "Defaults for new releases"), state: "Live" });
}

/** A release not yet out, or out within the last month — a NEW release, for the defaults. */
export const isNew = (release: Asset) => Boolean(release.released && release.released.getTime() > TODAY.getTime() - 30 * 86_400_000);
