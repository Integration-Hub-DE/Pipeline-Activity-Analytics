import type { RawRow, PivotedRow, ActivityData } from '@/types';

export function parseDurationToSeconds(duration: string): number | null {
  if (!duration || duration.trim() === '') return null;

  const trimmed = duration.trim();

  // MM:SS or MM:SS.sss
  const mmss = trimmed.match(/^(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (mmss) {
    return parseInt(mmss[1], 10) * 60 + parseFloat(mmss[2]);
  }

  // HH:MM:SS or HH:MM:SS.sss
  const hhmmss = trimmed.match(/^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/);
  if (hhmmss) {
    return parseInt(hhmmss[1], 10) * 3600 + parseInt(hhmmss[2], 10) * 60 + parseFloat(hhmmss[3]);
  }

  // Try parsing as raw seconds
  const rawNum = parseFloat(trimmed);
  if (!isNaN(rawNum)) return rawNum;

  return null;
}

export function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(0);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m`;
}

function normalizeStatus(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'queued') return 'Queued';
  if (trimmed === 'inprogress' || trimmed === 'in progress') return 'InProgress';
  if (trimmed === 'cancelling' || trimmed === 'canceling') return 'Cancelling';
  if (trimmed === 'succeeded' || trimmed === 'success') return 'Succeeded';
  if (trimmed === 'failed' || trimmed === 'fail') return 'Failed';
  if (trimmed === 'cancelled' || trimmed === 'canceled') return 'Cancelled';
  return raw.trim();
}

const TERMINAL_STATUSES = ['Succeeded', 'Failed', 'Cancelled'];

export function pivotRows(rows: RawRow[]): PivotedRow[] {
  const groups = new Map<string, RawRow[]>();

  for (const row of rows) {
    const key = `${row.pipelineRunId}|${row.activityRunId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const pivoted: PivotedRow[] = [];

  for (const groupRows of groups.values()) {
    const sorted = [...groupRows].sort((a, b) => {
      const ta = new Date(a.PreciseTimeStamp).getTime() || 0;
      const tb = new Date(b.PreciseTimeStamp).getTime() || 0;
      return ta - tb;
    });

    const first = sorted[0];
    const hasCancelling = sorted.some(r => normalizeStatus(r.status) === 'Cancelling');

    let queued: string | null = null;
    let inProgress: string | null = null;
    let cancelling: string | null = null;
    let endTime: string | null = null;
    let terminalStatus = '';

    for (const r of sorted) {
      const ns = normalizeStatus(r.status);
      if (ns === 'Queued') queued = r.PreciseTimeStamp;
      else if (ns === 'InProgress') inProgress = r.PreciseTimeStamp;
      else if (ns === 'Cancelling') cancelling = r.PreciseTimeStamp;
      else if (TERMINAL_STATUSES.includes(ns)) {
        endTime = r.PreciseTimeStamp;
        terminalStatus = ns;
      }
    }

    // Find duration from the terminal row
    const terminalRow = sorted.find(r => TERMINAL_STATUSES.includes(normalizeStatus(r.status)));
    const durationStr = terminalRow?.duration ?? '';
    const durationSeconds = parseDurationToSeconds(durationStr);

    // Derive run date from end time, or queued, or inprogress
    const dateSource = endTime ?? inProgress ?? queued;
    const runDate = formatDate(dateSource);

    // Use the actual start of execution for ordering, falling back to queue and terminal timestamps.
    const startSource = inProgress ?? queued ?? endTime ?? first.PreciseTimeStamp;
    const startTime = new Date(startSource).getTime() || 0;

    pivoted.push({
      pipelineRunId: first.pipelineRunId,
      activityRunId: first.activityRunId,
      activityType: first.activityType,
      activityName: first.activityName,
      pipelineName: first.pipelineName,
      Queued: queued,
      InProgress: inProgress,
      Cancelling: hasCancelling ? cancelling : null,
      EndTime: endTime,
      Status: terminalStatus || normalizeStatus(first.status),
      duration: durationStr || null,
      durationSeconds,
      runDate,
      startTime,
    });
  }

  pivoted.sort((a, b) => a.startTime - b.startTime);

  return pivoted;
}

export function groupByActivity(rows: PivotedRow[]): ActivityData[] {
  const map = new Map<string, PivotedRow[]>();

  for (const row of rows) {
    if (!map.has(row.activityName)) map.set(row.activityName, []);
    map.get(row.activityName)!.push(row);
  }

  const activities: ActivityData[] = [];

  for (const [name, activityRows] of map.entries()) {
    const durations = activityRows
      .map(r => r.durationSeconds)
      .filter((d): d is number => d !== null);

    const minDuration = durations.length ? Math.min(...durations) : 0;
    const maxDuration = durations.length ? Math.max(...durations) : 0;
    const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    activities.push({
      activityName: name,
      activityType: activityRows[0]?.activityType ?? '',
      rows: activityRows.sort((a, b) => a.startTime - b.startTime),
      minDuration,
      maxDuration,
      avgDuration,
      count: activityRows.length,
      successCount: activityRows.filter(r => r.Status === 'Succeeded').length,
      failCount: activityRows.filter(r => r.Status === 'Failed' || r.Status === 'Cancelled').length,
    });
  }

  return activities;
}
