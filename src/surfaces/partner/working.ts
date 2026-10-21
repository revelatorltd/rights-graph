import type { Partner } from "../../graph/model";
import { href } from "../../route";
import { download as saveFile, downloadJson } from "../../rights/files";
import type { Shown } from "../surface";
import type { Persona } from "./data";

/** Who the reader is working as: the persona, the partner organisation, and the person signed in. */
export interface Working {
  persona: Persona;
  partner: Partner;
  user: { name: string; email: string };
}

/** A page of the portal, given the address after its own name and who is reading it. */
export type PartnerPage = (rest: readonly string[], working: Working) => Shown;

export const partnerHref = (...path: (string | undefined)[]) => href("partner", ...path);

/**
 * A file handed to the reader to keep — a receipt, a proof bundle, a test catalogue — under the
 * name the portal gives it. Written as a command's `opens`, so the page draws nothing of its own
 * for it; the DOM work is `src/rights/files.ts`'s.
 */
export function download(name: string, content: unknown) {
  if (typeof content === "string") saveFile(name, content);
  else downloadJson(name, Object.assign({ file: name }, content));
}
