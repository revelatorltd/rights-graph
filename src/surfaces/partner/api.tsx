import {
  Alert,
  Avatar,
  CollectionPage,
  Code,
  DetailPage,
  FactCard,
  Field,
  FormDialog,
  Metadata,
  RecordIndex,
  TitledCard,
  formatList,
  formatMeta,
  owed,
  type HeldBy,
} from "@revelator/pro-ui";

import { api, curlOf, type Logged } from "../../api/client";
import { DOCS, KEYS, ROUTES, routeById, type Param, type Route } from "../../api/handlers";
import { openApi } from "../../api/openapi";
import { go } from "../../route";
import { download, partnerHref, type PartnerPage, type Working } from "./working";

/**
 * The API explorer (S9 through S6): every endpoint of the Graph API, called from the portal with
 * the partner's own key and answered by the SAME handlers the dev server serves at `/api` — here
 * on the browser session's graph, so a write is read by every surface. Scopes are the API's to
 * enforce: a key without one is answered 403, and the explorer shows it rather than hiding the
 * endpoint.
 */

const PHRASE: Record<number, string> = {
  200: "OK",
  202: "Accepted",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Content Too Large",
  422: "Unprocessable Content",
};
export const statusLine = (status: number) => `${status} ${PHRASE[status] ?? ""}`.trim();

/** The keys the API accepts for this partner — the graph's, which the portal's own rotation does not reach (docs/gaps/s9-api.md). */
const keysFor = (working: Working) => KEYS.filter((one) => one.holder === working.partner.id).sort((a, b) => Number(a.env === "Sandbox") - Number(b.env === "Sandbox"));

/** The partner's keys that reach a route; none, where its scopes are missing — or every key, where the route asks none. */
export function reaching(route: Route, working: Working) {
  if (route.scopes === null) return [];
  // Production first: the sandbox key is for the test catalogue, and is the second choice here.
  return keysFor(working)
    .filter((one) => !route.scopes!.length || route.scopes!.some((scope) => one.scopes.includes(scope)))
    .sort((a, b) => Number(a.env === "Sandbox") - Number(b.env === "Sandbox"));
}

const scopesOf = (route: Route) => (route.scopes === null ? "Public — no key" : route.scopes.length ? (formatList(route.scopes) ?? "") : "Any valid key");

/** What a parameter starts as in the form — the partner's own id where it names a partner. */
const startOf = (param: Param, working: Working) => (param.name === "partner" ? working.partner.id : (param.example ?? ""));

/** A path template filled from the form: path parameters in place, the rest as the query. */
function pathOf(route: Route, answers: Record<string, string>) {
  let path = route.path;
  const query = new URLSearchParams();
  for (const param of route.params) {
    const value = (answers[param.name] ?? "").trim();
    if (param.in === "path") path = path.replace(`{${param.name}}`, encodeURIComponent(value));
    if (param.in === "query" && value) query.set(param.name, value);
  }
  const search = query.toString();
  return `/api${path}${search ? `?${search}` : ""}`;
}

const NO_KEY = "none";

/**
 * One call, sent from the portal: the parameters, the key it goes with — or none, to see the
 * 401 — and for a write its body and Idempotency-Key. Committing sends it and opens the answer.
 */
export function SendRequest({ route, working, ...held }: HeldBy & { route: Route; working: Working }) {
  const keys = keysFor(working);
  const best = reaching(route, working)[0] ?? keys[0];
  const draft: Record<string, unknown> = { key: owed(best?.id ?? NO_KEY) };
  for (const param of route.params.filter((one) => one.in !== "header")) draft[param.name] = param.required ? owed(startOf(param, working)) : startOf(param, working);
  if (route.command) {
    draft.idempotency = owed(`${working.partner.id}-${Date.now().toString(36)}`);
    draft.body = owed(JSON.stringify(route.command.example, null, 2));
  }
  return (
    <FormDialog
      {...held}
      confirm="Send"
      draft={draft as Record<string, string>}
      onCommit={(answers) => {
        const sent = answers as Record<string, string>;
        let body: unknown;
        if (route.command) {
          try {
            body = JSON.parse(sent.body ?? "");
          } catch {
            // Sent as written: the API answers a body that is not JSON with its own 400.
            body = sent.body;
          }
        }
        const key = sent.key === NO_KEY ? undefined : sent.key;
        const headers: Record<string, string> = route.command ? { "Idempotency-Key": sent.idempotency ?? "" } : {};
        const made = typeof body === "string" ? api.request(route.method, pathOf(route, sent), undefined, key, headers) : api.request(route.method, pathOf(route, sent), body, key, headers);
        go(partnerHref("api", route.id, made.id));
      }}
    >
      <Field
        as="choice"
        name="key"
        label="Key"
        help="Sent as Authorization: Bearer <key>. Choose no key to see the 401."
        options={[...keys.map((one) => ({ value: one.id, title: formatMeta([one.id, one.env]) ?? one.id })), { value: NO_KEY, title: "No key" }]}
      />
      {route.params
        .filter((one) => one.in !== "header")
        .map((param) => (
          <Field key={param.name} as="text" name={param.name} label={param.name} help={param.description} />
        ))}
      {route.command ? <Field as="text" name="idempotency" label="Idempotency-Key" help={route.params.find((one) => one.in === "header")?.description} /> : null}
      {route.command ? <Field as="longtext" name="body" label={`${route.command.name} body`} help={`One command, or an array of them. ${formatList(Object.keys(route.command.fields))}.`} /> : null}
    </FormDialog>
  );
}

/** Every endpoint, grouped as the doc groups them, with whether the partner's keys reach it. */
export function Explorer({ working }: { working: Working }) {
  return (
    <CollectionPage
      title="API explorer"
      actions={[{ label: "Download OpenAPI document", opens: () => download("rights-graph-openapi.json", openApi()) }]}
      more={[{ label: "Open the API reference", opens: DOCS }]}
      index={{
        rows: ROUTES,
        rowKey: (one) => one.id,
        noun: { one: "endpoint", many: "endpoints" },
        note: (
          <Alert intent="info" title="Answered by your session's graph">
            {"Calls here run the Graph API's own handlers in the browser, on this session's graph. The dev server answers the same paths at /api with its own copy of the fixtures — what one writes, the other does not see."}
          </Alert>
        ),
        identity: {
          title: "Endpoint",
          name: (one) => one.summary,
          mark: (one) => <Avatar kind="document" name={one.summary} />,
          opens: (one) => partnerHref("api", one.id),
        },
        columns: [
          { name: "Method", value: (one) => one.method, cell: (one) => <Code>{one.method}</Code> },
          { name: "Path", value: (one) => one.path, cell: (one) => <Code>{one.path}</Code> },
          { name: "Scopes", value: (one) => scopesOf(one), cell: (one) => scopesOf(one) },
          {
            name: "Your keys",
            value: (one) => reaching(one, working).length,
            cell: (one) => (one.scopes === null ? "No key needed" : formatList(reaching(one, working).map((key) => key.id)) ?? "None carries the scope"),
          },
        ],
        readings: [{ name: "All", holds: () => true }, ...(["Write", "Resolve", "Verify"] as const).map((group) => ({ name: group, holds: (one: Route) => one.group === group }))],
        commands: (one) => [{ label: "Open", opens: partnerHref("api", one.id) }],
        chooser: false,
      }}
    />
  );
}

/** A JSON value as rows: each leaf's path and its value, as the response wrote it. */
function linesOf(value: unknown, path = ""): { path: string; value: string }[] {
  if (Array.isArray(value)) return value.length ? value.flatMap((one, index) => linesOf(one, `${path}[${index}]`)) : [{ path, value: "[]" }];
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, one]) => one !== undefined);
    return entries.length ? entries.flatMap(([name, one]) => linesOf(one, path ? `${path}.${name}` : name)) : [{ path, value: "{}" }];
  }
  return [{ path: path || "(body)", value: JSON.stringify(value) }];
}

/** The calls this session made to one endpoint as this partner, newest first. */
const callsTo = (route: Route, working: Working) => api.log().filter((one) => one.routeId === route.id && (!one.holder || one.holder === working.partner.id) && one.via === "Explorer");

/**
 * One endpoint: what it is, the scopes it asks and whether the partner's keys carry them, and —
 * once sent — the request as curl, the status and the response, field by field.
 */
export function EndpointPage({ route, call, working }: { route: Route; call?: Logged; working: Working }) {
  const reached = reaching(route, working);
  const refused = route.scopes !== null && !reached.length;
  const sample = call ?? undefined;
  const exampleCurl = curlOf(
    route.method,
    pathOf(route, Object.fromEntries(route.params.map((one) => [one.name, startOf(one, working)]))),
    route.scopes === null ? undefined : (reached[0] ?? keysFor(working)[0])?.id,
    route.command?.example,
    route.command ? { "Idempotency-Key": "<unique>" } : {},
  );
  const calls = callsTo(route, working);
  const receipt = (sample?.response.body as { receipt?: { id?: string } } | undefined)?.receipt?.id;
  const event = (sample?.response.body as { event?: string } | undefined)?.event;
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="document" name={route.summary} />,
        name: route.summary,
        facts: [{ text: route.method }, { identifier: route.path, standard: "id" }, { text: route.group }],
        actions: [{ label: "Send request", primary: true, dialog: <SendRequest route={route} working={working} /> }],
        more: [{ label: "Open the API reference", opens: `${DOCS}/${route.id}` }],
      }}
    >
      <Metadata>
        {refused ? (
          <Alert intent="warn" title="None of your keys carries the scope">
            {`${route.method} ${route.path} needs ${scopesOf(route)}. Sent with your keys it answers 403 — ask Sureel to add the scope to a key.`}
          </Alert>
        ) : null}
        {sample ? (
          <>
            <FactCard
              title="Request"
              facts={[
                { label: "Sent with", value: sample.key ?? null, standard: "id" },
                { label: "As curl", value: <Code>{curlOf(sample.method, sample.path, sample.key, sample.request.body, Object.fromEntries(Object.entries(sample.request.headers).filter(([name]) => name === "Idempotency-Key")))}</Code> },
                { label: "Sent", as: "date", grain: "minute", value: sample.at },
              ]}
            />
            <FactCard
              title="Response"
              facts={[
                { label: "Status", value: statusLine(sample.status) },
                { label: "Content type", value: <Code>{sample.response.headers["Content-Type"] ?? ""}</Code> },
                { label: "Latency in the browser, ms", as: "count", value: sample.latency },
                ...(receipt ? [{ label: "Receipt", value: receipt, standard: "id" as const }] : []),
                ...(event ? [{ label: "Event", value: event, standard: "id" as const }] : []),
              ]}
            />
          </>
        ) : (
          <FactCard
            title="Endpoint"
            facts={[
              { label: "What it does", value: route.description },
              { label: "Scopes", value: scopesOf(route) },
              { label: "Your keys", value: route.scopes === null ? "No key needed" : formatList(reached.map((one) => one.id)) },
              { label: "As curl", value: <Code>{exampleCurl}</Code> },
              ...(route.command ? [{ label: "Answered", value: "202 Accepted, with an event id; confirmed by the command.confirmed webhook" }] : []),
            ]}
          />
        )}
        <FactCard
          title="Parameters"
          facts={
            route.params.length
              ? route.params.map((one) => ({ label: one.name, value: `${one.in === "path" ? "In the path" : one.in === "header" ? "Header" : "Query"}${one.required ? ", required" : ""} — ${one.description}` }))
              : [{ label: "None", value: "This endpoint takes no parameters." }]
          }
        />
      </Metadata>
      {sample ? (
        <TitledCard title="Response body">
          <RecordIndex
            rows={linesOf(sample.response.body)}
            rowKey={(one) => one.path}
            noun={{ one: "field", many: "fields" }}
            identity={{ title: "Field", name: (one) => one.path, as: "reference" }}
            columns={[{ name: "Value", value: (one) => one.value, cell: (one) => <Code>{one.value}</Code> }]}
            chooser={false}
          />
        </TitledCard>
      ) : null}
      <TitledCard title="Calls from the explorer" count={calls.length}>
        <RecordIndex
          rows={calls}
          rowKey={(one) => one.id}
          noun={{ one: "call", many: "calls" }}
          identity={{ title: "Call", name: (one) => one.path, as: "reference", opens: (one) => partnerHref("api", route.id, one.id) }}
          sort={{ column: "Sent", direction: "descending" }}
          columns={[
            { name: "Status", value: (one) => one.status, cell: (one) => statusLine(one.status) },
            { name: "Key", as: "identifier", standard: "id", value: (one) => one.key },
            { name: "Sent", as: "date", grain: "minute", value: (one) => one.at },
          ]}
          empty={{ none: "Not called yet. Send a request to see the answer here." }}
          chooser={false}
        />
      </TitledCard>
    </DetailPage>
  );
}

export const API_PAGES: Record<string, PartnerPage> = {
  api: ([id, callId], working) => {
    const route = id ? routeById(id) : undefined;
    if (!route) return { place: { at: "Developers", page: "API explorer" }, page: <Explorer working={working} /> };
    const call = callId ? api.call(callId) : undefined;
    return {
      place: {
        at: "Developers",
        page: "API explorer",
        trail: [
          { label: "Developers", opens: partnerHref("keys") },
          { label: "API explorer", opens: partnerHref("api") },
          { label: route.summary, ...(call ? { opens: partnerHref("api", route.id) } : {}) },
          ...(call ? [{ label: statusLine(call.status) }] : []),
        ],
      },
      page: <EndpointPage key={`${route.id}/${call?.id ?? ""}`} route={route} call={call} working={working} />,
    };
  },
};
