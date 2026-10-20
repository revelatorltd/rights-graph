import type {
  Agreement,
  Assertion,
  Asset,
  Attestation,
  Batch,
  Conflict,
  Credit,
  Feed,
  Grant,
  Lane,
  Partner,
  Party,
  ProofEvent,
  Request,
  Tenant,
  TerritorySet,
} from "./model";

/**
 * One graph, every surface reading it. Invented and hand-written, except the worked example the
 * data-model doc gives — Northbound, Ana, Ben, Harbor Music, Ben Songs, Rhein Edition — kept as the
 * doc writes it so a reviewer can check the screens against the doc's own answers.
 */
export const TODAY = new Date(2026, 9, 20);
const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
const at = (year: number, month: number, date: number, hour: number, minute = 0) =>
  new Date(year, month - 1, date, hour, minute);

export const WORLD: TerritorySet = { include: "World" };
const only = (...codes: string[]): TerritorySet => ({ include: codes });
const except = (...codes: string[]): TerritorySet => ({ include: "World", exclude: codes });

// ---------------------------------------------------------------------------------------------
// Parties

export const PARTIES: readonly Party[] = [
  // The label whose workspace S1 opens on.
  { id: "p-kestrel", name: "Kestrel Point Recordings", kind: "Label", organization: "kestrel-point-recordings", country: "United Kingdom" },
  { id: "p-halcyon", name: "Halcyon Collective", kind: "Label", organization: "halcyon-collective", country: "Germany" },
  { id: "p-bluefen", name: "Bluefen Distribution", kind: "Distributor", organization: "bluefen-distribution", country: "Netherlands" },
  // Publishers — S2 opens on Harbor Music.
  { id: "p-harbor", name: "Harbor Music", kind: "Publisher", ipi: "00523418871", society: "PRS", country: "United Kingdom" },
  { id: "p-bensongs", name: "Ben Songs", kind: "Publisher", ipi: "00612203394", society: "ASCAP", country: "United States of America" },
  { id: "p-rhein", name: "Rhein Edition", kind: "Publisher", ipi: "00481129056", society: "GEMA", country: "Germany" },
  { id: "p-silverbirch", name: "Silverbirch Publishing House", kind: "Publisher", organization: "silverbirch-publishing-house", ipi: "00377190442", society: "PRS", country: "United Kingdom" },
  // Writers and artists — S3 opens on Ana.
  { id: "p-ana", name: "Ana Lindgren", kind: "Writer", ipi: "00734410925", isni: "0000000468213309", assurance: "Verified + ID", society: "PRS", country: "Sweden" },
  { id: "p-ben", name: "Ben Okafor", kind: "Writer", ipi: "00734582217", assurance: "Verified", society: "ASCAP", country: "United States of America" },
  { id: "p-mira", name: "Mira Castellanos", kind: "Artist", isni: "0000000502916647", assurance: "Verified + ID", country: "Spain" },
  { id: "p-tobi", name: "Tobi Renn", kind: "Artist", isni: "0000000511820034", assurance: "Basic", country: "Germany" },
  { id: "p-juno", name: "Juno Hale", kind: "Artist", assurance: "Verified", country: "Canada" },
  { id: "p-dara", name: "Dara Whitlock", kind: "Delegate", country: "United Kingdom" },
  // Contributors and partners — S5, S6.
  { id: "p-meridian", name: "Meridian Music Group", kind: "Contributor", country: "United States of America" },
  { id: "p-arcade", name: "Mistral Arcade Records", kind: "Contributor", organization: "mistral-arcade", country: "France" },
  { id: "p-cadence", name: "Cadence AI", kind: "AI platform", country: "United States of America" },
  { id: "p-lyra", name: "Lyra Labs", kind: "AI platform", country: "United Kingdom" },
  { id: "p-voxa", name: "Voxa Voice", kind: "AI platform", country: "United States of America" },
  { id: "p-tessellate", name: "Tessellate", kind: "AI platform", country: "Germany" },
  { id: "p-openwave-sync", name: "Openwave Studios", kind: "DSP", country: "Sweden" },
  { id: "p-gema", name: "GEMA", kind: "Society", country: "Germany" },
  { id: "p-prs", name: "PRS for Music", kind: "Society", country: "United Kingdom" },
  { id: "p-sureel", name: "Sureel Rights Ops", kind: "Sureel" },
];

export const partyById = (id: string) => PARTIES.find((one) => one.id === id)!;
export const partyName = (id: string) => PARTIES.find((one) => one.id === id)?.name ?? id;

// ---------------------------------------------------------------------------------------------
// Assets — Works, Recordings, Videos, Releases

const W = (id: string, title: string, iswc: string | undefined, revenue: number): Asset => ({
  id,
  kind: "Work",
  title,
  iswc,
  revenue,
});

export const ASSETS: Asset[] = [
  // Works
  W("w-northbound", "Northbound", undefined, 48200),
  W("w-tidewater", "Tidewater", "T-912.448.301-6", 31750),
  W("w-paper-moons", "Paper Moons", "T-912.448.377-2", 22400),
  W("w-lowlight", "Lowlight", "T-913.002.118-4", 19120),
  W("w-glass-coast", "Glass Coast", "T-913.002.164-9", 12880),
  W("w-switchback", "Switchback", "T-913.117.402-1", 9340),
  W("w-ember", "Ember Season", undefined, 7210),
  W("w-ferry", "Last Ferry Out", "T-914.556.010-0", 4980),

  // Recordings — Kestrel's catalogue
  {
    id: "r-northbound",
    kind: "Recording",
    title: "Northbound",
    artist: "Mira Castellanos",
    isrc: "GBKPR2400118",
    revenue: 96400,
    labelId: "p-kestrel",
    releaseId: "rel-northbound",
    embodies: [{ workId: "w-northbound", portion: "Full", source: "Publisher confirmed" }],
    released: day(2024, 4, 12),
    cover: 3,
    creation: "Human",
    delivered: true,
  },
  {
    id: "r-tidewater",
    kind: "Recording",
    title: "Tidewater",
    artist: "Mira Castellanos",
    isrc: "GBKPR2400119",
    revenue: 61300,
    labelId: "p-kestrel",
    releaseId: "rel-northbound",
    embodies: [{ workId: "w-tidewater", portion: "Full", source: "DDEX MWN" }],
    released: day(2024, 4, 12),
    cover: 3,
    creation: "Human",
    delivered: true,
  },
  {
    id: "r-paper-moons",
    kind: "Recording",
    title: "Paper Moons",
    artist: "Mira Castellanos",
    isrc: "GBKPR2400120",
    revenue: 38800,
    labelId: "p-kestrel",
    releaseId: "rel-northbound",
    embodies: [{ workId: "w-paper-moons", portion: "Full", source: "Revelator Pro" }],
    released: day(2024, 4, 12),
    cover: 3,
    creation: "Human",
    delivered: true,
  },
  {
    id: "r-lowlight",
    kind: "Recording",
    title: "Lowlight",
    artist: "Tobi Renn",
    isrc: "GBKPR2500207",
    revenue: 44100,
    labelId: "p-kestrel",
    releaseId: "rel-lowlight",
    embodies: [{ workId: "w-lowlight", portion: "Full", source: "Revelator Pro" }],
    released: day(2025, 2, 21),
    cover: 7,
    creation: "AI-assisted",
    delivered: true,
  },
  {
    id: "r-glass-coast",
    kind: "Recording",
    title: "Glass Coast",
    artist: "Tobi Renn",
    isrc: "GBKPR2500208",
    revenue: 27650,
    labelId: "p-kestrel",
    releaseId: "rel-lowlight",
    embodies: [{ workId: "w-glass-coast", portion: "Full", source: "Revelator Pro" }],
    released: day(2025, 2, 21),
    cover: 7,
    creation: "Human",
    delivered: true,
  },
  {
    // Earns and has NO work link — publishing income unmatched.
    id: "r-switchback",
    kind: "Recording",
    title: "Switchback",
    artist: "Juno Hale",
    isrc: "GBKPR2500311",
    revenue: 33900,
    labelId: "p-kestrel",
    releaseId: "rel-switchback",
    embodies: [],
    released: day(2025, 6, 6),
    cover: 11,
    creation: "Human",
    delivered: true,
  },
  {
    id: "r-ember",
    kind: "Recording",
    title: "Ember Season",
    artist: "Juno Hale",
    isrc: "GBKPR2500312",
    revenue: 21480,
    labelId: "p-kestrel",
    releaseId: "rel-switchback",
    embodies: [],
    released: day(2025, 6, 6),
    cover: 11,
    creation: "Human",
    delivered: true,
  },
  {
    id: "r-ferry",
    kind: "Recording",
    title: "Last Ferry Out",
    artist: "Mira Castellanos feat. Tobi Renn",
    isrc: "GBKPR2600044",
    revenue: 12750,
    labelId: "p-kestrel",
    releaseId: "rel-ferry",
    embodies: [{ workId: "w-ferry", portion: "Full", source: "Revelator Pro" }],
    released: day(2026, 1, 30),
    cover: 15,
    creation: "Human",
    delivered: true,
  },
  {
    // Just released through F1: T1, not delivered yet, no link yet.
    id: "r-harbour-lights",
    kind: "Recording",
    title: "Harbour Lights",
    artist: "Mira Castellanos",
    isrc: "GBKPR2600091",
    revenue: 0,
    labelId: "p-kestrel",
    releaseId: "rel-harbour-lights",
    embodies: [],
    released: day(2026, 10, 30),
    cover: 19,
    creation: "Human",
    delivered: false,
  },
  {
    id: "r-tidewater-remix",
    kind: "Recording",
    title: "Tidewater (Lowtide Remix)",
    artist: "Mira Castellanos",
    isrc: "GBKPR2600052",
    revenue: 8420,
    labelId: "p-kestrel",
    releaseId: "rel-ferry",
    embodies: [{ workId: "w-tidewater", portion: "Full", source: "Revelator Pro" }],
    released: day(2026, 1, 30),
    cover: 15,
    creation: "AI-assisted",
    delivered: true,
  },

  // Videos
  {
    id: "v-northbound",
    kind: "Video",
    title: "Northbound (Official Video)",
    artist: "Mira Castellanos",
    isrc: "GBKPV2400031",
    revenue: 18700,
    labelId: "p-kestrel",
    contains: [{ recordingId: "r-northbound", from: "00:00", to: "03:41", usage: "Audio track" }],
    released: day(2024, 5, 3),
    cover: 3,
    creation: "Human",
    delivered: true,
  },
  {
    // Contains a recording with no work link — sync must come back Needs review.
    id: "v-switchback-live",
    kind: "Video",
    title: "Switchback (Live at Fieldhouse)",
    artist: "Juno Hale",
    isrc: "GBKPV2500077",
    revenue: 6900,
    labelId: "p-kestrel",
    contains: [{ recordingId: "r-switchback", from: "00:00", to: "04:12", usage: "Audio track" }],
    released: day(2025, 9, 12),
    cover: 11,
    creation: "Human",
    delivered: true,
  },

  // Releases — package assets, never hold rights.
  { id: "rel-northbound", kind: "Release", title: "Northbound", artist: "Mira Castellanos", upc: "5063217409918", revenue: 0, labelId: "p-kestrel", items: ["r-northbound", "r-tidewater", "r-paper-moons"], released: day(2024, 4, 12), cover: 3 },
  { id: "rel-lowlight", kind: "Release", title: "Lowlight", artist: "Tobi Renn", upc: "5063217411300", revenue: 0, labelId: "p-kestrel", items: ["r-lowlight", "r-glass-coast"], released: day(2025, 2, 21), cover: 7 },
  { id: "rel-switchback", kind: "Release", title: "Switchback", artist: "Juno Hale", upc: "5063217412847", revenue: 0, labelId: "p-kestrel", items: ["r-switchback", "r-ember"], released: day(2025, 6, 6), cover: 11 },
  { id: "rel-ferry", kind: "Release", title: "Last Ferry Out", artist: "Mira Castellanos", upc: "5063217414001", revenue: 0, labelId: "p-kestrel", items: ["r-ferry", "r-tidewater-remix"], released: day(2026, 1, 30), cover: 15 },
  { id: "rel-harbour-lights", kind: "Release", title: "Harbour Lights", artist: "Mira Castellanos", upc: "5063217415923", revenue: 0, labelId: "p-kestrel", items: ["r-harbour-lights"], released: day(2026, 10, 30), cover: 19 },
];

export const assetById = (id: string) => ASSETS.find((one) => one.id === id)!;
export const recordings = () => ASSETS.filter((one) => one.kind === "Recording");
export const works = () => ASSETS.filter((one) => one.kind === "Work");
export const videos = () => ASSETS.filter((one) => one.kind === "Video");
export const releases = () => ASSETS.filter((one) => one.kind === "Release");

// ---------------------------------------------------------------------------------------------
// Agreements

export const AGREEMENTS: readonly Agreement[] = [
  { id: "a-101", code: "AGR-101", title: "Ana Lindgren — exclusive songwriter agreement", kind: "Publishing", parties: ["p-harbor", "p-ana"], from: day(2024, 1, 1), to: day(2031, 12, 31), basis: "At source", territory: WORLD, clauses: ["§4.2 Administration worldwide", "§9 Reversion to writer on expiry", "§11.3 AI uses need the writer's written consent"] },
  { id: "a-205", code: "AGR-205", title: "Harbor Music → Rhein Edition sub-publishing (DACH)", kind: "Sub-publishing", parties: ["p-rhein", "p-harbor"], from: day(2025, 1, 1), to: day(2027, 12, 31), basis: "Receipts", territory: only("DE", "AT", "CH"), clauses: ["§2 Mechanical and performance only", "§6 Receipts basis, 20% retention"] },
  { id: "a-310", code: "AGR-310", title: "Mira Castellanos — exclusive recording agreement", kind: "Recording", parties: ["p-kestrel", "p-mira"], from: day(2023, 9, 1), to: day(2030, 8, 31), territory: WORLD, clauses: ["§7.1 Label may consent to AI uses of masters", "§7.4 Label may attest Voice/NIL on the artist's behalf for approved partners", "§12 Masters revert 2040"] },
  { id: "a-311", code: "AGR-311", title: "Tobi Renn — licence agreement", kind: "Recording", parties: ["p-kestrel", "p-tobi"], from: day(2024, 11, 1), to: day(2029, 10, 31), territory: except("US", "CA"), clauses: ["§3 Licence term five years", "§8 No AI uses without the artist's signed consent"] },
  { id: "a-312", code: "AGR-312", title: "Juno Hale — recording agreement", kind: "Recording", parties: ["p-kestrel", "p-juno"], from: day(2025, 3, 1), territory: WORLD, clauses: ["§6 Label may consent to AI training"] },
  { id: "a-404", code: "AGR-404", title: "Ben Okafor — Ben Songs self-publishing declaration", kind: "Administration", parties: ["p-bensongs", "p-ben"], from: day(2024, 3, 1), territory: WORLD },
  { id: "a-520", code: "AGR-520", title: "Kestrel Point — Bluefen distribution", kind: "Distribution", parties: ["p-bluefen", "p-kestrel"], from: day(2023, 1, 1), territory: WORLD },
];

export const agreementById = (id: string) => AGREEMENTS.find((one) => one.id === id);

// ---------------------------------------------------------------------------------------------
// Rights assertions — rows 1–5 are the doc's worked example, as written there.

const known = day(2026, 3, 2);

export let ASSERTIONS: Assertion[] = [
  { id: "as-1", assetId: "w-northbound", partyId: "p-harbor", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 50, territory: WORLD, from: day(2024, 1, 1), to: day(2031, 12, 31), source: "Signed agreement", sourceRef: "AGR-101", agreementId: "a-101", known: day(2024, 1, 9), state: "Resolved" },
  { id: "as-2", assetId: "w-northbound", partyId: "p-bensongs", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 50, territory: WORLD, from: day(2024, 3, 1), source: "Society acknowledgement", sourceRef: "CWR ack ASCAP 2024-03-118", agreementId: "a-404", known: day(2024, 3, 14), state: "Resolved" },
  { id: "as-3", assetId: "w-northbound", partyId: "p-rhein", interests: ["Administers", "Collects"], side: "Composition", rights: ["Mechanical", "Performance"], shareType: "Publisher", share: 50, shareOf: "Harbor Music's 50%", territory: only("DE", "AT", "CH"), from: day(2025, 1, 1), to: day(2027, 12, 31), basis: "Receipts", source: "Signed agreement", sourceRef: "AGR-205", agreementId: "a-205", known: day(2025, 1, 6), state: "Resolved" },
  { id: "as-4", assetId: "w-northbound", partyId: "p-harbor", interests: ["Collects"], side: "Composition", rights: ["Mechanical", "Performance"], shareType: "Publisher", share: 50, territory: except("DE", "AT", "CH"), from: day(2024, 1, 1), to: day(2031, 12, 31), source: "Signed agreement", sourceRef: "AGR-101", agreementId: "a-101", known: day(2025, 1, 6), state: "Resolved" },
  { id: "as-5", assetId: "w-northbound", partyId: "p-harbor", interests: ["Owns"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 60, territory: only("DE"), from: day(2026, 3, 1), source: "Society acknowledgement", sourceRef: "GEMA ack 2026-03-0412", known: day(2026, 3, 2), state: "Contested" },
  // Writer shares on Northbound
  { id: "as-6", assetId: "w-northbound", partyId: "p-ana", interests: ["Owns"], side: "Composition", rights: "All composition", shareType: "Writer", share: 50, territory: WORLD, from: day(2024, 1, 1), source: "Signed agreement", sourceRef: "AGR-101", agreementId: "a-101", known: day(2024, 1, 9), state: "Resolved" },
  { id: "as-7", assetId: "w-northbound", partyId: "p-ben", interests: ["Owns"], side: "Composition", rights: "All composition", shareType: "Writer", share: 50, territory: WORLD, from: day(2024, 3, 1), source: "Self-declared", sourceRef: "Split sheet 2024-02-27", known: day(2024, 3, 1), state: "Resolved" },

  // Master side — Kestrel's recordings
  { id: "as-10", assetId: "r-northbound", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: WORLD, from: day(2024, 4, 12), source: "Signed agreement", sourceRef: "AGR-310", agreementId: "a-310", known: day(2024, 4, 2), state: "Resolved" },
  { id: "as-11", assetId: "r-northbound", partyId: "p-bluefen", interests: ["Administers"], side: "Master", rights: ["Making available"], shareType: "Master", share: 100, territory: WORLD, from: day(2024, 4, 12), source: "Label declaration", sourceRef: "DDEX ERN 4.3 · BLF-24-0412", agreementId: "a-520", known: day(2024, 4, 12), state: "Resolved" },
  { id: "as-12", assetId: "r-tidewater", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: WORLD, from: day(2024, 4, 12), source: "Signed agreement", sourceRef: "AGR-310", agreementId: "a-310", known: day(2024, 4, 2), state: "Resolved" },
  { id: "as-13", assetId: "r-paper-moons", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: WORLD, from: day(2024, 4, 12), source: "Signed agreement", sourceRef: "AGR-310", agreementId: "a-310", known: day(2024, 4, 2), state: "Resolved" },
  // A platform claim — evidence only, never resolves.
  { id: "as-14", assetId: "r-paper-moons", partyId: "p-halcyon", interests: ["Owns"], side: "Master", rights: ["UGC"], shareType: "Master", share: 100, territory: WORLD, from: day(2026, 8, 3), source: "Platform claim", sourceRef: "Content ID claim 7731-PM", known: day(2026, 8, 4), state: "Contested" },
  // Licence: Tobi outside US/CA only — a gap in US, CA.
  { id: "as-15", assetId: "r-lowlight", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: except("US", "CA"), from: day(2024, 11, 1), to: day(2029, 10, 31), source: "Signed agreement", sourceRef: "AGR-311", agreementId: "a-311", known: day(2024, 11, 2), state: "Resolved" },
  { id: "as-16", assetId: "r-glass-coast", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: except("US", "CA"), from: day(2024, 11, 1), to: day(2029, 10, 31), source: "Signed agreement", sourceRef: "AGR-311", agreementId: "a-311", known: day(2024, 11, 2), state: "Resolved" },
  { id: "as-17", assetId: "r-switchback", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: WORLD, from: day(2025, 6, 6), source: "Signed agreement", sourceRef: "AGR-312", agreementId: "a-312", known: day(2025, 5, 30), state: "Resolved" },
  { id: "as-18", assetId: "r-ember", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: WORLD, from: day(2025, 6, 6), source: "Signed agreement", sourceRef: "AGR-312", agreementId: "a-312", known: day(2025, 5, 30), state: "Resolved" },
  { id: "as-19", assetId: "r-ferry", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: WORLD, from: day(2026, 1, 30), source: "Signed agreement", sourceRef: "AGR-310", agreementId: "a-310", known: day(2026, 1, 20), state: "Resolved" },
  { id: "as-20", assetId: "r-harbour-lights", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: WORLD, from: day(2026, 10, 30), source: "Label declaration", sourceRef: "Revelator Pro release 5063217415923", known: day(2026, 10, 19), state: "Resolved" },
  { id: "as-21", assetId: "r-tidewater-remix", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: WORLD, from: day(2026, 1, 30), source: "Label declaration", sourceRef: "Revelator Pro release 5063217414001", known: day(2026, 1, 20), state: "Resolved" },
  { id: "as-22", assetId: "v-northbound", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: WORLD, from: day(2024, 5, 3), source: "Signed agreement", sourceRef: "AGR-310", agreementId: "a-310", known: day(2024, 5, 1), state: "Resolved" },
  { id: "as-23", assetId: "v-switchback-live", partyId: "p-kestrel", interests: ["Owns", "Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: WORLD, from: day(2025, 9, 12), source: "Label declaration", sourceRef: "Revelator Pro video GBKPV2500077", known: day(2025, 9, 10), state: "Resolved" },

  // Composition side on the other works
  { id: "as-30", assetId: "w-tidewater", partyId: "p-harbor", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 100, territory: WORLD, from: day(2024, 1, 1), to: day(2031, 12, 31), source: "Signed agreement", sourceRef: "AGR-101", agreementId: "a-101", known: day(2024, 1, 9), state: "Resolved" },
  { id: "as-31", assetId: "w-tidewater", partyId: "p-ana", interests: ["Owns"], side: "Composition", rights: "All composition", shareType: "Writer", share: 100, territory: WORLD, from: day(2024, 1, 1), source: "Signed agreement", sourceRef: "AGR-101", agreementId: "a-101", known: day(2024, 1, 9), state: "Resolved" },
  { id: "as-32", assetId: "w-paper-moons", partyId: "p-silverbirch", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 70, territory: WORLD, from: day(2023, 6, 1), source: "Society acknowledgement", sourceRef: "CWR ack PRS 2023-06-551", known: day(2023, 6, 20), state: "Resolved" },
  // A gap: 70% held, 30% unclaimed.
  { id: "as-33", assetId: "w-lowlight", partyId: "p-silverbirch", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 100, territory: WORLD, from: day(2024, 10, 1), source: "CWR submitted", sourceRef: "CWR 3.1 SPH-2410-07", known: day(2024, 10, 8), state: "Resolved" },
  { id: "as-34", assetId: "w-glass-coast", partyId: "p-silverbirch", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 100, territory: WORLD, from: day(2024, 10, 1), source: "CWR submitted", sourceRef: "CWR 3.1 SPH-2410-07", known: day(2024, 10, 8), state: "Resolved" },
  { id: "as-35", assetId: "w-ferry", partyId: "p-harbor", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 50, territory: WORLD, from: day(2025, 11, 1), source: "Signed agreement", sourceRef: "AGR-101", agreementId: "a-101", known: day(2025, 11, 3), state: "Resolved" },
  { id: "as-36", assetId: "w-ferry", partyId: "p-silverbirch", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 50, territory: WORLD, from: day(2025, 11, 1), source: "Label declaration", sourceRef: "DDEX MWN · KPR-2601-044", known: day(2026, 1, 21), state: "Resolved" },
  { id: "as-37", assetId: "w-switchback", partyId: "p-silverbirch", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 100, territory: WORLD, from: day(2025, 5, 1), source: "Society acknowledgement", sourceRef: "CWR ack PRS 2025-05-208", known: day(2025, 5, 22), state: "Resolved" },
  { id: "as-38", assetId: "w-ember", partyId: "p-harbor", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 100, territory: WORLD, from: day(2025, 5, 1), source: "CWR submitted", sourceRef: "CWR 3.1 HBM-2505-02", known: day(2025, 5, 9), state: "Resolved" },
  // A correction chain — the old row stays.
  { id: "as-39", assetId: "w-paper-moons", partyId: "p-silverbirch", interests: ["Owns", "Controls"], side: "Composition", rights: "All composition", shareType: "Publisher", share: 60, territory: WORLD, from: day(2023, 6, 1), source: "Self-declared", sourceRef: "Publisher portal 2023-05-30", known: day(2023, 5, 30), state: "Superseded" },
  // A grant-like claim with no authority edge.
  { id: "as-40", assetId: "r-lowlight", partyId: "p-kestrel", interests: ["Controls"], side: "Master", rights: "All master", shareType: "Master", share: 100, territory: only("US", "CA"), from: day(2026, 9, 1), source: "Label declaration", sourceRef: "Revelator Pro claim 2026-09-01", known, state: "No authority" },
];

export const assertionsOn = (assetId: string) => ASSERTIONS.filter((one) => one.assetId === assetId);
export const assertionById = (id: string) => ASSERTIONS.find((one) => one.id === id)!;

// ---------------------------------------------------------------------------------------------
// Clearance grants — stored at the scope they were made.

export let GRANTS: Grant[] = [
  // F1/F2: catalogue-level AI training for two named partners, master side.
  { id: "g-1", level: "Catalogue", ref: "p-kestrel", side: "Master", use: "AI training", effect: "Grant", partners: { mode: "Allowlist", ids: ["p-cadence", "p-lyra", "p-voxa"] }, territory: WORLD, from: day(2026, 9, 15), grantedBy: "p-kestrel", decided: { actor: "Priya Raman", onBehalfOf: "Kestrel Point Recordings", authority: "AGR-310 §7.1", at: at(2026, 9, 15, 10, 12) }, conditions: ["Dynamic licence model", "Usage reported monthly"], state: "Live" },
  { id: "g-2", level: "Catalogue", ref: "p-kestrel", side: "Master", use: "AI derivative", effect: "Grant", partners: { mode: "Allowlist", ids: ["p-cadence"] }, territory: WORLD, from: day(2026, 9, 15), grantedBy: "p-kestrel", decided: { actor: "Priya Raman", onBehalfOf: "Kestrel Point Recordings", authority: "AGR-310 §7.1", at: at(2026, 9, 15, 10, 14) }, conditions: ["Attribution required"], state: "Live" },
  // A sensitive track gets an asset-level deny override.
  { id: "g-3", level: "Asset", ref: "r-lowlight", side: "Master", use: "AI training", effect: "Deny", partners: { mode: "All approved", ids: [] }, territory: WORLD, from: day(2026, 9, 15), grantedBy: "p-kestrel", decided: { actor: "Priya Raman", onBehalfOf: "Kestrel Point Recordings", authority: "AGR-311 §8", at: at(2026, 9, 15, 10, 20) }, state: "Live" },
  // Distribution and sync.
  { id: "g-4", level: "Catalogue", ref: "p-kestrel", side: "Master", use: "Stream", effect: "Grant", partners: { mode: "All approved", ids: [] }, territory: WORLD, from: day(2023, 1, 1), grantedBy: "p-kestrel", decided: { actor: "Bluefen Distribution", onBehalfOf: "Kestrel Point Recordings", authority: "AGR-520", at: at(2023, 1, 4, 9) }, state: "Live" },
  { id: "g-5", level: "Catalogue", ref: "p-kestrel", side: "Master", use: "Download", effect: "Grant", partners: { mode: "All approved", ids: [] }, territory: WORLD, from: day(2023, 1, 1), grantedBy: "p-kestrel", decided: { actor: "Bluefen Distribution", onBehalfOf: "Kestrel Point Recordings", authority: "AGR-520", at: at(2023, 1, 4, 9) }, state: "Live" },
  { id: "g-6", level: "Catalogue", ref: "p-kestrel", side: "Master", use: "UGC", effect: "Grant", partners: { mode: "All approved", ids: [] }, territory: WORLD, from: day(2023, 1, 1), grantedBy: "p-kestrel", decided: { actor: "Priya Raman", onBehalfOf: "Kestrel Point Recordings", authority: "AGR-520", at: at(2023, 1, 4, 9) }, state: "Live" },
  { id: "g-7", level: "Release", ref: "rel-northbound", side: "Master", use: "Sync", effect: "Grant", partners: { mode: "All approved", ids: [] }, territory: only("US", "GB", "CA"), from: day(2024, 6, 1), grantedBy: "p-kestrel", decided: { actor: "Priya Raman", onBehalfOf: "Kestrel Point Recordings", authority: "AGR-310", at: at(2024, 6, 1, 14) }, state: "Live" },
  { id: "g-8", level: "Asset", ref: "v-northbound", side: "Master", use: "Sync", effect: "Grant", partners: { mode: "All approved", ids: [] }, territory: only("US"), from: day(2024, 6, 1), grantedBy: "p-kestrel", decided: { actor: "Priya Raman", onBehalfOf: "Kestrel Point Recordings", authority: "AGR-310", at: at(2024, 6, 1, 14) }, state: "Live" },
  // Composition side: Harbor grants sync on Northbound; Ben Songs grants nothing (the doc's example).
  { id: "g-9", level: "Asset", ref: "w-northbound", side: "Composition", use: "Sync", effect: "Grant", partners: { mode: "All approved", ids: [] }, territory: only("US"), from: day(2024, 6, 10), grantedBy: "p-harbor", decided: { actor: "Elena Marsh", onBehalfOf: "Harbor Music", authority: "AGR-101 §4.2", at: at(2024, 6, 10, 11) }, state: "Live" },
  { id: "g-10", level: "Catalogue", ref: "p-harbor", side: "Composition", use: "Stream", effect: "Grant", partners: { mode: "All approved", ids: [] }, territory: WORLD, from: day(2024, 1, 1), grantedBy: "p-harbor", decided: { actor: "Elena Marsh", onBehalfOf: "Harbor Music", authority: "AGR-101", at: at(2024, 1, 9, 9) }, state: "Live" },
  { id: "g-11", level: "Catalogue", ref: "p-silverbirch", side: "Composition", use: "Stream", effect: "Grant", partners: { mode: "All approved", ids: [] }, territory: WORLD, from: day(2023, 1, 1), grantedBy: "p-silverbirch", decided: { actor: "Owen Brightwater", onBehalfOf: "Silverbirch Publishing House", at: at(2023, 1, 2, 9) }, state: "Live" },
  { id: "g-12", level: "Catalogue", ref: "p-bensongs", side: "Composition", use: "Stream", effect: "Grant", partners: { mode: "All approved", ids: [] }, territory: WORLD, from: day(2024, 3, 1), grantedBy: "p-bensongs", decided: { actor: "Ben Okafor", onBehalfOf: "Ben Songs", at: at(2024, 3, 1, 9) }, state: "Live" },
  // F2: Silverbirch grants composition-side AI training to Cadence AI; Harbor has not.
  { id: "g-13", level: "Catalogue", ref: "p-silverbirch", side: "Composition", use: "AI training", effect: "Grant", partners: { mode: "Allowlist", ids: ["p-cadence"] }, territory: WORLD, from: day(2026, 10, 8), grantedBy: "p-silverbirch", decided: { actor: "Owen Brightwater", onBehalfOf: "Silverbirch Publishing House", authority: "Inbox request RQ-2207", at: at(2026, 10, 8, 16, 40) }, state: "Live" },
  // F3: Voice/NIL attested on Mira's behalf by the label, then disputed — paused.
  { id: "g-14", level: "Artist", ref: "p-mira", side: "Master", use: "Voice/NIL", effect: "Grant", partners: { mode: "Allowlist", ids: ["p-voxa"] }, territory: WORLD, from: day(2026, 10, 12), grantedBy: "p-kestrel", decided: { actor: "Priya Raman", onBehalfOf: "Mira Castellanos", authority: "AGR-310 §7.4", at: at(2026, 10, 12, 15, 2) }, conditions: ["Attestation required", "Flat licence model"], state: "Paused" },
  // Juno's artist-level opt-out.
  { id: "g-15", level: "Artist", ref: "p-juno", side: "Master", use: "Voice/NIL", effect: "Deny", partners: { mode: "All approved", ids: [] }, territory: WORLD, from: day(2026, 7, 2), grantedBy: "p-juno", decided: { actor: "Juno Hale", at: at(2026, 7, 2, 20, 11) }, conditions: ["AI opt-out"], state: "Live" },
  // Stored, flagged, never auto-clears: granted on a territory with no controlling edge.
  { id: "g-16", level: "Asset", ref: "r-lowlight", side: "Master", use: "Sync", effect: "Grant", partners: { mode: "All approved", ids: [] }, territory: only("US", "CA"), from: day(2026, 9, 1), grantedBy: "p-kestrel", decided: { actor: "Sam Okoro", onBehalfOf: "Kestrel Point Recordings", at: at(2026, 9, 1, 12) }, state: "Live", unauthorized: true },
];

export const grantById = (id: string) => GRANTS.find((one) => one.id === id)!;

// ---------------------------------------------------------------------------------------------
// Credits and attestations

export let CREDITS: Credit[] = [
  { id: "c-1", assetId: "r-northbound", partyId: "p-mira", role: "Main artist", credited: "Mira Castellanos", state: "Confirmed" },
  { id: "c-2", assetId: "r-tidewater", partyId: "p-mira", role: "Main artist", credited: "Mira Castellanos", state: "Confirmed" },
  { id: "c-3", assetId: "r-paper-moons", partyId: "p-mira", role: "Main artist", credited: "Mira Castellanos", state: "To confirm" },
  { id: "c-4", assetId: "r-ferry", partyId: "p-mira", role: "Main artist", credited: "Mira Castellanos", state: "Confirmed" },
  { id: "c-5", assetId: "r-ferry", partyId: "p-tobi", role: "Featured artist", credited: "Tobi Renn", state: "To confirm" },
  { id: "c-6", assetId: "r-harbour-lights", partyId: "p-mira", role: "Main artist", credited: "Mira Castellanos", state: "To confirm" },
  { id: "c-7", assetId: "r-tidewater-remix", partyId: "p-mira", role: "Main artist", credited: "Mira Castellanos", state: "To confirm" },
  { id: "c-8", assetId: "r-lowlight", partyId: "p-tobi", role: "Main artist", credited: "Tobi Renn", state: "Confirmed" },
  { id: "c-9", assetId: "r-glass-coast", partyId: "p-tobi", role: "Main artist", credited: "Tobi Renn", state: "Confirmed" },
  { id: "c-10", assetId: "r-switchback", partyId: "p-juno", role: "Main artist", credited: "Juno Hale", state: "Confirmed" },
  { id: "c-11", assetId: "r-ember", partyId: "p-juno", role: "Main artist", credited: "Juno Hale", state: "Confirmed" },
  { id: "c-12", assetId: "r-northbound", partyId: "p-ana", role: "Background vocals", credited: "A. Lindgren", state: "To confirm" },
  { id: "c-13", assetId: "w-northbound", partyId: "p-ana", role: "Composer, lyricist", credited: "Ana Lindgren", state: "Confirmed" },
  { id: "c-14", assetId: "w-northbound", partyId: "p-ben", role: "Composer", credited: "Ben Okafor", state: "Confirmed" },
  { id: "c-15", assetId: "w-tidewater", partyId: "p-ana", role: "Composer, lyricist", credited: "Ana Lindgren", state: "Confirmed" },
  { id: "c-16", assetId: "w-ferry", partyId: "p-ana", role: "Lyricist", credited: "Ana Lindgren", state: "To confirm" },
  { id: "c-17", assetId: "w-ember", partyId: "p-ana", role: "Composer", credited: "Ana Lindgren", state: "Denied" },
  { id: "c-18", assetId: "r-tidewater", partyId: "p-tobi", role: "Producer", credited: "T. Renn", state: "Denied" },
];

export let ATTESTATIONS: Attestation[] = [
  { id: "at-1", attestor: "p-mira", subject: { kind: "Credit", id: "c-1" }, claim: "Role confirmed", assurance: "Verified + ID", issued: at(2026, 6, 3, 9, 41), state: "Signed", keyId: "artistid-mira-2026a" },
  { id: "at-2", attestor: "p-mira", subject: { kind: "Credit", id: "c-2" }, claim: "Role confirmed", assurance: "Verified + ID", issued: at(2026, 6, 3, 9, 42), state: "Signed", keyId: "artistid-mira-2026a" },
  { id: "at-3", attestor: "p-mira", subject: { kind: "Asset", id: "r-northbound" }, claim: "Human performed", assurance: "Verified + ID", issued: at(2026, 6, 3, 9, 44), state: "Signed", keyId: "artistid-mira-2026a" },
  // F3 — the label attested on Mira's behalf; she disputed it.
  { id: "at-4", attestor: "p-kestrel", onBehalfOf: "p-mira", subject: { kind: "Grant", id: "g-14" }, claim: "Voice/NIL consent", assurance: "Verified", authority: "AGR-310 §7.4", issued: at(2026, 10, 12, 15, 2), state: "Disputed", keyId: "kestrel-label-2026" },
  { id: "at-5", attestor: "p-juno", subject: { kind: "Artist", id: "p-juno" }, claim: "AI opt-out", assurance: "Verified", issued: at(2026, 7, 2, 20, 11), state: "Signed", keyId: "artistid-juno-2026" },
  { id: "at-6", attestor: "p-tobi", subject: { kind: "Asset", id: "r-lowlight" }, claim: "AI disclosure", assurance: "Basic", issued: at(2026, 2, 26, 13, 5), state: "Signed", keyId: "artistid-tobi-2026" },
  { id: "at-7", attestor: "p-ana", subject: { kind: "Credit", id: "c-13" }, claim: "Role confirmed", assurance: "Verified + ID", issued: at(2026, 5, 18, 11, 2), state: "Signed", keyId: "artistid-ana-2026" },
  { id: "at-8", attestor: "p-ana", subject: { kind: "Credit", id: "c-17" }, claim: "Role denied", assurance: "Verified + ID", issued: at(2026, 9, 29, 18, 30), state: "Signed", keyId: "artistid-ana-2026" },
  { id: "at-9", attestor: "p-mira", subject: { kind: "Credit", id: "c-4" }, claim: "Role confirmed", assurance: "Verified + ID", issued: at(2026, 2, 2, 10, 1), state: "Signed", keyId: "artistid-mira-2026a" },
  { id: "at-10", attestor: "p-kestrel", onBehalfOf: "p-tobi", subject: { kind: "Grant", id: "g-3" }, claim: "AI opt-out", assurance: "Verified", authority: "AGR-311 §8", issued: at(2026, 9, 15, 10, 20), state: "Requested", keyId: "kestrel-label-2026" },
];

// ---------------------------------------------------------------------------------------------
// Conflicts

export let CONFLICTS: Conflict[] = [
  { id: "cf-1", kind: "Overclaim", assetId: "w-northbound", side: "Composition", severity: "High", revenueAtRisk: 14460, total: 110, territories: ["DE"], claims: ["as-5", "as-2"], parties: ["p-harbor", "p-bensongs"], opened: day(2026, 3, 2), state: "Awaiting evidence", step: 1, assignee: "Lior Ben-Ami", interim: "Paying on the signed agreement and the CWR ack (rows 1–3) until resolved.", raisedBy: "GEMA acknowledgement · Free lane" },
  { id: "cf-2", kind: "Missing work link", assetId: "r-switchback", side: "Composition", severity: "High", revenueAtRisk: 33900, territories: ["World"], claims: ["as-17"], parties: ["p-kestrel"], opened: day(2025, 7, 1), state: "Open", step: 0, interim: "Publishing income held unmatched.", raisedBy: "Nightly scan" },
  { id: "cf-3", kind: "Missing work link", assetId: "r-ember", side: "Composition", severity: "Medium", revenueAtRisk: 21480, territories: ["World"], claims: ["as-18"], parties: ["p-kestrel"], opened: day(2025, 7, 1), state: "Open", step: 0, interim: "Publishing income held unmatched.", raisedBy: "Nightly scan" },
  { id: "cf-4", kind: "Gap", assetId: "w-paper-moons", side: "Composition", severity: "Medium", revenueAtRisk: 6720, total: 70, territories: ["World"], claims: ["as-32"], parties: ["p-silverbirch"], opened: day(2026, 1, 4), state: "Open", step: 0, interim: "30% held in suspense.", raisedBy: "Nightly gap scan" },
  { id: "cf-5", kind: "Gap", assetId: "r-lowlight", side: "Master", severity: "High", revenueAtRisk: 9800, total: 0, territories: ["US", "CA"], claims: ["as-15", "as-40"], parties: ["p-kestrel"], opened: day(2026, 9, 2), state: "Open", step: 0, interim: "US and CA income held: the licence excludes them.", raisedBy: "Nightly gap scan" },
  { id: "cf-6", kind: "Attestation dispute", assetId: "r-northbound", side: "Master", severity: "High", revenueAtRisk: 0, territories: ["World"], claims: [], parties: ["p-kestrel", "p-mira"], opened: day(2026, 10, 14), state: "Open", step: 0, assignee: "Noor Haddad", interim: "Voice/NIL grant to Voxa Voice paused pending review.", raisedBy: "Artist app dispute" },
  { id: "cf-7", kind: "Territory overlap", assetId: "r-paper-moons", side: "Master", severity: "Low", revenueAtRisk: 1210, territories: ["World"], claims: ["as-13", "as-14"], parties: ["p-kestrel", "p-halcyon"], opened: day(2026, 8, 4), state: "Open", step: 0, interim: "Platform claims are evidence only: paying on the signed agreement.", raisedBy: "YouTube Content ID · Free lane" },
  { id: "cf-8", kind: "Overclaim", assetId: "w-tidewater", side: "Composition", severity: "High", revenueAtRisk: 11300, total: 125, territories: ["FR", "DE", "IT", "ES", "NL", "BE", "AT", "CH"], accepted: [], claims: ["as-30"], parties: ["p-harbor", "p-meridian"], opened: day(2026, 10, 6), state: "Open", step: 0, interim: "Paying on the signed agreement until resolved.", raisedBy: "Meridian Music Group upload · Borrowed lane" },
  { id: "cf-9", kind: "Unauthorized grant", assetId: "r-lowlight", side: "Master", severity: "Medium", revenueAtRisk: 0, territories: ["US", "CA"], claims: [], parties: ["p-kestrel"], opened: day(2026, 9, 1), state: "Open", step: 0, interim: "Grant stored and flagged; it never auto-clears.", raisedBy: "Authority check on write" },
  { id: "cf-10", kind: "Expired but paying", assetId: "w-glass-coast", side: "Composition", severity: "Low", revenueAtRisk: 860, territories: ["JP"], claims: ["as-34"], parties: ["p-silverbirch"], opened: day(2026, 9, 18), state: "Resolved", step: 3, interim: "Nothing held once resolved.", resolution: { actor: "Lior Ben-Ami", at: at(2026, 10, 2, 13), reason: "Sub-publisher term confirmed renewed; evidence on file.", rule: "Resolver v1.3 · precedence 1" }, raisedBy: "Nightly scan" },
];

export const conflictById = (id: string) => CONFLICTS.find((one) => one.id === id)!;

// ---------------------------------------------------------------------------------------------
// Requests — the approval inbox (S4), across every party's.

export let REQUESTS: Request[] = [
  { id: "rq-2201", type: "Licence", from: "p-tessellate", to: "p-kestrel", use: "AI training", side: "Master", scope: { level: "Catalogue", ref: "p-kestrel", name: "Kestrel Point catalogue", assets: 10 }, territory: WORLD, start: day(2026, 11, 1), end: day(2027, 10, 31), deadline: day(2026, 10, 27), received: at(2026, 10, 18, 9, 30), state: "Needs decision", purpose: "Training a stem-separation model; outputs are not released as music.", licenceModel: "Dynamic" },
  { id: "rq-2202", type: "Licence", from: "p-cadence", to: "p-kestrel", use: "AI training", side: "Master", scope: { level: "Catalogue", ref: "p-kestrel", name: "Kestrel Point catalogue", assets: 10 }, territory: WORLD, start: day(2026, 10, 1), deadline: day(2026, 10, 10), received: at(2026, 10, 3, 14), state: "Auto-cleared", clearedBy: "g-1", purpose: "Foundation model training run CD-7.", licenceModel: "Dynamic" },
  { id: "rq-2203", type: "Licence", from: "p-voxa", to: "p-kestrel", use: "Voice/NIL", side: "Master", scope: { level: "Artist", ref: "p-mira", name: "Mira Castellanos", assets: 6 }, territory: WORLD, start: day(2026, 10, 15), deadline: day(2026, 10, 14), received: at(2026, 10, 9, 11), state: "Approved", purpose: "A licensed voice model for a branded campaign.", decided: { actor: "Priya Raman", onBehalfOf: "Mira Castellanos", authority: "AGR-310 §7.4", at: at(2026, 10, 12, 15, 2) }, licenceModel: "Flat" },
  { id: "rq-2204", type: "Licence", from: "p-openwave-sync", to: "p-kestrel", use: "Sync", side: "Master", scope: { level: "Asset", ref: "v-switchback-live", name: "Switchback (Live at Fieldhouse)", assets: 1 }, territory: only("US"), start: day(2026, 11, 15), end: day(2027, 5, 15), deadline: day(2026, 10, 24), received: at(2026, 10, 19, 16, 5), state: "Needs decision", purpose: "Documentary series, episode 3 end credits.", licenceModel: "Flat" },
  { id: "rq-2205", type: "Licence", from: "p-lyra", to: "p-kestrel", use: "AI streaming", side: "Master", scope: { level: "Release", ref: "rel-lowlight", name: "Lowlight", assets: 2 }, territory: except("US", "CA"), start: day(2026, 11, 1), deadline: day(2026, 10, 12), received: at(2026, 10, 2, 8, 50), state: "Escalated", purpose: "Adaptive remixes in a fitness app.", licenceModel: "Dynamic" },
  // F2 composition side, in two publishers' inboxes.
  { id: "rq-2206", type: "Licence", from: "p-cadence", to: "p-harbor", use: "AI training", side: "Composition", scope: { level: "Catalogue", ref: "p-harbor", name: "Works on Kestrel Point recordings", assets: 4 }, territory: WORLD, start: day(2026, 10, 1), deadline: day(2026, 10, 24), received: at(2026, 10, 3, 14), state: "Needs decision", purpose: "Foundation model training run CD-7 — composition side.", licenceModel: "Dynamic" },
  { id: "rq-2207", type: "Licence", from: "p-cadence", to: "p-silverbirch", use: "AI training", side: "Composition", scope: { level: "Catalogue", ref: "p-silverbirch", name: "Works on Kestrel Point recordings", assets: 5 }, territory: WORLD, start: day(2026, 10, 1), deadline: day(2026, 10, 24), received: at(2026, 10, 3, 14), state: "Approved", purpose: "Foundation model training run CD-7 — composition side.", decided: { actor: "Owen Brightwater", onBehalfOf: "Silverbirch Publishing House", at: at(2026, 10, 8, 16, 40) }, licenceModel: "Dynamic" },
  { id: "rq-2208", type: "Licence", from: "p-openwave-sync", to: "p-harbor", use: "Sync", side: "Composition", scope: { level: "Asset", ref: "w-northbound", name: "Northbound — Harbor Music's 50%", assets: 1 }, territory: only("GB"), start: day(2026, 12, 1), deadline: day(2026, 10, 30), received: at(2026, 10, 20, 8, 15), state: "Needs decision", purpose: "Television advertisement, 30 seconds, UK only.", licenceModel: "Flat" },
  // Other types.
  { id: "rq-2209", type: "Conflict response", from: "p-sureel", to: "p-kestrel", scope: { level: "Asset", ref: "r-lowlight", name: "Lowlight", assets: 1 }, territory: only("US", "CA"), start: day(2026, 9, 2), deadline: day(2026, 10, 23), received: at(2026, 9, 2, 3), state: "Needs decision", about: "cf-5", purpose: "Show a controlling edge in US and CA, or withdraw the claim." },
  { id: "rq-2210", type: "Conflict response", from: "p-sureel", to: "p-harbor", scope: { level: "Asset", ref: "w-northbound", name: "Northbound", assets: 1 }, territory: only("DE"), start: day(2026, 3, 2), deadline: day(2026, 10, 29), received: at(2026, 3, 2, 4), state: "Needs decision", about: "cf-1", purpose: "Your GEMA acknowledgement claims 60% in DE; the graph holds 50%." },
  { id: "rq-2211", type: "Credit confirmation", from: "p-kestrel", to: "p-mira", scope: { level: "Asset", ref: "r-harbour-lights", name: "Harbour Lights", assets: 1 }, territory: WORLD, start: day(2026, 10, 19), deadline: day(2026, 10, 30), received: at(2026, 10, 19, 17, 20), state: "Needs decision", about: "c-6", purpose: "Confirm you are the main artist." },
  { id: "rq-2212", type: "Attestation", from: "p-kestrel", to: "p-tobi", scope: { level: "Asset", ref: "r-lowlight", name: "Lowlight", assets: 1 }, territory: WORLD, start: day(2026, 9, 15), deadline: day(2026, 10, 15), received: at(2026, 9, 15, 10, 20), state: "Escalated", about: "at-10", purpose: "Sign the AI opt-out the label recorded for this track." },
  { id: "rq-2213", type: "Delegate approval", from: "p-dara", to: "p-mira", use: "Sync", scope: { level: "Asset", ref: "v-northbound", name: "Northbound (Official Video)", assets: 1 }, territory: only("US"), start: day(2026, 10, 18), deadline: day(2026, 10, 25), received: at(2026, 10, 18, 12), state: "Approved", purpose: "Approved a sync quote on Mira's behalf.", decided: { actor: "Dara Whitlock", onBehalfOf: "Mira Castellanos", authority: "Delegate scope: sync approvals", at: at(2026, 10, 18, 12, 40) } },
  { id: "rq-2214", type: "Credit confirmation", from: "p-kestrel", to: "p-mira", scope: { level: "Asset", ref: "r-paper-moons", name: "Paper Moons", assets: 1 }, territory: WORLD, start: day(2026, 8, 1), deadline: day(2026, 10, 31), received: at(2026, 8, 1, 9), state: "Needs decision", about: "c-3", purpose: "Confirm you are the main artist." },
  { id: "rq-2215", type: "Licence", from: "p-tessellate", to: "p-mira", use: "Voice/NIL", side: "Master", scope: { level: "Artist", ref: "p-mira", name: "Mira Castellanos", assets: 6 }, territory: only("DE", "AT", "CH"), start: day(2026, 11, 1), deadline: day(2026, 10, 28), received: at(2026, 10, 19, 10), state: "Needs decision", purpose: "Voice-cloned narration for an audiobook series.", licenceModel: "Flat" },
];

// ---------------------------------------------------------------------------------------------
// Partners (S6)

export const PARTNERS: readonly Partner[] = [
  { id: "p-cadence", name: "Cadence AI", kind: "AI platform", uses: ["AI training", "AI derivative"], territories: WORLD, joined: day(2026, 8, 20), state: "Active", keys: [{ id: "ck_sbx_7f3a", env: "Sandbox", created: day(2026, 8, 20), scopes: ["clearance:read", "usage:write"], lastUsed: day(2026, 10, 19) }, { id: "ck_live_91d0", env: "Production", created: day(2026, 9, 2), scopes: ["clearance:read", "usage:write", "provenance:write", "requests:write"], lastUsed: day(2026, 10, 20) }], webhooks: [{ url: "https://hooks.cadence.example/graph", events: ["clearance.changed", "licence.revoked"], state: "Enabled" }] },
  { id: "p-lyra", name: "Lyra Labs", kind: "AI platform", uses: ["AI training", "AI streaming"], territories: WORLD, joined: day(2026, 9, 1), state: "Active", keys: [{ id: "ck_sbx_2c11", env: "Sandbox", created: day(2026, 9, 1), scopes: ["clearance:read"] }], webhooks: [] },
  { id: "p-voxa", name: "Voxa Voice", kind: "AI platform", uses: ["Voice/NIL"], territories: WORLD, joined: day(2026, 9, 25), state: "Active", keys: [{ id: "ck_live_a4e9", env: "Production", created: day(2026, 10, 1), scopes: ["clearance:read", "requests:write"], lastUsed: day(2026, 10, 14) }], webhooks: [{ url: "https://api.voxa.example/rg-webhook", events: ["licence.paused", "licence.revoked"], state: "Enabled" }] },
  { id: "p-tessellate", name: "Tessellate", kind: "AI platform", uses: ["AI training", "Voice/NIL"], territories: WORLD, joined: day(2026, 10, 10), state: "Invited", keys: [], webhooks: [] },
  { id: "p-openwave-sync", name: "Openwave Studios", kind: "DSP", uses: ["Sync", "Stream"], territories: WORLD, joined: day(2026, 3, 3), state: "Active", keys: [{ id: "ck_live_0b77", env: "Production", created: day(2026, 3, 3), scopes: ["splits:read", "clearance:read"], lastUsed: day(2026, 10, 20) }], webhooks: [] },
  { id: "p-gema", name: "GEMA", kind: "Society", uses: [], territories: only("DE"), joined: day(2026, 6, 1), state: "Active", keys: [{ id: "ck_live_g3ma", env: "Production", created: day(2026, 6, 1), scopes: ["registrations:write", "claims:read"], lastUsed: day(2026, 10, 18) }], webhooks: [] },
];

// ---------------------------------------------------------------------------------------------
// Contributor tenants, batches, feeds, coverage, proof (S5, S7, S8)

export let TENANTS: Tenant[] = [
  {
    id: "p-meridian",
    name: "Meridian Music Group",
    sharing: [
      { field: "ISRC, ISWC, UPC", level: "Shared" },
      { field: "Titles, artists, writers", level: "Shared" },
      { field: "Ownership share totals", level: "Shared" },
      { field: "Territories and terms", level: "Shared" },
      { field: "Agreement references", level: "Private" },
      { field: "Royalty rates and advances", level: "Encrypted" },
      { field: "Deal basis and retention", level: "Encrypted" },
    ],
    access: [
      { at: at(2026, 10, 20, 7, 12), who: "Resolver v1.3", via: "Internal · match job MJ-8831", what: "Shared fields, 1,204,330 rows" },
      { at: at(2026, 10, 19, 22, 3), who: "Cadence AI", via: "Clearance API · ck_live_91d0", what: "Effective clearance, 18,402 ISRCs" },
      { at: at(2026, 10, 19, 14, 40), who: "Lior Ben-Ami, Sureel ops", via: "Graph Console · audit request AR-112", what: "Agreement reference on 3 works, 30-minute window", audit: true },
      { at: at(2026, 10, 18, 9, 0), who: "Openwave Studios", via: "Splits API · ck_live_0b77", what: "Resolved splits, 211,056 assets" },
      { at: at(2026, 10, 17, 11, 25), who: "Meridian Music Group admin", via: "Contributor portal", what: "Own match results" },
    ],
  },
  // A second contributor, onboarding — so the tenants are a set and not one record.
  {
    id: "p-arcade",
    name: "Mistral Arcade Records",
    sharing: [
      { field: "ISRC, ISWC, UPC", level: "Shared" },
      { field: "Titles, artists, writers", level: "Shared" },
      { field: "Ownership share totals", level: "Private" },
      { field: "Territories and terms", level: "Private" },
      { field: "Agreement references", level: "Private" },
      { field: "Royalty rates and advances", level: "Encrypted" },
    ],
    access: [
      { at: at(2026, 10, 14, 0, 40), who: "Resolver v1.3", via: "Internal · match job MJ-8790", what: "Shared fields, 210,000 rows" },
      { at: at(2026, 10, 13, 16, 2), who: "Mistral Arcade Records admin", via: "Contributor portal", what: "Own match results" },
    ],
  },
];

export let BATCHES: Batch[] = [
  { id: "b-3107", contributor: "p-meridian", file: "MMG_ERN43_catalogue_2026-10-19.zip", format: "DDEX ERN", channel: "SFTP", received: at(2026, 10, 19, 23, 50), rows: 1204330, validated: 1204330, ingested: 1204330, matched: 1204330, errors: 0, state: "Matched", results: { matched: 912204, new: 241880, conflicting: 18406, unmatched: 31840 } },
  { id: "b-3108", contributor: "p-meridian", file: "MMG_publishing_splits_Q3.csv", format: "CSV", channel: "Upload", received: at(2026, 10, 20, 8, 5), rows: 88412, validated: 86930, ingested: 0, matched: 0, errors: 1482, state: "Row errors" },
  { id: "b-3109", contributor: "p-meridian", file: "MMG_CWR31_acks_2026-10.cwr", format: "CWR", channel: "SFTP", received: at(2026, 10, 20, 9, 40), rows: 40118, validated: 22015, ingested: 0, matched: 0, errors: 0, state: "Validating" },
  { id: "b-3101", contributor: "p-meridian", file: "MMG_ERN43_backfill_part1.zip", format: "DDEX ERN", channel: "SFTP", received: at(2026, 10, 12, 2, 0), rows: 2410020, validated: 2410020, ingested: 2410020, matched: 2410020, errors: 0, state: "Matched", results: { matched: 2006412, new: 351990, conflicting: 22104, unmatched: 29514 } },
  { id: "b-3094", contributor: "p-meridian", file: "MMG_rights_extract.parquet", format: "Parquet", channel: "API", received: at(2026, 10, 5, 6, 30), rows: 0, validated: 0, ingested: 0, matched: 0, errors: 0, state: "Rejected" },
];

/** The row errors on a batch that failed validation. */
export const ROW_ERRORS: readonly { row: number; field: string; value: string; problem: string }[] = [
  { row: 118, field: "ISRC", value: "USMM1240091", problem: "11 characters; an ISRC has 12" },
  { row: 431, field: "ISWC", value: "T-034.524.680-2", problem: "Check digit does not match" },
  { row: 902, field: "Territory", value: "EU", problem: "Not an ISO 3166 or CISAC TIS code" },
  { row: 1207, field: "Share", value: "105", problem: "Publisher shares on the row sum to 105%" },
  { row: 3388, field: "IPI", value: "52341887", problem: "IPI name numbers have 11 digits" },
  { row: 5120, field: "Valid from", value: "", problem: "Every rights edge needs a start date" },
  { row: 7744, field: "ISRC", value: "QZ-ES8-24-00071", problem: "Hyphens are not part of an ISRC" },
];

/** A non-standard file's headers, and where mapping thinks each goes (S5-9). */
export const MAPPING: readonly { header: string; sample: string; target?: string; confidence?: number; state: "Unmatched" | "Suggested" | "Completed" }[] = [
  { header: "Song Title", sample: "Copperline", target: "Work title", state: "Completed" },
  { header: "ISWC Code", sample: "T-918.211.004-7", target: "ISWC", state: "Completed" },
  { header: "Writer 1", sample: "R. Avila", target: "Writer name", state: "Completed" },
  { header: "W1 IPI", sample: "00618822304", target: "Writer IPI", confidence: 0.97, state: "Suggested" },
  { header: "W1 %", sample: "33.33", target: "Writer share", confidence: 0.94, state: "Suggested" },
  { header: "Pub", sample: "Meridian Songs", target: "Publisher name", confidence: 0.91, state: "Suggested" },
  { header: "Pub Share", sample: "50", target: "Publisher share", confidence: 0.89, state: "Suggested" },
  { header: "Terr", sample: "WW-US", target: "Territory set", confidence: 0.72, state: "Suggested" },
  { header: "Eff Date", sample: "2019-04-01", target: "Valid from", confidence: 0.86, state: "Suggested" },
  { header: "Internal Ref", sample: "MMG-PUB-004411", state: "Unmatched" },
  { header: "Advance Recoup", sample: "Y", state: "Unmatched" },
  { header: "Notes", sample: "Admin via sub-pub in JP", state: "Unmatched" },
];

export const TARGET_FIELDS: readonly string[] = [
  "Work title", "ISWC", "Writer name", "Writer IPI", "Writer role", "Writer share", "Publisher name", "Publisher IPI",
  "Publisher share", "Interest", "Right type", "Territory set", "Valid from", "Valid to", "Agreement reference",
  "Society", "Society work number", "Recording ISRC", "Deal basis",
];

export const FEEDS: readonly Feed[] = [
  { id: "f-1", name: "WMG Recorded Music — RAD extract", lane: "Owned", channel: "SFTP", last: at(2026, 10, 20, 4), due: at(2026, 10, 20, 6), errorRate: 0.2, lagHours: 3, rows: 4120400, state: "On time" },
  { id: "f-2", name: "Chappell — CWR outbound", lane: "Owned", channel: "CWR", last: at(2026, 10, 18, 2), due: at(2026, 10, 19, 2), errorRate: 0.4, lagHours: 31, rows: 812000, state: "Late" },
  { id: "f-3", name: "MLC — public works data", lane: "Free", channel: "SFTP", last: at(2026, 10, 19, 23), due: at(2026, 10, 20, 23), errorRate: 1.1, lagHours: 9, rows: 9800000, state: "On time" },
  { id: "f-4", name: "SoundExchange — ISRC repertoire", lane: "Free", channel: "API", last: at(2026, 10, 20, 6), due: at(2026, 10, 21, 6), errorRate: 0.6, lagHours: 4, rows: 3100000, state: "On time" },
  { id: "f-5", name: "GEMA — CWR acknowledgements", lane: "Free", channel: "CWR", last: at(2026, 10, 17, 1), due: at(2026, 10, 18, 1), errorRate: 7.8, lagHours: 56, rows: 64000, state: "Failing" },
  { id: "f-6", name: "Meridian Music Group — contributor feed", lane: "Borrowed", channel: "SFTP", last: at(2026, 10, 20, 9, 40), due: at(2026, 10, 21, 0), errorRate: 1.7, lagHours: 1, rows: 1332860, state: "On time" },
  { id: "f-7", name: "Mistral Arcade — contributor feed", lane: "Borrowed", channel: "DDEX", last: at(2026, 10, 14, 0), due: at(2026, 10, 19, 0), errorRate: 0.3, lagHours: 130, rows: 210000, state: "Late" },
  { id: "f-8", name: "BMAT — usage monitoring", lane: "Bought", channel: "API", last: at(2026, 10, 20, 5), due: at(2026, 10, 20, 12), errorRate: 0.9, lagHours: 5, rows: 22000000, state: "On time" },
  { id: "f-9", name: "Revelator Pro — catalogue and splits", lane: "Revelator", channel: "DDEX", last: at(2026, 10, 20, 9, 55), due: at(2026, 10, 20, 10), errorRate: 0.1, lagHours: 0, rows: 4012300, state: "On time" },
  { id: "f-10", name: "Revelator — consent and attestations", lane: "Revelator", channel: "Webhook", last: at(2026, 10, 20, 9, 58), due: at(2026, 10, 20, 10), errorRate: 0, lagHours: 0, rows: 18240, state: "On time" },
];

export const LANES: readonly Lane[] = ["Owned", "Free", "Borrowed", "Bought", "Revelator"];

/** The months coverage is read over — the gate is 30 November. */
export const COVERAGE_MONTHS: readonly Date[] = [day(2026, 5, 1), day(2026, 6, 1), day(2026, 7, 1), day(2026, 8, 1), day(2026, 9, 1), day(2026, 10, 1)];

/** The four coverage measures, revenue-weighted, by lane over the months (percent). */
export const COVERAGE: Record<"Master resolved" | "Join rate" | "Composition resolved" | "Conflict rate", Record<Lane, readonly number[]>> = {
  "Master resolved": { Owned: [41, 46, 52, 58, 63, 67], Free: [4, 5, 6, 7, 8, 9], Borrowed: [0, 0, 0, 2, 6, 11], Bought: [0, 0, 1, 1, 2, 3], Revelator: [9, 10, 11, 12, 12, 13] },
  "Join rate": { Owned: [28, 31, 36, 41, 45, 49], Free: [6, 8, 11, 13, 15, 17], Borrowed: [0, 0, 0, 1, 4, 7], Bought: [0, 1, 2, 3, 4, 5], Revelator: [5, 5, 6, 6, 7, 7] },
  "Composition resolved": { Owned: [22, 25, 29, 33, 37, 40], Free: [7, 9, 11, 12, 14, 15], Borrowed: [0, 0, 0, 1, 3, 5], Bought: [0, 0, 0, 1, 1, 2], Revelator: [3, 3, 4, 4, 5, 5] },
  "Conflict rate": { Owned: [3.1, 3.4, 3.9, 4.2, 4.0, 3.6], Free: [1.2, 1.6, 2.2, 2.8, 3.1, 3.3], Borrowed: [0, 0, 0, 0.4, 1.1, 1.9], Bought: [0, 0.1, 0.2, 0.2, 0.3, 0.3], Revelator: [0.4, 0.4, 0.5, 0.5, 0.5, 0.4] },
};

const hex = (seed: number) => {
  let value = seed * 2654435761;
  let out = "";
  for (let index = 0; index < 16; index += 1) {
    value = (value * 1103515245 + 12345) >>> 0;
    out += (value & 0xffff).toString(16).padStart(4, "0");
  }
  return out;
};

const proof = (seq: number, type: ProofEvent["type"], subject: string, when: Date, extra: Partial<ProofEvent> = {}): ProofEvent => ({
  seq,
  type,
  subject,
  at: when,
  payloadHash: hex(seq),
  prevHash: hex(seq - 1),
  eventHash: hex(seq + 7919),
  keyId: when < day(2026, 7, 1) ? "pl-ed25519-2026-01" : "pl-ed25519-2026-07",
  batch: `mb-${Math.floor(seq / 40)}`,
  ...extra,
});

export const PROOF: readonly ProofEvent[] = [
  proof(882140, "CLEARANCE_RECEIPT", "ast_7e1c9b2a", at(2026, 10, 20, 9, 58), { scope: "Asset", use: "AI training", receipt: "rcpt_7Q2M-9F4K-CD7A" }),
  proof(882139, "CLEARANCE_RECEIPT", "ast_4a08f1d3", at(2026, 10, 20, 9, 58), { scope: "Asset", use: "AI training", receipt: "rcpt_7Q2M-9F4K-CD7B" }),
  proof(882101, "ATTESTATION_SIGNED", "att_d81f02c4", at(2026, 10, 19, 17, 21), { scope: "Credit" }),
  proof(882066, "CONFLICT_OPENED", "cfl_0b6e33a9", at(2026, 10, 14, 8, 3), { scope: "Asset" }),
  proof(882010, "CLEARANCE_GRANTED", "grt_59c1aa70", at(2026, 10, 12, 15, 2), { scope: "Artist", use: "Voice/NIL" }),
  proof(881777, "CONFLICT_RESOLVED", "cfl_93a5d07e", at(2026, 10, 2, 13, 0), { scope: "Asset" }),
  proof(881402, "OWNERSHIP_SNAPSHOT", "ast_c2f6e118", at(2026, 9, 30, 0, 0), { scope: "Asset" }),
  proof(881100, "SETTLEMENT", "run_2026q3_r12", at(2026, 9, 28, 18, 30), { scope: "Royalty run" }),
  proof(880950, "CLEARANCE_GRANTED", "grt_11e0b7f2", at(2026, 9, 15, 10, 12), { scope: "Catalogue", use: "AI training" }),
  proof(880412, "SUPERSEDE", "ast_9d4a7c60", at(2026, 9, 2, 3, 0), { scope: "Asset" }),
  proof(612, "IMPORTED", "ast_c2f6e118", at(2026, 9, 1, 0, 0), { scope: "Asset", chain: { tx: "0x8f3c1e9a42b7d6f0e15a3c9b8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e", block: 31884207, owUri: "ow://asset/9b2f-44c1-a7e0" } }),
];

export const proofByReceipt = (receipt: string) =>
  PROOF.find((one) => one.receipt?.toLowerCase() === receipt.trim().toLowerCase() || String(one.seq) === receipt.trim());

/** The keys that have signed the Proof Log — rotated, never withdrawn. */
export const SIGNING_KEYS: readonly { id: string; from: Date; to?: Date; algorithm: string; fingerprint: string }[] = [
  { id: "pl-ed25519-2026-07", from: day(2026, 7, 1), algorithm: "Ed25519", fingerprint: "SHA256:k3Q9vX…f2Lm" },
  { id: "pl-ed25519-2026-01", from: day(2026, 1, 1), to: day(2026, 6, 30), algorithm: "Ed25519", fingerprint: "SHA256:a71Rpe…9WcQ" },
];

/** Merge suggestions below auto-accept confidence (S7-3). */
export const MERGES: readonly {
  id: string;
  kind: "Party" | "Work" | "Recording link";
  left: { name: string; ids: readonly string[]; source: string; detail: string };
  right: { name: string; ids: readonly string[]; source: string; detail: string };
  shared: readonly string[];
  confidence: number;
  method: string;
  revenue: number;
  state: "Suggested" | "Matched" | "Unmatched";
}[] = [
  { id: "m-1", kind: "Party", left: { name: "Ana Lindgren", ids: ["IPI 00734410925"], source: "Harbor Music · AGR-101", detail: "Co-writes with Ben Okafor" }, right: { name: "A. Lindgren", ids: ["ISNI 0000000468213309"], source: "Kestrel Point · DDEX ERN credits", detail: "Background vocals on Northbound" }, shared: ["Same ISNI on the ArtistID", "Co-writer Ben Okafor on both"], confidence: 0.88, method: "Name + co-writer graph", revenue: 96400, state: "Suggested" },
  { id: "m-2", kind: "Recording link", left: { name: "Switchback — Juno Hale", ids: ["ISRC GBKPR2500311"], source: "Kestrel Point · Revelator Pro", detail: "Earning, no work link" }, right: { name: "Switchback", ids: ["ISWC T-913.117.402-1"], source: "Silverbirch · CWR ack PRS", detail: "Writers J. Hale, P. Ndiaye" }, shared: ["Title exact", "Writer J. Hale is the performer"], confidence: 0.83, method: "Title + performer-writer", revenue: 33900, state: "Suggested" },
  { id: "m-3", kind: "Work", left: { name: "Tidewater", ids: ["ISWC T-912.448.301-6"], source: "Harbor Music · AGR-101", detail: "Writer Ana Lindgren 100%" }, right: { name: "Tide Water", ids: ["MMG-PUB-118204"], source: "Meridian Music Group upload", detail: "Writers A. Lindgren 75%, K. Moreau 50%" }, shared: ["Writer Ana Lindgren", "Same lyric fingerprint"], confidence: 0.79, method: "Lyric fingerprint", revenue: 61300, state: "Suggested" },
  { id: "m-4", kind: "Party", left: { name: "Tobi Renn", ids: ["ISNI 0000000511820034"], source: "Kestrel Point", detail: "Main artist, Lowlight" }, right: { name: "Tobias Renn", ids: ["IPI 00811203376"], source: "Meridian Music Group upload", detail: "Writer on 14 works" }, shared: ["Country Germany", "No shared co-writers"], confidence: 0.61, method: "Name similarity", revenue: 44100, state: "Suggested" },
];

/** The resolver's rule versions (S7-7). */
export const RULES: readonly { version: string; state: "Published" | "Draft" | "Retired"; published?: Date; author: string; change: string; wouldChange?: number; revenueAffected?: number }[] = [
  { version: "v1.4-draft", state: "Draft", author: "Lior Ben-Ami", change: "Rank a GEMA or SACEM acknowledgement above a CWR submission inside its own territory only.", wouldChange: 1842, revenueAffected: 212400 },
  { version: "v1.3", state: "Published", published: day(2026, 9, 1), author: "Noor Haddad", change: "Platform claims become evidence only; they never resolve ownership." },
  { version: "v1.2", state: "Retired", published: day(2026, 7, 14), author: "Noor Haddad", change: "Self-declared splits rank below label declarations." },
  { version: "v1.1", state: "Retired", published: day(2026, 6, 2), author: "Lior Ben-Ami", change: "Receipts-basis sub-publishing collects on its own share only." },
];

/** Parties whose claims are withdrawn or rejected often (S7-9). */
export const CLAIMANTS: readonly { party: string; submitted: number; rejected: number; withdrawn: number; review: boolean }[] = [
  { party: "Northfold Rights Admin", submitted: 412, rejected: 96, withdrawn: 41, review: true },
  { party: "Coastline Audio", submitted: 1880, rejected: 31, withdrawn: 12, review: false },
  { party: "Halcyon Collective", submitted: 220, rejected: 18, withdrawn: 2, review: false },
  { party: "Quickclaim Media", submitted: 3205, rejected: 1160, withdrawn: 402, review: true },
];

// ---------------------------------------------------------------------------------------------
// Writes — every surface reads the graph as it now is. Kept for the browser session, so a flow
// that crosses surfaces (a link into another product reloads the page) carries what it wrote.

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;
export const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const snapshot = () => version;
/** Records a write and lets every page draw again. */
export function wrote() {
  version += 1;
  save();
  for (const listener of listeners) listener();
}

const KEPT = "rights-graph:graph";
/** A date written into the session comes back as a date. */
const revive = (_: string, value: unknown) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? new Date(value) : value;

function save() {
  try {
    sessionStorage.setItem(
      KEPT,
      JSON.stringify({ ASSETS, ASSERTIONS, GRANTS, CREDITS, ATTESTATIONS, CONFLICTS, REQUESTS, TENANTS, BATCHES }),
    );
  } catch {
    // No session storage (a private window, a blocked site): the writes last until the page reloads.
  }
}

type Kept = {
  ASSETS: Asset[];
  ASSERTIONS: Assertion[];
  GRANTS: Grant[];
  CREDITS: Credit[];
  ATTESTATIONS: Attestation[];
  CONFLICTS: Conflict[];
  REQUESTS: Request[];
  TENANTS: Tenant[];
  BATCHES: Batch[];
};

/** The graph laid over the sets above — the session's, or the fixtures' own. */
function lay(graph: Kept) {
  ASSETS.splice(0, ASSETS.length, ...graph.ASSETS);
  ASSERTIONS = graph.ASSERTIONS;
  GRANTS = graph.GRANTS;
  CREDITS = graph.CREDITS;
  ATTESTATIONS = graph.ATTESTATIONS;
  CONFLICTS = graph.CONFLICTS;
  REQUESTS = graph.REQUESTS;
  TENANTS = graph.TENANTS;
  BATCHES = graph.BATCHES;
}

let FIXTURES: Kept | undefined;

function restore() {
  FIXTURES = structuredClone({ ASSETS, ASSERTIONS, GRANTS, CREDITS, ATTESTATIONS, CONFLICTS, REQUESTS, TENANTS, BATCHES });
  try {
    const kept = sessionStorage.getItem(KEPT);
    if (kept) lay(JSON.parse(kept, revive) as Kept);
  } catch {
    // A session written by an older build, or none at all: the graph starts from its fixtures.
  }
}

/**
 * Forgets every write of the session: the graph is its fixtures again, and every page draws from
 * them. What a surface keeps in its own folder is that surface's, and starts again on a reload.
 */
export function resetGraph() {
  if (FIXTURES) lay(structuredClone(FIXTURES));
  wrote();
}

export function setRequestState(id: string, state: Request["state"], decided?: Request["decided"]) {
  REQUESTS = REQUESTS.map((one) => (one.id === id ? { ...one, state, decided } : one));
  wrote();
}
export function setCreditState(id: string, state: Credit["state"]) {
  CREDITS = CREDITS.map((one) => (one.id === id ? { ...one, state } : one));
  wrote();
}
export function addGrant(grant: Omit<Grant, "id">) {
  GRANTS = [{ ...grant, id: `g-${GRANTS.length + 100}` }, ...GRANTS];
  wrote();
}
export function setGrantState(id: string, state: Grant["state"]) {
  GRANTS = GRANTS.map((one) => (one.id === id ? { ...one, state } : one));
  wrote();
}
export function addAssertion(claim: Omit<Assertion, "id" | "known">) {
  const id = `as-${ASSERTIONS.length + 100}`;
  ASSERTIONS = [
    { ...claim, id, known: TODAY },
    ...ASSERTIONS.map((one) => (one.id === claim.supersedes ? { ...one, state: "Superseded" as const } : one)),
  ];
  wrote();
  return id;
}
/**
 * Takes a claim back (G-1): the row stays, Withdrawn, and stops counting. When and by whom is kept
 * on the claim, so a past reading still sees it standing before then.
 */
export function withdrawAssertion(id: string, by: string, at: Date = new Date()) {
  ASSERTIONS = ASSERTIONS.map((one) => (one.id === id ? { ...one, state: "Withdrawn" as const, withdrawn: { at, by } } : one));
  wrote();
}
/** A file filed in support of a claim — kept on the claim, so whoever resolves it reads it as a basis (F5 step 4). */
export function addEvidence(assertionId: string, file: string) {
  ASSERTIONS = ASSERTIONS.map((one) => (one.id === assertionId ? { ...one, evidence: [...(one.evidence ?? []), file] } : one));
  wrote();
}
/** A request into a party's inbox — newest first. Numbered after the highest id held. Returns its id. */
export function addRequest(request: Omit<Request, "id">) {
  const next = REQUESTS.reduce((most, one) => Math.max(most, Number(one.id.replace("rq-", "")) || 0), 0) + 1;
  const id = `rq-${next}`;
  REQUESTS = [{ ...request, id }, ...REQUESTS];
  wrote();
  return id;
}
/** A contributor tenant's sharing level for one field (S5-5, S7-8). */
export function setSharing(tenantId: string, field: string, level: Tenant["sharing"][number]["level"]) {
  TENANTS = TENANTS.map((one) =>
    one.id === tenantId ? { ...one, sharing: one.sharing.map((each) => (each.field === field ? { ...each, level } : each)) } : one,
  );
  wrote();
}
/** A read of a tenant's data, logged at the top of its access log (S5-6). */
export function addAccess(tenantId: string, entry: Tenant["access"][number]) {
  TENANTS = TENANTS.map((one) => (one.id === tenantId ? { ...one, access: [entry, ...one.access] } : one));
  wrote();
}
export function updateConflict(id: string, change: Partial<Conflict>) {
  CONFLICTS = CONFLICTS.map((one) => (one.id === id ? { ...one, ...change } : one));
  wrote();
}
export function setAttestationState(id: string, state: Attestation["state"]) {
  ATTESTATIONS = ATTESTATIONS.map((one) => (one.id === id ? { ...one, state } : one));
  wrote();
}
export function addAttestation(attestation: Omit<Attestation, "id">) {
  ATTESTATIONS = [{ ...attestation, id: `at-${ATTESTATIONS.length + 100}` }, ...ATTESTATIONS];
  wrote();
}
export function addConflict(conflict: Omit<Conflict, "id">) {
  const id = `cf-${CONFLICTS.length + 100}`;
  CONFLICTS = [{ ...conflict, id }, ...CONFLICTS];
  wrote();
  return id;
}
export function linkRecording(recordingId: string, workId: string, source: string) {
  const index = ASSETS.findIndex((one) => one.id === recordingId);
  const recording = ASSETS[index]!;
  ASSETS[index] = { ...recording, embodies: [...(recording.embodies ?? []), { workId, portion: "Full", source }] };
  CONFLICTS = CONFLICTS.map((one) =>
    one.assetId === recordingId && one.kind === "Missing work link" ? { ...one, state: "Resolved", step: 3, resolution: { actor: source, at: TODAY, reason: `Linked to ${assetById(workId).title}.` } } : one,
  );
  wrote();
}
/** A DSP delivery event for a recording (S9): the distributor's receipt, and the claim rises to T2. */
export function setDelivered(assetId: string) {
  const index = ASSETS.findIndex((one) => one.id === assetId);
  ASSETS[index] = { ...ASSETS[index]!, delivered: true };
  wrote();
}
export function setBatchState(id: string, change: Partial<Batch>) {
  BATCHES = BATCHES.map((one) => (one.id === id ? { ...one, ...change } : one));
  wrote();
}
export function addBatch(batch: Batch) {
  BATCHES = [batch, ...BATCHES];
  wrote();
}

// LAST, once every set above is declared: the session's writes over the fixtures.
restore();
