# Rights Graph — the nine surfaces, built from the design system

Interactive prototypes of every surface in the **Rights Graph Surfaces FRD**, over one shared graph
modelled on the **Centralized Reframe & Data Model** doc. Built the way the RCC rebuild was: every
page is a declared form of the Revelator Pro design system (`../revelator-pro-design-system.git`),
nothing hand-drawn, and every place the system fell short is logged as a gap rather than patched.

```bash
npm install
npm run dev          # http://localhost:5190 — start at the map
```

## Start here

**`http://localhost:5190/#/home`** — the map. From it:

- **Surfaces** — S1–S9, each opening on its first page.
- **Personas** — all fourteen parties in the FRD; each opens the surface it works in, already in its
  context (a label in Revelator Pro, a publisher in publishing mode, an artist, a writer, a manager
  acting for an artist, a peer major's tenant, an AI platform, a DSP, a society, Sureel ops, an
  auditor with no account).
- **Flows** — F1–F6, every step a link to the page where it happens. Writes are kept for the browser
  session, so a flow walked across surfaces carries what each step wrote. *Reset the demo* is in the
  map's account menu.
- **Approaches** — nine choices the FRD leaves open about how a person meets the graph: the options,
  the one these screens take, and why (section vs facet; one shell switched by organisation; claims
  beside the answer, never "edit the owner"; consent as the artist's front door; a disputed consent
  paused, not live; contributor trust by showing; ask-and-keep-a-receipt for partners; ops opening on
  ingestion health; verification without an account).
- **Design system gaps** — all 315 logged rows, filterable by surface. The synthesis is
  [`gaps.md`](gaps.md).

## What is where

| Surface | Address | Who | Built from |
| ------- | ------- | --- | ---------- |
| S1 Rights workspace | `?persona=label#/pro/rights/overview` | Label (Kestrel Point Recordings) | Revelator Pro shell, Rights section |
| S1 Track rights tab | `?persona=label#/pro/catalog/tracks/r-northbound/rights` | Label, publisher | Pro catalogue, every asset's Rights facet |
| S2 Publisher workspace | `?persona=publisher#/pro/rights/overview` | Publisher (Harbor Music) | the same shell, switched by organisation |
| S3 Artist app | `#/artist/home` (`?persona=writer`, `delegate`) | Mira Castellanos, Ana Lindgren, Dara Whitlock | the system's phone shape — view at 375 px |
| S4 Approval inbox | `…/rights/requests` in S1, S2; `#/artist/requests` | anyone with something to approve | one request shape across three homes |
| S4 Notifications | `…#/<surface>/notifications` (inbox, settings, outbox) in Pro, artist, contributor, partner, console; `#/console/notifications/escalation` (the demo clock) | everyone with a person | an off-rail section from the account menu |
| S3 Sign-up and ID check | `?persona=new-artist#/artist/sign-up` | a new artist, writer, or an invited delegate | a Wizard over the shell; claims confirmed by the label (Pro requests) or Sureel (`#/console/identity`) |
| S5 Contributor portal | `#/contributor/overview` | Meridian Music Group (a stand-in peer major) | Sureel product |
| S6 Partner portal | `#/partner/overview` (`?persona=openwave-studios`, `gema`, `voxa-voice`, `tessellate`) | Cadence AI and others | Sureel product |
| S7 Sureel Graph Console | `#/console/health` (`?persona=data-engineer`) | Lior Ben-Ami, Sureel rights ops | Sureel product, RCC's sibling |
| S8 Verification portal | `#/verify/rcpt_7Q2M-9F4K-CD7A` | an auditor, no account | Sureel, public |
| S9 Graph API | `curl http://localhost:5190/api/v1/…` · explorer `?persona=cadence-ai#/partner/api` · traffic `#/console/traffic` · `/api/openapi.json` | every system | the same handlers on the dev server (its own copy of the fixtures) and in the browser (the session graph) |

The graph is `src/graph/`: `model.ts` (the ERD), `fixtures.ts` (invented data around the doc's
worked example — Northbound, Ana, Ben, Harbor Music, Ben Songs, Rhein Edition — so the screens can
be checked against the doc's own answers), `resolve.ts` (ownership precedence, clearance most
specific first with deny before grant, the dependency, composition and authority rules, the
Confidence Ladder, bitemporal reads). The screens answer as the doc does: the video's US sync is
*Needs review* because Ben Songs granted nothing; AI training on Northbound is *Needs review* with
the composition side not cleared; DE reads a 110% overclaim; a recording with no work link never
defaults to cleared.

## Decisions waiting on someone

The screens had to take each of these one way; each is flagged where it shows. See `gaps.md` §D.

1. A disputed attest-on-behalf **pauses** the Voice/NIL grant (WMG legal).
2. A party's own withdrawal or correction closes its overclaim; only ops **resolves** (Sureel, RAD).
3. A decline writes **no deny** — the use stays unanswered (WMG legal).
4. A label's Recording↔Work link is written straight through (RAD).
5. No new Voice/NIL grant while the artist disputes an earlier one (WMG legal).
6. The 30 Nov gate thresholds are placeholders: 70 / 50 / 40 / ≤3% (Claire, Leho).
7. The artist app wears Revelator's mark (Lihi, Reid, Bruno).

## The design system, tonight

- **Added**: eleven rights status families in `src/lib/statuses.ts` (`clearance`, `claim`,
  `conflict`, `request`, `attestation`, `credit`, `grant`, `batch`, `match`, `registration`,
  `feed`). Tests and typecheck pass. **Not committed** — that repository's `src/` has never been
  committed, so this app takes it as a local archive (`vendor/…-local.tgz`) and `check:app`'s
  vendor step cannot pass; the page check and stack lint run directly and pass (see `CLAUDE.md`).
- **Asked**: the eight rights patterns the FRD wants designed once, and nineteen capabilities several
  surfaces needed — most of all a page action **unavailable with its reason** (six surfaces), a
  **white-label** layer for Sureel's surfaces (four), a **workspace home** form, **four** headline
  figures, an index opened **pre-filtered**, a **download** command. `gaps.md` files each as a
  decision with a name, a place, an anatomy and rules.

## Walked, and what to know

Every flow was walked end to end through the UI, persona by persona, and every address the map
opens renders (41 checked on a fresh session). Two things to know when you demo:

- **F3 starts part-way.** The fixtures hold the Voice/NIL attestation already disputed and its
  grant already paused (so S1, S3 and S7 show that state on first open); steps 1–3 read as done,
  steps 4–5 are walkable. Making it walkable from step 1 means seeding rq-2203 back to
  *Needs decision* and dropping g-14, at-4 and cf-6.
- **F1 starts at step 2** — Harbour Lights exists in the fixtures; record its DSP delivery from
  the track's record ("Deliver to DSPs") to see it climb to T2.
- **On a phone (375 px)**: no page scrolls sideways; the track record's facts line truncates and
  shows an inner scrollbar, and the readings on Registrations and Look-ups run past the edge.

## Files, the API, notifications

- **Files are read and saved for real.** CSV, JSON, DDEX ERN/MWN and CWR 2.1 are parsed in the
  browser and checked against the graph's rules (ISRC, ISWC and UPC check digits, IPI, ISO 3166
  territories, shares ≤ 100%, a start date); Parquet, PDF and zips are refused with a reason. Try
  the files in `public/samples/` — each upload step links its own. Downloads save under real names
  (`b-3201_failed_rows.csv`, `rcpt_7Q2M-9F4K-CD7A.json`, `kestrel-point_conflicts_gv-….csv`). The
  two browser calls that save and print live in `platform/save.ts`, outside `src/`: the system has
  no download command yet (gap B6), and its page check refuses a page that clicks a link itself.
- **S9 answers over HTTP.** For example:
  `curl 'http://localhost:5190/api/v1/assets/r-northbound/clearance/effective?use=AI%20training&partner=p-cadence' -H 'Authorization: Bearer ck_live_91d0'`
  returns `needs_review` · `composition_not_cleared` with a receipt. Writes take an
  `Idempotency-Key` and answer 202 with an event id; a key writes only its holder's claims, and an
  attestation about someone else's subject is signed only on their behalf under an agreement.
  `scripts/api-check.ts` runs 47 checks, the doc's worked example among them
  (`../revelator-pro-design-system.git/node_modules/.bin/tsx scripts/api-check.ts`).
- **Notifications and escalation.** Every write that should tell someone does — by email, push
  (artist app) and in-app, with a digest option; nothing is really sent, and each product's outbox
  shows what would have been. An unanswered request escalates the day after its deadline along its
  organisation's chain; advance the demo clock from `#/console/notifications/escalation` or the
  map's account menu. The clock runs ahead of the graph's date, so no clearance or term changes.

- **Loading and error states.** Every surface draws its page through one place
  (`src/surfaces/arriving.tsx`): a page's first read in a session waits as a fetch would, its wait
  shown by the system's Spinner in the page's place, the shell around it; a page read before opens
  at once. Pick *Network* in the map's account menu — **Slow** to watch pages arrive, **Offline**
  to see every page's error state and *Try again*. The system's page forms take no loading state
  yet, so the wait has no page-shaped placeholder (gaps.md B19).

## Not built

Real sending of email, push and sign-in codes, real camera capture for the ID check, a PDF
file for the export (the browser's print dialog stands in), and posting webhooks to partners'
endpoints (each write returns the payload it would send). `../revelator-pro-app`
was not on this machine and its repository is private, so this is a sibling app; the published
replica at revelator-il.github.io/revelator-pro-ui was the visual reference for the Pro shell.
