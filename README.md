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
- **Design system gaps** — all 245 logged rows, filterable by surface. The synthesis is
  [`gaps.md`](gaps.md).

## What is where

| Surface | Address | Who | Built from |
| ------- | ------- | --- | ---------- |
| S1 Rights workspace | `?persona=label#/pro/rights/overview` | Label (Kestrel Point Recordings) | Revelator Pro shell, Rights section |
| S1 Track rights tab | `?persona=label#/pro/catalog/tracks/r-northbound/rights` | Label, publisher | Pro catalogue, every asset's Rights facet |
| S2 Publisher workspace | `?persona=publisher#/pro/rights/overview` | Publisher (Harbor Music) | the same shell, switched by organisation |
| S3 Artist app | `#/artist/home` (`?persona=writer`, `delegate`) | Mira Castellanos, Ana Lindgren, Dara Whitlock | the system's phone shape — view at 375 px |
| S4 Approval inbox | `…/rights/requests` in S1, S2; `#/artist/requests` | anyone with something to approve | one request shape across three homes |
| S5 Contributor portal | `#/contributor/overview` | Meridian Music Group (a stand-in peer major) | Sureel product |
| S6 Partner portal | `#/partner/overview` (`?persona=openwave-studios`, `gema`, `voxa-voice`, `tessellate`) | Cadence AI and others | Sureel product |
| S7 Sureel Graph Console | `#/console/health` (`?persona=data-engineer`) | Lior Ben-Ami, Sureel rights ops | Sureel product, RCC's sibling |
| S8 Verification portal | `#/verify/rcpt_7Q2M-9F4K-CD7A` | an auditor, no account | Sureel, public |

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

## Not built

Push/email notifications and escalation timers (S4-4/5), the artist sign-up and ID check, real file
reading and download (files are handed over as blob links), loading states (the fixtures are
synchronous), and S9 as an API (the console and portals show what it carries). `../revelator-pro-app`
was not on this machine and its repository is private, so this is a sibling app; the published
replica at revelator-il.github.io/revelator-pro-ui was the visual reference for the Pro shell.
