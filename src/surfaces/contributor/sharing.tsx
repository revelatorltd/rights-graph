import {
  Alert,
  ChoiceCards,
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  owed,
  useAnswer,
  useChangeAnswers,
} from "@revelator/pro-ui";

import { slug } from "../../route";
import { setSharing, sharing, type Level } from "./data";

/** What each level means for a field — who reads it, in one line. */
const LEVEL_OPTIONS = [
  { value: "Shared", title: "Shared", description: "Read by the resolver and returned in other parties' answers." },
  { value: "Private", title: "Private", description: "Stays in your tenant. Sureel reads it only under a logged audit." },
  { value: "Encrypted", title: "Encrypted", description: "Private, and held under your key: Sureel stores it unread." },
] satisfies { value: Level; title: string; description: string }[];

/** What a field is used FOR, so a reader sees what making it private would cost. */
const USED_FOR: Record<string, string> = {
  "ISRC, ISWC, UPC": "How your records are matched to the graph's. Private, nothing of yours can be matched.",
  "Titles, artists, writers": "How a record without an identifier is matched, by name and credit.",
  "Ownership share totals": "What another party sees of your claim in a conflict.",
  "Territories and terms": "Where and when your claims hold — the resolver reads them for every answer.",
  "Agreement references": "The deal a claim rests on. Shown to ops as evidence only under audit.",
  "Royalty rates and advances": "Never used to resolve ownership.",
  "Deal basis and retention": "Never used to resolve ownership.",
};

/** One field's level, held in the form around it — so Discard puts it back. */
function LevelChoice({ field }: { field: string }) {
  const value = useAnswer(slug(field));
  const change = useChangeAnswers();
  return <ChoiceCards options={LEVEL_OPTIONS} value={String(value ?? "")} onValueChange={(next) => change({ [slug(field)]: next })} />;
}

/**
 * Which of the tenant's fields are shared, private or encrypted (S5-5) — and the promise said in
 * so many words: no other tenant, WMG included, reads a private field. A SETTINGS FORM, because a
 * change to who reads what is weighed as a whole and saved once.
 */
export function Sharing() {
  const fields = sharing();
  const draft = Object.fromEntries(fields.map((one) => [slug(one.field), owed(one.level)]));
  return (
    <SettingsPage title="Sharing">
      <Alert intent="info" title="No other tenant reads a private field — WMG included">
        A Private or Encrypted field never leaves your tenant in any answer the graph gives. Sureel ops can read a Private field only inside a logged, time-boxed audit request, and every such read is in your access log, marked under audit only. An Encrypted field Sureel cannot read at all.
      </Alert>
      <SettingsForm
        draft={draft}
        onSave={(answers) =>
          setSharing(Object.fromEntries(fields.map((one) => [one.field, (answers[slug(one.field)] as Level | undefined) ?? one.level])))
        }
      >
        <SettingsGroup title="Identifiers and credits" description="What the graph matches your records by.">
          {fields.slice(0, 2).map((one) => (
            <SettingsRow key={one.field} direction="col" title={one.field} description={USED_FOR[one.field]}>
              <LevelChoice field={one.field} />
            </SettingsRow>
          ))}
        </SettingsGroup>
        <SettingsGroup title="Ownership" description="What your claims say, and what other parties see of them.">
          {fields.slice(2, 4).map((one) => (
            <SettingsRow key={one.field} direction="col" title={one.field} description={USED_FOR[one.field]}>
              <LevelChoice field={one.field} />
            </SettingsRow>
          ))}
        </SettingsGroup>
        <SettingsGroup title="Terms" description="Your deals. None of it is needed to resolve who owns what.">
          {fields.slice(4).map((one) => (
            <SettingsRow key={one.field} direction="col" title={one.field} description={USED_FOR[one.field]}>
              <LevelChoice field={one.field} />
            </SettingsRow>
          ))}
        </SettingsGroup>
      </SettingsForm>
    </SettingsPage>
  );
}
