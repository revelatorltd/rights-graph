import { useState } from "react";
import {
  Alert,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerHeading,
  DrawerTitle,
  FactCard,
  Field,
  FieldLabel,
  Metadata,
  RecordIndex,
  Sections,
  Select,
  Slot,
  SlotItem,
  TitledCard,
  formatList,
} from "@revelator/pro-ui";

import { PARTNERS, partyName } from "../../../graph/fixtures";
import type { Asset, Use } from "../../../graph/model";
import { DEPENDS_ON_TRAINING, USES } from "../../../graph/model";
import { clearanceOf, territoryLabel, type Answer, type SideAnswer } from "../../../graph/resolve";
import { ClearanceBadge, decidedBy } from "../../../rights/kit";
import { COUNTRIES } from "./data";

/** What a clearance is asked for: which partner, and where. Today, always — a clearance is read now. */
export interface Asking {
  partner?: string;
  country: string;
}
export const FIRST_ASK: Asking = { country: "US" };

const ANY = "Any approved partner";
const nameOfCountry = (code: string) => COUNTRIES[code] ?? code;
const codeOfCountry = (name: string) => Object.entries(COUNTRIES).find(([, one]) => one === name)?.[0] ?? "US";

/** The partner and the country a clearance is asked for — over the answers, as choices. */
export function AskPickers({ ask, onChange }: { ask: Asking; onChange: (next: Asking) => void }) {
  return (
    <TitledCard title="Asked for">
      <Slot layout="grid">
        <SlotItem>
          <Field>
            <FieldLabel>Partner</FieldLabel>
            <Select
              options={[ANY, ...PARTNERS.map((one) => one.name)]}
              value={ask.partner ? partyName(ask.partner) : ANY}
              onValueChange={(name) => onChange({ ...ask, partner: PARTNERS.find((one) => one.name === name)?.id })}
            />
          </Field>
        </SlotItem>
        <SlotItem>
          <Field>
            <FieldLabel>Territory</FieldLabel>
            <Select options={Object.values(COUNTRIES)} value={nameOfCountry(ask.country)} onValueChange={(name) => onChange({ ...ask, country: codeOfCountry(name) })} />
          </Field>
        </SlotItem>
      </Slot>
    </TitledCard>
  );
}

/** The worst of several answers — a side is as cleared as its least cleared part. */
const worst = (answers: readonly SideAnswer[]): Answer | undefined =>
  answers.find((one) => one.state === "Denied")?.state ?? answers.find((one) => one.state === "Needs review")?.state ?? answers[0]?.state;

/**
 * Clearances by use (S1-4): every use the graph answers for, granted, denied or to review, with
 * the scope that decided it — for the master side and for each linked work's controlling
 * publisher apart (G-3), read for the partner and the country asked. The uses that depend on AI
 * training say so (S1-6). A use pressed opens its two sides in full, with who decided each (G-5).
 */
export function ClearancesFacet({ asset, ask, onAsk }: { asset: Asset; ask: Asking; onAsk: (next: Asking) => void }) {
  const [open, setOpen] = useState<Use | null>(null);
  const rows = USES.map((use) => ({ use, answer: clearanceOf(asset.id, use, ask) }));
  const training = rows.find((one) => one.use === "AI training")!.answer;
  const shown = rows.find((one) => one.use === open);
  return (
    <Sections>
      <AskPickers ask={ask} onChange={onAsk} />
      {asset.kind === "Release" ? (
        <Alert intent="info" title="Read from its tracks">
          A release holds no rights: each use is as cleared as its least cleared track.
        </Alert>
      ) : null}
      <RecordIndex
        rows={rows}
        rowKey={(one) => one.use}
        noun={{ one: "use", many: "uses" }}
        identity={{ title: "Use", name: (one) => one.use, opens: (one) => () => setOpen(one.use) }}
        columns={[
          { name: "Answer", value: (one) => one.answer.state, cell: (one) => <ClearanceBadge state={one.answer.state} /> },
          { name: "Master", value: (one) => one.answer.master.state, cell: (one) => <ClearanceBadge state={one.answer.master.state} /> },
          { name: "Master decided at", value: (one) => one.answer.master.level, cell: (one) => one.answer.master.level },
          {
            name: "Composition",
            value: (one) => worst(one.answer.composition) ?? "",
            cell: (one) => {
              const state = worst(one.answer.composition);
              return state ? <ClearanceBadge state={state} /> : null;
            },
          },
          {
            name: "Composition decided at",
            value: (one) => [...new Set(one.answer.composition.map((each) => each.level))].join(", "),
            cell: (one) => [...new Set(one.answer.composition.map((each) => each.level))].join(", ") || null,
          },
          {
            name: "Needs first",
            value: (one) => (DEPENDS_ON_TRAINING.includes(one.use) ? "AI training" : ""),
            cell: (one) => (DEPENDS_ON_TRAINING.includes(one.use) ? `AI training — ${training.state.toLowerCase()}` : null),
          },
          { name: "Reason", value: (one) => one.answer.reason, cell: (one) => one.answer.reason },
        ]}
        chooser={false}
        empty={{ holder: "this asset", line: true }}
      />
      <Drawer open={Boolean(shown)} onOpenChange={(next) => (next ? null : setOpen(null))}>
        {shown ? (
          <DrawerContent>
            <DrawerHeader>
              <DrawerHeading>
                <DrawerTitle>{`${shown.use} on ${asset.title}`}</DrawerTitle>
              </DrawerHeading>
            </DrawerHeader>
            <DrawerBody>
              <Metadata>
                <FactCard
                  title="Asked"
                  facts={[
                    { label: "Partner", value: ask.partner ? partyName(ask.partner) : ANY },
                    { label: "Territory", value: nameOfCountry(ask.country) },
                    { label: "Answer", value: <ClearanceBadge state={shown.answer.state} /> },
                    { label: "Why", value: shown.answer.reason },
                    ...(DEPENDS_ON_TRAINING.includes(shown.use)
                      ? [{ label: "Needs first", value: `AI training, which is ${training.state.toLowerCase()} here` }]
                      : []),
                  ]}
                />
                <SideCard title="Master side" side={shown.answer.master} />
                {shown.answer.composition.map((one, at) => (
                  <SideCard
                    key={at}
                    title={one.work ? `Composition — ${one.work.title}${one.party ? `, ${partyName(one.party)}` : ""}` : "Composition side"}
                    side={one}
                  />
                ))}
              </Metadata>
            </DrawerBody>
          </DrawerContent>
        ) : null}
      </Drawer>
    </Sections>
  );
}

/** One side's answer: what it is, the scope that decided it, the grant and who made it, and why. */
function SideCard({ title, side }: { title: string; side: SideAnswer }) {
  const grant = side.grant;
  return (
    <FactCard
      title={title}
      facts={[
        { label: "Answer", value: <ClearanceBadge state={side.state} /> },
        { label: "Decided at", value: side.level === "Default" ? "The default — nothing granted or denied it" : `${side.level} level` },
        ...(grant
          ? [
              {
                label: "Grant",
                as: "list" as const,
                value: [grant.effect, grant.partners.mode === "Allowlist" ? formatList(grant.partners.ids.map(partyName)) ?? "" : grant.partners.mode, territoryLabel(grant.territory)],
              },
              { label: "Decided by", value: decidedBy(grant.decided) },
              ...(grant.conditions?.length ? [{ label: "Conditions", as: "list" as const, value: grant.conditions }] : []),
            ]
          : []),
        { label: "Why", value: side.reason },
      ]}
    />
  );
}
