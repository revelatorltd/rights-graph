import type { ShellDestination, ShellElsewhere } from "@revelator/pro-ui";

import { href, type SurfaceName } from "../route";

/**
 * The family of products the prototypes are — each surface, and the views of it a reviewer opens,
 * one per persona, by address. Every surface's shell lists the OTHER products under its own
 * personas, in the control beside the account, so a reviewer moves from the label to the artist to
 * Sureel ops without going back to the map. The map itself is the rail's utility, on every surface.
 */
const as = (persona: string, address: string) => `?persona=${persona.toLowerCase().replace(/\s+/g, "-")}${address}`;

const FAMILY: readonly (ShellElsewhere & { surface: SurfaceName })[] = [
  {
    surface: "pro",
    name: "S1–S4 · Revelator Pro",
    views: [
      { name: "Label · Kestrel Point Recordings", opens: as("Label", href("pro", "rights", "overview")) },
      { name: "Publisher · Harbor Music", opens: as("Publisher", href("pro", "rights", "overview")) },
    ],
  },
  {
    surface: "artist",
    name: "S3 · Artist app",
    views: [
      { name: "Artist · Mira Castellanos", opens: as("Artist", href("artist", "home")) },
      { name: "Writer · Ana Lindgren", opens: as("Writer", href("artist", "home")) },
      { name: "Delegate · Dara Whitlock", opens: as("Delegate", href("artist", "home")) },
      { name: "New artist · sign up", opens: as("New artist", href("artist", "sign-up")) },
    ],
  },
  {
    surface: "contributor",
    name: "S5 · Contributor portal",
    views: [{ name: "Contributor · Meridian Music Group", opens: href("contributor", "overview") }],
  },
  {
    surface: "partner",
    name: "S6 · Partner portal",
    views: [
      { name: "AI platform · Cadence AI", opens: as("Cadence AI", href("partner", "overview")) },
      { name: "DSP · Openwave Studios", opens: as("Openwave Studios", href("partner", "overview")) },
      { name: "Society · GEMA", opens: as("GEMA", href("partner", "overview")) },
    ],
  },
  {
    surface: "console",
    name: "S7, S9 · Sureel Graph Console",
    views: [
      { name: "Rights ops · Lior Ben-Ami", opens: as("Rights ops", href("console", "health")) },
      { name: "Data engineer", opens: as("Data engineer", href("console", "health")) },
    ],
  },
  {
    surface: "verify",
    name: "S8 · Verification portal",
    views: [{ name: "Verifier · no account", opens: href("verify") }],
  },
];

/** Every product of the family but the one the reader is in. */
export const elsewhereFrom = (surface: SurfaceName): readonly ShellElsewhere[] =>
  FAMILY.filter((one) => one.surface !== surface).map(({ name, views }) => ({ name, views }));

/**
 * The map, at the foot of every surface's rail: a MENU of its pages — the surfaces, the personas,
 * the flows, the approaches and the design system's gaps — so any one is a press away.
 */
export const MAP: ShellDestination = {
  name: "Map",
  mark: "grid",
  pages: [
    {
      label: "Map",
      pages: [
        { name: "Surfaces", opens: href("home", "surfaces") },
        { name: "Personas", opens: href("home", "personas") },
        { name: "Flows", opens: href("home", "flows") },
        { name: "Approaches", opens: href("home", "approaches") },
        { name: "Design system gaps", opens: href("home", "gaps") },
      ],
    },
  ],
};

/** The docs, above the map: specifications, architecture and playbooks — read as one library. */
export const DOCS: ShellDestination = { name: "Docs", mark: "book", opens: href("docs") };

/** The rail's foot on every surface: the docs, then the map. */
export const UTILITIES: readonly ShellDestination[] = [DOCS, MAP];
