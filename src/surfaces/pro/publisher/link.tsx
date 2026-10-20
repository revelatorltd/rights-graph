import { Avatar, CollectionPage, Field, FormDialog, formatList, owed, type Command, type HeldBy } from "@revelator/pro-ui";

import { ASSERTIONS, assetById, linkRecording, partyName } from "../../../graph/fixtures";
import type { Asset } from "../../../graph/model";
import { standing, tierOf, useGraph, worksOf } from "../../../graph/resolve";
import { TierChip } from "../../../rights/kit";
import { ME, linkedByMe, myWorks, rejectSuggestion, suggestionFor, trackRightsHref, unlinked, type Suggestion } from "./data";

/** How a link Harbor confirms is recorded — the method the FRD names (S2-3). */
const CONFIRMED = "Publisher confirmed";

/** Whether Harbor may confirm the link — a publisher confirms links to the works it holds, no others. */
const mayLink = (suggestion: Suggestion) =>
  ASSERTIONS.some((one) => one.assetId === suggestion.workId && one.partyId === ME && standing(one) && one.interests.includes("Controls"));

/** Who holds a work, for the reason a link to it is not Harbor's to confirm. */
const holderOf = (workId: string) =>
  formatList([...new Set(ASSERTIONS.filter((one) => one.assetId === workId && standing(one) && one.interests.includes("Controls")).map((one) => partyName(one.partyId)))]);

/** A recording linked by hand to one of Harbor's works, where the graph suggests none or the wrong one. */
function LinkManually({ recording, ...held }: HeldBy & { recording: Asset }) {
  return (
    <FormDialog
      {...held}
      confirm="Link"
      draft={{ work: owed.record }}
      onCommit={(draft) => linkRecording(recording.id, draft.work, CONFIRMED)}
    >
      <Field
        as="record"
        name="work"
        label="Work"
        entity="work"
        noun={{ one: "work", many: "works" }}
        standard="iswc"
        help="Only Harbor Music's works: a publisher confirms the links to the works it holds."
        options={myWorks().map((one) => ({ value: one.id, title: one.title, code: one.iswc }))}
      />
    </FormDialog>
  );
}

/**
 * The recordings that earn and embody no work (S2-3) — publishing money held unmatched — ranked by
 * what they earn, each with the match the graph suggests first and a manual link as the fallback,
 * as a monitor's potential claims read before its manual claim.
 *
 * Accepting writes a Recording→Work link claim with the method "Publisher confirmed"; the recording
 * leaves the queue and its missing-link conflict closes. A link Harbor already confirmed is kept in
 * a reading of its own, so a reader sees what the accept did.
 */
export function RecordingsToLink() {
  useGraph();
  const rows = [...unlinked(), ...linkedByMe()];
  const acceptable = (one: Asset) => {
    const suggestion = suggestionFor(one.id);
    return suggestion && worksOf(one).length === 0 && mayLink(suggestion) ? suggestion : undefined;
  };

  const commandsOf = (one: Asset): Command[] => {
    if (worksOf(one).length) return [{ label: "Open recording", opens: trackRightsHref(one.id) }];
    const suggestion = suggestionFor(one.id);
    const accept: Command[] = suggestion
      ? [
          mayLink(suggestion)
            ? { label: "Accept match", mark: "crosslink", opens: () => linkRecording(one.id, suggestion.workId, CONFIRMED) }
            : {
                label: "Accept match",
                mark: "crosslink",
                unavailable: `${assetById(suggestion.workId).title} is ${holderOf(suggestion.workId)}'s work: only a publisher holding it confirms the link.`,
              },
          { label: "Reject suggestion", opens: () => rejectSuggestion(suggestion) },
        ]
      : [];
    return [
      ...accept,
      { label: "Link manually", mark: "crosslink", dialog: <LinkManually recording={one} /> },
      { label: "Open recording", opens: trackRightsHref(one.id) },
    ];
  };

  return (
    <CollectionPage
      title="Recordings to link"
      more={[{ label: "Export unmatched recordings" }]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "recording", many: "recordings" },
        identity: {
          title: "Recording",
          name: (one) => one.title,
          mark: (one) => <Avatar kind="work" name={one.title} />,
          opens: (one) => trackRightsHref(one.id),
        },
        // RANKED by what the recording earns: the money held unmatched is the order of the work.
        sort: { column: "Revenue", direction: "descending" },
        searchBy: ["Recording", "ISRC", "Artist"],
        columns: [
          { name: "Artist", value: (one) => one.artist ?? "", cell: (one) => one.artist },
          { name: "ISRC", as: "identifier", standard: "isrc", value: (one) => one.isrc },
          { name: "Label", value: (one) => partyName(one.labelId ?? ""), cell: (one) => (one.labelId ? partyName(one.labelId) : null) },
          {
            name: "Suggested work",
            readings: ["To link"],
            value: (one) => (suggestionFor(one.id) ? assetById(suggestionFor(one.id)!.workId).title : ""),
            cell: (one) => {
              const suggestion = suggestionFor(one.id);
              return suggestion ? assetById(suggestion.workId).title : "No suggestion";
            },
          },
          { name: "Confidence", as: "percent", readings: ["To link"], value: (one) => (suggestionFor(one.id) ? suggestionFor(one.id)!.confidence * 100 : null) },
          {
            name: "Why",
            readings: ["To link"],
            value: (one) => suggestionFor(one.id)?.method ?? "",
            cell: (one) => {
              const suggestion = suggestionFor(one.id);
              return suggestion ? `${suggestion.method}: ${formatList([...suggestion.shared])}` : null;
            },
          },
          {
            name: "Linked to",
            readings: ["Linked by Harbor Music"],
            value: (one) => formatList(worksOf(one).map((each) => each.title)) ?? "",
            cell: (one) => formatList(worksOf(one).map((each) => each.title)),
          },
          { name: "Tier", value: (one) => tierOf(one.id), cell: (one) => <TierChip tier={tierOf(one.id)} /> },
          { name: "Revenue", as: "money", value: (one) => one.revenue },
        ],
        readings: [
          { name: "To link", holds: (one) => worksOf(one).length === 0 },
          { name: "Linked by Harbor Music", holds: (one) => worksOf(one).length > 0 },
        ],
        filters: [
          {
            kind: "switches",
            key: "earning",
            label: "Earning",
            switches: [
              { key: "earning", label: "Earning only", holds: (one) => one.revenue > 0 },
              { key: "suggested", label: "With a suggested match", holds: (one) => Boolean(suggestionFor(one.id)) },
            ],
          },
        ],
        totals: [{ count: true }, { name: "Revenue unmatched", sum: (one) => (worksOf(one).length ? 0 : one.revenue), as: "money" }],
        // GMAIL-STYLE: the suggested matches held are confirmed in one press — those Harbor may confirm.
        holdable: (one) => worksOf(one).length === 0,
        selection: (held) => {
          const ready = held.flatMap((one) => {
            const suggestion = acceptable(one);
            return suggestion ? [suggestion] : [];
          });
          return [
            ready.length
              ? { label: "Accept matches", mark: "crosslink", opens: () => ready.forEach((one) => linkRecording(one.recordingId, one.workId, CONFIRMED)) }
              : { label: "Accept matches", mark: "crosslink", unavailable: "None of these has a match Harbor Music may confirm." },
          ];
        },
        commands: commandsOf,
        empty: { none: "Every earning recording is linked to a work." },
      }}
    />
  );
}
