/**
 * The webhooks the graph sends (S9-7): each event, what it means to the receiver, and an example
 * payload. A payload carries opaque ids, the use, the scope and the time — never amounts or
 * private terms — and every one is signed with the receiver's webhook secret
 * (`Sureel-Signature: t=UNIX_TIME,v1=HMAC_SHA256`).
 *
 * `command.confirmed` is the write path's asynchronous confirmation: a write is answered 202 with
 * an event id at once, and confirmed to the caller's endpoint when the projection has applied it.
 */

export interface WebhookEvent {
  name: string;
  /** Who receives it. */
  to: string;
  means: string;
  example: Record<string, unknown>;
}

const envelope = (type: string, id: string, at: string | Date, data: Record<string, unknown>) => ({
  id,
  type,
  created: at,
  api_version: "2026-10-01",
  data,
});

export const WEBHOOKS: readonly WebhookEvent[] = [
  {
    name: "clearance.changed",
    to: "Partners that looked the asset up, and partners a grant names",
    means: "An answer a partner was given changed: a grant was made, paused, resumed or revoked on an asset it looked up.",
    example: envelope("clearance.changed", "whk_01J9ZQ4C2D", "2026-10-08T16:40:09Z", {
      asset: "ast_7e1c9b2a",
      use: "AI training",
      territory: "World",
      was: "needs_review",
      now: "granted",
      side: "Composition",
      grant: "g-13",
      decided_at: "Catalogue",
    }),
  },
  {
    name: "licence.paused",
    to: "The licensee",
    means: "A licence the partner holds is paused by an open dispute. Stop new uses until it resumes.",
    example: envelope("licence.paused", "whk_01J9ZQ7K8M", "2026-10-14T08:03:12Z", {
      grant: "g-14",
      scope: "Artist",
      use: "Voice/NIL",
      reason: "attestation_disputed",
      conflict: "cf-6",
    }),
  },
  {
    name: "licence.revoked",
    to: "The licensee",
    means: "A licence the partner holds was revoked. Stop using it; uses already reported stand.",
    example: envelope("licence.revoked", "whk_01J9ZR0A11", "2026-10-20T10:12:00Z", {
      grant: "g-1",
      scope: "Catalogue",
      use: "AI training",
      dependents_revoked: ["AI derivative", "Voice/NIL", "AI streaming"],
    }),
  },
  {
    name: "consent.ack",
    to: "The party that recorded the consent, and Revelator's consent feed",
    means: "A consent attestation — Voice/NIL consent, an AI opt-out, an AI disclosure — was recorded and signed into the Proof Log.",
    example: envelope("consent.ack", "whk_01J9ZS3B77", "2026-07-02T20:11:31Z", {
      attestation: "at-5",
      claim: "AI opt-out",
      subject: { kind: "Artist", id: "p-juno" },
      assurance: "Verified",
      proof_event: 878233,
    }),
  },
  {
    name: "conflict.opened",
    to: "Every party a conflict names, and Sureel rights ops",
    means: "A write took a share past 100%, left a gap, or was made without authority: the conflict is open and the resolver keeps paying on the standing claims.",
    example: envelope("conflict.opened", "whk_01J9ZT9Q0C", "2026-03-02T04:00:00Z", {
      conflict: "cf-1",
      kind: "Overclaim",
      asset: "ast_5b91c0de",
      side: "Composition",
      territories: ["DE"],
      total: 110,
      severity: "High",
    }),
  },
  {
    name: "conflict.resolved",
    to: "Every party a conflict names",
    means: "A conflict was closed — by Sureel rights ops, or by a party's own correction, withdrawal or a link supplied.",
    example: envelope("conflict.resolved", "whk_01J9ZV2E5F", "2026-10-02T13:00:00Z", {
      conflict: "cf-10",
      kind: "Expired but paying",
      resolution: "Sub-publisher term confirmed renewed; evidence on file.",
      rule: "Resolver v1.3 · precedence 1",
    }),
  },
  {
    name: "command.confirmed",
    to: "The caller of a write",
    means: "A write answered 202 was applied: each item's outcome, the ids it was stored under, and the Proof Log event it was sealed in.",
    example: envelope("command.confirmed", "whk_01J9ZW8H2J", "2026-10-20T09:58:01Z", {
      event: "evt_3f9a1c07b2d4",
      command: "AssertRights",
      items: [{ index: 0, status: "applied", id: "as-140", state: "Resolved" }],
    }),
  },
];

/** A payload for one event, as the write that caused it sends it. */
export const payload = (type: string, id: string, at: Date, data: Record<string, unknown>) => envelope(type, id, at, data);
