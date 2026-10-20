import { ConfirmationDialog, Field, FormDialog, owed, unanswered, type HeldBy } from "@revelator/pro-ui";

import { assertionById, assetById, linkRecording, works } from "../../graph/fixtures";
import type { Conflict } from "../../graph/model";
import { OPS_TEAM, addNote, askForEvidence, assign, basesOf, outcomesOf, resolve } from "./data";

const LINKED = "Linked to a work";

/**
 * A conflict resolved WITH A REASON (S7-2): what the outcome is, the rule version or the evidence it
 * rests on, and why — all three owed, because a resolution nobody can trace back is a second
 * opinion, not a decision. A missing work link is resolved by linking it, which the graph's own
 * write does; every other kind records its resolution on the conflict.
 */
export function Resolve({ conflict, by, ...held }: HeldBy & { conflict: Conflict; by: string }) {
  const claims = conflict.claims.map(assertionById);
  const linking = conflict.kind === "Missing work link";
  return (
    <FormDialog
      {...held}
      confirm="Resolve"
      draft={{ outcome: owed.choice, basis: owed.choice, reason: owed.longtext, work: unanswered.choice }}
      onCommit={(draft) => {
        if (linking && draft.outcome === LINKED && draft.work) linkRecording(conflict.assetId, draft.work, `Sureel ops · ${by}`);
        else resolve(conflict, by, draft.outcome, draft.basis, draft.reason.trim());
      }}
    >
      <Field
        as="choice"
        name="outcome"
        label="Outcome"
        options={outcomesOf(conflict).map((one) => ({ value: one, title: one }))}
      />
      {linking ? (
        <Field
          as="choice"
          name="work"
          label="Work"
          help="The work the recording embodies. Linking it resolves the conflict and recomputes the composition side."
          options={works().map((one) => ({ value: one.id, title: one.title, description: one.iswc ?? "No ISWC yet" }))}
        />
      ) : null}
      <Field
        as="choice"
        name="basis"
        label="Rule or evidence"
        help="What the resolution rests on — recorded with it, and on the Proof Log."
        options={basesOf(conflict, claims).map((one) => ({ value: one, title: one }))}
      />
      <Field as="longtext" name="reason" label="Reason" help={`Both sides read it, on ${assetById(conflict.assetId).title}.`} />
    </FormDialog>
  );
}

/** Who works the conflict — rights ops or a data engineer, by name. */
export function Assign({ conflict, by, ...held }: HeldBy & { conflict: Conflict; by: string }) {
  return (
    <FormDialog
      {...held}
      confirm="Assign"
      draft={{ who: owed.choice }}
      onCommit={(draft) => assign(conflict, draft.who, by)}
    >
      <Field
        as="choice"
        name="who"
        label="Assignee"
        options={OPS_TEAM.filter((one) => one.name !== conflict.assignee).map((one) => ({ value: one.name, title: one.name, description: one.role }))}
      />
    </FormDialog>
  );
}

/** A note on the conflict, read by everyone working it — not by the parties. */
export function Comment({ conflict, by, ...held }: HeldBy & { conflict: Conflict; by: string }) {
  return (
    <FormDialog {...held} confirm="Add" draft={{ text: owed.longtext }} onCommit={(draft) => addNote(conflict.id, by, draft.text.trim())}>
      <Field as="longtext" name="text" label="Comment" help="Seen by Sureel ops only. The parties see the resolution and its reason." />
    </FormDialog>
  );
}

/** The parties asked for evidence — the counterclaim moves to its second step. */
export function AskForEvidence({ conflict, by, ...held }: HeldBy & { conflict: Conflict; by: string }) {
  return (
    <ConfirmationDialog
      {...held}
      asks="Every party on the conflict is asked to upload what supports its claim. The resolver keeps paying on the interim rule until it is decided."
      confirm="Ask"
      onCommit={() => askForEvidence(conflict, by)}
    />
  );
}
