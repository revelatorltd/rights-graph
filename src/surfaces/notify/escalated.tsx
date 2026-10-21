import { Alert, formatDate } from "@revelator/pro-ui";

import type { Request } from "../../graph/model";
import { chainFor, escalationsOf, nextStepOf, personById } from "../../graph/notify";

/** "Priya Raman (Label admin)", or a desk's name alone where the name is the role. */
const named = (id: string) => {
  const one = personById(id);
  return !one ? id : one.name === one.role ? one.name : `${one.name} (${one.role})`;
};

/** Who an escalated request is with now — the name a request index's column reads. */
export function escalatedTo(request: Request): string | undefined {
  const last = escalationsOf(request.id).at(-1);
  return last ? named(last.to) : undefined;
}

/**
 * An escalated request, as its owner reads it on the request itself (S4-5): who it went to and
 * when, that it is still theirs, and where it goes next if it keeps waiting.
 */
export function EscalatedAlert({ request }: { request: Request }) {
  const steps = escalationsOf(request.id);
  const last = steps.at(-1);
  if (!last) return null;
  const owner = chainFor(request)[0];
  const next = nextStepOf(request);
  const open = request.state === "Needs decision" || request.state === "Escalated";
  return (
    <Alert intent={open ? "warn" : "info"} title={open ? `Escalated to ${named(last.to)}` : `Answered after going to ${named(last.to)}`}>
      {[
        `Unanswered past its deadline of ${formatDate(request.deadline, "day")}, it went up ${steps.map((one) => `to ${named(one.to)} on ${formatDate(one.at, "day")}`).join(", then ")}.`,
        open ? `${owner ? `${owner.name} still owns it` : "Its owner still has it"}: answering it here stands everyone above down.` : "",
        open && next ? `Still unanswered on ${formatDate(next.on, "day")}, it goes to ${named(next.to.id)}.` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    </Alert>
  );
}
