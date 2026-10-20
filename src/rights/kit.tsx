import { ORGANIZATIONS } from "@revelator/pro-ui/assets";
import { Avatar, Badge, Chip, Explained, formatDate, formatMeta } from "@revelator/pro-ui";

import { partyById } from "../graph/fixtures";
import type { Decision, Party, TerritorySet, Tier } from "../graph/model";
import { TIERS } from "../graph/model";
import type { Answer } from "../graph/resolve";
import { territoryLabel } from "../graph/resolve";

/**
 * The rights patterns the FRD asks to design once — drawn here from the system's own parts only,
 * until the system decides each (gaps.md, G-1 to G-8). A page imports these and never draws one.
 */

/** G-5 Tier badge: T1–T5 with its one-line meaning. A level, not a state — so a chip, not a badge. */
export function TierChip({ tier }: { tier: Tier }) {
  return (
    <Chip>
      <Explained why={`${TIERS[tier].name} — ${TIERS[tier].requires}`}>{`T${tier}`}</Explained>
    </Chip>
  );
}

/** G-4 Territory chip: "World excl. US, CA", every code a hover away. */
export function TerritoryChip({ set }: { set: TerritorySet }) {
  const label = territoryLabel(set);
  const why =
    set.include === "World"
      ? set.exclude?.length
        ? `Every country except ${set.exclude.join(", ")}`
        : "Every country (ISO 3166)"
      : `Only ${set.include.join(", ")}`;
  return (
    <Chip>
      <Explained why={why}>{label}</Explained>
    </Chip>
  );
}

/** A clearance answer as the system's state family draws it. */
export const ClearanceBadge = ({ state }: { state: Answer }) => <Badge status={`clearance:${state}`} />;

/** G-7 The "decided by" line: actor, on whose behalf, authority, time — as one meta line. */
export function decidedBy(decided: Decision): string {
  return (
    formatMeta(
      [
        decided.actor,
        decided.onBehalfOf ? `for ${decided.onBehalfOf}` : "",
        decided.authority ? `under ${decided.authority}` : "",
        formatDate(decided.at, "minute"),
      ].filter(Boolean),
    ) ?? ""
  );
}

/** A party's mark: an organization square, a person's disc. */
export function partyMark(party: Party | string) {
  const one = typeof party === "string" ? partyById(party) : party;
  const person = ["Artist", "Writer", "Delegate"].includes(one.kind);
  return (
    <Avatar kind={person ? "person" : "organization"} name={one.name}>
      {one.organization ? <img src={ORGANIZATIONS[one.organization].art} alt="" /> : null}
    </Avatar>
  );
}
