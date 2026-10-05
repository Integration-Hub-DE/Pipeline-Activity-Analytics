import { useState, useMemo } from 'react';
import type { ActivityData } from '@/types';
import { formatDuration, formatTimestamp } from '@/utils/pivot';
import { Clock, CheckCircle2, XCircle, Activity as ActivityIcon, Copy } from 'lucide-react';

interface ActivityChartProps {
  activity: ActivityData;
}

const STATUS_COLORS: Record<string, string> = {
  Succeeded: '#10b981',
  Failed: '#ef4444',
  Cancelled: '#f59e0b',
};

function CopyableValue({ label, value }: { label: string; value: string }) {
  const copyValue = () => {
    void navigator.clipboard?.writeText(value);
  };

  return (
    <div className="flex items-center gap-1">
      <span className="w-[58px] flex-shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 flex-1 truncate text-slate-100" title={value}>{value}</span>
      <button
        type="button"
        onClick={copyValue}
        className="pointer-events-auto flex-shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-700 hover:text-white"
        aria-label={`Copy ${label.toLowerCase()}`}
        title={`Copy ${label.toLowerCase()}`}
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function ActivityChart({ activity }: ActivityChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    return activity.rows
      .map((r, i) => ({
        idx: i,
        duration: r.durationSeconds,
        date: r.runDate,
        endTime: r.EndTime,
        status: r.Status,
        pipelineName: r.pipelineName,
        pipelineRunId: r.pipelineRunId,
        activityRunId: r.activityRunId,
      }))
      .filter(d => d.duration !== null);
  }, [activity.rows]);

  const width = 500;
  const height = 240;
  const padLeft = 55;
  const padRight = 25;
  const padTop = 25;
  const padBottom = 40;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxDur = Math.max(...chartData.map(d => d.duration || 0), 1);
  const minDur = Math.min(...chartData.map(d => d.duration || 0), 0);

  const yRange = maxDur - minDur || 1;
  const yScale = (val: number) => padTop + chartH - ((val - minDur) / yRange) * chartH;
  const xScale = (idx: number) => {
    if (chartData.length === 1) return padLeft + chartW / 2;
    return padLeft + (idx / (chartData.length - 1)) * chartW;
  };

  const linePath = chartData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale(d.duration!)}`)
    .join(' ');

  const areaPath =
    chartData.length > 0
      ? `${linePath} L ${xScale(chartData.length - 1)},${padTop + chartH} L ${xScale(0)},${padTop + chartH} Z`
      : '';

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => minDur + (yRange * i) / yTicks);

  const successRate = activity.count > 0 ? ((activity.successCount / activity.count) * 100).toFixed(0) : '0';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <h3 className="font-semibold text-slate-800 truncate">{activity.activityName}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{activity.activityType} · {activity.count} runs</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{successRate}% ok</span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-3 pb-1">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Min</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{formatDuration(activity.minDuration)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Avg</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{formatDuration(activity.avgDuration)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Max</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{formatDuration(activity.maxDuration)}</p>
          </div>
        </div>
      </div>

      <div className="px-3 pb-4">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
            No duration data available
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id={`area-${activity.activityName.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {tickValues.map((t, i) => (
              <g key={i}>
                <line
                  x1={padLeft} y1={yScale(t)} x2={width - padRight} y2={yScale(t)}
                  stroke="#f1f5f9" strokeWidth="1"
                />
                <text
                  x={padLeft - 8} y={yScale(t) + 4} textAnchor="end"
                  className="fill-slate-400" style={{ fontSize: '10px' }}
                >
                  {formatDuration(t)}
                </text>
              </g>
            ))}

            {areaPath && <path d={areaPath} fill={`url(#area-${activity.activityName.replace(/\s+/g, '')})`} />}

            {chartData.length > 1 && (
              <path
                d={linePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ strokeDasharray: 1000, strokeDashoffset: 0, animation: 'drawLine 0.8s ease-out forwards' }}
              />
            )}

            {chartData.map((d, i) => (
              <g
                key={i}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <circle
                  cx={xScale(i)}
                  cy={yScale(d.duration!)}
                  r={hoverIdx === i ? 6 : 4}
                  fill={STATUS_COLORS[d.status] || '#3b82f6'}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-200"
                />
                {hoverIdx === i && (
                  <foreignObject
                    x={Math.min(Math.max(xScale(i) - 105, 4), width - 214)}
                    y={Math.max(yScale(d.duration!) - 122, 4)}
                    width="210"
                    height="116"
                    className="overflow-visible"
                  >
                    <div className="w-[210px] rounded-lg bg-slate-800 px-3 py-2 text-left text-[9px] leading-4 text-white shadow-xl">
                      <div className="mb-1 flex items-center justify-between border-b border-slate-600 pb-1">
                        <span className="font-semibold text-white">{d.status}</span>
                        <span className="text-slate-300">{formatDuration(d.duration)}</span>
                      </div>
                      <CopyableValue label="Pipeline run" value={d.pipelineRunId} />
                      <CopyableValue label="Activity run" value={d.activityRunId} />
                    </div>
                  </foreignObject>
                )}
              </g>
            ))}

            {chartData.map((d, i) => {
              const label = d.date ?? '';
              const showLabel = chartData.length <= 12 || i % Math.ceil(chartData.length / 8) === 0;
              if (!showLabel) return null;
              return (
                <text
                  key={i}
                  x={xScale(i)} y={height - padBottom + 18}
                  textAnchor="middle"
                  className="fill-slate-400"
                  style={{ fontSize: '9px' }}
                >
                  {label}
                </text>
              );
            })}
          </svg>
        )}
      </div>

      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {activity.successCount}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            {activity.failCount}
          </span>
        </div>
        <span className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          {formatTimestamp(activity.rows[activity.rows.length - 1]?.EndTime ?? null)}
        </span>
      </div>
    </div>
  );
}
