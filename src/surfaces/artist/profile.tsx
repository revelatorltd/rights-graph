import { Badge, CollectionPage, DetailPage, FactCard, Metadata, WayOut, formatList } from "@revelator/pro-ui";

import type { Shown } from "../surface";
import { DELEGATES, IDENTITY, PROFILES, type Reader } from "./data";
import { ClaimProfile, InviteDelegate } from "./dialogs";
import { personMark } from "./marks";

/** Revelator's statements, where the artist is a payee (S3-10) — outside this app. */
const STATEMENTS = "https://pro.revelator.com/statements";

/**
 * Identity & verification (S3-1), under Profile and never on Home: who ArtistID checked, how,
 * when, and the assurance every signature the artist makes carries. The badge is the verification
 * state; the assurance is a LEVEL, so it is a chip beside it. Earnings is a way out (S3-10).
 */
function IdentityBody({ reader }: { reader: Reader }) {
  const person = reader.subject;
  const identity = IDENTITY[person.id]!;
  return (
    <DetailPage
      record={{
        mark: personMark(person.name),
        name: person.name,
        kind: person.kind,
        status: person.assurance && person.assurance !== "Basic" ? "verification:Verified" : "verification:Pending",
        facts: [
          ...(person.isni ? [{ identifier: person.isni, standard: "isni" as const }] : []),
          ...(person.ipi ? [{ identifier: person.ipi, standard: "ipi" as const }] : []),
          { text: `ArtistID ${person.assurance ?? "Basic"}` },
        ],
      }}
    >
      <Metadata>
        <FactCard
          title="ArtistID"
          facts={[
            { label: "Assurance", value: person.assurance ?? "Basic" },
            { label: "Status", value: <Badge status="verification:Verified" /> },
            { label: "Checked with", value: identity.check.method },
            { label: "Checked", as: "date", value: identity.check.at, grain: "minute" },
            { label: "Signing key", value: identity.keyId },
          ]}
        />
        <FactCard
          title="Sign-in"
          facts={[
            { label: "Email", value: identity.email },
            { label: "Phone", value: identity.phone },
          ]}
        />
        <FactCard
          title="Earnings"
          trail={<WayOut opens={STATEMENTS} />}
          facts={[
            { label: "Paid as", value: identity.payee },
            { label: "Statements", value: "In Revelator — the graph holds rights, not money." },
          ]}
        />
      </Metadata>
    </DetailPage>
  );
}

export const identityPage = (reader: Reader): Shown => ({
  place: { at: "Profile", page: "Identity & verification" },
  page: <IdentityBody key={reader.persona} reader={reader} />,
});

/**
 * Claimed profiles (S3-2): the artist and writer entries in the graph the reader says are them,
 * with the ISNI or IPI where known. A claim shows verified once the label or Sureel confirms it.
 */
function ProfilesIndex({ reader }: { reader: Reader }) {
  const delegate = reader.persona === "Delegate";
  return (
    <CollectionPage
      title="Claimed profiles"
      actions={delegate ? undefined : [{ label: "Claim a profile", primary: true, creates: true, dialog: <ClaimProfile reader={reader} /> }]}
      index={{
        rows: PROFILES.filter((one) => one.party === reader.subject.id),
        rowKey: (one) => one.id,
        noun: { one: "profile", many: "profiles" },
        identity: { title: "Entry", name: (one) => one.name, mark: (one) => personMark(one.name) },
        columns: [
          { name: "Status", value: (one) => one.state, cell: (one) => <Badge status={`verification:${one.state}`} /> },
          { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
          { name: "ISNI or IPI", value: (one) => one.code ?? "", cell: (one) => one.code ?? "Not known yet" },
          { name: "Confirmed by", value: (one) => one.confirmedBy ?? "", cell: (one) => one.confirmedBy ?? "Waiting on the label or Sureel" },
          { name: "Claimed", as: "date", value: (one) => one.claimed },
        ],
        note: delegate ? `Only ${reader.subject.name} can claim a profile — it is signed with her ArtistID.` : undefined,
        empty: { none: "You have not claimed a profile yet. Claim the artist or writer entry that is you." },
      }}
    />
  );
}

export const profilesPage = (reader: Reader): Shown => ({
  place: { at: "Profile", page: "Claimed profiles" },
  page: <ProfilesIndex key={reader.persona} reader={reader} />,
});

/**
 * Delegates (S3-8): the managers and lawyers who may approve on the artist's behalf, each with
 * their scope. What a delegate approves is recorded as "approved by [delegate] for [artist]".
 */
function DelegatesIndex({ reader }: { reader: Reader }) {
  const delegate = reader.persona === "Delegate";
  return (
    <CollectionPage
      title="Delegates"
      actions={delegate ? undefined : [{ label: "Invite a delegate", primary: true, creates: true, dialog: <InviteDelegate reader={reader} /> }]}
      index={{
        rows: DELEGATES.filter((one) => one.for === reader.subject.id),
        rowKey: (one) => one.id,
        noun: { one: "delegate", many: "delegates" },
        identity: { title: "Name", name: (one) => one.name, mark: (one) => personMark(one.name) },
        columns: [
          { name: "Status", value: (one) => one.state, cell: (one) => <Badge status={`account:${one.state}`} /> },
          { name: "Role", value: (one) => one.role, cell: (one) => one.role },
          { name: "May approve", value: (one) => one.scope.join(", "), cell: (one) => formatList(one.scope) },
          { name: "Email", value: (one) => one.email, cell: (one) => one.email },
          { name: "Since", as: "date", value: (one) => one.since },
        ],
        note: delegate
          ? `You act for ${reader.subject.name}. Only she can invite or remove a delegate.`
          : "Voice/NIL and your AI opt-out are never delegated.",
        empty: { none: "Nobody acts for you yet. Invite a manager or lawyer, and choose what they may approve." },
      }}
    />
  );
}

export const delegatesPage = (reader: Reader): Shown => ({
  place: { at: "Profile", page: "Delegates" },
  page: <DelegatesIndex key={reader.persona} reader={reader} />,
});
