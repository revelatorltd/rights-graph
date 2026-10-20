import { AppShell, usePersona, type ShellDestination, type ShellProduct } from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";

import type { Shown } from "../surface";
import { activityPage } from "./activity";
import { assetPage } from "./asset";
import { clearedPage } from "./cleared";
import { consentPage } from "./consent";
import { creditsPage } from "./credits";
import { IDENTITY, PERSONAS, readerOf, type Persona, type Reader } from "./data";
import { homePage } from "./home";
import { artistHref } from "./place";
import { delegatesPage, identityPage, profilesPage } from "./profile";
import { requestPage, requestsPage } from "./requests";
import { societiesPage, worksPage } from "./works";

/**
 * The Artist app (S3) — where personal rights live: identity, credits, voice. Not a catalogue
 * manager. Revelator's own app, so it wears Revelator's mark; whether it is co-branded with Sureel
 * is the FRD's open question (gaps).
 *
 * THREE readers, one product: the artist (Mira Castellanos), a writer in writer mode (Ana
 * Lindgren, which adds Works), and a delegate (Dara Whitlock, Mira's manager, acting for her with
 * scoped approval rights). The phone is the system's to draw: these are ordinary declared pages.
 */
export function usePersonaOf(): Persona {
  return (usePersona(PERSONAS) as Persona | undefined) ?? "Artist";
}

function productFor(persona: Persona): ShellProduct {
  const reader = readerOf(persona);
  const destinations: ShellDestination[] = [
    {
      name: "Home",
      mark: "home",
      opens: artistHref("home"),
      pages: [{ pages: [{ name: "Home", opens: artistHref("home") }, { name: "Requests", opens: artistHref("requests") }] }],
    },
    { name: "Credits", mark: "audio", opens: artistHref("credits") },
    // Writer mode adds Works (FRD S3): the works, their registrations, the memberships missing.
    ...(persona === "Writer"
      ? [
          {
            name: "Works",
            mark: "note" as const,
            opens: artistHref("works"),
            pages: [{ pages: [{ name: "Works", opens: artistHref("works") }, { name: "Societies", opens: artistHref("societies") }] }],
          },
        ]
      : []),
    {
      name: "Consent",
      mark: "rights",
      opens: artistHref("consent"),
      pages: [{ pages: [{ name: "Voice & AI", opens: artistHref("consent") }, { name: "Where you're cleared", opens: artistHref("cleared") }] }],
    },
    { name: "Activity", mark: "timeline", opens: artistHref("activity") },
    {
      name: "Profile",
      mark: "profile",
      opens: artistHref("profile"),
      pages: [
        {
          pages: [
            { name: "Identity & verification", opens: artistHref("profile") },
            { name: "Claimed profiles", opens: artistHref("profiles") },
            { name: "Delegates", opens: artistHref("delegates") },
          ],
        },
      ],
    },
  ];
  return {
    workspace: { name: "Revelator", mark: ORGANIZATIONS.revelator.art },
    personas: PERSONAS,
    destinations,
    user: {
      name: reader.actor.name,
      email: IDENTITY[reader.actor.id]?.email ?? "dara@whitlockmgmt.example",
      // Signing out leaves the app, which this prototype does not model.
      commands: [[{ label: "Sign out", opens: () => {} }]],
    },
  };
}

/** Each page by its address segment, given the reader and the segments after its own. */
const PAGES: Record<string, (reader: Reader, rest: readonly string[]) => Shown> = {
  home: (reader) => homePage(reader),
  requests: (reader) => requestsPage(reader),
  request: (reader, [id]) => requestPage(reader, id ?? ""),
  credits: (reader) => creditsPage(reader),
  asset: (reader, [id, facet]) => assetPage(reader, id ?? "", facet),
  consent: (reader) => consentPage(reader),
  cleared: (reader) => clearedPage(reader),
  activity: (reader) => activityPage(reader),
  profile: (reader) => identityPage(reader),
  profiles: (reader) => profilesPage(reader),
  delegates: (reader) => delegatesPage(reader),
  works: (reader) => worksPage(reader),
  societies: (reader) => societiesPage(reader),
};

/** `#/artist/<page>/<id>/<facet>` */
export function ArtistApp({ path }: { path: readonly string[] }) {
  const persona = usePersonaOf();
  const reader = readerOf(persona);
  const [page = "home", ...rest] = path;
  // Works is writer mode's: another reader landing on its address is taken Home.
  const name = (page === "works" || page === "societies") && persona !== "Writer" ? "home" : page;
  const shown = (PAGES[name] ?? PAGES.home!)(reader, rest);
  if ("cover" in shown) return shown.cover;
  return (
    <AppShell product={productFor(persona)} place={shown.place}>
      {shown.page}
    </AppShell>
  );
}
