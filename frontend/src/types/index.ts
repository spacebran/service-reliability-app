export type HealthStatus = "healthy" | "degraded" | "down";

export interface HealthCheck {
  id: number;
  service_id: number;
  status: HealthStatus;
  latency_ms: number | null;
  actual_version: string | null;
  status_code: number | null;
  error_message: string | null;
  checked_at: string;
}

export interface Service {
  id: number;
  name: string;
  url: string;
  expected_version: string | null;
  environment: string;
  check_interval_seconds: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latest_check: HealthCheck | null;
}

export interface ServiceCreate {
  name: string;
  url: string;
  expected_version?: string | null;
  environment?: string;
  check_interval_seconds?: number;
  is_active?: boolean;
}

export interface ServiceUpdate extends Partial<ServiceCreate> {}

export interface User {
  id: number;
  username: string;
}

export interface DashboardSummary {
  total_services: number;
  by_status: Record<HealthStatus, number>;
  by_environment: Record<string, number>;
}
