import { useState, useMemo } from 'react';
import type { PivotedRow } from '@/types';
import { formatTimestamp, formatDuration } from '@/utils/pivot';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

interface PivotTableProps {
  rows: PivotedRow[];
  hasCancelling: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  Succeeded: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Failed: 'bg-red-100 text-red-700 border-red-200',
  Cancelled: 'bg-amber-100 text-amber-700 border-amber-200',
  Queued: 'bg-slate-100 text-slate-600 border-slate-200',
  InProgress: 'bg-blue-100 text-blue-700 border-blue-200',
  Cancelling: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function PivotTable({ rows, hasCancelling }: PivotTableProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(true);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r =>
      r.activityName.toLowerCase().includes(q) ||
      r.pipelineName.toLowerCase().includes(q) ||
      r.pipelineRunId.toLowerCase().includes(q) ||
      r.Status.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-slate-800 font-semibold text-base hover:text-blue-600 transition-colors"
        >
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          Pivoted Data
          <span className="text-xs font-normal text-slate-400">({rows.length} rows)</span>
        </button>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {expanded && (
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="text-left text-slate-500 font-medium">
                <th className="px-4 py-3 whitespace-nowrap">Pipeline Run</th>
                <th className="px-4 py-3 whitespace-nowrap">Activity Run</th>
                <th className="px-4 py-3 whitespace-nowrap">Type</th>
                <th className="px-4 py-3 whitespace-nowrap">Activity Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Queued</th>
                <th className="px-4 py-3 whitespace-nowrap">In Progress</th>
                {hasCancelling && <th className="px-4 py-3 whitespace-nowrap">Cancelling</th>}
                <th className="px-4 py-3 whitespace-nowrap">End Time</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row) => (
                <tr key={`${row.pipelineRunId}-${row.activityRunId}`} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 font-mono text-xs">
                    {row.pipelineRunId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 font-mono text-xs">
                    {row.activityRunId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{row.activityType}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-800">{row.activityName}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 text-xs">{formatTimestamp(row.Queued)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 text-xs">{formatTimestamp(row.InProgress)}</td>
                  {hasCancelling && <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 text-xs">{formatTimestamp(row.Cancelling)}</td>}
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 text-xs">{formatTimestamp(row.EndTime)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[row.Status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {row.Status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono text-slate-700 font-medium">
                    {formatDuration(row.durationSeconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
