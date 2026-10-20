import { Avatar } from "@revelator/pro-ui";
import { coverAt } from "@revelator/pro-ui/assets";

import type { Asset } from "../../graph/model";

/** A recording or a work, as the square its artwork is — a work has none, so its initials. */
export function assetMark(asset: Asset) {
  return (
    <Avatar kind="work" name={asset.title}>
      {asset.cover === undefined ? null : <img src={coverAt(asset.cover)} alt="" />}
    </Avatar>
  );
}

/** A person, as the disc a person is. */
export const personMark = (name: string) => <Avatar kind="person" name={name} />;
