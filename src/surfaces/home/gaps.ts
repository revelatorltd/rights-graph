/** GENERATED from docs/gaps/*.md by scripts/gaps.mjs — every gap a surface logged. */
export interface Gap {
  surface: string;
  id: string;
  asked: string;
  frd: string;
  here: string;
}

export const GAPS: readonly Gap[] = [
  {
    "surface": "the map (home)",
    "id": "1",
    "asked": "A long record name in the record header (a flow's or a question's full sentence)",
    "frd": "—",
    "here": "a short title on the band; the sentence in a soft Alert under it (same as RCC gap 9)"
  },
  {
    "surface": "the map (home)",
    "id": "2",
    "asked": "Prose in a facts card — a question and its answer, a decision and its reason",
    "frd": "—",
    "here": "a soft Alert for the question; FactCards for the options, which wrap tightly"
  },
  {
    "surface": "the map (home)",
    "id": "3",
    "asked": "Opening another product in a context — a link that lands in Revelator Pro as the Publisher",
    "frd": "—",
    "here": "the persona rides the query (?persona=publisher), so the link reloads the page into that context"
  }
];
