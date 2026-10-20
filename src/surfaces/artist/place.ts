import { href } from "../../route";

/** An address in the artist app: `#/artist/<page>/<id>/<facet>`. */
export const artistHref = (...path: (string | undefined)[]) => href("artist", ...path);

/** One credited recording or work, at a facet. */
export const ASSET_FACETS = ["Credit", "Clearance"] as const;
export type AssetFacet = (typeof ASSET_FACETS)[number];
export const assetHref = (id: string, facet?: AssetFacet) => artistHref("asset", id, facet === "Credit" ? undefined : facet?.toLowerCase());

export const requestHref = (id: string) => artistHref("request", id);
