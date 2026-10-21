import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Field,
  Button,
  Progress,
  UploaderArtwork,
  UploaderAvatar,
  UploaderDocument,
  UploaderFileRow,
  Wizard,
  WizardRow,
  WizardRowBody,
  WizardRowTip,
  WizardRowTips,
  WizardSection,
  WizardSectionBody,
  WizardSectionHeader,
  formatList,
  owed,
  useAnswer,
  useUpload,
  type UploadSend,
} from "@revelator/pro-ui";

import { partyName } from "../../graph/fixtures";
import {
  CONFIRMERS,
  DOCUMENTS,
  OUTCOMES,
  claimEntries,
  claimable,
  createAccount,
  recordCheck,
  type IdDocument,
  type IdOutcome,
  type Role,
} from "../../graph/identity";
import { go, href } from "../../route";
import { DELEGATES, type Delegate } from "./data";
import { artistHref } from "./place";

/**
 * Sign up (S3-1, S3-2): an ArtistID made, checked and joined to the graph, in the order each
 * needs the one before it — the contact proved before the account exists, the ID checked before a
 * claim is sent, a claim confirmed by someone who can vouch for the person.
 *
 * A STEPPED WIZARD covering the shell, as RCC's sign-ups do. A manager or lawyer is turned onto
 * their own path at the first stage: a delegate never signs up for an artist (FRD roles), they
 * accept the invitation the artist sent them.
 *
 * Nothing leaves the browser: the one-time code is shown on the page, the photos stay in memory and
 * the check is simulated — what it returns is the reviewer's to pick, so every outcome can be seen.
 */

const STAGES = ["You", "Sign-in code", "ID photos", "ID check", "Profiles"] as const;
const DELEGATE_STAGES = ["You", "Invitation"] as const;

/** The code a real ArtistID would text or email — shown on the page, never sent. */
const CODE = "482913";

const ROLE_OPTIONS = [
  { value: "Artist", title: "An artist", description: "You perform on recordings." },
  { value: "Writer", title: "A writer", description: "You write songs — writer mode adds your works and societies." },
  { value: "Both", title: "Both", description: "You perform and write." },
  { value: "Delegate", title: "Someone acting for an artist", description: "A manager or lawyer. The artist invites you; you do not sign up for them." },
];
const SIGN_IN_OPTIONS = [
  { value: "Email", title: "Email", description: "A code to your inbox." },
  { value: "Phone", title: "Phone", description: "A code by text message." },
];
const DOCUMENT_OPTIONS = DOCUMENTS.map((one) => ({
  value: one,
  title: one,
  description: one === "Passport" ? "The photo page only." : "Front and back.",
}));
const WHEN_OPTIONS = [
  { value: "Now", title: "Check my ID now", description: "Takes about two minutes. Needed for Verified + ID." },
  { value: "Later", title: "Later", description: "From Profile › Identity & verification. You stay Basic until a claim is confirmed." },
];
const OUTCOME_OPTIONS = OUTCOMES.map((one) => ({
  value: one,
  title: one,
  description: one === "Passed" ? "The document is real and the selfie matches it." : one === "Failed" ? "The document could not be matched to you." : "A photo was too blurred or cut off to read.",
}));
const CONFIRMER_OPTIONS = CONFIRMERS.map((one) => ({
  value: one,
  title: one === "p-sureel" ? "Sureel" : partyName(one),
  description:
    one === "p-sureel"
      ? "Sureel's rights ops check the claim against your ID and any evidence — a few working days. For an entry no label of yours works on in Revelator Pro."
      : "Your label confirms it from Revelator Pro — usually within a day.",
}));

/** A file "sent": it climbs to landed in under a second and never leaves the browser. */
const simulated: UploadSend = (file, report, signal) =>
  new Promise((resolve, reject) => {
    let at = 0;
    const tick = window.setInterval(() => {
      at += 25;
      report(Math.min(at, 100));
      if (at >= 100) {
        window.clearInterval(tick);
        resolve({ previewUrl: URL.createObjectURL(file) });
      }
    }, 120);
    signal.addEventListener("abort", () => {
      window.clearInterval(tick);
      reject(new DOMException("Cancelled", "AbortError"));
    });
  });

// ---------------------------------------------------------------------------------------------
// The ID check — shared by the sign-up and by re-verifying from Profile

/** What the simulated check reads at each part of its run. */
const READINGS = ["Reading the document", "Matching your selfie to the photo", "Checking that the selfie is live"] as const;

interface Run {
  running: boolean;
  progress: number;
  document?: IdDocument;
  outcome?: IdOutcome;
}

/**
 * One ID check WALKED: three photos landed, a run of a few seconds, an outcome recorded on the
 * person. Held above the stages, so going back to retake a photo keeps the others.
 */
export function useIdCheck(person: () => string | undefined) {
  const front = useUpload({ send: simulated });
  const back = useUpload({ send: simulated });
  const selfie = useUpload({ send: simulated });
  const [run, setRun] = useState<Run>({ running: false, progress: 0 });
  const [chosen, setChosen] = useState<IdOutcome>("Passed");
  // One run, one record: a render between the last tick and the outcome must not record it twice.
  const recorded = useRef(false);

  useEffect(() => {
    if (!run.running) return;
    const tick = window.setInterval(() => {
      setRun((now) => {
        if (now.progress < 100) return { ...now, progress: Math.min(now.progress + 10, 100) };
        return now;
      });
    }, 250);
    return () => window.clearInterval(tick);
  }, [run.running]);

  useEffect(() => {
    if (!run.running || run.progress < 100 || recorded.current) return;
    recorded.current = true;
    const id = person();
    // A photo too blurred to read is not a result: nothing is recorded, and it is taken again.
    if (id && run.document && chosen !== "Needs another photo") recordCheck(id, { document: run.document, outcome: chosen });
    setRun((now) => ({ ...now, running: false, outcome: chosen }));
  }, [run.running, run.progress, run.document, chosen, person]);

  const photosIn = (document: string) => front.phase === "landed" && (document === "Passport" || back.phase === "landed") && selfie.phase === "landed";
  return {
    front,
    back,
    selfie,
    run,
    photosIn,
    start: (document: IdDocument, outcome: IdOutcome) => {
      setChosen(outcome);
      recorded.current = false;
      setRun({ running: true, progress: 0, document });
    },
    /** Another photo, asked for: the front is taken out to be taken again; the run starts over. */
    retake: () => {
      front.onRemove();
      setRun({ running: false, progress: 0 });
    },
  };
}
export type IdCheckRun = ReturnType<typeof useIdCheck>;

/** The document, its photos and the selfie — and, in this prototype, what the check will say. */
export function IdPhotos({ check, optional }: { check: IdCheckRun; optional?: boolean }) {
  const when = useAnswer("when");
  const document = useAnswer("document");
  const later = optional && when === "Later";
  return (
    <WizardSection>
      <WizardSectionHeader title="ID photos" />
      <WizardSectionBody>
        {optional ? (
          <WizardRow title="When">
            <WizardRowBody>
              <Field as="choice" name="when" label="ID check" options={WHEN_OPTIONS} />
            </WizardRowBody>
            <WizardRowTips>
              <WizardRowTip term="Verified + ID">The level Sureel and the labels ask for before your voice or likeness can be licensed — see Profile › Identity & verification.</WizardRowTip>
            </WizardRowTips>
          </WizardRow>
        ) : null}
        {later ? null : (
          <>
            <WizardRow title="Document">
              <WizardRowBody>
                <Field as="choice" name="document" label="Document" options={DOCUMENT_OPTIONS} />
              </WizardRowBody>
              <WizardRowTips>
                <WizardRowTip>Government-issued and in date. The photos are used for this check only, then deleted; Sureel keeps the result, never the images.</WizardRowTip>
              </WizardRowTips>
            </WizardRow>
            <WizardRow title="Photos">
              <WizardRowBody>
                <UploaderArtwork {...check.front} prompt={document === "Passport" ? "The passport's photo page" : "The front of the card"} />
                {document === "Passport" ? null : <UploaderArtwork {...check.back} prompt="The back of the card" />}
              </WizardRowBody>
              <WizardRowTips>
                <WizardRowTip>Flat, in good light, every corner in the frame and nothing over the text.</WizardRowTip>
              </WizardRowTips>
            </WizardRow>
            <WizardRow title="Selfie">
              <WizardRowBody>
                <UploaderAvatar {...check.selfie} prompt="A live selfie: face the camera, then turn your head slowly" />
              </WizardRowBody>
              <WizardRowTips>
                <WizardRowTip term="Liveness">The check compares the selfie with the document's photo and that it was taken now, by a person — not a photo of a photo.</WizardRowTip>
              </WizardRowTips>
            </WizardRow>
            <WizardRow title="Prototype">
              <WizardRowBody>
                <Field as="choice" name="outcome" label="What the check returns" options={OUTCOME_OPTIONS} help="Nothing is sent anywhere: pick the outcome to see each path." />
              </WizardRowBody>
            </WizardRow>
          </>
        )}
      </WizardSectionBody>
    </WizardSection>
  );
}

/** The run, then its outcome — another photo sends the reader back to the photos. */
export function IdResult({ check, onRetake, skipped }: { check: IdCheckRun; onRetake: () => void; skipped?: boolean }) {
  const { run } = check;
  const reading = READINGS[Math.min(Math.floor(run.progress / 34), READINGS.length - 1)]!;
  return (
    <WizardSection>
      <WizardSectionHeader title="ID check" />
      <WizardSectionBody>
        <WizardRow title="Result">
          <WizardRowBody>
            {skipped ? (
              <Alert intent="info" title="Left for later">
                Your ArtistID stays Basic until a label or Sureel confirms one of your claims. Check your ID any time from Profile › Identity & verification to reach Verified + ID.
              </Alert>
            ) : run.running || !run.outcome ? (
              <Progress label={`Checking your ${run.document?.toLowerCase() ?? "ID"}`} reading={reading} value={run.progress} />
            ) : run.outcome === "Passed" ? (
              <Alert intent="success" title="Your ID checks out">
                {`Your ${run.document?.toLowerCase()} matches your selfie. Once a label or Sureel confirms a claim, your ArtistID is Verified + ID.`}
              </Alert>
            ) : run.outcome === "Needs another photo" ? (
              <Alert intent="warn" title="We need another photo">
                {`The photo of your ${run.document?.toLowerCase()} was too blurred to read. `}
                <Button variant="inline" onClick={() => {
                    check.retake();
                    onRetake();
                  }}>
                  Take it again
                </Button>
              </Alert>
            ) : (
              <Alert intent="danger" title="We could not verify your ID">
                Your ArtistID stays Basic. You can go on and claim your profiles — a label or Sureel can still confirm them — and try the check again from Profile › Identity & verification.
              </Alert>
            )}
          </WizardRowBody>
          <WizardRowTips>
            <WizardRowTip term="Passed">Recorded on your ArtistID with the document type and the time — never the images.</WizardRowTip>
            <WizardRowTip term="Needs another photo">Nothing is recorded; retake the photo and the check runs again.</WizardRowTip>
            <WizardRowTip term="Failed">Recorded as failed. It does not stop you claiming, but you cannot reach Verified + ID until a check passes.</WizardRowTip>
          </WizardRowTips>
        </WizardRow>
      </WizardSectionBody>
    </WizardSection>
  );
}

/** Whether the result stage can go on: the run is over, and it did not ask for another photo. */
export const settled = (check: IdCheckRun) => !check.run.running && check.run.outcome !== undefined && check.run.outcome !== "Needs another photo";

// ---------------------------------------------------------------------------------------------
// A delegate's own way in — the invitation the artist sent

/** An invitation waiting in Mira's Delegates — so a reviewer can walk the delegate path. */
const SEEDED: Delegate = {
  id: "dl-2",
  for: "p-mira",
  name: "Sam Okoro",
  email: "sam@okorolegal.example",
  role: "Lawyer",
  scope: ["Licence requests"],
  since: new Date(2026, 9, 18),
  state: "Invited",
};
if (!DELEGATES.some((one) => one.id === SEEDED.id)) DELEGATES.push(SEEDED);

const invitationFor = (email: string | undefined) =>
  email ? DELEGATES.find((one) => one.state === "Invited" && one.email.toLowerCase() === email.trim().toLowerCase()) : undefined;

function Invitation() {
  const email = useAnswer("invited");
  const invite = invitationFor(typeof email === "string" ? email : undefined);
  return (
    <WizardSection>
      <WizardSectionHeader title="Invitation" />
      <WizardSectionBody>
        <WizardRow title="Your invitation">
          <WizardRowBody>
            <Field
              as="email"
              name="invited"
              label="Email the invitation went to"
              help="In this prototype, Mira Castellanos has invited sam@okorolegal.example."
            />
            {invite ? (
              <Alert intent="info" title={`${partyName(invite.for)} invited you as ${invite.role.toLowerCase()}`}>
                {`You may approve ${(formatList(invite.scope) ?? "nothing").toLowerCase()} for her, and nothing else: her credits, Voice/NIL and AI opt-out stay hers. Prototype: the code sent to ${invite.email} is ${CODE}.`}
              </Alert>
            ) : typeof email === "string" && email.includes("@") ? (
              <Alert intent="warn" title="No invitation for this address">
                Ask the artist to invite you from Profile › Delegates in their app, choosing what you may approve. You cannot sign up on their behalf.
              </Alert>
            ) : null}
            {invite ? <Field as="text" name="inviteCode" label="Code" /> : null}
          </WizardRowBody>
          <WizardRowTips>
            <WizardRowTip>An ArtistID is the artist's own: it signs their credits and their consent. A delegate holds an account of their own that acts for them inside the scope they gave.</WizardRowTip>
          </WizardRowTips>
        </WizardRow>
      </WizardSectionBody>
    </WizardSection>
  );
}

// ---------------------------------------------------------------------------------------------
// The sign-up

function You() {
  const role = useAnswer("role");
  const by = useAnswer("by");
  const delegate = role === "Delegate";
  return (
    <WizardSection>
      <WizardSectionHeader title="You" />
      <WizardSectionBody>
        <WizardRow title="Who you are">
          <WizardRowBody>
            <Field as="choice" name="role" label="You are" options={ROLE_OPTIONS} />
            <Field as="text" name="name" label="Your name" help={delegate ? undefined : "As you are credited. Your profiles in the graph are found by it."} />
          </WizardRowBody>
          <WizardRowTips>
            <WizardRowTip term="Writer">Writer mode adds Works and Societies to the app.</WizardRowTip>
            <WizardRowTip term="Acting for an artist">A delegate cannot sign up for the artist or verify their identity. The artist invites you, and you accept here.</WizardRowTip>
          </WizardRowTips>
        </WizardRow>
        {delegate ? (
          <WizardRow title="Acting for an artist">
            <WizardRowBody>
              <Alert intent="info" title="Your own account, by invitation">
                The artist signs up and verifies themself. You get an account of your own that acts for them, inside what they let you approve — next, find the invitation they sent you.
              </Alert>
            </WizardRowBody>
          </WizardRow>
        ) : (
          <WizardRow title="How you sign in">
            <WizardRowBody>
              <Field as="choice" name="by" label="Sign in with" options={SIGN_IN_OPTIONS} />
              {by === "Phone" ? <Field as="phone" name="phone" label="Phone" /> : <Field as="email" name="email" label="Email" />}
            </WizardRowBody>
            <WizardRowTips>
              <WizardRowTip>Either proves you hold it, with a one-time code. You can add the other later.</WizardRowTip>
            </WizardRowTips>
          </WizardRow>
        )}
      </WizardSectionBody>
    </WizardSection>
  );
}

function SignInCode() {
  const by = useAnswer("by");
  const email = useAnswer("email");
  const phone = useAnswer("phone");
  const to = String((by === "Phone" ? phone : email) ?? "");
  return (
    <WizardSection>
      <WizardSectionHeader title="Sign-in code" />
      <WizardSectionBody>
        <WizardRow title="Code">
          <WizardRowBody>
            <Alert intent="info" title={`A code was sent to ${to}`}>
              {`Prototype: nothing was sent. Your code is ${CODE}.`}
            </Alert>
            <Field as="text" name="code" label="Six-digit code" help="It expires in ten minutes." />
          </WizardRowBody>
          <WizardRowTips>
            <WizardRowTip term="Basic">The code proves the address is yours. Continuing creates your ArtistID at Basic — enough to see your profile, not to sign anything.</WizardRowTip>
          </WizardRowTips>
        </WizardRow>
      </WizardSectionBody>
    </WizardSection>
  );
}

function Profiles({ person, evidence, onEvidence: setEvidence }: { person: string | undefined; evidence: File | null; onEvidence: (file: File | null) => void }) {
  const confirmer = useAnswer("confirmer");
  const options = claimable(person).map((one) => ({
    value: one.id,
    title: one.name,
    code: one.isni ?? one.ipi,
  }));
  return (
    <WizardSection>
      <WizardSectionHeader title="Profiles" />
      <WizardSectionBody>
        <WizardRow title="You, in the graph">
          <WizardRowBody>
            <Field
              as="record"
              name="profiles"
              label="Your artist and writer entries"
              entity="person"
              noun={{ one: "entry", many: "entries" }}
              several
              options={options}
              help="Search by name, IPI or ISNI — try Brightwater. Leave it empty to claim later."
            />
          </WizardRowBody>
          <WizardRowTips>
            <WizardRowTip term="Artist entry">How a label's deliveries name you on recordings, with your ISNI where it is known.</WizardRowTip>
            <WizardRowTip term="Writer entry">How societies name you on works, with your IPI.</WizardRowTip>
            <WizardRowTip>An entry another ArtistID already holds is not offered. If it is you, Sureel resolves it — write to them from Help.</WizardRowTip>
          </WizardRowTips>
        </WizardRow>
        <WizardRow title="Who confirms">
          <WizardRowBody>
            <Field as="choice" name="confirmer" label="Confirmed by" options={CONFIRMER_OPTIONS} />
            {confirmer === "p-sureel" ? (
              <UploaderDocument multiple={false} noun={{ one: "piece of evidence", many: "pieces of evidence" }} onSelect={(files) => setEvidence(files[0] ?? null)}>
                {evidence ? <UploaderFileRow name={evidence.name} phase="landed" fileSize={evidence.size} onRemove={() => setEvidence(null)} /> : null}
              </UploaderDocument>
            ) : null}
          </WizardRowBody>
          <WizardRowTips>
            <WizardRowTip term="Your label">It knows you: it signed you. It confirms in its Requests inbox, and your profile reads verified the moment it does.</WizardRowTip>
            <WizardRowTip term="Sureel">For an entry no label of yours confirms. A contract, a society statement or a release credit helps it decide faster.</WizardRowTip>
          </WizardRowTips>
        </WizardRow>
      </WizardSectionBody>
    </WizardSection>
  );
}

/**
 * The persona the sign-up is read as rides the address, as the map wrote it. The draft's `role`
 * decides which path the stages follow, so it is lifted to the page as it is answered.
 */
function FollowRole({ onRole }: { onRole: (role: string) => void }) {
  const role = useAnswer("role");
  useEffect(() => onRole(typeof role === "string" ? role : ""), [role, onRole]);
  return null;
}

export function SignUp() {
  const [stage, setStage] = useState(0);
  const [role, setRole] = useState("");
  const [person, setPerson] = useState<string>();
  // The evidence for Sureel is a file, held beside the answers: a file is not an answer.
  const [evidence, setEvidence] = useState<File | null>(null);
  const check = useIdCheck(() => person);
  const delegate = role === "Delegate";
  const stages = delegate ? DELEGATE_STAGES : STAGES;
  const leave = () => go(href("home", "personas"));

  return (
    <Wizard
      verb={delegate ? "Accept" : "Create"}
      noun={delegate ? { one: "invitation", many: "invitations" } : { one: "ArtistID", many: "ArtistIDs" }}
      note={
        delegate
          ? "A manager or lawyer accepts the artist's invitation: an account of your own that acts for them, inside the scope they chose."
          : "Prove your email or phone, check your ID, then claim the artist and writer entries in the graph that are you. A label or Sureel confirms each claim, and your profile then reads verified."
      }
      onExit={leave}
      stages={stages}
      stage={stage}
      onStage={(to) => {
        // Back to the first stage only before the ArtistID exists: once made, it is not made again.
        if (!(person && to < 2)) setStage(to);
      }}
      subject={(answers) => ({ kind: "person", name: String(answers.name ?? ""), meta: [String(answers.role ?? "")].filter(Boolean) })}
      draft={{
        role: owed(""),
        name: owed.text,
        by: owed("Email" as string),
        email: owed.email,
        phone: owed.phone,
        code: owed.text,
        invited: owed.email,
        inviteCode: owed.text,
        when: owed("Now" as string),
        document: owed("Passport"),
        outcome: owed("Passed"),
        profiles: [] as readonly string[],
        confirmer: owed("p-kestrel" as string),
      }}
      ready={(answers) => {
        if (delegate && stage === 1) return Boolean(invitationFor(String(answers.invited ?? ""))) && String(answers.inviteCode ?? "").replace(/\s/g, "") === CODE;
        if (stage === 1) return String(answers.code ?? "").replace(/\s/g, "") === CODE;
        if (stage === 2) return answers.when === "Later" || check.photosIn(String(answers.document ?? ""));
        if (stage === 3) return answers.when === "Later" || settled(check);
        return true;
      }}
      onCommit={(answers) => {
        if (delegate) {
          if (stage === 0) return setStage(1);
          const invite = invitationFor(answers.invited)!;
          invite.state = "Active";
          createAccount({
            name: answers.name.trim(),
            role: "Delegate",
            signIn: "Email",
            contact: invite.email,
            delegateFor: { artist: invite.for, invitation: invite.id, scope: invite.scope },
          });
          return go(artistHref("home"));
        }
        if (stage === 0) return setStage(1);
        if (stage === 1) {
          // The contact is proved: the ArtistID exists from here, at Basic.
          setPerson(
            createAccount({
              name: answers.name.trim(),
              role: answers.role as Role,
              signIn: answers.by === "Phone" ? "Phone" : "Email",
              contact: answers.by === "Phone" ? answers.phone : answers.email,
            }),
          );
          go(artistHref("sign-up"));
          return setStage(2);
        }
        if (stage === 2) {
          if (answers.when !== "Later") check.start(answers.document as IdDocument, answers.outcome as IdOutcome);
          return setStage(3);
        }
        if (stage === 3) return setStage(4);
        if (person && answers.profiles.length) claimEntries(person, answers.profiles, answers.confirmer, answers.confirmer === "p-sureel" ? evidence?.name : undefined);
        go(artistHref("profile"));
      }}
    >
      <FollowRole onRole={setRole} />
      {stage === 0 ? <You /> : null}
      {stage === 1 && delegate ? <Invitation /> : null}
      {stage === 1 && !delegate ? <SignInCode /> : null}
      {stage === 2 ? <IdPhotos check={check} optional /> : null}
      {stage === 3 ? <IdCheckStage check={check} onRetake={() => setStage(2)} /> : null}
      {stage === 4 ? <Profiles person={person} evidence={evidence} onEvidence={setEvidence} /> : null}
    </Wizard>
  );
}

function IdCheckStage({ check, onRetake }: { check: IdCheckRun; onRetake: () => void }) {
  return <IdResult check={check} onRetake={onRetake} skipped={useAnswer("when") === "Later"} />;
}

/** Re-verify, or upgrade to Verified + ID, from Profile — the same check, on its own. */
export function VerifyIdentity({ person, upgrading }: { person: string; upgrading: boolean }) {
  const [stage, setStage] = useState(0);
  const check = useIdCheck(() => person);
  const leave = () => go(artistHref("profile"));
  return (
    <Wizard
      verb={upgrading ? "Upgrade" : "Re-verify"}
      noun={{ one: "identity", many: "identities" }}
      note="A government ID matched to a live selfie. The result is recorded on your ArtistID; the photos are deleted once it is read."
      onExit={leave}
      stages={["ID photos", "ID check"]}
      stage={stage}
      onStage={setStage}
      subject={{ kind: "person", name: partyName(person), meta: ["ArtistID"] }}
      draft={{ document: owed("Passport"), outcome: owed("Passed") }}
      ready={(answers) => (stage === 0 ? check.photosIn(String(answers.document ?? "")) : settled(check))}
      onCommit={(answers) => {
        if (stage === 0) {
          check.start(answers.document as IdDocument, answers.outcome as IdOutcome);
          return setStage(1);
        }
        leave();
      }}
    >
      {stage === 0 ? <IdPhotos check={check} /> : <IdResult check={check} onRetake={() => setStage(0)} />}
    </Wizard>
  );
}
