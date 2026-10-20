import { href, slug } from "../../route";

/** An address in the contributor portal: `#/contributor/<page>/<id>/<facet>`. */
export const contributorHref = (...path: (string | undefined)[]) => href("contributor", ...path);

/** A facet's address segment, and back: `Row errors` ⇄ `row-errors`. */
export const facetSlug = (facet: string) => slug(facet);
export const facetOf = <F extends string>(facets: readonly F[], segment: string | undefined): F =>
  facets.find((one) => slug(one) === segment) ?? facets[0]!;
