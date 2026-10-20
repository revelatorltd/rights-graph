import type { ReactElement } from "react";

import type { PageOf } from "../../surface";
import { Releases, Tracks, Videos } from "./indexes";
import { AssetRecord, assetPlace, facetOf } from "./record";

/**
 * The catalogue's pages, by their address segment — each index, and each record on one of its
 * facets: `#/pro/catalog/<tracks|releases|videos>/<id>/<facet>`. Every record carries the rights
 * facets (FRD S1-2 to S1-4, S1-12): the core pattern the other rights screens reuse.
 */
const pageOf =
  (page: "Tracks" | "Releases" | "Videos", collection: () => ReactElement): PageOf =>
  ([id, facet]) =>
    id
      ? // KEYED by the record, so a second one opens fresh rather than on the first's dates.
        { place: assetPlace(id, facetOf(facet)), page: <AssetRecord key={id} id={id} facet={facetOf(facet)} /> }
      : { place: { at: "Catalog", page }, page: collection() };

export const CATALOG_PAGES: Record<string, PageOf> = {
  tracks: pageOf("Tracks", () => <Tracks />),
  releases: pageOf("Releases", () => <Releases />),
  videos: pageOf("Videos", () => <Videos />),
};
