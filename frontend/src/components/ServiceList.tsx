import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { getServices } from "../api";
import { formatLatency, relativeTime } from "../lib/utils";
import type { HealthStatus, Service } from "../types";

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<HealthStatus, string> = {
  healthy: "bg-green-500/10 text-green-400 border border-green-500/20",
  degraded: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  down: "bg-red-500/10 text-red-400 border border-red-500/20",
};

function StatusBadge({ status }: { status: HealthStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === "healthy"
            ? "bg-green-400"
            : status === "degraded"
              ? "bg-yellow-400"
              : "bg-red-400"
        }`}
      />
      {status}
    </span>
  );
}

// ── Environment badge ─────────────────────────────────────────────────────────

const ENV_STYLES: Record<string, string> = {
  production: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  staging: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  development: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
};

function EnvBadge({ env }: { env: string }) {
  const style = ENV_STYLES[env] ?? ENV_STYLES.development;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {env}
    </span>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-800 animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-32" />
      <div className="h-5 bg-slate-700 rounded-full w-20" />
      <div className="h-5 bg-slate-700 rounded-full w-16" />
      <div className="h-4 bg-slate-700 rounded w-12 ml-auto" />
      <div className="h-4 bg-slate-700 rounded w-16" />
      <div className="h-4 bg-slate-700 rounded w-4" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
        <RefreshCw size={24} className="text-slate-500" />
      </div>
      <p className="text-white font-semibold mb-1">No services configured</p>
      <p className="text-slate-500 text-sm mb-5">
        Add your first service to start monitoring
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        <Plus size={15} />
        Add service
      </button>
    </div>
  );
}

// ── Service row ───────────────────────────────────────────────────────────────

interface ServiceRowProps {
  service: Service;
  isSelected: boolean;
  onClick: () => void;
}

function ServiceRow({ service, isSelected, onClick }: ServiceRowProps) {
  const check = service.latest_check;
  const hasDrift =
    service.expected_version != null &&
    (check?.actual_version == null ||
      check.actual_version !== service.expected_version);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-3.5 border-b border-slate-800 text-left
        hover:bg-slate-800/50 transition-colors group cursor-pointer
        ${isSelected ? "bg-slate-800/70 border-l-2 border-l-blue-500 pl-[18px]" : ""}
      `}
    >
      {/* Name */}
      <span className="font-medium text-white text-sm w-44 truncate flex-shrink-0">
        {service.name}
      </span>

      {/* Env */}
      <span className="w-28 flex-shrink-0">
        <EnvBadge env={service.environment} />
      </span>

      {/* Status */}
      <span className="w-24 flex-shrink-0">
        {check ? (
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge status={check.status} />
            {hasDrift && (
              <AlertTriangle
                size={13}
                className="text-amber-400 flex-shrink-0"
              />
            )}
          </span>
        ) : (
          <span className="text-xs text-slate-500">No data</span>
        )}
      </span>

      {/* Latency */}
      <span className="w-20 flex-shrink-0 text-sm tabular-nums text-slate-300">
        {check ? formatLatency(check.latency_ms) : "—"}
      </span>

      {/* Version */}
      <span className="flex-1 min-w-0">
        {check?.actual_version ? (
          <span className="flex items-center gap-1.5">
            <span
              className={`text-sm font-mono truncate ${hasDrift ? "text-amber-400" : "text-slate-300"}`}
            >
              {check.actual_version}
            </span>
            {hasDrift && (
              <span title={`Expected: ${service.expected_version}`}>
                <AlertTriangle
                  size={13}
                  className="text-amber-400 flex-shrink-0"
                />
              </span>
            )}
          </span>
        ) : (
          <span className="text-sm text-slate-600">—</span>
        )}
      </span>

      {/* Last checked */}
      <span className="w-24 flex-shrink-0 text-xs text-slate-500 text-right">
        {check ? relativeTime(check.checked_at) : "Never"}
      </span>

      <ChevronRight
        size={15}
        className={`flex-shrink-0 transition-colors ${isSelected ? "text-blue-400" : "text-slate-700 group-hover:text-slate-500"}`}
      />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ServiceListProps {
  selectedId: number | null;
  onSelect: (service: Service) => void;
  onAdd: () => void;
}

export default function ServiceList({
  selectedId,
  onSelect,
  onAdd,
}: ServiceListProps) {
  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
    refetchInterval: 30_000,
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-white">Services</h2>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={13} />
          Add service
        </button>
      </div>

      {/* Column headers */}
      {!isLoading && (services?.length ?? 0) > 0 && (
        <div className="flex items-center gap-4 px-5 py-2 border-b border-slate-800">
          <span className="text-xs text-slate-500 uppercase tracking-wider w-44 flex-shrink-0">
            Name
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wider w-28 flex-shrink-0">
            Environment
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wider w-24 flex-shrink-0">
            Status
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wider w-20 flex-shrink-0">
            Latency
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wider flex-1">
            Version
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wider w-24 text-right">
            Last checked
          </span>
          <span className="w-[15px] flex-shrink-0" />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : (services?.length ?? 0) === 0 ? (
        <EmptyState onAdd={onAdd} />
      ) : (
        <div>
          {services!.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              isSelected={service.id === selectedId}
              onClick={() => onSelect(service)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
