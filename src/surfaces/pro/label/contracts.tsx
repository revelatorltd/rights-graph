import {
  Alert,
  Badge,
  CollectionPage,
  DetailPage,
  FactCard,
  Metadata,
  Slot,
  SlotItem,
  Text,
  TitledCard,
  formatMeta,
  formatRange,
  type ShellPlace,
} from "@revelator/pro-ui";

import { ASSERTIONS, GRANTS, TODAY, agreementById, assetById, partyName } from "../../../graph/fixtures";
import type { Agreement } from "../../../graph/model";
import { territoryLabel } from "../../../graph/resolve";
import { TerritoryChip, partyMark } from "../../../rights/kit";
import { LABEL, grantName, labelAgreements, rightsHref } from "./data";

/** The party on the other side of an agreement, from the label's seat. */
const counterparty = (one: Agreement) => one.parties.find((party) => party !== LABEL) ?? LABEL;
const inForce = (one: Agreement) => one.from <= TODAY && (!one.to || TODAY <= one.to);

/** What cites an agreement in the graph — the claims resting on it, the grants decided under it. */
const claimsCiting = (one: Agreement) => ASSERTIONS.filter((claim) => claim.agreementId === one.id);
const grantsCiting = (one: Agreement) => GRANTS.filter((grant) => grant.decided.authority?.startsWith(one.code));

/**
 * Contracts: the agreements the label is party to, as the graph knows them — the authority its
 * claims and consents rest on. A plain index; the contract record itself, with its documents,
 * economics and grant-of-rights matrix, is the product's own Contracts (gaps).
 */
export function Contracts() {
  const rows = labelAgreements();
  return (
    <CollectionPage
      title="Contracts"
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "agreement", many: "agreements" },
        identity: {
          title: "Agreement",
          name: (one) => one.title,
          mark: (one) => partyMark(counterparty(one)),
          opens: (one) => rightsHref("contracts", one.id),
        },
        searchBy: ["Agreement", "Code", "Counterparty"],
        columns: [
          { name: "Code", as: "identifier", standard: "id", value: (one) => one.code },
          { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
          { name: "Counterparty", value: (one) => partyName(counterparty(one)), cell: (one) => partyName(counterparty(one)) },
          { name: "Territory", value: (one) => territoryLabel(one.territory), cell: (one) => <TerritoryChip set={one.territory} /> },
          { name: "Term", value: (one) => one.from.getTime(), cell: (one) => formatRange(one.from, one.to ?? null, "day") },
          { name: "Clauses", as: "count", value: (one) => one.clauses?.length ?? 0 },
          { name: "Claims citing it", as: "count", value: (one) => claimsCiting(one).length },
          {
            name: "State",
            value: (one) => (inForce(one) ? 0 : 1),
            cell: (one) => <Badge status={inForce(one) ? "contract:Active" : "contract:Inactive"} />,
          },
        ],
        filters: [{ kind: "anyOf", key: "kind", label: "Kind", options: [...new Set(rows.map((one) => one.kind))], of: (one) => one.kind }],
        commands: (one) => [{ label: "Open", opens: rightsHref("contracts", one.id) }],
        empty: { holder: "this label" },
      }}
    />
  );
}

/**
 * One agreement: its terms, the clauses that give authority — to consent to AI uses, to attest on
 * an artist's behalf — and what in the graph cites it.
 */
export function AgreementDetail({ id }: { id: string }) {
  const agreement = agreementById(id)!;
  const claims = claimsCiting(agreement);
  const grants = grantsCiting(agreement);
  return (
    <DetailPage
      record={{
        mark: partyMark(counterparty(agreement)),
        name: agreement.title,
        kind: `${agreement.kind} agreement`,
        status: inForce(agreement) ? "contract:Active" : "contract:Inactive",
        facts: [{ identifier: agreement.code, standard: "id" }, { text: territoryLabel(agreement.territory) }],
      }}
    >
      <Metadata>
        <Alert intent="info">
          The full contract — its documents, economics and grant of rights — is kept in Revelator Pro&apos;s Contracts.
        </Alert>
        <FactCard
          title="Terms"
          facts={[
            { label: "Parties", as: "list", value: agreement.parties.map(partyName) },
            { label: "Kind", value: agreement.kind },
            { label: "Territory", value: <TerritoryChip set={agreement.territory} /> },
            { label: "From", as: "date", value: agreement.from },
            { label: "To", as: "date", value: agreement.to },
            { label: "Basis", value: agreement.basis },
          ]}
        />
        <TitledCard title="Clauses" count={agreement.clauses?.length ?? 0}>
          <Slot layout="list">
            {(agreement.clauses ?? []).map((one) => (
              <SlotItem key={one}>
                <Text>{one}</Text>
              </SlotItem>
            ))}
          </Slot>
        </TitledCard>
        <TitledCard title="Claims resting on it" count={claims.length}>
          <Slot layout="list">
            {claims.map((one) => (
              <SlotItem key={one.id} trail={<Badge status={`claim:${one.state}`} />}>
                <Text kind="title">{formatMeta([assetById(one.assetId).title, one.side, partyName(one.partyId)])}</Text>
              </SlotItem>
            ))}
          </Slot>
        </TitledCard>
        <TitledCard title="Consent decided under it" count={grants.length}>
          <Slot layout="list">
            {grants.map((one) => (
              <SlotItem key={one.id} opens={rightsHref("consent", one.id)} trail={<Badge status={`grant:${one.state}`} />}>
                <Text kind="title">{formatMeta([grantName(one), one.decided.authority ?? ""].filter(Boolean))}</Text>
              </SlotItem>
            ))}
          </Slot>
        </TitledCard>
      </Metadata>
    </DetailPage>
  );
}

/** Where one agreement's page is: under Contracts, reached past the index. */
export const agreementPlace = (id: string): ShellPlace => ({
  at: "Rights",
  page: "Contracts",
  trail: [
    { label: "Rights", opens: rightsHref("overview") },
    { label: "Contracts", opens: rightsHref("contracts") },
    { label: agreementById(id)?.code ?? id },
  ],
});
