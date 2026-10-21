import { AppShell, usePersona, type ShellProduct } from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";

import { href } from "../../route";
import { noticeCommand, noticePage, noticeSection } from "../notify/pages";
import { proSeat } from "../notify/seats";
import { useShellPersona, type PageOf } from "../surface";
import { CATALOG_PAGES } from "./catalog";
import { LABEL_PAGES, LABEL_RIGHTS_NAV } from "./label";
import { PUBLISHER_PAGES, PUBLISHER_RIGHTS_NAV } from "./publisher";

/**
 * Revelator Pro, with the Rights workspace (S1) and its publishing mode (S2). ONE shell switched by
 * the organisation the reader is working as — roles attach to an organisation and a context, not to
 * a login (FRD, "Who's in the system"). The persona switch the system's shell owns is that context.
 */
export const PERSONAS = ["Label", "Publisher"] as const;
export type Persona = (typeof PERSONAS)[number];

/** Who the reader is working as, in each context. */
export const WORKING_AS: Record<Persona, { party: string; workspace: string; mark: string }> = {
  Label: { party: "p-kestrel", workspace: "Kestrel Point Recordings", mark: ORGANIZATIONS["kestrel-point-recordings"].art },
  Publisher: { party: "p-harbor", workspace: "Harbor Music", mark: ORGANIZATIONS["silverbirch-publishing-house"].art },
};

export const proHref = (...path: (string | undefined)[]) => href("pro", ...path);

export function usePersonaOf(): Persona {
  return (usePersona(PERSONAS) as Persona | undefined) ?? "Label";
}

function productFor(persona: Persona): ShellProduct {
  const working = WORKING_AS[persona];
  return {
    workspace: { name: working.workspace, mark: working.mark },
    personas: PERSONAS,
    destinations: [
      {
        name: "Catalog",
        mark: "catalog",
        opens: proHref("catalog", "tracks"),
        pages: [
          {
            pages: [
              { name: "Releases", opens: proHref("catalog", "releases") },
              { name: "Tracks", opens: proHref("catalog", "tracks") },
              { name: "Videos", opens: proHref("catalog", "videos") },
            ],
          },
        ],
      },
      {
        name: "Rights",
        mark: "rights",
        opens: proHref("rights", "overview"),
        pages: persona === "Label" ? LABEL_RIGHTS_NAV : PUBLISHER_RIGHTS_NAV,
      },
    ],
    // Notifications (S4-4) sit off the rail, reached from the account menu (the top bar has no slot).
    offRail: [noticeSection(proSeat(persona))],
    user:
      persona === "Label"
        ? { name: "Priya Raman", email: "priya.raman@kestrelpoint.example", commands: [[noticeCommand(proSeat(persona))], [{ label: "Sign out", opens: () => {} }]] }
        : { name: "Elena Marsh", email: "elena.marsh@harbormusic.example", commands: [[noticeCommand(proSeat(persona))], [{ label: "Sign out", opens: () => {} }]] },
  };
}

/** `#/pro/<section>/<page>/<id>/<facet>` */
export function RevelatorPro({ path }: { path: readonly string[] }) {
  const [persona, follow] = useShellPersona(PERSONAS, "Label");
  const [section = "rights", page = "overview", ...rest] = path;
  if (section === "notifications") {
    const shown = noticePage(proSeat(persona), path.slice(1));
    return "cover" in shown ? shown.cover : (
      <AppShell product={productFor(persona)} place={shown.place}>
        {follow}
        {shown.page}
      </AppShell>
    );
  }
  const pages: Record<string, PageOf> =
    section === "catalog" ? CATALOG_PAGES : persona === "Label" ? LABEL_PAGES : PUBLISHER_PAGES;
  const found = pages[page] ?? pages.overview ?? Object.values(pages)[0]!;
  const shown = found(rest);
  if ("cover" in shown) return shown.cover;
  return (
    <AppShell product={productFor(persona)} place={shown.place}>
      {follow}
      {shown.page}
    </AppShell>
  );
}
