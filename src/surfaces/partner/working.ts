import { follow } from "@revelator/pro-ui";

import type { Partner } from "../../graph/model";
import { href } from "../../route";
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
 * A file handed to the reader to keep — a receipt, a proof bundle, a test catalogue. Written as a
 * command's `opens`, so the page draws nothing of its own for it. Followed as an address of bytes
 * the browser saves rather than shows; the system has no command that names the file it hands
 * over, so the name is the browser's (docs/gaps/s6-partner.md).
 */
export function download(name: string, content: unknown) {
  const text = typeof content === "string" ? content : JSON.stringify(Object.assign({ file: name }, content), null, 2);
  follow(URL.createObjectURL(new File([text], name, { type: "application/octet-stream" })));
}
