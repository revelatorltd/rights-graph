import { CollectionPage, formatList } from "@revelator/pro-ui";

import { USES, type Asset, type Use } from "../../graph/model";
import { clearanceOf, type Answer } from "../../graph/resolve";
import type { Shown } from "../surface";
import { creditedAssets, type Reader } from "./data";
import { assetMark } from "./marks";
import { assetHref } from "./place";

interface Track {
  asset: Asset;
  answers: Record<Answer, Use[]>;
}

/** Every use's answer for one track, gathered by answer — the graph answers each one. */
function trackOf(asset: Asset): Track {
  const answers: Record<Answer, Use[]> = { Granted: [], Denied: [], "Needs review": [] };
  for (const use of USES) answers[clearanceOf(asset.id, use, { country: "US" }).state].push(use);
  return { asset, answers };
}

const sentence = (uses: readonly Use[]) => formatList(uses);

/**
 * Where you're cleared (S3-6): a plain-language view, track by track, of which uses are allowed
 * and which are not. No commercial term is drawn — the artist reads WHAT is allowed, and opens a
 * track for WHO decided each use, master and composition apart.
 */
function ClearedIndex({ reader }: { reader: Reader }) {
  return (
    <CollectionPage
      title="Where you're cleared"
      index={{
        rows: creditedAssets(reader.subject.id).map(trackOf),
        rowKey: (one) => one.asset.id,
        noun: { one: "track", many: "tracks" },
        identity: {
          title: "Track",
          name: (one) => one.asset.title,
          mark: (one) => assetMark(one.asset),
          opens: (one) => assetHref(one.asset.id, "Clearance"),
        },
        columns: [
          { name: "Kind", value: (one) => one.asset.kind, cell: (one) => (one.asset.kind === "Work" ? "Song" : "Recording") },
          { name: "Allowed", value: (one) => one.answers.Granted.length, cell: (one) => sentence(one.answers.Granted) },
          { name: "Not allowed", value: (one) => one.answers.Denied.length, cell: (one) => sentence(one.answers.Denied) },
          { name: "Waiting on someone", value: (one) => one.answers["Needs review"].length, cell: (one) => sentence(one.answers["Needs review"]) },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "Any AI use allowed", holds: (one) => one.answers.Granted.some((use) => use.startsWith("AI") || use === "Voice/NIL") },
          { name: "Something waiting", holds: (one) => one.answers["Needs review"].length > 0 },
        ],
        note: "Read for the United States, today. Open a track for who decided each use.",
        commands: (one) => [{ label: "Open", opens: assetHref(one.asset.id, "Clearance") }],
        empty: { none: "Nothing credits you yet, so nothing is cleared for you." },
      }}
    />
  );
}

export const clearedPage = (reader: Reader): Shown => ({
  place: { at: "Consent", page: "Where you're cleared" },
  page: <ClearedIndex key={reader.persona} reader={reader} />,
});
