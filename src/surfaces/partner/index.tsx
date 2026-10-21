import { AppShell, type ShellProduct } from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";

import { href } from "../../route";
import { useShellPersona } from "../surface";
import { API_PAGES } from "./api";
import { noticeCommand, noticePage, noticeSection } from "../notify/pages";
import { partnerSeat } from "../notify/seats";
import { PERSONAS, WORKING_AS, partnerOf, type Persona } from "./data";
import { KEYS_PAGES } from "./keys";
import { LOOKUP_PAGES } from "./lookups";
import { ORGANISATION_PAGES } from "./organisation";
import { OVERVIEW_PAGES } from "./overview";
import { REQUEST_PAGES } from "./requests";
import { SOCIETY_PAGES } from "./society";
import { USAGE_PAGES } from "./usage";
import { WEBHOOK_PAGES } from "./webhooks";
import { partnerHref, type PartnerPage, type Working } from "./working";
import { Arriving } from "../arriving";
import { MAP, elsewhereFrom } from "../family";

/**
 * The Partner portal (S6) — Sureel's, for AI platforms, DSPs and societies: mostly a developer
 * portal with a thin operations layer on top (FRD S6). ONE shell, switched by the organisation the
 * reader works as; a society sees its registrations where a licensee sees its clearances.
 *
 * The system ships no Sureel mark, so the Fieldhouse organisation's stands in for it, and the
 * workspace is the partner's own name beside it (docs/gaps/s6-partner.md, white label).
 */
const SUREEL_MARK = ORGANIZATIONS.fieldhouse.art;

const PAGES: Record<string, PartnerPage> = {
  ...OVERVIEW_PAGES,
  ...ORGANISATION_PAGES,
  ...LOOKUP_PAGES,
  ...REQUEST_PAGES,
  ...USAGE_PAGES,
  ...KEYS_PAGES,
  ...WEBHOOK_PAGES,
  ...SOCIETY_PAGES,
  ...API_PAGES,
  notifications: (rest, working) => noticePage(partnerSeat(working.persona), rest),
};

/** The pages only a licensee has, and the ones only a society has. */
const LICENSEE_ONLY = ["lookups", "requests", "usage", "sandbox"];
const SOCIETY_ONLY = ["registrations", "acknowledgements"];

const developers = (society: boolean) => ({
  name: "Developers",
  mark: "settings" as const,
  opens: partnerHref("keys"),
  pages: [
    {
      pages: [
        { name: "API keys", opens: partnerHref("keys") },
        ...(society ? [] : [{ name: "Sandbox", opens: partnerHref("sandbox") }]),
        { name: "Webhooks", opens: partnerHref("webhooks") },
        { name: "API explorer", opens: partnerHref("api") },
      ],
    },
  ],
});

function productFor(working: Working): ShellProduct {
  const society = working.partner.kind === "Society";
  return {
    workspace: { name: working.partner.name, mark: SUREEL_MARK, settings: partnerHref("organisation") },
    utilities: [MAP],
    elsewhere: elsewhereFrom("partner"),
    personas: PERSONAS,
    destinations: [
      { name: "Home", mark: "home", opens: partnerHref("overview") },
      ...(society
        ? [
            {
              name: "Registrations",
              mark: "rights" as const,
              opens: partnerHref("registrations"),
              pages: [
                {
                  pages: [
                    { name: "Works", opens: partnerHref("registrations") },
                    { name: "Acknowledgements", opens: partnerHref("acknowledgements") },
                  ],
                },
              ],
            },
          ]
        : [
            {
              name: "Clearance",
              mark: "rights" as const,
              opens: partnerHref("lookups"),
              pages: [
                {
                  pages: [
                    { name: "Look-ups", opens: partnerHref("lookups") },
                    { name: "Licence requests", opens: partnerHref("requests") },
                  ],
                },
              ],
            },
            { name: "Usage", mark: "import" as const, opens: partnerHref("usage") },
          ]),
      developers(society),
    ],
    // Notifications (S4-3 "the requester is notified"): answers, licences paused or revoked.
    offRail: [{ name: "Organisation", opens: partnerHref("organisation") }, noticeSection(partnerSeat(working.persona))],
    user: {
      ...working.user,
      commands: [
        [noticeCommand(partnerSeat(working.persona))],
        [{ label: "Open the Verification portal", opens: href("verify") }],
        // Signing out leaves the product, which this prototype does not model.
        [{ label: "Sign out", opens: () => {} }],
      ],
    },
  };
}

const workingAs = (persona: Persona): Working => {
  const as = WORKING_AS[persona];
  return { persona, partner: partnerOf(as.partner), user: as.user };
};

/** `#/partner/<page>/<id>/<facet>` */
export function PartnerPortal({ path }: { path: readonly string[] }) {
  const [persona, follow] = useShellPersona(PERSONAS, "Cadence AI");
  const working = workingAs(persona);
  const society = working.partner.kind === "Society";
  const [page = "overview", ...rest] = path;
  // A licensee never reaches a society's pages, nor a society a licensee's: either lands home.
  const fits = !(society ? LICENSEE_ONLY : SOCIETY_ONLY).includes(page);
  const found = (fits && PAGES[page]) || PAGES.overview!;
  const shown = found(fits ? rest : [], working);
  if ("cover" in shown) return shown.cover;
  return (
    <AppShell product={productFor(working)} place={shown.place}>
      {follow}
      <Arriving>{shown.page}</Arriving>
    </AppShell>
  );
}
