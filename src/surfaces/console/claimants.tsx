import { Alert, Badge, CollectionPage, ConfirmationDialog, formatPercent, type HeldBy } from "@revelator/pro-ui";

import { CLAIMANTS } from "../../graph/fixtures";
import type { Shown } from "../surface";
import { THRESHOLD, isRestricted, rejectionRate, restrict, restrictionOf, type Claimant } from "./data";
import { partyOrName } from "./marks";
import { OPS_ONLY, SIGNED_IN, type Persona } from "./where";

/** Restricting or lifting a party's auto-acceptance — asked first, because every new claim it sends changes path. */
function Restriction({ one, on, by, ...held }: HeldBy & { one: Claimant; on: boolean; by: string }) {
  return (
    <ConfirmationDialog
      {...held}
      asks={
        on
          ? `Every new claim from ${one.party} waits for a reviewer instead of resolving on its own. Claims already resolved stay as they are.`
          : `${one.party}'s new claims resolve on their own again, at the precedence their source holds.`
      }
      confirm={on ? "Restrict" : "Lift"}
      onCommit={() => restrict(one.party, on, by)}
    />
  );
}

/**
 * False-claim tracking (S7-9) — every party whose claims are withdrawn or rejected, by how often.
 * Past the rejection threshold a party's new claims wait for review, and the row says why.
 *
 * Its standing is the trust family's: let through, or asked to prove itself first. The threshold and
 * any suspension are a POLICY CALL — the page says so rather than offering a suspension.
 */
export function ClaimantsPage(persona: Persona): Shown {
  const by = SIGNED_IN[persona].name;
  const ops = persona === "Rights ops";
  return {
    place: { at: "Resolution", page: "False claims" },
    page: (
      <CollectionPage
        title="False claims"
        index={{
          rows: CLAIMANTS,
          rowKey: (one) => one.party,
          noun: { one: "claimant", many: "claimants" },
          identity: { title: "Claimant", name: (one) => one.party, mark: (one) => partyOrName(one.party) },
          sort: { column: "Rejection rate", direction: "descending" },
          note: (
            <Alert intent="info" title="The threshold is a policy call">
              {`A party whose rejection rate passes ${formatPercent(THRESHOLD, { whole: true })} has its new claims held for review. That line, and any suspension, are for Sureel and WMG legal to set — this figure is a placeholder until they do.`}
            </Alert>
          ),
          columns: [
            {
              name: "Auto-acceptance",
              value: (one) => (isRestricted(one) ? 1 : 0),
              cell: (one) => <Badge status={isRestricted(one) ? "trust:Challenge" : "trust:Allow"} />,
            },
            { name: "Submitted", as: "count", value: (one) => one.submitted },
            { name: "Rejected", as: "count", value: (one) => one.rejected },
            { name: "Withdrawn", as: "count", value: (one) => one.withdrawn },
            { name: "Rejection rate", as: "percent", value: (one) => rejectionRate(one) },
            {
              name: "Why",
              value: (one) => rejectionRate(one),
              cell: (one) =>
                restrictionOf(one)
                  ? `${restrictionOf(one)!.on ? "Restricted" : "Lifted"} by ${restrictionOf(one)!.by}`
                  : rejectionRate(one) > THRESHOLD
                    ? "Past the rejection threshold"
                    : "Under the threshold",
            },
          ],
          readings: [
            { name: "All", holds: () => true },
            { name: "Restricted", holds: (one: Claimant) => isRestricted(one) },
            { name: "Past the threshold", holds: (one: Claimant) => rejectionRate(one) > THRESHOLD },
          ],
          commands: (one) => [
            !ops
              ? { label: isRestricted(one) ? "Lift restriction" : "Restrict auto-acceptance", unavailable: OPS_ONLY }
              : isRestricted(one)
                ? { label: "Lift restriction", dialog: <Restriction one={one} on={false} by={by} /> }
                : { label: "Restrict auto-acceptance", dialog: <Restriction one={one} on by={by} /> },
            { label: "Suspend", destructive: true, unavailable: "A suspension is a policy call for Sureel and WMG legal, not a console command." },
          ],
        }}
      />
    ),
  };
}
