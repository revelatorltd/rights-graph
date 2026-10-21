import {
  Alert,
  Avatar,
  Badge,
  CollectionPage,
  DetailPage,
  EmptyState,
  FactCard,
  Field,
  Metadata,
  SettingsForm,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  Slot,
  SlotItem,
  Text,
  TitledCard,
  formatCount,
  formatDate,
  formatMeta,
  owed,
  type AccountCommand,
  type Command,
  type ShellSection,
} from "@revelator/pro-ui";

import { CLOCK_DAYS, REQUESTS, TODAY, partyName, setNoticesRead, setPrefs } from "../../graph/fixtures";
import {
  CHANNELS,
  POLICIES,
  QUIET,
  advanceClock,
  askOf,
  chainFor,
  clockDay,
  clockToToday,
  escalate,
  escalationsOf,
  nextStepOf,
  noticesFor,
  outbox,
  personById,
  personName,
  policyOf,
  prefsOf,
  unreadFor,
  type Digest,
  type Notice,
  type NoticeKind,
  type Quiet,
  type Sent,
} from "../../graph/notify";
import type { Request } from "../../graph/model";
import { go } from "../../route";
import { partyMark } from "../../rights/kit";
import type { Shown } from "../surface";
import type { Seat } from "./seats";

/**
 * Notifications, in every product that has a person (S4-4, S4-5): the reader's inbox of notices,
 * their channels and digest as a settings page, and the OUTBOX — every email and push the graph
 * would have sent, so a reviewer reads them without anything being sent. The console adds the
 * escalation clock and the policies it runs.
 *
 * Reached from the account menu, as an off-rail section: the system's top bar has no notification
 * slot and its marks no bell (docs/gaps/s4-notifications.md).
 */
const SECTION = "Notifications";

const INBOX = "Inbox";
const SETTINGS = "Settings";
const OUTBOX = "Outbox";
const ESCALATION = "Escalation";
const POLICY_PAGE = "Escalation policies";

/** The section the shell lists off its rail: the reader's pages, and the console's two more. */
export function noticeSection(seat: Seat): ShellSection {
  return {
    name: SECTION,
    opens: seat.here(),
    pages: [
      {
        pages: [
          { name: INBOX, opens: seat.here() },
          { name: SETTINGS, opens: seat.here("settings") },
          { name: OUTBOX, opens: seat.here("outbox") },
          ...(seat.runsEscalation
            ? [
                { name: ESCALATION, opens: seat.here("escalation") },
                { name: POLICY_PAGE, opens: seat.here("policies") },
              ]
            : []),
        ],
      },
    ],
  };
}

/** The account menu's way in, with what is unread — the count a bell would carry. */
export function noticeCommand(seat: Seat): AccountCommand {
  const unread = unreadFor(seat.person);
  return { label: unread ? `Notifications · ${formatCount(unread, { one: "unread", many: "unread" })}` : "Notifications", opens: seat.here() };
}

const ESCALATIONS: readonly NoticeKind[] = ["Escalated", "Escalated to you", "Answered after escalation"];

/** The channels a notice went by, in the order they reach the reader: "In-app · Push · Email (daily digest)". */
const channelsOf = (notice: Notice) =>
  formatMeta(CHANNELS.filter((one) => notice.sent[one]).map((one) => (one === "Email" && notice.digest ? `Email (${notice.digest.toLowerCase()} digest)` : one))) ?? "";

/** Opening a notice marks it read, and lands where its product opens what it is about. */
const openNotice = (seat: Seat, notice: Notice) => () => {
  if (!notice.read) setNoticesRead([notice.id], true);
  go(seat.opens(notice.about) ?? seat.here());
};

/** The reader's notices, unread first (S4-4). */
function Inbox({ seat }: { seat: Seat }) {
  const rows = noticesFor(seat.person);
  const unread = rows.filter((one) => !one.read);
  return (
    <CollectionPage
      title="Notifications"
      actions={unread.length ? [{ label: "Mark all as read", mark: "check", opens: () => setNoticesRead(unread.map((one) => one.id), true) }] : []}
      more={[
        { label: "Notification settings", mark: "settings", opens: seat.here("settings") },
        { label: "Open the outbox", mark: "email", opens: seat.here("outbox") },
      ]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "notification", many: "notifications" },
        identity: { title: "Notification", name: (one) => one.title, opens: (one) => openNotice(seat, one) },
        sort: { column: "Received", direction: "descending" },
        searchBy: ["Notification", "Says"],
        columns: [
          { name: "Kind", value: (one) => one.kind, cell: (one) => one.kind },
          { name: "Says", value: (one) => one.body, cell: (one) => one.body },
          { name: "Received", as: "date", grain: "minute", value: (one) => one.at },
          { name: "Sent by", value: channelsOf, cell: channelsOf },
          { name: "Read", value: (one) => (one.read ? "Read" : "Unread"), cell: (one) => (one.read ? "Read" : "Unread") },
        ],
        readings: [
          { name: "Unread", holds: (one) => !one.read },
          { name: "Escalations", holds: (one) => ESCALATIONS.includes(one.kind) },
          { name: "All", holds: () => true },
        ],
        filters: [{ kind: "anyOf", key: "kind", label: "Kind", options: [...new Set(rows.map((one) => one.kind))], of: (one) => one.kind }],
        commands: (one): Command[] => [
          { label: "Open", opens: openNotice(seat, one) },
          one.read
            ? { label: "Mark as unread", mark: "eye-off", opens: () => setNoticesRead([one.id], false) }
            : { label: "Mark as read", mark: "check", opens: () => setNoticesRead([one.id], true) },
        ],
        selection: (held) => [
          { label: "Mark as read", mark: "check", opens: () => setNoticesRead(held.map((one) => one.id), true) },
          { label: "Mark as unread", mark: "eye-off", opens: () => setNoticesRead(held.map((one) => one.id), false) },
        ],
        empty: { none: "Nothing has needed you yet. A request, a decision on yours, or a conflict you are party to lands here." },
      }}
    />
  );
}

const ON_OFF = [
  { value: "On", title: "On" },
  { value: "Off", title: "Off" },
];
const DIGESTS: { value: Digest; title: string; description: string }[] = [
  { value: "Off", title: "Off", description: "Each email goes as it happens, within five minutes." },
  { value: "Daily", title: "Daily", description: "One email at 08:00 with the day's notices." },
  { value: "Weekly", title: "Weekly", description: "One email on Monday at 08:00 with the week's." },
];
const QUIET_TITLES: Record<Quiet, string> = { Off: "Off", "22:00–07:00": "22:00 to 07:00", "21:00–08:00": "21:00 to 08:00" };
const QUIETS = QUIET.map((one) => ({ value: one, title: QUIET_TITLES[one] }));

/**
 * How the reader is told (S4-4): email and — in the artist app — push, an email digest, quiet hours
 * for push. In-app is always on: the inbox is where every notice is kept. Under it, what happens to
 * an item they leave unanswered — their organisation's escalation policy (S4-5) — which is read
 * here, not set: it is the organisation's, and the console's to run.
 */
function NoticeSettings({ seat }: { seat: Seat }) {
  const person = personById(seat.person)!;
  const prefs = prefsOf(person.id);
  const policy = policyOf(person.party);
  const draft = {
    email: owed(prefs.email ? "On" : "Off"),
    push: owed(prefs.push ? "On" : "Off"),
    digest: owed<string>(prefs.digest),
    quiet: owed<string>(prefs.quiet),
  };
  return (
    <SettingsPage title="Notification settings">
      <SettingsForm
        draft={draft}
        onSave={(answers) =>
          setPrefs(person.id, {
            email: answers.email === "On",
            push: Boolean(person.device) && answers.push === "On",
            digest: answers.digest as Digest,
            quiet: answers.quiet as Quiet,
          })
        }
      >
        <SettingsGroup title="Channels" description="Every notice is kept in your inbox here; these are the ways it also reaches you.">
          <SettingsRow title="Email" description={`To ${person.email}.`}>
            <Field as="choice" name="email" label="Email" options={ON_OFF} />
          </SettingsRow>
          {person.device ? (
            <SettingsRow title="Push" description={`To ${person.device}.`}>
              <Field as="choice" name="push" label="Push" options={ON_OFF} />
            </SettingsRow>
          ) : (
            <SettingsRow title="Push" description="Push reaches the Revelator artist app (S3). You read this product at a desk, so email and the inbox carry it.">
              <Text>Not available here</Text>
            </SettingsRow>
          )}
        </SettingsGroup>
        <SettingsGroup title="Digest" description="Escalations, licences paused or revoked, and anything done on your behalf never wait for one.">
          <SettingsRow direction="col" title="Email digest" description="Batch your emails instead of one for each notice.">
            <Field as="choice" name="digest" label="Email digest" options={DIGESTS} />
          </SettingsRow>
        </SettingsGroup>
        {person.device ? (
          <SettingsGroup title="Quiet hours" description="Push waits until they end; the inbox and email still have it at once.">
            <SettingsRow title="Hold push" description="In your phone's time.">
              <Field as="choice" name="quiet" label="Hold push" options={QUIETS} />
            </SettingsRow>
          </SettingsGroup>
        ) : null}
      </SettingsForm>
      {policy ? (
        <FactCard
          title="If something waits on you"
          facts={[
            { label: "Policy", value: policy.name },
            { label: "Goes up", value: `The day after its deadline, then after ${formatCount(policy.after, { one: "day", many: "days" })} at each step` },
            { label: "Climbs", value: policy.chain.join(" → ") },
            { label: "You stay", value: "Its owner: you still see it, and answering it stands everyone above you down" },
          ]}
        />
      ) : null}
    </SettingsPage>
  );
}

const sentState = (one: Sent) => (one.state === "Sent" ? "Sent" : (one.waits ?? "Queued"));

/** Every email and push the graph would have sent — the reader's, or everyone's in the console. */
function Outbox({ seat }: { seat: Seat }) {
  const rows = outbox().filter((one) => seat.everyone || one.to.id === seat.person);
  return (
    <CollectionPage
      title="Outbox"
      more={[{ label: "Notification settings", mark: "settings", opens: seat.here("settings") }]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "message", many: "messages" },
        note: (
          <Alert intent="info" title="Nothing here was really sent">
            {`Each row is the email or push the graph would have sent, at the time it would have gone — on the demo clock, ${formatDate(clockDay(), "day")}. A time still to come is queued: a digest not due yet, or push held by quiet hours.`}
          </Alert>
        ),
        identity: { title: "Subject", name: (one) => one.subject, opens: (one) => seat.here("outbox", one.id) },
        sort: { column: "Sent", direction: "descending" },
        searchBy: ["Subject", "To"],
        columns: [
          { name: "Channel", value: (one) => one.channel, cell: (one) => formatMeta([one.channel, one.digest ? `${one.digest.toLowerCase()} digest` : ""].filter(Boolean)) },
          { name: "To", value: (one) => one.to.name, cell: (one) => one.to.name },
          { name: "Address", value: (one) => one.address, cell: (one) => one.address },
          { name: "Sent", as: "date", grain: "minute", value: (one) => one.at },
          { name: "State", value: sentState, cell: sentState },
        ],
        readings: [
          { name: "All", holds: () => true },
          { name: "Email", holds: (one) => one.channel === "Email" },
          { name: "Push", holds: (one) => one.channel === "Push" },
          { name: "Queued", holds: (one) => one.state === "Queued" },
        ],
        filters: seat.everyone
          ? [{ kind: "anyOf", key: "to", label: "To", entity: "person", noun: { one: "person", many: "people" }, options: [...new Set(rows.map((one) => one.to.name))], of: (one) => one.to.name }]
          : [],
        empty: { none: "Nothing has gone by email or push yet." },
      }}
    />
  );
}

/** One message as it went: to whom, by what, when — and what it said, or the notices a digest carried. */
function Message({ seat, id }: { seat: Seat; id: string }) {
  const message = outbox().find((one) => one.id === id)!;
  const one = message.notices.length === 1 ? message.notices[0] : undefined;
  return (
    <DetailPage
      record={{
        mark: <Avatar kind="person" name={message.to.name} />,
        name: message.subject,
        kind: message.digest ? `${message.digest} digest` : message.channel,
        facts: [{ text: message.to.name }, { text: message.address }, { as: "date", label: message.state === "Sent" ? "Sent" : "Goes", value: message.at }],
        actions: one ? [{ label: "Open what it is about", primary: true, opens: seat.opens(one.about) ?? seat.here() }] : [],
      }}
    >
      <Metadata>
        <FactCard
          title="Message"
          facts={[
            { label: "To", value: `${message.to.name}, ${message.to.role}` },
            { label: message.channel === "Email" ? "Address" : "Device", value: message.address },
            { label: "Channel", value: message.channel },
            { label: message.state === "Sent" ? "Sent" : "Goes", as: "date", grain: "minute", value: message.at },
            { label: "State", value: sentState(message) },
            ...(one ? [{ label: "Says", value: one.body }, { label: "Kind", value: one.kind }] : []),
          ]}
        />
        {message.notices.length > 1 ? (
          <TitledCard title="In this digest" count={message.notices.length}>
            <Slot layout="list">
              {message.notices.map((each) => (
                <SlotItem key={each.id} opens={seat.opens(each.about)}>
                  <Text kind="title">{each.title}</Text>
                </SlotItem>
              ))}
            </Slot>
          </TitledCard>
        ) : null}
      </Metadata>
    </DetailPage>
  );
}

/** Who a request is with now: the last role it went up to, or its owner. */
const withNow = (request: Request) => {
  const steps = escalationsOf(request.id);
  return steps.length ? personName(steps.at(-1)!.to) : (chainFor(request)[0]?.name ?? "");
};
const isOpen = (request: Request) => request.state === "Needs decision" || request.state === "Escalated";

/**
 * The escalation run (S4-5), and the demo's clock: every request that can go up a role — who owns
 * it, who has it now, who gets it next and on what day. Advancing the clock runs it; an item past
 * its deadline with no answer goes up, and its owner is told where.
 */
function EscalationPage({ seat }: { seat: Seat }) {
  const rows = REQUESTS.filter((one) => chainFor(one).length > 1 && (isOpen(one) || escalationsOf(one.id).length));
  const ahead = CLOCK_DAYS ? `${formatCount(CLOCK_DAYS, { one: "day", many: "days" })} ahead of ${formatDate(TODAY, "day")}` : "today";
  return (
    <CollectionPage
      title="Escalation"
      actions={[
        { label: "Advance a day", mark: "forward", opens: () => advanceClock(1) },
        { label: "Advance a week", mark: "chevrons-right", primary: true, opens: () => advanceClock(7) },
      ]}
      more={[
        { label: "Run escalation now", mark: "refresh", opens: () => escalate() },
        { label: "Back to today", mark: "reset", opens: clockToToday },
        { label: "Open the policies", opens: seat.here("policies") },
      ]}
      index={{
        rows,
        rowKey: (one) => one.id,
        noun: { one: "request", many: "requests" },
        note: (
          <Alert intent="info" title={`Demo clock: ${formatDate(clockDay(), "day")}, ${ahead}`}>
            An unanswered request goes up one role the day after its deadline, then again after its policy's wait. The run reads this clock on every load and every time it moves. Back to today stops the clock; what went up stays up.
          </Alert>
        ),
        identity: { title: "Request", name: askOf, mark: (one) => partyMark(one.from) },
        sort: { column: "Deadline", direction: "ascending" },
        searchBy: ["Request", "For"],
        columns: [
          { name: "For", value: (one) => partyName(one.to), cell: (one) => partyName(one.to) },
          { name: "Owner", value: (one) => chainFor(one)[0]?.name ?? "", cell: (one) => chainFor(one)[0]?.name },
          { name: "With now", value: withNow, cell: withNow },
          { name: "Deadline", as: "date", value: (one) => one.deadline },
          { name: "Next", value: (one) => nextStepOf(one)?.to.name ?? "", cell: (one) => nextStepOf(one)?.to.name },
          { name: "Goes up on", as: "date", value: (one) => nextStepOf(one)?.on },
          { name: "Steps", as: "count", value: (one) => escalationsOf(one.id).length },
          { name: "State", value: (one) => one.state, cell: (one) => <Badge status={`request:${one.state}`} /> },
        ],
        readings: [
          { name: "Open", holds: isOpen },
          { name: "Escalated", holds: (one) => one.state === "Escalated" },
          { name: "Answered after escalation", holds: (one) => !isOpen(one) && escalationsOf(one.id).length > 0 },
          { name: "All", holds: () => true },
        ],
        empty: { none: "No request is waiting on anyone." },
      }}
    />
  );
}

/** The policies the run reads, one per kind of organisation and one an organisation set itself. */
function PoliciesPage() {
  return (
    <CollectionPage
      title="Escalation policies"
      index={{
        rows: [...POLICIES],
        rowKey: (one) => one.name,
        noun: { one: "policy", many: "policies" },
        identity: { title: "Policy", name: (one) => one.name },
        columns: [
          {
            name: "Applies to",
            value: (one) => (one.parties ?? one.kinds ?? []).join(", "),
            cell: (one) => (one.parties ? one.parties.map(partyName).join(", ") : (one.kinds ?? []).join(", ")),
          },
          { name: "Enters at", value: (one) => one.enters, cell: (one) => one.enters },
          { name: "Then", value: (one) => one.chain.slice(one.chain.indexOf(one.enters) + 1).join(" → "), cell: (one) => one.chain.slice(one.chain.indexOf(one.enters) + 1).join(" → ") },
          { name: "Passed over", value: (one) => one.chain.slice(0, one.chain.indexOf(one.enters)).join(", "), cell: (one) => one.chain.slice(0, one.chain.indexOf(one.enters)).join(", ") },
          { name: "Waits at each step", as: "count", value: (one) => one.after },
        ],
        empty: { none: "No policy: nothing escalates." },
      }}
    />
  );
}

/** `notifications`, `notifications/settings`, `notifications/outbox/<id>`, and the console's two. */
export function noticePage(seat: Seat, [page, id]: readonly string[]): Shown {
  const at = (name: string) => ({ at: SECTION, page: name });
  if (page === "settings") return { place: at(SETTINGS), page: <NoticeSettings key={seat.person} seat={seat} /> };
  if (page === "outbox" && id) {
    const found = outbox().some((one) => one.id === id && (seat.everyone || one.to.id === seat.person));
    return {
      place: {
        at: SECTION,
        page: OUTBOX,
        trail: [
          { label: SECTION, opens: seat.here() },
          { label: OUTBOX, opens: seat.here("outbox") },
          { label: found ? (outbox().find((one) => one.id === id)?.subject ?? id) : "Message" },
        ],
      },
      page: found ? (
        <Message key={id} seat={seat} id={id} />
      ) : (
        <EmptyState mark="email" title="This message is not in your outbox" detail="Messages are kept for the browser session, and each reader sees their own." />
      ),
    };
  }
  if (page === "outbox") return { place: at(OUTBOX), page: <Outbox key={seat.person} seat={seat} /> };
  if (seat.runsEscalation && page === "escalation") return { place: at(ESCALATION), page: <EscalationPage seat={seat} /> };
  if (seat.runsEscalation && page === "policies") return { place: at(POLICY_PAGE), page: <PoliciesPage /> };
  return { place: at(INBOX), page: <Inbox key={seat.person} seat={seat} /> };
}
