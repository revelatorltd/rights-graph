import { EmptyState, type ShellPageGroup } from "@revelator/pro-ui";

import type { PageOf } from "../../surface";

/** The Rights section's nav for this persona. */
export const PUBLISHER_RIGHTS_NAV: readonly ShellPageGroup[] = [{ pages: [{ name: "Overview" }] }];

/** Every page of the Rights section, by its address segment. */
export const PUBLISHER_PAGES: Record<string, PageOf> = {
  overview: () => ({
    place: { at: "Rights", page: "Overview" },
    page: <EmptyState title="Not built yet" detail="This page is still being built." />,
  }),
};
