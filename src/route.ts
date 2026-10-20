import { useEffect, useState } from "react";
import { follow } from "@revelator/pro-ui";

/**
 * Where the reader is: `#/<surface>/<page>/<id>/<facet>`, read off the hash as the replica reads
 * it. Each surface reads its own segments; the app only says which surface draws.
 */
export const SURFACES = ["home", "pro", "artist", "contributor", "partner", "console", "verify"] as const;
export type SurfaceName = (typeof SURFACES)[number];

export interface Route {
  surface: SurfaceName;
  /** The segments after the surface. */
  path: readonly string[];
}

export const slug = (words: string) => words.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** An address on a surface. */
export const href = (surface: SurfaceName, ...path: (string | undefined)[]) =>
  `#/${[surface, ...path.filter((one): one is string => Boolean(one))].join("/")}`;

export const go = (address: string) => follow(address);

function read(hash: string): Route {
  const [surface, ...path] = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const found = SURFACES.find((one) => one === surface);
  return found ? { surface: found, path } : { surface: "home", path: [] };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => read(window.location.hash));
  useEffect(() => {
    const moved = () => setRoute(read(window.location.hash));
    window.addEventListener("hashchange", moved);
    return () => window.removeEventListener("hashchange", moved);
  }, []);
  return route;
}
