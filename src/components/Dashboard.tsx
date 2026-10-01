import { useState, useMemo } from 'react';
import type { ActivityData } from '@/types';
import ActivityChart from './ActivityChart';
import { Search, LayoutGrid } from 'lucide-react';

interface DashboardProps {
  activities: ActivityData[];
}

export default function Dashboard({ activities }: DashboardProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return activities;
    return activities.filter(
      a => a.activityName.toLowerCase().includes(q) || a.activityType.toLowerCase().includes(q)
    );
  }, [activities, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">Activity Dashboards</h2>
          <span className="text-sm text-slate-400">({activities.length} activities)</span>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter activities..."
            className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No activities match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map(activity => (
            <ActivityChart key={activity.activityName} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
