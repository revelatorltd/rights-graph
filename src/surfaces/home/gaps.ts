import rows from "./gaps.json";

/** Every gap a surface logged — `docs/gaps/*.md`, read by `scripts/gaps.mjs` into `gaps.json`. */
export interface Gap {
  surface: string;
  id: string;
  asked: string;
  /** The FRD requirement it came from, where the log names one. */
  frd: string;
  here: string;
}

export const GAPS: readonly Gap[] = rows;
