import { respond } from "./index";

/**
 * The Graph API over real HTTP, on the dev server: `vite.config.ts` mounts this at `/api` and
 * loads it with `ssrLoadModule`, so it runs the same handlers the explorer calls in the browser.
 *
 * Its graph is the SERVER's — the fixtures as loaded in the dev server's own process, plus
 * whatever curl has written since — not the browser session's: a write in the explorer is not
 * seen by curl, nor the other way round. Vite reloads this module (and with it the fixtures) when
 * a file under `src/` changes.
 *
 * Typed by what it uses of Node's request and response, so `src/` needs no Node types.
 */

interface NodeRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: "data", listener: (chunk: Uint8Array) => void): unknown;
  on(event: "end" | "error", listener: (error?: unknown) => void): unknown;
}

interface NodeResponse {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body?: string): unknown;
}

const bodyOf = (request: NodeRequest) =>
  new Promise<string>((done, failed) => {
    const chunks: Uint8Array[] = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => done(new TextDecoder().decode(concat(chunks))));
    request.on("error", failed);
  });

const concat = (chunks: readonly Uint8Array[]) => {
  const out = new Uint8Array(chunks.reduce((sum, one) => sum + one.length, 0));
  let at = 0;
  for (const one of chunks) {
    out.set(one, at);
    at += one.length;
  }
  return out;
};

/** Connect middleware: one request in, the handler's answer out, as JSON. */
export async function serve(request: NodeRequest, response: NodeResponse) {
  const method = request.method ?? "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : await bodyOf(request);
  const headers = Object.fromEntries(Object.entries(request.headers).map(([name, value]) => [name, Array.isArray(value) ? value.join(", ") : value]));
  const started = performance.now();
  const answer = respond({ method, url: request.url ?? "/", headers, body });
  response.statusCode = answer.status;
  for (const [name, value] of Object.entries(answer.headers)) response.setHeader(name, value);
  response.setHeader("Server-Timing", `graph;dur=${Math.round((performance.now() - started) * 100) / 100}`);
  response.setHeader("X-Graph-State", "dev-server fixtures (not the browser session)");
  response.end(`${JSON.stringify(answer.body, null, 2)}\n`);
}
