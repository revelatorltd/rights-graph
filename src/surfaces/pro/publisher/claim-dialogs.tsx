import { useState } from "react";
import {
  ConfirmationDialog,
  Field,
  FormDialog,
  UploaderDocument,
  UploaderFileRow,
  formatPercent,
  owed,
  unanswered,
  type HeldBy,
} from "@revelator/pro-ui";

import { AGREEMENTS, TODAY, works } from "../../../graph/fixtures";
import type { Assertion, Interest, RightType } from "../../../graph/model";
import { territoryLabel } from "../../../graph/resolve";
import { ME, TERRITORY_SETS, myClaims, withdrawClaim, writeClaim } from "./data";

const INTERESTS: readonly Interest[] = ["Owns", "Controls", "Administers", "Collects"];

/** The rights a claim can name, as the RAD taxonomy groups them for a publisher. */
const RIGHTS: Record<string, Assertion["rights"]> = {
  "All composition": "All composition",
  "Mechanical and performance": ["Mechanical", "Performance"],
  Performance: ["Performance"],
  Mechanical: ["Mechanical"],
  Sync: ["Sync"],
};
const rightsKey = (rights: Assertion["rights"]) =>
  Object.entries(RIGHTS).find(([, value]) => (typeof value === "string" ? value === rights : typeof rights !== "string" && value.join() === (rights as readonly RightType[]).join()))?.[0] ??
  "All composition";
const territoryKey = (claim?: Assertion) => (claim ? territoryLabel(claim.territory) : "World");

/** The agreements Harbor Music is a party to — what a claim of its can cite. */
const myAgreements = () => AGREEMENTS.filter((one) => one.parties.includes(ME));
const NO_AGREEMENT = "none";

/**
 * Harbor's claim on a work, added or corrected (G-1, S1-3 on the composition side): a share, the
 * rights and territory it covers, its dates, the agreement that justifies it and its evidence.
 * A correction SUPERSEDES the claim it corrects — the old row stays. Where it would take the
 * shares over 100%, it is stored contested and the conflict opens with it.
 *
 * HELD by the band's, the row's or the index's action, which titles it.
 */
export function AddWorkClaim({ workId, correcting, ...held }: HeldBy & { workId?: string; correcting?: Assertion }) {
  const [files, setFiles] = useState<File[]>([]);
  const begun = correcting;
  return (
    <FormDialog
      {...held}
      confirm={correcting ? "Save correction" : "Add claim"}
      onClose={() => setFiles([])}
      draft={{
        work: workId ? owed(workId) : owed.record,
        interests: owed<readonly string[]>(begun?.interests ?? ["Owns", "Controls"]),
        share: begun ? owed(begun.share) : owed.percent,
        rights: owed(begun ? rightsKey(begun.rights) : "All composition"),
        territory: owed(territoryKey(begun)),
        from: owed(begun?.from ?? TODAY),
        to: begun?.to ?? unanswered.date,
        agreement: owed(begun?.agreementId ?? NO_AGREEMENT),
      }}
      onCommit={(draft) => {
        writeClaim({
          workId: draft.work,
          interests: draft.interests as Interest[],
          rights: RIGHTS[draft.rights] ?? "All composition",
          share: draft.share,
          territory: TERRITORY_SETS[draft.territory] ?? TERRITORY_SETS.World!,
          from: draft.from,
          to: draft.to ?? undefined,
          agreementId: draft.agreement === NO_AGREEMENT ? undefined : draft.agreement,
          evidence: files.map((one) => one.name),
          supersedes: correcting?.id,
        });
        setFiles([]);
      }}
    >
      {workId ? null : (
        <Field
          as="record"
          name="work"
          label="Work"
          entity="work"
          noun={{ one: "work", many: "works" }}
          standard="iswc"
          options={works().map((one) => ({ value: one.id, title: one.title, code: one.iswc }))}
        />
      )}
      <Field
        as="choices"
        name="interests"
        label="Interest"
        help="Four separate edges: owning a share is not controlling it, and neither is collecting it."
        options={INTERESTS.map((one) => ({ value: one, title: one }))}
      />
      <Field as="percent" name="share" label="Publisher share" help="Ownership share of the publisher side, not the payout." />
      <Field as="choice" name="rights" label="Rights" options={Object.keys(RIGHTS).map((one) => ({ value: one, title: one }))} />
      <Field
        as="choice"
        name="territory"
        label="Territory"
        options={Object.keys(TERRITORY_SETS).map((one) => ({ value: one, title: one }))}
      />
      <Field as="date" name="from" label="Valid from" />
      <Field as="date" name="to" label="Valid to" help="Left blank, the claim runs until it is corrected or withdrawn." />
      <Field
        as="choice"
        name="agreement"
        label="Agreement"
        help="A claim with a signed agreement outranks a declaration (precedence 1 of 6)."
        options={[
          ...myAgreements().map((one) => ({ value: one.id, title: one.code, description: one.title })),
          { value: NO_AGREEMENT, title: "No agreement", description: "Stored as self-declared, the lowest precedence a publisher's claim takes." },
        ]}
      />
      <UploaderDocument
        accept=".pdf,.cwr,.csv"
        formats="PDF, CWR or CSV"
        noun={{ one: "evidence file", many: "evidence files" }}
        onSelect={(picked) => setFiles((was) => [...was, ...Array.from(picked)])}
      >
        {files.map((one) => (
          <UploaderFileRow
            key={one.name}
            name={one.name}
            phase="landed"
            fileSize={one.size}
            onRemove={() => setFiles((was) => was.filter((each) => each !== one))}
          />
        ))}
      </UploaderDocument>
    </FormDialog>
  );
}

/** A correction of one of Harbor's own claims — the claim's own form, begun from it. */
export const CorrectClaim = ({ claim, ...held }: HeldBy & { claim: Assertion }) => (
  <AddWorkClaim {...held} workId={claim.assetId} correcting={claim} />
);

/** Harbor's claim withdrawn — asked first, because the resolved value moves with it. */
export function WithdrawClaim({ claim, ...held }: HeldBy & { claim: Assertion }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={`Harbor Music's ${formatPercent(claim.share)} claim (${claim.sourceRef}) is withdrawn. It stays on record as withdrawn, and the graph resolves without it.`}
      confirm="Withdraw"
      destructive
      onCommit={() => withdrawClaim(claim)}
    />
  );
}

/** Whether a claim is Harbor's own and still standing — what may be corrected or withdrawn. */
export const isMine = (claim: Assertion) =>
  claim.partyId === ME && claim.state !== "Superseded" && claim.state !== "Withdrawn" && myClaims(claim.assetId).includes(claim);
