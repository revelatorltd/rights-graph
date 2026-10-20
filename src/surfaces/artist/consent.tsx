import { Alert, Badge, RecordIndex, SectionRun, SettingsPage, SwitchField, TitledSection, formatDate, type Command } from "@revelator/pro-ui";

import type { Attestation } from "../../graph/model";
import { territoryLabel } from "../../graph/resolve";
import { decidedBy, partyMark } from "../../rights/kit";
import type { Shown } from "../surface";
import {
  blockedBy,
  denyVoice,
  disputeOf,
  grantById,
  grantVoice,
  grantsFor,
  onBehalfOf,
  optOutOf,
  outOfScope,
  partyName,
  performedOn,
  setOptOut,
  voiceAnswer,
  voicePartners,
  named,
  type Reader,
} from "./data";
import { DisputeAttestation, LimitVoice } from "./dialogs";
import { requestName } from "./requests";
import { requestHref } from "./place";

/**
 * Consent (S3-4, S3-5) — the hero of the app. Big switches, each with one plain sentence of what
 * it means, and every one applies the moment it is flipped: a switch writes a claim to the graph
 * (an artist-level grant or deny, signed), and the sentence under it is read back from the graph.
 *
 * Three things, in the order an artist asks them: is ANY AI use of me allowed (the opt-out); which
 * partner may use my voice, and how far; and what someone decided ON MY BEHALF — the label's
 * attestation, which the artist can dispute, never silently revoke.
 */
function ConsentBody({ reader }: { reader: Reader }) {
  const party = reader.subject.id;
  const first = reader.subject.name.split(" ")[0];
  const optOut = optOutOf(party);
  const denied = outOfScope(reader, { kind: "consent" });
  const performer = performedOn(party).length > 0;
  const behalf = onBehalfOf(party);
  const blocked = blockedBy(party);

  return (
    <>
      {/* The notification F3 step 2 asks for: what was decided for you, by whom, under what. */}
      {behalf.map((one) => {
        const grant = one.subject.kind === "Grant" ? grantById(one.subject.id) : undefined;
        const conflict = disputeOf(one);
        return (
          <Alert key={one.id} intent={one.state === "Disputed" ? "info" : "warn"} title={`${partyName(one.attestor)} approved ${grant?.use ?? one.claim} for ${grant?.partners.ids.map(partyName).join(", ") ?? "a partner"} on ${named(reader).your} behalf`}>
            {`${decidedBy({ actor: partyName(one.attestor), onBehalfOf: reader.subject.name, authority: one.authority, at: one.issued })}. ${
              one.state === "Disputed"
                ? `${named(reader).you === "you" ? "You" : named(reader).you} disputed it: ${conflict?.interim ?? "the grant is paused while Sureel reviews it."}`
                : "If you did not agree to it, dispute it below — the grant pauses while Sureel reviews it."
            }`}
          </Alert>
        );
      })}
      {denied ? <Alert intent="info" title={`These are ${first}'s to set`}>{denied}</Alert> : null}
      {!performer ? (
        <Alert intent="info" title="Voice/NIL attaches to recordings you perform on">
          No recording credits you as a performer yet, so no partner can be answered for your voice. Your opt-out still stands for any that do.
        </Alert>
      ) : null}

      <TitledSection title="AI use of you">
        <SwitchField
          display="card"
          label="No AI use of my voice or likeness"
          description={
            optOut
              ? `On — ${decidedBy(optOut.decided)}. Every request to use your voice or likeness is refused, whoever asks — your label included.`
              : "Off. Turn it on and every request to use your voice or likeness is refused, whoever asks — your label included."
          }
          checked={Boolean(optOut)}
          disabled={Boolean(denied)}
          onCheckedChange={(on) => setOptOut(reader, on)}
        />
      </TitledSection>

      <TitledSection title="Your voice, partner by partner">
        <SectionRun>
          {voicePartners().map((partner) => {
            const answer = voiceAnswer(party, partner.id);
            const mine = grantsFor(party, partner.id).find((one) => one.grantedBy === party && !one.conditions?.includes("AI opt-out"));
            // The switch is the artist's OWN answer (G-1): what they claim. The graph's resolved
            // answer stands next to it in the sentence, with its reason where the two differ.
            const allowed = mine ? mine.effect === "Grant" : answer?.state === "Granted";
            const where = mine && mine.territory.include !== "World" ? ` in ${territoryLabel(mine.territory)}` : "";
            const until = mine?.to ? ` until ${formatDate(mine.to, "day")}` : "";
            const resolved = answer
              ? answer.state === "Granted"
                ? "Cleared now."
                : `${answer.state === "Denied" ? "Not cleared now" : "Waiting on someone else"}: ${answer.reason}`
              : "";
            const sentence = optOut
              ? "Refused by your AI opt-out."
              : mine
                ? mine.effect === "Grant"
                  ? `You allow ${partner.name} to use your voice and likeness${where}${until}. ${resolved}`
                  : `You refused ${partner.name}. ${resolved}`
                : `You have not answered ${partner.name}. ${resolved}`;
            return (
              <SwitchField
                key={partner.id}
                display="card"
                label={`Let ${partner.name} use my voice`}
                description={sentence}
                checked={Boolean(allowed) && !optOut}
                disabled={Boolean(denied) || Boolean(optOut) || !performer}
                onCheckedChange={(on) => (on ? grantVoice(reader, partner.id) : denyVoice(reader, partner.id))}
              />
            );
          })}
        </SectionRun>
      </TitledSection>

      <TitledSection title="Decided on your behalf">
        <RecordIndex
          rows={behalf}
          rowKey={(one) => one.id}
          noun={{ one: "attestation", many: "attestations" }}
          identity={{
            title: "Attestation",
            name: (one) => {
              const grant = one.subject.kind === "Grant" ? grantById(one.subject.id) : undefined;
              return `${grant?.use ?? one.claim} for ${grant?.partners.ids.map(partyName).join(", ") ?? "a partner"}`;
            },
            mark: (one) => partyMark(one.attestor),
          }}
          columns={[
            { name: "Status", value: (one) => one.state, cell: (one) => <Badge status={`attestation:${one.state}`} /> },
            {
              name: "Grant",
              value: (one) => (one.subject.kind === "Grant" ? grantById(one.subject.id).state : ""),
              cell: (one) => (one.subject.kind === "Grant" ? <Badge status={`grant:${grantById(one.subject.id).state}`} /> : null),
            },
            { name: "Decided by", value: (one) => one.issued.getTime(), cell: (one) => decidedBy({ actor: partyName(one.attestor), onBehalfOf: reader.subject.name, authority: one.authority, at: one.issued }) },
            {
              name: "Conflict",
              value: (one) => disputeOf(one)?.state ?? "",
              cell: (one) => {
                const conflict = disputeOf(one);
                return conflict ? <Badge status={`conflict:${conflict.state}`} /> : null;
              },
            },
          ]}
          commands={(one) => disputeCommands(reader, one)}
          chooser={false}
          empty={{ none: "Nobody has decided anything on your behalf.", line: true }}
        />
      </TitledSection>

      {optOut ? (
        <TitledSection title="Blocked by your opt-out">
          <RecordIndex
            rows={blocked}
            rowKey={(one) => one.id}
            noun={{ one: "request", many: "requests" }}
            identity={{ title: "Request", name: requestName, mark: (one) => partyMark(one.from), opens: (one) => requestHref(one.id) }}
            columns={[
              { name: "Status", value: (one) => one.state, cell: (one) => <Badge status={`request:${one.state}`} /> },
              { name: "Why", value: (one) => one.purpose, cell: (one) => one.purpose },
              { name: "Answered to", value: (one) => partyName(one.to), cell: (one) => partyName(one.to) },
            ]}
            chooser={false}
            empty={{ none: "No request has asked for your voice since you opted out.", line: true }}
          />
        </TitledSection>
      ) : null}
    </>
  );
}

function disputeCommands(reader: Reader, one: Attestation): Command[] {
  const denied = reader.persona === "Delegate" ? `Only ${reader.subject.name.split(" ")[0]} can dispute what was decided for her.` : undefined;
  if (denied) return [{ label: "Dispute", unavailable: denied }];
  if (one.state === "Disputed") return [{ label: "Dispute", unavailable: "Disputed already — Sureel is reviewing it." }];
  if (one.state === "Revoked") return [{ label: "Dispute", unavailable: "Revoked: nothing stands to dispute." }];
  return [{ label: "Dispute", mark: "flag", dialog: <DisputeAttestation reader={reader} attestation={one} /> }];
}

function ConsentPage({ reader }: { reader: Reader }) {
  const denied = outOfScope(reader, { kind: "consent" });
  return (
    <SettingsPage
      title="Voice & AI"
      actions={denied || optOutOf(reader.subject.id) ? undefined : [{ label: "Allow with limits", dialog: <LimitVoice reader={reader} /> }]}
    >
      <ConsentBody reader={reader} />
    </SettingsPage>
  );
}

export const consentPage = (reader: Reader): Shown => ({
  place: { at: "Consent", page: "Voice & AI" },
  page: <ConsentPage key={reader.persona} reader={reader} />,
});
