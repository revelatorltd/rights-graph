import { useState } from "react";
import {
  AnalyticsPage,
  CellTitle,
  EmptyState,
  PageHeader,
  PageHeaderTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SeriesComparison,
  SlotItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScroll,
  Text,
  TrendCard,
  TrendCardHeader,
  TrendCardLine,
  TrendCardMetric,
  TrendCardPlot,
  TrendCardReading,
  TrendCardReadings,
  TrendCardValue,
  formatDate,
  formatPercent,
  useSeriesSelection,
} from "@revelator/pro-ui";

import { COVERAGE, COVERAGE_MONTHS, LANES } from "../../graph/fixtures";
import type { Lane } from "../../graph/model";
import type { Drawn } from "../surface";
import { MEASURE, MEASURES, feedsOf, type Measure } from "./data";

const labels = COVERAGE_MONTHS.map((one) => formatDate(one, "month", { onAxis: true }));
const last = COVERAGE_MONTHS.length - 1;

/** What a lane stands at in the last month, and what it added since the first. */
const latest = (measure: Measure, lane: Lane) => COVERAGE[measure][lane][last]!;
const added = (measure: Measure, lane: Lane) => latest(measure, lane) - COVERAGE[measure][lane][0]!;

/** When the lane last loaded — a new lane's coverage is in once its first load is. */
const lastLoad = (lane: Lane) => {
  const times = feedsOf(lane).map((one) => one.last.getTime());
  return times.length ? new Date(Math.max(...times)) : undefined;
};

/**
 * The drawing half: one coverage measure, a line per lane chosen, over the months to the gate. The
 * measure is the reader's to switch, so it stands where the metric's name does; the readings are
 * the Owned lane — the one the 30 November gate is read on — and the gate itself.
 */
function CoverageTrend({ measure, onMeasure }: { measure: Measure; onMeasure: (next: Measure) => void }) {
  const { order } = useSeriesSelection();
  const chosen = order.flatMap((key) => LANES.filter((lane) => lane === key));
  return (
    <TrendCard>
      <TrendCardHeader>
        <SlotItem>
          <TrendCardMetric>
            <TrendCardLine>
              <Select value={measure} onValueChange={(next) => onMeasure(next as Measure)}>
                <SelectTrigger aria-label="Measure">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEASURES.map((one) => (
                    <SelectItem key={one} value={one}>
                      {one}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TrendCardLine>
            <TrendCardReadings>
              <TrendCardReading>
                <Text>Owned lane</Text>
                <TrendCardValue>{formatPercent(latest(measure, "Owned"))}</TrendCardValue>
              </TrendCardReading>
              <TrendCardReading>
                <Text>{MEASURE[measure].best === "high" ? "Gate, at least" : "Gate, at most"}</Text>
                <TrendCardValue>{formatPercent(MEASURE[measure].gate)}</TrendCardValue>
              </TrendCardReading>
            </TrendCardReadings>
          </TrendCardMetric>
        </SlotItem>
      </TrendCardHeader>
      <TrendCardPlot
        labels={labels}
        series={chosen.map((lane) => ({ name: lane, values: [...COVERAGE[measure][lane]] }))}
        drawing="line"
        format={(value) => formatPercent(value)}
        empty={chosen.length === 0}
      >
        <EmptyState title="No lane chosen" detail="Choose a lane below to draw it." />
      </TrendCardPlot>
    </TrendCard>
  );
}

/**
 * The keying half: the five lanes, each carrying its line's colour — what each stands at, what it
 * ADDED since May, and when it last loaded, which is how a new lane's coverage is known to be in.
 */
function CoverageLanes({ measure }: { measure: Measure }) {
  const { rankOf, toggle, full } = useSeriesSelection();
  return (
    <TableScroll>
      <Table columns={4} selectable>
        <TableHeader>
          <TableRow selectLabel="Select all">
            <TableHead>Lane</TableHead>
            <TableHead figures>{formatDate(COVERAGE_MONTHS[last]!, "month")}</TableHead>
            <TableHead figures hint="What the lane added between the first month and the last.">
              Added
            </TableHead>
            <TableHead figures>Last load</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {LANES.map((lane) => {
            const rank = rankOf(lane);
            const loaded = lastLoad(lane);
            return (
              <TableRow
                key={lane}
                series={rank < 0 ? undefined : rank}
                selected={rank >= 0}
                selectDisabled={full}
                onSelectedChange={() => toggle(lane)}
              >
                <TableCell>
                  <CellTitle>
                    <Text kind="title">{lane}</Text>
                  </CellTitle>
                </TableCell>
                <TableCell figures>{formatPercent(latest(measure, lane))}</TableCell>
                <TableCell figures>{formatPercent(added(measure, lane))}</TableCell>
                <TableCell figures>{loaded ? formatDate(loaded, "minute") : null}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableScroll>
  );
}

function Coverage() {
  const [measure, setMeasure] = useState<Measure>("Master resolved");
  return (
    <AnalyticsPage>
      <PageHeader>
        <PageHeaderTitle>Coverage</PageHeaderTitle>
      </PageHeader>
      <SeriesComparison opensWith="Owned">
        <CoverageTrend measure={measure} onMeasure={setMeasure} />
        <CoverageLanes measure={measure} />
      </SeriesComparison>
    </AnalyticsPage>
  );
}

/**
 * The coverage dashboard (S7-6) — the 30 November gate number. The four measures, each
 * revenue-weighted, per lane, over the months: a series comparison, because the question is how
 * the lanes moved against each other, and its table is the only key the lines have.
 */
export function CoveragePage(): Drawn {
  return { place: { at: "Coverage" }, page: <Coverage /> };
}
