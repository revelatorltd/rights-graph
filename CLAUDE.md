# Working in this repo

The Rights Graph's nine surfaces (FRD "Rights Graph Surfaces") as interactive prototypes, built
from the design system in `../revelator-pro-design-system.git`. Like `../rcc`, it is a SPECIFICATION
of the system: a page here reveals what the system lacks; the gap is logged in `gaps.md`, decided in
the system, and the page adopts it. Read `../revelator-pro-design-system.git/CLAUDE.md` first —
every rule there holds here.

## Layout

- `src/graph/` — the ONE graph every surface reads: `model.ts` (the ERD), `fixtures.ts` (invented
  data plus the data-model doc's worked example, Northbound), `resolve.ts` (precedence, clearance,
  tiers). Surfaces write claims through the setters in `fixtures.ts`; only `resolve.ts` answers.
- `src/rights/` — the rights patterns the FRD asks to design once (tier, territory, decided-by…),
  drawn from system parts only until the system decides them.
- `src/surfaces/<name>/` — one folder per surface: `home` (the map of approaches), `pro` (S1 label,
  S2 publisher, S4 inbox, in Revelator Pro), `artist` (S3), `contributor` (S5), `partner` (S6),
  `console` (S7), `verify` (S8).

## Pages

A page is declared — `CollectionPage`, `DetailPage`, `SettingsPage`, `Wizard`, `AnalyticsPage`.
What no declared form covers is logged in `gaps.md` and drawn with the nearest declared form —
never with HTML, classes or values of the page's own.

## Checks

```bash
npm run build                                                       # types and bundle
(cd ../revelator-pro-design-system.git && npx tsx scripts/check-page.ts ../rights-graph/src \
  && npx tsx scripts/lint-stacks.ts ../rights-graph/src)            # the app against the system
```

`check:app`'s vendor step needs the design system committed; until it is, run the two above.
`npm run dev` serves on 5195. `npm run ds:update` rebuilds and repacks the system.
