import type { ShellPageGroup } from "@revelator/pro-ui";

import { CONFLICTS, REQUESTS, assetById } from "../../../graph/fixtures";
import type { PageOf } from "../../surface";
import { Clearances } from "./clearances";
import { ConflictDetail, conflictFacetOf, conflictPlace } from "./conflict";
import { Conflicts } from "./conflicts";
import { rightsHref } from "./data";
import { RecordingsToLink } from "./link";
import { PublisherOverview } from "./overview";
import { Registrations } from "./registrations";
import { RequestDetail, requestPlace } from "./request";
import { Requests } from "./requests";
import { WorkDetail, workFacetOf, workPlace } from "./work";
import { Works } from "./works";

/**
 * S2 — the Publisher workspace: Revelator Pro's Rights section in publishing mode, worked as Harbor
 * Music. The same shell as S1, switched by the organisation the reader works as; its tabs are the
 * FRD's, in its order. Every page reads the one graph and writes claims, grants and links to it.
 */
const TABS = [
  ["overview", "Overview"],
  ["works", "Works"],
  ["recordings-to-link", "Recordings to link"],
  ["registrations", "Registrations"],
  ["clearances", "Clearances"],
  ["requests", "Requests"],
  ["conflicts", "Conflicts"],
] as const;

/** The Rights section's nav for this persona. */
export const PUBLISHER_RIGHTS_NAV: readonly ShellPageGroup[] = [
  { pages: TABS.map(([segment, name]) => ({ name, opens: rightsHref(segment) })) },
];

const at = (page: string) => ({ at: "Rights", page });

/** Every page of the Rights section, by its address segment: `#/pro/rights/<page>/<id>/<facet>`. */
export const PUBLISHER_PAGES: Record<string, PageOf> = {
  overview: () => ({ place: at("Overview"), page: <PublisherOverview /> }),
  works: ([id, facet]) => {
    // KEYED by the record, so a second work opens fresh rather than inheriting the first's state.
    if (id && assetById(id)?.kind === "Work") {
      const shown = workFacetOf(facet);
      return { place: workPlace({ id, facet: shown }), page: <WorkDetail key={id} id={id} facet={shown} /> };
    }
    return { place: at("Works"), page: <Works /> };
  },
  "recordings-to-link": () => ({ place: at("Recordings to link"), page: <RecordingsToLink /> }),
  registrations: () => ({ place: at("Registrations"), page: <Registrations /> }),
  clearances: () => ({ place: at("Clearances"), page: <Clearances /> }),
  requests: ([id]) => {
    if (id && REQUESTS.some((one) => one.id === id)) return { place: requestPlace(id), page: <RequestDetail key={id} id={id} /> };
    return { place: at("Requests"), page: <Requests /> };
  },
  conflicts: ([id, facet]) => {
    if (id && CONFLICTS.some((one) => one.id === id)) {
      const shown = conflictFacetOf(facet);
      return { place: conflictPlace({ id, facet: shown }), page: <ConflictDetail key={id} id={id} facet={shown} /> };
    }
    return { place: at("Conflicts"), page: <Conflicts /> };
  },
};
