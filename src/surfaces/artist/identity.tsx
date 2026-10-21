import { Alert, Badge, CollectionPage, DetailPage, FactCard, Field, FormDialog, Metadata, WayOut, formatList, owed, type HeldBy } from "@revelator/pro-ui";

import { partyById, partyName } from "../../graph/fixtures";
import {
  CONFIRMERS,
  accounts,
  assuranceOf,
  claimDecision,
  claimEntries,
  claimState,
  claimable,
  claimsBy,
  confirmedEntries,
  lastCheck,
  signedIn,
  type Account,
  type Assurance,
} from "../../graph/identity";
import { USES, type Use } from "../../graph/model";
import { decidedBy } from "../../rights/kit";
import type { Shown } from "../surface";
import { IDENTITY, PROFILES, type Reader } from "./data";
import { personMark } from "./marks";
import { artistHref } from "./place";

/** Revelator's statements, where the artist is a payee (S3-10) — outside this app. */
const STATEMENTS = "https://pro.revelator.com/statements";

/**
 * What each level lets a person do. The FRD leaves open which level Voice/NIL needs (open question:
 * Sureel, WMG legal); the assumption here is Verified + ID, logged in docs/gaps/s3-signup.md.
 */
const ALLOWS: Record<Assurance, string> = {
  Basic: "Sign in, see your credits and requests, and claim your profiles. Nothing you sign counts toward a tier yet.",
  Verified: "Confirm or deny credits — a signed role confirmation, which can lift a track toward T4 — answer licence requests, and invite delegates.",
  "Verified + ID": "Everything Verified allows, and your voice and likeness: grant, limit or deny Voice/NIL, set the AI opt-out, dispute what a label attested for you. (Assumed — the FRD leaves this level open.)",
};

/** What a delegate's scope lets them approve, by the words the artist chose it in. */
const SCOPE_USES: Record<string, readonly Use[]> = {
  "Sync approvals": ["Sync"],
  "Licence requests": USES.filter((one) => one !== "Voice/NIL"),
  "Credit reminders": [],
};

/**
 * The reader the "New artist" persona is: whoever signed up in this session. Until a claim is
 * confirmed the app is about their ArtistID alone; once one is, about the entry it joins them to —
 * the artist entry for an artist, the writer entry for a writer. A delegate's account reads the
 * artist who invited them, inside the scope of the invitation.
 */
export function newcomerReader(): Reader | undefined {
  const account = signedIn();
  if (!account) return undefined;
  const actor = partyById(account.id);
  if (account.delegateFor) {
    const scope = account.delegateFor.scope;
    return {
      persona: "Delegate",
      subject: partyById(account.delegateFor.artist),
      actor,
      scope: { uses: scope.flatMap((one) => SCOPE_USES[one] ?? []), words: (formatList(scope) ?? "nothing").toLowerCase() },
    };
  }
  const entries = confirmedEntries(account.id);
  const subject = entries.find((one) => one.kind === (account.role === "Writer" ? "Writer" : "Artist")) ?? entries[0] ?? actor;
  return { persona: account.role === "Artist" ? "Artist" : "Writer", subject, actor: subject };
}

/** The ArtistID behind a reader, where it was made in this session. */
export const accountOf = (reader: Reader): Account | undefined =>
  accounts().find((one) => one.id === reader.actor.id || one.id === reader.subject.id || confirmedEntries(one.id).some((entry) => entry.id === reader.subject.id));

/** Whose identity the reader's checks and claims are recorded on: the ArtistID, or the seeded person. */
export const personOf = (reader: Reader) => (reader.persona === "Delegate" ? reader.subject.id : (accountOf(reader)?.id ?? reader.subject.id));

const levelBadge = (level: Assurance) => <Badge status={level === "Basic" ? "verification:Pending" : "verification:Verified"} />;

/**
 * Identity & verification (S3-1), under Profile and never on Home: the level the ArtistID holds,
 * how it was reached, what each level lets the person do, and the way to the next one. The badge is
 * the verification state; the level is written beside it (no status family holds a level — gaps).
 */
function IdentityBody({ reader }: { reader: Reader }) {
  const person = personOf(reader);
  const account = reader.persona === "Delegate" ? undefined : accountOf(reader);
  const seeded = IDENTITY[reader.subject.id];
  const level = assuranceOf(person);
  const check = lastCheck(person);
  const delegate = reader.persona === "Delegate";
  const claims = claimsBy(person);
  const waiting = claims.filter((one) => claimState(one) === "Pending").length;
  const subject = reader.subject;
  return (
    <DetailPage
      record={{
        mark: personMark(subject.name),
        name: subject.name,
        kind: subject.kind,
        status: level === "Basic" ? "verification:Pending" : "verification:Verified",
        facts: [
          ...(subject.isni ? [{ identifier: subject.isni, standard: "isni" as const }] : []),
          ...(subject.ipi ? [{ identifier: subject.ipi, standard: "ipi" as const }] : []),
          { text: `ArtistID ${level}` },
        ],
        // A delegate never verifies the artist's identity: the action is left out (gaps: no unavailable page action).
        actions: delegate
          ? []
          : [
              {
                label: level === "Verified + ID" ? "Re-verify" : "Upgrade to Verified + ID",
                primary: level !== "Verified + ID",
                opens: artistHref("verify-id"),
              },
            ],
      }}
    >
      <Metadata>
        {delegate ? (
          <Alert intent="info" title={`${subject.name}'s identity`}>
            {`Only ${subject.name.split(" ")[0]} can verify her ArtistID or claim a profile — each is signed with it.`}
          </Alert>
        ) : null}
        {!delegate && level === "Basic" ? (
          <Alert intent="info" title={waiting ? "Waiting on confirmation" : "Claim a profile to be verified"}>
            {waiting
              ? `${waiting === 1 ? "Your claim waits" : "Your claims wait"} on ${formatList([...new Set(claims.filter((one) => claimState(one) === "Pending").map((one) => partyName(one.confirmer)))])}. Your ArtistID is Verified the moment one is confirmed.`
              : "Your ArtistID is Verified once your label or Sureel confirms a profile you claim."}
          </Alert>
        ) : null}
        {!delegate && check?.outcome === "Failed" ? (
          <Alert intent="danger" title="Your last ID check failed">
            {level === "Verified + ID"
              ? "Your level stands: a failed re-check is recorded, never takes a level away. Try again with another document, in good light."
              : "Try again with another document, in good light. Until a check passes, your ArtistID cannot reach Verified + ID."}
          </Alert>
        ) : null}
        <FactCard
          title="ArtistID"
          facts={[
            { label: "Assurance", value: level },
            { label: "Status", value: levelBadge(level) },
            {
              label: "ID checked with",
              value: check ? `${check.document}, with a live selfie — ${check.outcome.toLowerCase()}` : (seeded?.check.method ?? "Not checked yet"),
            },
            { label: "Checked", as: "date", value: check?.at ?? seeded?.check.at, grain: "minute" },
            { label: "Signing key", value: account?.keyId ?? seeded?.keyId },
          ]}
        />
        <FactCard
          title="What each level allows"
          facts={[
            { label: "Basic", value: ALLOWS.Basic },
            { label: "Verified", value: ALLOWS.Verified },
            { label: "Verified + ID", value: ALLOWS["Verified + ID"] },
          ]}
        />
        <FactCard
          title="Profiles"
          trail={<WayOut opens={artistHref("profiles")} />}
          facts={[
            { label: "Verified", as: "count", value: claims.filter((one) => claimState(one) === "Verified").length + PROFILES.filter((one) => one.party === subject.id && one.state === "Verified").length },
            { label: "Waiting on confirmation", as: "count", value: waiting + PROFILES.filter((one) => one.party === subject.id && one.state === "Pending").length },
          ]}
        />
        <FactCard
          title="Sign-in"
          facts={[
            { label: "Email", value: account ? (account.signIn === "Email" ? account.contact : undefined) : seeded?.email },
            { label: "Phone", value: account ? (account.signIn === "Phone" ? account.contact : undefined) : seeded?.phone },
          ]}
        />
        {seeded ? (
          <FactCard
            title="Earnings"
            trail={<WayOut opens={STATEMENTS} />}
            facts={[
              { label: "Paid as", value: seeded.payee },
              { label: "Statements", value: "In Revelator — the graph holds rights, not money." },
            ]}
          />
        ) : null}
      </Metadata>
    </DetailPage>
  );
}

export const identityPage = (reader: Reader): Shown => ({
  place: { at: "Profile", page: "Identity & verification" },
  page: <IdentityBody key={`${reader.persona}-${reader.subject.id}`} reader={reader} />,
});

// ---------------------------------------------------------------------------------------------
// Claimed profiles (S3-2)

interface ProfileRow {
  id: string;
  name: string;
  kind: string;
  code?: string;
  state: "Verified" | "Pending" | "Declined";
  confirmer?: string;
  decided?: string;
  claimed: Date;
}

const CONFIRMER_OPTIONS = CONFIRMERS.map((one) => ({
  value: one,
  title: one === "p-sureel" ? "Sureel" : partyName(one),
  description: one === "p-sureel" ? "Sureel's rights ops, a few working days." : "Your label, from Revelator Pro — usually within a day.",
}));

/** More entries claimed from the graph, after sign-up — the same search, the same two confirmers. */
function ClaimFromGraph({ person, ...held }: HeldBy & { person: string }) {
  return (
    <FormDialog
      {...held}
      confirm="Claim"
      draft={{ profiles: owed([] as readonly string[]), confirmer: owed("p-kestrel" as string) }}
      onCommit={(draft) => claimEntries(person, draft.profiles, draft.confirmer)}
    >
      <Field
        as="record"
        name="profiles"
        label="Entries"
        entity="person"
        noun={{ one: "entry", many: "entries" }}
        several
        options={claimable(person).map((one) => ({ value: one.id, title: one.name, code: one.isni ?? one.ipi }))}
        help="Search by name, IPI or ISNI."
      />
      <Field as="choice" name="confirmer" label="Confirmed by" options={CONFIRMER_OPTIONS} />
    </FormDialog>
  );
}

function ProfilesIndex({ reader }: { reader: Reader }) {
  const delegate = reader.persona === "Delegate";
  const person = personOf(reader);
  const rows: ProfileRow[] = [
    ...claimsBy(person).map((one) => {
      const entry = partyById(one.entry);
      const decided = claimDecision(one);
      return {
        id: one.id,
        name: entry.name,
        kind: `${entry.kind} entry`,
        code: entry.isni ? `ISNI ${entry.isni}` : entry.ipi ? `IPI ${entry.ipi}` : undefined,
        state: claimState(one),
        confirmer: partyName(one.confirmer),
        decided: decided ? decidedBy(decided) : undefined,
        claimed: one.claimed,
      } satisfies ProfileRow;
    }),
    ...PROFILES.filter((one) => one.party === reader.subject.id).map(
      (one) =>
        ({
          id: one.id,
          name: one.name,
          kind: one.kind,
          code: one.code ? `${one.standard.toUpperCase()} ${one.code}` : undefined,
          state: one.state,
          confirmer: one.confirmedBy,
          decided: one.confirmedBy,
          claimed: one.claimed,
        }) satisfies ProfileRow,
    ),
  ];
  return (
    <CollectionPage
      title="Claimed profiles"
      actions={delegate ? undefined : [{ label: "Claim a profile", primary: true, creates: true, dialog: <ClaimFromGraph person={person} /> }]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "profile", many: "profiles" },
        identity: { title: "Entry", name: (one) => one.name, mark: (one) => personMark(one.name) },
        columns: [
          {
            name: "Status",
            value: (one) => one.state,
            cell: (one) => <Badge status={one.state === "Declined" ? "request:Declined" : `verification:${one.state}`} />,
          },
          { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
          { name: "ISNI or IPI", value: (one) => one.code ?? "", cell: (one) => one.code ?? "Not known yet" },
          { name: "Confirms", value: (one) => one.confirmer ?? "", cell: (one) => one.confirmer ?? "The label or Sureel" },
          { name: "Decided by", value: (one) => one.decided ?? "", cell: (one) => one.decided ?? "Waiting" },
          { name: "Claimed", as: "date", value: (one) => one.claimed },
        ],
        note: delegate ? `Only ${reader.subject.name} can claim a profile — it is signed with her ArtistID.` : undefined,
        empty: { none: "You have not claimed a profile yet. Claim the artist or writer entry in the graph that is you." },
      }}
    />
  );
}

export const profilesPage = (reader: Reader): Shown => ({
  place: { at: "Profile", page: "Claimed profiles" },
  page: <ProfilesIndex key={`${reader.persona}-${reader.subject.id}`} reader={reader} />,
});
