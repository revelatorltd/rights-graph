import { usePersona } from "@revelator/pro-ui";

import { href, slug } from "../../route";

/**
 * Where the reader is in the console: `#/console/<page>/<id>/<facet>`. Each page's records open
 * on their first facet, which the address leaves out.
 */
export const CONSOLE_PAGES = [
  "health",
  "batches",
  "conflicts",
  "assets",
  "claims",
  "claimants",
  "matches",
  "merges",
  "coverage",
  "rules",
  "tenants",
  "proof",
] as const;
export type ConsolePage = (typeof CONSOLE_PAGES)[number];

export const consoleHref = (page: ConsolePage, id?: string, facet?: string) =>
  href("console", page, id, facet ? slug(facet) : undefined);

/** The facet an address names, read back against the record's own list — its first where none. */
export function facetOf<F extends string>(facets: readonly F[], written: string | undefined): F {
  return facets.find((one) => slug(one) === written) ?? facets[0]!;
}

/**
 * The two kinds of reader the console is drawn for. Both are Sureel; the FRD gives resolving,
 * merging and publishing to rights ops, and a data engineer runs the pipes and reads the rest.
 */
export const PERSONAS = ["Rights ops", "Data engineer"] as const;
export type Persona = (typeof PERSONAS)[number];

export function usePersonaOf(): Persona {
  return (usePersona(PERSONAS) as Persona | undefined) ?? "Rights ops";
}

/** Who is signed in, as each persona — the name every decision the console records carries. */
export const SIGNED_IN: Record<Persona, { name: string; email: string }> = {
  "Rights ops": { name: "Lior Ben-Ami", email: "lior.benami@sureel.example" },
  "Data engineer": { name: "Tomás Reyes", email: "tomas.reyes@sureel.example" },
};

/** Why a data engineer cannot take a rights decision — the reason a greyed command gives. */
export const OPS_ONLY = "A rights decision is rights ops' to take; a data engineer can comment and assign.";
