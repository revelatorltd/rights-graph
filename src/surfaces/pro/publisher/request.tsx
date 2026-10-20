import { Alert, DetailPage, FactCard, Metadata, formatPercent, type ShellPlace } from "@revelator/pro-ui";

import { REQUESTS, conflictById, partyById, partyName } from "../../../graph/fixtures";
import { AI_USES, COUNTERCLAIM_STEPS } from "../../../graph/model";
import { clearanceOf, territoryLabel, useGraph } from "../../../graph/resolve";
import { ClearanceBadge, TerritoryChip, decidedBy, partyMark } from "../../../rights/kit";
import { ME, assetName, countryName, meta, myShare, rightsHref } from "./data";
import { AI_CONDITION, COUNTERS, requestCommands, worksAsked } from "./decisions";
import { askOf } from "./requests";

const requestById = (id: string) => REQUESTS.find((one) => one.id === id)!;

/**
 * One inbox item, whole (S4-2): who asks, for what, over which assets, where and when, by when it
 * must be answered — and, for a licence, Harbor's answer NOW on each work it touches, so nothing
 * the decision needs is more than one tap away. The band holds the type's commands (S4-3).
 */
export function RequestDetail({ id }: { id: string }) {
  useGraph();
  const request = requestById(id);
  // The FIRST command the type takes stands out while it can be taken; decided, every command
  // waits in the overflow and says why it is spent.
  const commands = requestCommands(request);
  const [first, ...rest] = commands;
  const lead = first && !first.unavailable ? first : undefined;
  const conflict = request.about && request.type === "Conflict response" ? conflictById(request.about) : undefined;
  const counter = COUNTERS.get(request.id);
  return (
    <DetailPage
      record={{
        mark: partyMark(request.from),
        name: `${askOf(request)} — ${partyName(request.from)}`,
        kind: request.type,
        status: `request:${request.state}`,
        facts: [
          { as: "date", value: request.deadline, label: "Deadline" },
          { text: territoryLabel(request.territory), mark: "flag" },
          { as: "count", value: request.scope.assets, noun: { one: "asset", many: "assets" } },
        ],
        actions: lead ? [lead.dialog ? { label: lead.label, primary: true, dialog: lead.dialog } : { label: lead.label, primary: true, opens: lead.opens ?? rightsHref("requests") }] : [],
        more: lead ? rest : commands,
      }}
    >
      <Metadata>
        {request.use && AI_USES.includes(request.use) ? (
          <Alert intent="warn" title="The writer's consent is a condition">
            {`AGR-101 §11.3: an AI use of Ana Lindgren's songs needs her written consent. A grant made here carries "${AI_CONDITION}".`}
          </Alert>
        ) : null}
        <FactCard
          title="Request"
          facts={[
            { label: "Requester", value: meta(partyName(request.from), partyById(request.from).kind) },
            { label: "Type", value: request.type },
            { label: "Use", value: request.use },
            { label: "Copyright side", value: request.side },
            { label: "Scope", value: meta(request.scope.level, request.scope.name) },
            { label: "Territory", value: <TerritoryChip set={request.territory} /> },
            { label: "Starts", as: "date", value: request.start },
            { label: "Ends", as: "date", value: request.end ?? null },
            { label: "Deadline", as: "date", value: request.deadline },
            { label: "Received", as: "date", grain: "minute", value: request.received },
            { label: "Licence model", value: request.licenceModel },
            { label: "Purpose", value: request.purpose },
          ]}
        />
        {request.type === "Licence" && request.use ? (
          <FactCard
            title="Harbor's answer now"
            facts={worksAsked(request).map((work) => {
              const mine = clearanceOf(work.id, request.use!, { partner: request.from, country: request.territory.include === "World" ? "US" : request.territory.include[0] })
                .composition.find((one) => one.party === ME);
              return {
                label: meta(work.title, formatPercent(myShare(work.id) ?? 0)),
                value: mine ? <ClearanceBadge state={mine.state} /> : "Not Harbor Music's to answer",
              };
            })}
          />
        ) : null}
        {conflict ? (
          <FactCard
            title="Conflict"
            facts={[
              { label: "Kind", value: conflict.kind },
              { label: "Work", value: assetName(conflict.assetId) },
              { label: "Claimed", as: "percent", value: conflict.total ?? null },
              { label: "Territories", as: "list", value: conflict.territories.map(countryName) },
              { label: "Step", value: COUNTERCLAIM_STEPS[conflict.step] },
              { label: "Revenue at risk", as: "money", value: conflict.revenueAtRisk },
            ]}
          />
        ) : null}
        {counter ? (
          <FactCard
            title="Counter sent"
            facts={[
              { label: "Territory", value: counter.territory },
              { label: "Until", as: "date", value: counter.until ?? null },
              { label: "Licence model", value: counter.model },
              { label: "Note", value: counter.note },
            ]}
          />
        ) : null}
        {request.decided ? <FactCard title="Decision" facts={[{ label: "Decided by", value: decidedBy(request.decided) }]} /> : null}
      </Metadata>
    </DetailPage>
  );
}

/** Where one request's page is: under the inbox it came from. */
export const requestPlace = (id: string): ShellPlace => {
  const request = requestById(id);
  const name = `${askOf(request)} — ${partyName(request.from)}`;
  return {
    at: "Rights",
    page: name,
    trail: [
      { label: "Rights", opens: rightsHref("overview") },
      { label: "Requests", opens: rightsHref("requests") },
      { label: name },
    ],
  };
};

