import { useState, type ReactElement } from "react";
import {
  ConfirmationDialog,
  Field,
  FieldLabel,
  FormDialog,
  UploaderDocument,
  UploaderFileRow,
  formatPercent,
  owed,
  unanswered,
  type HeldBy,
} from "@revelator/pro-ui";
import { keepEvidence } from "../../../rights/files";

import { TODAY, linkRecording, works } from "../../../graph/fixtures";
import type { Assertion, Asset, Side, SourceKind, TerritorySet } from "../../../graph/model";
import { territoryLabel } from "../../../graph/resolve";
import {
  COUNTRIES,
  INTERESTS,
  SOURCES,
  agreementsOf,
  shareWords,
  suggestedWork,
  whose,
  withdrawClaim,
  writeClaim,
} from "./data";

/** Who acts in each context — the person signed in, as the shell names them. */
export const ACTOR = { Label: "Priya Raman", Publisher: "Elena Marsh" } as const;

const SCOPES = [
  { value: "World", title: "World", description: "Every country." },
  { value: "Except", title: "World, except", description: "Every country but the ones picked." },
  { value: "Only", title: "Only in", description: "The countries picked, and no other." },
] as const;

const scopeOf = (set: TerritorySet) => (set.include === "World" ? (set.exclude?.length ? "Except" : "World") : "Only");
const codesOf = (set: TerritorySet): readonly string[] => (set.include === "World" ? set.exclude ?? [] : set.include);
const territoryOf = (scope: string, codes: readonly string[]): TerritorySet =>
  scope === "World" ? { include: "World" } : scope === "Except" ? { include: "World", exclude: codes } : { include: codes };

/**
 * Adding a claim, or correcting one (S1-3) — the reader's own, on one side of one asset. Saving
 * never edits: it writes a new claim, and a correction supersedes the one it replaces, which stays
 * on the record. Where the new claim takes the shares past the whole, an overclaim opens.
 *
 * A dialog and not a wizard: one claim is a handful of answers, and the rights it is added to stay
 * in view behind it.
 */
export function ClaimDialog({
  on,
  side,
  party,
  actor,
  correcting,
  ...held
}: HeldBy & {
  /** The assets the claim can be on — one, or the works a recording embodies. */
  on: readonly Asset[];
  side: Side;
  party: string;
  actor: string;
  /** The claim being corrected, where this is a correction. */
  correcting?: Assertion;
}) {
  const [files, setFiles] = useState<readonly { name: string; size?: number }[]>(() => (correcting?.evidence ?? []).map((name) => ({ name })));
  const agreements = agreementsOf(party);
  return (
    <FormDialog
      {...held}
      confirm={correcting ? "Save correction" : "Save claim"}
      onClose={() => setFiles((correcting?.evidence ?? []).map((name) => ({ name })))}
      draft={{
        asset: owed(correcting?.assetId ?? on[0]!.id),
        interests: owed(correcting?.interests ?? (side === "Master" ? ["Owns", "Controls"] : ["Owns", "Controls"])),
        share: correcting ? owed(correcting.share) : owed.percent,
        scope: owed<string>(scopeOf(correcting?.territory ?? { include: "World" })),
        countries: codesOf(correcting?.territory ?? { include: "World" }),
        from: owed(correcting?.from ?? TODAY),
        to: correcting?.to ?? unanswered.date,
        source: owed<string>(correcting?.source ?? "Signed agreement"),
        agreement: correcting?.agreementId ?? unanswered.choice,
        reference: correcting ? owed(correcting.sourceRef) : owed.text,
      }}
      ready={(draft) =>
        (draft.scope === "World" || (draft.countries?.length ?? 0) > 0) &&
        typeof draft.share === "number" &&
        draft.share > 0 &&
        draft.share <= 100 &&
        (draft.interests?.length ?? 0) > 0
      }
      onCommit={(draft) => {
        writeClaim(
          {
            assetId: draft.asset,
            side,
            partyId: party,
            interests: INTERESTS.filter((one) => draft.interests.includes(one)),
            shareType: correcting?.shareType ?? (side === "Master" ? "Master" : "Publisher"),
            share: draft.share,
            territory: territoryOf(draft.scope, draft.countries),
            from: draft.from,
            to: draft.to ?? undefined,
            source: draft.source as SourceKind,
            sourceRef: draft.reference,
            agreementId: draft.agreement || undefined,
            evidence: files.map((one) => one.name),
            supersedes: correcting?.id,
          },
          actor,
        );
      }}
    >
      {on.length > 1 ? (
        <Field
          as="choice"
          name="asset"
          label="Work"
          help="The composition side is claimed on a work, never on the recording."
          options={on.map((one) => ({ value: one.id, title: one.title, description: one.iswc ?? "ISWC pending" }))}
        />
      ) : null}
      <Field
        as="choices"
        name="interests"
        label="Interest"
        help="Four separate edges: owning a share is not controlling it, and collecting is neither."
        options={INTERESTS.map((one) => ({ value: one, title: one }))}
      />
      <Field as="percent" name="share" label="Share" help={side === "Master" ? "Of the master." : "Of the publisher share."} />
      <Field as="choice" name="scope" label="Territory" options={SCOPES.map((one) => ({ ...one }))} />
      <Field
        as="choices"
        name="countries"
        label="Countries"
        help="The countries the territory names — left out, or the only ones."
        options={Object.entries(COUNTRIES).map(([value, title]) => ({ value, title }))}
      />
      <Field as="date" name="from" label="From" />
      <Field as="date" name="to" label="Until" help="Left empty, the claim runs until a later one ends it." />
      <Field as="choice" name="source" label="Source" options={SOURCES.map((one) => ({ value: one, title: one }))} />
      <Field
        as="choice"
        name="agreement"
        label="Agreement"
        help="The agreement that gives the claim its authority, where one does."
        options={agreements.map((one) => ({ value: one.id, title: one.code, description: one.title }))}
      />
      <Field as="text" name="reference" label="Source reference" help="The agreement code, the CWR file, the society acknowledgement or the DDEX message." />
      <Field>
        <FieldLabel>Evidence</FieldLabel>
        <UploaderDocument
          noun={{ one: "document", many: "documents" }}
          formats="PDF, PNG or JPG"
          onSelect={(picked) => {
            // Kept as evidence: the file's name goes on the claim, its size and type beside it.
            keepEvidence([...picked]);
            setFiles((now) => [...now, ...[...picked].map((one) => ({ name: one.name, size: one.size }))]);
          }}
        >
          {files.map((one) => (
            <UploaderFileRow
              key={one.name}
              name={one.name}
              phase="landed"
              fileSize={one.size}
              removable
              onRemove={() => setFiles((now) => now.filter((each) => each.name !== one.name))}
            />
          ))}
        </UploaderDocument>
      </Field>
    </FormDialog>
  );
}

/** Taking a claim back — asked first: it stops counting, and the row stays on the record. */
export function WithdrawClaim({ claim, actor, ...held }: Omit<HeldBy, "trigger"> & { claim: Assertion; actor: string; trigger?: ReactElement }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`${whose(claim.partyId)} ${shareWords(claim)} claim in ${territoryLabel(claim.territory)} stops counting. It stays on the record, withdrawn.`}
      confirm="Withdraw"
      destructive
      onCommit={() => withdrawClaim(claim, actor)}
    />
  );
}

/**
 * Linking a recording to the work it embodies — the one way out of a missing link, which is
 * publishing money nobody can be paid. Offered with the match the graph suggested, where it has one.
 */
export function LinkWork({ recording, by, ...held }: HeldBy & { recording: Asset; by: string }) {
  const suggestion = suggestedWork(recording);
  return (
    <FormDialog
      {...held}
      confirm="Link"
      draft={{ work: suggestion ? owed(suggestion.work.id) : owed.record }}
      onCommit={(draft) => linkRecording(recording.id, draft.work, by)}
    >
      <Field
        as="record"
        name="work"
        label="Work"
        entity="work"
        noun={{ one: "work", many: "works" }}
        standard="iswc"
        help={
          suggestion
            ? `Suggested by matching: ${suggestion.work.title}, ${formatPercent(suggestion.confidence * 100, { whole: true })} sure — ${suggestion.shared.join("; ")}.`
            : "No match suggested yet: pick the work this recording embodies."
        }
        options={works().map((one) => ({ value: one.id, title: one.title, code: one.iswc }))}
      />
    </FormDialog>
  );
}
