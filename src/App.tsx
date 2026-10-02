import { useState, useCallback, useMemo } from 'react';
import { BarChart3, FileSpreadsheet, Zap, Activity as ActivityIcon, Layers, PauseCircle } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import PivotTable from '@/components/PivotTable';
import Dashboard from '@/components/Dashboard';
import { parseFile } from '@/utils/fileParser';
import { pivotRows, groupByActivity } from '@/utils/pivot';
import type { PivotedRow, ActivityData } from '@/types';

interface ProcessedData {
  pivotedRows: PivotedRow[];
  activities: ActivityData[];
  hasCancelling: boolean;
  pipelineName: string;
  executionOrder: string[];
  executionDate: string;
}

const ACTIVE_STATUSES = ['Succeeded', 'Failed', 'Cancelled'];

export default function App() {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [data, setData] = useState<ProcessedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const { rows } = await parseFile(file);
      if (rows.length === 0) {
        setError('No data rows found in the file.');
        setLoading(false);
        return;
      }

      const pivoted = pivotRows(rows);
      const hasCancelling = pivoted.some(r => r.Cancelling !== null);
      const activities = groupByActivity(pivoted);

      const pipelineName = pivoted[0]?.pipelineName ?? 'Pipeline';

      const executionOrder = (() => {
        const seen = new Set<string>();
        const ordered: string[] = [];
        for (const row of pivoted) {
          if (!seen.has(row.activityName)) {
            seen.add(row.activityName);
            ordered.push(row.activityName);
          }
        }
        return ordered;
      })();

      const executionDate = pivoted.length > 0
        ? new Date(pivoted[0].Queued ?? pivoted[0].InProgress ?? pivoted[0].EndTime ?? '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';

      setData({ pivotedRows: pivoted, activities, hasCancelling, pipelineName, executionOrder, executionDate });
      setFileName(file.name);
    } catch (err) {
      setError(`Could not read the file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const summary = useMemo(() => {
    if (!data) return null;
    const total = data.pivotedRows.length;
    const succeededRows = data.pivotedRows.filter(r => r.Status === 'Succeeded');
    const failedRows = data.pivotedRows.filter(r => r.Status === 'Failed');
    const cancelledRows = data.pivotedRows.filter(r => r.Status === 'Cancelled');
    const inactiveRows = data.pivotedRows.filter(r => !ACTIVE_STATUSES.includes(r.Status));

    return {
      total,
      succeeded: succeededRows.length,
      failed: failedRows.length,
      cancelled: cancelledRows.length,
      inactive: inactiveRows.length,
      activities: data.activities.length,
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @keyframes drawLine {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Pipeline Activity Analytics</h1>
              <p className="text-xs text-slate-400">Upload · Pivot · Visualise</p>
            </div>
          </div>
          {fileName && (
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span className="font-medium text-slate-700">{fileName}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {!data && !loading && (
          <div className="max-w-2xl mx-auto pt-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Execution Duration Analytics</h2>
              <p className="text-slate-500">
                Drop your pipeline activity file and get automatic pivot tables plus per-activity duration dashboards.
              </p>
            </div>
            <FileUpload onFileLoaded={handleFile} loading={loading} fileName={fileName} />
            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {loading && !data && (
          <div className="max-w-2xl mx-auto pt-8">
            <FileUpload onFileLoaded={handleFile} loading={loading} fileName={fileName} />
          </div>
        )}

        {data && !loading && (
          <>
            <FileUpload onFileLoaded={handleFile} loading={loading} fileName={null} compact />

            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <SummaryCard icon={<Layers className="w-4 h-4" />} label="Total Runs" value={String(summary.total)} accent="blue" />
                <SummaryCard icon={<ActivityIcon className="w-4 h-4" />} label="Activities" value={String(summary.activities)} accent="slate" />
                <SummaryCard icon={<Zap className="w-4 h-4" />} label="Succeeded" value={String(summary.succeeded)} accent="emerald" />
                <SummaryCard icon={<Zap className="w-4 h-4" />} label="Failed" value={String(summary.failed)} accent="red" />
                <SummaryCard icon={<Zap className="w-4 h-4" />} label="Cancelled" value={String(summary.cancelled)} accent="amber" />
                <SummaryCard icon={<PauseCircle className="w-4 h-4" />} label="Inactive" value={String(summary.inactive)} accent="slate" />
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">
                Activities executed by {data.pipelineName}{data.executionDate ? ` — ${data.executionDate}` : ''}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2">
                {data.executionOrder.map((name, idx) => (
                  <div key={`${name}-${idx}`} className="flex items-center gap-2 text-sm text-slate-600 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-100 rounded-md">
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <PivotTable rows={data.pivotedRows} hasCancelling={data.hasCancelling} />

            <Dashboard activities={data.activities} />
          </>
        )}
      </main>
    </div>
  );
}

const ACCENT_CLASSES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  slate: 'bg-slate-50 text-slate-600 border-slate-100',
};

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${ACCENT_CLASSES[accent]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}
