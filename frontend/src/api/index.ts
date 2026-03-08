import axios from "axios";
import type {
  DashboardSummary,
  HealthCheck,
  Service,
  ServiceCreate,
  ServiceUpdate,
  User,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Auth
export const login = (username: string, password: string) =>
  api.post("/auth/login", { username, password });

export const logout = () => api.post("/auth/logout");

export const getMe = (): Promise<User> =>
  api.get<User>("/auth/me").then((r) => r.data);

// Services
export const getServices = (): Promise<Service[]> =>
  api.get<Service[]>("/services").then((r) => r.data);

export const createService = (data: ServiceCreate): Promise<Service> =>
  api.post<Service>("/services", data).then((r) => r.data);

export const updateService = (
  id: number,
  data: ServiceUpdate,
): Promise<Service> =>
  api.put<Service>(`/services/${id}`, data).then((r) => r.data);

export const deleteService = (id: number): Promise<void> =>
  api.delete(`/services/${id}`).then(() => undefined);

export const getServiceHistory = (
  id: number,
  limit = 100,
): Promise<HealthCheck[]> =>
  api
    .get<HealthCheck[]>(`/services/${id}/history`, { params: { limit } })
    .then((r) => r.data);

// Dashboard
export const getDashboardSummary = (): Promise<DashboardSummary> =>
  api.get<DashboardSummary>("/dashboard/summary").then((r) => r.data);

// AI Summary
export const getAiSummary = (): Promise<{ summary: string }> =>
  api.get<{ summary: string }>("/dashboard/ai-summary").then((r) => r.data);

export default api;
