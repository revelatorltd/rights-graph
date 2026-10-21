import type { About } from "../../graph/notify";
import { href, type SurfaceName } from "../../route";

/**
 * Where a person reads their notifications: who they are, the product they read them in, and where
 * that product opens what a notice is about. One per product that has a person (S1, S2, S3, S5, S6,
 * S7) — the same pages in each, as the approval inbox is one shape in three homes (S4).
 */
export interface Seat {
  /** The person reading — a `Person` id in `graph/notify.ts`. */
  person: string;
  /** This product's address for a notifications page: `#/<surface>/notifications/<page>/<id>`. */
  here: (...path: (string | undefined)[]) => string;
  /** Where this product opens what a notice is about — none where it has no page for it. */
  opens: (about: About) => string | undefined;
  /** The outbox lists every message sent, not only the reader's — the console, where it is run. */
  everyone?: boolean;
  /** The escalation clock and policies are reached here — the console's. */
  runsEscalation?: boolean;
}

const at = (surface: SurfaceName) => (...path: (string | undefined)[]) => href(surface, "notifications", ...path);

/** Revelator Pro, as the label (S1) or the publisher (S2). */
export const proSeat = (persona: "Label" | "Publisher"): Seat => ({
  person: persona === "Label" ? "u-priya" : "u-elena",
  here: (...path) => href("pro", "notifications", ...path),
  opens: (about) =>
    about.kind === "Request"
      ? href("pro", "rights", "requests", about.id)
      : about.kind === "Conflict"
        ? href("pro", "rights", "conflicts", about.id)
        : about.kind === "Grant"
          ? persona === "Label"
            ? href("pro", "rights", "consent", about.id)
            : href("pro", "rights", "clearances")
          : about.kind === "Attestation"
            ? href("pro", "rights", persona === "Label" ? "consent" : "clearances")
            : undefined,
});

/** The artist app (S3): the artist, the writer, the delegate. */
export const artistSeat = (persona: "Artist" | "Writer" | "Delegate"): Seat => ({
  person: persona === "Writer" ? "u-ana" : persona === "Delegate" ? "u-dara" : "u-mira",
  here: at("artist"),
  opens: (about) =>
    about.kind === "Request"
      ? href("artist", "request", about.id)
      : about.kind === "Credit"
        ? href("artist", "credits")
        : about.kind === "Conflict" || about.kind === "Attestation" || about.kind === "Grant"
          ? href("artist", "consent")
          : undefined,
});

/** The contributor portal (S5) — Meridian's admin. */
export const contributorSeat: Seat = {
  person: "u-dana",
  here: at("contributor"),
  opens: (about) =>
    about.kind === "Conflict"
      ? href("contributor", "conflicts", about.id)
      : about.kind === "Batch"
        ? href("contributor", "batches", about.id)
        : about.kind === "Tenant"
          ? href("contributor", "sharing")
          : undefined,
};

/** Who reads the partner portal (S6), by the organisation it is switched to. */
const PARTNER_PEOPLE: Record<string, string> = {
  "Cadence AI": "u-maya",
  "Openwave Studios": "u-lars",
  GEMA: "u-katrin",
  "Voxa Voice": "u-andre",
  Tessellate: "u-jonas",
};
export const partnerSeat = (persona: string): Seat => ({
  person: PARTNER_PEOPLE[persona] ?? "u-maya",
  here: at("partner"),
  opens: (about) => (about.kind === "Request" || about.kind === "Grant" ? href("partner", "requests") : undefined),
});

/** The Graph Console (S7): it reads every message sent, and runs the escalation clock. */
export const consoleSeat = (persona: "Rights ops" | "Data engineer"): Seat => ({
  person: persona === "Data engineer" ? "u-tomas" : "u-lior",
  here: at("console"),
  opens: (about) =>
    about.kind === "Conflict"
      ? href("console", "conflicts", about.id)
      : about.kind === "Tenant"
        ? href("console", "tenants", about.id)
        : about.kind === "Batch"
          ? href("console", "batches")
          : about.kind === "Request"
            ? href("console", "notifications", "escalation")
            : undefined,
  everyone: true,
  runsEscalation: true,
});
