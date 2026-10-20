import { Avatar } from "@revelator/pro-ui";
import { coverAt } from "@revelator/pro-ui/assets";

import { PARTIES, assetById } from "../../graph/fixtures";
import type { Asset } from "../../graph/model";
import { partyMark } from "../../rights/kit";

/**
 * The marks the console's rows and bands lead with. An asset is a work's square, with its cover
 * where the catalogue has one; a party wears its own mark from the kit; a name the graph holds no
 * party for — a claimant from a feed, an ops colleague — is drawn from the name alone.
 */
export function assetMark(asset: Asset | string) {
  const one = typeof asset === "string" ? assetById(asset) : asset;
  return (
    <Avatar kind="work" name={one.title}>
      {one.cover === undefined ? null : <img src={coverAt(one.cover)} alt="" />}
    </Avatar>
  );
}

/** A party by id where the graph holds it; otherwise an organization drawn from its name. */
export function partyOrName(party: string) {
  const known = PARTIES.find((one) => one.id === party || one.name === party);
  return known ? partyMark(known) : <Avatar kind="organization" name={party} />;
}

/** A colleague at Sureel — a person, by name. */
export const personMark = (name: string) => <Avatar kind="person" name={name} />;
