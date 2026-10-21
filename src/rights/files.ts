import { printTable, saveBlob } from "../../platform/save";
import { formatDate, formatPercent } from "@revelator/pro-ui";

import { TARGET_FIELDS } from "../graph/fixtures";

/**
 * Files moving in and out of the surfaces: a file READ as what it is (CSV, JSON, DDEX ERN or MWN,
 * CWR), CHECKED against the graph's rules in the row-error shape every upload shows, and a file
 * HANDED OVER under the name the product gives it.
 *
 * The system has no command that hands the reader a file (gaps.md B6) and a page does no DOM work
 * of its own, so the DOM lives here: a page declares a command whose `opens` calls `download(…)`.
 * Nothing here draws; everything here is data in, data out.
 */

// =============================================================================================
// Reading

export type FileFormat = "CSV" | "JSON" | "DDEX ERN" | "DDEX MWN" | "CWR" | "Parquet" | "PDF" | "Unknown";

/** What a file is, kept wherever it travels — evidence on a claim keeps all four. */
export interface FileFacts {
  name: string;
  size: number;
  type: string;
  format: FileFormat;
}

/** A record as the file wrote it, by its own header (CSV, JSON) or by the graph's field (DDEX, CWR). */
export type FileRow = Record<string, string>;

/** A CWR acknowledgement (ACK record), with the work it answers and the society's messages. */
export interface CwrAck {
  /** The line the ACK record sits on. */
  line: number;
  title: string;
  /** What the sender numbered the work, and the number the society gave it. */
  submitterNumber: string;
  societyNumber: string;
  /** AS, AC, RA, SR, CR accepted · RJ rejected · CO conflict · DU duplicate · NP no participation. */
  status: string;
  processed?: Date;
  originalType: string;
  work?: CwrWork;
  messages: string[];
}

/** A CWR work transaction (NWR/REV) and its parties. */
export interface CwrWork {
  line: number;
  type: string;
  title: string;
  iswc: string;
  submitterNumber: string;
  publishers: { line: number; name: string; ipi: string; society: string; share: number }[];
  writers: { line: number; name: string; ipi: string; role: string; society: string; share: number; publisher?: string }[];
}

export interface ReadResult {
  facts: FileFacts;
  format: FileFormat;
  /** The headers as the file wrote them; for DDEX and CWR, the graph fields read out of it. */
  headers: string[];
  rows: FileRow[];
  /** The file's own line (CSV, CWR) or ordinal (JSON, XML) for each row — what a row error names. */
  lines: number[];
  /** True where the rows already carry the graph's field names, so no mapping is asked. */
  mapped: boolean;
  /** CWR only. */
  cwr?: { version: string; sender: string; created?: Date; works: CwrWork[]; acks: CwrAck[] };
  /** What the reader should know about how it was read — said beside the result. */
  notes: string[];
}

/** A file that cannot be read here, and why — said to the reader as it is. */
export class Unreadable extends Error {
  constructor(
    readonly facts: FileFacts,
    message: string,
  ) {
    super(message);
  }
}

/** The file's bytes, as text or as a buffer. */
export function readFile(file: Blob, as: "bytes"): Promise<ArrayBuffer>;
export function readFile(file: Blob, as?: "text"): Promise<string>;
export function readFile(file: Blob, as: "text" | "bytes" = "text"): Promise<string | ArrayBuffer> {
  return as === "bytes" ? file.arrayBuffer() : file.text();
}

const extension = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "";

/** What a file is, from its first bytes — its name only where the bytes do not say. */
export function detectFormat(name: string, head: Uint8Array, text: string): FileFormat {
  const magic = String.fromCharCode(...head.slice(0, 4));
  if (magic === "PAR1") return "Parquet";
  if (magic === "%PDF") return "PDF";
  if (magic.startsWith("PK")) return "Unknown";
  const start = text.replace(/^﻿/, "").trimStart();
  if (start.startsWith("<")) {
    if (/MusicalWork|mwn/i.test(start.slice(0, 4000)) && !/NewReleaseMessage/.test(start.slice(0, 4000))) return "DDEX MWN";
    if (/NewReleaseMessage|\/ern\/|SoundRecording/.test(start.slice(0, 4000))) return "DDEX ERN";
    return "Unknown";
  }
  if (/^HDR/.test(start)) return "CWR";
  if (start.startsWith("{") || start.startsWith("[")) return "JSON";
  const ext = extension(name);
  if (ext === "parquet") return "Parquet";
  if (["cwr", "v21", "v22", "v30", "v31"].includes(ext)) return "CWR";
  if (["csv", "tsv", "txt"].includes(ext) || /[,;\t]/.test(start.split(/\r?\n/)[0] ?? "")) return "CSV";
  return "Unknown";
}

/** What a file is by its name alone — for a file kept, not read. */
export const formatByName = (name: string): FileFormat =>
  ({ csv: "CSV", json: "JSON", xml: "DDEX ERN", cwr: "CWR", v21: "CWR", v22: "CWR", v30: "CWR", v31: "CWR", parquet: "Parquet", pdf: "PDF" } as Record<string, FileFormat>)[extension(name)] ??
  "Unknown";

export const factsOf = (file: File, format: FileFormat = "Unknown"): FileFacts => ({
  name: file.name,
  size: file.size,
  type: file.type || typeOf(file.name),
  format,
});

/**
 * A file read whole into rows. Throws `Unreadable` with the reason a reader is told: Parquet is
 * columnar and compressed and is not read in the browser; a file that is none of the formats says so.
 */
export async function readRecords(file: File): Promise<ReadResult> {
  const bytes = new Uint8Array(await readFile(file, "bytes"));
  const text = new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
  const format = detectFormat(file.name, bytes, text);
  const facts = factsOf(file, format);
  if (format === "Parquet")
    throw new Unreadable(facts, "Parquet is not read in the browser. Send it by SFTP or the API, where the ingest service reads it, or export it as CSV.");
  if (format === "PDF") throw new Unreadable(facts, "A PDF holds no rows to read. Send the data as CSV, JSON, DDEX or CWR.");
  if (format === "Unknown") throw new Unreadable(facts, "Not a CSV, JSON, DDEX ERN or MWN, or CWR file. Zipped files are not opened here.");
  if (!text.trim()) throw new Unreadable(facts, "The file is empty.");
  try {
    if (format === "CSV") return { facts, format, ...parseCsvRows(text), mapped: false, notes: [] };
    if (format === "JSON") return { facts, format, ...parseJsonRows(text), mapped: false, notes: [] };
    if (format === "CWR") return { facts, format, ...parseCwr(text) };
    return { facts, format, ...parseDdex(text, format) };
  } catch (error) {
    if (error instanceof Unreadable) throw error;
    throw new Unreadable(facts, `It could not be read as ${format}: ${(error as Error).message}`);
  }
}

// ---------------------------------------------------------------------------------------------
// CSV — RFC 4180: quoted fields, doubled quotes, line breaks inside quotes, a header row. The
// separator is the one the header row uses most: comma, semicolon or tab.

export function parseCsv(text: string): { cells: string[][]; lines: number[] } {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const separator = [",", ";", "\t"].reduce((best, one) => (first.split(one).length > first.split(best).length ? one : best), ",");
  const cells: string[][] = [];
  const lines: number[] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  for (let at = 0; at < text.length; at++) {
    const char = text[at]!;
    if (quoted) {
      if (char === '"' && text[at + 1] === '"') {
        cell += '"';
        at++;
      } else if (char === '"') quoted = false;
      else {
        if (char === "\n") line++;
        cell += char;
      }
      continue;
    }
    if (char === '"' && cell === "") quoted = true;
    else if (char === separator) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[at + 1] === "\n") at++;
      row.push(cell);
      if (row.some((one) => one.trim() !== "")) {
        cells.push(row);
        lines.push(rowLine);
      }
      row = [];
      cell = "";
      line++;
      rowLine = line;
    } else cell += char;
  }
  if (quoted) throw new Error(`a quoted field opened on line ${rowLine} is never closed`);
  row.push(cell);
  if (row.some((one) => one.trim() !== "")) {
    cells.push(row);
    lines.push(rowLine);
  }
  return { cells, lines };
}

function parseCsvRows(text: string) {
  const { cells, lines } = parseCsv(text);
  const [head, ...body] = cells;
  if (!head) throw new Error("no header row");
  const headers = head.map((one, index) => one.trim() || `Column ${index + 1}`);
  const rows = body.map((cellsOf) => Object.fromEntries(headers.map((header, index) => [header, (cellsOf[index] ?? "").trim()])));
  return { headers, rows, lines: lines.slice(1) };
}

// ---------------------------------------------------------------------------------------------
// JSON — an array of records, or an object holding one under rows / records / data / usage / items.

function parseJsonRows(text: string) {
  const value: unknown = JSON.parse(text);
  const list = Array.isArray(value)
    ? value
    : isRecord(value)
      ? ["rows", "records", "data", "usage", "items", "works", "outputs"].map((key) => value[key]).find((one): one is unknown[] => Array.isArray(one))
      : undefined;
  if (!list) throw new Error("no list of records at the top, or under rows, records, data, usage or items");
  const flat = list.map((one) => flatten(one));
  const headers = [...new Set(flat.flatMap((one) => Object.keys(one)))];
  return { headers, rows: flat, lines: flat.map((_, index) => index + 1) };
}

/** An object read out of JSON, its fields by name. */
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

/** One record, its nested values named by their path — `party.name` — and every value a string. */
function flatten(value: unknown, prefix = ""): FileRow {
  if (value === null || typeof value !== "object") return { [prefix || "value"]: value === null || value === undefined ? "" : String(value) };
  if (Array.isArray(value)) return { [prefix]: value.map((one) => (typeof one === "object" ? JSON.stringify(one) : String(one))).join("; ") };
  if (!isRecord(value)) return {};
  return Object.entries(value).reduce<FileRow>(
    (all, [key, one]) => ({ ...all, ...(one !== null && typeof one === "object" && !Array.isArray(one) ? flatten(one, `${prefix}${key}.`) : flatten(one, `${prefix}${key}`)) }),
    {},
  );
}

// ---------------------------------------------------------------------------------------------
// DDEX — read light: the identifiers, titles, parties and shares, wherever the version puts them.
// ERN 3.x and 4.x and MWN are told apart by element names, not by schema; nothing is validated
// against the XSD.

const named = (from: Element | Document, name: string) => Array.from(from.getElementsByTagNameNS("*", name));
const textOf = (from: Element | Document | undefined, ...path: string[]): string => {
  let at: (Element | Document)[] = from ? [from] : [];
  for (const name of path) at = at.flatMap((one) => named(one, name)).slice(0, 1);
  return at[0]?.textContent?.trim() ?? "";
};

function parseDdex(text: string, format: "DDEX ERN" | "DDEX MWN") {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const broken = named(doc, "parsererror")[0];
  if (broken) throw new Error(broken.textContent?.split("\n")[0]?.trim() || "the XML is not well formed");
  return format === "DDEX ERN" ? parseErn(doc) : parseMwn(doc);
}

function parseErn(doc: Document) {
  const parties = new Map<string, { name: string; ipi: string }>();
  for (const party of named(doc, "Party"))
    parties.set(textOf(party, "PartyReference"), { name: textOf(party, "PartyName", "FullName") || textOf(party, "FullName"), ipi: textOf(party, "IpiNameNumber") });
  const partyName = (ref: string, fallback = "") => parties.get(ref)?.name || fallback;

  const releases = named(doc, "Release");
  const upcFor = (resourceRef: string) => {
    const release = releases.find((one) => named(one, "ReleaseResourceReference").some((ref) => ref.textContent?.trim() === resourceRef)) ?? releases[0];
    return { upc: textOf(release, "ICPN") || textOf(release, "UPC") || textOf(release, "EAN"), title: textOf(release, "DisplayTitleText") || textOf(release, "TitleText") };
  };
  const deals = named(doc, "ReleaseDeal");
  const deal = deals[0];
  const territories = deal ? named(deal, "TerritoryCode").map((one) => one.textContent?.trim() ?? "").filter(Boolean) : [];
  const excluded = deal ? named(deal, "ExcludedTerritoryCode").map((one) => one.textContent?.trim() ?? "").filter(Boolean) : [];
  const from = deal ? textOf(deal, "StartDate") || textOf(deal, "StartDateTime").slice(0, 10) : "";

  const rows: FileRow[] = [];
  const recordings = named(doc, "SoundRecording");
  for (const recording of recordings) {
    const ref = textOf(recording, "ResourceReference");
    const release = upcFor(ref);
    const controllers = named(recording, "ResourceRightsController");
    const artistRef = textOf(recording, "DisplayArtist", "ArtistPartyReference");
    const base: FileRow = {
      "Recording ISRC": textOf(recording, "ISRC"),
      "Recording title": textOf(recording, "DisplayTitleText") || textOf(recording, "ReferenceTitle", "TitleText") || textOf(recording, "TitleText"),
      Artist: partyName(artistRef, textOf(recording, "DisplayArtistName") || textOf(recording, "DisplayArtist", "FullName")),
      ISWC: textOf(recording, "ISWC"),
      UPC: release.upc,
      "Release title": release.title,
      "Territory set": [...territories, ...excluded.map((one) => `-${one}`)].join(" "),
      "Valid from": from,
    };
    if (!controllers.length) rows.push({ ...base, "Rights controller": "", "Master share": "" });
    for (const controller of controllers)
      rows.push({
        ...base,
        "Rights controller": partyName(textOf(controller, "RightsControllerPartyReference"), textOf(controller, "PartyName", "FullName")),
        "Master share": textOf(controller, "RightSharePercentage"),
        "Territory set": named(controller, "TerritoryCode").map((one) => one.textContent?.trim()).join(" ") || base["Territory set"]!,
        "Valid from": textOf(controller, "StartDate") || base["Valid from"]!,
      });
  }
  if (!recordings.length) throw new Error("no SoundRecording in the message");
  return {
    headers: ["Recording ISRC", "Recording title", "Artist", "ISWC", "UPC", "Release title", "Rights controller", "Master share", "Territory set", "Valid from"],
    rows,
    lines: rows.map((_, index) => index + 1),
    mapped: true,
    notes: [`Read ${recordings.length} sound recordings and ${releases.length} releases from the ERN message; one row per rights controller.`],
  };
}

const WRITER_ROLES = /Composer|Lyricist|Author|Writer|Arranger|Adapter|Translator/i;

function parseMwn(doc: Document) {
  const rows: FileRow[] = [];
  const works = named(doc, "MusicalWork");
  for (const work of works) {
    const title = textOf(work, "TitleText") || textOf(work, "Title");
    const iswc = textOf(work, "ISWC");
    const contributors = [...named(work, "MusicalWorkContributor"), ...named(work, "Contributor")];
    if (!contributors.length) rows.push({ "Work title": title, ISWC: iswc });
    for (const one of contributors) {
      const role = textOf(one, "MusicalWorkContributorRole") || textOf(one, "Role") || textOf(one, "ContributorRole");
      const writer = WRITER_ROLES.test(role);
      const name = textOf(one, "FullName") || textOf(one, "PartyName");
      const ipi = textOf(one, "IpiNameNumber") || textOf(one, "IPI");
      const share = textOf(one, "RightSharePercentage") || textOf(one, "SharePercentage");
      rows.push({
        "Work title": title,
        ISWC: iswc,
        ...(writer ? { "Writer name": name, "Writer IPI": ipi, "Writer role": role, "Writer share": share } : { "Publisher name": name, "Publisher IPI": ipi, "Publisher share": share }),
        "Territory set": named(one, "TerritoryCode").map((each) => each.textContent?.trim()).join(" "),
        "Valid from": textOf(one, "StartDate") || textOf(work, "StartDate"),
      });
    }
  }
  if (!works.length) throw new Error("no MusicalWork in the message");
  return {
    headers: ["Work title", "ISWC", "Writer name", "Writer IPI", "Writer role", "Writer share", "Publisher name", "Publisher IPI", "Publisher share", "Territory set", "Valid from"],
    rows,
    lines: rows.map((_, index) => index + 1),
    mapped: true,
    notes: [`Read ${works.length} musical works from the MWN message; one row per contributor.`],
  };
}

// ---------------------------------------------------------------------------------------------
// CWR — fixed-width records, read by the CWR 2.1 positions (1-based, as the spec numbers them):
// HDR, NWR/REV and its SPU/SWR/PWR, and ACK with its MSG. CWR 3.x keeps the record types this
// reads; where its positions moved, the record is read as 2.1 lays it out (docs/gaps/files.md).

const at = (line: string, from: number, length: number) => line.slice(from - 1, from - 1 + length).trim();
const share = (raw: string) => (/^\d+$/.test(raw) ? Number(raw) / 100 : Number.NaN);
const ymd = (raw: string) => (/^\d{8}$/.test(raw) ? new Date(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8))) : undefined);
/** T9124483016 → T-912.448.301-8, the way the graph writes it. */
export const iswcWritten = (raw: string) => {
  const bare = raw.replace(/[^0-9T]/gi, "").toUpperCase();
  return /^T\d{10}$/.test(bare) ? `T-${bare.slice(1, 4)}.${bare.slice(4, 7)}.${bare.slice(7, 10)}-${bare.slice(10)}` : raw;
};

function parseCwr(text: string) {
  const lines = text.split(/\r?\n/);
  const header = lines[0] ?? "";
  if (!header.startsWith("HDR")) throw new Error("the first record is not HDR");
  // The CWR version is the group header's (GRH, positions 12–16: 02.10, 02.20, 03.10).
  const group = lines.find((one) => one.startsWith("GRH")) ?? "";
  const written = /^0?(\d)\.(\d)0$/.exec(at(group, 12, 5));
  const version = written ? `${written[1]}.${written[2]}` : "2.1";
  const sender = at(header, 15, 45);
  const createdOn = at(header, 65, 8);
  const created = ymd(createdOn);
  const works: CwrWork[] = [];
  const acks: CwrAck[] = [];
  let work: CwrWork | undefined;
  let ack: CwrAck | undefined;
  let publisher = new Map<string, string>();
  lines.forEach((line, index) => {
    const n = index + 1;
    const type = line.slice(0, 3);
    if (type === "ACK") {
      ack = {
        line: n,
        title: at(line, 50, 60),
        submitterNumber: at(line, 110, 20),
        societyNumber: at(line, 130, 20),
        processed: ymd(at(line, 150, 8)),
        status: at(line, 158, 2),
        originalType: at(line, 47, 3),
        messages: [],
      };
      acks.push(ack);
      work = undefined;
    } else if (type === "NWR" || type === "REV" || type === "ISW" || type === "EXC") {
      work = { line: n, type, title: at(line, 20, 60), submitterNumber: at(line, 82, 14), iswc: iswcWritten(at(line, 96, 11)), publishers: [], writers: [] };
      publisher = new Map();
      if (ack && !ack.work) ack.work = work;
      else works.push(work);
    } else if (type === "SPU" && work) {
      const ip = at(line, 22, 9);
      const name = at(line, 31, 45);
      publisher.set(ip, name);
      work.publishers.push({ line: n, name, ipi: at(line, 88, 11), society: at(line, 113, 3), share: share(at(line, 116, 5)) });
    } else if (type === "SWR" && work) {
      const last = at(line, 29, 45);
      const first = at(line, 74, 30);
      work.writers.push({ line: n, name: first ? `${first} ${last}` : last, ipi: at(line, 116, 11), role: at(line, 105, 2), society: at(line, 127, 3), share: share(at(line, 130, 5)) });
    } else if (type === "PWR" && work) {
      const writer = work.writers.at(-1);
      if (writer) writer.publisher = publisher.get(at(line, 20, 9)) ?? at(line, 29, 45);
    } else if (type === "MSG" && ack) ack.messages.push(at(line, 36, 150));
  });
  // Acknowledged works are works too: a file of acks is read for its works as any other.
  const every = [...works, ...acks.flatMap((one) => (one.work ? [one.work] : []))];
  const rows: FileRow[] = [];
  const rowLines: number[] = [];
  // Valid from is the file's creation date, as the file wrote it (YYYYMMDD) — `dateOf` reads it.
  const from = created ? createdOn : "";
  for (const one of every) {
    for (const party of one.publishers) {
      rows.push({ "Work title": one.title, ISWC: one.iswc, "Publisher name": party.name, "Publisher IPI": party.ipi, "Publisher share": String(party.share), Society: party.society, "Valid from": from });
      rowLines.push(party.line);
    }
    for (const party of one.writers) {
      rows.push({ "Work title": one.title, ISWC: one.iswc, "Writer name": party.name, "Writer IPI": party.ipi, "Writer role": party.role, "Writer share": String(party.share), Society: party.society, "Valid from": from });
      rowLines.push(party.line);
    }
    if (!one.publishers.length && !one.writers.length) {
      rows.push({ "Work title": one.title, ISWC: one.iswc });
      rowLines.push(one.line);
    }
  }
  if (!every.length && !acks.length) throw new Error("no NWR, REV or ACK record");
  return {
    headers: ["Work title", "ISWC", "Writer name", "Writer IPI", "Writer role", "Writer share", "Publisher name", "Publisher IPI", "Publisher share", "Society", "Valid from"],
    rows,
    lines: rowLines,
    mapped: true,
    cwr: { version, sender, created, works: every, acks },
    notes: [
      `CWR ${version} from ${sender || "an unnamed sender"}: ${every.length} works, ${acks.length} acknowledgements.`,
      "Shares are PR ownership shares, writers and publishers together, of the whole work. Valid from is the file's creation date.",
    ],
  };
}

// =============================================================================================
// Mapping — a file's headers against the graph's fields, by name.

/** Every field a row may carry: the target library, and what DDEX and CWR read beside it. */
export const FIELDS: readonly string[] = [...TARGET_FIELDS, "UPC", "Recording title", "Artist", "Release title", "Rights controller", "Master share"];

const ALIASES: Record<string, readonly string[]> = {
  "Work title": ["title", "song title", "song", "work", "work name", "composition", "track title"],
  ISWC: ["iswc code", "work code", "iswc number"],
  "Writer name": ["writer", "writer 1", "composer", "author", "songwriter", "w1"],
  "Writer IPI": ["w1 ipi", "writer ipi", "composer ipi", "cae", "ipi name number"],
  "Writer role": ["role", "designation", "capacity", "w1 role"],
  "Writer share": ["w1 share", "w1 percent", "writer percent", "composer share", "writer split"],
  "Publisher name": ["pub", "publisher", "pub name", "original publisher"],
  "Publisher IPI": ["pub ipi", "publisher cae"],
  "Publisher share": ["pub share", "pub percent", "publisher percent", "publisher split"],
  Interest: ["right held", "interest type"],
  "Right type": ["rights", "right", "rights type"],
  "Territory set": ["territory", "terr", "territories", "countries", "region", "tis"],
  "Valid from": ["eff date", "effective date", "start date", "start", "from", "begins", "valid since"],
  "Valid to": ["end date", "end", "to", "expiry", "expires", "until"],
  "Agreement reference": ["agreement", "agreement ref", "contract", "contract ref", "deal ref"],
  Society: ["pro", "cmo", "affiliation", "society code"],
  "Society work number": ["work number", "society number", "tunecode", "society work id"],
  "Recording ISRC": ["isrc", "track isrc", "recording code"],
  "Deal basis": ["basis", "deal type"],
};

/** Lower case, words only, `%` read as "percent" — "W1 %" and "w1_percent" are the same header. */
const words = (value: string) =>
  value
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const pairs = (value: string) => {
  const out: string[] = [];
  const bare = value.replace(/ /g, "");
  for (let index = 0; index < bare.length - 1; index++) out.push(bare.slice(index, index + 2));
  return out;
};
/** Dice's coefficient over letter pairs: 1 is the same name, 0 nothing in common. */
const dice = (one: string, other: string) => {
  if (one === other) return 1;
  const a = pairs(one);
  const b = pairs(other);
  if (!a.length || !b.length) return 0;
  const left = [...b];
  let common = 0;
  for (const pair of a) {
    const found = left.indexOf(pair);
    if (found >= 0) {
      common++;
      left.splice(found, 1);
    }
  }
  return (2 * common) / (a.length + b.length);
};

export interface Suggestion {
  header: string;
  sample: string;
  target?: string;
  /** 0–1. */
  confidence?: number;
  state: "Unmatched" | "Suggested" | "Completed";
}

/**
 * Each header's nearest field in the target library, by name: the field's own name or one of the
 * names files give it. A header that IS a field's name is mapped; a known alias of it, or a name
 * close to one, is suggested with its confidence, for the reader to confirm; the rest wait. One field takes one header —
 * the closer one.
 */
export function suggestMapping(headers: readonly string[], first: FileRow = {}, targets: readonly string[] = TARGET_FIELDS): Suggestion[] {
  const scored = headers.map((header) => {
    const said = words(header);
    let best: { target: string; score: number } | undefined;
    for (const target of targets) {
      // The field's own name is certain; a name files give it is a strong suggestion; a near
      // name is a suggestion as strong as it is near.
      const own = said === words(target) ? 1 : 0;
      const alias = (ALIASES[target] ?? []).map(words).includes(said) ? 0.96 : 0;
      const near = Math.max(...[target, ...(ALIASES[target] ?? [])].map((name) => dice(said, words(name)))) * 0.9;
      const score = Math.max(own, alias, near);
      if (!best || score > best.score) best = { target, score };
    }
    return { header, sample: first[header] ?? "", best };
  });
  const taken = new Map<string, number>();
  for (const one of scored) if (one.best && one.best.score > (taken.get(one.best.target) ?? 0)) taken.set(one.best.target, one.best.score);
  return scored.map(({ header, sample, best }) => {
    if (!best || best.score < 0.6 || taken.get(best.target) !== best.score) return { header, sample, state: "Unmatched" as const };
    if (best.score >= 0.99) return { header, sample, target: best.target, state: "Completed" as const };
    return { header, sample, target: best.target, confidence: Math.round(best.score * 100) / 100, state: "Suggested" as const };
  });
}

// =============================================================================================
// Checking — the graph's rules, in the row-error shape the contributor portal shows.

export interface RowError {
  row: number;
  field: string;
  value: string;
  problem: string;
}

/** An ISRC: CC-XXX-YY-NNNNN without the hyphens, twelve characters. */
export function isrcProblem(raw: string): string | undefined {
  const value = raw.trim().toUpperCase();
  if (!value) return "Empty";
  if (/-/.test(value) && /^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/.test(value)) return "Hyphens are not part of an ISRC";
  if (value.length !== 12) return `${value.length} characters; an ISRC has 12`;
  if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(value)) return "Not an ISRC: two letters, three letters or digits, then seven digits";
  return undefined;
}

/** An ISWC: T, nine digits, a check digit — 1 + Σ i·dᵢ, taken from 10. */
export function iswcProblem(raw: string): string | undefined {
  const bare = raw.trim().toUpperCase().replace(/[-.\s]/g, "");
  if (!bare) return "Empty";
  if (!/^T\d{10}$/.test(bare)) return "Not an ISWC: T, nine digits and a check digit";
  const digits = bare.slice(1, 10).split("").map(Number);
  const sum = digits.reduce((all, one, index) => all + (index + 1) * one, 1);
  return (10 - (sum % 10)) % 10 === Number(bare[10]) ? undefined : "Check digit does not match";
}

/** An IPI name number: eleven digits. */
export function ipiProblem(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  return /^\d{11}$/.test(value) ? undefined : "IPI name numbers have 11 digits";
}

/** A UPC (12 digits) or EAN (13): the GS1 check digit, weights 3 and 1 from the right. */
export function upcProblem(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (!/^\d{12,13}$/.test(value)) return "A UPC has 12 digits, an EAN 13";
  const digits = value.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((all, one, index) => all + one * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check ? undefined : "Check digit does not match";
}

/** ISO 3166-1 alpha-2, with XK as CISAC writes Kosovo. */
const ISO_3166 = new Set(
  (
    "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ " +
    "DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT " +
    "JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG " +
    "NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH " +
    "TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW"
  ).split(" "),
);
/** The world, as files write it: WW, World, Worldwide (DDEX), or CISAC TIS 2WL / 2136. */
const WORLD = /^(WW|WORLD|WORLDWIDE|2WL|2136)$/;

/**
 * A territory set: codes separated by spaces, commas or semicolons; an exclusion written `-US`
 * or `WW-US`; the world as WW, World, 2WL or TIS 2136; a TIS numeric code (four digits).
 */
export function territoryProblem(raw: string): string | undefined {
  const value = raw.trim().toUpperCase();
  if (!value) return "Empty: write WW for the world";
  for (const token of value.split(/[\s,;]+/).filter(Boolean)) {
    const parts = token.replace(/^-/, "").split("-");
    for (const part of parts) {
      if (WORLD.test(part) || ISO_3166.has(part) || /^\d{4}$/.test(part)) continue;
      return `${part} is not an ISO 3166 or CISAC TIS code`;
    }
  }
  return undefined;
}

/** A date the graph reads: 2019-04-01, 20190401 or 01/04/2019 (day first). */
export function dateOf(raw: string): Date | undefined {
  const value = raw.trim();
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  match = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(value);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return undefined;
}

const SHARE_FIELDS = ["Writer share", "Publisher share", "Master share"] as const;
/** A share as files write it: 33.33, 33.33%, 33,33. */
export const shareOf = (raw: string) => Number(raw.trim().replace(/%$/, "").replace(",", "."));

/**
 * Every row checked against the graph's rules, read through a mapping from the file's headers to
 * the graph's fields (none where the rows carry the fields already). One error per rule broken,
 * named by the file's own row — the line a spreadsheet shows, the header being line 1.
 *
 * Shares are summed per work (its ISWC, else its title), per kind; a CWR file's writer and
 * publisher shares are of the whole and summed together.
 */
export function checkRows(read: Pick<ReadResult, "rows" | "lines" | "format" | "headers">, mapping?: Readonly<Record<string, string | undefined>>): RowError[] {
  const errors: RowError[] = [];
  const fieldOf = (header: string) => (mapping ? mapping[header] : header);
  const mappedFields = new Set(read.headers.map(fieldOf).filter(Boolean) as string[]);
  const sums = new Map<string, number>();
  const together = read.format === "CWR";
  const carriesShare = SHARE_FIELDS.some((one) => mappedFields.has(one));
  if (carriesShare && !mappedFields.has("Valid from"))
    errors.push({ row: 1, field: "Valid from", value: "", problem: "No column maps to Valid from: every rights edge needs a start date" });

  read.rows.forEach((raw, index) => {
    const row = read.lines[index] ?? index + 2;
    const fields: FileRow = {};
    for (const [header, value] of Object.entries(raw)) {
      const field = fieldOf(header);
      if (field && !(field in fields && fields[field])) fields[field] = value;
    }
    const fail = (field: string, problem: string | undefined) => {
      if (problem) errors.push({ row, field, value: fields[field] ?? "", problem });
    };
    if (fields["Recording ISRC"] !== undefined && (fields["Recording ISRC"] || read.format !== "CSV")) fail("Recording ISRC", isrcProblem(fields["Recording ISRC"]));
    if (fields.ISWC) fail("ISWC", iswcProblem(fields.ISWC));
    if (fields["Writer IPI"]) fail("Writer IPI", ipiProblem(fields["Writer IPI"]));
    if (fields["Publisher IPI"]) fail("Publisher IPI", ipiProblem(fields["Publisher IPI"]));
    if (fields.UPC) fail("UPC", upcProblem(fields.UPC));
    if (fields["Territory set"] !== undefined && mappedFields.has("Territory set")) fail("Territory set", territoryProblem(fields["Territory set"]));
    const shares = SHARE_FIELDS.filter((one) => fields[one]);
    if (shares.length || (carriesShare && mappedFields.has("Valid from"))) {
      const from = fields["Valid from"] ?? "";
      if (!from.trim()) fail("Valid from", "Every rights edge needs a start date");
      else if (!dateOf(from)) fail("Valid from", "Not a date the graph reads: write 2019-04-01");
    }
    const group = (fields.ISWC || fields["Work title"] || fields["Recording ISRC"] || `row ${row}`).toUpperCase().replace(/[-.\s]/g, "");
    for (const kind of shares) {
      const value = shareOf(fields[kind]!);
      if (Number.isNaN(value)) {
        fail(kind, "Not a number");
        continue;
      }
      if (value < 0 || value > 100) {
        fail(kind, "A share is between 0 and 100");
        continue;
      }
      const key = `${together ? "PR" : kind}/${group}`;
      const before = sums.get(key) ?? 0;
      const after = Math.round((before + value) * 100) / 100;
      sums.set(key, after);
      if (after > 100 && before <= 100) {
        const what = together ? "Writer and publisher shares" : `${kind.replace(" share", "")} shares`;
        fail(kind, `${what} on the work sum to ${formatPercent(after)}`);
      }
    }
  });
  return errors.sort((one, other) => one.row - other.row);
}

/** The rows a check let through — every row no error names. */
export const passing = (read: Pick<ReadResult, "rows" | "lines">, errors: readonly RowError[]) => {
  const failed = new Set(errors.map((one) => one.row));
  return read.rows.filter((_, index) => !failed.has(read.lines[index] ?? index + 2));
};

/** A field of a row, read through the mapping, or by the field's own name where nothing maps. */
export function fieldIn(row: FileRow, field: string, mapping?: Readonly<Record<string, string | undefined>>): string {
  if (mapping) for (const [header, target] of Object.entries(mapping)) if (target === field && row[header]) return row[header]!;
  return row[field] ?? "";
}

/** The header in a file nearest a name — for files whose columns are read without a mapping step. */
export function columnFor(headers: readonly string[], ...names: string[]): string | undefined {
  let best: { header: string; score: number } | undefined;
  for (const header of headers)
    for (const name of names) {
      const score = dice(words(header), words(name));
      if (!best || score > best.score) best = { header, score };
    }
  return best && best.score >= 0.6 ? best.header : undefined;
}

// =============================================================================================
// Writing

const TYPES: Record<string, string> = {
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  cwr: "text/plain",
  txt: "text/plain",
  html: "text/html",
  pdf: "application/pdf",
};
export const typeOf = (name: string) => TYPES[extension(name)] ?? "application/octet-stream";

/**
 * A file handed to the reader under the name the product gives it. The browser part — an anchor
 * with `download`, revoked after — is `platform/save.ts`, the stand-in for the system's missing
 * download command (gaps.md B6).
 */
export function download(name: string, content: string | Blob | ArrayBuffer, type: string = typeOf(name)) {
  saveBlob(name, content instanceof Blob ? content : new Blob([content], { type }));
}

/**
 * A value as a file writes it: a date by the system's formatter, as a reader reads it — the
 * system has no machine date (ISO 8601) a page may write (docs/gaps/files.md); the rest as text.
 */
const plain = (value: unknown) => (value === undefined || value === null ? "" : value instanceof Date ? formatDate(value, "day") : String(value));

/** One cell, quoted where it must be: a separator, a quote or a line break inside. */
const cell = (value: unknown) => {
  const text = plain(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** One column of a file written out: its header, and what each row puts under it. */
export interface Column<R> {
  name: string;
  value: (row: R) => unknown;
}

/** Rows as CSV, a header row first — and, where given, a comment line before it saying what it is. */
export function toCsv<R>(columns: readonly Column<R>[], rows: readonly R[], first?: string): string {
  return [...(first ? [`# ${first}`] : []), columns.map((one) => cell(one.name)).join(","), ...rows.map((row) => columns.map((one) => cell(one.value(row))).join(","))].join("\r\n") + "\r\n";
}

export function downloadCsv<R>(name: string, columns: readonly Column<R>[], rows: readonly R[], first?: string) {
  download(name, toCsv(columns, rows, first), "text/csv");
}

/** JSON as a person reads it, two spaces in. */
export const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
export const downloadJson = (name: string, value: unknown) => download(name, toJson(value), "application/json");

/**
 * RFC 8785-style canonical JSON: keys sorted, no space — what a digest is taken over. Read off the
 * value AS JSON WRITES IT (a date becomes the string the file holds), so the digest of what was
 * saved and of what is read back are one.
 */
export const canonical = (value: unknown): string => sorted(JSON.parse(JSON.stringify(value ?? null)));
function sorted(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sorted).join(",")}]`;
  if (isRecord(value))
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${sorted(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value ?? null);
}

/** SHA-256 of a text, in hex. */
export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((one) => one.toString(16).padStart(2, "0")).join("");
}

/** The fields a digest covers: everything but the digest and the signature themselves. */
const signedPart = (body: Record<string, unknown>) => Object.fromEntries(Object.entries(body).filter(([key]) => key !== "digest" && key !== "signature"));

/**
 * A signed receipt as a file: the body, a SHA-256 digest over its canonical form, and the log's
 * signature. The digest is real, so a receipt changed after it was issued no longer matches; the
 * signature is the prototype's stand-in for the log's Ed25519 one (docs/gaps/files.md).
 */
export async function signedReceipt(body: Record<string, unknown>, signature: Record<string, unknown>) {
  const value = await sha256(canonical(signedPart(body)));
  return { ...body, digest: { algorithm: "SHA-256", over: "canonical JSON of every field but digest and signature", value }, signature };
}

export async function downloadReceiptFile(name: string, body: Record<string, unknown>, signature: Record<string, unknown>) {
  downloadJson(name, await signedReceipt(body, signature));
}

/** What a receipt file says about itself, checked: its digest recomputed over what it holds now. */
export async function checkReceipt(text: string): Promise<{ receipt?: string; event?: number; eventHash?: string; intact: boolean | undefined; body: Record<string, unknown> }> {
  const parsed: unknown = JSON.parse(text);
  const body = isRecord(parsed) ? parsed : {};
  const digest = isRecord(body.digest) && typeof body.digest.value === "string" ? body.digest.value : undefined;
  const intact = digest ? (await sha256(canonical(signedPart(body)))) === digest : undefined;
  const proof = isRecord(body.proof) ? body.proof : isRecord(body.event) ? body.event : {};
  const number = (one: unknown) => (typeof one === "number" ? one : undefined);
  const text_ = (one: unknown) => (typeof one === "string" ? one : undefined);
  return {
    receipt: text_(body.receipt) ?? text_(proof.receipt),
    event: number(proof.event) ?? number(proof.seq),
    eventHash: text_(proof.eventHash),
    intact,
    body,
  };
}

/**
 * The proof bundle an auditor keeps: the event's public fields, its Merkle path to the batch
 * root, the timestamp token and the public key — a JSON file, not a zip.
 */
export function proofBundle(given: {
  event: Record<string, unknown>;
  inclusion: { batch: string; root: string; path: readonly string[] };
  timestamp: Record<string, unknown>;
  signature: Record<string, unknown>;
  check: readonly string[];
}) {
  return { bundle: "Sureel Proof Log · offline verification bundle", version: 1, ...given };
}

/** A sample file the app ships in `public/samples`, handed over under its own name. */
export async function downloadSample(name: string) {
  const response = await fetch(new URL(`samples/${name}`, document.baseURI));
  if (!response.ok) throw new Error(`${name} is not among the samples`);
  download(name, await response.blob(), typeOf(name));
}

/** A sample file, as an upload step offers it: fetched and handed in as if chosen from disk. */
export async function sampleFile(name: string): Promise<File> {
  const response = await fetch(new URL(`samples/${name}`, document.baseURI));
  return new File([await response.blob()], name, { type: typeOf(name) });
}

/**
 * A report as a printable page — the browser's print dialog makes the PDF. The page itself is
 * `platform/save.ts`'s; what it holds is said here.
 */
export function printReport<R>(title: string, lines: readonly string[], columns: readonly Column<R>[], rows: readonly R[]) {
  printTable(
    title,
    lines,
    columns.map((one) => one.name),
    rows.map((row) => columns.map((one) => plain(one.value(row)))),
  );
}

// =============================================================================================
// Evidence — the facts of a file filed on a claim. The graph keeps a claim's evidence as names
// (`Assertion.evidence: string[]`), so the facts are kept here by that name.

const EVIDENCE = new Map<string, FileFacts>();

/** Files kept as evidence: their facts recorded, their names returned for the claim. */
export function keepEvidence(files: readonly File[]): string[] {
  for (const one of files) EVIDENCE.set(one.name, factsOf(one, formatByName(one.name)));
  return files.map((one) => one.name);
}
export const evidenceFacts = (name: string): FileFacts | undefined => EVIDENCE.get(name) ?? [...EVIDENCE.values()].find((one) => name.endsWith(one.name));
