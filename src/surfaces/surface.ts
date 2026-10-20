import { createElement, useCallback, useEffect, useState, type ReactNode } from "react";
import { usePersona, type ShellPlace } from "@revelator/pro-ui";

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

/** Hands the persona the shell's own switch holds back out to the surface drawn around it. */
function FollowPersona({ personas, onPersona }: { personas: readonly string[]; onPersona: (persona: string) => void }) {
  const chosen = usePersona(personas);
  useEffect(() => {
    if (chosen) onPersona(chosen);
  }, [chosen, onPersona]);
  return null;
}

/**
 * The persona a surface is seen as, for the component that draws the shell. Outside the shell,
 * `usePersona` reads the address once; the shell's switch changes its own state and rewrites the
 * address without telling anyone above it — so the product (workspace, nav, which pages) would keep
 * the persona the page opened on. Returns the persona and an element to place INSIDE the shell,
 * which follows its switch. Pages inside the shell read `usePersona` directly.
 */
export function useShellPersona<P extends string>(personas: readonly P[], fallback: P): readonly [P, ReactNode] {
  const addressed = usePersona(personas);
  const [persona, setPersona] = useState<P>(personas.find((one) => one === addressed) ?? fallback);
  const onPersona = useCallback(
    (chosen: string) => setPersona(personas.find((one) => one === chosen) ?? fallback),
    [personas, fallback],
  );
  return [persona, createElement(FollowPersona, { personas, onPersona })] as const;
}
