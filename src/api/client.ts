import { TODAY, wrote } from "../graph/fixtures";
import { keyById, match } from "./handlers";
import { respond, type ApiResponse } from "./index";

/**
 * The Graph API in the browser: `api.request(method, path, body, key)` runs the SAME handlers the
 * dev server mounts at `/api`, on the SESSION's graph — so a write made here is read by every
 * surface, and by nothing curl can reach. Every call is logged with its latency, which the
 * console's S9 traffic page reads.
 */

export interface Logged {
  id: string;
  at: Date;
  method: string;
  /** The path as called, query and all. */
  path: string;
  /** The route it reached, as its template — `/v1/assets/{id}/splits` — or the path where none. */
  endpoint: string;
  routeId?: string;
  key?: string;
  /** The party the key acts as. */
  holder?: string;
  status: number;
  /** Measured in the browser, in milliseconds. */
  latency: number;
  via: "Explorer" | "Session start";
  request: { headers: Record<string, string>; body?: unknown };
  response: ApiResponse;
}

let LOG: Logged[] = [];
let seq = 0;

function call(method: string, path: string, body: unknown, key: string | undefined, headers: Record<string, string>, via: Logged["via"], at: Date): Logged {
  const sent = { ...headers, ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) };
  const started = performance.now();
  const response = respond({ method, url: path, headers: sent, body: body === undefined ? undefined : JSON.stringify(body) });
  // Measured to a hundredth of a millisecond: what the handlers take, with no network between.
  const latency = Math.round((performance.now() - started) * 100) / 100;
  const { route } = match(method.toUpperCase(), path.split("?")[0]!.replace(/^\/api(?=\/)/, ""));
  seq += 1;
  const logged: Logged = {
    id: `call-${seq}`,
    at,
    method: method.toUpperCase(),
    path,
    endpoint: route?.path ?? path.split("?")[0]!,
    routeId: route?.id,
    key,
    holder: keyById(key)?.holder,
    status: response.status,
    latency,
    via,
    request: { headers: sent, ...(body === undefined ? {} : { body }) },
    response,
  };
  LOG = [logged, ...LOG];
  return logged;
}

/**
 * The calls already made when the session opened — partners' integrations reading as they do every
 * day, run through the handlers for real (so each status, receipt and latency is the handlers'
 * own), stamped through this morning.
 */
const MORNING: readonly [hour: number, minute: number, method: string, path: string, key?: string][] = [
  [7, 2, "GET", "/api/v1/assets/r-northbound/clearance/effective?use=ai_training&territory=World", "ck_live_91d0"],
  [7, 14, "GET", "/api/v1/assets?isrc=GBKPR2400119", "ck_live_91d0"],
  [7, 31, "GET", "/api/v1/assets/r-tidewater/clearance/effective?use=ai_training", "ck_live_91d0"],
  [8, 5, "GET", "/api/v1/assets/w-northbound/splits?territory=DE&right_type=Performance&as_of=2026-03-01", "ck_live_0b77"],
  [8, 6, "GET", "/api/v1/assets/w-northbound/splits?territory=US&right_type=Performance", "ck_live_0b77"],
  [8, 40, "GET", "/api/v1/assets/v-northbound/clearance/effective?use=sync&territory=US", "ck_live_0b77"],
  [9, 0, "GET", "/api/v1/assets/w-northbound/chain-of-title?territory=DE", "ck_live_g3ma"],
  [9, 12, "GET", "/api/v1/assets/w-northbound/splits?territory=DE", "ck_live_g3ma"],
  [9, 20, "GET", "/api/v1/assets/r-northbound/clearance/effective?use=voice_nil", "ck_live_a4e9"],
  [9, 33, "GET", "/api/v1/assets/r-northbound/clearance/effective?use=ai_training", "ck_sbx_2c11"],
  [9, 41, "GET", "/api/v1/assets/r-lowlight/splits?territory=US", "ck_sbx_2c11"],
  [9, 50, "GET", "/api/v1/assets/r-northbound/clearance/effective?use=ai_training"],
  [9, 58, "GET", "/api/v1/proof/events/rcpt_7Q2M-9F4K-CD7A", "ck_live_91d0"],
  [10, 4, "GET", "/api/v1/proof/keys"],
];

let opened = false;
function open() {
  if (opened) return;
  opened = true;
  for (const [hour, minute, method, path, key] of MORNING)
    call(method, path, undefined, key, {}, "Session start", new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), hour, minute));
}

export const api = {
  /** One call, as a partner's integration makes it: method, path (with its query), a JSON body, the key id. */
  request(method: string, path: string, body?: unknown, key?: string, headers: Record<string, string> = {}): Logged {
    open();
    const clock = new Date();
    const made = call(method, path, body, key, headers, "Explorer", new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), clock.getHours(), clock.getMinutes(), clock.getSeconds()));
    // A write changed the graph, a read minted a receipt: either way every page draws again.
    wrote();
    return made;
  },
  /** Every call this session, newest first. */
  log(): readonly Logged[] {
    open();
    return LOG;
  },
  call(id: string): Logged | undefined {
    open();
    return LOG.find((one) => one.id === id);
  },
};

/** The request as a shell would send it — for the explorer to show, and a reader to paste. */
export function curlOf(method: string, path: string, key: string | undefined, body: unknown, headers: Record<string, string> = {}, origin = "http://localhost:5190") {
  const url = `${origin}${path.startsWith("/api") ? path : `/api${path}`}`;
  const parts = [`curl -s${method.toUpperCase() === "GET" ? "" : ` -X ${method.toUpperCase()}`} '${url}'`];
  if (key) parts.push(`-H 'Authorization: Bearer ${key}'`);
  for (const [name, value] of Object.entries(headers)) parts.push(`-H '${name}: ${value}'`);
  if (body !== undefined) parts.push(`-H 'Content-Type: application/json'`, `-d '${JSON.stringify(body)}'`);
  return parts.join(" ");
}
