import type { ReactNode } from "react";
import {
  Alert,
  Avatar,
  CollectionPage,
  DetailOverview,
  DetailOverviewGrid,
  DetailPage,
  FactCard,
  RecordIndex,
  TitledCard,
  type ShellPlace,
} from "@revelator/pro-ui";

import { href } from "../../route";
import { APPROACHES, FLOWS, PERSONAS, SURFACES, type Approach, type Flow, type FlowStep } from "./data";
import { GAPS, type Gap } from "./gaps";

export const homeHref = (...path: string[]) => href("home", ...path);

/** The page an address names, and where it puts the reader. */
export function pageOf(page: string, id?: string): { place: ShellPlace; body: ReactNode } {
  if (page === "flows" && id) {
    const flow = FLOWS.find((one) => one.id === id) ?? FLOWS[0]!;
    return {
      place: { at: "Map", page: flow.id, trail: [{ label: "Map" }, { label: "Flows", opens: homeHref("flows") }, { label: flow.id }] },
      body: <FlowDetail flow={flow} />,
    };
  }
  if (page === "approaches" && id) {
    const approach = APPROACHES.find((one) => one.id === id) ?? APPROACHES[0]!;
    return {
      place: {
        at: "Map",
        page: approach.id,
        trail: [{ label: "Map" }, { label: "Approaches", opens: homeHref("approaches") }, { label: approach.id }],
      },
      body: <ApproachDetail approach={approach} />,
    };
  }
  if (page === "personas") return { place: { at: "Map", page: "Personas" }, body: <Personas /> };
  if (page === "flows") return { place: { at: "Map", page: "Flows" }, body: <Flows /> };
  if (page === "approaches") return { place: { at: "Map", page: "Approaches" }, body: <Approaches /> };
  if (page === "gaps") return { place: { at: "Map", page: "Design system gaps" }, body: <Gaps /> };
  return { place: { at: "Map", page: "Surfaces" }, body: <Surfaces /> };
}

/** The nine surfaces — four extend what exists, five are new — each opening on its first page. */
function Surfaces() {
  return (
    <CollectionPage
      title="Surfaces"
      index={{
        rows: SURFACES,
        rowKey: (one) => one.id,
        noun: { one: "surface", many: "surfaces" },
        identity: {
          title: "Surface",
          name: (one) => `${one.id} ${one.name}`,
          opens: (one) => one.opens,
        },
        searchBy: ["Surface", "Users", "What it's for"],
        columns: [
          { name: "Users", value: (one) => one.users, cell: (one) => one.users },
          { name: "What it's for", value: (one) => one.purpose, cell: (one) => one.purpose },
          { name: "Approach", value: (one) => one.approach, cell: (one) => one.approach },
          { name: "Platform", value: (one) => one.platform, cell: (one) => one.platform },
          { name: "Starts from", value: (one) => one.startsFrom, cell: (one) => one.startsFrom },
          { name: "Phase", value: (one) => one.phase, cell: (one) => one.phase },
        ],
        // OWNER as readings: Revelator builds S1–S4 in its own product, Sureel runs S5–S9.
        readings: [
          { name: "All", holds: () => true },
          { name: "Revelator", holds: (one) => one.owner === "Revelator" },
          { name: "Sureel", holds: (one) => one.owner === "Sureel" },
        ],
        filters: [{ kind: "anyOf", key: "origin", label: "Origin", options: ["Extends", "New"] as const, of: (one) => one.origin }],
        commands: (one) => [{ label: "Open", opens: one.opens }],
      }}
    />
  );
}

/** The fourteen parties, each opening the surface it works in, in its own context. */
function Personas() {
  return (
    <CollectionPage
      title="Personas"
      index={{
        rows: PERSONAS,
        rowKey: (one) => one.name,
        noun: { one: "party", many: "parties" },
        identity: {
          title: "Party",
          name: (one) => one.name,
          mark: (one) => <Avatar kind="party" name={one.name} />,
          opens: (one) => one.opens ?? homeHref("personas"),
        },
        searchBy: ["Party", "Writes", "Reads"],
        columns: [
          { name: "Place in the graph", value: (one) => one.place, cell: (one) => one.place },
          { name: "Writes", value: (one) => one.writes, cell: (one) => one.writes },
          { name: "Reads", value: (one) => one.reads, cell: (one) => one.reads },
          { name: "Surface", value: (one) => one.surface, cell: (one) => one.surface },
        ],
        // Each party writes claims, reads answers or resolves disputes; only Sureel does all three.
        readings: [
          { name: "All", holds: () => true },
          { name: "Writes claims", holds: (one) => one.does.includes("Writes") },
          { name: "Reads answers", holds: (one) => one.does.includes("Reads") },
          { name: "Resolves", holds: (one) => one.does.includes("Resolves") },
        ],
      }}
    />
  );
}

/** The six cross-surface flows, prototyped end to end rather than screen by screen. */
function Flows() {
  return (
    <CollectionPage
      title="Flows"
      index={{
        rows: FLOWS,
        rowKey: (one) => one.id,
        noun: { one: "flow", many: "flows" },
        identity: { title: "Flow", name: (one) => `${one.id} ${one.name}`, opens: (one) => homeHref("flows", one.id) },
        columns: [
          { name: "What it proves", value: (one) => one.question, cell: (one) => one.question },
          { name: "Starts", value: (one) => one.starts, cell: (one) => one.starts },
          { name: "Ends", value: (one) => one.ends, cell: (one) => one.ends },
          { name: "Steps", as: "count", value: (one) => one.steps.length },
        ],
      }}
    />
  );
}

/** One flow: what it proves, and each step opening the page where it happens. */
function FlowDetail({ flow }: { flow: Flow }) {
  const first = flow.steps.find((one) => one.opens);
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="document" name={flow.id} />,
        name: flow.short,
        facts: [{ text: flow.id }, { text: `${flow.starts} → ${flow.ends}` }],
        actions: first?.opens ? [{ label: "Start the flow", primary: true, opens: first.opens }] : [],
      }}
    >
      <DetailOverview>
        <Alert intent="info" emphasis="soft" title={flow.name}>
          {flow.question}
        </Alert>
        {flow.open ? (
          <Alert intent="warn" emphasis="soft" title="Left to policy">
            {flow.open}
          </Alert>
        ) : null}
        <TitledCard title="Steps" count={flow.steps.length}>
          <RecordIndex<FlowStep>
            rows={flow.steps}
            rowKey={(one) => String(one.at)}
            noun={{ one: "step", many: "steps" }}
            identity={{
              title: "Step",
              name: (one) => one.does,
              rank: (one) => one.at,
              opens: (one) => one.opens ?? homeHref("flows", flow.id),
            }}
            columns={[
              { name: "Surface", value: (one) => one.surface, cell: (one) => one.surface },
              { name: "Who", value: (one) => one.who, cell: (one) => one.who },
            ]}
          />
        </TitledCard>
      </DetailOverview>
    </DetailPage>
  );
}

/** Where the FRD left a choice about how a person meets the graph — the options and the one taken. */
function Approaches() {
  return (
    <CollectionPage
      title="Approaches"
      index={{
        rows: APPROACHES,
        rowKey: (one) => one.id,
        noun: { one: "approach", many: "approaches" },
        identity: { title: "Question", name: (one) => one.question, opens: (one) => homeHref("approaches", one.id) },
        searchBy: ["Question", "Taken"],
        columns: [
          { name: "Persona", value: (one) => one.persona, cell: (one) => one.persona },
          { name: "Taken", value: (one) => one.taken, cell: (one) => one.taken },
        ],
      }}
    />
  );
}

/** One approach: the options weighed, the one taken, and why. */
function ApproachDetail({ approach }: { approach: Approach }) {
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="document" name={approach.id} />,
        name: approach.short,
        facts: [{ text: approach.id }, { text: approach.persona, mark: "members" }],
        actions: approach.see ? [{ label: "See it built", primary: true, opens: approach.see }] : [],
      }}
    >
      <DetailOverview>
        <Alert intent="info" emphasis="soft" title="The question">
          {approach.question}
        </Alert>
        <DetailOverviewGrid>
          {approach.options.map((option) => (
            <FactCard key={option.name} title={option.name} facts={[{ label: "What it says", value: option.says }]} />
          ))}
          <FactCard
            title="Taken here"
            facts={[
              { label: "Decision", value: approach.taken },
              { label: "Because", value: approach.because },
            ]}
          />
        </DetailOverviewGrid>
      </DetailOverview>
    </DetailPage>
  );
}

/** Every gap the surfaces found, filed by surface — the design system's to decide. */
function Gaps() {
  return (
    <CollectionPage
      title="Design system gaps"
      index={{
        rows: GAPS,
        rowKey: (one) => `${one.surface}-${one.id}`,
        noun: { one: "gap", many: "gaps" },
        identity: { title: "Asked for", name: (one) => one.asked, plain: true },
        searchBy: ["Asked for", "Here, until decided"],
        columns: [
          { name: "Surface", value: (one) => one.surface, cell: (one) => one.surface },
          { name: "FRD", value: (one) => one.frd, cell: (one) => one.frd },
          { name: "Here, until decided", value: (one) => one.here, cell: (one) => one.here },
        ],
        readings: [
          { name: "All", holds: () => true },
          ...[...new Set(GAPS.map((one) => one.surface))].map((surface) => ({
            name: surface,
            holds: (one: Gap) => one.surface === surface,
          })),
        ],
      }}
    />
  );
}
