# Reference prototypes — rights areas

Three local HTML prototypes, read as data. This covers rights surfaces only and describes their shapes; fixture names are left out. **Personas:** artist (artist account or portal), label (label or distributor tenant), operator (Revelator internal or role personas).

## 1. Revelator Ops v2 (embeds `Rights Ops.dc.html`) — operator

**Rights Ops nav.** The Rights group holds Lens home, Rights explorer, Clearance check and Radar (expiry & reversion). Economics holds Revenue durability, Recoupment and Advances. Governance holds Data trust & authority. A lens picker sets the persona (Finance, Marketing, Distribution, Rights admin, Royalties, AI & Trust), and each lens home shows 3 KPI tiles and one severity alert.

- **Rights explorer** columns: Recording, Deal type (Owned / Licensed / Distributed / JV), Territorial control, Platform grants, Term left, Revenue TTM, Field confidence.
- **Asset record**:
  - *Rights matrix — use by territory*: 5 uses × 7 regions, cells Yes/No, where green means granted for the full term.
  - *What we do not control*: chips typed Territory or Use, "recorded explicitly, not inferred from absence".
  - *Contract chain*: each field (term end, territory, permitted uses) with its quoted clause and a page/clause reference.
  - *Revenue governed by this grant*.
- **Clearance check** form: Recording, Territory, Use, Window, Scope. The verdict is **Clear to run / Clear with limits / Blocked**. Below it, "Checks run" lists Territorial grant, Use granted, Term covers the flight and Data trusted, each pass or fail. "What this means" gives the reasons, and a sibling count shows how many of the artist's other recordings pass.
- **Radar**: Recording, Grant, Ends, Term left, Option/notice, Revenue, Action. Ranked by revenue, not date.
- **Data trust & authority**: Rights field, Authoritative system, Completeness, Open conflicts, Action. Automation is gated below 75%.

**Clearance gate on marketing records.**
- The Promotions index has a Clearance column: Cleared / Pending / Override required / Blocked.
- Records carry a gate alert, "Cleared · checked <time>", listing ownership, territory and window, UGC, dispute, takedown, screening and caps.
- Children show *Inherited clearance*. A dispute raises a **Rights flag** badge, and the fix is one action on the parent.
- Nav items: Override requests, Holdbacks & disputes, Consent & compliance.
- Every metric carries a **"Tier 1…Tier 5" confidence chip**: T1 is reported, T5 is modelled and shown as a range.

## 2. Revelator Pro Vision (bundled app)

The prototype has an account switcher (platform → label → artist account → payee portals) and a persona switcher. The **Rights** rail section exists only for label-level and above tenants. Artist accounts and portals never see it.

**Rights nav:** Overview, Contracts, Licenses, Clearances (stub), Copyright Infringement (empty state). A UGC group holds YouTube, TikTok, SoundCloud, Policies and Request Forms. Users: label and operator.

- **Overview**:
  - Posture tiles: Ownership coverage (fails the 100% rule), Reverting in 120 days, Unrecouped, Consult BA, AI-cleared (pending participant consent).
  - Reversion radar and revenue captured by right type.
  - Inbound vs outbound: rights held, licences issued, unexploited.
- **Contracts index**: Contract, Counterparty, Territories, Status (Approved / In review / Draft), Roster, Scopes, Document (Indexed / Extracting / Not uploaded), Reversion (badge toned by days left). A filter drawer adds a reversion window.
- **Contract record** has four tabs: *Details*, *Grant of rights · N*, *Economics*, *History*.
  - *Details*: number, type, direction, acquiring party, counterparty, artist, territories, term and roster status. It also shows periods and extraction state (citations captured, fields corrected by a human, missing exhibits).
  - *Grant of rights*: pick a scope, with the rule that any variation forces a new one. Then the **rights & limitations matrix**:
    - Rows are taxonomy categories: Masters, Compositions, NIL, Voice, and AI marked "Proposed".
    - Columns: Right, Granted (Yes / No / **Consult BA**), Exclusivity, Approval, Source.
    - Every row has a help tooltip, a limitation note, a flag and a **citation** (page, section, quote).
    - Filter segments: All / Granted / Consult BA / Approval / Flagged.
  - *Economics*: recoupment waterfall and an expenses table (Recouped / Pending / Non-recoupable).
  - *History*: events with the actor (Legal, AI, Business Affairs).
- **New scope dialog**: name, repertoire, territories (Worldwide / All except / Only in), exclusivity, revenue structure, starting rights profile.
- **New contract wizard**, in order:
  1. Signed PDF (AI prefill with citations)
  2. Type
  3. Parties
  4. Term (or perpetuity)
  5. Territories
  6. Repertoire and assets (existing / future / selected)
  7. Payee shares (must total 100%)
  8. Accounting and expiry notice
- **Licenses**: Inbound and Outbound tabs.
  - Inbound: Right, Copyright (Master / Musical Work), Granted by, Territory, Exclusivity, Assets, Status (Active / Expiring / Lapsed / **Not held**), Runs until.
  - Outbound: Licence, Asset, Licensee, Right, Use, Territory, Status, Fee, Term.
  - A sync use needs a master sync **and** a composition sync licence. An unpaired one is badged "Unpaired" and offers to issue the pair.
  - The issue-license wizard has six sections: asset/right, licensee/scope, use/territory, term, fee, notes.
- **YouTube hub** tabs: Potential claims, Claims, Conflicts, Allowlist, Policies, Suggestions, Transfers.
  - Conflict rows show parties, assets, views and a proposed action ("Release N territories" / "Assert all"), with claimants underneath.
  - Paged dialogs ("1 / N"): Potential claim (Assert / Release), Review claim (Uphold / Release), Respond to conflict ("Conflict in N territories"), Ownership transfer (Approve / Decline).
- **Policies**: action (Block / Monetize / Track) × a country set, picked with a **region-grouped territory picker**. The set is stored, and the "Block in N countries" label is derived from it.
- **Request Forms**: the manual claim form asks for ownership (worldwide exclusive, or partial with Includes/Excludes territories), a segment and a disclaimer. Submissions move through Submitted / In review / Approved / Rejected.
- **Meta Rights Manager** (Trust & Safety, operator):
  - Conflict columns: Type (Overlap / Ownership), overlap or territories, matches at risk, deadline (T−21/14/7/3), status (Conflict detected / Awaiting other party).
  - The drawer is **two-sided** ("Your asset" vs "Conflicting file"): overlapping segments, agreement and **Chain of title**, a timeline, and counterparty history (raised, resolved in our favour, median resolution).
  - Decision: Confirm ownership / Exclude segments / Exclude territories, with a required rationale.
- **YouTube Content ID issues**: 8 typed queues, each with its own column order.
  - The ownership-conflict drawer holds a **territory × competing-party grid** (Claimed / Pending / none, with daily views) and a compare-metadata tab with the winner marked.
- **TikTok**: "Our claim / Their claim", Assert / Dispute / Release, and a safelist scope.

**Release record → Rights** (label): Release Rights, UGC Monetization Policies, Royalty Splits.
- **Release Rights matrix**: a Release row and then Track rows. Column groups are *Distribution* (Streaming, Download, Physical, UGC) and *AI rights* (Model training, Derivative, Voice/NIL, AI-generated streaming).
  - An AI cell can only be ticked when the contributor has opted in. Otherwise it reads "Awaiting opt-in" or "Not cleared".
  - Voice/NIL shows an **Attest / Attested** pill. At release level the weakest clearance wins.
  - Below sit an opt-in record strip (source contract, package, partners) and a **Contributor AI clearance** table (Opted in / Not opted in / Pending, Recorded).
- UGC policies: track × platform buttons. Splits: a "100%" badge and the precedence track → release → contract.
- Reducing rights triggers a "Takedown Required" dialog; changing them triggers "Redelivery Required".
- Recording Rights uses Master / Publishing tabs, and shares must total 100% before delivery. Work Shares adds society, control and collects-via.

**Release Room** (label and artist seats):
- *Rights gap check*: Master / Composition / Territory / Short-form / AI, each with a sentence and a Pass / Needs badge.
- *Approvals on this release*: title, money impact, a rights pass line, per-party states (Approved / Pending / Declined), why it asks, and who executes.
- The artist seat relabels the same approval: the label becomes a named party and the artist becomes "You". Autonomy runs L0–L3, and AI consent and splits are locked from it.

**Artist record → ArtistID** (artist and label lenses): Rights & attestations, Approvals, Payout verification, Activity.
- "Two things are granted per release": distribution once by the rights holder, AI opt-in per contributor (the most restrictive answer travels with the delivery).
- Tables: identity attestations (Active / Open / Withdrawn / Revoked) and a consent ledger (Use, Scope, Counterparty, Answer, Recorded).
- Approval cards (party · kind · age). Badges: Needs review / Awaiting approval / Needs sign-off / Contested / Waiting on <party> / Blocked.
- Decisions are confirmed with a passkey and produce a receipt with **Decided by / Signed with / At**. A consent attestation checkbox and a revoke dialog sit alongside.
- Operator inspection uses a "Confirm Your Rights" dialog with a misrepresentation warning.

## 3. Release Rights standalone — label

The earlier single screen behind Vision's matrix. Side nav: Rights → Release Rights / UGC Policies / Royalty Splits.
- The matrix has the *Distribution* group (Streaming, Download, UGC) and *AI Rights* (Training, Derivative, Voice/NIL tagged "Attestation", AI streaming), over Release and Track rows.
- Every cell is a free toggle. Voice/NIL cycles between *Needs attestation* (amber) and *Attested* (green), and a legend explains the attestation.
- Missing compared with Vision: opt-in gating, the contributor table and the contract link.

## Mapping to Rights Graph concepts

| Concept | Existing precedent |
|---|---|
| Claim rows | YouTube claims and CID queues, Meta and TikTok conflicts: identity cell, at-risk metric, T−N deadline, status badge, proposed action |
| Two-sided master/composition panel | Master + composition sync pairing ("Unpaired"); Master / Publishing tabs; gap check rows; "Your asset vs Conflicting file"; "Our / Their claim" |
| Clearance matrix | Use × region; release/track × Distribution + AI; territory × party; right × Granted / Exclusivity / Approval |
| Territory chip | Region-grouped picker with derived label; Worldwide / All except / Only in; Includes/Excludes; "not controlled" chips |
| Tier badge T1–T5 | Ops v2 confidence chip (T1 reported → T5 modelled range); field-confidence trust floors |
| Conflict card | Meta drawer (segments, chain of title, timeline, counterparty history, decision + rationale); CID conflict + metadata compare |
| "Decided by" line | ArtistID receipt; "verdict computed from the governing contract"; Authoritative system; "checked <time>"; per-field citations |
| Approval card | Release Room approvals (party states, rights line, why it asks); ArtistID approval cards |

**Persona split.** The operator works the queues and data trust, and the label works contracts, licences and release rights. The artist sees only attestations, consent, approvals and a read-only gap check, never the Rights section.
