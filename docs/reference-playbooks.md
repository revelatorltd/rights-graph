# Playbooks in the Revelator Ops prototypes: reference

Sources, all in `~/Desktop/Work/Revelator Ops/Claude Code/Revelator Ops/`:
- `Revelator Ops v2.dc.html`: Marketing gallery, lines 544–583, data at ~2883.
- `Trust and Safety Ops.dc.html`: the only full index and detail, lines 44–200 and 1592–1625. Its data is in `ts-courseware-data.js`, `playbooks:` at ~233.
- `Client Ops Screens.dc.html`: card list, lines 113–138 and 192.
- `Ops Home.dc.html` and `ops-home-data.js`: cross-app "Academy" panel.
- `Rights Ops.dc.html` and `Ops Placeholder.dc.html`: empty state only.

## 1. Navigation and index

**Place.** Every app shows Playbooks as a **utility rail item** (`utility: true`, icon `playbooks`). It sits in the bottom rail group with Help and Settings, not among the domain sections. Its section nav has one group, **Library**, with one item, **All playbooks**. The breadcrumb treats Playbooks as its own destination: it is the current crumb, not a parent. The Academy app's rail has Courses plus a Playbooks utility item. Ops Home has an **Academy** block titled "Playbooks for the work in your queue" with a "See all" button. It shows 4 tiles (icon avatar, title, "App · updated Sep 20", item-type badge), sorted so the item types in your queue come first.

**Index page (T&S, the full version).** It uses `rev-index`, page width `l`.
- Title: **Playbooks** followed by a count badge, e.g. "10".
- Subtitle: "Step-by-step procedures the team follows, each linked to its Academy lesson".
- Header action: secondary button "Open T&S course", which links to Academy. There is **no Create button.**
- Toolbar: a full-width search input ("Search playbooks") that matches id, title, item type, area and owner. A segmented control, icon-only, switches **List / Grid**. Grid is the default.
- **Grid:** auto-fill cards, minimum 280px wide, the whole card clickable. Each card has a corner badge with the number ("01"), a 48px icon avatar with a tone per playbook, the title (h4), the "when" text as helper, "Item type · Owner", and chips: "6 steps", "4 invariants", "Lesson M3.1".
- **List:** a table with columns **Playbook** (avatar, name, helper "PB-01 · Inspection"), **Applies to** (item-type badge), **Owner**, **Lesson**, **Steps** (numeric), **Updated**. Clicking a row opens the playbook.
- Empty result: "No playbooks match your search".
- There are no filters beyond search, no status column and no readings.

**Marketing variant (v2).** Page width `full`.
- Title: "Playbooks", with the subtitle "Sequenced, grounded, executable workflows drawn from the 434-article Revelator Academy…".
- **Phase chips** act as a single-select filter: Pre-release / Release day / Post-release / Catalog.
- A card grid where each card has a phase badge, title, description, a numbered list of 4 short steps ("1. Asset check"), the footer "Grounded in 11 Academy articles", and a small secondary **Run** button.
- There is no detail page.

**Client Ops variant.** Title plus count, subtitle "Step-by-step procedures the Client ops team follows". It is a 2-column dashboard of cards. Each card has a title, an info badge for the **trigger** ("Renewal in 60 days", "Health below 50"), a description, an `<ol>` of steps, and the caption "Owner · X · Uses Customer 360 › Revenue, Content".

**Empty state (Rights, placeholder apps):** an icon avatar, "No playbooks yet", and "Playbooks for this app will live here, linked from the screens they apply to."

## 2. A single playbook (T&S detail)

It uses `rev-detail-page`, width `l`.
- **Breadcrumb:** Playbooks › title.
- **Header:** a 96px icon avatar as the lead, then the title. The title marks hold an item-type badge ("Release to inspect"). The meta row holds chips:
  - id chip "PB-01"
  - owner chip
  - "Updated Sep 27"
  - nav chip "Academy M3.1 · Release inspection", which deep-links to the lesson
- **Header actions:** secondary buttons **← PB-00** and **PB-02 →** step to the previous and next playbook. There is no Run or Edit.
- **Body:** an auto-fit grid with columns of at least 300px. The main column spans 2 and holds cards with h5 headers:
  1. **When to use**: one paragraph naming the trigger.
  2. **Steps**: rows with a count badge (1…n) and the step text, divided by a soft top border. These are imperative sentences.
  3. **Decision rules** (optional): bullet-free rows, e.g. "One flag on the sheet means the statement goes to Withheld."
  4. **Checklist** (optional): a title taken from the lesson, and rows of real checkboxes. Nothing is saved.
  5. **Embedded table** (optional): a title from the lesson, the first column bold, cells wrap. Example: the category table and the escalation levels.
- **Side column:**
  - **Never break**: helper "Invariants from the T&S course. One break fails the work." Each row has a danger badge ("I1"), the rule as a label, and "Damage: …" as helper.
  - **Email templates** (optional): helper "From and BCC infringement@revelator.com". Rows have an id chip ("T1") and a name ("Initial inspection email").
  - **Warning alert** (soft, detailed): "Open items [CONFIRM]", listing unresolved questions.
- **Long-form text:** no side TOC, no anchors and no prose column. All content is short card sections in the page grid, with `text-wrap: pretty`.
- **Related records:** only the lesson nav chip, plus the reverse link from an Academy lesson ("Playbook PB-01" chip). Deep link: `#playbook=PB-01`.
- There is **no progress tracking, no run state and no stepper.**

## 3. Authoring and editing

None anywhere: no edit, version history, comments, approvals or Draft/Published status.
- "Updated <date>" is the only lifecycle field.
- `ops-home-data.js` shows planned readings: "Playbooks changed since you last opened them" ("2 steps changed", "Step 6 changed", warn tone), "Recently updated playbooks", and "Item types with no playbook", ranked by open items.
- In the source text, `[CONFIRM]` marks content that still needs confirming.

## 4. Wording and conventions

**Sections:** When to use · Steps · Decision rules · checklist (titled by its lesson) · table (titled by its lesson) · Never break · Email templates · Open items [CONFIRM].

**Facets:** id `PB-NN`, title, itemType ("Applies to"), area, owner (free text, may name people and roles), updated, lesson, invariants[], templates[]. Client Ops adds trigger and uses. Marketing adds phase and grounding.

**Titles** are sentence case. In T&S, Client Ops and Ops Home they name a task as a gerund ("Inspecting a release", "Running the 8-step KYC", "Escalating a case"). Marketing and Client Ops use imperatives instead ("Launch a pre-save campaign", "Prepare for a renewal", "Recover a locked account").

**The link to an item type** carries the model: a playbook "applies to" a queue item type ("Failed delivery", "Clearance request", "Conflict", "Expiry renewal").

**Rights-domain titles** (from Ops Home): "Clearing a sample", "Resolving an ownership dispute", "Renewing an expiring licence", "Fixing a registration failure".

## Rebuild mapping

- **Index:** a RecordIndex with search and a grid/list view switch. Columns: Playbook, Applies to, Owner, Lesson, Steps, Updated.
- **Record page:** a RecordHeader (icon avatar, item-type badge, facet chips, prev/next). Below it, TitledSection cards: steps as a numbered list (a static stepper), a checklist, a table, invariants as danger-badged rows, and a warning Alert for open items.
