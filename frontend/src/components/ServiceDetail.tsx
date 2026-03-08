import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  Edit2,
  ExternalLink,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { deleteService, getServiceHistory } from "../api";
import { formatLatency, relativeTime } from "../lib/utils";
import type { HealthCheck, HealthStatus, Service } from "../types";

// ── Status helpers ─────────────────────────────────────────────────────────

const STATUS_DOT: Record<HealthStatus, string> = {
  healthy: "bg-green-400",
  degraded: "bg-yellow-400",
  down: "bg-red-400",
};

const STATUS_TEXT: Record<HealthStatus, string> = {
  healthy: "text-green-400",
  degraded: "text-yellow-400",
  down: "text-red-400",
};

// ── Sparkline custom tooltip ───────────────────────────────────────────────

interface ChartPoint {
  latency: number | null;
  checked_at: string;
  status: HealthStatus;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}

function SparkTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className={`font-semibold mb-0.5 ${STATUS_TEXT[d.status]}`}>
        {d.status} · {formatLatency(d.latency)}
      </p>
      <p className="text-slate-400">{relativeTime(d.checked_at)}</p>
    </div>
  );
}

// ── History table row ──────────────────────────────────────────────────────

function HistoryRow({ check }: { check: HealthCheck }) {
  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
      <td className="px-3 py-2.5">
        <span
          className={`flex items-center gap-1.5 text-xs font-semibold ${STATUS_TEXT[check.status]}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[check.status]}`}
          />
          {check.status}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-300 tabular-nums text-right">
        {formatLatency(check.latency_ms)}
      </td>
      <td className="px-3 py-2.5 text-xs font-mono text-slate-400">
        {check.actual_version ?? "—"}
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-500 text-right">
        {relativeTime(check.checked_at)}
      </td>
    </tr>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 p-5">
      <div className="h-4 bg-slate-700 rounded w-3/5" />
      <div className="h-3 bg-slate-700 rounded w-full" />
      <div className="h-20 bg-slate-700 rounded" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-3 bg-slate-700 rounded" />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ServiceDetail({
  service,
  onEdit,
  onDelete,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: history, isLoading } = useQuery({
    queryKey: ["service-history", service.id],
    queryFn: () => getServiceHistory(service.id, 50),
    refetchInterval: 30_000,
    enabled: !!service.id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteService(service.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onDelete();
    },
  });

  // Chart data: oldest-first, map to {latency, checked_at, status}
  const chartData: ChartPoint[] = history
    ? [...history].reverse().map((h) => ({
        latency: h.latency_ms,
        checked_at: h.checked_at,
        status: h.status,
      }))
    : [];

  const check = service.latest_check;
  const hasDrift =
    service.expected_version != null &&
    (check?.actual_version == null ||
      check.actual_version !== service.expected_version);

  return (
    <aside className="w-[440px] flex-shrink-0 flex flex-col border-l border-slate-800 bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
        <div className="min-w-0 pr-3">
          <h2 className="text-sm font-bold text-white truncate">
            {service.name}
          </h2>
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors mt-0.5 truncate max-w-[280px]"
          >
            <ExternalLink size={11} />
            {service.url}
          </a>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(service)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
            title="Edit service"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete service"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Delete confirm bar */}
      {confirmDelete && (
        <div className="flex items-center justify-between px-5 py-3 bg-red-500/10 border-b border-red-500/20 flex-shrink-0">
          <p className="text-xs text-red-400 font-medium">
            Delete this service?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors px-2 py-1 disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <Skeleton />
        ) : (
          <>
            {/* Service metadata */}
            <div className="px-5 py-4 border-b border-slate-800 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <MetaItem label="Environment" value={service.environment} />
                <MetaItem
                  label="Check interval"
                  value={`${service.check_interval_seconds}s`}
                  icon={<Clock size={11} />}
                />
                {service.expected_version && (
                  <MetaItem
                    label="Expected version"
                    value={service.expected_version}
                  />
                )}
                {check?.actual_version && (
                  <MetaItem
                    label="Actual version"
                    value={check.actual_version}
                    warning={hasDrift}
                  />
                )}
              </div>

              {hasDrift && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle
                    size={13}
                    className="text-amber-400 flex-shrink-0"
                  />
                  <p className="text-xs text-amber-400">
                    Version drift — expected {service.expected_version}, got{" "}
                    {check?.actual_version ?? "null"}
                  </p>
                </div>
              )}

              {check && (
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className={`text-xs font-semibold flex items-center gap-1.5 ${STATUS_TEXT[check.status]}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${STATUS_DOT[check.status]}`}
                    />
                    {check.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatLatency(check.latency_ms)}
                  </span>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-slate-500">
                    {relativeTime(check.checked_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Latency sparkline */}
            {chartData.length > 1 && (
              <div className="px-5 py-4 border-b border-slate-800">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                  Latency (last {chartData.length} checks)
                </p>
                <ResponsiveContainer width="100%" height={90}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                  >
                    <XAxis dataKey="checked_at" hide />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      content={<SparkTooltip />}
                      cursor={{ stroke: "#334155", strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#22c55e"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* History table */}
            <div className="px-0">
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Recent checks
                </p>
              </div>
              {history && history.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-3 pb-2 text-xs text-slate-600 text-left font-medium">
                        Status
                      </th>
                      <th className="px-3 pb-2 text-xs text-slate-600 text-right font-medium">
                        Latency
                      </th>
                      <th className="px-3 pb-2 text-xs text-slate-600 text-left font-medium">
                        Version
                      </th>
                      <th className="px-3 pb-2 text-xs text-slate-600 text-right font-medium">
                        When
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <HistoryRow key={h.id} check={h} />
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center py-10 text-center">
                  <RefreshCw size={20} className="text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500">No checks yet</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

// ── Meta item ──────────────────────────────────────────────────────────────

function MetaItem({
  label,
  value,
  icon,
  warning,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p
        className={`text-sm font-medium flex items-center gap-1 ${warning ? "text-amber-400" : "text-slate-200"}`}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}
