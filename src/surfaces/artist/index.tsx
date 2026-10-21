import { AppShell, usePersona, type ShellDestination, type ShellProduct } from "@revelator/pro-ui";
import { ORGANIZATIONS } from "@revelator/pro-ui/assets";

import { useShellPersona, type Shown } from "../surface";
import { activityPage } from "./activity";
import { assetPage } from "./asset";
import { clearedPage } from "./cleared";
import { consentPage } from "./consent";
import { creditsPage } from "./credits";
import { IDENTITY, PERSONAS, readerOf, type Persona, type Reader } from "./data";
import { homePage } from "./home";
import { artistHref } from "./place";
import { assuranceOf, signOut, signedIn } from "../../graph/identity";
import { identityPage, newcomerReader, personOf, profilesPage } from "./identity";
import { delegatesPage } from "./profile";
import { SignUp, VerifyIdentity } from "./signup";
import { requestPage, requestsPage } from "./requests";
import { noticeCommand, noticePage, noticeSection } from "../notify/pages";
import { artistSeat } from "../notify/seats";
import { societiesPage, worksPage } from "./works";
import { Arriving } from "../arriving";
import { UTILITIES, elsewhereFrom } from "../family";

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

/** A fifth way in, from the map: someone new, walking sign-up (S3-1) — the reader is whoever signed up. */
const NEWCOMER = "New artist";
const APP_PERSONAS = [...PERSONAS, NEWCOMER] as const;
type AppPersona = (typeof APP_PERSONAS)[number];

function productFor(persona: AppPersona, reader: Reader): ShellProduct {
  const destinations: ShellDestination[] = [
    {
      name: "Home",
      mark: "home",
      opens: artistHref("home"),
      pages: [{ pages: [{ name: "Home", opens: artistHref("home") }, { name: "Requests", opens: artistHref("requests") }] }],
    },
    { name: "Credits", mark: "audio", opens: artistHref("credits") },
    // Writer mode adds Works (FRD S3): the works, their registrations, the memberships missing.
    ...(reader.persona === "Writer"
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
    utilities: UTILITIES,
    elsewhere: elsewhereFrom("artist"),
    personas: APP_PERSONAS,
    destinations,
    // Notifications (S4-4): push and email to the phone, kept here; reached from the account menu.
    // Someone who has only just signed up has none yet.
    offRail: persona === NEWCOMER ? [] : [noticeSection(artistSeat(reader.persona))],
    user: {
      name: reader.actor.name,
      email: (persona === NEWCOMER ? signedIn()?.contact : IDENTITY[reader.actor.id]?.email) ?? "dara@whitlockmgmt.example",
      // Signing out leaves the app, which this prototype does not model — except for the new
      // artist, whose sign-out starts the sign-up again.
      commands: [
        ...(persona === NEWCOMER ? [] : [[noticeCommand(artistSeat(reader.persona))]]),
        [{ label: "Sign out", opens: persona === NEWCOMER ? signOut : () => {} }],
      ],
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
  notifications: (reader, rest) => noticePage(artistSeat(reader.persona), rest),
};

/** `#/artist/<page>/<id>/<facet>` */
export function ArtistApp({ path }: { path: readonly string[] }) {
  const [persona, follow] = useShellPersona(APP_PERSONAS, "Artist");
  const newcomer = persona === NEWCOMER ? newcomerReader() : undefined;
  const [page = "home", ...rest] = path;
  // Someone new signs up first; the sign-up stays on screen while it runs, past the ArtistID it makes.
  if (persona === NEWCOMER && (!newcomer || page === "sign-up")) return <SignUp />;
  const reader = newcomer ?? readerOf(persona as Persona);
  if (page === "verify-id" && reader.persona !== "Delegate")
    return <VerifyIdentity person={personOf(reader)} upgrading={assuranceOf(personOf(reader)) !== "Verified + ID"} />;
  // Works is writer mode's: another reader landing on its address is taken Home.
  const name = (page === "works" || page === "societies") && reader.persona !== "Writer" ? "home" : page;
  const shown = (PAGES[name] ?? PAGES.home!)(reader, rest);
  if ("cover" in shown) return shown.cover;
  return (
    <AppShell product={productFor(persona, reader)} place={shown.place}>
      {follow}
      <Arriving>{shown.page}</Arriving>
    </AppShell>
  );
}
