import { useQuery } from "@tanstack/react-query";
import { Activity, Globe, Server } from "lucide-react";
import { getDashboardSummary } from "../api";
import type { HealthStatus } from "../types";

const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: "bg-green-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
};

const STATUS_TEXT: Record<HealthStatus, string> = {
  healthy: "text-green-400",
  degraded: "text-yellow-400",
  down: "text-red-400",
};

function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-3.5 w-3.5 bg-slate-700 rounded" />
        <div className="h-3 bg-slate-700 rounded w-24" />
      </div>
      <div className="h-9 bg-slate-700 rounded w-16 mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-700 rounded w-full" />
        <div className="h-3 bg-slate-700 rounded w-4/5" />
      </div>
    </div>
  );
}

export default function SummaryCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const envEntries = Object.entries(data.by_environment).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total services */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
          <Server size={13} />
          Total Services
        </div>
        <p className="text-4xl font-bold text-white tabular-nums">{data.total_services}</p>
      </div>

      {/* Status breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
          <Activity size={13} />
          By Status
        </div>
        <div className="space-y-2">
          {(["healthy", "degraded", "down"] as HealthStatus[]).map((s) => {
            const count = data.by_status[s] ?? 0;
            return (
              <div key={s} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} />
                  <span className={`text-sm capitalize font-medium ${STATUS_TEXT[s]}`}>{s}</span>
                </div>
                <span className="text-sm font-bold text-white tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Environment breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
          <Globe size={13} />
          By Environment
        </div>
        {envEntries.length === 0 ? (
          <p className="text-sm text-slate-500">No data yet</p>
        ) : (
          <div className="space-y-2">
            {envEntries.map(([env, count]) => (
              <div key={env} className="flex items-center justify-between">
                <span className="text-sm text-slate-300 capitalize">{env}</span>
                <span className="text-sm font-bold text-white tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
