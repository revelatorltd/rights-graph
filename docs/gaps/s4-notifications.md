# S4 Notifications and escalation — gaps

`src/graph/notify.ts` (the model, who is told what, the escalation run, the outbox),
`src/graph/fixtures.ts` (notices, escalations, preferences and the demo clock kept with the graph;
every setter now emits a `GraphEvent`), `src/surfaces/notify/` (the pages, one per product), and a
`notifications` section in each shell: Pro (label and publisher), the artist app, the contributor
portal, the partner portal and the console. FRD S4-4, S4-5, and the notices F3 step 2 and 5, S2-8,
S5-8/S7-8 and S4-3 ask for.

Addresses: `#/<surface>/notifications` (inbox), `…/notifications/settings`,
`…/notifications/outbox` and `…/outbox/<message>`; the console adds `#/console/notifications/escalation`
(the demo clock) and `…/policies`. Each is reached from the account menu ("Notifications · 2 unread").

Walked at 1440×900: the escalation page advanced a week (rq-2204, rq-2206, rq-2209 went up to
Revelator support; Priya saw "went to Revelator support" in her inbox and on each request);
cf-6 resolved in the console (Mira, Kestrel and Voxa Voice told); rq-2204 approved in Pro
(Openwave Studios told); Mira's digest set to Weekly and saved. Not checked at phone width.

| # | Asked for | FRD ref | Here, until decided |
| --- | --- | --- | --- |
| 1 | **A notification slot in the top bar** — a bell with an unread count, opening the latest notices in a panel | S4-4 | The shell has no such slot (`ShellProduct` has `workspace`, `destinations`, `utilities`, `offRail`, `user`, `personas`). Notifications are an off-rail section reached from the account menu, whose command carries the count in words: "Notifications · 2 unread". |
| 2 | **A bell mark** | S4-4 | Not in the 134 marks; REPORTED, not drawn. Nothing on the rail stands for notifications, which is why the section is off the rail and not a utility. |
| 3 | **An unread count on a nav entry** | S4-4 | `NavPage` takes no count. The count rides the account command's label and the inbox's "Unread" reading. |
| 4 | **A notification feed** — a list of notices with read/unread, kind and a way to the thing | S4-4 | `invented` says Notification → Toast/Alert, and Timeline → `ActivityPanel`. Neither fits: a toast passes and an alert stays on one page; `ActivityPanel` is one record's history of saves, with no read state and no link per entry. The inbox is a `CollectionPage` (readings Unread / Escalations / All, selection to mark read, a row opens the record and marks it read). |
| 5 | **A read/unread state** | S4-4 | No status family for it. Written as a word in a column, and as the opening reading. A `notice` family (Unread, Read) or a dot on the row is owed. |
| 6 | **A send state** (Sent, Queued, Held by quiet hours, In digest) | S4-4 | No family; `delivery` is about releases and `registration:Sent` is a society's. The outbox writes the state as words ("Sending, within five minutes", "Quiet hours until …", "Daily digest at …"). |
| 7 | **A live toast when a notice arrives** for the reader while they work | S4-4 "notified within 5 minutes" | `Toast` is a component with no imperative API and no viewport placed by the shell; a page cannot raise one without composing markup. Not drawn. |
| 8 | **A time-of-day field** for quiet hours | S4-4 (quiet hours) | No `as: "time"` field. Quiet hours are a choice of two windows (22:00–07:00, 21:00–08:00) or Off. |
| 9 | **A switch bound to a settings draft** for each channel | S4-4 | As gap B13: each channel is an On/Off `choice`. |
| 10 | **A non-control row in a settings group** (push "not available" for a desk product) | S4-4 | `SettingsRow` holds a control; push for a desk product holds a `Text` "Not available here" with the reason as the description. |
| 11 | **A read-only fact beside a settings form** (the organisation's escalation policy) | S4-5 | A `FactCard` after the `SettingsForm` inside the `SettingsPage`. The page's contract is "a slot with a catalogue"; whether a fact card belongs there is the system's call. |
| 12 | **An email preview** — subject, body, from/to, as a reader would see the email | S4-4 | The message page is a `DetailPage` with a `FactCard` (to, address, channel, sent, says) and, for a digest, a `TitledCard` list of its notices. A long subject is cut in the record header (gap B16). |
| 13 | **A page-level note on a CollectionPage** saying where the clock stands | S4-5 | `RecordIndex.note` holds an `Alert` ("Demo clock: Oct 27, 2026, 7 days ahead of Oct 20, 2026"). It works; it is drawn inside the index, under the readings, not under the title. |
| 14 | **A page action unavailable with its reason** ("Mark all as read" with nothing unread) | S4-4 | As gap B1: the action is left out when nothing is unread. |
| 15 | **Who acted on a conflict** — `updateConflict` had no actor, so "notify the OTHER party" (S2-8) could not leave the mover out | S2-8 | `updateConflict(id, change, by?)` takes the acting party now. Call sites that don't pass it (the publisher's, the contributor's, the catalogue's) tell every party, the mover too. Passing it is a one-word change per call site, left to their owners. |
| 16 | **Notification preferences by kind** (mute "Request received", keep escalations) | S4-4 | Not built: channels and digest apply to every kind. Escalations, licences paused/revoked and on-behalf notices never wait for a digest. |
| 17 | **A real person behind every party** | S4-5 | Parties with nobody named in the prototypes (Halcyon, Ben Songs, Rhein, Lyra Labs, PRS…) are told as "<Party> rights team" at `rights@<party>.example`. |
| 18 | **Escalation for things that are not requests** — an open conflict nobody answers, a batch left in row errors | S4-5 | Only requests escalate (every one has a deadline). A conflict's response is a request (`Conflict response`), so that path is covered; a stale conflict with no request is not. |

## Decided here rather than asked

- **Push is the artist app's** (FRD: "email and push (S3)"). Only people with the app — Mira, Ana,
  Tobi, Juno, Dara — have a device; everyone else gets in-app and email.
- **Every notice is in-app; email goes two minutes after, push one** — inside the FRD's five. A
  digest sends daily at 08:00 or on Monday at 08:00; quiet hours hold push, never in-app or email.
- **What never waits for a digest**: escalations, licence paused/revoked, done-on-your-behalf.
- **Escalation reads the deadline first**: an unanswered request goes up the day after its deadline,
  then again after its policy's wait (7 days; Harbor Music set 5) until the chain ends. The FRD's
  "7 days with no action" read from receipt would have escalated four seeded requests on first open
  (rq-2206, rq-2209, rq-2210, rq-2214) and changed every flow's starting state.
- **Items enter at the first role allowed to answer them** (FRD roles table): a licence request to a
  label enters at the label admin, so the label member is passed over; it then goes to Revelator
  support. An artist's: artist → delegate (if any) → their label's admin. A writer's: writer →
  delegate → their publisher's admin. A contributor's or partner's: → Sureel ops.
- **The original owner keeps it.** The request stays in their inbox, Escalated, and they are told
  where it went; the request page says to whom and when, and where it goes next. Answering it tells
  everyone it had gone up to that it's done.
- **A demo clock, not a moving TODAY.** `CLOCK_DAYS` runs the escalation clock ahead of `TODAY`;
  validity reads (clearances, terms) stay on `TODAY`, so advancing the clock changes who has an item,
  never what is cleared. "Back to today" resets the clock; what went up stays up. The run happens on
  load and whenever the clock moves.
- **A label attesting for its artist is told from the attestation**, not from the request it approved
  (whose decision also names the artist): one notice, "Kestrel Point Recordings approved Voice/NIL for
  Voxa Voice on your behalf", with the authority and the right to dispute.
- **The console's own "who was told" list now reads the graph's notices** for resolutions and policy
  changes, and keeps its own only for unmerges and audit windows (no graph write for those).
- **Seeded history**: 20 notices and the two escalations already in the fixtures (rq-2205 to
  Revelator support, rq-2212 to Kestrel's admin), so every product has something on first open.
