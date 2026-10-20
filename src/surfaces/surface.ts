import type { ReactNode } from "react";
import type { ShellPlace } from "@revelator/pro-ui";

/**
 * What a page gives the surface around it: where the reader is, for the frame, and the page.
 * A page that COVERS the shell — a wizard — returns `cover` instead, and no frame is drawn.
 */
export interface Drawn {
  place: ShellPlace;
  page: ReactNode;
}
export interface Covered {
  cover: ReactNode;
}
export type Shown = Drawn | Covered;

/** A page, given the segments of the address after its own name: `[id, facet]`. */
export type PageOf = (rest: readonly string[]) => Shown;
