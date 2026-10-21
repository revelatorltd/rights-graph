/**
 * S9 against the data-model doc's worked example, asked THROUGH the API (the handlers, as both
 * transports call them) — no test runner, plain assertions. Run with the design system's tsx:
 *
 *   ../revelator-pro-design-system.git/node_modules/.bin/tsx scripts/api-check.ts
 */
import { respond } from "../src/api/index";
import { openApi } from "../src/api/openapi";
import { ROUTES } from "../src/api/handlers";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failed += 1;
};

const get = (path: string, key?: string) => respond({ method: "GET", url: path, headers: key ? { Authorization: `Bearer ${key}` } : {} });
const post = (path: string, body: unknown, key: string, idempotency?: string) =>
  respond({ method: "POST", url: path, headers: { Authorization: `Bearer ${key}`, ...(idempotency ? { "Idempotency-Key": idempotency } : {}) }, body: JSON.stringify(body) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (response: { body: unknown }) => response.body as any;

// Video sync, US: Label X granted master sync, Harbor composition sync, Ben Songs nothing → NEEDS_REVIEW.
{
  const answer = read(get("/api/v1/assets/v-northbound/clearance/effective?use=sync&territory=US", "ck_live_0b77"));
  check("video sync US is needs_review", answer.answer === "needs_review", answer.answer);
  check("… the master is granted", answer.master?.answer === "granted");
  check("… because composition is not cleared", answer.reason_code === "composition_not_cleared", answer.reason_code);
  check("… Harbor granted, Ben Songs did not", answer.composition.some((one: any) => one.publisher.id === "p-harbor" && one.answer === "granted") && answer.composition.some((one: any) => one.publisher.id === "p-bensongs" && one.answer === "needs_review"));
  check("… with a signed receipt", /^rcpt_/.test(answer.receipt?.id ?? ""), JSON.stringify(answer.receipt));
}

// AI training on Northbound for Cadence: catalogue grant on the master, nothing on the composition.
{
  const answer = read(get("/api/v1/assets/r-northbound/clearance/effective?use=AI%20training&partner=p-cadence", "ck_live_91d0"));
  check("Northbound AI training for Cadence is needs_review", answer.answer === "needs_review", answer.answer);
  check("… reason composition_not_cleared", answer.reason_code === "composition_not_cleared", answer.reason_code);
  check("… master granted at catalogue level", answer.master?.answer === "granted" && answer.master?.decided_at === "Catalogue");
  check("… the reason names no other partner", !/Lyra|Voxa/.test(JSON.stringify(answer)));
  const receipt = read(get(`/api/v1/proof/events/${answer.receipt.id}`, "ck_live_91d0"));
  check("… and its receipt verifies", receipt.verified === true && receipt.type === "CLEARANCE_RECEIPT", JSON.stringify(receipt).slice(0, 120));
  check("… a partner key cannot ask for another partner", get("/api/v1/assets/r-northbound/clearance/effective?use=ai_training&partner=p-lyra", "ck_live_91d0").status === 403);
}

// Performance, DE, 2026-03-01: Rhein Edition collects Harbor's 50%; the 110% overclaim shows, rows 1–3 pay.
{
  const answer = read(get("/api/v1/assets/w-northbound/splits?territory=DE&right_type=Performance&as_of=2026-03-01", "ck_live_0b77"));
  const publisher = answer.shares.find((one: any) => one.share_type === "Publisher");
  const harbor = publisher?.paid.find((one: any) => one.owner.id === "p-harbor");
  check("DE performance: Rhein Edition collects Harbor's 50%", harbor?.share === 50 && harbor?.collected_by?.party.id === "p-rhein", JSON.stringify(harbor));
  check("… Ben Songs' 50% through its own society", publisher?.paid.some((one: any) => one.owner.id === "p-bensongs" && one.share === 50 && one.collected_by.party.id === "p-bensongs"));
  check("… the 110% overclaim is reported", publisher?.total === 110 && publisher?.state === "overclaim", `${publisher?.total} ${publisher?.state}`);
  const us = read(get("/api/v1/assets/w-northbound/splits?territory=US&right_type=Performance", "ck_live_0b77"));
  const usHarbor = us.shares.find((one: any) => one.share_type === "Publisher")?.paid.find((one: any) => one.owner.id === "p-harbor");
  check("US performance: Harbor collects its own 50%", usHarbor?.collected_by?.party.id === "p-harbor");
  const before = read(get("/api/v1/assets/w-northbound/splits?territory=DE&known_at=2026-02-15", "ck_live_0b77"));
  check("as known on 15 Feb 2026, DE reads 100%", before.shares.find((one: any) => one.share_type === "Publisher")?.total === 100);
}

// Keys and scopes.
{
  const none = get("/api/v1/assets/r-northbound/clearance/effective?use=ai_training");
  check("401 without a key", none.status === 401 && none.headers["Content-Type"] === "application/problem+json");
  check("401 with an unknown key", get("/api/v1/assets/r-northbound/clearance/effective?use=ai_training", "ck_live_nope").status === 401);
  const short = get("/api/v1/assets/w-northbound/splits?territory=DE", "ck_live_91d0");
  check("403 without the scope (Cadence has no splits:read)", short.status === 403 && read(short).type.endsWith("insufficient-scope"));
  check("403 on a write without its scope", post("/api/v1/links", { recording: "r-ember", work: "w-ember" }, "ck_live_0b77", "k-0").status === 403);
  check("proof keys are public", get("/api/v1/proof/keys").status === 200);
}

// Validation.
{
  check("an invalid ISRC is 422", get("/api/v1/assets?isrc=QZ-ES8-24-00071", "ck_live_91d0").status === 422);
  check("a look-up by ISRC finds Northbound", read(get("/api/v1/assets?isrc=GBKPR2400118", "ck_live_91d0")).data[0]?.id === "r-northbound");
  check("an unknown territory is 422", get("/api/v1/assets/w-northbound/splits?territory=EU", "ck_live_0b77").status === 422);
  check("territory uk normalizes to GB", read(get("/api/v1/assets/r-northbound/clearance/effective?use=stream&territory=uk", "ck_live_91d0")).territory === "GB");
}

// The write path: idempotency, batching, 202, authority → stored and flagged.
{
  check("a write without Idempotency-Key is 400", post("/api/v1/assertions", {}, "hk_live_kestrel").status === 400);
  const batch = [
    { asset: "r-ferry", interests: ["Owns", "Controls"], side: "Master", share_type: "Master", share: 100, territory: "US, CA", valid_from: "2026-10-20", source: "Signed agreement", source_ref: "AGR-311", agreement: "AGR-311" },
    { asset: "QZ-ES8-24-00071", interests: ["Owns"], side: "Master", share_type: "Master", share: 100, territory: "World", valid_from: "2026-10-20", source: "Label declaration", source_ref: "x" },
    { asset: "r-ferry", interests: ["Owns"], side: "Master", share_type: "Master", share: 100, territory: "World", source: "Label declaration", source_ref: "no start" },
  ];
  const first = post("/api/v1/assertions", batch, "hk_live_kestrel", "batch-1");
  const body = read(first);
  check("a batch is answered 202 with an event id", first.status === 202 && /^evt_/.test(body.event));
  check("… an agreement short of the territory is stored and flagged", body.items[0].status === "flagged" && body.items[0].state === "No authority", JSON.stringify(body.items[0]));
  check("… a malformed ISRC is held as invalid, not linked", body.items[1].status === "invalid");
  check("… a claim with no start date is rejected", body.items[2].status === "rejected");
  check("… the confirmation payload is command.confirmed", body.confirmation.payload.type === "command.confirmed");
  const again = post("/api/v1/assertions", batch, "hk_live_kestrel", "batch-1");
  check("the same key and body replays", again.status === 202 && again.headers["Idempotent-Replayed"] === "true" && read(again).event === body.event);
  check("the same key, another body, is 409", post("/api/v1/assertions", batch.slice(0, 1), "hk_live_kestrel", "batch-1").status === 409);
  const grant = read(post("/api/v1/clearances", { level: "Asset", ref: "r-lowlight", side: "Master", use: "sync", effect: "Grant", territory: "US", valid_from: "2026-10-20", decided: { actor: "Sam Okoro" } }, "hk_live_kestrel", "g-1"));
  check("a grant without a controlling edge is flagged", grant.items[0].status === "flagged", JSON.stringify(grant.items[0]));
  check("… and a clearance.changed webhook is sent", grant.webhooks.some((one: any) => one.type === "clearance.changed"));
  const link = read(post("/api/v1/links", { recording: "r-switchback", work: "T-913.117.402-2" }, "hk_live_kestrel", "l-1"));
  check("a link closes the missing-link conflict", link.items[0].status === "applied" && link.webhooks.some((one: any) => one.type === "conflict.resolved"), JSON.stringify(link.items[0]));
  const overclaim = read(post("/api/v1/assertions", { asset: "w-ferry", party: "p-harbor", interests: ["Owns"], side: "Composition", share_type: "Publisher", share: 70, territory: "World", valid_from: "2026-10-20", source: "Self-declared", source_ref: "Portal" }, "hk_live_harbor", "o-1"));
  check("an overclaim opens a conflict", overclaim.items[0].state === "Contested" && Boolean(overclaim.items[0].conflict) && overclaim.webhooks.some((one: any) => one.type === "conflict.opened"), JSON.stringify(overclaim.items[0]));
  // Whose statement it is comes from the subject: a label cannot sign an artist's consent by leaving out on_behalf_of.
  const silent = read(post("/api/v1/attestations", { subject: { kind: "Artist", id: "p-mira" }, claim: "Voice/NIL consent", assurance: "Verified", key_id: "kestrel-label-2026" }, "hk_live_kestrel", "at-1"));
  check("an attestation about another party, with no authority, is only requested", silent.items[0].state === "Requested", JSON.stringify(silent.items[0]));
  const backed = read(post("/api/v1/attestations", { subject: { kind: "Artist", id: "p-mira" }, claim: "Voice/NIL consent", assurance: "Verified", key_id: "kestrel-label-2026", authority: "AGR-310 §7.4" }, "hk_live_kestrel", "at-2"));
  check("… with the agreement that gives the authority, it is signed for her", backed.items[0].state === "Signed", JSON.stringify(backed.items[0]));
  const borrowed = read(post("/api/v1/attestations", { subject: { kind: "Artist", id: "p-mira" }, claim: "AI opt-out", assurance: "Verified", key_id: "kestrel-label-2026", on_behalf_of: "p-tobi", authority: "AGR-311 §8" }, "hk_live_kestrel", "at-3"));
  check("… and naming someone else as the principal is rejected", borrowed.items[0].status === "rejected");
  const stranger = read(post("/api/v1/attestations", { subject: { kind: "Asset", id: "w-tidewater" }, claim: "AI disclosure", assurance: "Verified", key_id: "kestrel-label-2026" }, "hk_live_kestrel", "at-4"));
  check("… the label attesting about a work it neither holds nor is credited on is not signed", stranger.items[0].state !== "Signed", JSON.stringify(stranger.items[0]));
  const holder = read(post("/api/v1/attestations", { subject: { kind: "Asset", id: "r-paper-moons" }, claim: "AI disclosure", assurance: "Verified", key_id: "kestrel-label-2026" }, "hk_live_kestrel", "at-5"));
  check("… the label that holds the master signs its own", holder.items[0].state === "Signed", JSON.stringify(holder.items[0]));
  check("another key cannot read a write's confirmation", get(`/api/v1/commands/${body.event}`, "hk_live_harbor").status === 404);
  check("… the key that wrote it can", get(`/api/v1/commands/${body.event}`, "hk_live_kestrel").status === 200);
}

// The document.
{
  const doc = openApi();
  check("OpenAPI 3.1 lists every route", doc.openapi === "3.1.0" && ROUTES.every((one) => (doc.paths as Record<string, Record<string, unknown>>)[one.path]?.[one.method.toLowerCase()]));
  check("… and the webhooks", ["clearance.changed", "licence.paused", "licence.revoked", "consent.ack", "conflict.opened", "conflict.resolved"].every((one) => one in doc.webhooks));
  check("served at /api/openapi.json", respond({ method: "GET", url: "/api/openapi.json" }).status === 200);
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
