import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { queryExecutionClient } from '@dynatrace-sdk/client-query';
import { serviceLevelObjectivesClient } from '@dynatrace-sdk/client-classic-environment-v2';
import {
  DataTable,
  useFilteredData,
} from '@dynatrace/strato-components-preview/tables';
import type { TableColumn } from '@dynatrace/strato-components-preview/tables';
import {
  Button,
  Chip,
  Flex,
  FilterBar,
  ProgressBar,
  TextInput,
  ToggleButtonGroup,
  ToggleButtonGroupItem,
} from '@dynatrace/strato-components-preview';
import { MeterBarChart, SingleValue } from '@dynatrace/strato-components-preview/charts';
import { TitleBar } from '@dynatrace/strato-components-preview/layouts';
import Colors from '@dynatrace/strato-design-tokens/colors';
import { CheckmarkIcon, CloseIcon, ResetIcon, WarningIcon } from '@dynatrace/strato-icons';

// ─── Types ───────────────────────────────────────────────────────────────────

type SignalStatus = 'present' | 'absent' | 'error';

interface ScorecardRow {
  id: string;
  name: string;
  metrics: SignalStatus;
  traces: SignalStatus;
  logs: SignalStatus;
  cloudEvents: SignalStatus;
  slos: SignalStatus;
  coverageScore: number;
}

// ─── DQL Queries ─────────────────────────────────────────────────────────────

const SERVICES_QUERY = `
smartscapeNodes "SERVICE"
| fields serviceId = id, serviceName = name
| sort serviceName asc
| limit 5000
`;

const METRICS_QUERY = `
timeseries requests = sum(dt.service.request.count, scalar:true), from:now()-24h, by:{dt.smartscape.service}
| filter isNotNull(requests) and requests > 0
| fields serviceId = dt.smartscape.service
`;

const TRACES_QUERY = `
fetch spans, from:now()-24h, samplingRatio:100
| filter isNotNull(dt.smartscape.service)
| summarize hasData = count(), by:{serviceId = dt.smartscape.service}
| filter hasData > 0
| fields serviceId
`;

const LOGS_QUERY = `
fetch logs, from:now()-24h, samplingRatio:100
| filter isNotNull(dt.smartscape.service)
| summarize hasData = count(), by:{serviceId = dt.smartscape.service}
| filter hasData > 0
| fields serviceId
`;

const CLOUD_EVENTS_QUERY = `
fetch bizevents, from:now()-24h, samplingRatio:100
| filter isNotNull(dt.smartscape.service)
| summarize hasData = count(), by:{serviceId = dt.smartscape.service}
| filter hasData > 0
| fields serviceId
`;

// ─── DQL helper ──────────────────────────────────────────────────────────────

async function runDqlQuery(query: string): Promise<Record<string, unknown>[]> {
  const { requestToken } = await queryExecutionClient.queryExecute({
    body: { query },
  });

  if (!requestToken) throw new Error('queryExecute returned no requestToken');

  let records: Record<string, unknown>[] = [];
  let state: string | undefined;

  while (state !== 'SUCCEEDED' && state !== 'FAILED' && state !== 'CANCELLED') {
    const poll = await queryExecutionClient.queryPoll({ requestToken });
    state = poll.state;
    if (poll.result?.records) {
      records = poll.result.records as Record<string, unknown>[];
    }
  }

  return records;
}

// ─── SLO helper ──────────────────────────────────────────────────────────────

async function fetchSloServiceIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    let nextPageKey: string | undefined;
    do {
      const response = await serviceLevelObjectivesClient.getSlo({
        pageSize: 500,
        nextPageKey,
      });
      for (const slo of response.slo ?? []) {
        const matches = slo.filter?.matchAll(/SERVICE-[A-Z0-9]+/gi) ?? [];
        for (const match of matches) {
          ids.add(match[0].toUpperCase());
        }
      }
      nextPageKey = response.nextPageKey;
    } while (nextPageKey);
  } catch {
    // SLO API unavailable or insufficient permissions — SLO column shows absent.
  }
  return ids;
}

// ─── Chip config per signal status ───────────────────────────────────────────

const CHIP_COLOR: Record<SignalStatus, 'success' | 'critical' | 'warning'> = {
  present: 'success',
  absent:  'critical',
  error:   'warning',
};

const CHIP_ICON: Record<SignalStatus, React.ReactNode> = {
  present: <CheckmarkIcon />,
  absent:  <CloseIcon />,
  error:   <WarningIcon />,
};

const CHIP_LABEL: Record<SignalStatus, string> = {
  present: 'Present',
  absent:  'Absent',
  error:   'Unknown',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function signalStatus(set: Set<string> | null, id: string): SignalStatus {
  if (set === null) return 'error';
  return set.has(id) ? 'present' : 'absent';
}

function scoreVariant(score: number): 'success' | 'warning' | 'critical' {
  if (score >= 4) return 'success';
  if (score >= 2) return 'warning';
  return 'critical';
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

const TILE_STYLE: React.CSSProperties = {
  flex: '1 1 0',
  minWidth: 140,
  padding: 16,
  borderRadius: 4,
  border: `1px solid ${Colors.Border.Neutral.Default}`,
  background: Colors.Background.Container.Neutral.Default,
};

// ─── Component ───────────────────────────────────────────────────────────────

export const Scorecard = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ScorecardRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gapFilter, setGapFilter] = useState<'all' | 'gaps'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [services, metricsRec, tracesRec, logsRec, eventsRec, sloIds] =
        await Promise.all([
          runDqlQuery(SERVICES_QUERY),
          runDqlQuery(METRICS_QUERY).catch(() => null),
          runDqlQuery(TRACES_QUERY).catch(() => null),
          runDqlQuery(LOGS_QUERY).catch(() => null),
          runDqlQuery(CLOUD_EVENTS_QUERY).catch(() => null),
          fetchSloServiceIds(),
        ]);

      const metricsSet = metricsRec ? new Set(metricsRec.map(r => String(r.serviceId))) : null;
      const tracesSet  = tracesRec  ? new Set(tracesRec.map(r => String(r.serviceId)))  : null;
      const logsSet    = logsRec    ? new Set(logsRec.map(r => String(r.serviceId)))    : null;
      const eventsSet  = eventsRec  ? new Set(eventsRec.map(r => String(r.serviceId)))  : null;

      const tableRows: ScorecardRow[] = services.map(svc => {
        const id = String(svc.serviceId);
        const metrics     = signalStatus(metricsSet, id);
        const traces      = signalStatus(tracesSet, id);
        const logs        = signalStatus(logsSet, id);
        const cloudEvents = signalStatus(eventsSet, id);
        const slos        = sloIds.has(id) ? 'present' : ('absent' as SignalStatus);

        const coverageScore = [metrics, traces, logs, cloudEvents, slos].filter(
          s => s === 'present',
        ).length;

        return { id, name: String(svc.serviceName), metrics, traces, logs, cloudEvents, slos, coverageScore };
      });

      setRows(tableRows);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load scorecard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const gapFilteredRows = useMemo(() => {
    if (gapFilter === 'gaps') return rows.filter(r => r.coverageScore < 5);
    return rows;
  }, [rows, gapFilter]);

  const { onChange: onFilterChange, filteredData } = useFilteredData(
    gapFilteredRows,
    (filters, entry) =>
      Object.keys(filters).every(key =>
        String(entry.name)
          .toLowerCase()
          .includes(String((filters[key] as { value?: string }).value ?? '').toLowerCase()),
      ),
  );

  const gapCount    = useMemo(() => rows.filter(r => r.coverageScore < 5).length, [rows]);
  const fullCount   = useMemo(() => rows.filter(r => r.coverageScore === 5).length, [rows]);
  const coveragePct = rows.length > 0 ? Math.round((fullCount / rows.length) * 100) : 0;
  const avgScore    = useMemo(
    () => rows.length > 0 ? rows.reduce((sum, r) => sum + r.coverageScore, 0) / rows.length : 0,
    [rows],
  );

  const columns = useMemo<TableColumn[]>(() => {
    const signalColumn = (header: string, accessor: string): TableColumn => ({
      header,
      accessor,
      alignment: 'center',
      width: 130,
      cell: ({ value }) => {
        const status = value as SignalStatus;
        return (
          <Chip color={CHIP_COLOR[status]} size="condensed">
            <Chip.Prefix>{CHIP_ICON[status]}</Chip.Prefix>
            {CHIP_LABEL[status]}
          </Chip>
        );
      },
    });

    return [
      {
        header: 'Service Name',
        accessor: 'name',
        minWidth: 220,
        autoWidth: true,
      },
      signalColumn('Metrics', 'metrics'),
      signalColumn('Traces', 'traces'),
      signalColumn('Logs', 'logs'),
      signalColumn('Cloud Events', 'cloudEvents'),
      signalColumn('SLOs', 'slos'),
      {
        header: 'Coverage',
        accessor: 'coverageScore',
        alignment: 'center',
        width: 120,
        cell: ({ value }) => {
          const score = value as number;
          return (
            <Flex flexDirection="column" gap={4} style={{ width: '100%' }}>
              <ProgressBar
                value={(score / 5) * 100}
                variant={scoreVariant(score)}
                density="condensed"
                aria-label={`${score} of 5 signals present`}
              />
              <span style={{ fontSize: '0.75rem', color: Colors.Text.Neutral.Default, textAlign: 'center' }}>
                {score}/5
              </span>
            </Flex>
          );
        },
      },
    ];
  }, []);

  return (
    <>
      <TitleBar>
        <TitleBar.Title>Observability Scorecard</TitleBar.Title>
        <TitleBar.Subtitle>
          Signal coverage per service — last 24 hours
          {loadError && (
            <span style={{ marginLeft: 12, color: Colors.Text.Critical.Default }}>
              {loadError}
            </span>
          )}
        </TitleBar.Subtitle>
        <TitleBar.Suffix>
          <Button color="neutral" disabled={loading} onClick={loadData}>
            <Button.Prefix><ResetIcon /></Button.Prefix>
            Refresh
          </Button>
        </TitleBar.Suffix>
      </TitleBar>

      <div style={{ ...TILE_STYLE, marginTop: 16, marginBottom: 4, padding: 24 }}>
        <MeterBarChart
          value={loading ? 0 : avgScore}
          min={0}
          max={5}
          size="size24"
          color={
            avgScore >= 4
              ? Colors.Charts.Status.Ideal.Default
              : avgScore >= 2.5
              ? Colors.Charts.Status.Warning.Default
              : Colors.Charts.Status.Critical.Default
          }
        >
          <MeterBarChart.Label>Overall Observability Score</MeterBarChart.Label>
          <MeterBarChart.Value>
            {loading ? '—' : `${avgScore.toFixed(1)} / 5`}
          </MeterBarChart.Value>
          <MeterBarChart.Thresholds>
            <MeterBarChart.Threshold
              value={2.5}
              color={Colors.Charts.Threshold.Warning.Default}
              name="Needs improvement"
              showIndicator
            />
            <MeterBarChart.Threshold
              value={4}
              color={Colors.Charts.Threshold.Good.Default}
              name="Good"
              showIndicator
            />
          </MeterBarChart.Thresholds>
          <MeterBarChart.ThresholdLegend />
        </MeterBarChart>
      </div>

      <Flex gap={12} style={{ padding: '12px 0' }}>
        <div style={TILE_STYLE}>
          <SingleValue data={loading ? '—' : rows.length} label="Total Services" loading={loading} />
        </div>
        <div style={TILE_STYLE}>
          <SingleValue data={loading ? '—' : fullCount} label="Full Coverage" loading={loading}
            color={Colors.Text.Success.Default} />
        </div>
        <div style={TILE_STYLE}>
          <SingleValue data={loading ? '—' : gapCount} label="With Gaps" loading={loading}
            color={gapCount > 0 ? Colors.Text.Critical.Default : Colors.Text.Neutral.Default} />
        </div>
        <div style={TILE_STYLE}>
          <SingleValue data={loading ? '—' : `${coveragePct}%`} label="Coverage Rate" loading={loading}
            color={coveragePct >= 80 ? Colors.Text.Success.Default : coveragePct >= 50 ? Colors.Text.Warning.Default : Colors.Text.Critical.Default} />
        </div>
      </Flex>

      <DataTable
        loading={loading}
        data={filteredData}
        columns={columns}
        onSortChange={() => {}}
        enableDefaultSort
        resizable
      >
        <DataTable.TableActions>
          <Flex alignItems="center" gap={8}>
            <ToggleButtonGroup
              value={gapFilter}
              onChange={v => setGapFilter(v as 'all' | 'gaps')}
            >
              <ToggleButtonGroupItem value="all">All Services</ToggleButtonGroupItem>
              <ToggleButtonGroupItem value="gaps">Gaps Only</ToggleButtonGroupItem>
            </ToggleButtonGroup>

            <FilterBar onFilterChange={onFilterChange}>
              <FilterBar.Item name="search" label="">
                <TextInput placeholder="Filter by service name" />
              </FilterBar.Item>
            </FilterBar>
          </Flex>
        </DataTable.TableActions>

        <DataTable.Toolbar>
          <DataTable.DownloadData />
        </DataTable.Toolbar>

        <DataTable.Pagination defaultPageSize={25} />
      </DataTable>
    </>
  );
};
