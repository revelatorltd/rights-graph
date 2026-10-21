import { USES } from "../graph/model";
import { BATCH_LIMIT, DOCS, ROUTES, SCOPES, type Param, type Route } from "./handlers";
import { useCode } from "./validate";
import { WEBHOOKS } from "./webhooks";

/**
 * The OpenAPI 3.1 document, GENERATED from the handler table: a route added to `ROUTES` is in the
 * document, and nothing is in the document that no handler answers. Served at `/api/openapi.json`
 * by both transports. Webhooks are OpenAPI 3.1's own `webhooks` map, one per event, each with its
 * example payload.
 */

const PROBLEM = {
  type: "object",
  description: "RFC 9457 problem details.",
  required: ["type", "title", "status", "detail"],
  properties: {
    type: { type: "string", format: "uri" },
    title: { type: "string" },
    status: { type: "integer" },
    detail: { type: "string" },
    errors: { type: "array", items: { type: "object", properties: { field: { type: "string" }, problem: { type: "string" } } } },
  },
};

const ACCEPTED = {
  type: "object",
  required: ["event", "command", "status", "items", "confirmation"],
  properties: {
    event: { type: "string", description: "The event id the write is confirmed under." },
    command: { type: "string" },
    status: { const: "accepted" },
    received: { type: "integer" },
    counts: { type: "object", additionalProperties: { type: "integer" } },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          status: { enum: ["applied", "flagged", "invalid", "unmatched", "rejected"] },
          id: { type: "string" },
          state: { type: "string" },
          problems: { type: "array", items: { type: "object" } },
          note: { type: "string" },
          conflict: { type: "string" },
        },
      },
    },
    confirmation: { type: "object", description: "The command.confirmed payload, and where to poll for it." },
    webhooks: { type: "array", items: { type: "object" }, description: "The webhook payloads the write caused." },
  },
};

const parameterOf = (param: Param) => ({
  name: param.name,
  in: param.in,
  required: param.required ?? false,
  description: param.description,
  schema: param.enum ? { type: "string", enum: param.enum } : { type: "string" },
  ...(param.example ? { example: param.example } : {}),
});

const responseOf = (status: number, description: string) => {
  if (status >= 400) return { description, content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } };
  if (status === 202) return { description, headers: { Location: { schema: { type: "string" } } }, content: { "application/json": { schema: { $ref: "#/components/schemas/Accepted" } } } };
  return { description, content: { "application/json": { schema: { type: "object" } } } };
};

function operationOf(route: Route) {
  return {
    operationId: route.id,
    summary: route.summary,
    description: route.description,
    tags: [route.group],
    ...(route.scopes === null ? { security: [] } : { security: [{ partnerKey: [...route.scopes] }], "x-scopes": route.scopes.length ? route.scopes : "any valid key" }),
    parameters: route.params.map(parameterOf),
    ...(route.command
      ? {
          requestBody: {
            required: true,
            description: `One ${route.command.name} command, or an array of up to ${BATCH_LIMIT}.`,
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: `#/components/schemas/${route.command.name}` },
                    { type: "array", maxItems: BATCH_LIMIT, items: { $ref: `#/components/schemas/${route.command.name}` } },
                  ],
                },
                example: route.command.example,
              },
            },
          },
        }
      : {}),
    responses: Object.fromEntries(Object.entries(route.responses).map(([status, description]) => [status, responseOf(Number(status), description)])),
  };
}

export function openApi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of ROUTES) (paths[route.path] ??= {})[route.method.toLowerCase()] = operationOf(route);
  const commands = Object.fromEntries(
    ROUTES.filter((one) => one.command).map((one) => [
      one.command!.name,
      { type: "object", description: one.description, properties: Object.fromEntries(Object.entries(one.command!.fields).map(([name, description]) => [name, { description }])) },
    ]),
  );
  return {
    openapi: "3.1.0",
    info: {
      title: "Rights Graph API (S9)",
      version: "2026-10-01",
      summary: "Write claims, read clearance and splits, verify receipts.",
      description:
        "Generated from the prototype's handler table (src/api/handlers.ts). Authenticate with Authorization: Bearer <key id>; each route names the scopes that reach it. Errors are application/problem+json. Writes are idempotent (Idempotency-Key), batched, answered 202 and confirmed by the command.confirmed webhook.",
    },
    servers: [{ url: "/api", description: "The dev server's mount; the in-browser explorer answers the same paths" }],
    tags: [
      { name: "Write", description: "Typed commands into the event-sourced write path." },
      { name: "Resolve", description: "The read models: splits, effective clearance, chain of title, lineage." },
      { name: "Verify", description: "The Proof Log: events, inclusion, keys." },
    ],
    paths,
    webhooks: Object.fromEntries(
      WEBHOOKS.map((one) => [
        one.name,
        {
          post: {
            summary: one.means,
            description: `Sent to: ${one.to}. Signed with Sureel-Signature: t=UNIX_TIME,v1=HMAC_SHA256.`,
            requestBody: { content: { "application/json": { schema: { type: "object" }, example: one.example } } },
            responses: { 200: { description: "Received. Anything else, or no answer within 10 seconds, is retried with backoff for 24 hours." } },
          },
        },
      ]),
    ),
    components: {
      securitySchemes: {
        partnerKey: {
          type: "http",
          scheme: "bearer",
          description: `A key id issued in the Partner portal. Scopes: ${Object.entries(SCOPES)
            .map(([name, what]) => `${name} — ${what}`)
            .join("; ")}.`,
        },
      },
      schemas: {
        Problem: PROBLEM,
        Accepted: ACCEPTED,
        Use: { type: "string", enum: [...USES.map(useCode), ...USES] },
        Answer: { type: "string", enum: ["granted", "denied", "needs_review"] },
        ...commands,
      },
    },
    externalDocs: { url: DOCS },
  };
}
