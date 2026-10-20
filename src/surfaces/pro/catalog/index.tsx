import { EmptyState } from "@revelator/pro-ui";

import type { PageOf } from "../../surface";

/** The catalogue's pages — each record carries a Rights facet (FRD S1). */
export const CATALOG_PAGES: Record<string, PageOf> = {
  tracks: () => ({
    place: { at: "Catalog", page: "Tracks" },
    page: <EmptyState title="Not built yet" detail="This page is still being built." />,
  }),
};
