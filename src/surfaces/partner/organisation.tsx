import {
  Alert,
  Avatar,
  Badge,
  Button,
  Chip,
  DetailPage,
  EmptyState,
  FactCard,
  Field,
  Metadata,
  Slot,
  TitledCard,
  Wizard,
  WizardRow,
  WizardRowBody,
  WizardRowTip,
  WizardRowTips,
  WizardSection,
  WizardSectionBody,
  WizardSectionHeader,
  formatMeta,
  owed,
  unanswered,
} from "@revelator/pro-ui";

import { TODAY, WORLD } from "../../graph/fixtures";
import { USES, type Partner, type Use } from "../../graph/model";
import { TerritoryChip, decidedBy, partyMark } from "../../rights/kit";
import { go } from "../../route";
import { TERMS_VERSION, applicationOf, isoOf, keysOf, standingOf, submitApplication, type Application, type Contact } from "./data";
import { partnerHref, type PartnerPage, type Working } from "./working";

const KINDS: readonly Partner["kind"][] = ["AI platform", "DSP", "UGC platform", "Society"];
const choices = (values: readonly string[]) => values.map((value) => ({ value, title: value }));

/** A country, as the flag it flies and its name — the way a country is drawn wherever it is a value. */
const country = (named: string) => (
  <Chip>
    <Avatar kind="place" name={named} />
    {named}
  </Chip>
);

/**
 * The organisation, as Sureel knows it — the application it was approved on (S6-1): who it is,
 * who Sureel writes to, the uses and territories it asked for, the terms it accepted, and who
 * approved it. An invited partner that has not applied lands on the way in; one waiting on Sureel
 * sees that it is waiting, and that the approval is not theirs to give.
 */
export function Organisation({ working }: { working: Working }) {
  const partner = working.partner;
  const application = applicationOf(partner.id);
  const approved = application?.approved;
  const keys = keysOf(partner.id);

  return (
    <DetailPage
      record={{
        mark: partyMark(partner.id),
        name: application?.legalName ?? partner.name,
        status: approved ? "approval:Approved" : application?.submitted ? "approval:Not Approved" : `account:${standingOf(partner.id)}`,
        facts: [{ text: partner.kind }, ...(application?.submitted ? [{ as: "date" as const, value: application.submitted, label: "Applied" }] : [])],
        actions: application?.submitted
          ? []
          : [{ label: "Start onboarding", primary: true, opens: partnerHref("organisation", "apply") }],
        more: [
          approved
            ? { label: "Edit application", unavailable: "An approved application changes through Sureel: write to partners@sureel.example." }
            : application?.submitted
              ? { label: "Edit application", opens: partnerHref("organisation", "apply") }
              : { label: "Edit application", unavailable: "Nothing has been submitted yet." },
          // G-5: the approval is Sureel's act, never the partner's — shown, and refused, here.
          { label: "Approve application", unavailable: "Only Sureel rights ops approves an application, in the Graph Console." },
        ],
      }}
    >
      {application?.submitted ? (
        <Metadata>
          {approved ? null : (
            <Alert intent="info" title="With Sureel for review">
              Sureel reviews an application within two working days. Sandbox and production keys are issued the moment it is approved.
            </Alert>
          )}
          <FactCard
            title="Organisation"
            facts={[
              { label: "Legal name", value: application.legalName },
              { label: "Kind", value: application.kind },
              { label: "Country", value: country(application.country) },
              { label: "Website", value: application.website },
            ]}
          />
          <FactCard
            title="Contacts"
            facts={application.contacts.flatMap((one) => [
              { label: one.role, value: one.name },
              { label: `${one.role} email`, value: one.email },
            ])}
          />
          <FactCard
            title="Uses and territories"
            facts={[
              { label: "Use types", as: "list", value: application.uses.length ? application.uses : ["Registrations and claims only"] },
              { label: "Territories", value: <TerritoryChip set={application.territories} /> },
            ]}
          />
          <FactCard
            title="Terms"
            facts={[
              { label: "Partner terms", value: <Badge status={application.terms ? "terms:Agreed" : "terms:Not Agreed"} /> },
              { label: "Version", value: application.terms?.version },
              { label: "Accepted by", value: application.terms?.by },
              { label: "Accepted", as: "date", value: application.terms?.at ?? null, grain: "minute" },
            ]}
          />
          <FactCard
            title="Approval"
            facts={[
              { label: "Status", value: <Badge status={approved ? "approval:Approved" : "approval:Not Approved"} /> },
              // G-5: who decided, on whose behalf, under what, when.
              { label: "Decided by", value: approved ? decidedBy(approved) : "Waiting on Sureel rights ops" },
              { label: "Keys issued", value: keys.length ? formatMeta(keys.map((one) => one.env)) : "None until approved" },
            ]}
          />
        </Metadata>
      ) : (
        <TitledCard title="Application">
          <Slot layout="empty">
            <EmptyState
              title="Tell Sureel who you are"
              detail="Your organisation, its contacts, the uses and territories you need, and the partner terms. Keys follow Sureel's approval."
            >
              <Button asChild>
                <a href={partnerHref("organisation", "apply")}>Start onboarding</a>
              </Button>
            </EmptyState>
          </Slot>
        </TitledCard>
      )}
    </DetailPage>
  );
}

const contactOf = (application: Application | undefined, role: Contact["role"]) => application?.contacts.find((one) => one.role === role);

/**
 * Onboarding (S6-1) — one flow: the organisation, who Sureel writes to, what it will use and
 * where, and the terms. Submitting does not issue a key: Sureel approves first, and the keys
 * follow the approval. A WIZARD, because the five parts are one application, answered in any
 * order and sent once.
 */
export function OnboardingWizard({ working }: { working: Working }) {
  const partner = working.partner;
  const begun = applicationOf(partner.id);
  const editing = Boolean(begun?.submitted);
  const leave = () => go(partnerHref("organisation"));
  const business = contactOf(begun, "Business");
  const technical = contactOf(begun, "Technical");
  const selected = begun && begun.territories.include !== "World" ? begun.territories.include : [];

  const draft = {
    legalName: owed(begun?.legalName ?? partner.name),
    kind: owed(begun?.kind ?? partner.kind),
    country: owed(begun?.country ?? ""),
    website: begun?.website ?? unanswered.url,
    businessName: owed(business?.name ?? working.user.name),
    businessEmail: owed(business?.email ?? working.user.email),
    technicalName: technical?.name ?? unanswered.text,
    technicalEmail: technical?.email ?? unanswered.email,
    uses: owed((begun?.uses ?? partner.uses) as readonly string[]),
    reach: owed(selected.length ? "Selected territories" : "Worldwide"),
    territories: selected as readonly string[],
    terms: owed.choices,
  };

  return (
    <Wizard
      noun={{ one: "application", many: "applications" }}
      {...(editing ? { editing: true as const } : { verb: "Submit" })}
      note="Sureel reviews every partner before a key is issued. Submit once: your sandbox and production keys follow the approval."
      onExit={leave}
      subject={(answers) => ({ kind: "organization", name: answers.legalName || partner.name, meta: [answers.kind || partner.kind] })}
      draft={draft}
      ready={(answers) => answers.reach !== "Selected territories" || answers.territories.length > 0}
      onCommit={(answers) => {
        const contacts: Contact[] = [{ role: "Business", name: answers.businessName.trim(), email: answers.businessEmail.trim() }];
        if (answers.technicalName && answers.technicalEmail)
          contacts.push({ role: "Technical", name: answers.technicalName.trim(), email: answers.technicalEmail.trim() });
        submitApplication(partner.id, {
          legalName: answers.legalName.trim(),
          kind: answers.kind as Partner["kind"],
          country: answers.country,
          website: answers.website,
          contacts,
          uses: answers.uses as readonly Use[],
          territories: answers.reach === "Worldwide" ? WORLD : { include: answers.territories.map(isoOf) },
          terms: { version: TERMS_VERSION, by: answers.businessName.trim(), at: TODAY },
          submitted: TODAY,
        });
        go(partnerHref("organisation"));
      }}
    >
      <WizardSection>
        <WizardSectionHeader title="Organisation" />
        <WizardSectionBody>
          <WizardRow title="Who you are">
            <WizardRowBody>
              <Field as="text" name="legalName" label="Legal name" />
              <Field as="choice" name="kind" label="Kind of partner" noun={{ one: "kind", many: "kinds" }} options={choices(KINDS)} />
              <Field as="country" name="country" label="Country of incorporation" />
              <Field as="url" name="website" label="Website" />
            </WizardRowBody>
            <WizardRowTips>
              <WizardRowTip>The legal name is the one the partner terms are signed in, and the one every receipt you are issued names.</WizardRowTip>
            </WizardRowTips>
          </WizardRow>
        </WizardSectionBody>
      </WizardSection>

      <WizardSection>
        <WizardSectionHeader title="Contacts" />
        <WizardSectionBody>
          <WizardRow title="Business contact">
            <WizardRowBody>
              <Field as="text" name="businessName" label="Name" />
              <Field as="email" name="businessEmail" label="Email" />
            </WizardRowBody>
            <WizardRowTips>
              <WizardRowTip>Licence decisions, paused and revoked licences and the terms are written to them.</WizardRowTip>
            </WizardRowTips>
          </WizardRow>
          <WizardRow title="Technical contact">
            <WizardRowBody>
              <Field as="text" name="technicalName" label="Name" />
              <Field as="email" name="technicalEmail" label="Email" help="Key rotations and failing webhooks are written to them." />
            </WizardRowBody>
          </WizardRow>
        </WizardSectionBody>
      </WizardSection>

      <WizardSection>
        <WizardSectionHeader title="Uses and territories" />
        <WizardSectionBody>
          <WizardRow title="Use types">
            <WizardRowBody>
              <Field as="choices" name="uses" label="Use types" options={choices(USES)} />
            </WizardRowBody>
            <WizardRowTips>
              <WizardRowTip term="AI training">Every other AI use depends on it: ask for it with them.</WizardRowTip>
              <WizardRowTip term="Voice/NIL">Answered by the artist first, wherever their label also has a say.</WizardRowTip>
            </WizardRowTips>
          </WizardRow>
          <WizardRow title="Territories">
            <WizardRowBody>
              <Field
                as="choice"
                name="reach"
                label="Where you will use it"
                options={[
                  { value: "Worldwide", title: "Worldwide", description: "Every country." },
                  { value: "Selected territories", title: "Selected territories", description: "Only the countries you name." },
                ]}
              />
              <Field as="country" name="territories" label="Territories" several noun={{ one: "territory", many: "territories" }} help="Only where you chose selected territories." />
            </WizardRowBody>
          </WizardRow>
        </WizardSectionBody>
      </WizardSection>

      <WizardSection>
        <WizardSectionHeader title="Terms" />
        <WizardSectionBody>
          <WizardRow title="Partner terms">
            <WizardRowBody>
              <Field
                as="choices"
                name="terms"
                label="Partner terms"
                options={[{ value: TERMS_VERSION, title: `I accept the ${TERMS_VERSION}` }]}
                notice="Accepted on behalf of the organisation, by the business contact."
              />
            </WizardRowBody>
            <WizardRowTips>
              <WizardRowTip>Receipts are evidence you keep. A receipt you alter no longer verifies.</WizardRowTip>
            </WizardRowTips>
          </WizardRow>
        </WizardSectionBody>
      </WizardSection>
    </Wizard>
  );
}

export const ORGANISATION_PAGES: Record<string, PartnerPage> = {
  organisation: ([form], working) =>
    form === "apply"
      ? { cover: <OnboardingWizard key={working.partner.id} working={working} /> }
      : { place: { at: "Organisation" }, page: <Organisation working={working} /> },
};
