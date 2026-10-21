import { USES, type RightType, type TerritorySet, type Use } from "../graph/model";

/**
 * The ingestion validator the data-model doc puts on the write path: identifier formats, territory
 * normalization, and the closed sets the API names (uses, right types). Pure — nothing here reads
 * the graph, so a value is valid or not whatever the graph holds.
 */

/** A value refused, with the field it was found in — one entry of a problem's `errors`. */
export interface Problem {
  field: string;
  problem: string;
}

// ---------------------------------------------------------------------------------------------
// Identifiers

export type Standard = "isrc" | "iswc" | "upc" | "ipi";

/** The written form each standard is compared in: no hyphens, dots or spaces, upper case. */
export const compact = (value: string) => value.replace(/[\s.-]/g, "").toUpperCase();

const iswcCheck = (digits: string) => {
  const sum = [...digits].reduce((total, one, index) => total + Number(one) * (index + 1), 1);
  return (10 - (sum % 10)) % 10;
};

const gtinCheck = (body: string) => {
  const sum = [...body].reverse().reduce((total, one, index) => total + Number(one) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
};

/**
 * Whether an identifier is well formed — its format, and an ISWC's and a UPC's check digit.
 * `checkDigits: false` reads the format only, for a caller that wants just that.
 */
export function identifierProblem(standard: Standard, value: string, checkDigits = true): string | undefined {
  const raw = value.trim();
  if (standard === "isrc") {
    if (/[-\s]/.test(raw)) return "Hyphens and spaces are not part of an ISRC";
    if (raw.length !== 12) return `${raw.length} characters; an ISRC has 12`;
    if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(raw.toUpperCase())) return "An ISRC is a country code, a registrant code, a year and five digits";
    return undefined;
  }
  if (standard === "iswc") {
    const plain = compact(raw);
    if (!/^T\d{10}$/.test(plain)) return "An ISWC is T, nine digits and a check digit (T-123.456.789-C)";
    if (checkDigits && iswcCheck(plain.slice(1, 10)) !== Number(plain[10])) return "Check digit does not match";
    return undefined;
  }
  if (standard === "upc") {
    const plain = compact(raw);
    if (!/^\d{12,13}$/.test(plain)) return "A UPC or EAN has 12 or 13 digits";
    if (checkDigits && gtinCheck(plain.slice(0, -1)) !== Number(plain.at(-1))) return "Check digit does not match";
    return undefined;
  }
  const plain = compact(raw);
  if (!/^\d{11}$/.test(plain)) return "IPI name numbers have 11 digits";
  return undefined;
}

/** Which standard an asset reference is written in, where it is one — or `undefined` for an id. */
export function standardOf(value: string): Exclude<Standard, "ipi"> | undefined {
  const plain = compact(value);
  if (/^T\d/.test(plain)) return "iswc";
  if (/^\d{12,13}$/.test(plain)) return "upc";
  if (/^[A-Z]{2}[A-Z0-9]{3}\d/.test(plain) && !/^[a-z]+-/.test(value)) return "isrc";
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Territories — ISO 3166-1 alpha-2, normalized on write

const ISO =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW";
export const COUNTRIES: ReadonlySet<string> = new Set(ISO.split(" "));

/** Codes written as people write them, and the ISO code each means. */
const ALIASES: Record<string, string> = { UK: "GB", EL: "GR", WORLDWIDE: "WORLD", WW: "WORLD", "2136": "WORLD" };

/** One territory a READ asks in: an ISO code, or World. */
export function countryOf(value: string): string | Problem {
  const code = ALIASES[value.trim().toUpperCase()] ?? value.trim().toUpperCase();
  if (code === "WORLD") return "World";
  if (COUNTRIES.has(code)) return code;
  return { field: "territory", problem: `${value} is not an ISO 3166 code or World` };
}

const codesIn = (text: string) =>
  text
    .split(/[\s,;+]+/)
    .map((one) => one.trim())
    .filter(Boolean);

/**
 * A territory set as a WRITE names it — "World", "World excl. DE, AT", "DE, AT, CH", or
 * `{ include, exclude }` — normalized: codes upper-cased, aliases resolved, duplicates dropped,
 * sorted. The graph stores only the canonical form (Invariant: territory sets are canonical).
 */
export function territorySet(value: unknown, field = "territory"): TerritorySet | Problem {
  if (value === undefined || value === null || value === "") return { field, problem: "Every rights edge needs a territory" };
  let include: "World" | string[];
  let exclude: string[] = [];
  if (typeof value === "string") {
    const [inside, outside] = value.split(/\s+(?:excl\.?|except|excluding|-)\s+/i);
    const named = codesIn(inside ?? "");
    include = named.length === 1 && (ALIASES[named[0]!.toUpperCase()] ?? named[0]!.toUpperCase()) === "WORLD" ? "World" : named;
    exclude = outside ? codesIn(outside) : [];
  } else if (typeof value === "object") {
    const set = fieldsOf(value);
    include = set.include === "World" || set.include === "WORLD" ? "World" : Array.isArray(set.include) ? set.include.map(String) : [];
    exclude = Array.isArray(set.exclude) ? set.exclude.map(String) : [];
  } else {
    return { field, problem: "A territory is a string or { include, exclude }" };
  }
  const clean = (codes: readonly string[]) => {
    const out = new Set<string>();
    for (const one of codes) {
      const code = ALIASES[one.toUpperCase()] ?? one.toUpperCase();
      if (!COUNTRIES.has(code)) return { field, problem: `${one} is not an ISO 3166 code` } as Problem;
      out.add(code);
    }
    return [...out].sort();
  };
  const excluded = clean(exclude);
  if (!Array.isArray(excluded)) return excluded;
  if (include === "World") return excluded.length ? { include: "World", exclude: excluded } : { include: "World" };
  if (!include.length) return { field, problem: "A territory names at least one country, or World" };
  const included = clean(include);
  if (!Array.isArray(included)) return included;
  if (excluded.length) return { field, problem: "Only World takes exclusions" };
  return { include: included };
}

/** The countries a write is checked in: the ones it names, or World and every country the claims beside it name. */
export function countriesToCheck(set: TerritorySet, beside: readonly TerritorySet[]): string[] {
  if (set.include !== "World") return [...set.include];
  const named = beside.flatMap((one) => (one.include === "World" ? [...(one.exclude ?? [])] : [...one.include]));
  return ["World", ...new Set(named)].filter((one) => one === "World" || !set.exclude?.includes(one));
}

// ---------------------------------------------------------------------------------------------
// Closed sets, as an API caller may write them

const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** A use as the graph names it, from "AI training", "ai_training" or "AI_TRAINING". */
export const useOf = (value: string): Use | undefined => USES.find((one) => key(one) === key(value));

/** A use as an API writes it: `ai_training`. */
export const useCode = (use: Use) => use.toLowerCase().replace(/[^a-z0-9]+/g, "_");

export const RIGHT_TYPES: readonly RightType[] = ["Mechanical", "Performance", "Sync", "Print", "Lyrics", "Master use", "Neighbouring", "Making available", "UGC"];
export const rightTypeOf = (value: string): RightType | undefined => RIGHT_TYPES.find((one) => key(one) === key(value));

/** A calendar day, `2026-03-01`, read on the reader's calendar as the fixtures write theirs. */
export function dayOf(value: string, field: string): Date | Problem {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  const moment = new Date(value);
  return Number.isNaN(moment.getTime()) ? { field, problem: `${value} is not a date (YYYY-MM-DD) or an ISO 8601 time` } : moment;
}

export const isProblem = (value: unknown): value is Problem =>
  typeof value === "object" && value !== null && "problem" in value && "field" in value;

/**
 * A calendar day on the wire: the day the graph holds, as midnight UTC — so JSON writes it as that
 * same day wherever the server runs. A moment (a receipt's time) goes on the wire as itself.
 */
export const dayOnWire = (date: Date | undefined) => (date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) : null);

/** A JSON object's fields, read without trusting its shape — `{}` for anything that is not one. */
export const fieldsOf = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};
