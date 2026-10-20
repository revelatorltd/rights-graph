import { EmptyState, type ShellPageGroup } from "@revelator/pro-ui";

import { GRANTS, REQUESTS } from "../../../graph/fixtures";
import type { PageOf, Shown } from "../../surface";
import { Catalogue } from "./catalogue";
import { AssetClearances, Clearances, assetClearancesPlace } from "./clearances";
import { ConflictDetail, Conflicts, conflictPlace } from "./conflicts";
import { GrantDetail, GrantWizard, Grants, grantPlace } from "./consent";
import { AgreementDetail, Contracts, agreementPlace } from "./contracts";
import { rightsHref } from "./data";
import { ReleaseDefaultsPage } from "./defaults";
import { Overview } from "./overview";
import { RequestDetail, Requests, requestPlace } from "./requests";

/**
 * The Rights section for a label (FRD S1, and S4 where it lives in S1): Kestrel Point
 * Recordings, as Priya Raman, its label admin, reads it.
 *
 * Each page is declared, and each record keyed by its id so a second one opens fresh. A segment
 * after a list's name is either a record's id or a NARROWING the overview links to — a filter the
 * list opens with — so each count on the overview lands on the rows it counts.
 */
export const LABEL_RIGHTS_NAV: readonly ShellPageGroup[] = [
  {
    pages: [
      { name: "Overview", opens: rightsHref("overview") },
      { name: "Catalogue rights", opens: rightsHref("catalogue") },
      { name: "Clearances", opens: rightsHref("clearances") },
      { name: "AI consent", opens: rightsHref("consent") },
      { name: "Release defaults", opens: rightsHref("consent", "defaults") },
      { name: "Requests", opens: rightsHref("requests") },
      { name: "Conflicts", opens: rightsHref("conflicts") },
      { name: "Contracts", opens: rightsHref("contracts") },
    ],
  },
];

/** A record the address names and the graph does not hold — a write lost to a reload. */
const gone = (page: string, segment: string, title: string, detail: string): Shown => ({
  place: {
    at: "Rights",
    page,
    trail: [
      { label: "Rights", opens: rightsHref("overview") },
      { label: page, opens: rightsHref(segment) },
    ],
  },
  page: <EmptyState mark="rights" title={title} detail={detail} />,
});

/** Every page of the Rights section, by its address segment. */
export const LABEL_PAGES: Record<string, PageOf> = {
  overview: () => ({ place: { at: "Rights", page: "Overview" }, page: <Overview /> }),

  catalogue: ([narrowed]) => ({
    place: { at: "Rights", page: "Catalogue rights" },
    page: <Catalogue key={narrowed ?? "all"} narrowed={narrowed} />,
  }),

  // `clearances/in/<country>/<partner>` reads the matrix for a partner in a territory;
  // `clearances/<asset>/<country>/<partner>` is one asset's own, use by use and scope by scope.
  clearances: ([first, country = "US", partner]) =>
    first && first !== "in"
      ? {
          place: assetClearancesPlace(first),
          page: <AssetClearances key={`${first}/${country}/${partner}`} id={first} country={country} partner={partner} />,
        }
      : {
          place: { at: "Rights", page: "Clearances" },
          page: <Clearances key={`${country}/${partner}`} country={country} partner={partner} />,
        },

  consent: ([id]) => {
    if (id === "new") return { cover: <GrantWizard key="new" /> };
    if (id === "defaults") return { place: { at: "Rights", page: "Release defaults" }, page: <ReleaseDefaultsPage /> };
    if (id && GRANTS.some((one) => one.id === id)) return { place: grantPlace(id), page: <GrantDetail key={id} id={id} /> };
    if (id) return gone("AI consent", "consent", "This grant is not in the graph", "Writes last until the page reloads.");
    return { place: { at: "Rights", page: "AI consent" }, page: <Grants /> };
  },

  requests: ([id]) =>
    id?.startsWith("rq-") && !REQUESTS.some((one) => one.id === id)
      ? gone("Requests", "requests", "This request is not in the inbox", "Writes last until the page reloads.")
      : id?.startsWith("rq-")
        ? { place: requestPlace(id), page: <RequestDetail key={id} id={id} /> }
        : { place: { at: "Rights", page: "Requests" }, page: <Requests /> },

  conflicts: ([id]) =>
    id?.startsWith("cf-")
      ? { place: conflictPlace(id), page: <ConflictDetail key={id} id={id} /> }
      : { place: { at: "Rights", page: "Conflicts" }, page: <Conflicts key={id ?? "all"} narrowed={id} /> },

  contracts: ([id]) =>
    id
      ? { place: agreementPlace(id), page: <AgreementDetail key={id} id={id} /> }
      : { place: { at: "Rights", page: "Contracts" }, page: <Contracts /> },
};
