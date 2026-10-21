import { handle, type ApiRequest, type ApiResponse } from "./handlers";
import { openApi } from "./openapi";

export type { ApiRequest, ApiResponse } from "./handlers";

/**
 * One call to the Graph API, whichever transport carried it: the handler table, and the OpenAPI
 * document generated from it beside it. The dev server's middleware (`server.ts`) and the
 * explorer's `api.request` (`client.ts`) both call this and nothing else.
 */
export function respond(request: ApiRequest): ApiResponse {
  const path = request.url.split("?")[0]!.replace(/^\/api(?=\/)/, "");
  if (path === "/openapi.json" && request.method.toUpperCase() === "GET")
    return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.parse(JSON.stringify(openApi())) };
  const answer = handle(request);
  // What the wire carries, whichever transport: dates as ISO 8601, nothing undefined.
  return { ...answer, body: JSON.parse(JSON.stringify(answer.body ?? null)) };
}
