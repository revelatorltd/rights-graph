import {
  Badge,
  Field,
  FormDialog,
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  Slot,
  SlotItem,
  Text,
  formatDate,
  formatMeta,
  owed,
  useAnswer,
  type HeldBy,
} from "@revelator/pro-ui";

import { GRANTS, PARTNERS, partyName } from "../../../graph/fixtures";
import type { Asset } from "../../../graph/model";
import { territoryLabel } from "../../../graph/resolve";
import {
  COUNTRIES,
  DEFAULTS,
  DEPENDENCY_REASON,
  applyDefaults,
  defaultGrants,
  hasReleaseGrants,
  isNew,
  labelReleases,
  reachOf,
  setDefaults,
  type ReleaseDefaults,
} from "./data";

const ON_OFF = [
  { value: "Allowed", title: "Allowed" },
  { value: "Off", title: "Off" },
];
const REACH = [
  { value: "World", title: "Worldwide" },
  { value: "Only", title: "Only in" },
  { value: "Except", title: "All except" },
];

/**
 * Whether training is off — and with it every use that depends on it (S1-6), whose rows then say
 * why in place of their answer.
 */
const useTrainingOff = () => useAnswer("training") === "Off";

function DerivativeRow() {
  const off = useTrainingOff();
  return (
    <SettingsRow title="AI derivative" description={off ? DEPENDENCY_REASON : "New works made from the release's recordings."}>
      {off ? <Badge status="clearance:Denied" /> : <Field as="choice" name="derivative" label="AI derivative" options={ON_OFF} />}
    </SettingsRow>
  );
}

function VoiceNilRow() {
  const off = useTrainingOff();
  return (
    <SettingsRow
      title="Voice/NIL"
      description={off ? DEPENDENCY_REASON : "Allowed here only starts it: the artist confirms, or the label attests under its agreement."}
    >
      {off ? <Badge status="clearance:Denied" /> : <Field as="choice" name="voice" label="Voice/NIL" options={ON_OFF} />}
    </SettingsRow>
  );
}

function StreamingRow() {
  const off = useTrainingOff();
  return (
    <SettingsRow title="AI streaming" description={off ? DEPENDENCY_REASON : "Adaptive or generated playback of the recordings."}>
      {off ? <Badge status="clearance:Denied" /> : <Field as="choice" name="streaming" label="AI streaming" options={ON_OFF} />}
    </SettingsRow>
  );
}

/** The partners training is allowed for, asked only where it is allowed. */
function TrainingPartnersRow() {
  const training = useAnswer("training");
  if (training === "Off") return null;
  return (
    <SettingsRow title="Partners" description="Training is allowed for these partners only; every other partner asks.">
      <Field
        as="record"
        name="trainingPartners"
        label="Partners"
        entity="organization"
        noun={{ one: "partner", many: "partners" }}
        several
        options={PARTNERS.filter((one) => one.kind === "AI platform").map((one) => ({ value: one.id, title: one.name }))}
      />
    </SettingsRow>
  );
}

function CodesRow() {
  const reach = useAnswer("reach");
  if (reach === "World") return null;
  return (
    <SettingsRow
      title="Countries"
      description={reach === "Only" ? "The defaults apply only in these." : "The defaults apply everywhere but these."}
    >
      <Field as="choices" name="codes" label="Countries" options={COUNTRIES.map((code) => ({ value: code, title: code }))} />
    </SettingsRow>
  );
}

/** What applying the defaults to a release writes — each grant, said in a line. */
const writesFor = (release: Asset) =>
  defaultGrants(release.id).map(
    (one) =>
      formatMeta([
        `${one.use}: ${one.effect === "Grant" ? "granted" : "denied"}`,
        one.partners.mode === "Allowlist" ? `for ${one.partners.ids.map(partyName).join(", ")}` : "every partner",
        territoryLabel(one.territory),
      ]) ?? "",
  );

/**
 * The moment a release is created, its consents start from the defaults (F1 step 2). Release
 * creation is the catalogue's; here the label applies them to a new release that has none yet —
 * one release-level grant per AI use, each saying it came from the defaults.
 */
function ApplyDefaults({ release, ...held }: HeldBy & { release: Asset }) {
  return (
    <FormDialog {...held} confirm="Apply" draft={{}} onCommit={() => applyDefaults(release.id)}>
      <Slot layout="list">
        {writesFor(release).map((line) => (
          <SlotItem key={line}>
            <Text>{line}</Text>
          </SlotItem>
        ))}
      </Slot>
    </FormDialog>
  );
}

/**
 * Defaults for new releases (S1-11): the AI consent a release starts from when it is created —
 * training for named partners, the uses that depend on it, and where. A SETTINGS PAGE: one form,
 * saved together; the dependent uses cannot be allowed while training is off, and say why.
 *
 * Under them, the label's new releases and whether each started from them yet — Harbour Lights,
 * created on Oct 19 and out on Oct 30, is F1's.
 */
export function ReleaseDefaultsPage() {
  const fresh = labelReleases().filter(isNew);
  const pending = fresh.filter((one) => !hasReleaseGrants(one.id));
  const set: ReleaseDefaults = DEFAULTS;
  const reach = set.territory.include === "World" ? (set.territory.exclude?.length ? "Except" : "World") : "Only";
  const codes = set.territory.include === "World" ? (set.territory.exclude ?? []) : set.territory.include;
  return (
    <SettingsPage
      title="Release defaults"
      actions={pending.map((one) => ({ label: `Apply to ${one.title}`, dialog: <ApplyDefaults release={one} /> }))}
    >
      <SettingsForm
        draft={{
          training: owed(set.training),
          trainingPartners: set.trainingPartners,
          derivative: owed(set.derivative),
          voice: owed(set.voice),
          streaming: owed(set.streaming),
          reach: owed(reach),
          codes,
        }}
        onSave={(draft) =>
          setDefaults({
            training: draft.training as ReleaseDefaults["training"],
            trainingPartners: draft.trainingPartners,
            derivative: draft.derivative as ReleaseDefaults["derivative"],
            voice: draft.voice as ReleaseDefaults["voice"],
            streaming: draft.streaming as ReleaseDefaults["streaming"],
            territory: reachOf(draft.reach, draft.codes),
          })
        }
      >
        <SettingsGroup title="AI training" description="Every AI use defaults to deny; training is the one the others depend on.">
          <SettingsRow title="AI training" description="Whether a new release can be used to train models.">
            <Field as="choice" name="training" label="AI training" options={ON_OFF} />
          </SettingsRow>
          <TrainingPartnersRow />
        </SettingsGroup>
        <SettingsGroup title="Uses that depend on training">
          <DerivativeRow />
          <VoiceNilRow />
          <StreamingRow />
        </SettingsGroup>
        <SettingsGroup title="Territory">
          <SettingsRow title="Where" description="Where the defaults apply.">
            <Field as="choice" name="reach" label="Where" options={REACH} />
          </SettingsRow>
          <CodesRow />
        </SettingsGroup>
        <SettingsGroup
          title="New releases"
          description="Releases out in the last month or still to come, and whether their consent started from these defaults."
        >
          {fresh.map((one) => (
            <SettingsRow
              key={one.id}
              title={one.title}
              description={
                formatMeta(
                  [
                    one.artist ?? "",
                    one.released ? `out ${formatDate(one.released, "day")}` : "",
                    hasReleaseGrants(one.id)
                      ? `${GRANTS.filter((grant) => grant.level === "Release" && grant.ref === one.id).length} release-level grants`
                      : "No consent of its own yet: the catalogue's grants apply",
                  ].filter(Boolean),
                ) ?? ""
              }
            >
              <Badge status={hasReleaseGrants(one.id) ? "feature:Enabled" : "feature:Disabled"} />
            </SettingsRow>
          ))}
        </SettingsGroup>
      </SettingsForm>
    </SettingsPage>
  );
}
