export type Status = 'Queued' | 'InProgress' | 'Cancelling' | 'Succeeded' | 'Failed' | 'Cancelled';

export interface RawRow {
  PreciseTimeStamp: string;
  pipelineRunId: string;
  activityRunId: string;
  activityType: string;
  activityName: string;
  pipelineName: string;
  status: string;
  dataFactoryName: string;
  errorCode: string;
  effectiveIntegrationRuntime: string;
  duration: string;
  category: string;
}

export interface PivotedRow {
  pipelineRunId: string;
  activityRunId: string;
  activityType: string;
  activityName: string;
  pipelineName: string;
  Queued: string | null;
  InProgress: string | null;
  Cancelling: string | null;
  EndTime: string | null;
  Status: string;
  duration: string | null;
  durationSeconds: number | null;
  runDate: string | null;
}

export interface ActivityData {
  activityName: string;
  activityType: string;
  rows: PivotedRow[];
  minDuration: number;
  maxDuration: number;
  avgDuration: number;
  count: number;
  successCount: number;
  failCount: number;
}
